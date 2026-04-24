-- 1) Coluna `reason` em seo_404_log (nullable, livre, com tamanho limitado)
ALTER TABLE public.seo_404_log
  ADD COLUMN IF NOT EXISTS reason TEXT;

COMMENT ON COLUMN public.seo_404_log.reason IS
  'Causa do 404 (livre): unknown_route, invalid_dynamic_segment, dynamic_slug_not_found, supabase_unavailable, spa_fallback, manual, etc.';

-- 2) Índice para o filtro por causa
CREATE INDEX IF NOT EXISTS seo_404_log_reason_idx
  ON public.seo_404_log (reason);

-- 3) Atualiza a RPC log_404 para aceitar p_reason e persisti-lo.
-- Mantém compatibilidade com chamadas antigas (parâmetro opcional).
CREATE OR REPLACE FUNCTION public.log_404(
  p_path TEXT,
  p_referrer TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path TEXT;
  v_reason TEXT;
BEGIN
  v_path := substring(coalesce(p_path, '/') from 1 for 500);
  v_reason := substring(coalesce(p_reason, '') from 1 for 80);
  IF v_reason = '' THEN v_reason := NULL; END IF;

  IF v_path IS NULL OR length(trim(v_path)) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.seo_404_log (path, referrer, source, reason, hits, last_seen_at)
  VALUES (
    v_path,
    substring(coalesce(p_referrer, '') from 1 for 500),
    'auto',
    v_reason,
    1,
    now()
  )
  ON CONFLICT (path) DO UPDATE
    SET hits         = public.seo_404_log.hits + 1,
        last_seen_at = now(),
        referrer     = COALESCE(EXCLUDED.referrer, public.seo_404_log.referrer),
        -- Só atualiza reason se vier um novo valor (preserva o último motivo conhecido)
        reason       = COALESCE(EXCLUDED.reason, public.seo_404_log.reason);
END;
$$;