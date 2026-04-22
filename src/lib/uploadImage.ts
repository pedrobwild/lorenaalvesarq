import { supabase } from "@/integrations/supabase/client";
import { processImage, type ProcessedSet } from "./imagePipeline";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Conjunto de URLs públicas para um formato (sm/md/lg). */
export type FormatUrls = {
  sm: string;
  md: string;
  lg: string;
};

export type UploadResult = {
  /** URL canônica (versão maior, formato preferido — AVIF se disponível, senão WebP). Usada como `src`/cover_url. */
  url: string;
  /** URL média (preferido). */
  urlMd: string;
  /** URL pequena (preferido). */
  urlSm: string;
  /** URLs explícitas por formato — usadas para montar <picture> com source AVIF + WebP + JPG. */
  webp: FormatUrls;
  jpeg: FormatUrls;
  avif?: FormatUrls;
  /** Placeholder borrado base64 para mostrar enquanto carrega */
  blurDataUrl: string;
  /** Caminho-base no bucket (sem sufixo de tamanho/formato) */
  path: string;
};

type Bucket = "project-covers" | "project-gallery" | "blog-images";

async function uploadSet(
  bucket: Bucket,
  basePath: string,
  ext: "webp" | "jpg" | "avif",
  contentType: string,
  set: ProcessedSet
): Promise<FormatUrls> {
  const variants: Array<{ key: keyof ProcessedSet; suffix: "sm" | "md" | "lg" }> = [
    { key: "small", suffix: "sm" },
    { key: "medium", suffix: "md" },
    { key: "large", suffix: "lg" },
  ];
  const urls = await Promise.all(
    variants.map(async ({ key, suffix }) => {
      const path = `${basePath}-${suffix}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, set[key], {
        cacheControl: "31536000", // 1 ano — assets versionados
        upsert: false,
        contentType,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    })
  );
  return { sm: urls[0], md: urls[1], lg: urls[2] };
}

/**
 * Faz upload de uma imagem em 3 tamanhos × 3 formatos (AVIF + WebP + JPEG) +
 * gera blur placeholder. AVIF é opcional (depende do browser do admin).
 * Tudo processado client-side via canvas — não bloqueia o backend.
 */
export async function uploadImage(
  file: File,
  bucket: "project-covers" | "project-gallery",
  projectSlug: string
): Promise<UploadResult> {
  return uploadImageGeneric(file, bucket, projectSlug);
}

export async function uploadImageGeneric(
  file: File,
  bucket: Bucket,
  folder: string
): Promise<UploadResult> {
  const processed = await processImage(file);
  const baseName = slugify(file.name.replace(/\.[^.]+$/, "")) || "img";
  const stamp = Date.now();
  const basePath = `${folder}/${stamp}-${baseName}`;

  // Sobe os 3 formatos em paralelo. AVIF só sobe se o pipeline conseguiu encodar.
  const [webp, jpeg, avif] = await Promise.all([
    uploadSet(bucket, basePath, "webp", "image/webp", processed.webp),
    uploadSet(bucket, basePath, "jpg", "image/jpeg", processed.jpeg),
    processed.avif
      ? uploadSet(bucket, basePath, "avif", "image/avif", processed.avif)
      : Promise.resolve(undefined),
  ]);

  // URL canônica = AVIF preferido (menor), WebP como segunda opção.
  const preferred = avif ?? webp;
  return {
    url: preferred.lg,
    urlMd: preferred.md,
    urlSm: preferred.sm,
    webp,
    jpeg,
    avif,
    blurDataUrl: processed.blurDataUrl,
    path: basePath,
  };
}

export async function deleteImage(
  bucket: "project-covers" | "project-gallery",
  path: string
) {
  // path-base; remove todas as variantes possíveis (3 tamanhos × 3 formatos)
  const sizes = ["sm", "md", "lg"];
  const exts = ["webp", "jpg", "avif"];
  const paths: string[] = [];
  for (const s of sizes) for (const e of exts) paths.push(`${path}-${s}.${e}`);
  await supabase.storage.from(bucket).remove(paths);
}
