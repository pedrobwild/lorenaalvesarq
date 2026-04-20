-- =============================================================
-- analytics_overview_kpis
-- Returns single-row JSON-like result with all 8 KPIs + a 14-point
-- sparkline series, with optional segment filters. Server-side so
-- the client never has to download 50k rows.
-- =============================================================
CREATE OR REPLACE FUNCTION public.analytics_overview_kpis(
  p_since timestamptz,
  p_until timestamptz,
  p_device text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_landing_path text DEFAULT NULL,
  p_referrer_host text DEFAULT NULL
)
RETURNS TABLE(
  sessions bigint,
  unique_visitors bigint,
  pageviews bigint,
  pages_per_session numeric,
  avg_engagement_ms numeric,
  bounce_rate numeric,
  conversions bigint,
  conversion_rate numeric,
  spark jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_spark jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  -- Sparkline: last 14 calendar days inside the requested period
  with filt as (
    select s.*
    from public.analytics_sessions s
    where s.started_at >= p_since and s.started_at < p_until
      and (p_device        is null or s.device        = p_device)
      and (p_country       is null or s.country       = p_country)
      and (p_utm_source    is null or s.utm_source    = p_utm_source)
      and (p_utm_medium    is null or s.utm_medium    = p_utm_medium)
      and (p_utm_campaign  is null or s.utm_campaign  = p_utm_campaign)
      and (p_landing_path  is null or s.landing_path  = p_landing_path)
      and (p_referrer_host is null or s.referrer_host = p_referrer_host)
  ),
  daily as (
    select date_trunc('day', started_at) as d,
           count(*)::bigint               as sess,
           sum(pageviews)::bigint         as pv
    from filt
    group by 1
    order by 1 desc
    limit 14
  )
  select coalesce(jsonb_agg(jsonb_build_object(
            'd', to_char(d, 'YYYY-MM-DD'),
            'sessions', sess,
            'pageviews', pv
         ) order by d), '[]'::jsonb)
  into v_spark
  from daily;

  return query
  with filt as (
    select s.*
    from public.analytics_sessions s
    where s.started_at >= p_since and s.started_at < p_until
      and (p_device        is null or s.device        = p_device)
      and (p_country       is null or s.country       = p_country)
      and (p_utm_source    is null or s.utm_source    = p_utm_source)
      and (p_utm_medium    is null or s.utm_medium    = p_utm_medium)
      and (p_utm_campaign  is null or s.utm_campaign  = p_utm_campaign)
      and (p_landing_path  is null or s.landing_path  = p_landing_path)
      and (p_referrer_host is null or s.referrer_host = p_referrer_host)
  ),
  agg as (
    select
      count(*)::bigint                                   as sessions,
      count(distinct visitor_id)::bigint                 as unique_visitors,
      coalesce(sum(pageviews),0)::bigint                 as pageviews,
      coalesce(sum(engagement_ms),0)::bigint             as eng_ms_total,
      count(*) filter (where engagement_ms > 0)::bigint  as eng_ms_n,
      count(*) filter (where is_bounce)::bigint          as bounced,
      coalesce(sum(conversions),0)::bigint               as conversions,
      count(*) filter (where converted)::bigint          as converted_sessions
    from filt
  )
  select
    a.sessions,
    a.unique_visitors,
    a.pageviews,
    case when a.sessions > 0 then round(a.pageviews::numeric / a.sessions, 2) else 0 end                  as pages_per_session,
    case when a.eng_ms_n > 0 then round(a.eng_ms_total::numeric / a.eng_ms_n, 0) else 0 end               as avg_engagement_ms,
    case when a.sessions > 0 then round(a.bounced::numeric * 100 / a.sessions, 1) else 0 end              as bounce_rate,
    a.conversions,
    case when a.sessions > 0 then round(a.converted_sessions::numeric * 100 / a.sessions, 1) else 0 end   as conversion_rate,
    coalesce(v_spark, '[]'::jsonb)                                                                         as spark
  from agg a;
end;
$function$;