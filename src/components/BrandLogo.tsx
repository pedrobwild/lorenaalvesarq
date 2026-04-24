/**
 * BrandLogo
 * --------------------------------------------------------------
 * Logotipo oficial "lorenaalves arq" — baseado no brandbook vbiasi (2021).
 * Usa os arquivos PNG vetorizados em /public/brand/ como fonte de verdade,
 * com fallback para o lockup em texto (classe .brand-lockup) caso a imagem
 * não carregue.
 *
 * Variants:
 *   - "dark"  → logo preto (sobre fundos claros)
 *   - "light" → logo branco (sobre fundos escuros, padrão do site)
 */
import { useState } from "react";

type Variant = "light" | "dark";

interface BrandLogoProps {
  variant?: Variant;
  className?: string;
  style?: React.CSSProperties;
  /** Altura do logo (rem). Largura é calculada automaticamente pela proporção. */
  heightRem?: number;
  alt?: string;
}

const LOGO_SRC: Record<Variant, string> = {
  light: "/brand/logo-branco.png",
  dark: "/brand/logo-positiva.png",
};

export default function BrandLogo({
  variant = "light",
  className = "",
  style,
  heightRem,
  alt = "lorenaalves arq — arquitetura",
}: BrandLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    // Fallback para o lockup em texto
    return (
      <span className={`brand-lockup ${className}`.trim()} style={style}>
        lorena<b>alves</b><sup>arq</sup>
      </span>
    );
  }

  return (
    <img
      src={LOGO_SRC[variant]}
      alt={alt}
      width={320}
      height={88}
      loading="eager"
      decoding="async"
      {...({ fetchpriority: "high" } as { fetchpriority: string })}
      className={`brand-logo brand-logo--${variant} ${className}`.trim()}
      onError={() => setFailed(true)}
      style={{
        height: heightRem !== undefined ? `${heightRem}rem` : undefined,
        width: "auto",
        display: "inline-block",
        ...style,
      }}
      draggable={false}
    />
  );
}

/** Selo circular "lorena alves arquitetura -" — para uso decorativo. */
export function BrandSeal({
  variant = "light",
  className = "",
  style,
  sizeRem = 6,
  alt = "Selo lorenaalves arquitetura",
}: {
  variant?: Variant;
  className?: string;
  style?: React.CSSProperties;
  sizeRem?: number;
  alt?: string;
}) {
  const src = variant === "light" ? "/brand/selo-branco.png" : "/brand/selo-preto.png";
  return (
    <img
      src={src}
      alt={alt}
      aria-hidden="true"
      width={256}
      height={256}
      loading="lazy"
      decoding="async"
      className={`brand-seal brand-seal--${variant} ${className}`.trim()}
      style={{
        width: `${sizeRem}rem`,
        height: `${sizeRem}rem`,
        display: "inline-block",
        ...style,
      }}
      draggable={false}
    />
  );
}
