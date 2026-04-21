import { routes } from "../lib/useHashRoute";
import { useSeo, breadcrumbJsonLd } from "../lib/useSeo";
import { useSiteSettings } from "../lib/useSiteSettings";
import { track } from "../lib/analytics";

/**
 * Página /sobre — Sobre a Lorena e o estúdio.
 * - Formação acadêmica, especialidades, ferramentas e serviços.
 * - Conteúdo otimizado para SEO local (Uberlândia/MG e Triângulo Mineiro).
 * - Layout `pf-page` consistente com FAQ e Privacidade.
 */

const FORMACOES = [
  {
    curso: "Arquitetura e Urbanismo",
    instituicao: "Universidade Federal de Uberlândia",
    sigla: "UFU",
  },
  {
    curso: "Design de Interiores",
    instituicao: "Instituto de Pós-Graduação de Goiânia",
    sigla: "IPOG",
  },
  {
    curso: "Lighting Design",
    instituicao: "Instituto de Pós-Graduação de Goiânia",
    sigla: "IPOG",
  },
  {
    curso: "Gestão Empresarial",
    instituicao: "Universidade de São Paulo",
    sigla: "USP",
  },
];

const ESPECIALIDADES = [
  {
    titulo: "Arquitetura Residencial",
    desc: "Casas, apartamentos e refúgios de alto padrão — projetos autorais que traduzem rotina, afeto e memória em espaço.",
  },
  {
    titulo: "Arquitetura Comercial",
    desc: "Lojas, restaurantes e espaços que precisam convencer em segundos — identidade visual, fluxo e experiência desenhados com precisão.",
  },
  {
    titulo: "Arquitetura Corporativa",
    desc: "Escritórios e sedes que comunicam cultura, sustentam produtividade e refletem o posicionamento da marca.",
  },
  {
    titulo: "Clínicas e Hospitais",
    desc: "Ambientes de saúde com desempenho técnico, humanização e conformidade regulatória — onde projeto e protocolo andam juntos.",
  },
  {
    titulo: "Design de Interiores",
    desc: "Atmosferas construídas a partir de paleta, textura e proporção — do layout de base ao último detalhe de acabamento.",
  },
  {
    titulo: "Iluminação",
    desc: "Projeto luminotécnico autoral — cenas, temperatura de cor e controle que revelam a arquitetura ao anoitecer.",
  },
];

const SOFTWARES = [
  "SketchUp",
  "ZWCAD",
  "V-Ray",
  "Adobe Creative Suite",
];

const SERVICOS = [
  {
    titulo: "Projeto arquitetônico completo",
    desc: "Do programa de necessidades ao executivo, passando por volumetria, plantas, cortes, fachadas e compatibilização com engenharia.",
  },
  {
    titulo: "Design de interiores",
    desc: "Layout, paginação, marcenaria sob medida, curadoria de mobiliário, revestimentos e objetos que constroem a atmosfera de cada ambiente.",
  },
  {
    titulo: "Projeto de iluminação",
    desc: "Cálculo luminotécnico, escolha de luminárias, cenas de iluminação e dimerização — luz como material de projeto, não como detalhe final.",
  },
  {
    titulo: "Paisagismo integrado",
    desc: "Jardins internos e externos pensados junto com a arquitetura — vegetação, pisos, percursos e micro-climas que prolongam os espaços da casa.",
  },
  {
    titulo: "Decoração e curadoria",
    desc: "Seleção de peças, arte, têxteis e objetos que dão alma ao projeto — com foco em durabilidade, conforto e significado.",
  },
  {
    titulo: "Escolha de materiais e acabamentos",
    desc: "Aconselhamento técnico e estético sobre revestimentos, metais, louças, madeiras e pedras — equilibrando performance, orçamento e estética.",
  },
  {
    titulo: "Acompanhamento e supervisão de obra",
    desc: "Visitas periódicas ao canteiro, compatibilização com a equipe executora, verificação de medidas e padrões — projeto e obra caminhando juntos.",
  },
  {
    titulo: "Suporte contínuo durante a execução",
    desc: "Resolução de imprevistos, ajustes de projeto, interlocução com fornecedores e apoio em decisões críticas ao longo de toda a obra.",
  },
];

export default function SobrePage() {
  const { settings } = useSiteSettings();
  const contactEmail = settings?.contact_email || "contato@lorenaalvesarq.com";

  useSeo({
    title: "Sobre — Lorena Alves, arquiteta em Uberlândia | Lorena Alves Arquitetura",
    description:
      "Conheça a Lorena Alves, arquiteta formada pela UFU, com pós-graduações em Design de Interiores, Lighting Design (IPOG) e Gestão Empresarial (USP). Atua com arquitetura residencial, comercial, corporativa, clínicas, interiores e iluminação em Uberlândia e no Triângulo Mineiro.",
    canonicalPath: "/sobre",
    ogType: "website",
    jsonLd: settings
      ? [
          breadcrumbJsonLd(settings, [
            { name: "Início", path: "/" },
            { name: "Sobre", path: "/sobre" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Lorena Alves",
            jobTitle: "Arquiteta e Urbanista",
            email: contactEmail,
            image: `${(settings.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "")}/images/portrait.png`,
            url: `${(settings.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "")}/sobre`,
            alumniOf: [
              {
                "@type": "CollegeOrUniversity",
                name: "Universidade Federal de Uberlândia",
              },
              {
                "@type": "CollegeOrUniversity",
                name: "Instituto de Pós-Graduação de Goiânia (IPOG)",
              },
              {
                "@type": "CollegeOrUniversity",
                name: "Universidade de São Paulo (USP)",
              },
            ],
            knowsAbout: [
              "Arquitetura Residencial",
              "Arquitetura Comercial",
              "Arquitetura Corporativa",
              "Arquitetura Hospitalar",
              "Design de Interiores",
              "Lighting Design",
              "Paisagismo",
            ],
            worksFor: {
              "@type": "Organization",
              name: "Lorena Alves Arquitetura",
            },
          },
        ]
      : undefined,
  });

  return (
    <div className="pf-page sobre-page">
      {/* Top nav */}
      <nav className="pf-nav">
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
        <a className="pf-nav__back" href={routes.home} data-cursor="hover">
          <span className="pf-nav__arrow">←</span>
          <span>voltar ao início</span>
        </a>
      </nav>

      {/* Header */}
      <header className="pf-head">
        <p className="pf-head__eyebrow mono">Sobre · Lorena Alves Arquitetura</p>
        <h1 className="pf-head__title">
          Arquitetura como <em>agente</em> de transformação.
        </h1>
        <p className="pf-head__lede">
          Lorena Alves é arquiteta e urbanista, fundadora do estúdio sediado em
          Uberlândia/MG, com atuação no Triângulo Mineiro e em todo o Brasil. O
          trabalho une rigor técnico, sensibilidade de projeto e uma visão
          autoral da brasilidade contemporânea — pensada para permanecer.
        </p>
      </header>

      {/* Retrato + bio */}
      <section className="sobre-page__intro" aria-label="Retrato e biografia">
        <div className="sobre-page__portrait">
          <img
            src="/images/portrait.png"
            alt="Retrato de Lorena Alves, arquiteta fundadora do estúdio em Uberlândia"
            loading="lazy"
            decoding="async"
            width={900}
            height={1200}
          />
        </div>
        <div className="sobre-page__bio">
          <h2 className="sobre-page__bio-title">
            Lorena <em>Alves</em>, arquiteta fundadora.
          </h2>
          <p>
            Enxergo arquitetura e design como agentes transformadores — capazes
            de influenciar positivamente a vida das pessoas, dos negócios e das
            cidades. Cada projeto nasce de uma escuta cuidadosa: rotina, memória,
            aspiração. E se traduz em espaço preciso, material honesto e luz
            trabalhada como elemento de projeto.
          </p>
          <p>
            Tomo cada obra como minha. Porque, sonhando junto com quem contrata,
            transformamos intenções em espaços prontos para serem experimentados
            — e que ganham beleza com o tempo.
          </p>
        </div>
      </section>

      {/* Formação */}
      <section className="sobre-page__section" aria-label="Formação acadêmica">
        <div className="sobre-page__section-head">
          <p className="sobre-page__eyebrow mono">01 · Formação</p>
          <h2 className="sobre-page__section-title">
            Base técnica em <em>quatro</em> escolas.
          </h2>
          <p className="sobre-page__section-lede">
            Formação continuada em arquitetura, interiores, iluminação e gestão
            — repertório que sustenta projetos complexos, do conceito à entrega.
          </p>
        </div>
        <ul className="sobre-page__formacao">
          {FORMACOES.map((f, i) => (
            <li className="sobre-page__formacao-item" key={f.curso}>
              <div className="sobre-page__formacao-num mono">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="sobre-page__formacao-body">
                <h3 className="sobre-page__formacao-curso">{f.curso}</h3>
                <p className="sobre-page__formacao-inst">
                  {f.instituicao}
                  {f.sigla ? <span className="mono"> · {f.sigla}</span> : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Especialidades */}
      <section className="sobre-page__section" aria-label="Especialidades">
        <div className="sobre-page__section-head">
          <p className="sobre-page__eyebrow mono">02 · Especialidades</p>
          <h2 className="sobre-page__section-title">
            Seis frentes de <em>atuação</em>.
          </h2>
          <p className="sobre-page__section-lede">
            Projetos autorais em escalas diversas — da residência ao ambiente
            clínico — sempre com o mesmo rigor de método e curadoria.
          </p>
        </div>
        <div className="sobre-page__especialidades">
          {ESPECIALIDADES.map((e) => (
            <article className="sobre-page__esp-card" key={e.titulo}>
              <h3 className="sobre-page__esp-titulo">{e.titulo}</h3>
              <p className="sobre-page__esp-desc">{e.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* O que se espera de um arquiteto */}
      <section className="sobre-page__section" aria-label="Serviços do estúdio">
        <div className="sobre-page__section-head">
          <p className="sobre-page__eyebrow mono">03 · O que fazemos por você</p>
          <h2 className="sobre-page__section-title">
            Muito além da <em>planta</em>.
          </h2>
          <p className="sobre-page__section-lede">
            Contratar um arquiteto é contratar método, curadoria e presença. Quem
            chega ao estúdio normalmente busca mais do que um projeto — quer
            alguém que antecipe problemas, proteja orçamento e leve a obra ao
            padrão prometido. É nesse terreno que o estúdio atua.
          </p>
        </div>
        <div className="sobre-page__servicos">
          {SERVICOS.map((s, i) => (
            <article className="sobre-page__servico" key={s.titulo}>
              <div className="sobre-page__servico-num mono">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="sobre-page__servico-body">
                <h3 className="sobre-page__servico-titulo">{s.titulo}</h3>
                <p className="sobre-page__servico-desc">{s.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Softwares */}
      <section className="sobre-page__section" aria-label="Softwares e ferramentas">
        <div className="sobre-page__section-head">
          <p className="sobre-page__eyebrow mono">04 · Ferramentas</p>
          <h2 className="sobre-page__section-title">
            Softwares de <em>projeto</em>.
          </h2>
          <p className="sobre-page__section-lede">
            Ferramentas escolhidas para entregar precisão técnica, imagens
            realistas e comunicação clara com clientes, engenharias e obra.
          </p>
        </div>
        <ul className="sobre-page__softwares">
          {SOFTWARES.map((s) => (
            <li className="sobre-page__soft" key={s}>
              <span className="mono sobre-page__soft-tag">SW</span>
              <span className="sobre-page__soft-nome">{s}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA final */}
      <footer className="pf-foot">
        <div>
          <p className="pf-foot__quote">
            Pronto para começar seu <em>projeto?</em>
          </p>
        </div>
        <a
          className="pf-foot__cta"
          href={`${routes.home}#contato`}
          data-cursor="hover"
          onClick={() =>
            track("click_cta", {
              value: { label: "contato", from: "sobre-page" },
            })
          }
        >
          <span>FALAR COM O ESTÚDIO</span>
          <span className="btn-big__arrow" />
        </a>
      </footer>
    </div>
  );
}
