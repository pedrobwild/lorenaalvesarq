import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import NotFoundPage from "../NotFoundPage";
import { getCanonicalHref, resetHead } from "@/test/seoHelpers";

/**
 * Regressão: o canonical da 404 sobrevive a `seo_canonical_base` ausente.
 *
 * Por que isso importa
 * --------------------
 * `applySeo` em `src/lib/useSeo.ts` faz:
 *
 *   const base = (settings.seo_canonical_base || "https://lorenaalvesarq.com")
 *     .replace(/\/$/, "");
 *
 * Esse fallback existe porque `site_settings` é um registro único editado
 * pelo admin — se alguém limpar o campo (intencional ou acidentalmente)
 * o canonical NÃO pode virar `null/404` ou `undefined/404`. Se isso
 * acontecesse, o Google receberia uma URL canônica inválida e poderia
 * desindexar páginas válidas que apontam para essa base via hreflang.
 *
 * Estes testes "envenenam" o mock de `fetchSiteSettings` com cada
 * representação plausível de "ausente" (`null`, `undefined`, `""`)
 * e exigem que o canonical resultante continue sendo a URL absoluta
 * de produção (`https://lorenaalvesarq.com/404`).
 *
 * O teste roda parametrizado via `it.each` para deixar explícito no log
 * de CI qual variante quebrou.
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

// Mock mutável: cada `it.each` reconfigura `fetchSiteSettings` antes do render
// para devolver `seo_canonical_base` com o valor sob teste.
const fetchSiteSettingsMock = vi.fn();
vi.mock("@/lib/useSiteSettings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/useSiteSettings")>(
    "@/lib/useSiteSettings"
  );
  return {
    ...actual,
    fetchSiteSettings: (...args: unknown[]) => fetchSiteSettingsMock(...args),
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
  window.history.replaceState({}, "", "/rota-inexistente-canonical-fallback");
  fetchSiteSettingsMock.mockReset();
});

afterEach(() => {
  cleanup();
});

const FALLBACK_BASE = "https://lorenaalvesarq.com";
const EXPECTED_CANONICAL = `${FALLBACK_BASE}/404`;

describe("NotFoundPage — canonical sobrevive a seo_canonical_base ausente", () => {
  // Cada caso simula uma forma diferente de "ausente" que pode aparecer
  // em produção. `applySeo` aplica `?.trim() || fallback`, então cobre:
  //   - null / undefined (coluna nullable)
  //   - "" (string vazia)
  //   - "   " / "\t\n " (whitespace puro — usuário apertou espaço sem querer
  //     ou um import CSV preservou padding)
  // Em todos os casos o canonical da 404 DEVE ser a URL absoluta de produção.
  it.each([
    { label: "null", value: null as string | null },
    { label: "undefined", value: undefined as string | undefined },
    { label: "string vazia", value: "" },
    { label: "apenas espaços", value: "   " },
    { label: "tabs e quebra de linha", value: "\t\n  " },
  ])(
    "quando seo_canonical_base é $label, canonical cai no fallback de produção",
    async ({ value }) => {
      fetchSiteSettingsMock.mockResolvedValue({
        site_title: "Lorena Alves Arquitetura",
        site_description: "Estúdio de arquitetura em Uberlândia/MG",
        // Valor sob teste — pode ser null, undefined, vazio ou whitespace.
        seo_canonical_base: value as string | null | undefined,
        seo_robots: "index, follow",
      });

      render(<NotFoundPage />);

      await waitFor(() => {
        const href = getCanonicalHref();
        // Deve ser absoluto (jamais começar com "null", "undefined" ou "/").
        expect(
          href,
          `canonical inválido para seo_canonical_base=${JSON.stringify(value)}`
        ).toMatch(/^https?:\/\//);
        expect(href).not.toMatch(/^null/i);
        expect(href).not.toMatch(/^undefined/i);
        expect(href.endsWith("/404")).toBe(true);
        // Também garante que o canonical bate exatamente com o fallback
        // — protege contra bases tipo "   /" ou "\nhttps://..." que poderiam
        // sobreviver ao trim por descuido.
        expect(href).toBe(EXPECTED_CANONICAL);
      });
    }
  );

  it("quando seo_canonical_base é null, canonical é exatamente a URL de produção + /404", async () => {
    // Caso mais comum em produção (coluna nullable no Postgres devolve null).
    // Asserção estrita para travar o valor exato esperado pelo Search Console.
    fetchSiteSettingsMock.mockResolvedValue({
      site_title: "Lorena Alves Arquitetura",
      site_description: "Estúdio de arquitetura em Uberlândia/MG",
      seo_canonical_base: null,
      seo_robots: "index, follow",
    });

    render(<NotFoundPage />);

    await waitFor(() => {
      expect(getCanonicalHref()).toBe(EXPECTED_CANONICAL);
    });
  });

  it("quando settings vem completamente vazio (sem nenhum campo), canonical ainda é gerado", async () => {
    // Cenário extremo: site_settings ainda não foi populado no banco.
    // applySeo deve operar com defaults razoáveis em vez de quebrar.
    fetchSiteSettingsMock.mockResolvedValue({});

    render(<NotFoundPage />);

    await waitFor(() => {
      const href = getCanonicalHref();
      expect(href).toBe(EXPECTED_CANONICAL);
    });
  });

  it("quando seo_canonical_base tem barra final, ela é removida antes de concatenar /404", async () => {
    // Defesa contra duplicar a barra: "https://x.com/" + "/404" = "https://x.com//404".
    // O regex `.replace(/\/$/, "")` em useSeo.ts cuida disso — este teste
    // garante que a normalização não regrida.
    fetchSiteSettingsMock.mockResolvedValue({
      seo_canonical_base: "https://lorenaalvesarq.com/",
    });

    render(<NotFoundPage />);

    await waitFor(() => {
      expect(getCanonicalHref()).toBe(EXPECTED_CANONICAL);
      // Defesa explícita: não pode ter barra dupla em lugar nenhum
      // exceto a do protocolo.
      const withoutProtocol = getCanonicalHref().replace(/^https?:\/\//, "");
      expect(withoutProtocol).not.toMatch(/\/\//);
    });
  // ---------------------------------------------------------------------------
  // Upgrade obrigatório de http:// → https://
  //
  // Por que isso importa
  // --------------------
  // O domínio lorenaalvesarq.com serve HTTPS com HSTS. Se o canonical sair
  // como `http://...`, o Googlebot vai:
  //   1. Seguir o canonical e bater em http://
  //   2. Receber 301 do servidor para https://
  //   3. Marcar a URL como "Indexada, embora bloqueada por canônico
  //      alternativo" — efetivamente desperdiça crawl budget e atrasa
  //      reindexação.
  //
  // Pior: em alguns casos o GSC reporta "URL inválida — Indisponível
  // por causa de outro problema 4xx". Para a 404, isso amplifica o
  // problema de soft-404.
  //
  // useSeo aplica `.replace(/^http:\/\//i, "https://")` no `applySeo`,
  // promovendo qualquer http salvo no admin (intencional ou erro de
  // digitação). Estes testes blindam esse contrato.
  // ---------------------------------------------------------------------------
  describe("canonical sempre usa https:// (nunca http://)", () => {
    it.each([
      { label: "http minúsculo", value: "http://lorenaalvesarq.com" },
      { label: "HTTP maiúsculo", value: "HTTP://lorenaalvesarq.com" },
      { label: "http com barra final", value: "http://lorenaalvesarq.com/" },
      { label: "http em domínio alternativo", value: "http://www.lorenaalvesarq.com" },
    ])(
      "quando seo_canonical_base começa com $label, canonical é promovido para https://",
      async ({ value }) => {
        fetchSiteSettingsMock.mockResolvedValue({
          site_title: "Lorena Alves Arquitetura",
          seo_canonical_base: value,
          seo_robots: "index, follow",
        });

        render(<NotFoundPage />);

        await waitFor(() => {
          const href = getCanonicalHref();
          // Contrato principal: nunca http://.
          expect(href).toMatch(/^https:\/\//);
          expect(href).not.toMatch(/^http:\/\//i);
          // Continua sendo a 404 do domínio que o admin configurou
          // (apenas o protocolo foi promovido).
          expect(href.endsWith("/404")).toBe(true);
        });
      }
    );

    it("preserva https:// quando já está correto (não vira httpss:// ou similar)", async () => {
      // Defesa contra regressão: se alguém substituir o regex por algo
      // mais agressivo (ex.: replace("http", "https")), https vira httpss.
      fetchSiteSettingsMock.mockResolvedValue({
        seo_canonical_base: "https://lorenaalvesarq.com",
      });

      render(<NotFoundPage />);

      await waitFor(() => {
        const href = getCanonicalHref();
        expect(href).toBe(EXPECTED_CANONICAL);
        expect(href).not.toMatch(/httpss/i);
        expect(href).not.toMatch(/https:\/\/https/i);
      });
    });

    it("promove http→https mesmo combinando com barra final (normalização completa)", async () => {
      // Caso composto: protocolo errado E barra final. Os dois passos
      // de normalização devem operar em conjunto e produzir a URL canônica.
      fetchSiteSettingsMock.mockResolvedValue({
        seo_canonical_base: "http://lorenaalvesarq.com/",
      });

      render(<NotFoundPage />);

      await waitFor(() => {
        expect(getCanonicalHref()).toBe(EXPECTED_CANONICAL);
      });
    });
  });
});
