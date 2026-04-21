-- SEO avançado: verificações, analytics, tag manager, local business e keywords
ALTER TABLE public.site_settings
  -- Verificações de buscadores
  ADD COLUMN IF NOT EXISTS google_site_verification text,
  ADD COLUMN IF NOT EXISTS bing_site_verification text,
  ADD COLUMN IF NOT EXISTS yandex_verification text,
  ADD COLUMN IF NOT EXISTS facebook_domain_verification text,
  ADD COLUMN IF NOT EXISTS pinterest_site_verification text,

  -- Analytics / Tag Manager / Pixels
  ADD COLUMN IF NOT EXISTS google_analytics_id text,           -- ex.: G-XXXXXXXXXX (GA4)
  ADD COLUMN IF NOT EXISTS google_tag_manager_id text,         -- ex.: GTM-XXXXXXX
  ADD COLUMN IF NOT EXISTS google_ads_conversion_id text,      -- ex.: AW-XXXXXXXXX
  ADD COLUMN IF NOT EXISTS meta_pixel_id text,                 -- Facebook Pixel
  ADD COLUMN IF NOT EXISTS hotjar_id text,
  ADD COLUMN IF NOT EXISTS clarity_id text,                    -- Microsoft Clarity

  -- SEO palavra-chave e locais
  ADD COLUMN IF NOT EXISTS seo_keywords text,
  ADD COLUMN IF NOT EXISTS seo_author text DEFAULT 'Lorena Alves Arquitetura',
  ADD COLUMN IF NOT EXISTS seo_geo_region text DEFAULT 'BR-MG',
  ADD COLUMN IF NOT EXISTS seo_geo_placename text DEFAULT 'Uberlândia, Minas Gerais',
  ADD COLUMN IF NOT EXISTS seo_geo_position text DEFAULT '-18.9186;-48.2772',

  -- Local business (schema.org)
  ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'ProfessionalService',
  ADD COLUMN IF NOT EXISTS business_founding_year text,
  ADD COLUMN IF NOT EXISTS business_price_range text DEFAULT '$$$',
  ADD COLUMN IF NOT EXISTS business_postal_code text,
  ADD COLUMN IF NOT EXISTS business_opening_hours text,        -- texto livre ex.: Seg-Sex 09:00-18:00
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS google_business_profile_url text,

  -- Configurações extras
  ADD COLUMN IF NOT EXISTS seo_custom_head_html text,          -- tags extras (uso avançado)
  ADD COLUMN IF NOT EXISTS seo_last_audit_at timestamptz,
  ADD COLUMN IF NOT EXISTS seo_last_search_console_submit timestamptz;

-- Log de submissões e auditorias SEO
CREATE TABLE IF NOT EXISTS public.seo_audit_log (
  id           bigserial primary key,
  created_at   timestamptz default now(),
  kind         text not null check (kind in ('audit', 'submit', 'note')),
  score        int,
  issues       jsonb default '[]'::jsonb,
  notes        text
);

ALTER TABLE public.seo_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin read audit" ON public.seo_audit_log;
CREATE POLICY "admin read audit" ON public.seo_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS "admin insert audit" ON public.seo_audit_log;
CREATE POLICY "admin insert audit" ON public.seo_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid()));

-- garante a linha singleton id=1
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
