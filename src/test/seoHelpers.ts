/**
 * Helpers de teste para inspeção de meta tags do <head>.
 *
 * Esses utilitários eliminam repetição nos testes de SEO (NotFoundPage,
 * router smoke, futuras páginas) e tornam as asserções mais legíveis:
 *
 *   // Antes:
 *   const robots = document.head.querySelector<HTMLMetaElement>(
 *     'meta[name="robots"]'
 *   );
 *   expect(robots).not.toBeNull();
 *   expect(robots!.getAttribute("content")).toMatch(/noindex/i);
 *
 *   // Depois:
 *   expect(getRobotsContent()).toMatch(/noindex/i);
 *
 * Todos os helpers leem do `document.head` real (jsdom), portanto devem
 * ser usados depois de `render(<Component />)` e, quando a tag é injetada
 * via efeito (useSeo), dentro de `await waitFor(...)`.
 */

/** Conteúdo de uma <meta> por seletor CSS arbitrário. "" se ausente. */
export function getMetaContent(selector: string): string {
  return (
    document.head
      .querySelector<HTMLMetaElement>(selector)
      ?.getAttribute("content") || ""
  );
}

/** Conteúdo de <meta name="..."> (atalho para `meta[name="X"]`). */
export function getMetaByName(name: string): string {
  return getMetaContent(`meta[name="${name}"]`);
}

/** Conteúdo de <meta property="..."> — usado por Open Graph. */
export function getMetaByProperty(property: string): string {
  return getMetaContent(`meta[property="${property}"]`);
}

/** href do <link rel="canonical">. "" se ausente. */
export function getCanonicalHref(): string {
  return (
    document.head
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.getAttribute("href") || ""
  );
}

/** content de <meta name="robots">. "" se ausente. */
export function getRobotsContent(): string {
  return getMetaByName("robots");
}

/** Open Graph title. */
export const getOgTitle = () => getMetaByProperty("og:title");
/** Open Graph description. */
export const getOgDescription = () => getMetaByProperty("og:description");
/** Open Graph URL canônica do compartilhamento. */
export const getOgUrl = () => getMetaByProperty("og:url");
/** Open Graph type ("website", "article", ...). */
export const getOgType = () => getMetaByProperty("og:type");
/** Open Graph locale ("pt_BR", "en_US", ...). */
export const getOgLocale = () => getMetaByProperty("og:locale");

/** Twitter card type ("summary", "summary_large_image"). */
export const getTwitterCard = () => getMetaByName("twitter:card");
/** Twitter title. */
export const getTwitterTitle = () => getMetaByName("twitter:title");
/** Twitter description. */
export const getTwitterDescription = () => getMetaByName("twitter:description");

/**
 * Reseta o <head> entre testes para garantir isolamento — chame em `beforeEach`.
 * Também limpa `document.title` (algumas asserções olham o title).
 */
export function resetHead() {
  document.head.innerHTML = "";
  document.title = "";
}
