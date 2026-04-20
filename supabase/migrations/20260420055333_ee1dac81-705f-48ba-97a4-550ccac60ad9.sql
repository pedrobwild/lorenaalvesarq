-- ============================================================
-- Fase 1: Expansão do schema de analytics (marketing-grade)
-- ============================================================

-- 1) Colunas adicionais em analytics_events ---------------------------------
alter table public.analytics_events
  add column if not exists visitor_id    text,
  add column if not exists screen        text,
  add column if not exists language      text,
  add column if not exists utm_term      text,
  add column if not exists utm_content   text,
  add column if not exists referrer_host text,
  add column if not exists landing_path  text,
  add column if not exists is_bounce     boolean;

-- Índices para performance das queries de relatório
create index if not exists analytics_visitor_idx
  on public.analytics_events (visitor_id, created_at);
create index if not exists analytics_session_idx
  on public.analytics_events (session_id, created_at);
create index if not exists analytics_path_idx
  on public.analytics_events (path, created_at desc);
create index if not exists analytics_type_time_idx
  on public.analytics_events (event_type, created_at desc);
create index if not exists analytics_utm_src_idx
  on public.analytics_events (utm_source, created_at desc)
  where utm_source is not null;

-- 2) View de sessões derivadas ----------------------------------------------
drop view if exists public.analytics_sessions cascade;
create view public.analytics_sessions
with (security_invoker = true) as
with s as (
  select
    session_id,
    min(visitor_id)    filter (where visitor_id is not null)    as visitor_id,
    min(created_at)                                              as started_at,
    max(created_at)                                              as ended_at,
    min(landing_path)  filter (where landing_path is not null)  as landing_path,
    min(referrer_host) filter (where referrer_host is not null) as referrer_host,
    min(utm_source)    filter (where utm_source is not null)    as utm_source,
    min(utm_medium)    filter (where utm_medium is not null)    as utm_medium,
    min(utm_campaign)  filter (where utm_campaign is not null)  as utm_campaign,
    min(device)        filter (where device is not null)        as device,
    min(country)       filter (where country is not null)       as country,
    count(*) filter (where event_type = 'pageview')              as pageviews,
    count(*) filter (where event_type in (
        'click_contact','click_whatsapp','form_submit'
      ))                                                          as conversions,
    bool_or(event_type in ('click_contact','click_whatsapp','form_submit'))
                                                                  as converted,
    coalesce(sum(duration_ms) filter (where event_type = 'engagement_time'), 0)::int as engagement_ms
  from public.analytics_events
  where session_id is not null
  group by session_id
)
select
  session_id,
  visitor_id,
  started_at,
  ended_at,
  extract(epoch from (ended_at - started_at))::int as duration_s,
  engagement_ms,
  landing_path,
  referrer_host,
  utm_source, utm_medium, utm_campaign,
  device, country,
  pageviews,
  conversions,
  converted,
  (pageviews <= 1 and not converted) as is_bounce
from s;

-- 3) RPCs server-side -------------------------------------------------------

-- 3.1 Série temporal
create or replace function public.analytics_timeseries(
  p_since timestamptz, p_until timestamptz, p_grain text default 'day'
) returns table(
  bucket timestamptz,
  sessions bigint,
  pageviews bigint,
  conversions bigint
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_grain not in ('hour','day','week','month') then
    raise exception 'invalid grain';
  end if;
  return query execute format($q$
    select date_trunc(%L, started_at) as bucket,
           count(*)::bigint            as sessions,
           sum(pageviews)::bigint      as pageviews,
           sum(conversions)::bigint    as conversions
    from public.analytics_sessions
    where started_at >= $1 and started_at < $2
    group by 1
    order by 1
  $q$, p_grain) using p_since, p_until;
end;
$$;

-- 3.2 Breakdown por dimensão (whitelist)
create or replace function public.analytics_breakdown(
  p_since timestamptz, p_until timestamptz, p_dim text, p_limit int default 25
) returns table(
  dim text,
  sessions bigint,
  conversions bigint,
  bounce_rate numeric,
  avg_duration_s numeric
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_dim not in (
    'utm_source','utm_medium','utm_campaign',
    'referrer_host','landing_path','device','country'
  ) then
    raise exception 'invalid dimension';
  end if;
  return query execute format($q$
    select coalesce(nullif(%I::text,''), '(n/a)') as dim,
           count(*)::bigint                       as sessions,
           sum(conversions)::bigint               as conversions,
           round(avg(case when is_bounce then 1 else 0 end)::numeric, 4) as bounce_rate,
           round(avg(duration_s)::numeric, 1)     as avg_duration_s
    from public.analytics_sessions
    where started_at >= $1 and started_at < $2
    group by 1
    order by sessions desc
    limit %L
  $q$, p_dim, p_limit) using p_since, p_until;
end;
$$;

-- 3.3 Funil
create or replace function public.analytics_funnel(
  p_since timestamptz, p_until timestamptz, p_steps text[]
) returns table(step int, event_type text, sessions bigint)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return query
  with evt as (
    select e.session_id, e.event_type, e.created_at
    from public.analytics_events e
    where e.created_at >= p_since and e.created_at < p_until
      and e.event_type = any(p_steps)
  ),
  ord as (
    select e.session_id, s.idx::int as idx, s.event_type, min(e.created_at) as at
    from evt e
    join unnest(p_steps) with ordinality as s(event_type, idx) using (event_type)
    group by e.session_id, s.idx, s.event_type
  ),
  reach as (
    select x.idx, x.event_type, count(distinct x.session_id) as sessions
    from (
      select o1.session_id, o1.idx, o1.event_type
      from ord o1
      where not exists (
        select 1 from ord o2
        where o2.session_id = o1.session_id
          and o2.idx < o1.idx
          and o2.at > o1.at
      )
    ) x
    group by x.idx, x.event_type
  )
  select r.idx as step, r.event_type, r.sessions
  from reach r
  order by r.idx;
end;
$$;

-- 3.4 Retenção
create or replace function public.analytics_retention(
  p_since timestamptz, p_weeks int default 8
) returns table(cohort_week date, week_offset int, visitors bigint)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return query
  with first_seen as (
    select ae.visitor_id,
           date_trunc('week', min(ae.created_at))::date as cohort_week
    from public.analytics_events ae
    where ae.visitor_id is not null and ae.created_at >= p_since
    group by ae.visitor_id
  ),
  seen as (
    select ae.visitor_id,
           fs.cohort_week,
           ((date_trunc('week', ae.created_at)::date - fs.cohort_week) / 7)::int as week_offset
    from public.analytics_events ae
    join first_seen fs using (visitor_id)
    where ae.created_at >= p_since
  )
  select s.cohort_week,
         s.week_offset,
         count(distinct s.visitor_id)::bigint as visitors
  from seen s
  where s.week_offset between 0 and p_weeks
  group by s.cohort_week, s.week_offset
  order by s.cohort_week, s.week_offset;
end;
$$;

-- 3.5 Tempo real
create or replace function public.analytics_realtime()
returns table(minute timestamptz, sessions bigint, pageviews bigint)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return query
  select date_trunc('minute', e.created_at) as minute,
         count(distinct e.session_id)::bigint as sessions,
         count(*) filter (where e.event_type='pageview')::bigint as pageviews
  from public.analytics_events e
  where e.created_at >= now() - interval '30 minutes'
  group by 1
  order by 1;
end;
$$;

-- 4) Permissões -------------------------------------------------------------
revoke all on function public.analytics_timeseries(timestamptz,timestamptz,text)       from public;
revoke all on function public.analytics_breakdown(timestamptz,timestamptz,text,int)    from public;
revoke all on function public.analytics_funnel(timestamptz,timestamptz,text[])         from public;
revoke all on function public.analytics_retention(timestamptz,int)                     from public;
revoke all on function public.analytics_realtime()                                     from public;

grant execute on function public.analytics_timeseries(timestamptz,timestamptz,text)    to authenticated;
grant execute on function public.analytics_breakdown(timestamptz,timestamptz,text,int) to authenticated;
grant execute on function public.analytics_funnel(timestamptz,timestamptz,text[])      to authenticated;
grant execute on function public.analytics_retention(timestamptz,int)                  to authenticated;
grant execute on function public.analytics_realtime()                                  to authenticated;