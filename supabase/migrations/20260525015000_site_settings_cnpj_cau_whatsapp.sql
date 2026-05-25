-- A6: consolidate hardcoded CNPJ / CAU / WhatsApp into site_settings.
-- Until now these lived as literals in App.tsx footer, useSeo JSON-LD, and
-- the privacy policy page. Centralising lets the admin update them without
-- a code change and keeps the public site, the structured data, and the
-- legal text in sync.

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS cnpj            text,
  ADD COLUMN IF NOT EXISTS cau             text,
  ADD COLUMN IF NOT EXISTS whatsapp_number text;

COMMENT ON COLUMN public.site_settings.cnpj IS
  'CNPJ formatado (ex: 05.119.224/0001-30). Exibido no footer e em JSON-LD PropertyValue.';
COMMENT ON COLUMN public.site_settings.cau IS
  'Registro CAU (ex: A66583-5). Exibido no footer e em JSON-LD PropertyValue.';
COMMENT ON COLUMN public.site_settings.whatsapp_number IS
  'Numero E.164 sem +/espacos (ex: 5534996668215). Usado para construir wa.me URL no CTA.';

-- Seed do registro existente com os valores que estavam hardcoded.
-- COALESCE preserva qualquer valor que o admin tenha entrado antes desta migration.
UPDATE public.site_settings
SET
  cnpj            = COALESCE(cnpj,            '05.119.224/0001-30'),
  cau             = COALESCE(cau,             'A66583-5'),
  whatsapp_number = COALESCE(whatsapp_number, '5534996668215')
WHERE id = 1;
