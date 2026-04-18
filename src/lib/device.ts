// Utilitários para decidir quais efeitos rodar em desktop vs. mobile.
// A regra geral: se é touch + viewport pequeno OU prefers-reduced-motion,
// usamos scroll/animações nativas (menos janela de jank, mais bateria).

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isTouchDevice(): boolean {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

export function isSmallViewport(): boolean {
  return window.matchMedia("(max-width: 900px)").matches;
}

// Heurística para "é mobile / experiência touch": touch + small OU touch-only.
export function isMobile(): boolean {
  return isTouchDevice() && isSmallViewport();
}

// Lenis e parallax só rodam quando faz sentido.
export function shouldUseSmoothScroll(): boolean {
  if (prefersReducedMotion()) return false;
  if (isMobile()) return false;
  return true;
}

export function shouldRunParallax(): boolean {
  if (prefersReducedMotion()) return false;
  if (isMobile()) return false;
  return true;
}
