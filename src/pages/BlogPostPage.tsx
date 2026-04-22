import { useEffect, useMemo } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import InternalNav from "../components/InternalNav";
import { useBlogPost } from "../lib/useBlog";
import { useSiteSettings } from "../lib/useSiteSettings";
import { useSeo, breadcrumbJsonLd, organizationJsonLd } from "../lib/useSeo";
import { routes, navigate } from "../lib/useHashRoute";
import { track } from "../lib/analytics";
import { derivePictureSources, setToSrcset } from "../lib/derivePicture";
import RelatedPosts from "../components/RelatedPosts";

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

  // Absolutiza URLs relativas — Rich Results Test exige URLs absolutas em ImageObject.
  const absUrl = (u: string | null | undefined): string | undefined => {
    if (!u) return undefined;
    if (/^https?:\/\//i.test(u)) return u;
    return `${base}${u.startsWith("/") ? "" : "/"}${u}`;
  };

  const headline = post?.title
    ? post.title.length > 110
      ? post.title.slice(0, 107) + "…"
      : post.title
    : "";
  const articleUrl = post ? `${base}/blog/${post.slug}` : `${base}/blog`;
  const publisherLogo = absUrl(settings?.seo_og_image || settings?.default_og_image);

  useSeo({
    title:
      post?.seo_title ||
      (post ? `${post.title} | Blog · Lorena Alves Arquitetura` : "Blog · Lorena Alves Arquitetura"),
    description:
      post?.seo_description || post?.excerpt || "Artigo do blog Lorena Alves Arquitetura.",
    canonicalPath: post ? `/blog/${post.slug}` : "/blog",
    ogType: "article",
    ogImage: absUrl(ogImage),
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
              "@id": `${articleUrl}#article`,
              headline,
              name: post.title,
              description:
                post.excerpt || post.seo_description || `${post.title} — Blog Lorena Alves Arquitetura.`,
              image: absUrl(ogImage)
                ? [
                    {
                      "@type": "ImageObject",
                      url: absUrl(ogImage)!,
                      width: 1200,
                      height: 630,
                    },
                  ]
                : undefined,
              url: articleUrl,
              datePublished: post.published_at ?? post.created_at,
              dateModified: post.updated_at || post.published_at || post.created_at,
              author: {
                "@type": "Person",
                name: post.author_name || "Lorena Alves",
                url: base,
                jobTitle: post.author_role || "Arquiteta e Urbanista",
              },
              publisher: {
                "@type": "Organization",
                "@id": `${base}/#organization`,
                name: settings.site_title || "Lorena Alves Arquitetura",
                logo: publisherLogo
                  ? {
                      "@type": "ImageObject",
                      url: publisherLogo,
                      width: 1200,
                      height: 630,
                    }
                  : undefined,
              },
              mainEntityOfPage: {
                "@type": "WebPage",
                "@id": articleUrl,
              },
              isPartOf: {
                "@type": "Blog",
                "@id": `${base}/blog#blog`,
                name: "Blog · Lorena Alves Arquitetura",
                url: `${base}/blog`,
              },
              articleSection: post.category || "Arquitetura",
              keywords: post.seo_keywords || (post.tags ?? []).join(", ") || undefined,
              inLanguage: "pt-BR",
              wordCount: post.content_html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length,
            },
          ]
        : undefined,
  });

  /**
   * Pós-processa o `content_html` antes de injetar no DOM:
   *  - Garante `loading="lazy"` + `decoding="async"` + `fetchpriority="low"` em
   *    toda <img> que esteja fora de uma <picture>.
   *  - Quando a URL da <img> segue a convenção `-{sm|md|lg}.{ext}` do pipeline,
   *    envolve-a numa <picture> com sources AVIF + WebP + JPEG, fazendo upgrade
   *    automático mesmo em posts antigos seedados sem `<picture>`.
   *
   * Roda uma única vez por mudança de post (useMemo) — sem custo na rolagem.
   */
  const enhancedHtml = useMemo(() => {
    if (!post?.content_html) return "";
    if (typeof window === "undefined") return post.content_html;
    try {
      const doc = new DOMParser().parseFromString(
        `<div id="root">${post.content_html}</div>`,
        "text/html"
      );
      const root = doc.getElementById("root");
      if (!root) return post.content_html;

      // ============================================================
      // Hierarquia de headings — garante H1 único na página
      // ------------------------------------------------------------
      // O <h1> da página é o título do post. Qualquer <h1> dentro
      // do conteúdo é rebaixado para <h2>. Em seguida, normaliza
      // pulos de nível (ex.: h2 → h4 vira h2 → h3) — mantendo a
      // ordem semântica esperada por leitores de tela e crawlers.
      // ============================================================
      const renameHeading = (el: Element, newTag: string) => {
        const next = doc.createElement(newTag);
        for (const a of Array.from(el.attributes)) next.setAttribute(a.name, a.value);
        next.innerHTML = el.innerHTML;
        el.parentNode?.replaceChild(next, el);
        return next;
      };

      // 1) Rebaixa qualquer h1 do conteúdo para h2
      Array.from(root.querySelectorAll("h1")).forEach((h) => renameHeading(h, "h2"));

      // 2) Normaliza pulos: nível atual nunca pode aumentar mais de 1
      //    em relação ao último heading visto. Início mínimo = h2 (h1 é o título).
      let prevLevel = 1; // h1 da página
      const headings = Array.from(root.querySelectorAll("h2, h3, h4, h5, h6"));
      for (const h of headings) {
        const current = parseInt(h.tagName.charAt(1), 10);
        const target = current > prevLevel + 1 ? prevLevel + 1 : current;
        if (target !== current) {
          const renamed = renameHeading(h, `h${target}`);
          prevLevel = parseInt(renamed.tagName.charAt(1), 10);
        } else {
          prevLevel = current;
        }
      }

      const imgs = Array.from(root.querySelectorAll("img"));
      for (const img of imgs) {
        // 1) Garantir lazy + async em qualquer <img> sem priority explícita
        if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
        if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
        if (!img.hasAttribute("fetchpriority")) img.setAttribute("fetchpriority", "low");

        // 2) Se já está dentro de <picture>, deixa quieto (autor já configurou).
        const inPicture = img.parentElement?.tagName.toLowerCase() === "picture";
        if (inPicture) continue;

        // 3) Tenta derivar AVIF/WebP/JPEG da URL — só upgrade se for URL do pipeline.
        const src = img.getAttribute("src") || "";
        const derived = derivePictureSources(src);
        if (!derived) continue;

        const sizes = img.getAttribute("sizes") || "(max-width: 900px) 100vw, 900px";

        const picture = doc.createElement("picture");
        const mkSource = (type: string, set: { sm: string; md: string; lg: string }) => {
          const s = doc.createElement("source");
          s.setAttribute("type", type);
          s.setAttribute("srcset", setToSrcset(set));
          s.setAttribute("sizes", sizes);
          return s;
        };
        picture.appendChild(mkSource("image/avif", derived.avif));
        picture.appendChild(mkSource("image/webp", derived.webp));
        picture.appendChild(mkSource("image/jpeg", derived.jpeg));

        // Atualiza a <img> para apontar ao JPEG fallback (universal).
        img.setAttribute("src", derived.fallbackSrc);
        img.setAttribute("srcset", setToSrcset(derived.jpeg));
        img.setAttribute("sizes", sizes);

        img.parentNode?.insertBefore(picture, img);
        picture.appendChild(img);
      }
      return root.innerHTML;
    } catch {
      // Em qualquer falha, devolve o HTML original — nunca quebra o render do artigo.
      return post.content_html;
    }
  }, [post?.content_html]);

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
            scrollTrigger: {
              trigger: el,
              start: "top 95%",
              once: true,
              // Failsafe: se ao registrar o trigger ele já passou da posição,
              // dispara imediatamente — evita conteúdo invisível por race condition
              // entre dangerouslySetInnerHTML e ScrollTrigger.
              onRefresh: (self) => {
                if (self.progress > 0) gsap.set(el, { opacity: 1, y: 0 });
              },
            },
          }
        );
      });
      // Recalcula triggers após o DOM injetado pelo dangerouslySetInnerHTML estar estável.
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    return () => ctx.revert();
  }, [post]);

  if (loading) {
    return (
      <main id="main" tabIndex={-1} className="pf-page blog-page">
        <InternalNav active="blog" backHref={routes.blog} backLabel="voltar ao blog" />
        <div className="pf-head">
          <p className="mono" style={{ opacity: 0.5 }} role="status" aria-live="polite">
            carregando…
          </p>
        </div>
      </main>
    );
  }

  if (notFound || !post) {
    return (
      <main id="main" tabIndex={-1} className="pf-page blog-page">
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
      </main>
    );
  }

  return (
    <main id="main" tabIndex={-1} className="pf-page blog-page">
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
                <em className="text-3xl">{post.subtitle}</em>
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
          dangerouslySetInnerHTML={{ __html: enhancedHtml }}
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

        <RelatedPosts currentPost={post} />

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
    </main>
  );
}
