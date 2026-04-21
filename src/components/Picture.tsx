/**
 * Picture — `<picture>` com srcset AVIF + WebP + fallback JPG.
 *
 * Recebe o caminho de uma imagem estática (ex: /images/foo.png) e
 * automaticamente monta:
 *   - <source type="image/avif" srcset="foo-sm.avif 640w, foo-md.avif 1280w, foo-lg.avif 1920w" sizes="...">
 *   - <source type="image/webp" srcset="foo-sm.webp ... foo-lg.webp ..." sizes="...">
 *   - <img src="foo-md.jpg" srcset="foo-sm.jpg, foo-md.jpg, foo-lg.jpg" sizes="..." ...>
 *
 * As variantes são geradas pelo script /tmp/genimg.py (off-line) e ficam em /public/images/.
 *
 * Uso:
 *   <Picture
 *     src="/images/casa-paineira-pavilhao-concreto-ipe-uberlandia.png"
 *     alt="..."
 *     width={1920}
 *     height={1281}
 *     sizes="100vw"
 *     priority
 *   />
 */
import type { CSSProperties, ImgHTMLAttributes } from "react";

type PictureProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "sizes" | "alt"> & {
  /** Caminho da imagem original (ex: /images/foo.png ou /images/foo.jpg) */
  src: string;
  alt: string;
  width: number;
  height: number;
  /** sizes attribute — default: 100vw (recomendado customizar para hero/cards) */
  sizes?: string;
  /** LCP / above-the-fold */
  priority?: boolean;
  /** className aplicada ao <img> interno */
  className?: string;
  /** style aplicada ao <img> interno */
  style?: CSSProperties;
  /** className do <picture> wrapper */
  pictureClassName?: string;
};

/** Remove a extensão e devolve o "stem" + extensão original. */
function splitPath(src: string): { dir: string; stem: string; ext: string } {
  const lastSlash = src.lastIndexOf("/");
  const dir = src.slice(0, lastSlash + 1);
  const file = src.slice(lastSlash + 1);
  const dot = file.lastIndexOf(".");
  if (dot === -1) return { dir, stem: file, ext: "" };
  return { dir, stem: file.slice(0, dot), ext: file.slice(dot) };
}

const SIZES = [
  { label: "sm", w: 640 },
  { label: "md", w: 1280 },
  { label: "lg", w: 1920 },
] as const;

function buildSrcSet(dir: string, stem: string, ext: string): string {
  return SIZES.map(({ label, w }) => `${dir}${stem}-${label}${ext} ${w}w`).join(", ");
}

export default function Picture({
  src,
  alt,
  width,
  height,
  sizes = "100vw",
  priority = false,
  className,
  style,
  pictureClassName,
  ...rest
}: PictureProps) {
  const { dir, stem, ext } = splitPath(src);

  const avifSet = buildSrcSet(dir, stem, ".avif");
  const webpSet = buildSrcSet(dir, stem, ".webp");

  // Fallback raster universal: SEMPRE .jpg para navegadores legados
  // (IE11, Safari < 14, Android < 5 etc. que não suportam AVIF nem WebP).
  // Se o original já era .jpg/.jpeg, mantemos a extensão; caso contrário (.png/.webp/.avif),
  // assumimos que existe a variante .jpg gerada pelo pipeline de imagens.
  const isJpegOriginal = ext === ".jpg" || ext === ".jpeg";
  const fallbackExt = isJpegOriginal ? ext : ".jpg";

  // srcSet completo (sm/md/lg) + src apontando para o md como "âncora" segura
  const jpgSet = buildSrcSet(dir, stem, fallbackExt);
  const fallbackSrc = `${dir}${stem}-md${fallbackExt}`;

  return (
    <picture className={pictureClassName}>
      <source type="image/avif" srcSet={avifSet} sizes={sizes} />
      <source type="image/webp" srcSet={webpSet} sizes={sizes} />
      {/* Source JPG explícito: garante que o browser escolha a melhor resolução
          mesmo quando ignora <img srcSet> (alguns crawlers / leitores antigos). */}
      <source type="image/jpeg" srcSet={jpgSet} sizes={sizes} />
      <img
        src={fallbackSrc}
        srcSet={jpgSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        className={className}
        style={style}
        {...rest}
      />
    </picture>
  );
}
