import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PROJECTS as STATIC_PROJECTS, type Project, type ProjectImage } from "@/data/projects";

type DbProject = {
  id: string;
  slug: string;
  number: string | null;
  title: string;
  em: string | null;
  tag: Project["tag"];
  year: string | null;
  location: string | null;
  area: string | null;
  status: string | null;
  cover_url: string | null;
  cover_url_md: string | null;
  cover_url_sm: string | null;
  cover_blur_data_url: string | null;
  cover_alt: string | null;
  summary: string | null;
  intro: string | null;
  program: string | null;
  materials: string[] | null;
  team: string | null;
  photographer: string | null;
  order_index: number | null;
  visible: boolean | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  updated_at: string | null;
  project_images?: Array<{
    url: string;
    url_md: string | null;
    url_sm: string | null;
    blur_data_url: string | null;
    alt: string;
    caption: string | null;
    format: string | null;
    order_index: number | null;
  }>;
};

function mapDbToProject(p: DbProject): Project {
  const images: ProjectImage[] = (p.project_images ?? [])
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((i) => ({
      src: i.url,
      srcMd: i.url_md,
      srcSm: i.url_sm,
      blurDataUrl: i.blur_data_url,
      alt: i.alt,
      caption: i.caption ?? undefined,
      format: (i.format as ProjectImage["format"]) ?? "full",
    }));
  return {
    slug: p.slug,
    number: p.number ?? "",
    title: p.title,
    em: p.em ?? "",
    tag: p.tag,
    year: p.year ?? "",
    location: p.location ?? "",
    area: p.area ?? "",
    status: (p.status as Project["status"]) ?? "Concluído",
    cover: p.cover_url ?? "",
    coverMd: p.cover_url_md,
    coverSm: p.cover_url_sm,
    coverBlurDataUrl: p.cover_blur_data_url,
    alt: p.cover_alt ?? p.title,
    summary: p.summary ?? "",
    intro: p.intro ?? "",
    program: p.program ?? "",
    materials: p.materials ?? [],
    team: p.team ?? "",
    photographer: p.photographer ?? "",
    gallery: images,
    seoTitle: p.seo_title,
    seoDescription: p.seo_description,
    ogImage: p.og_image_url,
    updatedAt: p.updated_at,
  };
}

/**
 * useProjects — busca projetos visíveis do Supabase.
 * Enquanto carrega, devolve o array estático como fallback para garantir
 * primeiro paint instantâneo e zero quebra se a chamada falhar.
 */
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(STATIC_PROJECTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("projects")
      .select(
        "id, slug, number, title, em, tag, year, location, area, status, cover_url, cover_url_md, cover_url_sm, cover_blur_data_url, cover_alt, summary, intro, program, materials, team, photographer, order_index, visible, seo_title, seo_description, og_image_url, updated_at, project_images(url, url_md, url_sm, blur_data_url, alt, caption, format, order_index)"
      )
      .eq("visible", true)
      .order("order_index", { ascending: true })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (data && data.length > 0 && !error) {
          setProjects((data as DbProject[]).map(mapDbToProject));
        }
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { projects, loading };
}
