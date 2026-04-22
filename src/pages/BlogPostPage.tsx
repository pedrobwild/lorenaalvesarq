import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import InternalNav from "../components/InternalNav";
import { useBlogPost } from "../lib/useBlog";
import { useSiteSettings } from "../lib/useSiteSettings";
import { useSeo, breadcrumbJsonLd, organizationJsonLd } from "../lib/useSeo";
import { routes, navigate } from "../lib/useHashRoute";
import { track } from "../lib/analytics";

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

export default function BlogPostPage({ slug }: Props) {
  const { post, loading, notFound } = useBlogPost(slug);
  const { settings } = useSiteSettings();
  const base = (settings?.seo_canonical_base || "https://lorenaalvesarq.com").replace(
    /\/$/,
    ""
  );

  const ogImage =
    post?.og_image_url || post?.cover_url || `${base}/images/og-lorena-alves-arquitetura-uberlandia-mg.jpg`;

  useSeo({
    title:
      post?.seo_title ||
      (post ? `${post.title} | Blog · Lorena Alves Arquitetura` : "Blog · Lorena Alves Arquitetura"),
    description:
      post?.seo_description || post?.excerpt || "Artigo do blog Lorena Alves Arquitetura.",
    canonicalPath: post ? `/blog/${post.slug}` : "/blog",
    ogType: "article",
    ogImage,
    jsonLd:
      settings && post
        ? [
            organizationJsonLd(settings),
            breadcrumbJsonLd(settings, [
              { name: "Início", path: "/" },
              { name: "Blog", path: "/blog" },
              { name: post.title, path: `/blog/${post.slug}` },
            ]),
            {
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: post.title,
              description: post.excerpt || post.seo_description || undefined,
              image: ogImage ? [ogImage] : undefined,
              datePublished: post.published_at ?? post.created_at,
              dateModified: post.updated_at,
              author: {
                "@type": "Person",
                name: post.author_name || "Lorena Alves",
                url: base,
              },
              publisher: {
                "@type": "Organization",
                name: settings.site_title || "Lorena Alves Arquitetura",
                logo: settings.seo_og_image
                  ? { "@type": "ImageObject", url: settings.seo_og_image }
                  : undefined,
              },
              mainEntityOfPage: {
                "@type": "WebPage",
                "@id": `${base}/blog/${post.slug}`,
              },
              articleSection: post.category || "Arquitetura",
              keywords: post.seo_keywords || (post.tags ?? []).join(", ") || undefined,
              inLanguage: "pt-BR",
              wordCount: post.content_html.replace(/<[^>]+>/g, " ").split(/\s+/).length,
            },
          ]
        : undefined,
  });

  useEffect(() => {
    if (!post) return;
    track("blog_post_view", { value: { slug: post.slug } });
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".blog-post__hero > *",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.9, stagger: 0.06, ease: "power3.out" }
      );
      gsap.utils.toArray<HTMLElement>(".blog-post__content > *").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 92%", once: true },
          }
        );
      });
    });
    return () => ctx.revert();
  }, [post]);

  if (loading) {
    return (
      <div className="pf-page blog-page">
        <InternalNav active="blog" backHref={routes.blog} backLabel="voltar ao blog" />
        <div className="pf-head">
          <p className="mono" style={{ opacity: 0.5 }}>
            carregando…
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="pf-page blog-page">
        <InternalNav active="blog" backHref={routes.blog} backLabel="voltar ao blog" />
        <header className="pf-head">
          <p className="pf-head__eyebrow mono">404 · Artigo não encontrado</p>
          <h1 className="pf-head__title">
            Esse texto <em>não existe (ainda)</em>.
          </h1>
          <p className="pf-head__lede">
            O artigo que você procura pode ter sido movido ou removido.
          </p>
          <button
            type="button"
            className="hero__cta"
            style={{ marginTop: "2rem" }}
            onClick={() => navigate(routes.blog)}
          >
            <span className="hero__cta-label">Ver todos os artigos</span>
            <span className="hero__cta-arrow" aria-hidden>
              →
            </span>
          </button>
        </header>
      </div>
    );
  }

  return (
    <div className="pf-page blog-page">
      <InternalNav active="blog" backHref={routes.blog} backLabel="voltar ao blog" />

      <article className="blog-post">
        <header className="blog-post__hero">
          <div className="blog-post__crumb mono">
            <a href={routes.blog}>Blog</a>
            {post.category && (
              <>
                <span aria-hidden> · </span>
                <span>{post.category}</span>
              </>
            )}
            {post.published_at && (
              <>
                <span aria-hidden> · </span>
                <time dateTime={post.published_at}>
                  {formatDate(post.published_at)}
                </time>
              </>
            )}
            {post.reading_minutes && (
              <>
                <span aria-hidden> · </span>
                <span>{post.reading_minutes} min</span>
              </>
            )}
          </div>
          <h1 className="blog-post__title">
            {post.title}
            {post.subtitle && (
              <>
                <br />
                <em>{post.subtitle}</em>
              </>
            )}
          </h1>
          {post.excerpt && <p className="blog-post__lede">{post.excerpt}</p>}

          {(post.author_name || post.author_role) && (
            <div className="blog-post__author mono">
              {post.author_name}
              {post.author_role && (
                <>
                  <span aria-hidden> · </span>
                  <span>{post.author_role}</span>
                </>
              )}
            </div>
          )}
        </header>

        {post.cover_url && (() => {
          const cover = derivePictureSources(post.cover_url);
          const sizes = "(max-width: 1100px) 100vw, 1100px";
          if (cover) {
            return (
              <figure className="blog-post__cover">
                <picture>
                  <source type="image/avif" srcSet={setToSrcset(cover.avif)} sizes={sizes} />
                  <source type="image/webp" srcSet={setToSrcset(cover.webp)} sizes={sizes} />
                  <source type="image/jpeg" srcSet={setToSrcset(cover.jpeg)} sizes={sizes} />
                  <img
                    src={cover.fallbackSrc}
                    srcSet={setToSrcset(cover.jpeg)}
                    sizes={sizes}
                    alt={post.cover_alt || post.title}
                    width={1920}
                    height={1080}
                    loading="eager"
                    fetchPriority="high"
                    decoding="sync"
                  />
                </picture>
              </figure>
            );
          }
          // Fallback: imagens legadas que não seguem a convenção -sm/-md/-lg
          return (
            <figure className="blog-post__cover">
              <img
                src={post.cover_url_md || post.cover_url}
                srcSet={
                  post.cover_url_sm && post.cover_url_md && post.cover_url
                    ? `${post.cover_url_sm} 640w, ${post.cover_url_md} 1280w, ${post.cover_url} 1920w`
                    : undefined
                }
                sizes={sizes}
                alt={post.cover_alt || post.title}
                width={1920}
                height={1080}
                loading="eager"
                fetchPriority="high"
                decoding="sync"
              />
            </figure>
          );
        })()}

        <div
          className="blog-post__content"
          // O HTML é editado/curado pela admin do estúdio (autora confiável).
          // Sanitização é feita no formulário antes de salvar.
          dangerouslySetInnerHTML={{ __html: post.content_html }}
        />

        {post.tags && post.tags.length > 0 && (
          <nav className="blog-post__tags" aria-label="Tags do artigo">
            {post.tags.map((t) => {
              const tagSlug = t
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9\s-]/g, "")
                .trim()
                .replace(/\s+/g, "-");
              return (
                <a
                  key={t}
                  href={routes.blogTag(tagSlug)}
                  className="blog-post__tag mono"
                  data-cursor="hover"
                  onClick={() =>
                    track("blog_tag_click", {
                      value: { from: "post", tag: tagSlug, slug: post.slug },
                    })
                  }
                >
                  #{t}
                </a>
              );
            })}
            <a
              href={routes.blogTags}
              className="blog-post__tag blog-post__tag--all mono"
              data-cursor="hover"
            >
              ver todas as tags →
            </a>
          </nav>
        )}

        <footer className="blog-post__footer">
          <div className="blog-post__cta-block">
            <p className="blog-post__cta-quote">
              Esse artigo te fez pensar no seu próximo projeto? <br />
              <em>Vamos projetar o seu modo de viver.</em>
            </p>
            <a
              className="hero__cta"
              href="https://wa.me/5534996668215"
              target="_blank"
              rel="noopener noreferrer external"
              onClick={() =>
                track("click_contact", {
                  value: { kind: "whatsapp", from: "blog-post", slug: post.slug },
                })
              }
            >
              <span className="hero__cta-label">Falar com a Lorena</span>
              <span className="hero__cta-arrow" aria-hidden>
                →
              </span>
            </a>
          </div>
        </footer>
      </article>
    </div>
  );
}
