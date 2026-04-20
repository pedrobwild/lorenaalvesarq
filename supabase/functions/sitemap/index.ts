// Edge function: sitemap.xml — gera sitemap dinâmico com base nos projetos visíveis.
// Público (sem JWT). URL: <project>.functions.supabase.co/sitemap
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const [{ data: settings }, { data: projects }] = await Promise.all([
    supabase.from("site_settings").select("seo_canonical_base").eq("id", 1).maybeSingle(),
    supabase
      .from("projects")
      .select("slug, updated_at")
      .eq("visible", true)
      .order("order_index", { ascending: true }),
  ]);

  const base = (settings?.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");
  const today = new Date().toISOString().slice(0, 10);

  const staticUrls = [
    { loc: `${base}/`, priority: "1.0", changefreq: "weekly", lastmod: today },
    { loc: `${base}/portfolio`, priority: "0.9", changefreq: "weekly", lastmod: today },
  ];

  const projectUrls = (projects ?? []).map((p) => ({
    loc: `${base}/projeto/${p.slug}`,
    priority: "0.8",
    changefreq: "monthly",
    lastmod: (p.updated_at ?? new Date().toISOString()).slice(0, 10),
  }));

  const all = [...staticUrls, ...projectUrls];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    all
      .map(
        (u) =>
          `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n    <xhtml:link rel="alternate" hreflang="pt-BR" href="${u.loc}" />\n  </url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
