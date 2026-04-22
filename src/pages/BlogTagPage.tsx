import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import InternalNav from "../components/InternalNav";
import { useBlogPostsByTag } from "../lib/useBlog";
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

type Props = { slug: string };

export default function BlogTagPage({ slug }: Props) {
  const { posts, label, loading } = useBlogPostsByTag(slug);
  const { settings } = useSiteSettings();
  const base = (settings?.seo_canonical_base || "https://lorenaalvesarq.com").replace(
    /\/$/,
    ""
  );
  const displayLabel = label || slug.replace(/-/g, " ");
  const titleCased = displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1);

  useSeo({
    title: `${titleCased} · Artigos do Blog | Lorena Alves Arquitetura`,
    description: `Artigos do blog Lorena Alves marcados com “${displayLabel}” — reflexões e guias práticos sobre arquitetura, interiores e construção em Uberlândia/MG.`,
    canonicalPath: `/blog/tag/${slug}`,
    ogType: "website",
    jsonLd:
      settings && !loading
        ? [
            organizationJsonLd(settings),
            breadcrumbJsonLd(settings, [
              { name: "Início", path: "/" },
              { name: "Blog", path: "/blog" },
              { name: "Tags", path: "/blog/tags" },
              { name: titleCased, path: `/blog/tag/${slug}` },
            ]),
            {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: `${titleCased} · Blog · Lorena Alves Arquitetura`,
              url: `${base}/blog/tag/${slug}`,
              about: { "@type": "Thing", name: displayLabel },
              hasPart: posts.map((p) => ({
                "@type": "BlogPosting",
                headline: p.title,
                url: `${base}/blog/${p.slug}`,
                datePublished: p.published_at ?? p.created_at,
                image: p.cover_url ?? undefined,
              })),
            },
          ]
        : undefined,
  });

  useEffect(() => {
    if (!slug) return;
    track("blog_tag_view", { value: { tag: slug } });
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".blog-reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          }
        );
      });
    });
    return () => ctx.revert();
  }, [slug, posts.length]);

  return (
    <div className="pf-page blog-page">
      <InternalNav active="blog" backHref={routes.blogTags} backLabel="ver todas as tags" />

      <header className="pf-head">
        <p className="pf-head__eyebrow mono">Blog · Tag</p>
        <h1 className="pf-head__title">
          #{displayLabel}
        </h1>
        <p className="pf-head__lede">
          {posts.length === 0 && !loading
            ? "Nenhum artigo encontrado com esta tag — por enquanto."
            : `${posts.length} ${posts.length === 1 ? "artigo" : "artigos"} marcados com “${displayLabel}”.`}
        </p>
      </header>

      <section className="blog-grid" aria-label={`Artigos com a tag ${displayLabel}`}>
        {loading && (
          <p className="mono" style={{ opacity: 0.5 }}>
            carregando…
          </p>
        )}

        {!loading && posts.length === 0 && (
          <p className="mono" style={{ opacity: 0.6 }}>
            <a href={routes.blogTags}>Voltar para todas as tags →</a>
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
            Quer ver mais assuntos? <em>Explore todas as tags.</em>
          </p>
        </div>
        <a
          className="pf-foot__cta"
          href={routes.blogTags}
          data-cursor="hover"
        >
          <span>VER TODAS AS TAGS</span>
          <span className="btn-big__arrow" />
        </a>
      </footer>
    </div>
  );
}
