import { useSeo } from "../lib/useSeo";
import InternalNav from "../components/InternalNav";
import { routes } from "../lib/useHashRoute";

/**
 * Página 404 dedicada — sinaliza claramente ao Google que a URL é inválida.
 *
 * Como Lovable Hosting é SPA-fallback (toda URL inexistente recebe 200 + index.html),
 * o Search Console pode classificar páginas como "soft-404" se renderizarmos a home
 * em URLs inexistentes. Aqui:
 *  - <meta name="robots" content="noindex, follow"> impede indexação
 *  - <title> e H1 começam explicitamente com "404"
 *  - Conteúdo curto e sinalético — Googlebot detecta soft-404 pelo conteúdo
 *  - Links úteis (home, portfólio, blog) ajudam usuário e crawler a se reorientar
 */
export default function NotFoundPage() {
  useSeo({
    title: "404 · Página não encontrada — Lorena Alves Arquitetura",
    description:
      "A página solicitada não existe ou foi movida. Conheça o portfólio, blog e o estúdio Lorena Alves Arquitetura, em Uberlândia/MG.",
    canonicalPath: "/404",
    ogType: "website",
    noindex: true,
  });

  useEffect(() => {
    // Registra o 404 no analytics para identificar URLs quebradas mais frequentes.
    track("page_not_found", {
      path: typeof window !== "undefined" ? window.location.pathname : null,
      referrer: typeof document !== "undefined" ? document.referrer : null,
    });
  }, []);

  return (
    <main id="main" tabIndex={-1} className="pf-page">
      <InternalNav backLabel="voltar ao início" />

      <header className="pf-head">
        <p className="pf-head__eyebrow mono">Erro 404 · Página não encontrada</p>
        <h1 className="pf-head__title">
          Essa página <em>não existe</em>.
        </h1>
        <p className="pf-head__lede">
          O endereço acessado não corresponde a nenhuma página do estúdio. Talvez
          o link esteja incorreto, a página tenha sido movida ou a URL contenha um
          erro de digitação.
        </p>
      </header>

      <section
        className="privacidade-page__list"
        aria-label="Atalhos para páginas principais"
      >
        <h2 className="mono" style={{ fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1rem" }}>
          Para onde ir agora
        </h2>
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.75rem", fontSize: "1rem" }}>
          <li>
            <a href={routes.home} style={{ textDecoration: "underline" }}>
              → Voltar à página inicial
            </a>
          </li>
          <li>
            <a href={routes.portfolio} style={{ textDecoration: "underline" }}>
              → Ver o portfólio de projetos
            </a>
          </li>
          <li>
            <a href={routes.sobre} style={{ textDecoration: "underline" }}>
              → Conhecer o estúdio (Sobre)
            </a>
          </li>
          <li>
            <a href={routes.blog} style={{ textDecoration: "underline" }}>
              → Ler o blog de arquitetura
            </a>
          </li>
          <li>
            <a href={routes.faq} style={{ textDecoration: "underline" }}>
              → Perguntas frequentes (FAQ)
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
