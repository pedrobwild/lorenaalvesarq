/**
 * Cobertura: sanitizeBlogHtml deve neutralizar os vetores XSS clássicos
 * citados no audit (#2 / B3) ANTES do conteúdo virar `dangerouslySetInnerHTML`
 * no `BlogPostPage` ou ser persistido em `blog_posts.content_html`.
 *
 * Não duplica a suíte do DOMPurify — só prova que a configuração local
 * (allow-list mínima de tags + atributos) bate com o que o post real precisa
 * (h2/h3, p, a, picture/source/img, figure/figcaption, ul/ol/li, blockquote)
 * e bloqueia o que nunca deve aparecer (script, iframe, on*=, javascript:).
 */
import { describe, it, expect } from "vitest";
import { sanitizeBlogHtml } from "../sanitizeHtml";

describe("sanitizeBlogHtml — vetores XSS", () => {
  it("remove tags <script>", () => {
    const out = sanitizeBlogHtml('<p>oi</p><script>alert(1)</script>');
    expect(out).not.toMatch(/<script/i);
    expect(out).toMatch(/<p>oi<\/p>/);
  });

  it("remove handlers on*= em <img>", () => {
    const out = sanitizeBlogHtml('<img src="x" onerror="alert(1)" />');
    expect(out).not.toMatch(/onerror/i);
    // o <img> em si pode ficar — só os handlers vão embora
  });

  it("neutraliza href com javascript:", () => {
    const out = sanitizeBlogHtml('<a href="javascript:alert(1)">link</a>');
    expect(out).not.toMatch(/javascript:/i);
  });

  it("remove <iframe>", () => {
    const out = sanitizeBlogHtml('<iframe src="https://evil.example"></iframe>');
    expect(out).not.toMatch(/<iframe/i);
  });

  it("remove <style> e atributo style=", () => {
    const out = sanitizeBlogHtml(
      '<style>body{display:none}</style><p style="color:red">x</p>'
    );
    expect(out).not.toMatch(/<style/i);
    expect(out).not.toMatch(/style=/i);
    expect(out).toMatch(/<p>x<\/p>/);
  });
});

describe("sanitizeBlogHtml — preserva HTML legítimo do editor", () => {
  it("mantém headings, parágrafos, listas e blockquote", () => {
    const input =
      "<h2>Título</h2><p>parágrafo com <strong>negrito</strong> e <em>itálico</em>.</p>" +
      "<ul><li>um</li><li>dois</li></ul><blockquote>citação</blockquote>";
    const out = sanitizeBlogHtml(input);
    expect(out).toContain("<h2>");
    expect(out).toContain("<strong>");
    expect(out).toContain("<em>");
    expect(out).toContain("<ul>");
    expect(out).toContain("<li>");
    expect(out).toContain("<blockquote>");
  });

  it("preserva <picture> + <source> + <img> com srcset/sizes/loading", () => {
    const input =
      '<figure><picture>' +
      '<source type="image/avif" srcset="a-sm.avif 640w, a-md.avif 1280w" sizes="100vw" />' +
      '<source type="image/webp" srcset="a-sm.webp 640w, a-md.webp 1280w" sizes="100vw" />' +
      '<img src="a-md.jpg" srcset="a-sm.jpg 640w, a-md.jpg 1280w" sizes="100vw" ' +
      'alt="alt" loading="lazy" decoding="async" width="1280" height="720" />' +
      "</picture></figure>";
    const out = sanitizeBlogHtml(input);
    expect(out).toContain("<picture>");
    expect(out).toContain('type="image/avif"');
    expect(out).toContain("srcset=");
    expect(out).toContain('loading="lazy"');
    expect(out).toContain('alt="alt"');
  });

  it("preserva <a href> http(s) com target/rel", () => {
    const out = sanitizeBlogHtml(
      '<a href="https://wa.me/5534996668215" target="_blank" rel="noopener noreferrer">Lorena</a>'
    );
    expect(out).toMatch(/href="https:\/\/wa\.me\/5534996668215"/);
    expect(out).toMatch(/target="_blank"/);
    expect(out).toMatch(/rel="noopener noreferrer"/);
  });

  it("devolve string vazia quando recebe vazio", () => {
    expect(sanitizeBlogHtml("")).toBe("");
  });
});

describe("sanitizeBlogHtml — reverse tabnabbing", () => {
  it("força rel=noopener noreferrer em <a target=_blank> sem rel", () => {
    const out = sanitizeBlogHtml(
      '<a href="https://exemplo.com" target="_blank">link</a>'
    );
    expect(out).toMatch(/rel="noopener noreferrer"/);
  });

  it("sobrescreve rel parcial em <a target=_blank>", () => {
    const out = sanitizeBlogHtml(
      '<a href="https://exemplo.com" target="_blank" rel="nofollow">link</a>'
    );
    expect(out).toMatch(/rel="noopener noreferrer"/);
    expect(out).not.toMatch(/rel="nofollow"/);
  });

  it("não adiciona rel em <a> sem target=_blank", () => {
    const out = sanitizeBlogHtml('<a href="https://exemplo.com">link</a>');
    expect(out).not.toMatch(/rel=/);
  });
});
