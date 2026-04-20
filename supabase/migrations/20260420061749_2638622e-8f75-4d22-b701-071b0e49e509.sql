-- =============================================================
-- Behavior tab RPCs: segment-aware top paths, top projects, and
-- hours × day-of-week heatmap. All read public.analytics_events
-- and join on session_id when filters require session-level fields
-- (utm_*, landing_path, referrer_host, country, device live on the
-- event itself but are also stable across a session).
-- =============================================================

-- Top paths --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.analytics_top_paths_v2(
  p_since timestamptz,
  p_until timestamptz,
  p_limit integer DEFAULT 25,
  p_device text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_landing_path text DEFAULT NULL,
  p_referrer_host text DEFAULT NULL
)
RETURNS TABLE(path text, pageviews bigint, sessions bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select e.path,
         count(*)::bigint                     as pageviews,
         count(distinct e.session_id)::bigint as sessions
  from public.analytics_events e
  where e.event_type = 'pageview'
    and e.created_at >= p_since and e.created_at < p_until
    and e.path is not null
    and (p_device        is null or e.device        = p_device)
    and (p_country       is null or e.country       = p_country)
    and (p_utm_source    is null or e.utm_source    = p_utm_source)
    and (p_utm_medium    is null or e.utm_medium    = p_utm_medium)
    and (p_utm_campaign  is null or e.utm_campaign  = p_utm_campaign)
    and (p_landing_path  is null or e.landing_path  = p_landing_path)
    and (p_referrer_host is null or e.referrer_host = p_referrer_host)
  group by e.path
  order by pageviews desc
  limit p_limit;
end; $function$;

-- Top projects -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.analytics_top_projects_v2(
  p_since timestamptz,
  p_until timestamptz,
  p_limit integer DEFAULT 10,
  p_device text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_landing_path text DEFAULT NULL,
  p_referrer_host text DEFAULT NULL
)
RETURNS TABLE(project_slug text, views bigint, sessions bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select e.project_slug,
         count(*)::bigint                     as views,
         count(distinct e.session_id)::bigint as sessions
  from public.analytics_events e
  where e.event_type = 'project_view'
    and e.created_at >= p_since and e.created_at < p_until
    and e.project_slug is not null
    and (p_device        is null or e.device        = p_device)
    and (p_country       is null or e.country       = p_country)
    and (p_utm_source    is null or e.utm_source    = p_utm_source)
    and (p_utm_medium    is null or e.utm_medium    = p_utm_medium)
    and (p_utm_campaign  is null or e.utm_campaign  = p_utm_campaign)
    and (p_landing_path  is null or e.landing_path  = p_landing_path)
    and (p_referrer_host is null or e.referrer_host = p_referrer_host)
  group by e.project_slug
  order by views desc
  limit p_limit;
end; $function$;

-- Hours × DOW heatmap (São Paulo TZ) -------------------------------
CREATE OR REPLACE FUNCTION public.analytics_hours_dow(
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
RETURNS TABLE(dow integer, hour integer, sessions bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select extract(dow  from (e.created_at at time zone 'America/Sao_Paulo'))::int as dow,
         extract(hour from (e.created_at at time zone 'America/Sao_Paulo'))::int as hour,
         count(distinct e.session_id)::bigint as sessions
  from public.analytics_events e
  where e.event_type = 'pageview'
    and e.created_at >= p_since and e.created_at < p_until
    and e.session_id is not null
    and (p_device        is null or e.device        = p_device)
    and (p_country       is null or e.country       = p_country)
    and (p_utm_source    is null or e.utm_source    = p_utm_source)
    and (p_utm_medium    is null or e.utm_medium    = p_utm_medium)
    and (p_utm_campaign  is null or e.utm_campaign  = p_utm_campaign)
    and (p_landing_path  is null or e.landing_path  = p_landing_path)
    and (p_referrer_host is null or e.referrer_host = p_referrer_host)
  group by 1, 2
  order by 1, 2;
end; $function$;