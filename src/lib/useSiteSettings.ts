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
  seo_default_title: string | null;
  seo_default_description: string | null;
  seo_og_image: string | null;
  seo_twitter_handle: string | null;
  seo_canonical_base: string | null;
  seo_robots: string | null;
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
  instagram_url: "https://instagram.com/lorenaalves.arq",
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
