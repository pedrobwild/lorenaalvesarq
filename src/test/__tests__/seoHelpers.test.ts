import { describe, it, expect, beforeEach } from "vitest";
import { expectMetaContainsNoIndex, resetHead } from "../seoHelpers";

/**
 * Testes do próprio helper expectMetaContainsNoIndex.
 *
 * O helper é usado como linha de defesa em TODA página 404 (atual e futura) e
 * também para validar headers `X-Robots-Tag` de edge functions. Se ele
 * silenciosamente aceitar valores que não são noindex, perdemos a proteção
 * contra soft-404 sem aviso. Estes testes blindam o contrato.
 */

beforeEach(() => {
  resetHead();
});

function setRobots(content: string) {
  const m = document.createElement("meta");
  m.setAttribute("name", "robots");
  m.setAttribute("content", content);
  document.head.appendChild(m);
}

describe("expectMetaContainsNoIndex — passa quando", () => {
  it.each([
    "noindex",
    "noindex, follow",
    "noindex,nofollow",
    "NOINDEX",
    "NoIndex, Follow",
    "no index",      // espaço — alguns CMSs geram assim
    "none",          // atalho oficial Google = noindex,nofollow
    "max-snippet:0, noindex, max-image-preview:none",
  ])("meta robots = %j", (value) => {
    setRobots(value);
    expect(() => expectMetaContainsNoIndex()).not.toThrow();
  });

  it("aceita conteúdo arbitrário (ex.: header X-Robots-Tag)", () => {
    expect(() => expectMetaContainsNoIndex("noindex, nofollow")).not.toThrow();
    expect(() => expectMetaContainsNoIndex("NONE")).not.toThrow();
  });
});

describe("expectMetaContainsNoIndex — falha quando", () => {
  it.each([
    "index, follow",
    "all",
    "follow",
    "",
  ])("meta robots = %j (mensagem de erro inclui o conteúdo recebido)", (value) => {
    setRobots(value);
    expect(() => expectMetaContainsNoIndex()).toThrow(/noindex/i);
  });

  it("não há meta robots no head", () => {
    expect(() => expectMetaContainsNoIndex()).toThrow(/noindex/i);
  });

  it("conteúdo arbitrário não contém noindex", () => {
    expect(() => expectMetaContainsNoIndex("index, follow")).toThrow();
    expect(() => expectMetaContainsNoIndex(null)).toThrow();
    expect(() => expectMetaContainsNoIndex(undefined)).toThrow();
  });
});
