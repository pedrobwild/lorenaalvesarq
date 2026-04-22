// Edge function: sitemap.xml — gera sitemap dinâmico com base nos projetos visíveis.
// Inclui namespace de imagens (image-sitemap.xsd) e hreflang.
// Público (sem JWT). URL: <project>.functions.supabase.co/sitemap
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const [{ data: settings }, { data: projects }, { data: projectImages }, { data: blogPosts }] = await Promise.all([
    supabase
      .from("site_settings")
      .select("seo_canonical_base, site_title")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("id, slug, title, em, cover_url, updated_at")
      .eq("visible", true)
      .order("order_index", { ascending: true }),
    supabase
      .from("project_images")
      .select("project_id, url, alt, order_index")
      .order("order_index", { ascending: true }),
    supabase
      .from("blog_posts")
      .select("slug, title, cover_url, cover_alt, tags, updated_at, published_at")
      .eq("visible", true)
      .order("published_at", { ascending: false, nullsFirst: false }),
  ]);

  const base = (settings?.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");
  const today = new Date().toISOString().slice(0, 10);

  // Garante URL absoluta para imagens (Google Image Sitemap exige)
  const absUrl = (u: string | null | undefined): string | undefined => {
    if (!u) return undefined;
    if (/^https?:\/\//i.test(u)) return u;
    return `${base}${u.startsWith("/") ? "" : "/"}${u}`;
  };

  // Agrupa imagens por project_id
  const imagesByProject = new Map<string, Array<{ url: string; alt?: string }>>();
  for (const img of (projectImages ?? []) as Array<{
    project_id: string;
    url: string;
    alt: string | null;
  }>) {
    const list = imagesByProject.get(img.project_id) || [];
    list.push({ url: img.url, alt: img.alt ?? undefined });
    imagesByProject.set(img.project_id, list);
  }

  type UrlEntry = {
    loc: string;
    priority: string;
    changefreq: string;
    lastmod: string;
    images?: Array<{ url: string; caption?: string }>;
  };

  const staticUrls: UrlEntry[] = [
    { loc: `${base}/`, priority: "1.0", changefreq: "weekly", lastmod: today },
    { loc: `${base}/faq`, priority: "0.8", changefreq: "monthly", lastmod: today },
    { loc: `${base}/portfolio`, priority: "0.9", changefreq: "weekly", lastmod: today },
    { loc: `${base}/blog`, priority: "0.8", changefreq: "weekly", lastmod: today },
    { loc: `${base}/blog/tags`, priority: "0.6", changefreq: "weekly", lastmod: today },
  ];

  // Agrega tags únicas dos posts visíveis (slug derivado do label)
  function slugifyTag(input: string): string {
    return input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
  const tagSet = new Set<string>();
  for (const b of (blogPosts ?? []) as Array<{ tags?: string[] | null }>) {
    for (const t of b.tags ?? []) {
      const s = slugifyTag(t ?? "");
      if (s) tagSet.add(s);
    }
  }
  const tagUrls: UrlEntry[] = Array.from(tagSet).map((slug) => ({
    loc: `${base}/blog/tag/${slug}`,
    priority: "0.5",
    changefreq: "weekly",
    lastmod: today,
  }));

  const blogUrls: UrlEntry[] = ((blogPosts ?? []) as Array<{
    slug: string;
    title: string;
    cover_url: string | null;
    cover_alt: string | null;
    updated_at: string | null;
    published_at: string | null;
  }>).map((b) => {
    const images: Array<{ url: string; caption?: string }> = [];
    const coverAbs = absUrl(b.cover_url);
    if (coverAbs) images.push({ url: coverAbs, caption: b.cover_alt || b.title });
    return {
      loc: `${base}/blog/${b.slug}`,
      priority: "0.7",
      changefreq: "monthly",
      lastmod: (b.updated_at ?? b.published_at ?? new Date().toISOString()).slice(0, 10),
      images,
    };
  });

  const projectUrls: UrlEntry[] = ((projects ?? []) as Array<{
    id: string;
    slug: string;
    title: string;
    em: string | null;
    cover_url: string | null;
    updated_at: string | null;
  }>).map((p) => {
    const images: Array<{ url: string; caption?: string }> = [];
    const coverAbs = absUrl(p.cover_url);
    if (coverAbs) {
      images.push({ url: coverAbs, caption: `${p.title} ${p.em ?? ""}`.trim() });
    }
    const gallery = imagesByProject.get(p.id) ?? [];
    for (const g of gallery) {
      const abs = absUrl(g.url);
      if (abs && abs !== coverAbs) {
        images.push({ url: abs, caption: g.alt });
      }
    }
    return {
      loc: `${base}/projeto/${p.slug}`,
      priority: "0.8",
      changefreq: "monthly",
      lastmod: (p.updated_at ?? new Date().toISOString()).slice(0, 10),
      images,
    };
  });

  const all = [...staticUrls, ...projectUrls, ...blogUrls];

  const urlsXml = all
    .map((u) => {
      const imagesXml = (u.images ?? [])
        .map(
          (im) =>
            `    <image:image>\n      <image:loc>${xmlEscape(im.url)}</image:loc>${
              im.caption ? `\n      <image:caption>${xmlEscape(im.caption)}</image:caption>` : ""
            }\n    </image:image>`
        )
        .join("\n");
      return (
        `  <url>\n` +
        `    <loc>${xmlEscape(u.loc)}</loc>\n` +
        `    <lastmod>${u.lastmod}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        `    <xhtml:link rel="alternate" hreflang="pt-BR" href="${xmlEscape(u.loc)}" />\n` +
        (imagesXml ? imagesXml + "\n" : "") +
        `  </url>`
      );
    })
    .join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset ` +
    `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ` +
    `xmlns:xhtml="http://www.w3.org/1999/xhtml" ` +
    `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    urlsXml +
    `\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});
