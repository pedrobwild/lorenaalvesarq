import { useEffect } from "react";
import { fetchSiteSettings, invalidateSiteSettings, type SiteSettings } from "./useSiteSettings";

export const SEO_REFRESH_EVENT = "seo:refresh";

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
const INJECTED_ATTR = "data-seo-injected";

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

/** Injeta uma tag <meta name=X content=Y> apenas se value for truthy */
function setMetaIf(selector: string, attrs: Record<string, string>, value?: string | null) {
  if (!value) {
    const existing = document.head.querySelector(selector);
    if (existing?.getAttribute(MANAGED_ATTR)) existing.remove();
    return;
  }
  setMeta(selector, attrs);
}

/** Carrega script externo uma única vez (idempotente via id). */
function ensureScript(id: string, src: string, inline?: string, extra?: Record<string, string>) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.setAttribute(INJECTED_ATTR, "true");
  if (src) {
    s.src = src;
    s.async = true;
  }
  if (inline) s.text = inline;
  if (extra) for (const [k, v] of Object.entries(extra)) s.setAttribute(k, v);
  document.head.appendChild(s);
}

/** Injeta Google Analytics 4 (GA4) */
function injectGA4(id: string) {
  ensureScript("ga4-loader", `https://www.googletagmanager.com/gtag/js?id=${id}`);
  ensureScript(
    "ga4-config",
    "",
    `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}', { anonymize_ip: true });`
  );
}

/** Injeta Google Tag Manager */
function injectGTM(id: string) {
  ensureScript(
    "gtm-loader",
    "",
    `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`
  );

  // Noscript fallback
  if (!document.getElementById("gtm-noscript")) {
    const ns = document.createElement("noscript");
    ns.id = "gtm-noscript";
    ns.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.insertBefore(ns, document.body.firstChild);
  }
}

/** Injeta Meta Pixel (Facebook) */
function injectMetaPixel(id: string) {
  ensureScript(
    "meta-pixel",
    "",
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');fbq('track', 'PageView');`
  );
}

/** Microsoft Clarity */
function injectClarity(id: string) {
  ensureScript(
    "clarity-loader",
    "",
    `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");`
  );
}

/** Hotjar */
function injectHotjar(id: string) {
  ensureScript(
    "hotjar-loader",
    "",
    `(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};h._hjSettings={hjid:${id},hjsv:6};a=o.getElementsByTagName('head')[0];r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;a.appendChild(r);})(window,document,'https://static.hotjar.com/c/hotjar-',".js?sv=");`
  );
}

function injectTrackers(settings: SiteSettings) {
  if (settings.google_tag_manager_id) injectGTM(settings.google_tag_manager_id);
  if (settings.google_analytics_id) injectGA4(settings.google_analytics_id);
  if (settings.meta_pixel_id) injectMetaPixel(settings.meta_pixel_id);
  if (settings.clarity_id) injectClarity(settings.clarity_id);
  if (settings.hotjar_id) injectHotjar(settings.hotjar_id);
}

function applySeo(settings: SiteSettings, seo: SeoInput) {
  const base = (settings.seo_canonical_base?.trim() || "https://lorenaalvesarq.com").replace(/\/$/, "");
  const title = seo.title || settings.seo_default_title || settings.site_title || "lorenaalves arq";
  const description =
    seo.description || settings.seo_default_description || settings.site_description || "";
  const ogImage = seo.ogImage || settings.seo_og_image || settings.default_og_image || "";

  // Canonical: ignora âncoras (#faq) e querystring para evitar duplicidade
  // Ex.: /#faq → canonical da home (/), /faq → canonical próprio
  const rawPath = seo.canonicalPath || "/";
  const cleanPath = rawPath.split("#")[0].split("?")[0] || "/";
  const canonical = `${base}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`.replace(
    /(.+)\/$/,
    "$1"
  ) || `${base}/`;
  // Garante barra final apenas para a raiz
  const canonicalUrl = cleanPath === "/" ? `${base}/` : canonical;

  const robots = seo.noindex ? "noindex, nofollow" : settings.seo_robots || "index, follow";
  const ogType = seo.ogType || "website";

  document.title = title;

  setMeta('meta[name="description"]', { name: "description", content: description });
  setMeta('meta[name="robots"]', { name: "robots", content: robots });
  setMeta('link[rel="canonical"]', { rel: "canonical", href: canonicalUrl });

  // hreflang — pt-BR + x-default apontando para o canonical da rota atual.
  // Remove duplicatas estáticas do index.html (que apontam só para a home)
  // e injeta as corretas conforme a página.
  document.head
    .querySelectorAll('link[rel="alternate"][hreflang]')
    .forEach((n) => n.remove());
  const hrefPt = document.createElement("link");
  hrefPt.setAttribute("rel", "alternate");
  hrefPt.setAttribute("hreflang", "pt-BR");
  hrefPt.setAttribute("href", canonicalUrl);
  hrefPt.setAttribute(MANAGED_ATTR, "true");
  document.head.appendChild(hrefPt);
  const hrefDefault = document.createElement("link");
  hrefDefault.setAttribute("rel", "alternate");
  hrefDefault.setAttribute("hreflang", "x-default");
  hrefDefault.setAttribute("href", canonicalUrl);
  hrefDefault.setAttribute(MANAGED_ATTR, "true");
  document.head.appendChild(hrefDefault);

  // SEO extras (autor, keywords, geo)
  if (settings.seo_keywords)
    setMeta('meta[name="keywords"]', { name: "keywords", content: settings.seo_keywords });
  if (settings.seo_author)
    setMeta('meta[name="author"]', { name: "author", content: settings.seo_author });
  if (settings.seo_geo_region)
    setMeta('meta[name="geo.region"]', { name: "geo.region", content: settings.seo_geo_region });
  if (settings.seo_geo_placename)
    setMeta('meta[name="geo.placename"]', {
      name: "geo.placename",
      content: settings.seo_geo_placename,
    });
  if (settings.seo_geo_position)
    setMeta('meta[name="geo.position"]', {
      name: "geo.position",
      content: settings.seo_geo_position,
    });

  // Open Graph
  setMeta('meta[property="og:title"]', { property: "og:title", content: title });
  setMeta('meta[property="og:description"]', { property: "og:description", content: description });
  setMeta('meta[property="og:type"]', { property: "og:type", content: ogType });
  setMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
  setMeta('meta[property="og:locale"]', { property: "og:locale", content: "pt_BR" });
  setMeta('meta[property="og:site_name"]', {
    property: "og:site_name",
    content: settings.site_title || "Lorena Alves Arquitetura",
  });
  if (ogImage) {
    setMeta('meta[property="og:image"]', { property: "og:image", content: ogImage });
    setMeta('meta[property="og:image:width"]', { property: "og:image:width", content: "1200" });
    setMeta('meta[property="og:image:height"]', { property: "og:image:height", content: "630" });
  }

  // Twitter
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

  // Verificações de proprietário (Search Console, Bing, Yandex, Facebook, Pinterest)
  setMetaIf(
    'meta[name="google-site-verification"]',
    { name: "google-site-verification", content: settings.google_site_verification || "" },
    settings.google_site_verification
  );
  setMetaIf(
    'meta[name="msvalidate.01"]',
    { name: "msvalidate.01", content: settings.bing_site_verification || "" },
    settings.bing_site_verification
  );
  setMetaIf(
    'meta[name="yandex-verification"]',
    { name: "yandex-verification", content: settings.yandex_verification || "" },
    settings.yandex_verification
  );
  setMetaIf(
    'meta[name="facebook-domain-verification"]',
    {
      name: "facebook-domain-verification",
      content: settings.facebook_domain_verification || "",
    },
    settings.facebook_domain_verification
  );
  setMetaIf(
    'meta[name="p:domain_verify"]',
    { name: "p:domain_verify", content: settings.pinterest_site_verification || "" },
    settings.pinterest_site_verification
  );

  // Trackers (Analytics / GTM / Pixel)
  injectTrackers(settings);

  clearJsonLd();
  if (seo.jsonLd) addJsonLd(seo.jsonLd);
}

/**
 * useSeo — aplica meta tags + canonical + OG/Twitter + JSON-LD por rota.
 * Usa o DOM diretamente (sem react-helmet-async para evitar nova dependência).
 */
export function useSeo(seo: SeoInput) {
  const dep = JSON.stringify(seo);
  useEffect(() => {
    let cancelled = false;
    const apply = (force = false) =>
      fetchSiteSettings(force).then((settings) => {
        if (cancelled) return;
        applySeo(settings, seo);
      });
    apply();
    const onRefresh = () => apply(true);
    window.addEventListener(SEO_REFRESH_EVENT, onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(SEO_REFRESH_EVENT, onRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
}

/**
 * refreshSeoEverywhere — força reaplicação de meta tags + JSON-LD em todos os
 * componentes que usam `useSeo`, além de invalidar o cache de site_settings
 * e (opcionalmente) pingar buscadores com o sitemap atualizado.
 */
export async function refreshSeoEverywhere(opts?: { pingSearchEngines?: boolean }): Promise<{
  ok: boolean;
  ping?: { ok: boolean; results?: Array<{ name: string; ok: boolean; status?: number }> };
}> {
  invalidateSiteSettings();
  // dispara reaplicação em todos os useSeo montados
  window.dispatchEvent(new CustomEvent(SEO_REFRESH_EVENT));

  if (!opts?.pingSearchEngines) return { ok: true };

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ping-sitemap`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return { ok: true, ping: data };
  } catch {
    return { ok: true, ping: { ok: false } };
  }
}

// =============================================================
//  JSON-LD helpers
// =============================================================

/** LocalBusiness / ProfessionalService — enriquecido com horário, faixa de preço e mapa. */
export function professionalServiceJsonLd(s: SiteSettings) {
  const base = (s.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");
  const type = s.business_type || "ProfessionalService";

  const geo = (() => {
    const pos = (s.seo_geo_position || "").split(";").map((x) => x.trim());
    if (pos.length === 2 && pos[0] && pos[1]) {
      return {
        "@type": "GeoCoordinates",
        latitude: pos[0],
        longitude: pos[1],
      };
    }
    return undefined;
  })();

  const address =
    s.address_street || s.address_city
      ? {
          "@type": "PostalAddress",
          streetAddress: s.address_street || undefined,
          addressLocality: s.address_city || undefined,
          addressRegion: s.address_region || undefined,
          postalCode: s.business_postal_code || undefined,
          addressCountry: "BR",
        }
      : undefined;

  const absUrl = (u: string | null | undefined) => {
    if (!u) return undefined;
    if (/^https?:\/\//i.test(u)) return u;
    return `${base}${u.startsWith("/") ? "" : "/"}${u}`;
  };

  const logoUrl = absUrl(s.seo_og_image || s.default_og_image);

  const sameAs = Array.from(
    new Set(
      [
        s.instagram_url,
        s.linkedin_url,
        s.pinterest_url,
        s.google_business_profile_url,
        s.google_maps_url,
      ]
        .filter((x): x is string => Boolean(x))
        .map((x) => x.trim())
    )
  );

  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${base}/#business`,
    parentOrganization: { "@id": `${base}/#organization` },
    name: s.site_title || "Lorena Alves Arquitetura",
    legalName: "Lorena Alves Arquitetura",
    description: s.seo_default_description || s.site_description || "",
    url: base,
    image: logoUrl,
    logo: logoUrl
      ? {
          "@type": "ImageObject",
          url: logoUrl,
          caption: s.site_title || "Lorena Alves Arquitetura",
        }
      : undefined,
    email: s.contact_email || undefined,
    telephone: s.contact_phone || undefined,
    contactPoint: s.contact_phone
      ? {
          "@type": "ContactPoint",
          contactType: "customer service",
          telephone: s.contact_phone,
          email: s.contact_email || undefined,
          areaServed: "BR",
          availableLanguage: ["Portuguese", "pt-BR"],
        }
      : undefined,
    taxID: "05.119.224/0001-30",
    vatID: "05.119.224/0001-30",
    iso6523Code: "0007:05119224000130",
    identifier: [
      { "@type": "PropertyValue", propertyID: "CNPJ", value: "05.119.224/0001-30" },
      { "@type": "PropertyValue", propertyID: "CAU", value: "A66583-5" },
    ],
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      name: "Registro Profissional CAU",
      credentialCategory: "Professional Registration",
      identifier: "A66583-5",
      recognizedBy: {
        "@type": "Organization",
        name: "Conselho de Arquitetura e Urbanismo do Brasil",
        alternateName: "CAU/BR",
        url: "https://www.caubr.gov.br",
      },
    },
    priceRange: s.business_price_range || undefined,
    foundingDate: s.business_founding_year || undefined,
    openingHours: s.business_opening_hours || undefined,
    areaServed: s.seo_geo_placename || "Uberlândia, Minas Gerais",
    hasMap: s.google_maps_url || undefined,
    address,
    geo,
    sameAs: sameAs.length ? sameAs : undefined,
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

/** FAQPage JSON-LD — habilita rich result de FAQ no Google (perguntas expansíveis na SERP). */
export function faqJsonLd(items: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.a,
      },
    })),
  };
}

/** WebSite JSON-LD com SearchAction (ajuda a aparecer caixa de busca no Google). */
export function websiteJsonLd(s: SiteSettings) {
  const base = (s.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: s.site_title || "Lorena Alves Arquitetura",
    url: base,
    inLanguage: "pt-BR",
    publisher: { "@id": `${base}/#organization` },
  };
}

/** Organization JSON-LD — reforça entidade para o Knowledge Graph. */
export function organizationJsonLd(s: SiteSettings) {
  const base = (s.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");

  const absUrl = (u: string | null | undefined) => {
    if (!u) return undefined;
    if (/^https?:\/\//i.test(u)) return u;
    return `${base}${u.startsWith("/") ? "" : "/"}${u}`;
  };
  const logoUrl = absUrl(s.seo_og_image || s.default_og_image);

  const sameAs = Array.from(
    new Set(
      [
        s.instagram_url,
        s.linkedin_url,
        s.pinterest_url,
        s.google_business_profile_url,
        s.google_maps_url,
      ]
        .filter((x): x is string => Boolean(x))
        .map((x) => x.trim())
    )
  );

  const address =
    s.address_street || s.address_city
      ? {
          "@type": "PostalAddress",
          streetAddress: s.address_street || undefined,
          addressLocality: s.address_city || undefined,
          addressRegion: s.address_region || undefined,
          postalCode: s.business_postal_code || undefined,
          addressCountry: "BR",
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: s.site_title || "Lorena Alves Arquitetura",
    legalName: "Lorena Alves Arquitetura",
    url: base,
    logo: logoUrl
      ? {
          "@type": "ImageObject",
          url: logoUrl,
          caption: s.site_title || "Lorena Alves Arquitetura",
        }
      : undefined,
    image: logoUrl,
    email: s.contact_email || undefined,
    telephone: s.contact_phone || undefined,
    foundingDate: s.business_founding_year || undefined,
    founder: {
      "@type": "Person",
      name: "Lorena Alves",
      jobTitle: "Arquiteta e Urbanista",
      hasCredential: {
        "@type": "EducationalOccupationalCredential",
        name: "Registro Profissional CAU",
        credentialCategory: "Professional Registration",
        identifier: "A66583-5",
        recognizedBy: {
          "@type": "Organization",
          name: "Conselho de Arquitetura e Urbanismo do Brasil",
          alternateName: "CAU/BR",
          url: "https://www.caubr.gov.br",
        },
      },
    },
    taxID: "05.119.224/0001-30",
    vatID: "05.119.224/0001-30",
    iso6523Code: "0007:05119224000130",
    identifier: [
      { "@type": "PropertyValue", propertyID: "CNPJ", value: "05.119.224/0001-30" },
      { "@type": "PropertyValue", propertyID: "CAU", value: "A66583-5" },
    ],
    address,
    contactPoint: s.contact_phone
      ? {
          "@type": "ContactPoint",
          contactType: "customer service",
          telephone: s.contact_phone,
          email: s.contact_email || undefined,
          areaServed: "BR",
          availableLanguage: ["Portuguese", "pt-BR"],
        }
      : undefined,
    subOrganization: { "@id": `${base}/#business` },
    sameAs: sameAs.length ? sameAs : undefined,
  };
}
