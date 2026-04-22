/**
 * Pipeline de imagens client-side:
 * - Lê o arquivo original
 * - Gera 3 variantes em AVIF (quando o browser suporta encoder) + 3 em WebP + 3 em JPEG (fallback universal)
 * - Gera um placeholder borrado em base64 (16px JPEG)
 *
 * Tudo via Canvas no navegador. Zero infra extra.
 *
 * Notas:
 * - AVIF tem ~30-50% menos peso que WebP em fotos. Chrome/Edge/Firefox/Opera codificam via canvas.toBlob.
 *   Safari ainda não codifica AVIF no canvas (apesar de decodificar) — nesses casos pulamos AVIF
 *   silenciosamente e caímos no WebP. Quem subir o post pelo Chrome/Firefox vai ter AVIF servido a todos.
 * - JPEG é gerado SEMPRE como rede de segurança final (browsers super antigos / crawlers).
 */

const SIZES = { lg: 1920, md: 1280, sm: 640 } as const;
const BLUR_SIZE = 16;
const WEBP_QUALITY = 0.82;
const AVIF_QUALITY = 0.6; // AVIF mantém qualidade visual com bitrate bem menor
const JPEG_QUALITY = 0.84;

export type ProcessedSet = {
  large: Blob;
  medium: Blob;
  small: Blob;
};

export type ProcessedImage = {
  /** WebP — sempre gerado (rede de segurança principal). */
  webp: ProcessedSet;
  /** AVIF — quando o browser do admin suporta o encoder. Pode ser undefined no Safari. */
  avif?: ProcessedSet;
  /** JPEG — fallback universal para crawlers e browsers antigos. */
  jpeg: ProcessedSet;
  blurDataUrl: string;
  width: number;
  height: number;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function resizeToBlob(
  source: HTMLImageElement,
  targetWidth: number,
  type: string,
  quality: number
): Promise<Blob | null> {
  const ratio = source.naturalHeight / source.naturalWidth;
  const w = Math.min(targetWidth, source.naturalWidth);
  const h = Math.round(w * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  return new Promise((resolve) => {
    // toBlob retorna null se o type não é suportado pelo encoder do browser.
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function resizeToDataUrl(
  source: HTMLImageElement,
  targetWidth: number,
  type: string,
  quality: number
): string {
  const ratio = source.naturalHeight / source.naturalWidth;
  const w = Math.min(targetWidth, source.naturalWidth);
  const h = Math.max(1, Math.round(w * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL(type, quality);
}

async function generateSet(
  img: HTMLImageElement,
  type: string,
  quality: number
): Promise<ProcessedSet | undefined> {
  const [large, medium, small] = await Promise.all([
    resizeToBlob(img, SIZES.lg, type, quality),
    resizeToBlob(img, SIZES.md, type, quality),
    resizeToBlob(img, SIZES.sm, type, quality),
  ]);
  if (!large || !medium || !small) return undefined;
  // Sanity check: alguns browsers (Safari) retornam um PNG silenciosamente quando não suportam o type pedido.
  // Se o blob.type não bate com o que pedimos, descartamos para não confundir o consumidor.
  if (large.type !== type || medium.type !== type || small.type !== type) {
    return undefined;
  }
  return { large, medium, small };
}

/**
 * Processa um arquivo em variantes AVIF + WebP + JPEG e gera um blur placeholder.
 * O AVIF é opcional e só é incluído quando o encoder do browser confirma o tipo.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  const img = await loadImage(file);
  // Primeiro WebP+JPEG (sempre presentes); AVIF em paralelo mas pode "falhar" silencioso.
  const [webp, jpeg, avif] = await Promise.all([
    generateSet(img, "image/webp", WEBP_QUALITY),
    generateSet(img, "image/jpeg", JPEG_QUALITY),
    generateSet(img, "image/avif", AVIF_QUALITY),
  ]);
  if (!webp) throw new Error("Browser não suporta WebP — atualize-o para enviar imagens.");
  if (!jpeg) throw new Error("Falha ao gerar variantes JPEG.");
  const blurDataUrl = resizeToDataUrl(img, BLUR_SIZE, "image/jpeg", 0.5);
  return {
    webp,
    avif,
    jpeg,
    blurDataUrl,
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}
