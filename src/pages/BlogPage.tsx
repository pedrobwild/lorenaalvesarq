import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import InternalNav from "../components/InternalNav";
import { useBlogPosts } from "../lib/useBlog";
import { useSiteSettings } from "../lib/useSiteSettings";
import { useSeo, breadcrumbJsonLd, organizationJsonLd } from "../lib/useSeo";
import { routes } from "../lib/useHashRoute";
import { track } from "../lib/analytics";
import BlogCardCover from "../components/BlogCardCover";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function BlogPage() {
  const { posts, loading } = useBlogPosts();
  const { settings } = useSiteSettings();

  useSeo({
    title:
      "Blog de Arquitetura e Interiores em Uberlândia | Lorena Alves Arquitetura",
    description:
      "Artigos do estúdio Lorena Alves sobre como construir, reformar e habitar — guias práticos de arquitetura residencial, design de interiores e planejamento de obra em Uberlândia/MG.",
    canonicalPath: "/blog",
    ogType: "website",
    jsonLd: settings
      ? [
          organizationJsonLd(settings),
          breadcrumbJsonLd(settings, [
            { name: "Início", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "Blog · Lorena Alves Arquitetura",
            url: `${(settings.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "")}/blog`,
            description:
              "Artigos do estúdio Lorena Alves sobre arquitetura residencial, interiores e planejamento de obra.",
            publisher: {
              "@type": "Organization",
              name: settings.site_title || "Lorena Alves Arquitetura",
            },
            blogPost: posts.map((p) => ({
              "@type": "BlogPosting",
              headline: p.title,
              url: `${(settings.seo_canonical_base || "https://lorenaalvesarq.com").replace(/\/$/, "")}/blog/${p.slug}`,
              datePublished: p.published_at ?? p.created_at,
              image: p.cover_url ?? undefined,
            })),
          },
        ]
      : undefined,
  });

  useEffect(() => {
    track("blog_index_view");
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".blog-reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          }
        );
      });
    });
    return () => ctx.revert();
  }, [posts.length]);

  return (
    <main id="main" tabIndex={-1} className="pf-page blog-page">
      <InternalNav active="blog" backLabel="voltar ao início" />

      <header className="pf-head">
        <p className="pf-head__eyebrow mono">Blog · Lorena Alves Arquitetura</p>
        <h1 className="pf-head__title">
          Escritos sobre <em>habitar, projetar e construir</em>.
        </h1>
        <p className="pf-head__lede">
          Reflexões e guias práticos do estúdio — sobre como tornar o desejo de
          uma casa em projeto, e o projeto em obra. Um lugar para pensar a
          arquitetura antes do primeiro traço.
        </p>
      </header>

      <nav className="blog-tags-strip" aria-label="Atalho para tags">
        <a
          href={routes.blogTags}
          className="blog-tags-strip__link mono"
          data-cursor="hover"
        >
          <span>Navegar por tags</span>
          <span aria-hidden>→</span>
        </a>
      </nav>

      <section className="blog-grid" aria-label="Artigos do blog">
        {loading && (
          <p className="mono" style={{ opacity: 0.5 }}>
            carregando…
          </p>
        )}

        {!loading && posts.length === 0 && (
          <p className="mono" style={{ opacity: 0.6 }}>
            Em breve, os primeiros artigos.
          </p>
        )}

        {posts.map((p, i) => {
          const sizes =
            i === 0
              ? "(max-width: 900px) 100vw, 60vw"
              : "(max-width: 900px) 100vw, 30vw";
          return (
            <article
              key={p.id}
              className={`blog-card blog-reveal ${i === 0 ? "blog-card--lead" : ""}`}
            >
              <a
                href={`/blog/${p.slug}`}
                className="blog-card__link"
                data-cursor="hover"
                aria-label={`Ler artigo: ${p.title}`}
              >
                <BlogCardCover
                  coverUrl={p.cover_url}
                  coverUrlMd={p.cover_url_md}
                  coverUrlSm={p.cover_url_sm}
                  alt={p.cover_alt || p.title}
                  sizes={sizes}
                  priority={i === 0}
                />
                <div className="blog-card__body">
                  <div className="blog-card__meta mono">
                    {p.category && <span>{p.category}</span>}
                    {p.published_at && (
                      <>
                        <span aria-hidden> · </span>
                        <time dateTime={p.published_at}>
                          {formatDate(p.published_at)}
                        </time>
                      </>
                    )}
                    {p.reading_minutes && (
                      <>
                        <span aria-hidden> · </span>
                        <span>{p.reading_minutes} min de leitura</span>
                      </>
                    )}
                  </div>
                  <h2 className="blog-card__title">
                    {p.title}
                    {p.subtitle && <em> {p.subtitle}</em>}
                  </h2>
                  {p.excerpt && <p className="blog-card__excerpt">{p.excerpt}</p>}
                  <span className="blog-card__cta mono">
                    ler artigo <span aria-hidden>→</span>
                  </span>
                </div>
              </a>
            </article>
          );
        })}
      </section>

      <footer className="pf-foot blog-reveal">
        <div>
          <p className="pf-foot__quote">
            Quer transformar um desejo em projeto? <em>Conversemos.</em>
          </p>
        </div>
        <a
          className="pf-foot__cta"
          href={`${routes.home}#contato`}
          data-cursor="hover"
          onClick={() =>
            track("click_cta", { value: { label: "contato", from: "blog-index" } })
          }
        >
          <span>FALAR COM O ESTÚDIO</span>
          <span className="btn-big__arrow" />
        </a>
      </footer>
    </div>
  );
}
