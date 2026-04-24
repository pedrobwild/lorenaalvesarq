import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import NotFoundPage from "../NotFoundPage";

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
  document.head.innerHTML = "";
  document.title = "";
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
      const robots = document.head.querySelector<HTMLMetaElement>(
        'meta[name="robots"]'
      );
      expect(robots).not.toBeNull();
      expect(robots!.getAttribute("content")).toMatch(/noindex/i);
    });
  });

  it("não marca a página como indexável (não emite 'index, follow')", async () => {
    render(<NotFoundPage />);
    await waitFor(() => {
      const robots = document.head.querySelector<HTMLMetaElement>(
        'meta[name="robots"]'
      );
      const content = robots?.getAttribute("content") || "";
      expect(content.toLowerCase()).not.toContain("index, follow");
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
      const canonical = document.head.querySelector<HTMLLinkElement>(
        'link[rel="canonical"]'
      );
      expect(canonical).not.toBeNull();
      expect(canonical!.getAttribute("href")).toBe(
        "https://lorenaalvesarq.com/404"
      );
    });
  });

  it("o canonical da 404 é absoluto (começa com a base https://) e termina em /404", async () => {
    // Teste mais frouxo, sobrevive a mudanças futuras do canonical_base.
    render(<NotFoundPage />);

    await waitFor(() => {
      const href =
        document.head
          .querySelector<HTMLLinkElement>('link[rel="canonical"]')
          ?.getAttribute("href") || "";
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
    const getMetaContent = (selector: string): string =>
      document.head
        .querySelector<HTMLMetaElement>(selector)
        ?.getAttribute("content") || "";

    it("og:title menciona '404'", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        const v = getMetaContent('meta[property="og:title"]');
        expect(v).toMatch(/404/);
      });
    });

    it("twitter:title menciona '404'", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        const v = getMetaContent('meta[name="twitter:title"]');
        expect(v).toMatch(/404/);
      });
    });

    it("og:description sinaliza página inexistente (não usa o pitch genérico)", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        const v = getMetaContent('meta[property="og:description"]').toLowerCase();
        // Aceita qualquer texto que indique erro — robusto a reescritas de copy.
        expect(v).toMatch(/n[ãa]o existe|n[ãa]o encontrad|movida|inv[áa]lid/);
      });
    });

    it("twitter:description sinaliza página inexistente", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        const v = getMetaContent('meta[name="twitter:description"]').toLowerCase();
        expect(v).toMatch(/n[ãa]o existe|n[ãa]o encontrad|movida|inv[áa]lid/);
      });
    });

    it("og:url aponta para o canonical da 404 (consolida sinais sociais)", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        const v = getMetaContent('meta[property="og:url"]');
        expect(v).toBe("https://lorenaalvesarq.com/404");
      });
    });

    it("og:type é 'website' (não 'article' — 404 não tem autor/data)", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        const v = getMetaContent('meta[property="og:type"]');
        expect(v).toBe("website");
      });
    });

    it("og:locale é pt_BR", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        const v = getMetaContent('meta[property="og:locale"]');
        expect(v).toBe("pt_BR");
      });
    });

    it("twitter:card é 'summary' ou 'summary_large_image' (válido)", async () => {
      render(<NotFoundPage />);
      await waitFor(() => {
        const v = getMetaContent('meta[name="twitter:card"]');
        expect(["summary", "summary_large_image"]).toContain(v);
      });
    });

    it("meta robots continua noindex mesmo com OG/Twitter presentes (defesa em profundidade)", async () => {
      // Garante que injetar OG/Twitter (que poderiam parecer "promover" a página)
      // não conflita com o sinal de noindex enviado a Google/Bing.
      render(<NotFoundPage />);
      await waitFor(() => {
        const robots = getMetaContent('meta[name="robots"]').toLowerCase();
        const ogTitle = getMetaContent('meta[property="og:title"]');
        // Ambos presentes, mas robots = noindex.
        expect(ogTitle).not.toBe("");
        expect(robots).toContain("noindex");
      });
    });
  });
});
