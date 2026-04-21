/**
 * Seção de Perguntas Frequentes (FAQ) — home.
 * - Lê os itens da tabela `faq_items` (gerenciada via /admin/faq).
 * - Acessível: usa <details>/<summary> nativo (funciona com teclado e screen readers).
 * - O conteúdo também alimenta o JSON-LD FAQPage (faqJsonLd em useSeo.ts).
 */

import { useFaq } from "../lib/useFaq";

export default function FaqSection() {
  const { items } = useFaq();

  if (items.length === 0) return null;

  return (
    <section className="section faq" id="faq" aria-labelledby="faq-title">
      <div className="section__header">
        <div className="section__eyebrow">
          Perguntas frequentes · {String(items.length).padStart(2, "0")}
        </div>
        <h2 className="section__title" id="faq-title">
          Antes de começar, <em>algumas respostas.</em>
        </h2>
      </div>

      <div className="faq__list" itemScope itemType="https://schema.org/FAQPage">
        {items.map((item, i) => (
          <details
            key={item.id}
            className="faq__item"
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <summary className="faq__q">
              <span className="faq__q-num mono">{String(i + 1).padStart(2, "0")}</span>
              <span className="faq__q-text" itemProp="name">
                {item.question}
              </span>
              <span className="faq__q-icon" aria-hidden="true">
                +
              </span>
            </summary>
            <div
              className="faq__a"
              itemScope
              itemProp="acceptedAnswer"
              itemType="https://schema.org/Answer"
            >
              <p itemProp="text">{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
