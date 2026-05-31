/**
 * Recuperação automática contra "tela em branco" e erros fatais.
 *
 * Estratégia em três camadas:
 *
 *  1. **Captura**: erros do React (via RootErrorBoundary), erros globais
 *     (`window.onerror`), promises rejeitadas sem catch
 *     (`unhandledrejection`) e um watchdog que detecta `#root` vazio
 *     poucos segundos após o boot.
 *
 *  2. **Registro**: cada crash vai para `localStorage` (ring buffer de
 *     20 entradas — chave `lvbl:crash-log`) com timestamp, mensagem,
 *     stack, rota, user-agent e tipo. Esse log sobrevive a reloads e
 *     pode ser inspecionado depois em `window.__crashLog()`.
 *
 *  3. **Auto-reload com guarda anti-loop**: usamos um contador em
 *     `sessionStorage` (`lvbl:reload-attempts`) que dispara no máximo
 *     2 reloads dentro de uma janela de 60s. Se o terceiro crash
 *     acontecer dentro dessa janela, paramos de recarregar e
 *     mostramos fallback — recarregar em loop com a mesma falha
 *     deixa o usuário pior do que uma tela de erro estática.
 *     O contador é limpo após 5s de render saudável (`markHealthy`).
 */
import { devError } from "./devLog";
import { SUPABASE_URL } from "@/integrations/supabase/client";

const LOG_KEY = "lvbl:crash-log";
const QUEUE_KEY = "lvbl:crash-queue";
const SESSION_ID_KEY = "lvbl:crash-session-id";
const ATTEMPTS_KEY = "lvbl:reload-attempts";
const ATTEMPTS_WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 2;
const LOG_LIMIT = 20;
const QUEUE_LIMIT = 50;
const BLANK_SCREEN_TIMEOUT_MS = 12_000;
const BLANK_SCREEN_RECHECK_MS = 4_000;
const HEALTHY_AFTER_MS = 5_000;
const UPLOAD_TIMEOUT_MS = 4_000;
const MAX_FIELD_LEN = 8_000;

export type CrashKind =
  | "react-error-boundary"
  | "window-error"
  | "unhandled-rejection"
  | "blank-screen";

export interface CrashEntry {
  at: string;
  kind: CrashKind;
  message: string;
  stack?: string;
  route: string;
  userAgent: string;
  recovered: boolean;
  sessionId: string;
}

/**
 * ID estável por visita (aba do navegador). Usa `sessionStorage`, então
 * sobrevive a reloads dentro da mesma aba — exatamente o que queremos
 * pra correlacionar crashes que ocorrem antes/depois do auto-reload —
 * mas é descartado ao fechar a aba, garantindo que cada visita nova
 * receba um id próprio. Cai pra um id efêmero em memória se o
 * sessionStorage estiver indisponível (modo privado/quota).
 */
let cachedSessionId: string | null = null;
function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
export function getSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) {
      cachedSessionId = existing;
      return existing;
    }
    const fresh = generateId();
    sessionStorage.setItem(SESSION_ID_KEY, fresh);
    cachedSessionId = fresh;
    return fresh;
  } catch {
    cachedSessionId = cachedSessionId ?? generateId();
    return cachedSessionId;
  }
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function truncate(value: string | undefined, max = MAX_FIELD_LEN): string | undefined {
  if (value == null) return value;
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…[truncated]`;
}

export function recordCrash(
  kind: CrashKind,
  error: unknown,
  recovered: boolean
): CrashEntry {
  const err = error instanceof Error ? error : new Error(String(error));
  const entry: CrashEntry = {
    at: new Date().toISOString(),
    kind,
    message: truncate(err.message || "unknown error", 1_000)!,
    stack: truncate(err.stack),
    route:
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}${window.location.hash}`
        : "",
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    recovered,
    sessionId: getSessionId(),
  };

  try {
    const log = safeParse<CrashEntry[]>(localStorage.getItem(LOG_KEY), []);
    log.push(entry);
    while (log.length > LOG_LIMIT) log.shift();
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch {
    // localStorage indisponível (modo privado, quota): só ignora.
  }

  // Tenta enviar imediatamente; em caso de falha (offline, gateway fora,
  // recurso bloqueado) o entry vai pra fila persistente e é reenviado
  // no próximo boot ou quando o evento `online` disparar.
  void uploadEntry(entry).catch(() => enqueue(entry));

  devError(`[crash:${kind}]`, entry);
  return entry;
}

export function getCrashLog(): CrashEntry[] {
  try {
    return safeParse<CrashEntry[]>(localStorage.getItem(LOG_KEY), []);
  } catch {
    return [];
  }
}

export function clearCrashLog(): void {
  try {
    localStorage.removeItem(LOG_KEY);
  } catch {
    // ignore
  }
}

// ---------- Upload + fila offline ---------------------------------------

function entryToRow(entry: CrashEntry) {
  return {
    occurred_at: entry.at,
    kind: entry.kind,
    message: entry.message,
    stack: entry.stack ?? null,
    route: entry.route || null,
    user_agent: entry.userAgent || null,
    recovered: entry.recovered,
    session_id: entry.sessionId,
  };
}

// Endpoint da edge function que ingere os crashes. As escritas NÃO vão mais
// direto pra /rest/v1/crash_reports via anon key — a edge function (service_role)
// valida tamanho, filtra bots e aplica rate-limit por IP antes do INSERT.
const CRASH_ENDPOINT = `${SUPABASE_URL}/functions/v1/report-crash`;

async function uploadEntry(entry: CrashEntry): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("offline");
  }
  // Timeout manual: queremos cair na fila rapidamente se a rede estiver
  // lenta — não dá pra travar o boot esperando o POST.
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(CRASH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entryToRow(entry)),
      signal: controller.signal,
      keepalive: true,
    });
    // 4xx (payload inválido, bot, rate-limit) não vale reenfileirar — só 5xx
    // e falhas de rede (que viram throw no fetch) voltam pra fila.
    if (!res.ok && res.status >= 500) {
      throw new Error(`crash upload failed: ${res.status}`);
    }
  } finally {
    window.clearTimeout(timer);
  }
}

function readQueue(): CrashEntry[] {
  try {
    return safeParse<CrashEntry[]>(localStorage.getItem(QUEUE_KEY), []);
  } catch {
    return [];
  }
}

function writeQueue(queue: CrashEntry[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // quota cheia: descarta — preferimos perder telemetria a quebrar a app.
  }
}

function enqueue(entry: CrashEntry): void {
  const queue = readQueue();
  queue.push(entry);
  while (queue.length > QUEUE_LIMIT) queue.shift();
  writeQueue(queue);
}

let flushing = false;
let appMarkedHealthy = false;

/**
 * Drena a fila offline. Roda no boot e a cada evento `online`. Ao
 * encontrar a primeira falha, para — assim a próxima tentativa
 * continua de onde parou, sem quebrar a ordem cronológica nem
 * desperdiçar requisições enquanto a rede ainda está instável.
 */
export async function flushQueue(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    let queue = readQueue();
    while (queue.length > 0) {
      const [next, ...rest] = queue;
      try {
        await uploadEntry(next);
        queue = rest;
        writeQueue(queue);
      } catch {
        // Mantém o item na fila e aborta — tentamos de novo no próximo gatilho.
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

interface AttemptsState {
  count: number;
  firstAt: number;
}

function readAttempts(): AttemptsState {
  return safeParse<AttemptsState>(sessionStorage.getItem(ATTEMPTS_KEY), {
    count: 0,
    firstAt: 0,
  });
}

function writeAttempts(state: AttemptsState): void {
  try {
    sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/**
 * Tenta recarregar a página dentro do orçamento de tentativas. Retorna
 * `true` se o reload foi disparado, `false` se já esgotamos as tentativas
 * (nesse caso o caller deve mostrar fallback estático para o usuário).
 */
export function tryAutoReload(): boolean {
  let state: AttemptsState;
  try {
    state = readAttempts();
  } catch {
    state = { count: 0, firstAt: 0 };
  }

  const now = Date.now();
  if (!state.firstAt || now - state.firstAt > ATTEMPTS_WINDOW_MS) {
    state = { count: 0, firstAt: now };
  }

  if (state.count >= MAX_ATTEMPTS) {
    return false;
  }

  state.count += 1;
  writeAttempts(state);

  // Pequeno atraso para o log do crash terminar de persistir e dar tempo
  // de o usuário ver algo (caso o erro tenha vindo de uma interação).
  window.setTimeout(() => {
    window.location.reload();
  }, 150);
  return true;
}

/** Chamada após render bem-sucedida — zera o contador anti-loop. */
export function markHealthy(): void {
  appMarkedHealthy = true;
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(ATTEMPTS_KEY);
    } catch {
      // ignore
    }
  }, HEALTHY_AFTER_MS);
}

let installed = false;

/**
 * Instala handlers globais e o watchdog de tela em branco. Idempotente.
 * Deve ser chamado uma vez, antes do `createRoot().render()`.
 */
export function installCrashRecovery(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const checkBlankScreen = () => {
    if (appMarkedHealthy) return;

    const root = document.getElementById("root");
    const hasContent = !!root && root.childElementCount > 0;
    if (hasContent) return;

    // Em conexões lentas, o documento pode ainda estar carregando módulos,
    // CSS ou imagens. Rechecar após o load evita falso positivo que causava
    // reload antes de o React ter chance de montar no preview do usuário.
    if (document.readyState !== "complete") {
      window.setTimeout(checkBlankScreen, BLANK_SCREEN_RECHECK_MS);
      return;
    }

    const reloaded = tryAutoReload();
    recordCrash(
      "blank-screen",
      new Error("Root element vazio após boot"),
      reloaded
    );
  };

  window.addEventListener("error", (event) => {
    // Filtra erros de recurso (img, script) — não derrubam a app e
    // já são logados pelo browser. Só nos interessam erros JS.
    if (event.error || event.message) {
      const triedReload = false; // erros pontuais não devem reloadar sozinhos
      recordCrash("window-error", event.error ?? event.message, triedReload);
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    recordCrash("unhandled-rejection", event.reason, false);
  });

  // Reenvia qualquer crash que ficou pendente em sessão anterior offline.
  void flushQueue();
  window.addEventListener("online", () => {
    void flushQueue();
  });

  // Watchdog: se depois de N segundos o #root continuar vazio, é
  // tela em branco — registra e tenta recarregar (com guarda anti-loop).
  window.setTimeout(checkBlankScreen, BLANK_SCREEN_TIMEOUT_MS);

  // Exposto para depuração manual no DevTools — sem custo em produção.
  const w = window as unknown as {
    __crashLog?: () => CrashEntry[];
    __crashLogBySession?: (sessionId?: string) => CrashEntry[];
    __crashSessionId?: () => string;
  };
  w.__crashLog = getCrashLog;
  w.__crashSessionId = getSessionId;
  w.__crashLogBySession = (sessionId?: string) => {
    const target = sessionId ?? getSessionId();
    const entries = getCrashLog().filter((e) => e.sessionId === target);
    // eslint-disable-next-line no-console
    console.info(
      `[crash] ${entries.length} entrada(s) para sessionId=${target}`,
      entries,
    );
    return entries;
  };
}
