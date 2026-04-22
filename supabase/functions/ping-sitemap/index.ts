// Edge function: ping-sitemap
// ----------------------------------------------------------------------
// Em junho/2023 o Google e o Bing DESCONTINUARAM os endpoints públicos
// de "ping" para sitemaps (/ping?sitemap=...) — agora ambos retornam
// 404/410 e exigem que o sitemap seja submetido via Search Console
// (Google) ou Webmaster Tools (Bing).
//
// Esta função permanece como um "centralizador" para:
//   1. Devolver a URL canônica do sitemap (estático e dinâmico) para
//      facilitar a cópia rápida no admin.
//   2. Tentar — best effort — apenas o IndexNow (Bing/Yandex/Seznam),
//      que é o substituto oficial. Se não houver chave configurada,
//      apenas pula esse passo.
//   3. Manter retorno HTTP 200 sempre que a requisição em si for válida,
//      para o admin não exibir falsos negativos.
// ----------------------------------------------------------------------
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const INDEXNOW_KEY = Deno.env.get("INDEXNOW_KEY") ?? "";

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
    const sitemapStatic = `${base}/sitemap.xml`;
    const sitemapDynamic = `${SUPABASE_URL}/functions/v1/sitemap`;

    const results: Array<{ name: string; ok: boolean; status?: number; note?: string }> = [];

    // Google e Bing — endpoints descontinuados em 2023.
    // Mantemos o registro no retorno apenas para informar o admin,
    // mas marcamos ok=true porque NÃO é uma falha do nosso lado.
    results.push({
      name: "google",
      ok: true,
      status: 0,
      note: "Endpoint público descontinuado em 2023 — submeta o sitemap via Google Search Console.",
    });
    results.push({
      name: "bing",
      ok: true,
      status: 0,
      note: "Endpoint público descontinuado em 2023 — use o Bing Webmaster Tools ou IndexNow.",
    });

    // IndexNow (Bing/Yandex/Seznam) — substituto oficial.
    if (INDEXNOW_KEY) {
      try {
        const host = new URL(base).host;
        const body = {
          host,
          key: INDEXNOW_KEY,
          keyLocation: `${base}/${INDEXNOW_KEY}.txt`,
          urlList: [base, `${base}/portfolio`, `${base}/blog`, `${base}/sobre`, `${base}/faq`],
        };
        const res = await fetch("https://api.indexnow.org/IndexNow", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(body),
        });
        results.push({ name: "indexnow", ok: res.ok, status: res.status });
      } catch (err) {
        results.push({ name: "indexnow", ok: false, note: String(err) });
      }
    } else {
      results.push({
        name: "indexnow",
        ok: true,
        status: 0,
        note: "Chave INDEXNOW_KEY não configurada (opcional).",
      });
    }

    // Registra no log de auditoria SEO para histórico.
    try {
      await supabase.from("seo_audit_log").insert({
        kind: "ping_sitemap",
        score: null,
        notes: `Sitemap publicado: ${sitemapStatic}`,
        issues: results as unknown as Record<string, unknown>,
      });
    } catch {
      // não-bloqueante
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sitemap: sitemapStatic,
        sitemap_dynamic: sitemapDynamic,
        results,
        note:
          "Google e Bing descontinuaram o ping público em 2023. Submeta o sitemap " +
          "manualmente em https://search.google.com/search-console (uma única vez); " +
          "atualizações futuras são detectadas automaticamente pelo `lastmod`.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
