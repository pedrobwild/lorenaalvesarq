import { supabase } from "@/integrations/supabase/client";
import { processImage } from "./imagePipeline";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export type UploadResult = {
  /** URL da maior versão (1920px WebP) — usada como `src` fallback */
  url: string;
  /** URL da versão média (1280px WebP) */
  urlMd: string;
  /** URL da versão pequena (640px WebP) */
  urlSm: string;
  /** Placeholder borrado base64 para mostrar enquanto carrega */
  blurDataUrl: string;
  /** Caminho-base no bucket (sem sufixo de tamanho) */
  path: string;
};

/**
 * Faz upload de uma imagem em 3 tamanhos WebP + gera blur placeholder.
 * Tudo processado client-side via canvas — não bloqueia o backend.
 */
export async function uploadImage(
  file: File,
  bucket: "project-covers" | "project-gallery",
  projectSlug: string
): Promise<UploadResult> {
  const processed = await processImage(file);
  const baseName = slugify(file.name.replace(/\.[^.]+$/, "")) || "img";
  const stamp = Date.now();
  const basePath = `${projectSlug}/${stamp}-${baseName}`;

  const variants = [
    { suffix: "lg.webp", blob: processed.large },
    { suffix: "md.webp", blob: processed.medium },
    { suffix: "sm.webp", blob: processed.small },
  ];

  const uploaded = await Promise.all(
    variants.map(async ({ suffix, blob }) => {
      const path = `${basePath}-${suffix}`;
      const { error } = await supabase.storage.from(bucket).upload(path, blob, {
        cacheControl: "31536000", // 1 ano — assets versionados
        upsert: false,
        contentType: "image/webp",
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    })
  );

  return {
    url: uploaded[0],
    urlMd: uploaded[1],
    urlSm: uploaded[2],
    blurDataUrl: processed.blurDataUrl,
    path: basePath,
  };
}

export async function deleteImage(
  bucket: "project-covers" | "project-gallery",
  path: string
) {
  // path-base; remove todas as variantes
  await supabase.storage
    .from(bucket)
    .remove([`${path}-lg.webp`, `${path}-md.webp`, `${path}-sm.webp`]);
}
