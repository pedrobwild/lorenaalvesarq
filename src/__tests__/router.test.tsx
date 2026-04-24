/**
 * Smoke test do roteador.
 *
 * Valida que o roteador (renderRoute em src/router.tsx) realmente MONTA o
 * componente NotFoundPage quando recebe uma rota que não existe — não
 * apenas o importa.
 *
 * Por que isso importa: um refactor inocente (ex.: remover o `return
 * <NotFoundPage />` final, ou mover a regra para cima de outra que sempre
 * casa) faria o roteador renderizar a tela errada para URLs inválidas,
 * potencialmente devolvendo a home com status 200 — o pior cenário de SEO
 * (soft-404 garantido). Este teste quebra na hora.
 *
 * Cobertura:
 *  1. `Route { name: "not-found" }` → monta NotFoundPage.
 *  2. Rota desconhecida (forçada via cast) → cai no fallback final e
 *     também monta NotFoundPage. Isso prova que QUALQUER nome novo
 *     adicionado ao tipo Route sem entrada explícita em renderRoute
 *     ainda terá comportamento seguro (404 dedicada, noindex).
 *  3. O elemento renderizado expõe `data-testid="not-found-h1"` —
 *     o mesmo seletor usado em NotFoundPage.test.tsx, garantindo
 *     consistência entre teste de unidade e teste de roteamento.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";

// ---- Mocks de infra: evita chamadas reais ao Supabase / settings remotos.
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

// O roteador importa muitos módulos pesados (App, GSAP, Lenis) só para a
// home. Stub do App evita custo de inicialização e isola a verificação
// de roteamento — o que importa aqui é o despacho, não a renderização
// completa de todas as rotas.
vi.mock("@/App", () => ({
  default: () => null,
}));

import type { Route } from "@/lib/useHashRoute";
import { renderRoute } from "@/router";
import { expectMetaContainsNoIndex, resetHead } from "@/test/seoHelpers";

beforeEach(() => {
  resetHead();
  window.history.replaceState({}, "", "/rota-que-nao-existe-smoke");
});

afterEach(() => {
  cleanup();
});

describe("roteador — smoke test do fallback 404", () => {
  it("renderRoute({ name: 'not-found' }) monta NotFoundPage", async () => {
    const { getByTestId } = render(<>{renderRoute({ name: "not-found" })}</>);
    await waitFor(() => {
      const h1 = getByTestId("not-found-h1");
      expect(h1.tagName).toBe("H1");
      expect(h1.textContent || "").toMatch(/404/);
    });
  });

  it("rota com `name` desconhecido cai no fallback e monta NotFoundPage", async () => {
    // Força um Route inválido para simular o cenário em que alguém adiciona
    // um novo nome ao tipo Route mas esquece de tratá-lo em renderRoute.
    const fakeRoute = { name: "rota-fantasma-do-futuro" } as unknown as Route;
    const { getByTestId } = render(<>{renderRoute(fakeRoute)}</>);
    await waitFor(() => {
      const h1 = getByTestId("not-found-h1");
      expect(h1.tagName).toBe("H1");
      expect(h1.textContent || "").toMatch(/404/);
    });
  });

  it("a NotFoundPage montada pelo roteador injeta meta robots noindex", async () => {
    render(<>{renderRoute({ name: "not-found" })}</>);
    await waitFor(() => {
      expectMetaContainsNoIndex();
    });
  });
});
