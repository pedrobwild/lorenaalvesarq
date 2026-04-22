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

export type BlogTag = {
  /** Rótulo original como armazenado no banco (ex: "arquitetura residencial") */
  label: string;
  /** Slug seguro para URL (ex: "arquitetura-residencial") */
  slug: string;
  /** Quantos posts visíveis carregam essa tag */
  count: number;
};

/**
 * Agrega todas as tags de posts visíveis em uma lista única,
 * com contagem e slug — usado pela página /blog/tags.
 */
export function useBlogTags() {
  const { posts, loading } = useBlogPosts();
  const tagMap = new Map<string, BlogTag>();

  for (const p of posts) {
    for (const raw of p.tags ?? []) {
      const label = (raw ?? "").trim();
      if (!label) continue;
      const slug = slugify(label);
      if (!slug) continue;
      const existing = tagMap.get(slug);
      if (existing) {
        existing.count += 1;
      } else {
        tagMap.set(slug, { label, slug, count: 1 });
      }
    }
  }

  const tags = Array.from(tagMap.values()).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR")
  );

  return { tags, loading };
}

/**
 * Posts filtrados por slug de tag.
 * O slug é comparado contra `slugify(tag)` de cada item, para tolerar
 * tags armazenadas com acentos / maiúsculas / espaços.
 */
export function useBlogPostsByTag(tagSlug: string | undefined) {
  const { posts, loading } = useBlogPosts();
  if (!tagSlug) return { posts: [], label: "", loading };

  const filtered = posts.filter((p) =>
    (p.tags ?? []).some((t) => slugify(t) === tagSlug)
  );
  // Recupera o rótulo original a partir do primeiro match (preserva acentos/caixa)
  let label = tagSlug.replace(/-/g, " ");
  for (const p of filtered) {
    const original = (p.tags ?? []).find((t) => slugify(t) === tagSlug);
    if (original) {
      label = original;
      break;
    }
  }
  return { posts: filtered, label, loading };
}

export type RelatedBlogPost = BlogPost & {
  /** Quantas tags o post relacionado compartilha com o atual */
  sharedTagCount: number;
  /** Tags compartilhadas (rótulos originais do post atual) */
  sharedTags: string[];
};

/**
 * Posts relacionados ao atual, ranqueados por:
 *  1. Quantidade de tags compartilhadas (desc)
 *  2. Mesma categoria (bônus de +0.5)
 *  3. Mais recentes primeiro (desempate)
 *
 * Sempre devolve até `limit` posts (quando há outros disponíveis), preenchendo
 * com os mais recentes mesmo sem tags em comum — assim o bloco de "leia também"
 * nunca fica vazio, melhorando o internal linking para SEO e a permanência do leitor.
 */
export function useRelatedBlogPosts(
  current: BlogPost | null | undefined,
  limit = 3
): { related: RelatedBlogPost[]; loading: boolean } {
  const { posts, loading } = useBlogPosts();
  if (!current) return { related: [], loading };

  const currentTagSlugs = new Set(
    (current.tags ?? []).map((t) => slugify(t)).filter(Boolean)
  );
  const currentLabelBySlug = new Map<string, string>();
  for (const t of current.tags ?? []) {
    const s = slugify(t);
    if (s && !currentLabelBySlug.has(s)) currentLabelBySlug.set(s, t);
  }

  const scored: Array<{ p: BlogPost; score: number; shared: string[] }> = [];
  for (const p of posts) {
    if (p.id === current.id) continue;
    const sharedSlugs = (p.tags ?? [])
      .map((t) => slugify(t))
      .filter((s) => s && currentTagSlugs.has(s));
    const uniqueShared = Array.from(new Set(sharedSlugs));
    let score = uniqueShared.length;
    if (current.category && p.category && p.category === current.category) {
      score += 0.5;
    }
    scored.push({
      p,
      score,
      shared: uniqueShared.map((s) => currentLabelBySlug.get(s) || s),
    });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Desempate: mais recente primeiro
    const aDate = a.p.published_at || a.p.created_at;
    const bDate = b.p.published_at || b.p.created_at;
    return bDate.localeCompare(aDate);
  });

  const related: RelatedBlogPost[] = scored.slice(0, limit).map(({ p, shared }) => ({
    ...p,
    sharedTagCount: shared.length,
    sharedTags: shared,
  }));

  return { related, loading };
}
