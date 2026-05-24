
-- 1) analytics_events: restrict INSERT
DROP POLICY IF EXISTS "public insert analytics" ON public.analytics_events;
CREATE POLICY "public insert analytics"
ON public.analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_type IN ('pageview','project_view','click','scroll','conversion','engagement','outbound','form_submit','search','custom')
  AND coalesce(length(path), 0) <= 1000
  AND coalesce(length(referrer), 0) <= 1000
  AND coalesce(length(user_agent), 0) <= 1000
  AND coalesce(length(visitor_id), 0) <= 100
  AND coalesce(length(session_id), 0) <= 100
  AND coalesce(length(project_slug), 0) <= 200
  AND coalesce(octet_length(value::text), 0) <= 8000
);

-- 2) seo_404_log: restrict INSERT to safe defaults
DROP POLICY IF EXISTS "public insert seo_404_log" ON public.seo_404_log;
CREATE POLICY "public insert seo_404_log"
ON public.seo_404_log
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND source = 'auto'
  AND redirect_to IS NULL
  AND notes IS NULL
  AND resolved_at IS NULL
  AND coalesce(length(path), 0) BETWEEN 1 AND 500
  AND coalesce(length(referrer), 0) <= 500
  AND coalesce(length(reason), 0) <= 80
);

-- 3) Storage: remove broad public SELECT (prevents listing).
--    Public URLs continue to serve files because public buckets bypass RLS for direct object access.
DROP POLICY IF EXISTS "public read covers" ON storage.objects;
DROP POLICY IF EXISTS "public read gallery" ON storage.objects;
DROP POLICY IF EXISTS "public read blog images" ON storage.objects;

-- 4) Lock SECURITY DEFINER admin-only functions: revoke EXECUTE from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.analytics_top_paths_v2(timestamptz, timestamptz, integer, text, text, text, text, text, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.analytics_top_paths(timestamptz, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.analytics_timeseries(timestamptz, timestamptz, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.analytics_hours_dow(timestamptz, timestamptz, text, text, text, text, text, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.analytics_retention(timestamptz, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.analytics_funnel(timestamptz, timestamptz, text[]) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.analytics_breakdown(timestamptz, timestamptz, text, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.analytics_top_referrers(timestamptz, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.analytics_realtime() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.analytics_top_projects(timestamptz, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.analytics_top_projects_v2(timestamptz, timestamptz, integer, text, text, text, text, text, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.analytics_overview_kpis(timestamptz, timestamptz, text, text, text, text, text, text, text) FROM anon, authenticated, public;

-- handle_admin_signup is a trigger, not directly callable; safe to revoke too
REVOKE EXECUTE ON FUNCTION public.handle_admin_signup() FROM anon, authenticated, public;

-- is_admin and set_updated_at: internal helpers
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;

-- Grant back to authenticated where needed by RLS policy evaluation:
-- is_admin is used inside RLS policies; evaluator runs as the user but functions called from policies
-- still need EXECUTE for the calling role. Grant authenticated EXECUTE.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Keep public-facing log_404 callable by visitors
-- (both overloads)
GRANT EXECUTE ON FUNCTION public.log_404(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_404(text, text, text) TO anon, authenticated;
