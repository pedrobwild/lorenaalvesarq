// Auditoria SEO on-page: inspeciona o DOM da página atual e detecta
// problemas comuns que o Google usa para ranquear conteúdos.

import type { SiteSettings } from "./useSiteSettings";

export type SeoIssueLevel = "error" | "warning" | "info" | "ok";

export type SeoIssue = {
  id: string;
  level: SeoIssueLevel;
  area: string;
  message: string;
  hint?: string;
};

export type SeoAuditResult = {
  score: number; // 0-100
  issues: SeoIssue[];
  stats: {
    titleLen: number;
    descLen: number;
    h1Count: number;
    h2Count: number;
    imagesTotal: number;
    imagesWithoutAlt: number;
    linksTotal: number;
    linksWithoutText: number;
    hasCanonical: boolean;
    hasOgImage: boolean;
    hasJsonLd: boolean;
  };
};

function has(sel: string) {
  return !!document.head.querySelector(sel);
}
function getMeta(name: string) {
  const el = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"], meta[property="${name}"]`
  );
  return el?.getAttribute("content") || "";
}

export function runSeoAudit(settings: SiteSettings): SeoAuditResult {
  const issues: SeoIssue[] = [];

  // --- Title
  const title = document.title || "";
  if (!title) {
    issues.push({
      id: "title-missing",
      level: "error",
      area: "Título",
      message: "A página não tem <title>.",
      hint: "Defina um título único e descritivo, 40–60 caracteres.",
    });
  } else if (title.length < 30) {
    issues.push({
      id: "title-short",
      level: "warning",
      area: "Título",
      message: `Título muito curto (${title.length} caracteres).`,
      hint: "Ideal: 40 a 60 caracteres.",
    });
  } else if (title.length > 65) {
    issues.push({
      id: "title-long",
      level: "warning",
      area: "Título",
      message: `Título longo (${title.length} caracteres) — pode ser cortado no Google.`,
      hint: "Mantenha entre 40 e 60 caracteres.",
    });
  } else {
    issues.push({
      id: "title-ok",
      level: "ok",
      area: "Título",
      message: `Título em bom tamanho (${title.length} caracteres).`,
    });
  }

  // --- Description
  const desc = getMeta("description");
  if (!desc) {
    issues.push({
      id: "desc-missing",
      level: "error",
      area: "Descrição",
      message: "Meta description ausente.",
      hint: "Escreva uma descrição persuasiva de 120–160 caracteres.",
    });
  } else if (desc.length < 80) {
    issues.push({
      id: "desc-short",
      level: "warning",
      area: "Descrição",
      message: `Descrição curta (${desc.length} caracteres).`,
      hint: "Ideal: 120 a 160 caracteres.",
    });
  } else if (desc.length > 170) {
    issues.push({
      id: "desc-long",
      level: "warning",
      area: "Descrição",
      message: `Descrição longa (${desc.length} caracteres) — pode ser cortada.`,
    });
  } else {
    issues.push({
      id: "desc-ok",
      level: "ok",
      area: "Descrição",
      message: `Descrição em bom tamanho (${desc.length} caracteres).`,
    });
  }

  // --- Robots
  const robots = getMeta("robots") || "index, follow";
  if (robots.toLowerCase().includes("noindex")) {
    issues.push({
      id: "robots-noindex",
      level: "error",
      area: "Robots",
      message: "A página está com noindex — não aparecerá no Google.",
      hint: "Em Admin › SEO › Global, coloque em 'index, follow'.",
    });
  }

  // --- Canonical
  const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const hasCanonical = !!canonical?.href;
  if (!hasCanonical) {
    issues.push({
      id: "canonical-missing",
      level: "warning",
      area: "Canonical",
      message: "Sem URL canônica definida.",
      hint: "Evita duplicação de conteúdo para o Google.",
    });
  }

  // --- H1 / H2
  const h1s = document.querySelectorAll("h1");
  const h2s = document.querySelectorAll("h2");
  if (h1s.length === 0) {
    issues.push({
      id: "h1-missing",
      level: "error",
      area: "Hierarquia",
      message: "A página não tem <h1>.",
      hint: "Toda página precisa de um título principal único (h1).",
    });
  } else if (h1s.length > 1) {
    issues.push({
      id: "h1-multiple",
      level: "warning",
      area: "Hierarquia",
      message: `Existem ${h1s.length} h1 na página.`,
      hint: "Prefira um único h1 por página.",
    });
  }
  if (h2s.length === 0) {
    issues.push({
      id: "h2-missing",
      level: "info",
      area: "Hierarquia",
      message: "Nenhum <h2> na página.",
      hint: "Use h2/h3 para seccionar o conteúdo e ajudar a leitura.",
    });
  }

  // --- Imagens com alt
  const imgs = Array.from(document.querySelectorAll("img"));
  const imgsNoAlt = imgs.filter((i) => !(i.getAttribute("alt") || "").trim());
  if (imgs.length > 0 && imgsNoAlt.length > 0) {
    issues.push({
      id: "img-alt",
      level: imgsNoAlt.length > imgs.length / 3 ? "error" : "warning",
      area: "Imagens",
      message: `${imgsNoAlt.length} de ${imgs.length} imagens sem atributo alt.`,
      hint: "Texto alt é essencial para acessibilidade e SEO de imagens.",
    });
  } else if (imgs.length > 0) {
    issues.push({
      id: "img-alt-ok",
      level: "ok",
      area: "Imagens",
      message: `Todas as ${imgs.length} imagens têm alt.`,
    });
  }

  // --- Links sem texto
  const links = Array.from(document.querySelectorAll("a"));
  const linksNoText = links.filter((a) => {
    const text = (a.textContent || "").trim();
    const aria = a.getAttribute("aria-label");
    return !text && !aria;
  });
  if (linksNoText.length > 0) {
    issues.push({
      id: "link-text",
      level: "warning",
      area: "Links",
      message: `${linksNoText.length} links sem texto ou aria-label.`,
      hint: "Todo link precisa de texto descritivo (ou aria-label).",
    });
  }

  // --- Open Graph
  const ogImage = getMeta("og:image");
  if (!ogImage) {
    issues.push({
      id: "og-image-missing",
      level: "warning",
      area: "Social",
      message: "Sem imagem de compartilhamento (og:image).",
      hint: "Faça upload em SEO › Imagem padrão. Ideal: 1200×630px.",
    });
  }

  // --- Schema / JSON-LD
  const jsonLd = document.head.querySelectorAll('script[type="application/ld+json"]');
  if (jsonLd.length === 0) {
    issues.push({
      id: "jsonld-missing",
      level: "warning",
      area: "Schema",
      message: "Sem dados estruturados (JSON-LD).",
      hint: "Presença de Schema.org melhora rich results no Google.",
    });
  } else {
    issues.push({
      id: "jsonld-ok",
      level: "ok",
      area: "Schema",
      message: `${jsonLd.length} bloco(s) de JSON-LD detectado(s).`,
    });
  }

  // --- Viewport & idioma
  if (!has('meta[name="viewport"]')) {
    issues.push({
      id: "viewport-missing",
      level: "error",
      area: "Mobile",
      message: "Meta viewport ausente — o site não é mobile-friendly.",
    });
  }
  const lang = document.documentElement.getAttribute("lang");
  if (!lang) {
    issues.push({
      id: "lang-missing",
      level: "warning",
      area: "Idioma",
      message: "Atributo lang do <html> ausente.",
      hint: "Defina lang='pt-BR'.",
    });
  }

  // --- HTTPS
  if (location.protocol !== "https:" && location.hostname !== "localhost") {
    issues.push({
      id: "https-missing",
      level: "error",
      area: "Segurança",
      message: "Site não está em HTTPS.",
      hint: "Ative HTTPS no host. O Google penaliza sites sem SSL.",
    });
  }

  // --- Settings críticos
  if (!settings.google_site_verification) {
    issues.push({
      id: "gsc-missing",
      level: "info",
      area: "Google Search Console",
      message: "Código de verificação do Search Console não foi preenchido.",
      hint: "Em Admin › SEO › Ferramentas Google, cole o código de verificação.",
    });
  }
  if (!settings.google_analytics_id && !settings.google_tag_manager_id) {
    issues.push({
      id: "ga-missing",
      level: "info",
      area: "Google Analytics",
      message: "Nenhum ID de GA4 ou GTM configurado.",
      hint: "Recomendado para acompanhar tráfego e conversões.",
    });
  }

  // --- Score
  const weights = { error: 20, warning: 8, info: 2, ok: 0 };
  const penalty = issues.reduce((s, i) => s + (weights as Record<string, number>)[i.level], 0);
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
      hasCanonical,
      hasOgImage: !!ogImage,
      hasJsonLd: jsonLd.length > 0,
    },
  };
}
