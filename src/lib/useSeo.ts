import { useEffect } from "react";
import { fetchSiteSettings, type SiteSettings } from "./useSiteSettings";

export type SeoInput = {
  title?: string;
  description?: string;
  canonicalPath?: string; // ex: "/portfolio" ou "/projeto/casa-paineira"
  ogImage?: string;
  ogType?: "website" | "article";
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const MANAGED_ATTR = "data-seo-managed";

function setMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (!el) {
    const tag = selector.startsWith("link") ? "link" : "meta";
    el = document.createElement(tag) as HTMLMetaElement | HTMLLinkElement;
    el.setAttribute(MANAGED_ATTR, "true");
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
}

function clearJsonLd() {
  document.head
    .querySelectorAll<HTMLScriptElement>(`script[type="application/ld+json"][${MANAGED_ATTR}]`)
    .forEach((n) => n.remove());
}

function addJsonLd(data: Record<string, unknown> | Array<Record<string, unknown>>) {
  const arr = Array.isArray(data) ? data : [data];
  for (const item of arr) {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.setAttribute(MANAGED_ATTR, "true");
    s.text = JSON.stringify(item);
    document.head.appendChild(s);
  }
}

function applySeo(settings: SiteSettings, seo: SeoInput) {
  const base = (settings.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");
  const title = seo.title || settings.seo_default_title || settings.site_title || "lorenaalves arq";
  const description =
    seo.description || settings.seo_default_description || settings.site_description || "";
  const ogImage = seo.ogImage || settings.seo_og_image || settings.default_og_image || "";
  const canonical = seo.canonicalPath
    ? `${base}${seo.canonicalPath.startsWith("/") ? seo.canonicalPath : `/${seo.canonicalPath}`}`
    : base + "/";
  const robots = seo.noindex ? "noindex, nofollow" : settings.seo_robots || "index, follow";
  const ogType = seo.ogType || "website";

  document.title = title;

  setMeta('meta[name="description"]', { name: "description", content: description });
  setMeta('meta[name="robots"]', { name: "robots", content: robots });
  setMeta('link[rel="canonical"]', { rel: "canonical", href: canonical });

  setMeta('meta[property="og:title"]', { property: "og:title", content: title });
  setMeta('meta[property="og:description"]', { property: "og:description", content: description });
  setMeta('meta[property="og:type"]', { property: "og:type", content: ogType });
  setMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
  setMeta('meta[property="og:locale"]', { property: "og:locale", content: "pt_BR" });
  if (ogImage) {
    setMeta('meta[property="og:image"]', { property: "og:image", content: ogImage });
  }

  setMeta('meta[name="twitter:card"]', {
    name: "twitter:card",
    content: ogImage ? "summary_large_image" : "summary",
  });
  setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
  setMeta('meta[name="twitter:description"]', {
    name: "twitter:description",
    content: description,
  });
  if (ogImage) {
    setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: ogImage });
  }
  if (settings.seo_twitter_handle) {
    setMeta('meta[name="twitter:site"]', {
      name: "twitter:site",
      content: settings.seo_twitter_handle,
    });
  }

  clearJsonLd();
  if (seo.jsonLd) addJsonLd(seo.jsonLd);
}

/**
 * useSeo — aplica meta tags + canonical + OG/Twitter + JSON-LD por rota.
 * Usa o DOM diretamente (sem react-helmet-async para evitar nova dependência).
 */
export function useSeo(seo: SeoInput) {
  // Serializa as deps em string estável para evitar reaplicar a cada render.
  const dep = JSON.stringify(seo);
  useEffect(() => {
    let cancelled = false;
    fetchSiteSettings().then((settings) => {
      if (cancelled) return;
      applySeo(settings, seo);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
}

// Helpers para JSON-LD comuns
export function professionalServiceJsonLd(s: SiteSettings) {
  const base = (s.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: s.site_title || "Lorena Alves Arquitetura",
    description: s.seo_default_description || s.site_description || "",
    url: base,
    image: s.seo_og_image || s.default_og_image || undefined,
    email: s.contact_email || undefined,
    telephone: s.contact_phone || undefined,
    address:
      s.address_street || s.address_city
        ? {
            "@type": "PostalAddress",
            streetAddress: s.address_street || undefined,
            addressLocality: s.address_city || undefined,
            addressRegion: s.address_region || undefined,
            addressCountry: "BR",
          }
        : undefined,
    sameAs: [s.instagram_url, s.linkedin_url, s.pinterest_url].filter(Boolean),
  };
}

export function projectJsonLd(
  s: SiteSettings,
  project: {
    slug: string;
    title: string;
    em?: string;
    summary?: string;
    cover?: string;
    location?: string;
    year?: string;
    tag?: string;
  }
) {
  const base = (s.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `${project.title} ${project.em ?? ""}`.trim(),
    description: project.summary,
    image: project.cover,
    url: `${base}/projeto/${project.slug}`,
    creator: {
      "@type": "Organization",
      name: s.site_title || "Lorena Alves Arquitetura",
      url: base,
    },
    about: project.tag,
    contentLocation: project.location,
    dateCreated: project.year,
  };
}

/** BreadcrumbList JSON-LD para melhorar exibição em SERP. */
export function breadcrumbJsonLd(
  s: SiteSettings,
  trail: Array<{ name: string; path: string }>
) {
  const base = (s.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: `${base}${t.path.startsWith("/") ? t.path : `/${t.path}`}`,
    })),
  };
}

/** ItemList JSON-LD para coleções (ex.: portfólio). */
export function itemListJsonLd(
  s: SiteSettings,
  items: Array<{ name: string; path: string; image?: string }>
) {
  const base = (s.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${base}${it.path.startsWith("/") ? it.path : `/${it.path}`}`,
      name: it.name,
      image: it.image,
    })),
  };
}
