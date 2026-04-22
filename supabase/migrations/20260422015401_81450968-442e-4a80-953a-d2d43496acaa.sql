-- =========================================================
-- BLOG POSTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  excerpt text,
  content_html text NOT NULL DEFAULT '',
  cover_url text,
  cover_url_md text,
  cover_url_sm text,
  cover_alt text,
  cover_blur_data_url text,
  category text DEFAULT 'Arquitetura Residencial',
  tags text[] DEFAULT '{}',
  reading_minutes integer DEFAULT 5,
  author_name text DEFAULT 'Lorena Alves',
  author_role text DEFAULT 'Arquiteta · CAU BR',
  published_at timestamptz,
  visible boolean NOT NULL DEFAULT true,
  order_index integer DEFAULT 0,
  -- SEO
  seo_title text,
  seo_description text,
  seo_keywords text,
  og_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx ON public.blog_posts (published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_visible_idx ON public.blog_posts (visible);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read visible blog posts" ON public.blog_posts;
CREATE POLICY "public read visible blog posts"
ON public.blog_posts
FOR SELECT
USING (visible = true AND (published_at IS NULL OR published_at <= now()));

DROP POLICY IF EXISTS "admin all blog posts" ON public.blog_posts;
CREATE POLICY "admin all blog posts"
ON public.blog_posts
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =========================================================
-- STORAGE bucket para capas/imagens internas dos posts
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public read blog images" ON storage.objects;
CREATE POLICY "public read blog images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "admin upload blog images" ON storage.objects;
CREATE POLICY "admin upload blog images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'blog-images' AND public.is_admin());

DROP POLICY IF EXISTS "admin update blog images" ON storage.objects;
CREATE POLICY "admin update blog images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'blog-images' AND public.is_admin())
WITH CHECK (bucket_id = 'blog-images' AND public.is_admin());

DROP POLICY IF EXISTS "admin delete blog images" ON storage.objects;
CREATE POLICY "admin delete blog images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'blog-images' AND public.is_admin());