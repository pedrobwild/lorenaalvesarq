// Edge function: roda uma auditoria SEO equivalente ao runSeoAudit do client,
// porém contra o HTML servido publicamente (SSR/estático). Útil para comparar
// com o resultado do botão "Executar auditoria" do admin (que roda no DOM React
// já hidratado).
//
// Além da auditoria, o relatório inclui um bloco `expected_vs_static` que
// lista as tags que o useSeo injeta em runtime (title, description, OG,
// Twitter, verificações, JSON-LD, trackers) e indica se cada uma já está
// presente no HTML estático ou só aparece após o React hidratar.

import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

function audit(doc: any, html: string, sourceUrl: string) {
  const issues: Issue[] = [];

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

  const robots = getMeta(doc, "robots") || "index, follow";
  if (robots.toLowerCase().includes("noindex")) {
    issues.push({ id: "robots-noindex", level: "error", area: "Robots", message: "A página está com noindex." });
  }

  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
  if (!canonical) {
    issues.push({ id: "canonical-missing", level: "warning", area: "Canonical", message: "Sem URL canônica definida." });
  }

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

  const links = Array.from(doc.querySelectorAll("a")) as Element[];
  const linksNoText = links.filter((a) => {
    const text = (a.textContent || "").trim();
    const aria = a.getAttribute("aria-label");
    return !text && !aria;
  });
  if (linksNoText.length > 0) {
    issues.push({ id: "link-text", level: "warning", area: "Links", message: `${linksNoText.length} links sem texto ou aria-label.` });
  }

  const ogImage = getMeta(doc, "og:image");
  if (!ogImage) {
    issues.push({ id: "og-image-missing", level: "warning", area: "Social", message: "Sem og:image." });
  }

  const jsonLd = doc.querySelectorAll('script[type="application/ld+json"]');
  if (jsonLd.length === 0) {
    issues.push({ id: "jsonld-missing", level: "warning", area: "Schema", message: "Sem dados estruturados (JSON-LD)." });
  } else {
    issues.push({ id: "jsonld-ok", level: "ok", area: "Schema", message: `${jsonLd.length} bloco(s) de JSON-LD detectado(s).` });
  }

  if (!doc.querySelector('meta[name="viewport"]')) {
    issues.push({ id: "viewport-missing", level: "error", area: "Mobile", message: "Meta viewport ausente." });
  }
  const lang = doc.querySelector("html")?.getAttribute("lang");
  if (!lang) {
    issues.push({ id: "lang-missing", level: "warning", area: "Idioma", message: "Atributo lang do <html> ausente." });
  }

  if (!sourceUrl.startsWith("https://")) {
    issues.push({ id: "https-missing", level: "error", area: "Segurança", message: "URL não está em HTTPS." });
  }

  const weights: Record<Level, number> = { error: 20, warning: 8, info: 2, ok: 0 };
  const penalty = issues.reduce((s, i) => s + weights[i.level], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return {
    score,
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

// -----------------------------------------------------------------------------
// Esperado vs estático: replica o que o useSeo injeta em runtime e checa se
// cada tag já está presente no HTML servido (antes do React rodar).
// -----------------------------------------------------------------------------

type ExpectedTag = {
  key: string;
  area: "title" | "description" | "canonical" | "og" | "twitter" | "verification" | "jsonld" | "tracker" | "geo" | "robots";
  selector: string;          // CSS selector usado para localizar no HTML estático
  expected: string;          // valor que o useSeo aplicaria (vazio = só presença)
  found_in_static: boolean;  // se a tag existe no HTML servido
  found_value?: string;      // valor presente no HTML estático (se houver)
  matches_expected?: boolean; // se valor estático === valor esperado
  source: "useSeo" | "settings" | "default";
  note?: string;
};

type Settings = Record<string, unknown> | null;

function s(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function getAttr(doc: any, selector: string, attr: string): string {
  const el = doc.querySelector(selector);
  return el?.getAttribute(attr) ?? "";
}

function metaContent(doc: any, selector: string): string {
  return getAttr(doc, selector, "content");
}

function buildExpected(settings: Settings, sourceUrl: string): ExpectedTag[] {
  const cfg = settings ?? {};
  const base = (s(cfg.seo_canonical_base) || "https://lorenaalvesarq.com").replace(/\/$/, "");
  const title = s(cfg.seo_default_title) || s(cfg.site_title) || "lorenaalves arq";
  const description = s(cfg.seo_default_description) || s(cfg.site_description) || "";
  const ogImage = s(cfg.seo_og_image) || s(cfg.default_og_image) || "";
  const robots = s(cfg.seo_robots) || "index, follow";
  const canonical = `${base}${new URL(sourceUrl).pathname || "/"}`;
  const siteName = s(cfg.site_title) || "Lorena Alves Arquitetura";
  const twitterCard = ogImage ? "summary_large_image" : "summary";

  const tags: Omit<ExpectedTag, "found_in_static" | "found_value" | "matches_expected">[] = [
    { key: "<title>", area: "title", selector: "title", expected: title, source: "useSeo" },
    { key: "meta[name=description]", area: "description", selector: 'meta[name="description"]', expected: description, source: "useSeo" },
    { key: "meta[name=robots]", area: "robots", selector: 'meta[name="robots"]', expected: robots, source: "useSeo" },
    { key: "link[rel=canonical]", area: "canonical", selector: 'link[rel="canonical"]', expected: canonical, source: "useSeo" },

    // Open Graph
    { key: "og:title", area: "og", selector: 'meta[property="og:title"]', expected: title, source: "useSeo" },
    { key: "og:description", area: "og", selector: 'meta[property="og:description"]', expected: description, source: "useSeo" },
    { key: "og:type", area: "og", selector: 'meta[property="og:type"]', expected: "website", source: "useSeo" },
    { key: "og:url", area: "og", selector: 'meta[property="og:url"]', expected: canonical, source: "useSeo" },
    { key: "og:locale", area: "og", selector: 'meta[property="og:locale"]', expected: "pt_BR", source: "useSeo" },
    { key: "og:site_name", area: "og", selector: 'meta[property="og:site_name"]', expected: siteName, source: "useSeo" },

    // Twitter
    { key: "twitter:card", area: "twitter", selector: 'meta[name="twitter:card"]', expected: twitterCard, source: "useSeo" },
    { key: "twitter:title", area: "twitter", selector: 'meta[name="twitter:title"]', expected: title, source: "useSeo" },
    { key: "twitter:description", area: "twitter", selector: 'meta[name="twitter:description"]', expected: description, source: "useSeo" },
  ];

  // Condicionais: só esperar se o valor existe nos settings
  if (ogImage) {
    tags.push(
      { key: "og:image", area: "og", selector: 'meta[property="og:image"]', expected: ogImage, source: "settings" },
      { key: "og:image:width", area: "og", selector: 'meta[property="og:image:width"]', expected: "1200", source: "settings" },
      { key: "og:image:height", area: "og", selector: 'meta[property="og:image:height"]', expected: "630", source: "settings" },
      { key: "twitter:image", area: "twitter", selector: 'meta[name="twitter:image"]', expected: ogImage, source: "settings" },
    );
  }
  if (s(cfg.seo_twitter_handle)) {
    tags.push({ key: "twitter:site", area: "twitter", selector: 'meta[name="twitter:site"]', expected: s(cfg.seo_twitter_handle), source: "settings" });
  }
  if (s(cfg.seo_keywords)) {
    tags.push({ key: "keywords", area: "description", selector: 'meta[name="keywords"]', expected: s(cfg.seo_keywords), source: "settings" });
  }
  if (s(cfg.seo_author)) {
    tags.push({ key: "author", area: "description", selector: 'meta[name="author"]', expected: s(cfg.seo_author), source: "settings" });
  }
  if (s(cfg.seo_geo_region)) {
    tags.push({ key: "geo.region", area: "geo", selector: 'meta[name="geo.region"]', expected: s(cfg.seo_geo_region), source: "settings" });
  }
  if (s(cfg.seo_geo_placename)) {
    tags.push({ key: "geo.placename", area: "geo", selector: 'meta[name="geo.placename"]', expected: s(cfg.seo_geo_placename), source: "settings" });
  }
  if (s(cfg.seo_geo_position)) {
    tags.push({ key: "geo.position", area: "geo", selector: 'meta[name="geo.position"]', expected: s(cfg.seo_geo_position), source: "settings" });
  }

  // Verificações de proprietário
  const verifications: Array<[string, string, string]> = [
    ["google-site-verification", "google_site_verification", "google-site-verification"],
    ["msvalidate.01", "bing_site_verification", "msvalidate.01"],
    ["yandex-verification", "yandex_verification", "yandex-verification"],
    ["facebook-domain-verification", "facebook_domain_verification", "facebook-domain-verification"],
    ["p:domain_verify", "pinterest_site_verification", "p:domain_verify"],
  ];
  for (const [key, settingKey, metaName] of verifications) {
    const v = s(cfg[settingKey]);
    if (v) {
      tags.push({
        key,
        area: "verification",
        selector: `meta[name="${metaName}"]`,
        expected: v,
        source: "settings",
      });
    }
  }

  // Trackers (só presença do <script id="...">)
  const trackers: Array<[string, string, string, string]> = [
    ["GA4", "google_analytics_id", "#ga4-loader", "Google Analytics 4 loader"],
    ["GTM", "google_tag_manager_id", "#gtm-loader", "Google Tag Manager loader"],
    ["Meta Pixel", "meta_pixel_id", "#meta-pixel", "Facebook Pixel"],
    ["Clarity", "clarity_id", "#clarity-loader", "Microsoft Clarity"],
    ["Hotjar", "hotjar_id", "#hotjar-loader", "Hotjar"],
  ];
  for (const [key, settingKey, selector, note] of trackers) {
    if (s(cfg[settingKey])) {
      tags.push({
        key,
        area: "tracker",
        selector,
        expected: "(script presente)",
        source: "settings",
        note,
      });
    }
  }

  // JSON-LD: por padrão a Home injeta ProfessionalService + WebSite + Organization
  tags.push({
    key: "JSON-LD ProfessionalService/LocalBusiness",
    area: "jsonld",
    selector: 'script[type="application/ld+json"]',
    expected: cfg.business_type ? s(cfg.business_type) : "ProfessionalService",
    source: "useSeo",
    note: "Procurado por @type dentro de qualquer bloco JSON-LD",
  });
  tags.push({
    key: "JSON-LD WebSite",
    area: "jsonld",
    selector: 'script[type="application/ld+json"]',
    expected: "WebSite",
    source: "useSeo",
  });
  tags.push({
    key: "JSON-LD Organization",
    area: "jsonld",
    selector: 'script[type="application/ld+json"]',
    expected: "Organization",
    source: "useSeo",
  });

  return tags.map((t) => ({
    ...t,
    found_in_static: false,
    found_value: undefined,
    matches_expected: undefined,
  }));
}

function checkExpected(doc: any, expected: ExpectedTag[]): ExpectedTag[] {
  // Pré-extrai todos os JSON-LD para checar @type rapidamente
  const jsonLdTypes = new Set<string>();
  const jsonLdNodes = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const node of jsonLdNodes) {
    try {
      const parsed = JSON.parse(node.textContent || "");
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of arr) {
        const t = item?.["@type"];
        if (typeof t === "string") jsonLdTypes.add(t);
        if (Array.isArray(t)) t.forEach((x: string) => jsonLdTypes.add(x));
      }
    } catch {
      /* ignora bloco inválido */
    }
  }

  return expected.map((tag) => {
    if (tag.area === "jsonld") {
      const found = jsonLdTypes.has(tag.expected);
      return {
        ...tag,
        found_in_static: found,
        found_value: found ? tag.expected : undefined,
        matches_expected: found,
      };
    }

    if (tag.area === "tracker") {
      const found = !!doc.querySelector(tag.selector);
      return { ...tag, found_in_static: found, matches_expected: found };
    }

    if (tag.selector === "title") {
      const value = doc.querySelector("title")?.textContent?.trim() || "";
      return {
        ...tag,
        found_in_static: !!value,
        found_value: value || undefined,
        matches_expected: value === tag.expected,
      };
    }

    if (tag.selector.startsWith("link[")) {
      const value = getAttr(doc, tag.selector, "href");
      return {
        ...tag,
        found_in_static: !!value,
        found_value: value || undefined,
        matches_expected: value === tag.expected,
      };
    }

    const value = metaContent(doc, tag.selector);
    return {
      ...tag,
      found_in_static: !!value,
      found_value: value || undefined,
      matches_expected: value === tag.expected,
    };
  });
}

function summarizeExpected(checked: ExpectedTag[]) {
  const total = checked.length;
  const inStatic = checked.filter((t) => t.found_in_static).length;
  const matching = checked.filter((t) => t.matches_expected).length;
  const onlyAfterReact = checked
    .filter((t) => !t.found_in_static)
    .map((t) => t.key);
  const mismatched = checked
    .filter((t) => t.found_in_static && t.matches_expected === false)
    .map((t) => ({ key: t.key, expected: t.expected, found: t.found_value }));

  return {
    total,
    found_in_static: inStatic,
    matching_expected: matching,
    only_after_react: onlyAfterReact,
    mismatched_value: mismatched,
  };
}

async function loadSettings(): Promise<Settings> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  try {
    const sb = createClient(url, key);
    const { data } = await sb.from("site_settings").select("*").eq("id", 1).maybeSingle();
    return (data as Settings) ?? null;
  } catch {
    return null;
  }
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

    const [res, settings] = await Promise.all([
      fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LorenaAlvesSEOAudit/1.0)",
          Accept: "text/html",
        },
        redirect: "follow",
      }),
      loadSettings(),
    ]);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Falha ao buscar URL (${res.status})`, url }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) throw new Error("Falha ao parsear HTML");

    const auditResult = audit(doc, html, url);
    const expectedTags = buildExpected(settings, url);
    const checked = checkExpected(doc, expectedTags);
    const summary = summarizeExpected(checked);

    const report = {
      ...auditResult,
      source: url,
      fetched_at: new Date().toISOString(),
      settings_loaded: !!settings,
      expected_vs_static: {
        summary,
        legend: {
          found_in_static:
            "true = a tag já existe no HTML servido (sem precisar do React). false = o useSeo só vai injetar depois da hidratação.",
          matches_expected:
            "true = valor estático bate exatamente com o que o useSeo aplicaria. false = valor diferente (provavelmente sobrescrito em runtime).",
        },
        tags: checked,
      },
    };

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
