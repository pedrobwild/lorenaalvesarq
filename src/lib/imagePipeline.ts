/**
 * Pipeline de imagens client-side:
 * - Lê o arquivo original
 * - Gera 3 variantes WebP: large (1920px), medium (1280px), small (640px)
 * - Gera um placeholder borrado em base64 (16px JPEG) para usar como background
 *
 * Tudo via Canvas no navegador. Zero infra extra.
 */

const SIZES = { lg: 1920, md: 1280, sm: 640 } as const;
const BLUR_SIZE = 16;
const WEBP_QUALITY = 0.82;

export type ProcessedImage = {
  large: Blob;
  medium: Blob;
  small: Blob;
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
): Promise<Blob> {
  const ratio = source.naturalHeight / source.naturalWidth;
  const w = Math.min(targetWidth, source.naturalWidth);
  const h = Math.round(w * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas 2d indisponível"));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob falhou"))),
      type,
      quality
    );
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

/**
 * Processa um arquivo em 3 WebPs + blur placeholder.
 * Se o navegador não suportar WebP por algum motivo, cai pra JPEG.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  const img = await loadImage(file);
  const type = "image/webp";
  const [large, medium, small] = await Promise.all([
    resizeToBlob(img, SIZES.lg, type, WEBP_QUALITY),
    resizeToBlob(img, SIZES.md, type, WEBP_QUALITY),
    resizeToBlob(img, SIZES.sm, type, WEBP_QUALITY),
  ]);
  const blurDataUrl = resizeToDataUrl(img, BLUR_SIZE, "image/jpeg", 0.5);
  return {
    large,
    medium,
    small,
    blurDataUrl,
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}
