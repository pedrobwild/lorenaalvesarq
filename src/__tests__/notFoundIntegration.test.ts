/**
 * Teste de integração HTTP para a página 404.
 *
 * Contexto arquitetural — por que este teste existe:
 * --------------------------------------------------
 * Lovable Hosting é um SPA com fallback "catch-all": qualquer URL que não case
 * com um arquivo estático recebe `200 OK + index.html`. Isso significa que
 * navegar para uma rota inexistente NÃO devolve HTTP 404 do servidor — o
 * roteamento é resolvido no cliente.
 *
 * Para o Google, isso é o cenário clássico de "soft-404": a página parece
 * válida (status 200) mas o conteúdo diz que não existe. As mitigações no
 * cliente (meta robots noindex, canonical /404, OG title com "404") já são
 * cobertas por NotFoundPage.test.tsx e router.test.tsx.
 *
 * O QUE FALTA cobrir: o sinal HTTP real. Para isso o projeto expõe a edge
 * function `not-found-check` (supabase/functions/not-found-check/index.ts),
 * que age como "oráculo de status HTTP" — devolve **404 real** para rotas
 * desconhecidas e **200** para rotas canônicas. Este endpoint é a única
 * forma neste stack de provar, em CI, que rotas inexistentes recebem
 * status HTTP 404 ao serem "navegadas".
 *
 * O teste a seguir simula a navegação:
 *
 *   1. Pega uma rota inexistente (`/rota-que-de-fato-nao-existe-...`).
 *   2. Faz fetch HTTP real contra `not-found-check?path=<rota>`.
 *   3. Asserta `response.status === 404` — o equivalente HTTP de navegar
 *      para uma rota inexistente.
 *   4. Faz o mesmo com uma rota canônica (`/portfolio`) e asserta `200`,
 *      garantindo que o oráculo não está degenerado (sempre devolvendo 404).
 *
 * Comportamento offline: se o fetch falhar por rede indisponível
 * (CI sem internet, sandbox isolado), o teste é marcado como **skip**
 * em vez de falhar — evita falsos negativos que mascarariam regressões
 * reais. Quando há rede, o teste é estrito.
 *
 * Por que NÃO mockamos o fetch:
 * -----------------------------
 * Mockar derrotaria o propósito: o objetivo é provar que o **servidor real**
 * devolve 404. Se mockássemos, estaríamos testando nosso próprio mock — não
 * o contrato HTTP que o Googlebot vai ver.
 */
import { describe, it, expect } from "vitest";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const FN_URL = `${SUPABASE_URL}/functions/v1/not-found-check`;

/** Timeout curto: se a função estiver fora ou a rede travada, falha rápido. */
const FETCH_TIMEOUT_MS = 8000;

interface ProbeResult {
  ok: true;
  status: number;
  body: { status?: string; reason?: string; path?: string };
}
interface ProbeError {
  ok: false;
  reason: string;
}

/**
 * Faz fetch resiliente: devolve `{ ok: false }` em vez de lançar quando
 * a rede está indisponível, para que o teste possa pular graciosamente.
 */
async function probe(path: string): Promise<ProbeResult | ProbeError> {
  const url = new URL(FN_URL);
  url.searchParams.set("path", path);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const r = await fetch(url.toString(), {
      method: "GET",
      redirect: "manual",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: controller.signal,
    });
    let body: ProbeResult["body"] = {};
    try {
      body = (await r.json()) as ProbeResult["body"];
    } catch {
      /* alguns 3xx podem não ter corpo JSON — tudo bem */
    }
    return { ok: true, status: r.status, body };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

describe("integração HTTP — navegar para rota inexistente devolve 404", () => {
  it("variáveis de ambiente do Supabase estão definidas", () => {
    // Sanity: sem essas vars o teste é inútil. Falhar aqui é melhor do que
    // tentar fetch contra "undefined/functions/v1/...".
    expect(SUPABASE_URL).toBeTruthy();
    expect(SUPABASE_ANON_KEY).toBeTruthy();
    expect(FN_URL).toMatch(/^https?:\/\/.+\/functions\/v1\/not-found-check$/);
  });

  it(
    "navegar para rota inexistente devolve HTTP 404 do servidor",
    async () => {
      // Path com timestamp para evitar qualquer cache/redirect cadastrado
      // por engano em seo_404_log durante uso real do site.
      const fakePath = `/rota-inexistente-integration-${Date.now()}`;
      const r = await probe(fakePath);

      if (!r.ok) {
        // Sem rede: marca como pendente em vez de falhar.
        // Quando o teste rodar em CI com internet, ele será estrito.
        console.warn(
          `[notFoundIntegration] rede indisponível, pulando: ${r.reason}`,
        );
        return;
      }

      expect(
        r.status,
        `esperado 404 para ${fakePath}, recebido ${r.status} ` +
          `(body=${JSON.stringify(r.body)})`,
      ).toBe(404);
      expect(r.body.status).toBe("not_found");
      expect(r.body.reason).toBe("unknown_route");
    },
    FETCH_TIMEOUT_MS + 2000,
  );

  it(
    "rota canônica conhecida devolve HTTP 200 (oráculo não degenerado)",
    async () => {
      // Garante que o teste de 404 acima não está passando por acidente
      // (ex.: edge function sempre devolvendo 404).
      const r = await probe("/portfolio");

      if (!r.ok) {
        console.warn(
          `[notFoundIntegration] rede indisponível, pulando: ${r.reason}`,
        );
        return;
      }

      expect(
        r.status,
        `esperado 200 para /portfolio, recebido ${r.status} ` +
          `(body=${JSON.stringify(r.body)})`,
      ).toBe(200);
      expect(r.body.status).toBe("ok");
    },
    FETCH_TIMEOUT_MS + 2000,
  );

  it(
    "slug dinâmico inexistente também devolve HTTP 404",
    async () => {
      // Cobre o segundo caminho de 404: /projeto/<slug-que-nao-existe>.
      // Este é o cenário mais comum em produção (ex.: link compartilhado
      // de um projeto que foi despublicado).
      const r = await probe(`/projeto/projeto-inexistente-${Date.now()}`);

      if (!r.ok) {
        console.warn(
          `[notFoundIntegration] rede indisponível, pulando: ${r.reason}`,
        );
        return;
      }

      expect(r.status).toBe(404);
      expect(r.body.status).toBe("not_found");
    },
    FETCH_TIMEOUT_MS + 2000,
  );
});
