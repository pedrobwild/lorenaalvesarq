import { useEffect, useRef, useState } from "react";
import { routes } from "../lib/useHashRoute";
import { readConsent, setConsent, type Consent } from "../lib/cookieConsent";

/**
 * Banner de consentimento de cookies (LGPD).
 * - Aparece apenas se o usuário ainda não registrou uma escolha.
 * - Persiste e propaga a decisão via `src/lib/cookieConsent.ts` (chave
 *   `lal_cookie_consent` no localStorage + evento `cookie:consent-change`).
 * - Analytics, GA4, GTM, Meta Pixel, Clarity e Hotjar só rodam quando o
 *   valor é `"accepted"` — sem aceite, nenhum tracker é injetado.
 * - Link para /privacidade para detalhes.
 */

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const acceptBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Checa consentimento após montagem — evita SSR/hidratação inconsistente.
    const current = readConsent();
    if (current === null) {
      // Pequeno atraso para não competir com render inicial da página.
      const t = window.setTimeout(() => setVisible(true), 400);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, []);

  // M8: a11y — quando o banner aparece, lembra o elemento focado para
  // restaurar depois, e move o foco para "Aceitar" (default não
  // destrutivo). ESC equivale a "Recusar" — opção mais segura para
  // privacidade do que dispensar sem decisão.
  useEffect(() => {
    if (!visible) return;
    previousFocusRef.current =
      (document.activeElement as HTMLElement | null) ?? null;
    acceptBtnRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handle("declined");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previousFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [visible]);

  function handle(choice: Consent) {
    setConsent(choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    // Usa `role="region"` (não "dialog") porque o banner não bloqueia
    // interação com o resto da página — declarar dialog sem aria-modal
    // nem focus-trap é o pior dos mundos. Region + aria-labelledby
    // mantém o banner navegável por leitores de tela como landmark,
    // e o ESC handler global cobre o fluxo de teclado. (M8)
    <div
      className="cookie-banner"
      role="region"
      aria-live="polite"
      aria-labelledby="cookie-banner-title"
    >
      <div className="cookie-banner__inner">
        <div className="cookie-banner__text">
          <p id="cookie-banner-title" className="cookie-banner__title mono">
            Cookies e privacidade
          </p>
          <p className="cookie-banner__desc">
            Este site utiliza cookies para melhorar sua experiência e entender
            como nossos conteúdos são acessados. Você pode aceitar ou recusar
            cookies não essenciais. Saiba mais em nossa{" "}
            <a
              className="cookie-banner__link"
              href={routes.privacidade}
              data-cursor="hover"
            >
              Política de Privacidade
            </a>
            .
          </p>
        </div>
        <div className="cookie-banner__actions">
          <button
            type="button"
            className="cookie-banner__btn cookie-banner__btn--ghost"
            onClick={() => handle("declined")}
            data-cursor="hover"
          >
            Recusar
          </button>
          <button
            ref={acceptBtnRef}
            type="button"
            className="cookie-banner__btn cookie-banner__btn--solid"
            onClick={() => handle("accepted")}
            data-cursor="hover"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
