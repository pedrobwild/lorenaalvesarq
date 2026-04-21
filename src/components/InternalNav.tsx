import { routes } from "../lib/useHashRoute";

type Props = {
  /** href do link "voltar" à direita */
  backHref?: string;
  /** rótulo do link "voltar" */
  backLabel?: string;
  /** rota atualmente ativa, para destacar o item do menu */
  active?: "portfolio" | "faq" | "home" | "project";
  /** classe extra no <nav> (ex.: pp-nav para variante de fundo) */
  extraClassName?: string;
};

/**
 * Nav reutilizável das páginas internas (Portfolio, Project, FAQ).
 * Mantém o brand à esquerda, o menu principal ao centro e o link de voltar
 * à direita — usando os tokens visuais já definidos para .pf-nav.
 */
export default function InternalNav({
  backHref = routes.home,
  backLabel = "voltar ao início",
  active,
  extraClassName,
}: Props) {
  return (
    <nav className={`pf-nav${extraClassName ? ` ${extraClassName}` : ""}`}>
      <a
        className="pf-nav__brand"
        href={routes.home}
        aria-label="lorenaalves arq — início"
      >
        <span className="brand-lockup">
          lorena<b>alves</b>
          <sup>arq</sup>
        </span>
      </a>

      <div className="pf-nav__menu" role="navigation" aria-label="Principal">
        <a href={routes.home} data-cursor="hover">
          Início
        </a>
        <a
          href={routes.portfolio}
          className={active === "portfolio" || active === "project" ? "is-active" : ""}
          data-cursor="hover"
        >
          Portfólio
        </a>
        <a href="/#estudio" data-cursor="hover">
          Sobre
        </a>
        <a href="/#metodo" data-cursor="hover">
          Método
        </a>
        <a
          href={routes.faq}
          className={active === "faq" ? "is-active" : ""}
          data-cursor="hover"
        >
          FAQ
        </a>
      </div>

      <a className="pf-nav__back" href={backHref} data-cursor="hover">
        <span className="pf-nav__arrow">←</span>
        <span>{backLabel}</span>
      </a>
    </nav>
  );
}
