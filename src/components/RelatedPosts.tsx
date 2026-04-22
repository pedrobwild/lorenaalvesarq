import { useRelatedBlogPosts, slugify, type BlogPost } from "../lib/useBlog";
import BlogCardCover from "./BlogCardCover";
import { routes } from "../lib/useHashRoute";
import { track } from "../lib/analytics";

type Props = {
  /** Post atual — usado para excluir-se da lista e calcular afinidade por tags. */
  currentPost: BlogPost;
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * "Leia também" — bloco de internal linking automático ao final do artigo.
 *
 * Mostra até 3 posts ranqueados por tags compartilhadas (ver `useRelatedBlogPosts`),
 * cada card com sua capa otimizada, metadados e os "selos" de tags em comum.
 *
 * Logo abaixo, exibe duas trilhas de tags clicáveis:
 *  - As tags do próprio artigo (rota `/blog/tag/:slug`)
 *  - Um link para o índice completo `/blog/tags`
 *
 * Tudo é HTML semântico (<nav>, <article>, <a>) — crawlers seguem os links
 * e o leitor ganha caminhos óbvios para continuar a leitura.
 */
export default function RelatedPosts({ currentPost }: Props) {
  const { related, loading } = useRelatedBlogPosts(currentPost, 3);

  const tagSlugs = (currentPost.tags ?? [])
    .map((t) => ({ label: t, slug: slugify(t) }))
    .filter((t) => t.slug);

  if (loading) return null;
  if (related.length === 0 && tagSlugs.length === 0) return null;

  return (
    <aside className="related-posts" aria-labelledby="related-posts-title">
      {related.length > 0 && (
        <>
          <header className="related-posts__head">
            <p className="related-posts__eyebrow mono">Continue lendo</p>
            <h2 id="related-posts-title" className="related-posts__title">
              {tagSlugs.length > 0
                ? "Mais artigos relacionados a estas tags"
                : "Mais artigos do blog"}
            </h2>
          </header>

          <ul className="related-posts__grid">
            {related.map((p) => (
              <li key={p.id} className="related-posts__item">
                <article className="related-card">
                  <a
                    href={`/blog/${p.slug}`}
                    className="related-card__link"
                    data-cursor="hover"
                    aria-label={`Ler artigo: ${p.title}`}
                    onClick={() =>
                      track("blog_related_click", {
                        value: {
                          from: currentPost.slug,
                          to: p.slug,
                          shared: p.sharedTagCount,
                        },
                      })
                    }
                  >
                    <BlogCardCover
                      coverUrl={p.cover_url}
                      coverUrlMd={p.cover_url_md}
                      coverUrlSm={p.cover_url_sm}
                      alt={p.cover_alt || p.title}
                      sizes="(max-width: 900px) 100vw, 33vw"
                    />
                    <div className="related-card__body">
                      <div className="related-card__meta mono">
                        {p.category && <span>{p.category}</span>}
                        {p.published_at && (
                          <>
                            <span aria-hidden> · </span>
                            <time dateTime={p.published_at}>
                              {formatDate(p.published_at)}
                            </time>
                          </>
                        )}
                      </div>
                      <h3 className="related-card__title">{p.title}</h3>
                      {p.excerpt && (
                        <p className="related-card__excerpt">{p.excerpt}</p>
                      )}
                      {p.sharedTags.length > 0 && (
                        <p className="related-card__shared mono">
                          Em comum:{" "}
                          {p.sharedTags
                            .slice(0, 3)
                            .map((t) => `#${t}`)
                            .join(" · ")}
                        </p>
                      )}
                      <span className="related-card__cta mono">
                        ler artigo <span aria-hidden>→</span>
                      </span>
                    </div>
                  </a>
                </article>
              </li>
            ))}
          </ul>
        </>
      )}

      {tagSlugs.length > 0 && (
        <nav
          className="related-posts__tag-nav"
          aria-label="Explorar mais por tag"
        >
          <p className="related-posts__tag-nav-title mono">
            Explore mais por tag
          </p>
          <ul className="related-posts__tag-list">
            {tagSlugs.map((t) => (
              <li key={t.slug}>
                <a
                  href={routes.blogTag(t.slug)}
                  className="related-posts__tag-chip"
                  data-cursor="hover"
                  onClick={() =>
                    track("blog_tag_click", {
                      value: { from: "related-block", tag: t.slug, slug: currentPost.slug },
                    })
                  }
                >
                  #{t.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={routes.blogTags}
                className="related-posts__tag-chip related-posts__tag-chip--all"
                data-cursor="hover"
              >
                ver todas →
              </a>
            </li>
          </ul>
        </nav>
      )}
    </aside>
  );
}
