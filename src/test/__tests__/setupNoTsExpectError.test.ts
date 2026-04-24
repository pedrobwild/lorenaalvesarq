/**
 * Guard test — impede a regressão do erro de produção TS2578
 * ("Unused '@ts-expect-error' directive") em `src/test/setup.ts`.
 *
 * Contexto: o build de produção (`tsc -b && vite build`) falhou no
 * passado porque alguém adicionou `// @ts-expect-error` em mocks que,
 * após o tipo ficar correto, deixaram a diretiva órfã. O fix usa
 * `as unknown as { ... }` em vez de suprimir o type-check.
 *
 * Esta verificação roda no Vitest (CI) e bloqueia a reintrodução
 * de qualquer `@ts-expect-error` ou `@ts-ignore` no arquivo de setup.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SETUP_FILE = resolve(process.cwd(), "src/test/setup.ts");

describe("src/test/setup.ts — diretivas TS proibidas", () => {
  it("não contém @ts-expect-error nem @ts-ignore", () => {
    const src = readFileSync(SETUP_FILE, "utf8");

    // Casa qualquer ocorrência em comentários de linha ou bloco,
    // independente de espaços antes da diretiva.
    const forbidden = /@ts-(expect-error|ignore)\b/;
    const match = src.match(forbidden);

    expect(
      match,
      [
        `Encontrei "${match?.[0]}" em src/test/setup.ts.`,
        "",
        "Não use @ts-expect-error / @ts-ignore neste arquivo:",
        " - Se a diretiva ficar 'sem efeito' (tipo já bate), o build de",
        "   produção falha com TS2578 e o pipeline quebra.",
        " - Prefira `as unknown as { ... }` para tipar mocks de globais",
        "   (window.IntersectionObserver, etc.).",
      ].join("\n"),
    ).toBeNull();
  });
});
