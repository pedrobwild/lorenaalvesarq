// Edge function: robots.txt — gera robots dinâmico apontando para o sitemap.
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
  const { data: settings } = await supabase
    .from("site_settings")
    .select("seo_canonical_base, seo_robots")
    .eq("id", 1)
    .maybeSingle();

  const base = (settings?.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");
  const robotsDirective = (settings?.seo_robots || "index, follow").toLowerCase();
  const disallowAll = robotsDirective.includes("noindex");

  const sitemapUrl = `${SUPABASE_URL}/functions/v1/sitemap`;

  const txt =
    `# robots.txt — gerado dinamicamente\n` +
    `User-agent: *\n` +
    (disallowAll ? `Disallow: /\n` : `Allow: /\nDisallow: /admin\n`) +
    `\nSitemap: ${base}/sitemap.xml\nSitemap: ${sitemapUrl}\n`;

  return new Response(txt, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
