// Teste de integração da edge function `not-found-check`.
//
// Diferente dos testes unitários do front (que validam apenas a renderização
// da NotFoundPage), este teste faz **fetch HTTP real** contra a função
// deployada e verifica que rotas inexistentes recebem **status HTTP 404**.
//
// É exatamente o sinal que o Googlebot precisa para classificar a URL como
// "Não encontrada" em vez de "soft-404".
//
// Como rodar: invocado via supabase--test_edge_functions ou:
//   deno test --allow-net --allow-env supabase/functions/not-found-check/index.test.ts

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("VITE_SUPABASE_URL") ||
  Deno.env.get("SUPABASE_URL") ||
  "";
const SUPABASE_ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ||
  Deno.env.get("SUPABASE_ANON_KEY") ||
  "";

const FN_URL = `${SUPABASE_URL}/functions/v1/not-found-check`;

function call(path: string) {
  const u = new URL(FN_URL);
  u.searchParams.set("path", path);
  return fetch(u.toString(), {
    method: "GET",
    redirect: "manual", // não seguir 301 — queremos validar o status
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
}

Deno.test("rota inexistente devolve HTTP 404", async () => {
  const r = await call("/rota-que-nao-existe-12345");
  const body = await r.json();
  assertEquals(r.status, 404, `esperado 404, recebido ${r.status}`);
  assertEquals(body.status, "not_found");
  assertEquals(body.reason, "unknown_route");
});

Deno.test("rota com slug dinâmico inválido devolve HTTP 404", async () => {
  const r = await call("/projeto/slug-inexistente-xyz");
  const body = await r.json();
  assertEquals(r.status, 404);
  assertEquals(body.status, "not_found");
  assertEquals(body.reason, "dynamic_slug_not_found");
});

Deno.test("blog com slug inválido devolve HTTP 404", async () => {
  const r = await call("/blog/post-que-nao-existe");
  const body = await r.json();
  assertEquals(r.status, 404);
  assertEquals(body.status, "not_found");
});

Deno.test("rota canônica conhecida devolve HTTP 200", async () => {
  const r = await call("/portfolio");
  const body = await r.json();
  assertEquals(r.status, 200);
  assertEquals(body.status, "ok");
});

Deno.test("home devolve HTTP 200", async () => {
  const r = await call("/");
  const body = await r.json();
  assertEquals(r.status, 200);
  assertEquals(body.status, "ok");
});

Deno.test("método POST devolve 405", async () => {
  const r = await fetch(`${FN_URL}?path=/qualquer`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  await r.text();
  assertEquals(r.status, 405);
});

Deno.test("response inclui X-Robots-Tag noindex", async () => {
  const r = await call("/rota-que-nao-existe-99999");
  await r.text();
  const robots = r.headers.get("x-robots-tag") || "";
  assert(
    robots.toLowerCase().includes("noindex"),
    `esperado X-Robots-Tag noindex, recebido "${robots}"`
  );
});

Deno.test("health check via ?health=1 devolve 200 com versão", async () => {
  const u = new URL(FN_URL);
  u.searchParams.set("health", "1");
  const r = await fetch(u.toString(), {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  const body = await r.json();
  assertEquals(r.status, 200);
  assertEquals(body.status, "ok");
  assertEquals(body.service, "not-found-check");
  assert(typeof body.version === "string" && body.version.length > 0,
    `esperado body.version string não vazia, recebido ${JSON.stringify(body.version)}`);
  assert(typeof body.booted_at === "string");
  assert(typeof body.now === "string");
});

Deno.test("health check via /health devolve 200", async () => {
  const r = await fetch(`${FN_URL}/health`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  const body = await r.json();
  assertEquals(r.status, 200);
  assertEquals(body.status, "ok");
  assertEquals(body.service, "not-found-check");
});
