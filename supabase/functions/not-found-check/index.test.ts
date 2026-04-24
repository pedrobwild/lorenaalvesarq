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

// ---------------------------------------------------------------------------
// Cobertura de TODAS as rotas canônicas públicas.
//
// Espelha a constante STATIC_ROUTES em index.ts e a lista de rotas públicas
// em src/lib/useHashRoute.ts. Se você adicionar uma nova página pública à
// SPA (ex.: /servicos, /contato), adicione o path AQUI e em STATIC_ROUTES
// na edge function. Caso contrário este teste falhará — o que é o
// comportamento desejado: quebra cedo, durante o build/CI, em vez de
// silenciosamente devolver 404 para crawlers em produção.
// ---------------------------------------------------------------------------
const CANONICAL_PUBLIC_ROUTES = [
  "/",
  "/sobre",
  "/portfolio",
  "/faq",
  "/privacidade",
  "/blog",
  "/blog/tags",
  "/404",
];

for (const route of CANONICAL_PUBLIC_ROUTES) {
  Deno.test(`rota canônica ${route} devolve HTTP 200`, async () => {
    const r = await call(route);
    const body = await r.json();
    assertEquals(
      r.status,
      200,
      `rota ${route} esperava 200, recebeu ${r.status} (body=${JSON.stringify(body)})`,
    );
    assertEquals(body.status, "ok");
    assertEquals(body.reason, "static_route");
  });
}

// ---------------------------------------------------------------------------
// Variantes de URL geradas automaticamente.
//
// Para CADA rota canônica (pública + admin) verificamos 3 variantes:
//   1. trailing slash         → /portfolio/
//   2. querystring simples    → /portfolio?utm_source=instagram
//   3. querystring composta   → /portfolio/?utm_source=ig&utm_medium=story
//
// Crawlers, redes sociais e gestores de tráfego (Meta Ads, Google Ads,
// Mailchimp) frequentemente acrescentam UTM, fbclid e gclid. Se qualquer
// dessas variantes vazasse 404, perderíamos sinal de SEO e atribuição.
// O teste falha individualmente por variante, deixando claro qual
// combinação quebrou.
// ---------------------------------------------------------------------------

const CANONICAL_ADMIN_ROUTES = [
  "/admin",
  "/admin/login",
];

/** Gera as variantes para um path base (sem trailing slash, sem query). */
function variantsFor(base: string): Array<{ raw: string; expectedPath: string }> {
  const out: Array<{ raw: string; expectedPath: string }> = [];
  // Querystring simples — sempre aplicável, inclusive na raiz "/".
  out.push({
    raw: `${base}?utm_source=instagram`,
    expectedPath: base,
  });
  // Trailing slash + querystring composta — só faz sentido se base !== "/".
  if (base !== "/") {
    out.push({ raw: `${base}/`, expectedPath: base });
    out.push({
      raw: `${base}/?utm_source=ig&utm_medium=story&fbclid=xyz123`,
      expectedPath: base,
    });
  } else {
    // Para a raiz, ainda vale testar querystring composta sem trailing slash.
    out.push({
      raw: `/?utm_source=ig&utm_medium=story&fbclid=xyz123`,
      expectedPath: "/",
    });
  }
  return out;
}

// ---- Públicas: devem responder 200 com reason="static_route".
for (const base of CANONICAL_PUBLIC_ROUTES) {
  for (const { raw, expectedPath } of variantsFor(base)) {
    Deno.test(
      `variante pública "${raw}" → 200 normalizada para ${expectedPath}`,
      async () => {
        const r = await call(raw);
        const body = await r.json();
        assertEquals(
          r.status,
          200,
          `variante ${raw} esperava 200, recebeu ${r.status} ` +
            `(body=${JSON.stringify(body)})`,
        );
        assertEquals(body.path, expectedPath);
        assertEquals(body.status, "ok");
        assertEquals(body.reason, "static_route");
      },
    );
  }
}

// ---- Admin: devem responder 200 com reason="admin_route".
for (const base of CANONICAL_ADMIN_ROUTES) {
  for (const { raw, expectedPath } of variantsFor(base)) {
    Deno.test(
      `variante admin "${raw}" → 200 normalizada para ${expectedPath}`,
      async () => {
        const r = await call(raw);
        const body = await r.json();
        assertEquals(
          r.status,
          200,
          `variante ${raw} esperava 200, recebeu ${r.status} ` +
            `(body=${JSON.stringify(body)})`,
        );
        assertEquals(body.path, expectedPath);
        assertEquals(body.status, "ok");
        assertEquals(body.reason, "admin_route");
      },
    );
  }
}

// Testes pontuais antigos (mantidos como sanity check explícito por nome).
Deno.test("rota /admin devolve HTTP 200 com reason admin_route", async () => {
  const r = await call("/admin");
  const body = await r.json();
  assertEquals(r.status, 200);
  assertEquals(body.reason, "admin_route");
});

Deno.test("subrota /admin/login devolve HTTP 200 com reason admin_route", async () => {
  const r = await call("/admin/login");
  const body = await r.json();
  assertEquals(r.status, 200);
  assertEquals(body.reason, "admin_route");
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
