import { routes } from "../lib/useHashRoute";
import { useSeo, breadcrumbJsonLd, faqJsonLd } from "../lib/useSeo";
import { useSiteSettings } from "../lib/useSiteSettings";
import { useFaq } from "../lib/useFaq";
import { track } from "../lib/analytics";
import InternalNav from "../components/InternalNav";

/**
 * Página dedicada /faq.
 * - Lê os FAQs da tabela `faq_items` (gerenciada via /admin/faq).
 * - Promove cada pergunta a H2 (cada pergunta é tópico próprio na página dedicada).
 * - JSON-LD: BreadcrumbList + FAQPage para rich result no Google.
 * - Canonical: /faq (a versão na home tem âncora /#faq, não compete).
 */
export default function FaqPage() {
  const { settings } = useSiteSettings();
  const { items } = useFaq();

  useSeo({
    title:
      "Perguntas Frequentes — Arquiteta em Uberlândia | Lorena Alves Arquitetura",
    description:
      "Tire suas dúvidas sobre projetos de arquitetura e interiores: prazos, valores, atendimento em Uberlândia/MG e Triângulo Mineiro, processo de obra e contratação.",
    canonicalPath: "/faq",
    ogType: "website",
    jsonLd:
      settings && items.length > 0
        ? [
            breadcrumbJsonLd(settings, [
              { name: "Início", path: "/" },
              { name: "Perguntas frequentes", path: "/faq" },
            ]),
            faqJsonLd(items.map((i) => ({ q: i.question, a: i.answer }))),
          ]
        : undefined,
  });

  return (
    <main id="main" tabIndex={-1} className="pf-page faq-page">
      {/* Top nav minimal — mesmo padrão do Portfolio */}
      <InternalNav active="faq" backLabel="voltar ao início" />

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
        {items.map((item, i) => (
          <article
            className="faq-page__item"
            key={item.id}
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <div className="faq-page__num mono">
              {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
            </div>
            <h2 className="faq-page__q" itemProp="name">
              {item.question}
            </h2>
            <div
              className="faq-page__a"
              itemScope
              itemProp="acceptedAnswer"
              itemType="https://schema.org/Answer"
            >
              <p itemProp="text">{item.answer}</p>
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
    </main>
  );
}
