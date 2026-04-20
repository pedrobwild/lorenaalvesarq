-- Extensão de analytics_events para suportar KPIs ricos
alter table public.analytics_events
  add column if not exists device        text,
  add column if not exists browser       text,
  add column if not exists os            text,
  add column if not exists utm_source    text,
  add column if not exists utm_medium    text,
  add column if not exists utm_campaign  text,
  add column if not exists duration_ms   int,
  add column if not exists scroll_depth  int,
  add column if not exists value         jsonb;

create index if not exists analytics_events_session_idx
  on public.analytics_events (session_id, created_at);
create index if not exists analytics_events_project_idx
  on public.analytics_events (project_slug, created_at desc)
  where project_slug is not null;
create index if not exists analytics_events_utm_idx
  on public.analytics_events (utm_source, created_at desc)
  where utm_source is not null;
create index if not exists analytics_events_event_type_idx
  on public.analytics_events (event_type, created_at desc);

-- View leve p/ daily rollup
create or replace view public.analytics_daily as
select
  date_trunc('day', created_at)::date as day,
  event_type,
  count(*)                              as events,
  count(distinct session_id)            as sessions
from public.analytics_events
group by 1, 2;

-- RPC top paths
create or replace function public.analytics_top_paths(
  p_since timestamptz,
  p_limit int default 10
) returns table(path text, pageviews bigint, sessions bigint)
language sql stable security definer set search_path = public as $$
  select path,
         count(*)::bigint                         as pageviews,
         count(distinct session_id)::bigint       as sessions
  from public.analytics_events
  where event_type = 'pageview'
    and created_at >= p_since
    and path is not null
  group by path
  order by pageviews desc
  limit p_limit;
$$;

create or replace function public.analytics_top_projects(
  p_since timestamptz,
  p_limit int default 10
) returns table(project_slug text, views bigint, sessions bigint)
language sql stable security definer set search_path = public as $$
  select project_slug,
         count(*)::bigint                         as views,
         count(distinct session_id)::bigint       as sessions
  from public.analytics_events
  where event_type = 'project_view'
    and created_at >= p_since
    and project_slug is not null
  group by project_slug
  order by views desc
  limit p_limit;
$$;

create or replace function public.analytics_top_referrers(
  p_since timestamptz,
  p_limit int default 10
) returns table(referrer text, sessions bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(referrer, ''), '(direto)') as referrer,
         count(distinct session_id)::bigint         as sessions
  from public.analytics_events
  where event_type = 'pageview'
    and created_at >= p_since
  group by 1
  order by sessions desc
  limit p_limit;
$$;

revoke all on function public.analytics_top_paths(timestamptz,int) from public;
revoke all on function public.analytics_top_projects(timestamptz,int) from public;
revoke all on function public.analytics_top_referrers(timestamptz,int) from public;
grant execute on function public.analytics_top_paths(timestamptz,int)    to authenticated;
grant execute on function public.analytics_top_projects(timestamptz,int) to authenticated;
grant execute on function public.analytics_top_referrers(timestamptz,int) to authenticated;