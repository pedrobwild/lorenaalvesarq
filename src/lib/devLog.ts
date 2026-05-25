/**
 * Logger condicionado a `import.meta.env.DEV`. Funções no-op em build de
 * produção — sem polir a console do usuário final com mensagens internas
 * de RPC/upload, sem riscar dados sensíveis em erros que vão pro DevTools.
 *
 * Para erro REAL que precisa chegar a um sink externo em produção, use
 * Sentry/Logflare diretamente — `devError` é só feedback para o autor
 * durante desenvolvimento.
 */
export function devError(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.error(...args);
  }
}

export function devWarn(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
}
