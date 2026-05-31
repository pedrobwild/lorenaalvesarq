-- Fecha o bypass da RPC sanitizada em seo_404_log (issue #12).
--
-- A policy "public insert seo_404_log" permitia INSERT direto via PostgREST
-- (originalmente WITH CHECK (true)), contornando a sanitização/normalização
-- aplicada pela RPC `log_404` (SECURITY DEFINER). A SPA já registra 404s
-- exclusivamente via `log_404` (src/lib/notFoundLog.ts), então o INSERT
-- direto não é necessário.
--
-- Removemos a policy. A RPC continua funcionando porque é SECURITY DEFINER
-- e não depende de RLS para inserir. Idempotente e seguro para re-rodar.

DROP POLICY IF EXISTS "public insert seo_404_log" ON public.seo_404_log;

-- Garante que a RPC sanitizada segue chamável por visitantes anônimos.
GRANT EXECUTE ON FUNCTION public.log_404(text, text) TO anon, authenticated;
