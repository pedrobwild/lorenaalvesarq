/**
 * useAnalyticsState — estado central do painel.
 *
 * Sincroniza com a querystring do hash (#/admin/analytics?tab=...&from=...&to=...&seg=...&theme=...&cmp=1)
 * para que colar a URL reproduza exatamente a mesma view.
 *
 * Mantém também:
 *  - tema persistido em localStorage ("lorena_admin_theme")
 *  - views salvas em localStorage ("lorena_admin_views")
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DateRange,
  Segment,
  SegmentDim,
  TabKey,
  Theme,
} from "./types";

const THEME_KEY = "lorena_admin_theme";
const VIEWS_KEY = "lorena_admin_views";

export type SavedView = {
  id: string;
  name: string;
  tab: TabKey;
  range: { from: string; to: string };
  segments: Segment[];
  comparePrev: boolean;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function defaultRange(): DateRange {
  const to = endOfDay(new Date());
  const from = startOfDay(new Date(Date.now() - 29 * 86400_000));
  return { from, to };
}

export function previousRange(range: DateRange): DateRange {
  const ms = range.to.getTime() - range.from.getTime();
  const to = new Date(range.from.getTime() - 1);
  const from = new Date(to.getTime() - ms);
  return { from, to };
}

function fmtDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function parseDay(s: string | null): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function readQuery(): URLSearchParams {
  const h = window.location.hash || "";
  const i = h.indexOf("?");
  return new URLSearchParams(i >= 0 ? h.slice(i + 1) : "");
}
function writeQuery(params: URLSearchParams) {
  const h = window.location.hash || "";
  const i = h.indexOf("?");
  const base = i >= 0 ? h.slice(0, i) : h;
  const qs = params.toString();
  const next = qs ? `${base}?${qs}` : base;
  if (next !== h) {
    history.replaceState(null, "", next);
  }
}

function parseSegments(raw: string | null): Segment[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => {
      const [dim, ...rest] = p.split(":");
      const value = rest.join(":");
      if (!dim || !value) return null;
      return { dim: dim as SegmentDim, value: decodeURIComponent(value) };
    })
    .filter((s): s is Segment => s !== null);
}
function stringifySegments(segs: Segment[]): string {
  return segs.map((s) => `${s.dim}:${encodeURIComponent(s.value)}`).join(",");
}

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "dark" || t === "light") return t;
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {
    /* noop */
  }
  return "light";
}

export function useAnalyticsState() {
  const init = useMemo(() => {
    const q = readQuery();
    const tab = (q.get("tab") as TabKey) || "overview";
    const from = parseDay(q.get("from"));
    const to = parseDay(q.get("to"));
    const range: DateRange =
      from && to
        ? { from: startOfDay(from), to: endOfDay(to) }
        : defaultRange();
    const segments = parseSegments(q.get("seg"));
    const comparePrev = q.get("cmp") !== "0";
    return { tab, range, segments, comparePrev };
  }, []);

  const [tab, setTab] = useState<TabKey>(init.tab);
  const [range, setRange] = useState<DateRange>(init.range);
  const [segments, setSegments] = useState<Segment[]>(init.segments);
  const [comparePrev, setComparePrev] = useState<boolean>(init.comparePrev);
  const [theme, setThemeState] = useState<Theme>(() => readTheme());

  // theme persistence
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* noop */
    }
  }, [theme]);

  // sync to URL
  const lastSyncRef = useRef("");
  useEffect(() => {
    const q = readQuery();
    q.set("tab", tab);
    q.set("from", fmtDay(range.from));
    q.set("to", fmtDay(range.to));
    if (segments.length) q.set("seg", stringifySegments(segments));
    else q.delete("seg");
    q.set("cmp", comparePrev ? "1" : "0");
    const next = q.toString();
    if (next !== lastSyncRef.current) {
      lastSyncRef.current = next;
      writeQuery(q);
    }
  }, [tab, range, segments, comparePrev]);

  const addSegment = useCallback((s: Segment) => {
    setSegments((prev) => {
      const filtered = prev.filter((p) => p.dim !== s.dim);
      return [...filtered, s];
    });
  }, []);
  const removeSegment = useCallback((dim: SegmentDim) => {
    setSegments((prev) => prev.filter((p) => p.dim !== dim));
  }, []);
  const clearSegments = useCallback(() => setSegments([]), []);

  // saved views
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    try {
      const raw = localStorage.getItem(VIEWS_KEY);
      return raw ? (JSON.parse(raw) as SavedView[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(VIEWS_KEY, JSON.stringify(savedViews));
    } catch {
      /* noop */
    }
  }, [savedViews]);

  const saveView = useCallback(
    (name: string) => {
      const v: SavedView = {
        id: crypto.randomUUID(),
        name,
        tab,
        range: { from: fmtDay(range.from), to: fmtDay(range.to) },
        segments,
        comparePrev,
      };
      setSavedViews((prev) => [v, ...prev].slice(0, 20));
    },
    [tab, range, segments, comparePrev]
  );

  const loadView = useCallback((v: SavedView) => {
    setTab(v.tab);
    const from = parseDay(v.range.from) ?? new Date();
    const to = parseDay(v.range.to) ?? new Date();
    setRange({ from: startOfDay(from), to: endOfDay(to) });
    setSegments(v.segments);
    setComparePrev(v.comparePrev);
  }, []);

  const deleteView = useCallback((id: string) => {
    setSavedViews((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return {
    tab,
    setTab,
    range,
    setRange,
    segments,
    addSegment,
    removeSegment,
    clearSegments,
    comparePrev,
    setComparePrev,
    theme,
    setTheme: setThemeState,
    savedViews,
    saveView,
    loadView,
    deleteView,
  };
}

export type AnalyticsState = ReturnType<typeof useAnalyticsState>;
