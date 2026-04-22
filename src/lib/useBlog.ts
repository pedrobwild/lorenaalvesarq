import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  content_html: string;
  cover_url: string | null;
  cover_url_md: string | null;
  cover_url_sm: string | null;
  cover_alt: string | null;
  cover_blur_data_url: string | null;
  category: string | null;
  tags: string[] | null;
  reading_minutes: number | null;
  author_name: string | null;
  author_role: string | null;
  published_at: string | null;
  visible: boolean;
  order_index: number | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_image_url: string | null;
  created_at: string;
  updated_at: string;
};

const PUBLIC_FIELDS =
  "id, slug, title, subtitle, excerpt, content_html, cover_url, cover_url_md, cover_url_sm, cover_alt, cover_blur_data_url, category, tags, reading_minutes, author_name, author_role, published_at, visible, order_index, seo_title, seo_description, seo_keywords, og_image_url, created_at, updated_at";

/** Lista pública: posts visíveis e (se published_at preenchido) já publicados. */
export function useBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select(PUBLIC_FIELDS)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (!active) return;
      setPosts((data ?? []) as BlogPost[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { posts, loading };
}

/** Busca um post pelo slug (público — RLS já filtra visibilidade). */
export function useBlogPost(slug: string | undefined) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const { data, error } = await supabase
        .from("blog_posts")
        .select(PUBLIC_FIELDS)
        .eq("slug", slug)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setNotFound(true);
        setPost(null);
      } else {
        setPost(data as BlogPost);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  return { post, loading, notFound };
}

export function readingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.round(words / 220));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
