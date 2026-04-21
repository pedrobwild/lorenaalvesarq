import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  id: number;
  site_title: string | null;
  site_description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_street: string | null;
  address_city: string | null;
  address_region: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  pinterest_url: string | null;
  default_og_image: string | null;

  // SEO base
  seo_default_title: string | null;
  seo_default_description: string | null;
  seo_og_image: string | null;
  seo_twitter_handle: string | null;
  seo_canonical_base: string | null;
  seo_robots: string | null;

  // SEO avançado — verificações
  google_site_verification: string | null;
  bing_site_verification: string | null;
  yandex_verification: string | null;
  facebook_domain_verification: string | null;
  pinterest_site_verification: string | null;

  // Analytics & pixels
  google_analytics_id: string | null;
  google_tag_manager_id: string | null;
  google_ads_conversion_id: string | null;
  meta_pixel_id: string | null;
  hotjar_id: string | null;
  clarity_id: string | null;

  // SEO extras
  seo_keywords: string | null;
  seo_author: string | null;
  seo_geo_region: string | null;
  seo_geo_placename: string | null;
  seo_geo_position: string | null;

  // Local business
  business_type: string | null;
  business_founding_year: string | null;
  business_price_range: string | null;
  business_postal_code: string | null;
  business_opening_hours: string | null;
  google_maps_url: string | null;
  google_business_profile_url: string | null;

  seo_custom_head_html: string | null;
  seo_last_audit_at: string | null;
  seo_last_search_console_submit: string | null;
};

const DEFAULTS: SiteSettings = {
  id: 1,
  site_title: "lorenaalves arq",
  site_description:
    "Arquitetura e design de interiores. Estúdio autoral de Lorena Alves — sofisticação, inovação e compromisso.",
  contact_email: "contato@lorenaalvesarq.com",
  contact_phone: null,
  address_street: null,
  address_city: null,
  address_region: null,
  instagram_url: "https://instagram.com/lorenaalves_arq",
  linkedin_url: null,
  pinterest_url: null,
  default_og_image: null,

  seo_default_title: "lorenaalves arq — Arquitetura e design de interiores",
  seo_default_description:
    "Estúdio autoral de Lorena Alves — sofisticação, inovação e compromisso.",
  seo_og_image: null,
  seo_twitter_handle: null,
  seo_canonical_base: "https://lorenaalvesarq.com",
  seo_robots: "index, follow",

  google_site_verification: null,
  bing_site_verification: null,
  yandex_verification: null,
  facebook_domain_verification: null,
  pinterest_site_verification: null,

  google_analytics_id: null,
  google_tag_manager_id: null,
  google_ads_conversion_id: null,
  meta_pixel_id: null,
  hotjar_id: null,
  clarity_id: null,

  seo_keywords: null,
  seo_author: "Lorena Alves Arquitetura",
  seo_geo_region: "BR-MG",
  seo_geo_placename: "Uberlândia, Minas Gerais",
  seo_geo_position: "-18.9186;-48.2772",

  business_type: "ProfessionalService",
  business_founding_year: null,
  business_price_range: "$$$",
  business_postal_code: null,
  business_opening_hours: null,
  google_maps_url: null,
  google_business_profile_url: null,

  seo_custom_head_html: null,
  seo_last_audit_at: null,
  seo_last_search_console_submit: null,
};

let cache: SiteSettings | null = null;
let inflight: Promise<SiteSettings> | null = null;

export async function fetchSiteSettings(force = false): Promise<SiteSettings> {
  if (cache && !force) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    cache = { ...DEFAULTS, ...(data ?? {}) } as SiteSettings;
    inflight = null;
    return cache;
  })();
  return inflight;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let mounted = true;
    fetchSiteSettings().then((s) => {
      if (!mounted) return;
      setSettings(s);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { settings, loading };
}

export function invalidateSiteSettings() {
  cache = null;
}
