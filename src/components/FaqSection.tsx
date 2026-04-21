/**
 * Seção de Perguntas Frequentes (FAQ) — home.
 * - Acessível: usa <details>/<summary> nativo (funciona sem JS, com teclado e screen readers).
 * - Mistura perguntas locais (Uberlândia/MG) e perguntas de processo, ambas otimizadas
 *   para queries informacionais e long-tail ("quanto custa um projeto de arquitetura",
 *   "como funciona o acompanhamento de obra", "arquiteta em Uberlândia").
 * - O conteúdo abaixo também alimenta o JSON-LD FAQPage (faqJsonLd em useSeo.ts).
 */

export const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "O estúdio atende em Uberlândia e em outras cidades?",
    a: "Sim. A base do estúdio é em Uberlândia/MG, mas atendemos projetos em todo o Triângulo Mineiro, em Minas Gerais e em outros estados. Para projetos fora da região, organizamos visitas técnicas presenciais nas etapas-chave e fazemos o acompanhamento contínuo de obra à distância, com equipe parceira em campo.",
  },
  {
    q: "Quais tipos de projeto vocês desenvolvem?",
    a: "Trabalhamos com arquitetura residencial (casas e apartamentos de alto padrão), interiores autorais, retrofit de edificações existentes e projetos comerciais selecionados — sobretudo restaurantes, hospitalidade e espaços de marca que pedem assinatura material precisa.",
  },
  {
    q: "Como funciona o processo, do primeiro contato à entrega?",
    a: "São seis etapas: escuta (briefing aprofundado), conceito (estudo preliminar), projeto executivo, interiores e curadoria, acompanhamento semanal de obra e entrega com styling. Cada fase tem cronograma claro e entregáveis definidos antes de avançar para a próxima.",
  },
  {
    q: "Quanto tempo leva um projeto de arquitetura?",
    a: "Um projeto residencial completo (arquitetura + interiores) leva, em média, de 5 a 9 meses até a finalização do executivo, dependendo da escala e do nível de detalhamento. A obra costuma durar de 12 a 24 meses. Cronograma personalizado é apresentado no escopo inicial.",
  },
  {
    q: "Como é cobrado o projeto? Por metro quadrado ou por etapa?",
    a: "Trabalhamos com honorário por escopo, não por metro quadrado. O valor é proposto após a primeira reunião, considerando complexidade do programa, área de intervenção, nível de detalhamento e fases contratadas. O pagamento é dividido em parcelas amarradas às entregas de cada etapa.",
  },
  {
    q: "É possível contratar só os interiores, sem o projeto de arquitetura?",
    a: "Sim. Atendemos projetos exclusivos de interiores e curadoria — para imóveis novos ou para reformas pontuais —, com mobiliário desenhado sob medida, seleção de peças autorais brasileiras e iluminação técnica integrada à atmosfera do espaço.",
  },
  {
    q: "Vocês acompanham a obra ou só entregam o projeto?",
    a: "Acompanhamos a obra com presença semanal em campo nas etapas críticas e visitas pontuais nas demais. O escritório atua como interlocutor técnico do cliente com a construtora, garantindo que cada decisão executada permaneça fiel ao projeto e ao conceito original.",
  },
];

export default function FaqSection() {
  return (
    <section className="section faq" id="faq" aria-labelledby="faq-title">
      <div className="section__header">
        <div className="section__eyebrow">Perguntas frequentes · 06</div>
        <h2 className="section__title" id="faq-title">
          Antes de começar, <em>algumas respostas.</em>
        </h2>
      </div>

      <div className="faq__list" itemScope itemType="https://schema.org/FAQPage">
        {FAQ_ITEMS.map((item, i) => (
          <details
            key={i}
            className="faq__item"
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <summary className="faq__q">
              <span className="faq__q-num mono">{String(i + 1).padStart(2, "0")}</span>
              <span className="faq__q-text" itemProp="name">
                {item.q}
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
              <p itemProp="text">{item.a}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
