import DOMPurify from "dompurify";

/**
 * Sanitiza HTML do editor de blog antes de inserir no DOM ou persistir no banco.
 *
 * Política:
 *  - Permite tags semânticas (headings, parágrafos, listas, blockquote, hr, br).
 *  - Permite imagens responsivas (`<picture>` + `<source>` + `<img>`) com os
 *    atributos que o pipeline de upload gera (srcset, sizes, loading,
 *    decoding, fetchpriority, width, height).
 *  - Permite âncoras (`<a href>`) com `target` e `rel`; `FORCE_BODY` mantém
 *    `<figure>` e `<figcaption>` que o editor envolve em volta de imagens.
 *  - Remove `<script>`, `<style>`, `<iframe>`, `<object>`, handlers `on*=`
 *    e qualquer URL `javascript:` — vetores típicos de XSS armazenado.
 *
 * Use sempre antes de:
 *   1. salvar o `content_html` no Supabase (defesa em profundidade no admin);
 *   2. injetar via `dangerouslySetInnerHTML` no render do post (defesa final
 *      no client — protege contra conteúdo legado salvo antes da sanitização).
 */
const ALLOWED_TAGS = [
  "a",
  "abbr",
  "b",
  "blockquote",
  "br",
  "cite",
  "code",
  "del",
  "em",
  "figcaption",
  "figure",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "ins",
  "kbd",
  "li",
  "mark",
  "ol",
  "p",
  "picture",
  "pre",
  "q",
  "s",
  "small",
  "source",
  "span",
  "strong",
  "sub",
  "sup",
  "u",
  "ul",
];

const ALLOWED_ATTR = [
  "alt",
  "decoding",
  "fetchpriority",
  "height",
  "href",
  "loading",
  "media",
  "rel",
  "sizes",
  "src",
  "srcset",
  "target",
  "title",
  "type",
  "width",
];

// Força `rel="noopener noreferrer"` em qualquer `<a target="_blank">` para
// evitar reverse tabnabbing: sem `noopener`, a página externa aberta ganha
// acesso a `window.opener` e pode redirecionar a aba de origem para phishing.
// Sobrescreve qualquer `rel` parcial vindo do conteúdo. Registrado uma única
// vez no carregamento do módulo.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  // O keyword `_blank` é case-insensitive no HTML, então normaliza o valor
  // antes de comparar — `_Blank`/`_BLANK` também abrem nova aba.
  if (
    node.tagName === "A" &&
    node.getAttribute("target")?.toLowerCase() === "_blank"
  ) {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function sanitizeBlogHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Não permite `<form>`/`<input>` mesmo que apareçam no input —
    // posts não devem coletar dados do leitor.
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["style"],
    // Mantém estrutura adicional do editor (figure/figcaption) sem mexer
    // em entidades já escapadas no HTML salvo.
    KEEP_CONTENT: true,
  });
}
