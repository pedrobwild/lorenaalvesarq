// Edge function `not-found-check`
//
// Objetivo: dar à SPA um endpoint **HTTP 404 real** que pode ser testado via
// fetch (e por crawlers, monitoramento, ou pelo Search Console quando queremos
// confirmar que uma URL antiga "morreu" de verdade).
//
// Comportamento:
//   GET /functions/v1/not-found-check?path=/alguma-rota
//
//   1. Normaliza o path (remove querystring, força barra inicial, recorta tamanho).
//   2. Confere contra a lista canônica de rotas conhecidas do site
//      (mesma fonte de verdade que `src/lib/useHashRoute.ts`):
//        - 200 OK   se for rota válida  (home, sobre, portfolio, faq,
//                   privacidade, blog, blog/tags, blog/<slug>, blog/tag/<slug>,
//                   projeto/<slug>, admin/*)
//        - 301      se houver redirect ativo em seo_404_log
//                   (header Location aponta para `redirect_to`)
//        - 404      caso contrário, com corpo JSON descrevendo o motivo
//
// Crítico: a função existe para garantir, via teste de integração automatizado,
// que rotas inexistentes recebem **status HTTP 404** — não apenas a tela 404
// renderizada via SPA fallback (que, por arquitetura da Lovable, sempre retorna
// 200 + index.html).
//
// `verify_jwt = false` — endpoint público, idempotente, somente leitura.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

/**
 * Versão lógica desta edge function. Incrementar manualmente a cada mudança
 * relevante de comportamento. Exposta no endpoint de health para facilitar
 * monitoramento externo (uptime checks, smoke tests pós-deploy, etc.).
 */
const FN_VERSION = "1.2.0";
/** Momento em que o worker atual subiu (cold start). */
const FN_BOOTED_AT = new Date().toISOString();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/**
 * Rotas estáticas conhecidas (espelha src/lib/useHashRoute.ts).
 *
 * IMPORTANTE: ao criar uma nova página pública (ex.: /servicos, /contato),
 * adicione o path AQUI também — caso contrário a edge function devolverá
 * 404 e o Search Console pode marcar a URL como "não encontrada" mesmo
 * que ela exista na SPA. O teste `index.test.ts` valida cada rota desta
 * lista individualmente para evitar regressões silenciosas.
 */
export const STATIC_ROUTES: ReadonlyArray<string> = [
  "/",
  "/sobre",
  "/portfolio",
  "/faq",
  "/privacidade",
  "/blog",
  "/blog/tags",
  "/404",
];

const STATIC_ROUTES_SET = new Set<string>(STATIC_ROUTES);

/** Prefixos dinâmicos cuja existência precisa ser checada no banco. */
const DYNAMIC_PREFIXES: Array<{ prefix: string; table: string; column: string }> = [
  { prefix: "/projeto/", table: "projects", column: "slug" },
  { prefix: "/blog/tag/", table: "blog_posts", column: "tags" }, // tratado abaixo (array)
  { prefix: "/blog/", table: "blog_posts", column: "slug" },
];

function normalizePath(raw: string | null): string {
  if (!raw) return "/";
  // remove querystring/hash
  let p = raw.split("?")[0].split("#")[0].trim();
  if (!p) return "/";
  if (!p.startsWith("/")) p = "/" + p;
  // remove barra final exceto raiz
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  // limita tamanho (mesmo limite usado em log_404)
  if (p.length > 500) p = p.slice(0, 500);
  return p;
}

/**
 * Validação de entrada do parâmetro `path`.
 *
 * Retorna `null` se o input é aceitável (mesmo que precise de normalização,
 * ex.: faltando `/` inicial). Retorna um objeto `{ reason }` quando o input
 * é claramente um erro do cliente — nesses casos respondemos 400, em vez de
 * 200 ("/" implícito) ou 404 (path normalizado vazio), para que crawlers e
 * integrações detectem o bug em vez de receberem um sinal SEO errado.
 *
 * Casos rejeitados:
 *   - parâmetro `path` ausente da query (`searchParams.get` => null)
 *   - string vazia ou só whitespace (cliente esqueceu de preencher)
 *   - contém NULL byte ou caracteres de controle (provável injeção/lixo)
 *   - excede 2000 chars (limite generoso; > que isso é abuso)
 */
function validatePathParam(raw: string | null): { reason: string } | null {
  if (raw === null) return { reason: "path_param_missing" };
  if (raw.trim() === "") return { reason: "path_param_empty" };
  if (raw.length > 2000) return { reason: "path_param_too_long" };
  // \u0000-\u001F e \u007F são caracteres de controle ASCII; nunca aparecem
  // em URLs legítimas e travam parsers downstream.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(raw)) {
    return { reason: "path_param_invalid_chars" };
  }
  return null;
}

function jsonResponse(status: number, body: Record<string, unknown>, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse(405, { error: "method_not_allowed", allowed: ["GET"] });
  }

  const url = new URL(req.url);

  // Health check: ?health=1 ou path terminando em /health.
  // Sempre 200, sem tocar no banco — usado por monitoramento e por testes
  // de disponibilidade para confirmar que o worker está vivo.
  const isHealth =
    url.searchParams.get("health") === "1" ||
    url.pathname.endsWith("/health");
  if (isHealth) {
    return jsonResponse(200, {
      status: "ok",
      service: "not-found-check",
      version: FN_VERSION,
      booted_at: FN_BOOTED_AT,
      now: new Date().toISOString(),
    });
  }

  const rawPathParam = url.searchParams.get("path");
  const validationError = validatePathParam(rawPathParam);
  if (validationError) {
    return jsonResponse(400, {
      status: "bad_request",
      reason: validationError.reason,
    });
  }
  const path = normalizePath(rawPathParam);

  // 1) Bloco admin: tratamos como 200 (existe), mas não indexável.
  if (path === "/admin" || path.startsWith("/admin/")) {
    return jsonResponse(200, { path, status: "ok", reason: "admin_route" });
  }

  // 2) Rota estática conhecida.
  if (STATIC_ROUTES_SET.has(path)) {
    return jsonResponse(200, { path, status: "ok", reason: "static_route" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    // Sem credenciais não conseguimos validar dinâmicas — falha fechada (404).
    return jsonResponse(404, {
      path,
      status: "not_found",
      reason: "supabase_unavailable",
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // 3) Redirect ativo em seo_404_log? -> 301 com Location.
  try {
    const { data: redirectRow } = await supabase
      .from("seo_404_log")
      .select("redirect_to, status")
      .eq("path", path)
      .eq("status", "redirect")
      .maybeSingle();

    if (redirectRow?.redirect_to) {
      const target = redirectRow.redirect_to;
      return new Response(
        JSON.stringify({ path, status: "redirect", target }),
        {
          status: 301,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
            Location: target,
            "Cache-Control": "no-store",
          },
        }
      );
    }
  } catch {
    /* ignora erros de leitura, segue para checagem dinâmica */
  }

  // 4) Rotas dinâmicas (projeto/<slug>, blog/<slug>, blog/tag/<slug>).
  for (const cfg of DYNAMIC_PREFIXES) {
    if (!path.startsWith(cfg.prefix)) continue;
    const slug = path.slice(cfg.prefix.length);
    if (!slug || slug.includes("/")) {
      // segmento vazio ou path mais profundo => não existe
      return jsonResponse(404, {
        path,
        status: "not_found",
        reason: "invalid_dynamic_segment",
      });
    }

    try {
      if (cfg.prefix === "/projeto/") {
        const { data } = await supabase
          .from("projects")
          .select("slug")
          .eq("slug", slug)
          .eq("visible", true)
          .maybeSingle();
        if (data) return jsonResponse(200, { path, status: "ok", reason: "project_found" });
      } else if (cfg.prefix === "/blog/") {
        const { data } = await supabase
          .from("blog_posts")
          .select("slug")
          .eq("slug", slug)
          .eq("visible", true)
          .maybeSingle();
        if (data) return jsonResponse(200, { path, status: "ok", reason: "post_found" });
      } else if (cfg.prefix === "/blog/tag/") {
        // tag existe se algum post visível tiver o slug entre suas tags.
        // Como tags são strings livres, fazemos um contains liberal.
        const { data } = await supabase
          .from("blog_posts")
          .select("slug")
          .contains("tags", [slug])
          .eq("visible", true)
          .limit(1);
        if (data && data.length > 0) {
          return jsonResponse(200, { path, status: "ok", reason: "tag_found" });
        }
      }
    } catch {
      /* falha fechada -> 404 */
    }

    return jsonResponse(404, {
      path,
      status: "not_found",
      reason: "dynamic_slug_not_found",
    });
  }

  // 5) Nada bateu -> 404.
  return jsonResponse(404, {
    path,
    status: "not_found",
    reason: "unknown_route",
  });
});
