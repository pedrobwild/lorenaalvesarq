/**
 * Teste de paridade de rotas — roda no `vitest` (CI/build).
 *
 * Garante que toda rota pública estática declarada em
 * `src/lib/useHashRoute.ts` também esteja registrada em `STATIC_ROUTES`
 * dentro de `supabase/functions/not-found-check/index.ts`.
 *
 * Sem essa paridade, criar uma página nova na SPA sem registrar na
 * edge function faria crawlers receberem **HTTP 404 indevido** —
 * exatamente o tipo de regressão silenciosa que esse teste previne.
 *
 * Implementação: delega para o script standalone
 * `scripts/check-routes-parity.mjs` para manter uma única fonte de
 * verdade da lógica de comparação.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const SCRIPT = resolve(process.cwd(), "scripts/check-routes-parity.mjs");

describe("paridade de rotas SPA ↔ edge function", () => {
  it("STATIC_ROUTES da edge cobre todas as rotas públicas da SPA", () => {
    let stdout = "";
    let exitCode = 0;
    try {
      stdout = execFileSync("node", [SCRIPT], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      const e = err as NodeJS.ErrnoException & {
        status?: number;
        stdout?: Buffer | string;
        stderr?: Buffer | string;
      };
      exitCode = e.status ?? 1;
      stdout = String(e.stdout ?? "") + String(e.stderr ?? "");
    }

    expect(
      exitCode,
      `Divergência detectada entre rotas da SPA e STATIC_ROUTES.\n` +
        `Saída do script:\n${stdout}`,
    ).toBe(0);
  });
});
