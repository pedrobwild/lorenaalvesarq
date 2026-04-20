/**
 * Analytics tracker — fire-and-forget.
 * Insere eventos em `analytics_events` (RLS public insert).
 * Nunca bloqueia a UI nem propaga erros.
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
  | "form_submit";

type TrackPayload = {
  path?: string;
  project_slug?: string;
  scroll_depth?: number;
  duration_ms?: number;
  value?: Record<string, unknown>;
};

const SID_KEY = "lorena_sid";
const VID_KEY = "lorena_vid";
const UTM_KEY = "lorena_utm";
const VID_TS_KEY = "lorena_vid_ts";
const VID_MAX_AGE = 30 * 86400_000; // 30 dias

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

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = uuid();
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return uuid();
  }
}

function ensureVisitorId(): void {
  try {
    const ts = Number(localStorage.getItem(VID_TS_KEY) || 0);
    const fresh = ts && Date.now() - ts < VID_MAX_AGE;
    if (!fresh || !localStorage.getItem(VID_KEY)) {
      localStorage.setItem(VID_KEY, uuid());
      localStorage.setItem(VID_TS_KEY, String(Date.now()));
    }
  } catch {
    /* noop */
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

type Utm = { utm_source?: string; utm_medium?: string; utm_campaign?: string };

function captureUtmsFromUrl(): Utm {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: Utm = {};
    const src = params.get("utm_source");
    const med = params.get("utm_medium");
    const cmp = params.get("utm_campaign");
    if (src) utm.utm_source = src;
    if (med) utm.utm_medium = med;
    if (cmp) utm.utm_campaign = cmp;
    return utm;
  } catch {
    return {};
  }
}

function getOrPersistUtms(): Utm {
  try {
    const fromUrl = captureUtmsFromUrl();
    if (Object.keys(fromUrl).length) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const stored = sessionStorage.getItem(UTM_KEY);
    if (stored) return JSON.parse(stored) as Utm;
  } catch {
    /* noop */
  }
  return {};
}

function isAdminContext(): boolean {
  try {
    return window.location.hash.startsWith("#/admin");
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

// ---------- pending duration tracking ----------
let lastPageviewAt: number | null = null;
let pendingDurationMs: number | null = null;
let lastPageviewPath: string | null = null;
let pageviewDebounceTimer: number | null = null;
let lastPageviewKey: string | null = null;

// ---------- public API ----------
export function track(eventType: EventType, payload?: TrackPayload): void {
  try {
    if (isDntEnabled()) return;
    if (isAdminContext()) return;

    ensureVisitorId();
    const session_id = getSessionId();
    const utms = getOrPersistUtms();
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

    const path =
      payload?.path ??
      (typeof window !== "undefined" ? window.location.hash || "/" : null);

    const row: Record<string, unknown> = {
      event_type: eventType,
      session_id,
      path,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      user_agent: ua || null,
      device: detectDevice(ua),
      browser: detectBrowser(ua),
      os: detectOS(ua),
      project_slug: payload?.project_slug ?? null,
      scroll_depth: payload?.scroll_depth ?? null,
      duration_ms: payload?.duration_ms ?? null,
      value: payload?.value ?? null,
      utm_source: utms.utm_source ?? null,
      utm_medium: utms.utm_medium ?? null,
      utm_campaign: utms.utm_campaign ?? null,
    };

    // fire-and-forget
    void supabase
      .from("analytics_events")
      .insert(row as never)
      .then(() => undefined)
      .then(undefined, () => undefined);
  } catch {
    /* never throw */
  }
}

function emitPageview() {
  // calcula duration_ms da página anterior
  const now = Date.now();
  if (lastPageviewAt) {
    pendingDurationMs = now - lastPageviewAt;
  }

  const path = window.location.hash || "/";
  const key = path;

  // debounce repetidos (e.g. mesma rota)
  if (pageviewDebounceTimer) {
    window.clearTimeout(pageviewDebounceTimer);
  }
  pageviewDebounceTimer = window.setTimeout(() => {
    if (lastPageviewKey === key && now - (lastPageviewAt ?? 0) < 800) return;

    track("pageview", {
      path,
      duration_ms: pendingDurationMs ?? undefined,
      value: lastPageviewPath ? { from: lastPageviewPath } : undefined,
    });

    lastPageviewPath = path;
    lastPageviewKey = key;
    lastPageviewAt = now;
    pendingDurationMs = null;
    // reseta scroll depth da nova página
    scrollDepthFired.clear();
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

function onClick(e: MouseEvent) {
  try {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const link = target.closest("a") as HTMLAnchorElement | null;
    if (!link) return;
    const href = link.getAttribute("href") || "";
    if (!href) return;

    if (link.dataset.track) {
      track("click_cta", { value: { label: link.dataset.track, href } });
      return;
    }

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
  } catch {
    /* noop */
  }
}

let initialized = false;

export function initAnalytics(): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (initialized) return () => undefined;
  initialized = true;

  // captura UTMs da URL inicial
  getOrPersistUtms();

  // pageview inicial
  emitPageview();

  const onHashChange = () => emitPageview();
  window.addEventListener("hashchange", onHashChange);
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("click", onClick, true);

  return () => {
    window.removeEventListener("hashchange", onHashChange);
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("click", onClick, true);
    if (pageviewDebounceTimer) window.clearTimeout(pageviewDebounceTimer);
    initialized = false;
  };
}
