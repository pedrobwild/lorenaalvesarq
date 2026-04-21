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
  setMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
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

  const sameAs = [
    s.instagram_url,
    s.linkedin_url,
    s.pinterest_url,
    s.google_business_profile_url,
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${base}/#business`,
    name: s.site_title || "Lorena Alves Arquitetura",
    legalName: "Lorena Alves Arquitetura",
    description: s.seo_default_description || s.site_description || "",
    url: base,
    image: s.seo_og_image || s.default_og_image || undefined,
    logo: s.seo_og_image || s.default_og_image || undefined,
    email: s.contact_email || undefined,
    telephone: s.contact_phone || undefined,
    taxID: "05.119.224/0001-30",
    vatID: "05.119.224/0001-30",
    iso6523Code: "0007:05119224000130",
    identifier: [
      { "@type": "PropertyValue", propertyID: "CNPJ", value: "05.119.224/0001-30" },
      { "@type": "PropertyValue", propertyID: "CAU", value: "A66583-5" },
    ],
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

/** WebSite JSON-LD com SearchAction (ajuda a aparecer caixa de busca no Google). */
export function websiteJsonLd(s: SiteSettings) {
  const base = (s.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: s.site_title || "Lorena Alves Arquitetura",
    url: base,
    inLanguage: "pt-BR",
    publisher: {
      "@type": "Organization",
      name: s.site_title || "Lorena Alves Arquitetura",
      url: base,
    },
  };
}

/** Organization JSON-LD — reforça entidade para o Knowledge Graph. */
export function organizationJsonLd(s: SiteSettings) {
  const base = (s.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "");
  const sameAs = [
    s.instagram_url,
    s.linkedin_url,
    s.pinterest_url,
    s.google_business_profile_url,
  ].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: s.site_title || "Lorena Alves Arquitetura",
    url: base,
    logo: s.seo_og_image || s.default_og_image || undefined,
    email: s.contact_email || undefined,
    telephone: s.contact_phone || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
}
