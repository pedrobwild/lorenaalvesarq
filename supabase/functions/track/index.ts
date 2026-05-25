// Edge function /track — ingestao de analytics_events.
//
// Substitui as escritas diretas em /rest/v1/analytics_events que o client
// fazia ate aqui. Vantagens:
//  - service_role escreve direto na tabela (a policy "public insert analytics"
//    pode ser removida, fechando a porta para abuso via PostgREST).
//  - Captura client_ip (x-forwarded-for) e country (cf-ipcountry) no servidor,
//    em vez de confiar em headers que o browser nao consegue setar.
//  - Filtra bots pelo user-agent antes do INSERT.
//  - Valida event_type contra allowlist sincronizada com src/lib/analytics.ts.
//  - Rate-limit em memoria (60s / 120 eventos por IP). Estado perde no
//    cold-start, mas isso e um efeito colateral aceitavel: o atacante teria
//    que sincronizar com restarts pra escapar.
//
// verify_jwt esta DESLIGADO de proposito: tracking e anonimo. A seguranca
// vem da allowlist + bot-filter + rate-limit + sanitizacao de payload.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Access-Control-Max-Age": "86400",
};

// Mantenha em sincronia com EventType em src/lib/analytics.ts
const ALLOWED_EVENT_TYPES = new Set<string>([
  "pageview",
  "project_view",
  "portfolio_view",
  "blog_index_view",
  "blog_post_view",
  "blog_tags_view",
  "blog_tag_view",
  "blog_tag_click",
  "blog_related_click",
  "click_contact",
  "click_whatsapp",
  "click_instagram",
  "click_cta",
  "outbound_click",
  "scroll_depth",
  "form_submit",
  "engagement_time",
]);

const BOT_RE =
  /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|preview|monitor|axios|curl|wget|python-requests|headlesschrome|phantomjs|lighthouse|pagespeed|gtmetrix/i;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;
const ipBuckets = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip) ?? [];
  const fresh = bucket.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (fresh.length >= RATE_LIMIT_MAX) {
    ipBuckets.set(ip, fresh);
    return true;
  }
  fresh.push(now);
  ipBuckets.set(ip, fresh);
  // GC barato: se o mapa cresce demais, dropa entries cujo ultimo evento
  // ja saiu da janela. Evita leak em runtime de longa duracao.
  if (ipBuckets.size > 5000) {
    for (const [k, v] of ipBuckets) {
      const last = v[v.length - 1] ?? 0;
      if (now - last > RATE_LIMIT_WINDOW_MS) ipBuckets.delete(k);
    }
  }
  return false;
}

function extractClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function extractCountry(req: Request): string | null {
  return (
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-country") ||
    req.headers.get("x-vercel-ip-country") ||
    null
  );
}

type StringOrNull = string | null;
function str(v: unknown): StringOrNull {
  return typeof v === "string" && v.length > 0 ? v.slice(0, 1024) : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  const ip = extractClientIp(req);
  if (isRateLimited(ip)) {
    return new Response("rate limited", { status: 429, headers: corsHeaders });
  }

  let body: Record<string, unknown>;
  try {
    // Aceita JSON tanto via application/json quanto via text/plain (sendBeacon
    // nao consegue setar Content-Type que dispara preflight, entao o client
    // envia como text/plain quando passa por beacon).
    const raw = await req.text();
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return new Response("invalid json", { status: 400, headers: corsHeaders });
  }

  const event_type = body.event_type;
  if (typeof event_type !== "string" || !ALLOWED_EVENT_TYPES.has(event_type)) {
    return new Response("invalid event_type", { status: 400, headers: corsHeaders });
  }

  const ua = req.headers.get("user-agent") || "";
  if (BOT_RE.test(ua)) {
    // 204 silencioso: nao queremos sinalizar ao bot que ele foi detectado.
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const row = {
    event_type,
    session_id: str(body.session_id),
    visitor_id: str(body.visitor_id),
    path: str(body.path),
    landing_path: str(body.landing_path),
    referrer: str(body.referrer),
    referrer_host: str(body.referrer_host),
    user_agent: ua ? ua.slice(0, 1024) : null,
    device: str(body.device),
    browser: str(body.browser),
    os: str(body.os),
    screen: str(body.screen),
    language: str(body.language),
    project_slug: str(body.project_slug),
    scroll_depth: num(body.scroll_depth),
    duration_ms: num(body.duration_ms),
    value: body.value ?? null,
    utm_source: str(body.utm_source),
    utm_medium: str(body.utm_medium),
    utm_campaign: str(body.utm_campaign),
    utm_term: str(body.utm_term),
    utm_content: str(body.utm_content),
    country: extractCountry(req) ?? str(body.country),
  };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { error } = await supabase.from("analytics_events").insert(row);
  if (error) {
    return new Response(`insert failed: ${error.message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(null, { status: 204, headers: corsHeaders });
});
