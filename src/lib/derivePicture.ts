/**
 * Helpers para servir imagens do bucket de Storage como <picture> com
 * AVIF + WebP + JPEG quando as variantes existem.
 *
 * Convenção de nomes (ver uploadImage.ts):
 *   <basePath>-sm.{webp,jpg,avif}
 *   <basePath>-md.{webp,jpg,avif}
 *   <basePath>-lg.{webp,jpg,avif}
 *
 * Estas funções aceitam tanto a URL "lg" preferida (ex: AVIF) quanto qualquer
 * outra variante e re-mapeiam para os 3 formatos · 3 tamanhos.
 *
 * São defensivas: se a URL não bater no padrão, devolvem `null` e o consumidor
 * deve fazer fallback para um <img> simples.
 */

const SIZE_RE = /-(?:sm|md|lg)\.(?:webp|jpg|jpeg|avif)(?:\?.*)?$/i;
const EXT_RE = /\.(webp|jpg|jpeg|avif)(\?.*)?$/i;

export type DerivedSet = {
  /** sm/md/lg para um formato específico */
  sm: string;
  md: string;
  lg: string;
};

export type DerivedPicture = {
  webp: DerivedSet;
  jpeg: DerivedSet;
  avif: DerivedSet;
  /** Fallback `src` raster universal (md JPEG). */
  fallbackSrc: string;
};

function stripExt(url: string): { stem: string; query: string } {
  const m = url.match(/^(.*)\.(?:webp|jpg|jpeg|avif)(\?.*)?$/i);
  if (!m) return { stem: url, query: "" };
  return { stem: m[1], query: m[2] ?? "" };
}

function withSizeAndExt(stem: string, query: string, size: "sm" | "md" | "lg", ext: string): string {
  // Remove sufixo -sm/-md/-lg do stem se já existir, para construir o variante limpo.
  const base = stem.replace(/-(sm|md|lg)$/i, "");
  return `${base}-${size}.${ext}${query}`;
}

/**
 * Tenta derivar AVIF + WebP + JPEG (sm/md/lg) a partir de qualquer URL do bucket
 * que siga a convenção. Retorna null se a URL não parece processada pelo pipeline.
 */
export function derivePictureSources(url: string | null | undefined): DerivedPicture | null {
  if (!url) return null;
  if (!EXT_RE.test(url)) return null;
  // Só derivamos se a URL tem o sufixo -sm/-md/-lg (forte indicação de pipeline).
  if (!SIZE_RE.test(url)) return null;
  const { stem, query } = stripExt(url);
  const sizes: Array<"sm" | "md" | "lg"> = ["sm", "md", "lg"];
  const build = (ext: string): DerivedSet => ({
    sm: withSizeAndExt(stem, query, "sm", ext),
    md: withSizeAndExt(stem, query, "md", ext),
    lg: withSizeAndExt(stem, query, "lg", ext),
  });
  const webp = build("webp");
  const jpeg = build("jpg");
  const avif = build("avif");
  return { webp, jpeg, avif, fallbackSrc: jpeg.md };
}

/** srcset string "sm 640w, md 1280w, lg 1920w" */
export function setToSrcset(set: DerivedSet): string {
  return `${set.sm} 640w, ${set.md} 1280w, ${set.lg} 1920w`;
}
