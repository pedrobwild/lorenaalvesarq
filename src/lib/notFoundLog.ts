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
import { devWarn } from "@/lib/devLog";

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

export async function logNotFound(path: string, referrer?: string | null): Promise<void> {
  if (!path || path === "/") return;
  if (hasLoggedThisSession(path)) return;
  markLoggedThisSession(path);
  try {
    await supabase.rpc("log_404", {
      p_path: path,
      p_referrer: referrer || undefined,
    });
  } catch (err) {
    // Nunca derruba o render por logging — mas em DEV avisa o autor,
    // antes o catch silenciava completamente (L9 do audit).
    devWarn("[notFoundLog] log_404 falhou:", err);
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
  } catch (err) {
    devWarn("[notFoundLog] lookupActiveRedirect falhou:", err);
    return null;
  }
}
