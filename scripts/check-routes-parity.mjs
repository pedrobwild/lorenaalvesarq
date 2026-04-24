#!/usr/bin/env node
/**
 * check-routes-parity.mjs
 *
 * Verifica que as rotas públicas estáticas declaradas em
 *   - src/lib/useHashRoute.ts (fonte de verdade da SPA)
 *   - supabase/functions/not-found-check/index.ts (STATIC_ROUTES)
 * estão em paridade.
 *
 * Se a SPA tiver uma rota pública que a edge function não conhece,
 * crawlers receberão **404 indevido** para essa URL e o Search Console
 * vai marcá-la como "não encontrada". Esse script falha o build/CI
 * antes que isso aconteça.
 *
 * Saída:
 *   - exit 0 quando ambas listas batem
 *   - exit 1 + diff legível caso contrário
 *
 * Uso:
 *   node scripts/check-routes-parity.mjs
 *
 * Integrado ao npm script `routes:check` e ao build (`prebuild`).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const HASH_ROUTE_FILE = resolve(ROOT, "src/lib/useHashRoute.ts");
const EDGE_FN_FILE = resolve(
  ROOT,
  "supabase/functions/not-found-check/index.ts",
);

/**
 * Rotas públicas que existem na SPA, mas NÃO devem entrar em STATIC_ROUTES
 * da edge function — porque já são tratadas por outras regras (ex.: prefixo
 * /admin/* devolve 200 com reason="admin_route", e dinâmicas como
 * /projeto/<slug> são checadas via banco).
 *
 * Tudo que NÃO estiver nesta lista de exceções precisa estar em ambos os
 * arquivos, ou o script falha.
 */
const SPA_ONLY_ALLOWED = new Set([
  // Bloco admin: tratado como reason="admin_route" via prefixo /admin/*.
  "/admin",
  "/admin/login",
  "/admin/analytics",
  "/admin/seo",
  "/admin/seo/404",
  "/admin/settings",
  "/admin/projects",
  "/admin/projects/new",
  "/admin/faq",
  "/admin/blog",
  "/admin/blog/new",
]);

/** Rotas que existem na edge function mas não na SPA por design. */
const EDGE_ONLY_ALLOWED = new Set([
  // /404 é a URL canônica para a tela not-found; renderizada como rota
  // catch-all na SPA, sem entrada explícita em useHashRoute.ts.
  "/404",
]);

/**
 * Extrai todos os literais de string que começam com "/" das comparações
 * `path === "/algo"` em useHashRoute.ts. Cobre exatamente as rotas
 * estáticas — ignora dinâmicas (que usam regex .match()).
 */
function extractSpaStaticRoutes(src) {
  const routes = new Set();
  // path === "/algo" ou path === "/algo/sub"
  const re = /path\s*===\s*"(\/[A-Za-z0-9/_-]*)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    routes.add(m[1]);
  }
  // Casos especiais: home pode aparecer como `path === "/" || path === ""`
  if (src.includes('return { name: "home" }')) routes.add("/");
  return routes;
}

/**
 * Extrai os elementos do array `STATIC_ROUTES = [ ... ]` na edge function.
 */
function extractEdgeStaticRoutes(src) {
  const routes = new Set();
  const block = src.match(/STATIC_ROUTES[^=]*=\s*\[([^\]]+)\]/);
  if (!block) {
    throw new Error(
      "Não encontrei o array STATIC_ROUTES em " +
        "supabase/functions/not-found-check/index.ts",
    );
  }
  const re = /"(\/[A-Za-z0-9/_-]*)"/g;
  let m;
  while ((m = re.exec(block[1])) !== null) {
    routes.add(m[1]);
  }
  return routes;
}

function diff(a, b) {
  return [...a].filter((x) => !b.has(x)).sort();
}

const hashSrc = readFileSync(HASH_ROUTE_FILE, "utf8");
const edgeSrc = readFileSync(EDGE_FN_FILE, "utf8");

const spaRoutes = extractSpaStaticRoutes(hashSrc);
const edgeRoutes = extractEdgeStaticRoutes(edgeSrc);

// Rotas da SPA que deveriam estar na edge (excluindo exceções permitidas).
const missingInEdge = diff(spaRoutes, edgeRoutes).filter(
  (r) => !SPA_ONLY_ALLOWED.has(r),
);
// Rotas da edge que não existem na SPA (excluindo exceções permitidas).
const missingInSpa = diff(edgeRoutes, spaRoutes).filter(
  (r) => !EDGE_ONLY_ALLOWED.has(r),
);

const okPrefix = "\x1b[32m✓\x1b[0m";
const errPrefix = "\x1b[31m✗\x1b[0m";

console.log("");
console.log("Verificação de paridade de rotas (SPA ↔ edge function)");
console.log("─".repeat(60));
console.log(`SPA  (useHashRoute.ts)           : ${spaRoutes.size} rotas estáticas`);
console.log(`Edge (not-found-check STATIC_*)  : ${edgeRoutes.size} rotas`);
console.log("");

if (missingInEdge.length === 0 && missingInSpa.length === 0) {
  console.log(`${okPrefix} Tudo em paridade. Nenhuma divergência detectada.`);
  process.exit(0);
}

if (missingInEdge.length > 0) {
  console.log(
    `${errPrefix} Rotas presentes na SPA mas AUSENTES em STATIC_ROUTES ` +
      `da edge function:`,
  );
  for (const r of missingInEdge) console.log(`    - ${r}`);
  console.log("");
  console.log(
    "  → Adicione estes paths em " +
      "supabase/functions/not-found-check/index.ts (constante STATIC_ROUTES).",
  );
  console.log("");
}

if (missingInSpa.length > 0) {
  console.log(
    `${errPrefix} Rotas em STATIC_ROUTES da edge function que NÃO existem ` +
      `na SPA:`,
  );
  for (const r of missingInSpa) console.log(`    - ${r}`);
  console.log("");
  console.log(
    "  → Remova de supabase/functions/not-found-check/index.ts ou " +
      "adicione a página na SPA (src/lib/useHashRoute.ts).",
  );
  console.log("");
}

process.exit(1);
