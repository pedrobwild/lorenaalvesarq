/**
 * Estado central de consentimento LGPD.
 *
 * O banner em `src/components/CookieBanner.tsx` é a UI; este módulo é o
 * single-source-of-truth lido por todo o resto do app (analytics, trackers,
 * scripts injetados por `useSeo`). Nada deve ler `localStorage` direto:
 * sempre passar por `isConsentAccepted()` ou `onConsentChange(...)`.
 *
 * Decisão arquitetural:
 *  - Cookies essenciais (auth do Supabase, preferência do banner) ficam fora
 *    do gate — eles são necessários para o site funcionar.
 *  - Tudo que é analytics/marketing (track(), GA4, GTM, Meta Pixel, Hotjar,
 *    Clarity) só roda depois que `setConsent("accepted")` é chamado.
 *  - Quando o usuário aceita após carregar a página, disparamos o
 *    `CustomEvent("cookie:accept")` para que os subsistemas que rodam uma
 *    única vez (initAnalytics, injectTrackers) possam se "engajar" sem
 *    exigir reload.
 */

const STORAGE_KEY = "lal_cookie_consent";
export const CONSENT_EVENT = "cookie:consent-change";

export type Consent = "accepted" | "declined";

export function readConsent(): Consent | null {
  try {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "accepted" || v === "declined") return v;
    return null;
  } catch {
    return null;
  }
}

export function setConsent(value: Consent): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* modo privado / storage cheio — silencia */
  }
  try {
    window.dispatchEvent(
      new CustomEvent<Consent>(CONSENT_EVENT, { detail: value })
    );
  } catch {
    /* CustomEvent indisponível (testes muito antigos) */
  }
}

export function isConsentAccepted(): boolean {
  return readConsent() === "accepted";
}

/**
 * Assina mudanças de consentimento (mesmo aba ou outras abas via `storage`).
 * Retorna função de cleanup.
 */
export function onConsentChange(
  handler: (value: Consent) => void
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onCustom = (e: Event) => {
    const detail = (e as CustomEvent<Consent>).detail;
    if (detail === "accepted" || detail === "declined") handler(detail);
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    if (e.newValue === "accepted" || e.newValue === "declined") {
      handler(e.newValue);
    }
  };

  window.addEventListener(CONSENT_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
