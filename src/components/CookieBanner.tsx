import { useEffect, useState } from "react";
import { routes } from "../lib/useHashRoute";

/**
 * Banner de consentimento de cookies (LGPD).
 * - Aparece apenas se o usuário ainda não registrou uma escolha.
 * - Persiste a decisão em localStorage sob a chave `lal_cookie_consent`:
 *   "accepted" | "declined".
 * - Link para /privacidade para detalhes.
 */

const STORAGE_KEY = "lal_cookie_consent";
type Consent = "accepted" | "declined";

function readConsent(): Consent | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "accepted" || v === "declined") return v;
    return null;
  } catch {
    return null;
  }
}

function writeConsent(value: Consent) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // silenciosamente ignora (modo privado, storage cheio, etc.)
  }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

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

  function handle(choice: Consent) {
    writeConsent(choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="cookie-banner"
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies e privacidade"
    >
      <div className="cookie-banner__inner">
        <div className="cookie-banner__text">
          <p className="cookie-banner__title mono">Cookies e privacidade</p>
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
