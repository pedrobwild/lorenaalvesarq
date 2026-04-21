// Edge function: ping-sitemap — notifica Google e Bing sobre o sitemap atualizado.
// Público (verify_jwt = false). Usa o canonical_base salvo em site_settings.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: settings } = await supabase
      .from("site_settings")
      .select("seo_canonical_base")
      .eq("id", 1)
      .maybeSingle();

    const base = (settings?.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");
    const sitemapUrl = `${base}/sitemap.xml`;
    const encoded = encodeURIComponent(sitemapUrl);

    const targets = [
      { name: "google", url: `https://www.google.com/ping?sitemap=${encoded}` },
      { name: "bing", url: `https://www.bing.com/ping?sitemap=${encoded}` },
    ];

    const results = await Promise.all(
      targets.map(async (t) => {
        try {
          const res = await fetch(t.url, { method: "GET" });
          return { name: t.name, ok: res.ok, status: res.status };
        } catch (err) {
          return { name: t.name, ok: false, error: String(err) };
        }
      })
    );

    return new Response(
      JSON.stringify({ ok: true, sitemap: sitemapUrl, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
