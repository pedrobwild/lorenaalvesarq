import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import NotFoundPage from "../NotFoundPage";

/**
 * Testes de regressão para a página 404.
 *
 * Esses testes existem para impedir que o site volte a gerar "soft-404" no
 * Google Search Console em mudanças futuras. Validam três contratos críticos:
 *
 *  1. A página renderiza um <h1> que começa com "404".
 *  2. O <title> do documento começa com "404".
 *  3. A meta robots fica em "noindex" (gerada por useSeo via prop noindex).
 *
 * Se qualquer um desses contratos quebrar, o `npm test` falha — e como o
 * script `build` roda os testes antes do `vite build`, o deploy também falha.
 */

// Mock do supabase client para não tentar abrir conexão real durante os testes.
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

// Mock do fetchSiteSettings para não buscar settings reais (useSeo).
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
  // sessionStorage limpo para que logNotFound não seja "engolido" entre testes.
  try {
    sessionStorage.clear();
  } catch {
    /* noop */
  }
  // Limpa head para um estado conhecido.
  document.head.innerHTML = "";
  document.title = "";
  // Garante que o pathname não seja "/" (NotFoundPage pula o log nesse caso).
  window.history.replaceState({}, "", "/rota-inexistente-test");
});

afterEach(() => {
  cleanup();
});

describe("NotFoundPage — proteção contra soft-404", () => {
  it("renderiza um <h1> que sinaliza explicitamente o erro 404", async () => {
    const { container } = render(<NotFoundPage />);

    const h1 = container.querySelector("h1");
    expect(h1).not.toBeNull();

    // Junta H1 + eyebrow para considerar tanto "Erro 404" no eyebrow
    // quanto "404" no título principal — ambos sinalizam a Googlebot.
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
});
