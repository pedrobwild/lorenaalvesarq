ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cover_url_md text,
  ADD COLUMN IF NOT EXISTS cover_url_sm text,
  ADD COLUMN IF NOT EXISTS cover_blur_data_url text;

ALTER TABLE public.project_images
  ADD COLUMN IF NOT EXISTS url_md text,
  ADD COLUMN IF NOT EXISTS url_sm text,
  ADD COLUMN IF NOT EXISTS blur_data_url text;