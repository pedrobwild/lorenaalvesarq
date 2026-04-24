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
});
