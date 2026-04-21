import { routes } from "../lib/useHashRoute";
import { useSeo, breadcrumbJsonLd, faqJsonLd } from "../lib/useSeo";
import { useSiteSettings } from "../lib/useSiteSettings";
import { FAQ_ITEMS } from "../components/FaqSection";
import { track } from "../lib/analytics";

/**
 * Página dedicada /faq.
 * - Reaproveita FAQ_ITEMS (mesma fonte de verdade da home).
 * - Promove cada pergunta a H2 (página dedicada → cada pergunta é tópico próprio).
 * - JSON-LD: BreadcrumbList + FAQPage para rich result no Google.
 * - Canonical: /faq (a versão na home tem âncora /#faq, não compete).
 */
export default function FaqPage() {
  const { settings } = useSiteSettings();

  useSeo({
    title:
      "Perguntas Frequentes — Arquiteta em Uberlândia | Lorena Alves Arquitetura",
    description:
      "Tire suas dúvidas sobre projetos de arquitetura e interiores: prazos, valores, atendimento em Uberlândia/MG e Triângulo Mineiro, processo de obra e contratação.",
    canonicalPath: "/faq",
    ogType: "website",
    jsonLd: settings
      ? [
          breadcrumbJsonLd(settings, [
            { name: "Início", path: "/" },
            { name: "Perguntas frequentes", path: "/faq" },
          ]),
          faqJsonLd(FAQ_ITEMS),
        ]
      : undefined,
  });

  return (
    <div className="pf-page faq-page">
      {/* Top nav minimal — mesmo padrão do Portfolio */}
      <nav className="pf-nav">
        <a className="pf-nav__brand" href={routes.home} aria-label="lorenaalves arq — início">
          <span className="brand-lockup">
            lorena<b>alves</b>
            <sup>arq</sup>
          </span>
        </a>
        <a className="pf-nav__back" href={routes.home} data-cursor="hover">
          <span className="pf-nav__arrow">←</span>
          <span>voltar ao início</span>
        </a>
      </nav>

      {/* Header — H1 da página */}
      <header className="pf-head">
        <p className="pf-head__eyebrow mono">FAQ · Lorena Alves Arquitetura</p>
        <h1 className="pf-head__title">
          Perguntas <em>frequentes</em>.
        </h1>
        <p className="pf-head__lede">
          Reunimos abaixo as dúvidas mais comuns sobre o trabalho do estúdio —
          de atendimento em Uberlândia e no Triângulo Mineiro a prazos, valores
          e como funciona o processo, da escuta à entrega.
        </p>
      </header>

      {/* Lista — promovendo cada pergunta a H2 (versão página dedicada) */}
      <section
        className="faq-page__list"
        aria-label="Lista de perguntas frequentes"
        itemScope
        itemType="https://schema.org/FAQPage"
      >
        {FAQ_ITEMS.map((item, i) => (
          <article
            className="faq-page__item"
            key={i}
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <div className="faq-page__num mono">
              {String(i + 1).padStart(2, "0")} / {String(FAQ_ITEMS.length).padStart(2, "0")}
            </div>
            <h2 className="faq-page__q" itemProp="name">
              {item.q}
            </h2>
            <div
              className="faq-page__a"
              itemScope
              itemProp="acceptedAnswer"
              itemType="https://schema.org/Answer"
            >
              <p itemProp="text">{item.a}</p>
            </div>
          </article>
        ))}
      </section>

      {/* CTA final */}
      <footer className="pf-foot">
        <div>
          <p className="pf-foot__quote">
            Não encontrou sua dúvida? <em>Conversemos.</em>
          </p>
        </div>
        <a
          className="pf-foot__cta"
          href={`${routes.home}#contato`}
          data-cursor="hover"
          onClick={() =>
            track("click_cta", { value: { label: "contato", from: "faq-page" } })
          }
        >
          <span>FALAR COM O ESTÚDIO</span>
          <span className="btn-big__arrow" />
        </a>
      </footer>
    </div>
  );
}
