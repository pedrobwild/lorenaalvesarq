import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import NotFoundPage from "../NotFoundPage";
import {
  getCanonicalHref,
  getRobotsContent,
  getOgTitle,
  getOgDescription,
  getOgUrl,
  getOgType,
  getOgLocale,
  getTwitterCard,
  getTwitterTitle,
  getTwitterDescription,
  resetHead,
} from "@/test/seoHelpers";

/**
 * Testes de regressão para a página 404.
 *
 * Esses testes existem para impedir que o site volte a gerar "soft-404" no
 * Google Search Console em mudanças futuras. Validam quatro contratos:
 *
 *  1. O <h1 data-testid="not-found-h1"> existe e contém "404"
 *     (seletor estável, sobrevive a mudanças de copy/layout).
 *  2. O cabeçalho como um todo menciona "404" (defesa em profundidade).
 *  3. O <title> do documento começa com "404".
 *  4. A meta robots fica em "noindex".
 *
 * Os helpers em `@/test/seoHelpers` (getCanonicalHref, getRobotsContent,
 * getOgTitle, etc.) reduzem o ruído visual: cada asserção fica em uma
 * linha legível e um eventual refactor das tags (ex.: trocar `name=`
 * por `property=`) é feito em UM só lugar.
 *
 * Se qualquer contrato quebrar, `npm test` falha — e como `build` roda os
 * testes antes do `vite build`, o deploy também falha.
 */

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/useSiteSettings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/useSiteSettings")>(
    "@/lib/useSiteSettings"
  );
  return {
    ...actual,
    fetchSiteSettings: vi.fn().mockResolvedValue({
      site_title: "Lorena Alves Arquitetura",
      site_description: "Estúdio de arquitetura em Uberlândia/MG",
      seo_canonical_base: "https://lorenaalvesarq.com",
      seo_robots: "index, follow",
    }),
    invalidateSiteSettings: vi.fn(),
  };
});

beforeEach(() => {
  try {
    sessionStorage.clear();
  } catch {
    /* noop */
  }
  resetHead();
  window.history.replaceState({}, "", "/rota-inexistente-test");
});

afterEach(() => {
  cleanup();
});

describe("NotFoundPage — proteção contra soft-404", () => {
  it("renderiza um <h1> com data-testid='not-found-h1' contendo '404'", () => {
    const { getByTestId } = render(<NotFoundPage />);

    // Usa data-testid em vez de seletor estrutural ou texto exato:
    // o teste sobrevive a mudanças de copy, classes CSS e layout,
    // desde que o H1 da 404 continue marcado e contenha "404".
    const h1 = getByTestId("not-found-h1");
    expect(h1.tagName).toBe("H1");
    expect(h1.textContent || "").toMatch(/404/);
  });

  it("o cabeçalho da página também menciona '404' (defesa em profundidade)", () => {
    const { container } = render(<NotFoundPage />);
    const headerText = container.querySelector("header")?.textContent || "";
    expect(headerText).toMatch(/404/);
  });

  it("define document.title começando com '404'", async () => {
    render(<NotFoundPage />);
    await waitFor(() => {
      expect(document.title).toMatch(/^404/);
    });
  });

  it("injeta <meta name=\"robots\" content=\"noindex, ...\"> no head", async () => {
    render(<NotFoundPage />);
    await waitFor(() => {
      expect(getRobotsContent()).toMatch(/noindex/i);
    });
  });

  it("não marca a página como indexável (não emite 'index, follow')", async () => {
    render(<NotFoundPage />);
    await waitFor(() => {
      expect(getRobotsContent().toLowerCase()).not.toContain("index, follow");
    });
  });

  it("injeta <link rel=\"canonical\"> apontando para base + /404", async () => {
    // useSeo é chamado com canonicalPath: "/404" e o mock de site_settings
    // devolve seo_canonical_base = "https://lorenaalvesarq.com".
    // O canonical resultante DEVE ser exatamente "https://lorenaalvesarq.com/404"
    // — isso impede que o Google trate múltiplas URLs inexistentes como
    // duplicatas distintas (todas apontam para o mesmo canonical de 404).
    render(<NotFoundPage />);

    await waitFor(() => {
      expect(getCanonicalHref()).toBe("https://lorenaalvesarq.com/404");
    });
  });

  it("o canonical da 404 é absoluto (começa com a base https://) e termina em /404", async () => {
    // Teste mais frouxo, sobrevive a mudanças futuras do canonical_base.
    render(<NotFoundPage />);

    await waitFor(() => {
      const href = getCanonicalHref();
      expect(href).toMatch(/^https?:\/\//);
      expect(href.endsWith("/404")).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Open Graph + Twitter Cards
  //
  // Quando alguém compartilha uma URL inválida no WhatsApp / X / LinkedIn /
  // Facebook, o crawler dessas redes lê as meta tags `og:*` e `twitter:*` e
  // monta um preview. Se a 404 reaproveitar o OG genérico do site, o preview
  // mostra "Lorena Alves Arquitetura — Estúdio de arquitetura..." como se
  // fosse uma página real — confundindo o usuário.
  //
  // Estes testes garantem que:
  //  - og:title e twitter:title mencionam "404" (preview honesto)
  //  - og:description e twitter:description também sinalizam o erro
  //  - og:url aponta para o canonical /404 (consolida sinais)
  //  - og:type é "website" (não "article" — não há autor/data)
  //  - og:locale = pt_BR (público brasileiro)
  //  - meta robots permanece noindex (defesa em profundidade contra
  //    indexação acidental do preview da 404)
  // -------------------------------------------------------------------------
  describe("Open Graph + Twitter Cards refletem 404", () => {
    it("og:title menciona '404'", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        expect(getOgTitle()).toMatch(/404/);
      });
    });

    it("twitter:title menciona '404'", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        expect(getTwitterTitle()).toMatch(/404/);
      });
    });

    it("og:description sinaliza página inexistente (não usa o pitch genérico)", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        expect(getOgDescription().toLowerCase()).toMatch(
          /n[ãa]o existe|n[ãa]o encontrad|movida|inv[áa]lid/
        );
      });
    });

    it("twitter:description sinaliza página inexistente", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        expect(getTwitterDescription().toLowerCase()).toMatch(
          /n[ãa]o existe|n[ãa]o encontrad|movida|inv[áa]lid/
        );
      });
    });

    it("og:url aponta para o canonical da 404 (consolida sinais sociais)", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        expect(getOgUrl()).toBe("https://lorenaalvesarq.com/404");
      });
    });

    it("og:type é 'website' (não 'article' — 404 não tem autor/data)", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        expect(getOgType()).toBe("website");
      });
    });

    it("og:locale é pt_BR", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        expect(getOgLocale()).toBe("pt_BR");
      });
    });

    it("twitter:card é 'summary' ou 'summary_large_image' (válido)", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        expect(["summary", "summary_large_image"]).toContain(getTwitterCard());
      });
    });

    it("meta robots continua noindex mesmo com OG/Twitter presentes (defesa em profundidade)", async () => {
      // Garante que injetar OG/Twitter (que poderiam parecer "promover" a página)
      // não conflita com o sinal de noindex enviado a Google/Bing.
      render(<NotFoundPage />);
      await waitFor(() => {
        // Ambos presentes, mas robots = noindex.
        expect(getOgTitle()).not.toBe("");
        expect(getRobotsContent().toLowerCase()).toContain("noindex");
      });
    });
  });
});
