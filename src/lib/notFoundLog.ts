// Helpers para a página 404 e o admin de URLs não encontradas.
//
// - logNotFound: registra (de forma idempotente) o path 404 atual no banco.
//   Usa a RPC SECURITY DEFINER `log_404`, que faz o upsert e incrementa hits.
//
// - lookupActiveRedirect: consulta seo_404_log e devolve `redirect_to` se houver
//   um redirecionamento configurado para o path atual com status='redirect'.
//   Usado no momento em que a NotFoundPage monta para enviar o usuário para a
//   URL correta sem precisar publicar configuração extra de hosting.

import { supabase } from "@/integrations/supabase/client";

const SESSION_FLAG_PREFIX = "404-logged:";

/** Evita registrar o mesmo path mais de uma vez por sessão do navegador. */
function hasLoggedThisSession(path: string): boolean {
  try {
    return sessionStorage.getItem(SESSION_FLAG_PREFIX + path) === "1";
  } catch {
    return false;
  }
}
function markLoggedThisSession(path: string) {
  try {
    sessionStorage.setItem(SESSION_FLAG_PREFIX + path, "1");
  } catch {
    /* sessionStorage indisponível */
  }
}

/**
 * Registra (best-effort) o path 404 atual no banco.
 *
 * @param path  caminho não encontrado (ex.: "/projeto/foo")
 * @param referrer  document.referrer, se houver
 * @param reason  motivo opcional (ex.: "spa_fallback", "manual"); a edge
 *                function `not-found-check` envia reasons mais específicos
 *                como "unknown_route", "invalid_dynamic_segment",
 *                "dynamic_slug_not_found".
 */
export async function logNotFound(
  path: string,
  referrer?: string | null,
  reason: string = "spa_fallback"
): Promise<void> {
  if (!path || path === "/") return;
  if (hasLoggedThisSession(path)) return;
  markLoggedThisSession(path);
  try {
    await supabase.rpc("log_404", {
      p_path: path,
      p_referrer: referrer || undefined,
      p_reason: reason,
    });
  } catch {
    /* nunca falha a renderização por causa do logging */
  }
}

export async function lookupActiveRedirect(path: string): Promise<string | null> {
  if (!path) return null;
  try {
    const { data, error } = await supabase
      .from("seo_404_log")
      .select("redirect_to, status")
      .eq("path", path)
      .eq("status", "redirect")
      .maybeSingle();
    if (error || !data?.redirect_to) return null;
    return data.redirect_to;
  } catch {
    return null;
  }
}
