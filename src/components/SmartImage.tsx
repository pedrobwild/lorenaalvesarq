import { useEffect, useRef, useState, type CSSProperties, type ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "sizes" | "alt"> & {
  /** URL da maior versão (fallback) */
  src: string;
  /** URL da versão média (1280px) */
  srcMd?: string | null;
  /** URL da versão pequena (640px) */
  srcSm?: string | null;
  /** Placeholder borrado base64; renderizado como background até a imagem decodificar */
  blurDataUrl?: string | null;
  /** sizes attribute para o navegador escolher a variante certa */
  sizes?: string;
  /** Texto alternativo descritivo. Pode vir vazio/null — usaremos `altFallback`. */
  alt?: string | null;
  /**
   * Fallback semântico (ex: título do projeto/página). Usado quando `alt`
   * está ausente ou em branco. Garante que NUNCA renderizamos `<img>` sem
   * alt útil para SEO/acessibilidade.
   */
  altFallback?: string | null;
  /** Classe aplicada ao wrapper externo */
  wrapperClassName?: string;
  /** Estilo do wrapper (útil para aspect-ratio) */
  wrapperStyle?: CSSProperties;
  /** prioridade alta para hero/LCP — desativa lazy e marca fetchpriority=high */
  priority?: boolean;
  /**
   * Marca a imagem como puramente decorativa: emite `alt=""` e
   * `role="presentation"`. Quando true, ignora `alt`/`altFallback`.
   */
  decorative?: boolean;
};

/** Normaliza qualquer string para uso como `alt` (trim + colapsa espaços). */
function normalizeAlt(value?: string | null): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Imagem responsiva com:
 * - srcset/sizes para servir o tamanho certo por dispositivo
 * - blur placeholder enquanto carrega (sem layout shift)
 * - loading=lazy + decoding=async por padrão
 * - fade-in suave quando a imagem fica pronta
 */
export default function SmartImage({
  src,
  srcMd,
  srcSm,
  blurDataUrl,
  sizes = "100vw",
  alt,
  altFallback,
  decorative = false,
  className,
  wrapperClassName,
  wrapperStyle,
  priority = false,
  style,
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Resolve alt final, NUNCA undefined: prioridade alt > fallback > "".
  // `decorative` força alt vazio + role=presentation (acessibilidade correta).
  const resolvedAlt = decorative
    ? ""
    : normalizeAlt(alt) || normalizeAlt(altFallback);

  // Em dev, alerta quando a imagem fica sem alt útil — facilita auditoria.
  if (
    import.meta.env.DEV &&
    !decorative &&
    !resolvedAlt &&
    typeof console !== "undefined"
  ) {
    console.warn(
      `[SmartImage] imagem sem \`alt\` nem \`altFallback\`: ${src}. ` +
        `Forneça um texto descritivo ou marque \`decorative\` se for puramente visual.`
    );
  }

  // Se a imagem já estiver no cache, o onLoad pode disparar antes do listener
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  // Monta srcset apenas com as variantes que existem
  const parts: string[] = [];
  if (srcSm) parts.push(`${srcSm} 640w`);
  if (srcMd) parts.push(`${srcMd} 1280w`);
  parts.push(`${src} 1920w`);
  const srcSet = parts.length > 1 ? parts.join(", ") : undefined;

  // ----- AVIF/WebP automático para imagens estáticas em /images/ -----
  // O pipeline de imagens (script genimg.py) gera variantes -sm/-md/-lg em
  // .avif/.webp/.jpg para todos os arquivos de /public/images/. Detectamos
  // pelo padrão do path e, quando aplicável, montamos <source> AVIF + WebP
  // sem precisar pedir ao chamador (mantém API atual).
  const modernSources = buildModernSources(src);

  const wrapStyle: CSSProperties = {
    backgroundImage: blurDataUrl ? `url(${blurDataUrl})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundColor: blurDataUrl ? undefined : "hsl(var(--muted, 30 8% 92%))",
    ...wrapperStyle,
  };

  const imgStyle: CSSProperties = {
    opacity: loaded ? 1 : 0,
    transition: "opacity 420ms ease",
    ...style,
  };

  return (
    <span className={wrapperClassName} style={wrapStyle} data-smart-img-wrap>
      <picture>
        {modernSources && (
          <>
            <source type="image/avif" srcSet={modernSources.avif} sizes={sizes} />
            <source type="image/webp" srcSet={modernSources.webp} sizes={sizes} />
          </>
        )}
        <img
          ref={imgRef}
          src={src}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          alt={resolvedAlt}
          role={decorative ? "presentation" : undefined}
          aria-hidden={decorative || undefined}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          width={rest.width ?? 1920}
          height={rest.height ?? 1280}
          onLoad={() => setLoaded(true)}
          className={className}
          style={imgStyle}
          {...rest}
        />
      </picture>
    </span>
  );
}

/**
 * Detecta imagens estáticas em /images/ que possuem variantes geradas
 * pelo pipeline (-sm/-md/-lg em .avif/.webp/.jpg) e devolve o srcSet
 * para os <source> modernos. Retorna null se o path não bater com o
 * padrão (ex: URLs absolutas de Storage / blob: / data:).
 */
function buildModernSources(src: string): { avif: string; webp: string } | null {
  if (!src) return null;
  // Só atuamos em paths estáticos servidos do próprio site
  if (!/^\/images\//.test(src)) return null;

  // Extrai dir, stem (sem sufixo -sm/-md/-lg) e extensão original
  const lastSlash = src.lastIndexOf("/");
  const dir = src.slice(0, lastSlash + 1);
  const file = src.slice(lastSlash + 1);
  const dot = file.lastIndexOf(".");
  if (dot === -1) return null;
  const rawStem = file.slice(0, dot);
  const ext = file.slice(dot).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".webp", ".avif"].includes(ext)) return null;
  // Remove sufixo de tamanho se já vier com ele (ex: foo-md.jpg → foo)
  const stem = rawStem.replace(/-(?:sm|md|lg)$/, "");

  const sizes = [
    { label: "sm", w: 640 },
    { label: "md", w: 1280 },
    { label: "lg", w: 1920 },
  ] as const;

  const avif = sizes.map(({ label, w }) => `${dir}${stem}-${label}.avif ${w}w`).join(", ");
  const webp = sizes.map(({ label, w }) => `${dir}${stem}-${label}.webp ${w}w`).join(", ");
  return { avif, webp };
}
