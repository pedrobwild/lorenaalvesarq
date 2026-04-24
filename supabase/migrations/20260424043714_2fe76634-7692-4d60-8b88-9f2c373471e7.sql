-- Tabela de URLs 404 detectadas: registro automático + curadoria manual
-- (importação do Search Console e marcação para redirect/atualizar/ignorar).

CREATE TABLE IF NOT EXISTS public.seo_404_log (
  id BIGSERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  referrer TEXT,
  source TEXT NOT NULL DEFAULT 'auto', -- 'auto' | 'search_console' | 'manual'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'redirect' | 'update_links' | 'ignore' | 'fixed'
  redirect_to TEXT,
  notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seo_404_log_path_unique UNIQUE (path)
);

CREATE INDEX IF NOT EXISTS seo_404_log_status_idx ON public.seo_404_log (status);
CREATE INDEX IF NOT EXISTS seo_404_log_last_seen_idx ON public.seo_404_log (last_seen_at DESC);

-- updated_at automático
DROP TRIGGER IF EXISTS seo_404_log_updated_at ON public.seo_404_log;
CREATE TRIGGER seo_404_log_updated_at
BEFORE UPDATE ON public.seo_404_log
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.seo_404_log ENABLE ROW LEVEL SECURITY;

-- Público pode INSERIR (registro automático do site quando visitante cai em 404)
-- mas apenas com dados mínimos. Não pode ler nem modificar.
DROP POLICY IF EXISTS "public insert seo_404_log" ON public.seo_404_log;
CREATE POLICY "public insert seo_404_log"
ON public.seo_404_log
FOR INSERT
TO public
WITH CHECK (true);

-- Admin pode tudo (ler, atualizar, deletar, inserir manualmente)
DROP POLICY IF EXISTS "admin all seo_404_log" ON public.seo_404_log;
CREATE POLICY "admin all seo_404_log"
ON public.seo_404_log
FOR ALL
TO public
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- RPC: registro idempotente (incrementa hits ou cria nova linha) sem exigir login.
-- Permite que o cliente reporte um 404 com 1 chamada e SECURITY DEFINER cuida do upsert.
CREATE OR REPLACE FUNCTION public.log_404(p_path TEXT, p_referrer TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path TEXT;
BEGIN
  -- Sanitiza: corta querystring e normaliza tamanho
  v_path := substring(coalesce(p_path, '/') from 1 for 500);

  -- Ignora paths claramente inválidos
  IF v_path IS NULL OR length(trim(v_path)) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.seo_404_log (path, referrer, source, hits, last_seen_at)
  VALUES (v_path, substring(coalesce(p_referrer, '') from 1 for 500), 'auto', 1, now())
  ON CONFLICT (path) DO UPDATE
    SET hits = public.seo_404_log.hits + 1,
        last_seen_at = now(),
        referrer = COALESCE(EXCLUDED.referrer, public.seo_404_log.referrer);
END;
$$;

-- Permite chamar a RPC anonimamente (a função roda como SECURITY DEFINER e só insere/atualiza)
GRANT EXECUTE ON FUNCTION public.log_404(TEXT, TEXT) TO anon, authenticated;