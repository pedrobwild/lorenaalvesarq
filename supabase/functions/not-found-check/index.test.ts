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

// ---------------------------------------------------------------------------
// Idempotência: chamadas repetidas ao mesmo path inexistente devem
// devolver exatamente o mesmo status/reason. Isso é o contrato que crawlers
// (Googlebot, Bingbot) esperam: se uma URL retornou 404 ontem, ela ainda
// retorna 404 hoje, com a mesma justificativa.
//
// NOTA: a edge function NÃO chama `public.log_404` — ela é só leitura.
// Quem persiste em `seo_404_log` é o cliente (src/lib/notFoundLog.ts) ao
// montar a NotFoundPage. Portanto este teste valida apenas a estabilidade
// da resposta da função, não efeitos colaterais no banco.
// ---------------------------------------------------------------------------
Deno.test("chamadas repetidas ao mesmo path 404 são idempotentes", async () => {
  const uniquePath = `/rota-idempotencia-${Date.now()}`;

  const r1 = await call(uniquePath);
  const body1 = await r1.json();
  assertEquals(r1.status, 404);
  assertEquals(body1.status, "not_found");
  assertEquals(body1.reason, "unknown_route");
  assertEquals(body1.path, uniquePath);

  const r2 = await call(uniquePath);
  const body2 = await r2.json();
  assertEquals(r2.status, 404, "segunda chamada também deve retornar 404");
  assertEquals(body2.status, body1.status);
  assertEquals(body2.reason, body1.reason);
  assertEquals(body2.path, body1.path);
});

// ---------------------------------------------------------------------------
// Contrato anti-redirect (sem 301/302 antes do 404).
//
// Por que isso importa
// --------------------
// O Googlebot trata cadeias de redirect ANTES de um 404 como sinal forte de
// soft-404 ou loop. Ex.: se `/rota-velha` devolvesse 301 → `/nova` → 404,
// o GSC marca a URL original como "Página com redirecionamento" mas perde
// o sinal explícito de "Não encontrada", o que atrasa a remoção do índice.
//
// A edge function `not-found-check` deve devolver o status 404 (ou 410)
// DIRETAMENTE, sem nenhum 3xx intermediário. Aqui validamos:
//   1. status NÃO está em 300-399
//   2. nenhum header `Location` foi enviado (Location só faz sentido em 3xx)
//   3. body.redirect_to não está populado (campo de futura redireção
//      sugerida não deve ser confundido com redirect HTTP real)
//
// Usamos `redirect: "manual"` no fetch (já configurado em `call()`) para
// que o cliente HTTP NÃO siga redirects automaticamente — caso contrário,
// um 301 → 404 apareceria como 404 final e o teste passaria por engano.
// ---------------------------------------------------------------------------
Deno.test("rota inexistente NÃO emite 3xx antes do 404 (sem cadeia de redirect)", async () => {
  const r = await call("/rota-inexistente-anti-redirect-test");

  // 1) Status terminal: nunca 3xx.
  assert(
    r.status < 300 || r.status >= 400,
    `status ${r.status} é 3xx — edge function NÃO deve redirecionar antes do 404`,
  );
  // 2) Status final esperado para path desconhecido.
  assertEquals(r.status, 404, `esperado 404 direto, recebido ${r.status}`);

  // 3) Nenhum header Location (só faz sentido em 3xx, mas alguns servidores
  //    enviam por engano em outras respostas — bloqueamos explicitamente).
  const location = r.headers.get("location");
  assertEquals(
    location,
    null,
    `header Location presente ("${location}") — 404 não deve ter Location`,
  );

  // 4) Body não promete redirect implícito.
  const body = await r.json();
  assertEquals(body.status, "not_found");
  assert(
    body.redirect_to == null || body.redirect_to === "",
    `body.redirect_to deve estar ausente em 404 puro, recebido "${body.redirect_to}"`,
  );
});

Deno.test("rota com slug dinâmico inválido também não passa por 3xx", async () => {
  // Mesmo contrato para /projeto/<slug-inexistente>: resposta direta 404,
  // sem 301 para listagem nem 302 para home.
  const r = await call("/projeto/slug-anti-redirect-xyz");
  assert(
    r.status < 300 || r.status >= 400,
    `status ${r.status} indica redirect intermediário — quebra contrato`,
  );
  assertEquals(r.status, 404);
  assertEquals(r.headers.get("location"), null);
  const body = await r.json();
  assertEquals(body.status, "not_found");
  assertEquals(body.reason, "dynamic_slug_not_found");
});

Deno.test("blog com slug inválido também não passa por 3xx", async () => {
  const r = await call("/blog/post-anti-redirect");
  assert(
    r.status < 300 || r.status >= 400,
    `status ${r.status} indica redirect intermediário — quebra contrato`,
  );
  assertEquals(r.status, 404);
  assertEquals(r.headers.get("location"), null);
  // Consome body para evitar leak detectado pelo Deno test runner.
  await r.text();
});

// ---------------------------------------------------------------------------
// Querystring (UTM/fbclid/gclid) em rota inexistente.
//
// Crawlers e campanhas de tráfego (Meta Ads, Google Ads, newsletters)
// podem anexar UTM a QUALQUER URL — inclusive a links quebrados publicados
// por terceiros. O contrato é: a querystring não pode mascarar o 404 nem
// alterar o `reason`. A função deve descartar a query, identificar a rota
// base como desconhecida e devolver exatamente o mesmo payload que devolveria
// sem a query.
// ---------------------------------------------------------------------------
Deno.test("rota inexistente com querystring UTM mantém 404 e mesmo reason", async () => {
  const basePath = "/rota-inexistente-com-utm-xyz";

  // Baseline: sem querystring.
  const rPlain = await call(basePath);
  const bodyPlain = await rPlain.json();
  assertEquals(rPlain.status, 404);
  assertEquals(bodyPlain.status, "not_found");
  assertEquals(bodyPlain.reason, "unknown_route");

  // Mesma rota com UTM completa + fbclid + gclid.
  const withQuery =
    `${basePath}?utm_source=instagram&utm_medium=story&utm_campaign=launch` +
    `&fbclid=IwAR123abc&gclid=Cj0KCQjw`;
  const rQuery = await call(withQuery);

  // Status e header continuam terminais (sem 3xx, sem Location).
  assert(
    rQuery.status < 300 || rQuery.status >= 400,
    `status ${rQuery.status} indica redirect — querystring não deve gerar 3xx`,
  );
  assertEquals(
    rQuery.status,
    404,
    `esperado 404 mesmo com UTM, recebido ${rQuery.status}`,
  );
  assertEquals(rQuery.headers.get("location"), null);

  // Reason e status do body idênticos ao baseline.
  const bodyQuery = await rQuery.json();
  assertEquals(bodyQuery.status, bodyPlain.status);
  assertEquals(
    bodyQuery.reason,
    bodyPlain.reason,
    `reason mudou com querystring: "${bodyPlain.reason}" → "${bodyQuery.reason}"`,
  );
  // Path normalizado deve descartar a query.
  assertEquals(bodyQuery.path, basePath);
});

Deno.test("rota canônica também devolve 200 direto (sem 3xx para normalizar)", async () => {
  // Confirma que mesmo URLs com trailing slash + querystring (que são
  // NORMALIZADAS pela função) devolvem 200 direto, em vez de 301 para a
  // versão canônica. A normalização é interna ao body — o status HTTP
  // permanece terminal.
  const r = await call("/portfolio/?utm_source=test");
  assert(
    r.status < 300 || r.status >= 400,
    `status ${r.status} indica redirect intermediário — normalização deve ser interna`,
  );
  assertEquals(r.status, 200);
  assertEquals(r.headers.get("location"), null);
  const body = await r.json();
  assertEquals(body.status, "ok");
  assertEquals(body.path, "/portfolio");
});
