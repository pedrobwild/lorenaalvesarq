import { useEffect } from "react";
import { gsap } from "gsap";
import InternalNav from "../components/InternalNav";
import { useBlogTags } from "../lib/useBlog";
import { useSiteSettings } from "../lib/useSiteSettings";
import { useSeo, breadcrumbJsonLd, organizationJsonLd } from "../lib/useSeo";
import { routes } from "../lib/useHashRoute";
import { track } from "../lib/analytics";

export default function BlogTagsPage() {
  const { tags, loading } = useBlogTags();
  const { settings } = useSiteSettings();
  const base = (settings?.seo_canonical_base || "https://lorenaalvesarq.com").replace(
    /\/$/,
    ""
  );

  useSeo({
    title:
      "Tags do Blog · Arquitetura, Construção e Interiores em Uberlândia | Lorena Alves Arquitetura",
    description:
      "Explore os artigos do blog Lorena Alves organizados por assunto: como construir sua casa, projeto autoral, reforma, arquitetura residencial, materiais e interiores. Conteúdo prático para quem vai projetar em Uberlândia, MG.",
    canonicalPath: "/blog/tags",
    ogType: "website",
    jsonLd: settings
      ? [
          organizationJsonLd(settings),
          breadcrumbJsonLd(settings, [
            { name: "Início", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: "Tags", path: "/blog/tags" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Tags do Blog · Lorena Alves Arquitetura",
            url: `${base}/blog/tags`,
            description:
              "Índice de tags dos artigos do blog do estúdio Lorena Alves Arquitetura.",
            hasPart: tags.map((t) => ({
              "@type": "DefinedTerm",
              name: t.label,
              url: `${base}/blog/tag/${t.slug}`,
            })),
          },
        ]
      : undefined,
  });

  useEffect(() => {
    track("blog_tags_view");
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".blog-tags__chip",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.03, ease: "power2.out" }
      );
    });
    return () => ctx.revert();
  }, [tags.length]);

  return (
    <main id="main" tabIndex={-1} className="pf-page blog-page">
      <InternalNav active="blog" backHref={routes.blog} backLabel="voltar ao blog" />

      <header className="pf-head">
        <p className="pf-head__eyebrow mono">Blog · Tags</p>
        <h1 className="pf-head__title">
          Encontre artigos por <em>assunto</em>.
        </h1>
        <p className="pf-head__lede">
          Um índice vivo dos temas que atravessam o blog do estúdio — de quem
          vai erguer a <strong>primeira casa</strong> a quem busca repertório
          sobre <strong>arquitetura residencial</strong>, <strong>reforma</strong>,{" "}
          <strong>projeto autoral</strong> e os bastidores do nosso trabalho em{" "}
          <strong>Uberlândia, MG</strong>.
        </p>
        <p className="pf-head__lede" style={{ marginTop: "1rem" }}>
          Cada tag agrupa textos escritos com cuidado para orientar decisões
          reais: como escolher um terreno, quanto custa contratar um arquiteto,
          quais materiais envelhecem bem no clima do cerrado, como funciona o
          acompanhamento de obra e por que vale projetar antes de construir.
          Use os atalhos abaixo para começar pelo assunto que mais te interessa
          — ou volte para o{" "}
          <a
            href={routes.blog}
            data-cursor="hover"
            style={{
              color: "var(--clay-deep)",
              borderBottom: "1px solid rgba(143, 84, 51, 0.35)",
              textDecoration: "none",
            }}
          >
            índice cronológico do blog
          </a>
          .
        </p>
      </header>

      <section className="blog-tags" aria-label="Lista de tags do blog">
        {loading && (
          <p className="mono" style={{ opacity: 0.5 }}>
            carregando…
          </p>
        )}

        {!loading && tags.length === 0 && (
          <p className="mono" style={{ opacity: 0.6 }}>
            Em breve, novos artigos com novos temas.
          </p>
        )}

        <ul className="blog-tags__list">
          {tags.map((t) => (
            <li key={t.slug}>
              <a
                href={routes.blogTag(t.slug)}
                className="blog-tags__chip"
                data-cursor="hover"
                aria-label={`Ver artigos com a tag ${t.label} (${t.count})`}
                onClick={() =>
                  track("blog_tag_click", {
                    value: { from: "tags-index", tag: t.slug },
                  })
                }
              >
                <span className="blog-tags__chip-label">#{t.label}</span>
                <span className="blog-tags__chip-count mono">{t.count}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {!loading && tags.length > 0 && (
        <section
          className="blog-tags__guide"
          aria-labelledby="blog-tags-guide-title"
        >
          <h2 id="blog-tags-guide-title" className="blog-tags__guide-title">
            Como navegar pelo blog
          </h2>
          <p className="blog-tags__guide-lede">
            Três caminhos comuns para começar — escolha o que mais se aproxima
            do seu momento.
          </p>
          <ul className="blog-tags__guide-list">
            <li>
              <strong>Vai construir agora?</strong> Comece pelas tags{" "}
              <a href={routes.blogTag("primeira-casa")} data-cursor="hover">
                #primeira-casa
              </a>{" "}
              e{" "}
              <a href={routes.blogTag("construcao")} data-cursor="hover">
                #construcao
              </a>{" "}
              para entender o passo a passo, do terreno à entrega das chaves.
            </li>
            <li>
              <strong>Está pesquisando referências?</strong> Os textos em{" "}
              <a
                href={routes.blogTag("arquitetura-residencial")}
                data-cursor="hover"
              >
                #arquitetura-residencial
              </a>{" "}
              e{" "}
              <a href={routes.blogTag("projeto-autoral")} data-cursor="hover">
                #projeto-autoral
              </a>{" "}
              mostram como pensamos repertório, materialidade e autoria.
            </li>
            <li>
              <strong>Pensa em renovar o que já existe?</strong> Acompanhe a
              tag{" "}
              <a href={routes.blogTag("reforma")} data-cursor="hover">
                #reforma
              </a>{" "}
              — atualizamos com cuidados, prazos e o que considerar antes de
              quebrar a primeira parede.
            </li>
          </ul>
          <p className="blog-tags__guide-foot mono">
            Os artigos são atualizados periodicamente. Se houver um tema que
            você gostaria de ver por aqui,{" "}
            <a href={`${routes.home}#contato`} data-cursor="hover">
              escreva para o estúdio
            </a>
            .
          </p>
        </section>
      )}

      <footer className="pf-foot">
        <div>
          <p className="pf-foot__quote">
            Procurando algo específico? <em>Conversemos.</em>
          </p>
        </div>
        <a
          className="pf-foot__cta"
          href={`${routes.home}#contato`}
          data-cursor="hover"
          onClick={() =>
            track("click_cta", {
              value: { label: "contato", from: "blog-tags" },
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
