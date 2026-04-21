// Edge function: roda uma auditoria SEO equivalente ao runSeoAudit do client,
// porém contra o HTML servido publicamente (SSR/estático). Útil para comparar
// com o resultado do botão "Executar auditoria" do admin (que roda no DOM React
// já hidratado).
//
// Uso:
//   GET  /functions/v1/seo-audit?url=https://lorenaalvesarq.com
//   POST /functions/v1/seo-audit  { "url": "https://..." }
//
// Resposta: JSON com score, issues e stats — mesmo formato do runSeoAudit.

import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Level = "error" | "warning" | "info" | "ok";
type Issue = { id: string; level: Level; area: string; message: string; hint?: string };

function getMeta(doc: any, name: string): string {
  const el =
    doc.querySelector(`meta[name="${name}"]`) ||
    doc.querySelector(`meta[property="${name}"]`);
  return el?.getAttribute("content") || "";
}

function audit(html: string, sourceUrl: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) throw new Error("Falha ao parsear HTML");

  const issues: Issue[] = [];

  // Title
  const title = doc.querySelector("title")?.textContent?.trim() || "";
  if (!title) {
    issues.push({ id: "title-missing", level: "error", area: "Título", message: "A página não tem <title>." });
  } else if (title.length < 30) {
    issues.push({ id: "title-short", level: "warning", area: "Título", message: `Título muito curto (${title.length} caracteres).`, hint: "Ideal: 40 a 60." });
  } else if (title.length > 65) {
    issues.push({ id: "title-long", level: "warning", area: "Título", message: `Título longo (${title.length} caracteres).`, hint: "Ideal: 40 a 60." });
  } else {
    issues.push({ id: "title-ok", level: "ok", area: "Título", message: `Título em bom tamanho (${title.length} caracteres).` });
  }

  // Description
  const desc = getMeta(doc, "description");
  if (!desc) {
    issues.push({ id: "desc-missing", level: "error", area: "Descrição", message: "Meta description ausente." });
  } else if (desc.length < 80) {
    issues.push({ id: "desc-short", level: "warning", area: "Descrição", message: `Descrição curta (${desc.length} caracteres).`, hint: "Ideal: 120 a 160." });
  } else if (desc.length > 170) {
    issues.push({ id: "desc-long", level: "warning", area: "Descrição", message: `Descrição longa (${desc.length} caracteres) — pode ser cortada.` });
  } else {
    issues.push({ id: "desc-ok", level: "ok", area: "Descrição", message: `Descrição em bom tamanho (${desc.length} caracteres).` });
  }

  // Robots
  const robots = getMeta(doc, "robots") || "index, follow";
  if (robots.toLowerCase().includes("noindex")) {
    issues.push({ id: "robots-noindex", level: "error", area: "Robots", message: "A página está com noindex." });
  }

  // Canonical
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
  if (!canonical) {
    issues.push({ id: "canonical-missing", level: "warning", area: "Canonical", message: "Sem URL canônica definida." });
  }

  // H1 / H2
  const h1s = doc.querySelectorAll("h1");
  const h2s = doc.querySelectorAll("h2");
  if (h1s.length === 0) {
    issues.push({ id: "h1-missing", level: "error", area: "Hierarquia", message: "A página não tem <h1>." });
  } else if (h1s.length > 1) {
    issues.push({ id: "h1-multiple", level: "warning", area: "Hierarquia", message: `Existem ${h1s.length} h1 na página.` });
  }
  if (h2s.length === 0) {
    issues.push({ id: "h2-missing", level: "info", area: "Hierarquia", message: "Nenhum <h2> na página." });
  }

  // Imagens
  const imgs = Array.from(doc.querySelectorAll("img")) as Element[];
  const imgsNoAlt = imgs.filter((i) => !(i.getAttribute("alt") || "").trim());
  if (imgs.length > 0 && imgsNoAlt.length > 0) {
    issues.push({
      id: "img-alt",
      level: imgsNoAlt.length > imgs.length / 3 ? "error" : "warning",
      area: "Imagens",
      message: `${imgsNoAlt.length} de ${imgs.length} imagens sem atributo alt.`,
    });
  } else if (imgs.length > 0) {
    issues.push({ id: "img-alt-ok", level: "ok", area: "Imagens", message: `Todas as ${imgs.length} imagens têm alt.` });
  }

  // Links
  const links = Array.from(doc.querySelectorAll("a")) as Element[];
  const linksNoText = links.filter((a) => {
    const text = (a.textContent || "").trim();
    const aria = a.getAttribute("aria-label");
    return !text && !aria;
  });
  if (linksNoText.length > 0) {
    issues.push({ id: "link-text", level: "warning", area: "Links", message: `${linksNoText.length} links sem texto ou aria-label.` });
  }

  // OG Image
  const ogImage = getMeta(doc, "og:image");
  if (!ogImage) {
    issues.push({ id: "og-image-missing", level: "warning", area: "Social", message: "Sem og:image." });
  }

  // JSON-LD
  const jsonLd = doc.querySelectorAll('script[type="application/ld+json"]');
  if (jsonLd.length === 0) {
    issues.push({ id: "jsonld-missing", level: "warning", area: "Schema", message: "Sem dados estruturados (JSON-LD)." });
  } else {
    issues.push({ id: "jsonld-ok", level: "ok", area: "Schema", message: `${jsonLd.length} bloco(s) de JSON-LD detectado(s).` });
  }

  // Viewport / lang
  if (!doc.querySelector('meta[name="viewport"]')) {
    issues.push({ id: "viewport-missing", level: "error", area: "Mobile", message: "Meta viewport ausente." });
  }
  const lang = doc.querySelector("html")?.getAttribute("lang");
  if (!lang) {
    issues.push({ id: "lang-missing", level: "warning", area: "Idioma", message: "Atributo lang do <html> ausente." });
  }

  // HTTPS
  if (!sourceUrl.startsWith("https://")) {
    issues.push({ id: "https-missing", level: "error", area: "Segurança", message: "URL não está em HTTPS." });
  }

  const weights: Record<Level, number> = { error: 20, warning: 8, info: 2, ok: 0 };
  const penalty = issues.reduce((s, i) => s + weights[i.level], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return {
    score,
    source: sourceUrl,
    fetched_at: new Date().toISOString(),
    issues,
    stats: {
      titleLen: title.length,
      descLen: desc.length,
      h1Count: h1s.length,
      h2Count: h2s.length,
      imagesTotal: imgs.length,
      imagesWithoutAlt: imgsNoAlt.length,
      linksTotal: links.length,
      linksWithoutText: linksNoText.length,
      hasCanonical: !!canonical,
      hasOgImage: !!ogImage,
      hasJsonLd: jsonLd.length > 0,
      title,
      description: desc,
      canonical,
      lang: lang || null,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let url = "";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      url = body.url || "";
    } else {
      url = new URL(req.url).searchParams.get("url") || "";
    }

    if (!url) url = "https://lorenaalvesarq.com";

    if (!/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: "URL inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LorenaAlvesSEOAudit/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Falha ao buscar URL (${res.status})`, url }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const html = await res.text();
    const report = audit(html, url);

    return new Response(JSON.stringify(report, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
