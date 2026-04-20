CREATE OR REPLACE FUNCTION public.analytics_overview_kpis(
  p_since timestamp with time zone,
  p_until timestamp with time zone,
  p_device text DEFAULT NULL::text,
  p_country text DEFAULT NULL::text,
  p_utm_source text DEFAULT NULL::text,
  p_utm_medium text DEFAULT NULL::text,
  p_utm_campaign text DEFAULT NULL::text,
  p_landing_path text DEFAULT NULL::text,
  p_referrer_host text DEFAULT NULL::text
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
    select date_trunc('day', f.started_at) as d,
           count(*)::bigint                 as sess,
           sum(f.pageviews)::bigint         as pv
    from filt f
    group by 1
    order by 1 desc
    limit 14
  )
  select coalesce(jsonb_agg(jsonb_build_object(
            'd', to_char(daily.d, 'YYYY-MM-DD'),
            'sessions', daily.sess,
            'pageviews', daily.pv
         ) order by daily.d), '[]'::jsonb)
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
      count(*)::bigint                                     as t_sessions,
      count(distinct f.visitor_id)::bigint                 as t_unique_visitors,
      coalesce(sum(f.pageviews),0)::bigint                 as t_pageviews,
      coalesce(sum(f.engagement_ms),0)::bigint             as t_eng_ms_total,
      count(*) filter (where f.engagement_ms > 0)::bigint  as t_eng_ms_n,
      count(*) filter (where f.is_bounce)::bigint          as t_bounced,
      coalesce(sum(f.conversions),0)::bigint               as t_conversions,
      count(*) filter (where f.converted)::bigint          as t_converted_sessions
    from filt f
  )
  select
    a.t_sessions                                                                                                  as sessions,
    a.t_unique_visitors                                                                                           as unique_visitors,
    a.t_pageviews                                                                                                 as pageviews,
    case when a.t_sessions > 0 then round(a.t_pageviews::numeric / a.t_sessions, 2) else 0 end                    as pages_per_session,
    case when a.t_eng_ms_n > 0 then round(a.t_eng_ms_total::numeric / a.t_eng_ms_n, 0) else 0 end                 as avg_engagement_ms,
    case when a.t_sessions > 0 then round(a.t_bounced::numeric * 100 / a.t_sessions, 1) else 0 end                as bounce_rate,
    a.t_conversions                                                                                               as conversions,
    case when a.t_sessions > 0 then round(a.t_converted_sessions::numeric * 100 / a.t_sessions, 1) else 0 end     as conversion_rate,
    coalesce(v_spark, '[]'::jsonb)                                                                                as spark
  from agg a;
end;
$function$;

NOTIFY pgrst, 'reload schema';