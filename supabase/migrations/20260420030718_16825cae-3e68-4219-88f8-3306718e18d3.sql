ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS seo_default_title text,
  ADD COLUMN IF NOT EXISTS seo_default_description text,
  ADD COLUMN IF NOT EXISTS seo_og_image text,
  ADD COLUMN IF NOT EXISTS seo_twitter_handle text,
  ADD COLUMN IF NOT EXISTS seo_canonical_base text DEFAULT 'https://lorenaalvesarq.com',
  ADD COLUMN IF NOT EXISTS seo_robots text DEFAULT 'index, follow';

-- garante a linha singleton id=1 existe
INSERT INTO public.site_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;