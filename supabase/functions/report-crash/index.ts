// Edge function /report-crash — ingestao de crash_reports.
//
// Substitui as escritas diretas em /rest/v1/crash_reports que o client
// (src/lib/crashRecovery.ts) fazia via anon key. Segue o mesmo padrao da
// /track (analytics), pelos mesmos motivos:
//  - service_role escreve direto na tabela, entao o `grant insert` publico
//    e a policy "anon_insert_crash_reports with check (true)" podem ser
//    removidos, fechando a porta para abuso via PostgREST com a anon key.
//  - Rate-limit em memoria (60s / 30 reports por IP). Estado perde no
//    cold-start, mas isso e um efeito colateral aceitavel: o atacante teria
//    que sincronizar com restarts pra escapar.
//  - Filtra bots pelo user-agent antes do INSERT.
//  - Valida `kind` contra allowlist sincronizada com CrashKind em
//    src/lib/crashRecovery.ts.
//  - Trunca todos os campos textuais e rejeita `extra` (nao usado pelo
//    client) — evita inflacao de armazenamento com jsonb arbitrario.
//
// verify_jwt esta DESLIGADO de proposito: o crash pode acontecer antes de
// qualquer sessao existir. A seguranca vem da allowlist + bot-filter +
// rate-limit + sanitizacao/limite de tamanho do payload.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Access-Control-Max-Age": "86400",
};

// Mantenha em sincronia com CrashKind em src/lib/crashRecovery.ts
const ALLOWED_KINDS = new Set<string>([
  "react-error-boundary",
  "window-error",
  "unhandled-rejection",
  "blank-screen",
]);

const BOT_RE =
  /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|preview|monitor|axios|curl|wget|python-requests|headlesschrome|phantomjs|lighthouse|pagespeed|gtmetrix/i;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
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

// Limites de tamanho por campo. Curtos o suficiente pra nao deixar um
// atacante inflar armazenamento, generosos o bastante pra um stack real.
const MESSAGE_MAX = 4_000;
const STACK_MAX = 8_000;
const ROUTE_MAX = 2_048;
const UA_MAX = 1_024;
const SESSION_MAX = 128;

function str(v: unknown, max: number): string | null {
  return typeof v === "string" && v.length > 0 ? v.slice(0, max) : null;
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
    // Aceita JSON tanto via application/json quanto via text/plain (o client
    // pode cair em sendBeacon/keepalive ao descarregar a pagina).
    const raw = await req.text();
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return new Response("invalid json", { status: 400, headers: corsHeaders });
  }

  const kind = body.kind;
  if (typeof kind !== "string" || !ALLOWED_KINDS.has(kind)) {
    return new Response("invalid kind", { status: 400, headers: corsHeaders });
  }

  const message = str(body.message, MESSAGE_MAX);
  if (!message) {
    return new Response("missing message", { status: 400, headers: corsHeaders });
  }

  const occurredAt = str(body.occurred_at, 64);
  const occurred_at =
    occurredAt && !Number.isNaN(Date.parse(occurredAt))
      ? occurredAt
      : new Date().toISOString();

  const ua = req.headers.get("user-agent") || "";
  if (BOT_RE.test(ua)) {
    // 204 silencioso: nao sinalizamos ao bot que ele foi detectado.
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const row = {
    occurred_at,
    kind,
    message,
    stack: str(body.stack, STACK_MAX),
    route: str(body.route, ROUTE_MAX),
    // Prefere o user-agent real do request; cai pro reportado pelo client.
    user_agent: (ua ? ua.slice(0, UA_MAX) : null) ?? str(body.user_agent, UA_MAX),
    recovered: body.recovered === true,
    session_id: str(body.session_id, SESSION_MAX),
    // `extra` e `app_version` nao sao enviados pelo client; ignorados de
    // proposito pra nao abrir espaco a jsonb arbitrario.
  };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { error } = await supabase.from("crash_reports").insert(row);
  if (error) {
    return new Response(`insert failed: ${error.message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(null, { status: 204, headers: corsHeaders });
});
