-- A9 follow-up: remove the public insert policy on analytics_events.
--
-- All writes now go through the /track edge function (verify_jwt=false,
-- service_role), which enforces:
--   - event_type allowlist (synced with src/lib/analytics.ts EventType)
--   - bot user-agent filter
--   - in-memory rate limit (60s / 120 events per IP)
--   - server-side enrichment (client_ip, country)
--
-- IMPORTANT: apply this migration ONLY AFTER deploying the new client code
-- in src/lib/analytics.ts (which posts to /functions/v1/track instead of
-- /rest/v1/analytics_events). Applying it earlier will silently drop all
-- analytics writes from the previous build still in users' browsers.
--
-- "admin read analytics" stays untouched — admins still need SELECT.

DROP POLICY IF EXISTS "public insert analytics" ON public.analytics_events;
