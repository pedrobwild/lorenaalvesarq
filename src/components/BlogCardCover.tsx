import { derivePictureSources, setToSrcset } from "../lib/derivePicture";

type Props = {
  /** URL "principal" da capa (geralmente cover_url = AVIF lg). Usada como semente para derivar variantes. */
  coverUrl: string | null;
  coverUrlMd: string | null;
  coverUrlSm: string | null;
  alt: string;
  /** Hint de tamanho para o browser escolher o melhor variante. */
  sizes: string;
  /** True para a primeira capa (LCP). Usa eager + fetchPriority high. */
  priority?: boolean;
};

/**
 * Capa de card de blog que SEMPRE serve AVIF/WebP/JPEG quando a URL segue
 * a convenção `-{sm|md|lg}.{ext}` do pipeline. Faz fallback gracioso para
 * `<img>` simples quando a URL é externa/legada.
 *
 * Lazy por padrão (loading="lazy" + decoding="async" + fetchpriority="low"),
 * promovido a eager quando `priority` é true.
 */
export default function BlogCardCover({
  coverUrl,
  coverUrlMd,
  coverUrlSm,
  alt,
  sizes,
  priority = false,
}: Props) {
  if (!coverUrl) return null;
  const derived = derivePictureSources(coverUrl);

  if (derived) {
    return (
      <div className="blog-card__media">
        <picture>
          <source type="image/avif" srcSet={setToSrcset(derived.avif)} sizes={sizes} />
          <source type="image/webp" srcSet={setToSrcset(derived.webp)} sizes={sizes} />
          <source type="image/jpeg" srcSet={setToSrcset(derived.jpeg)} sizes={sizes} />
          <img
            src={derived.fallbackSrc}
            srcSet={setToSrcset(derived.jpeg)}
            sizes={sizes}
            alt={alt}
            width={1280}
            height={720}
            loading={priority ? "eager" : "lazy"}
            decoding={priority ? "sync" : "async"}
            fetchPriority={priority ? "high" : "low"}
          />
        </picture>
      </div>
    );
  }

  // Fallback: capas legadas/externas.
  const fallbackSrc = coverUrlMd || coverUrl;
  const srcSet =
    coverUrlSm && coverUrlMd && coverUrl
      ? `${coverUrlSm} 640w, ${coverUrlMd} 1280w, ${coverUrl} 1920w`
      : undefined;
  return (
    <div className="blog-card__media">
      <img
        src={fallbackSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={1280}
        height={720}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "low"}
        onError={(e) => {
          const el = e.currentTarget;
          if (coverUrl && el.src !== coverUrl) el.src = coverUrl;
        }}
      />
    </div>
  );
}
