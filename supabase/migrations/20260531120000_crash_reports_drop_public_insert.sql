-- Issue #11 follow-up: remove o INSERT público em crash_reports.
--
-- Todas as escritas agora passam pela edge function /report-crash
-- (verify_jwt=false, service_role), que aplica:
--   - allowlist de `kind` (sincronizada com CrashKind em src/lib/crashRecovery.ts)
--   - filtro de bots por user-agent
--   - rate-limit em memória (60s / 30 reports por IP)
--   - limite de tamanho por campo (message/stack/route/user_agent/session_id)
--   - descarte de `extra`/`app_version` arbitrários
--
-- Mesmo padrão já aplicado a analytics_events em
-- 20260525015100_analytics_drop_public_insert_policy.sql.
--
-- IMPORTANTE: aplique esta migração SOMENTE APÓS publicar o novo client em
-- src/lib/crashRecovery.ts (que faz POST em /functions/v1/report-crash no
-- lugar de /rest/v1/crash_reports) e fazer o deploy da edge function. Aplicar
-- antes disso faz os builds antigos ainda em navegadores perderem silenciosamente
-- os crash reports.
--
-- As policies de SELECT/DELETE para admins ficam intactas.

DROP POLICY IF EXISTS "anon_insert_crash_reports" ON public.crash_reports;

REVOKE INSERT ON public.crash_reports FROM anon, authenticated;
