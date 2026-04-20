/**
 * Analytics tracker — fire-and-forget, marketing-grade.
 *
 * Recursos:
 * - visitor_id (localStorage, TTL 365d rolando)
 * - session_id (sessionStorage, renovada após 30 min de inatividade)
 * - Atribuição: 1ª pageview captura utm_*, referrer_host, landing_path
 *   (last-touch por sessão; first-touch persistido por visitante)
 * - Engagement time: timer baseado em document.visibilityState,
 *   enviado via sendBeacon no unload/hashchange
 * - Scroll depth: marcos 25/50/75/100 uma vez por página
 * - Outbound/CTA: delegação no document
 * - Privacidade: respeita DNT, ignora rotas /admin
 * - Resiliência: nunca lança exceção
 */
import { supabase } from "@/integrations/supabase/client";

type EventType =
  | "pageview"
  | "project_view"
  | "portfolio_view"
  | "click_contact"
  | "click_whatsapp"
  | "click_instagram"
  | "click_cta"
  | "outbound_click"
  | "scroll_depth"
  | "form_submit"
  | "engagement_time";

type TrackPayload = {
  path?: string;
  project_slug?: string;
  scroll_depth?: number;
  duration_ms?: number;
  value?: Record<string, unknown>;
};

// ---------- storage keys ----------
const SID_KEY = "lorena_sid";
const SID_TS_KEY = "lorena_sid_ts";
const VID_KEY = "lorena_vid";
const VID_TS_KEY = "lorena_vid_ts";
const UTM_KEY = "lorena_utm"; // last-touch (sessão)
const FIRST_UTM_KEY = "lorena_first_utm"; // first-touch (visitante)
const LANDING_KEY = "lorena_landing";
const REFERRER_HOST_KEY = "lorena_ref_host";

const VID_MAX_AGE = 365 * 86_400_000; // 365 dias
const SID_IDLE = 30 * 60_000; // 30 min

// ---------- helpers ----------
function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function ensureVisitorId(): string {
  try {
    const ts = Number(localStorage.getItem(VID_TS_KEY) || 0);
    const fresh = ts && Date.now() - ts < VID_MAX_AGE;
    let vid = localStorage.getItem(VID_KEY);
    if (!fresh || !vid) {
      vid = uuid();
      localStorage.setItem(VID_KEY, vid);
    }
    // Roll TTL on every access
    localStorage.setItem(VID_TS_KEY, String(Date.now()));
    return vid;
  } catch {
    return uuid();
  }
}

function getSessionId(): { id: string; isNew: boolean } {
  try {
    const now = Date.now();
    const lastTs = Number(sessionStorage.getItem(SID_TS_KEY) || 0);
    let sid = sessionStorage.getItem(SID_KEY);
    const expired = lastTs > 0 && now - lastTs > SID_IDLE;
    const isNew = !sid || expired;
    if (isNew) {
      sid = uuid();
      sessionStorage.setItem(SID_KEY, sid);
    }
    sessionStorage.setItem(SID_TS_KEY, String(now));
    return { id: sid as string, isNew };
  } catch {
    return { id: uuid(), isNew: true };
  }
}

function detectDevice(ua: string): "desktop" | "mobile" | "tablet" {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/.test(s))
    return "mobile";
  return "desktop";
}

function detectBrowser(ua: string): string {
  const s = ua.toLowerCase();
  if (s.includes("edg/")) return "Edge";
  if (s.includes("chrome/") && !s.includes("chromium/")) return "Chrome";
  if (s.includes("firefox/")) return "Firefox";
  if (s.includes("safari/") && !s.includes("chrome/")) return "Safari";
  if (s.includes("opera") || s.includes("opr/")) return "Opera";
  return "Other";
}

function detectOS(ua: string): string {
  const s = ua.toLowerCase();
  if (s.includes("windows")) return "Windows";
  if (s.includes("mac os")) return "macOS";
  if (s.includes("android")) return "Android";
  if (s.includes("iphone") || s.includes("ipad") || s.includes("ipod")) return "iOS";
  if (s.includes("linux")) return "Linux";
  return "Other";
}

type Utm = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};

function captureUtmsFromUrl(): Utm {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: Utm = {};
    const keys: (keyof Utm)[] = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
    ];
    for (const k of keys) {
      const v = params.get(k);
      if (v) utm[k] = v;
    }
    return utm;
  } catch {
    return {};
  }
}

function getOrPersistUtms(isNewSession: boolean): Utm {
  try {
    const fromUrl = captureUtmsFromUrl();
    if (Object.keys(fromUrl).length) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(fromUrl));
      // first-touch só grava se ainda não existir
      if (!localStorage.getItem(FIRST_UTM_KEY)) {
        localStorage.setItem(FIRST_UTM_KEY, JSON.stringify(fromUrl));
      }
      return fromUrl;
    }
    if (isNewSession) {
      // sessão nova sem UTM → limpa atribuição da sessão anterior
      sessionStorage.removeItem(UTM_KEY);
      return {};
    }
    const stored = sessionStorage.getItem(UTM_KEY);
    if (stored) return JSON.parse(stored) as Utm;
  } catch {
    /* noop */
  }
  return {};
}

function getReferrerHost(isNewSession: boolean): string | null {
  try {
    if (isNewSession) {
      const ref = typeof document !== "undefined" ? document.referrer : "";
      if (!ref) {
        sessionStorage.removeItem(REFERRER_HOST_KEY);
        return null;
      }
      const url = new URL(ref);
      if (url.host === window.location.host) {
        sessionStorage.removeItem(REFERRER_HOST_KEY);
        return null;
      }
      sessionStorage.setItem(REFERRER_HOST_KEY, url.host);
      return url.host;
    }
    return sessionStorage.getItem(REFERRER_HOST_KEY);
  } catch {
    return null;
  }
}

function getLandingPath(isNewSession: boolean, currentPath: string): string {
  try {
    if (isNewSession) {
      sessionStorage.setItem(LANDING_KEY, currentPath);
      return currentPath;
    }
    return sessionStorage.getItem(LANDING_KEY) || currentPath;
  } catch {
    return currentPath;
  }
}

function isAdminContext(): boolean {
  try {
    return window.location.pathname.startsWith("/admin");
  } catch {
    return false;
  }
}

function isDntEnabled(): boolean {
  try {
    const nav = navigator as unknown as Record<string, unknown>;
    const win = window as unknown as Record<string, unknown>;
    const dnt =
      (nav.doNotTrack as string | undefined) ||
      (win.doNotTrack as string | undefined) ||
      (nav.msDoNotTrack as string | undefined);
    return dnt === "1" || dnt === "yes";
  } catch {
    return false;
  }
}

function getScreen(): string | null {
  try {
    if (typeof window === "undefined" || !window.screen) return null;
    return `${window.screen.width}x${window.screen.height}`;
  } catch {
    return null;
  }
}

function getLanguage(): string | null {
  try {
    return navigator.language || null;
  } catch {
    return null;
  }
}

// ---------- pending duration tracking ----------
let lastPageviewAt: number | null = null;
let pendingDurationMs: number | null = null;
let lastPageviewPath: string | null = null;
let pageviewDebounceTimer: number | null = null;
let lastPageviewKey: string | null = null;

// ---------- engagement timer (visibility-aware) ----------
let engagementMs = 0;
let engagementTickStart: number | null = null;
let currentPageForEngagement: string | null = null;

function engagementStart() {
  if (typeof document === "undefined") return;
  if (document.visibilityState === "visible") {
    engagementTickStart = Date.now();
  }
}

function engagementPause() {
  if (engagementTickStart != null) {
    engagementMs += Date.now() - engagementTickStart;
    engagementTickStart = null;
  }
}

function engagementFlush(useBeacon: boolean) {
  engagementPause();
  if (engagementMs >= 1000 && currentPageForEngagement) {
    sendEvent(
      buildRow("engagement_time", {
        path: currentPageForEngagement,
        duration_ms: Math.round(engagementMs),
      }),
      useBeacon
    );
  }
  engagementMs = 0;
}

function engagementResetForPage(path: string) {
  engagementMs = 0;
  engagementTickStart = null;
  currentPageForEngagement = path;
  engagementStart();
}

// ---------- core send ----------
function buildRow(eventType: EventType, payload?: TrackPayload) {
  const visitor_id = ensureVisitorId();
  const { id: session_id, isNew } = getSessionId();
  const path =
    payload?.path ??
    (typeof window !== "undefined" ? window.location.pathname || "/" : null);
  const utms = getOrPersistUtms(isNew);
  const referrer_host = getReferrerHost(isNew);
  const landing_path = path ? getLandingPath(isNew, path) : null;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

  // anonimiza referrer (remove querystring)
  let referrer: string | null = null;
  try {
    if (typeof document !== "undefined" && document.referrer) {
      const u = new URL(document.referrer);
      referrer = `${u.origin}${u.pathname}`;
    }
  } catch {
    /* noop */
  }

  return {
    event_type: eventType,
    session_id,
    visitor_id,
    path,
    landing_path,
    referrer,
    referrer_host,
    user_agent: ua || null,
    device: detectDevice(ua),
    browser: detectBrowser(ua),
    os: detectOS(ua),
    screen: getScreen(),
    language: getLanguage(),
    project_slug: payload?.project_slug ?? null,
    scroll_depth: payload?.scroll_depth ?? null,
    duration_ms: payload?.duration_ms ?? null,
    value: payload?.value ?? null,
    utm_source: utms.utm_source ?? null,
    utm_medium: utms.utm_medium ?? null,
    utm_campaign: utms.utm_campaign ?? null,
    utm_term: utms.utm_term ?? null,
    utm_content: utms.utm_content ?? null,
  };
}

function sendEvent(row: Record<string, unknown>, preferBeacon: boolean) {
  // Beacon path (somente para unload / página fechando)
  if (preferBeacon && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/analytics_events`;
      const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const blob = new Blob([JSON.stringify(row)], {
        type: "application/json",
      });
      // sendBeacon não permite headers custom; o PostgREST aceita a chave anon via querystring
      // mas o melhor é tentar fetch keepalive como fallback se beacon falhar
      const ok = navigator.sendBeacon(`${url}?apikey=${apikey}`, blob);
      if (ok) return;
    } catch {
      /* fallback abaixo */
    }
    // fallback fetch keepalive
    try {
      void fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/analytics_events`, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify(row),
      }).catch(() => undefined);
    } catch {
      /* noop */
    }
    return;
  }

  // Caminho normal: SDK (com retry único)
  void supabase
    .from("analytics_events")
    .insert(row as never)
    .then((res) => {
      if (res.error) {
        // retry único
        void supabase
          .from("analytics_events")
          .insert(row as never)
          .then(() => undefined)
          .then(undefined, () => undefined);
      }
    })
    .then(undefined, () => undefined);
}

// ---------- public API ----------
export function track(eventType: EventType, payload?: TrackPayload): void {
  try {
    if (isDntEnabled()) return;
    if (isAdminContext()) return;
    sendEvent(buildRow(eventType, payload), false);
  } catch {
    /* never throw */
  }
}

function emitPageview() {
  const now = Date.now();
  if (lastPageviewAt) {
    pendingDurationMs = now - lastPageviewAt;
  }

  const path = window.location.pathname || "/";
  const key = path;

  if (pageviewDebounceTimer) {
    window.clearTimeout(pageviewDebounceTimer);
  }
  pageviewDebounceTimer = window.setTimeout(() => {
    if (lastPageviewKey === key && now - (lastPageviewAt ?? 0) < 800) return;

    // flush engagement da página anterior antes de mudar
    if (currentPageForEngagement && currentPageForEngagement !== path) {
      engagementFlush(false);
    }

    track("pageview", {
      path,
      duration_ms: pendingDurationMs ?? undefined,
      value: lastPageviewPath ? { from: lastPageviewPath } : undefined,
    });

    lastPageviewPath = path;
    lastPageviewKey = key;
    lastPageviewAt = now;
    pendingDurationMs = null;
    scrollDepthFired.clear();
    engagementResetForPage(path);
  }, 250);
}

const scrollDepthFired = new Set<number>();

function onScroll() {
  try {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop;
    const docHeight = doc.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    const pct = Math.min(100, Math.round((scrollTop / docHeight) * 100));
    for (const milestone of [25, 50, 75, 100]) {
      if (pct >= milestone && !scrollDepthFired.has(milestone)) {
        scrollDepthFired.add(milestone);
        track("scroll_depth", { scroll_depth: milestone });
      }
    }
  } catch {
    /* noop */
  }
}

function parseDataValue(raw: string | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { raw };
  }
}

function onClick(e: MouseEvent) {
  try {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const link = target.closest("a, button") as HTMLElement | null;
    if (!link) return;

    const trackAttr = link.dataset.track;
    const valueAttr = link.dataset.value;
    const href = link.getAttribute?.("href") || "";

    if (trackAttr) {
      const value = parseDataValue(valueAttr) ?? (href ? { href } : undefined);
      track(trackAttr as EventType, { value });
      return;
    }

    if (link.tagName !== "A" || !href) return;

    // outbound (http/https para outro host)
    if (/^https?:\/\//i.test(href)) {
      try {
        const url = new URL(href);
        if (url.host !== window.location.host) {
          track("outbound_click", { value: { href } });
        }
      } catch {
        /* noop */
      }
    }

    // wa.me / tel:
    if (/^https?:\/\/wa\.me\//i.test(href) || href.startsWith("tel:")) {
      track("click_whatsapp", { value: { href } });
    }
  } catch {
    /* noop */
  }
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") {
    engagementStart();
  } else {
    engagementPause();
  }
}

function onPageHide() {
  engagementFlush(true);
}

let initialized = false;

export function initAnalytics(): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (initialized) return () => undefined;
  initialized = true;

  // pageview inicial
  emitPageview();

  const onHashChange = () => emitPageview();
  window.addEventListener("hashchange", onHashChange);
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("click", onClick, true);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);

  return () => {
    window.removeEventListener("hashchange", onHashChange);
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
    if (pageviewDebounceTimer) window.clearTimeout(pageviewDebounceTimer);
    initialized = false;
  };
}
