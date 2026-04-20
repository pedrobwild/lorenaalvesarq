import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import SessionsChart, { type DailyPoint } from "@/components/admin/SessionsChart";
import HoursHeatmap from "@/components/admin/HoursHeatmap";
import { supabase } from "@/integrations/supabase/client";
import { routes } from "@/lib/useHashRoute";

type RangeKey = "7d" | "30d" | "90d" | "12m";
const RANGE_DAYS: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 };

type DeviceFilter = "all" | "desktop" | "mobile" | "tablet";

type RawEvent = {
  id?: string;
  event_type: string;
  session_id: string | null;
  path: string | null;
  referrer: string | null;
  device: string | null;
  duration_ms: number | null;
  utm_source: string | null;
  project_slug: string | null;
  created_at: string;
};

type DailyPointWithPrev = DailyPoint & { prevSessions?: number; prevPageviews?: number };

type KpiSet = {
  sessions: number;
  uniqueVisitors: number;
  pageviews: number;
  pagesPerSession: number;
  avgDurationMs: number;
  contactConversion: number;
  prev: {
    sessions: number;
    uniqueVisitors: number;
    pageviews: number;
    pagesPerSession: number;
    avgDurationMs: number;
    contactConversion: number;
  };
  daily: DailyPointWithPrev[];
  sparkline: DailyPoint[];
};

type TopPath = { path: string; pageviews: number; sessions: number };
type TopProject = { project_slug: string; views: number; sessions: number };
type TopReferrer = { referrer: string; sessions: number };

// ---------- helpers ----------
function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}
function startOfDayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
function buildDaily(rows: RawEvent[], days: number): DailyPoint[] {
  const map = new Map<string, { sessions: Set<string>; pageviews: number }>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400_000);
    map.set(d.toISOString().slice(0, 10), { sessions: new Set(), pageviews: 0 });
  }
  for (const r of rows) {
    const k = startOfDayKey(r.created_at);
    const bucket = map.get(k);
    if (!bucket) continue;
    if (r.event_type === "pageview") {
      bucket.pageviews++;
      if (r.session_id) bucket.sessions.add(r.session_id);
    }
  }
  return Array.from(map.entries()).map(([day, v]) => ({
    day,
    sessions: v.sessions.size,
    pageviews: v.pageviews,
  }));
}
function buildDailyWithPrev(rows: RawEvent[], prevRows: RawEvent[], days: number): DailyPointWithPrev[] {
  const cur = buildDaily(rows, days);
  const prevMap = new Map<number, { sessions: Set<string>; pageviews: number }>();
  for (let i = 0; i < days; i++) prevMap.set(i, { sessions: new Set(), pageviews: 0 });
  const periodStart = Date.now() - days * 86400_000;
  const prevStart = periodStart - days * 86400_000;
  for (const r of prevRows) {
    const t = new Date(r.created_at).getTime();
    if (t < prevStart || t >= periodStart) continue;
    const dayOffset = Math.floor((t - prevStart) / 86400_000);
    const bucket = prevMap.get(dayOffset);
    if (!bucket) continue;
    if (r.event_type === "pageview") {
      bucket.pageviews++;
      if (r.session_id) bucket.sessions.add(r.session_id);
    }
  }
  return cur.map((d, i) => {
    const p = prevMap.get(i);
    return { ...d, prevSessions: p?.sessions.size ?? 0, prevPageviews: p?.pageviews ?? 0 };
  });
}
function computeKpis(rows: RawEvent[], prevRows: RawEvent[], days: number): KpiSet {
  const calc = (set: RawEvent[]) => {
    const sessionIds = new Set<string>();
    const allSessionIds = new Set<string>();
    let pageviews = 0, durSum = 0, durCount = 0, contactClicks = 0;
    for (const r of set) {
      if (r.session_id) allSessionIds.add(r.session_id);
      if (r.event_type === "pageview") {
        pageviews++;
        if (r.session_id) sessionIds.add(r.session_id);
        if (typeof r.duration_ms === "number" && r.duration_ms > 0 && r.duration_ms < 1800000) {
          durSum += r.duration_ms;
          durCount++;
        }
      }
      if (r.event_type === "click_contact") contactClicks++;
    }
    const sessions = sessionIds.size;
    return {
      sessions,
      uniqueVisitors: allSessionIds.size,
      pageviews,
      pagesPerSession: sessions ? pageviews / sessions : 0,
      avgDurationMs: durCount ? durSum / durCount : 0,
      contactConversion: sessions ? (contactClicks / sessions) * 100 : 0,
    };
  };
  const cur = calc(rows);
  const prev = calc(prevRows);
  const daily = buildDailyWithPrev(rows, prevRows, days);
  const sparkline = buildDaily(rows, Math.min(14, days));
  return { ...cur, prev, daily, sparkline };
}
function fmtMs(ms: number): string {
  if (!ms) return "0:00";
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`;
}
function fmtDelta(cur: number, prev: number): { txt: string; dir: "up" | "down" | "flat" } {
  if (!prev && !cur) return { txt: "—", dir: "flat" };
  if (!prev) return { txt: "novo", dir: "up" };
  const d = ((cur - prev) / prev) * 100;
  const dir: "up" | "down" | "flat" = d > 0.5 ? "up" : d < -0.5 ? "down" : "flat";
  return { txt: `${d > 0 ? "+" : ""}${d.toFixed(1)}%`, dir };
}
function normalizeDevice(d: string | null): DeviceFilter {
  const v = (d || "").toLowerCase();
  if (v.includes("mobile") || v === "phone") return "mobile";
  if (v.includes("tablet") || v.includes("ipad")) return "tablet";
  return "desktop";
}
function matchesDevice(r: RawEvent, filter: DeviceFilter): boolean {
  if (filter === "all") return true;
  return normalizeDevice(r.device) === filter;
}

// ============================================================
export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>("all");
  const [showPrev, setShowPrev] = useState(true);
  const [loading, setLoading] = useState(true);
  const [csvOpen, setCsvOpen] = useState(false);
  const [heatmapCollapsed, setHeatmapCollapsed] = useState(false);
  const csvMenuRef = useRef<HTMLDivElement | null>(null);

  const [rawCur, setRawCur] = useState<RawEvent[]>([]);
  const [rawPrev, setRawPrev] = useState<RawEvent[]>([]);

  // fechar dropdown ao clicar fora
  useEffect(() => {
    if (!csvOpen) return;
    function onDocClick(e: MouseEvent) {
      if (csvMenuRef.current && !csvMenuRef.current.contains(e.target as Node)) {
        setCsvOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [csvOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const days = RANGE_DAYS[range];
      const since = daysAgoIso(days);
      const prevSince = daysAgoIso(days * 2);
      try {
        const [evRes, prevRes] = await Promise.all([
          supabase
            .from("analytics_events")
            .select("id,event_type,session_id,path,referrer,device,duration_ms,utm_source,project_slug,created_at")
            .gte("created_at", since)
            .order("created_at", { ascending: true })
            .limit(50000),
          supabase
            .from("analytics_events")
            .select("id,event_type,session_id,path,referrer,device,duration_ms,utm_source,project_slug,created_at")
            .gte("created_at", prevSince)
            .lt("created_at", since)
            .limit(50000),
        ]);
        if (cancelled) return;
        setRawCur((evRes.data ?? []) as RawEvent[]);
        setRawPrev((prevRes.data ?? []) as RawEvent[]);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const events = useMemo(
    () => (deviceFilter === "all" ? rawCur : rawCur.filter((r) => matchesDevice(r, deviceFilter))),
    [rawCur, deviceFilter]
  );
  const prevEvents = useMemo(
    () => (deviceFilter === "all" ? rawPrev : rawPrev.filter((r) => matchesDevice(r, deviceFilter))),
    [rawPrev, deviceFilter]
  );

  const days = RANGE_DAYS[range];
  const kpis = useMemo<KpiSet | null>(
    () => (events.length || prevEvents.length ? computeKpis(events, prevEvents, days) : null),
    [events, prevEvents, days]
  );

  const { topPaths, topProjects, topReferrers, devices, utmRows, funnel } = useMemo(() => {
    const pathMap = new Map<string, { pv: number; s: Set<string> }>();
    const projMap = new Map<string, { v: number; s: Set<string> }>();
    const refMap = new Map<string, Set<string>>();
    const devMap = new Map<string, Set<string>>();
    const utmMap = new Map<string, Set<string>>();
    const sessionsAll = new Set<string>();
    const sessionsViewedProject = new Set<string>();
    const sessionsClickedContact = new Set<string>();

    for (const r of events) {
      if (r.session_id) sessionsAll.add(r.session_id);
      if (r.event_type === "project_view" && r.session_id) sessionsViewedProject.add(r.session_id);
      if (r.event_type === "click_contact" && r.session_id) sessionsClickedContact.add(r.session_id);

      if (r.event_type === "pageview") {
        if (r.path) {
          if (!pathMap.has(r.path)) pathMap.set(r.path, { pv: 0, s: new Set() });
          const p = pathMap.get(r.path)!;
          p.pv++;
          if (r.session_id) p.s.add(r.session_id);
        }
        const ref = r.referrer && r.referrer.trim() ? r.referrer : "(direto)";
        if (!refMap.has(ref)) refMap.set(ref, new Set());
        if (r.session_id) refMap.get(ref)!.add(r.session_id);

        const dev = normalizeDevice(r.device);
        if (!devMap.has(dev)) devMap.set(dev, new Set());
        if (r.session_id) devMap.get(dev)!.add(r.session_id);

        const utm = r.utm_source || "(direto)";
        if (!utmMap.has(utm)) utmMap.set(utm, new Set());
        if (r.session_id) utmMap.get(utm)!.add(r.session_id);
      }

      if (r.event_type === "project_view" && r.project_slug) {
        if (!projMap.has(r.project_slug)) projMap.set(r.project_slug, { v: 0, s: new Set() });
        const p = projMap.get(r.project_slug)!;
        p.v++;
        if (r.session_id) p.s.add(r.session_id);
      }
    }

    return {
      topPaths: Array.from(pathMap.entries())
        .map(([path, x]) => ({ path, pageviews: x.pv, sessions: x.s.size }))
        .sort((a, b) => b.pageviews - a.pageviews)
        .slice(0, 10) as TopPath[],
      topProjects: Array.from(projMap.entries())
        .map(([project_slug, x]) => ({ project_slug, views: x.v, sessions: x.s.size }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10) as TopProject[],
      topReferrers: Array.from(refMap.entries())
        .map(([referrer, s]) => ({ referrer, sessions: s.size }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 8) as TopReferrer[],
      devices: Array.from(devMap.entries())
        .map(([name, s]) => ({ name, value: s.size }))
        .sort((a, b) => b.value - a.value),
      utmRows: Array.from(utmMap.entries())
        .map(([utm_source, s]) => ({ utm_source, sessions: s.size }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 8),
      funnel: {
        sessions: sessionsAll.size,
        viewed: sessionsViewedProject.size,
        clicked: sessionsClickedContact.size,
      },
    };
  }, [events]);

  // ========== CSV ==========
  function downloadBlob(filename: string, content: string, mime = "text/csv;charset=utf-8") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function rowsToCsv(rows: Record<string, unknown>[]): string {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    return [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const v = r[h];
            if (v == null) return "";
            const s = typeof v === "object" ? JSON.stringify(v) : String(v);
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");
  }
  function fileSuffix(): string {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const dev = deviceFilter === "all" ? "" : `-${deviceFilter}`;
    return `${range}${dev}-${today}`;
  }
  async function exportRawCsv() {
    setCsvOpen(false);
    const since = daysAgoIso(RANGE_DAYS[range]);
    const PAGE = 1000;
    let from = 0;
    let all: Record<string, unknown>[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) break;
      const batch = (data ?? []) as Record<string, unknown>[];
      all = all.concat(batch);
      if (batch.length < PAGE) break;
      from += PAGE;
      if (from > 50000) break;
    }
    if (deviceFilter !== "all") {
      all = all.filter((r) => normalizeDevice((r as RawEvent).device) === deviceFilter);
    }
    if (!all.length) return;
    downloadBlob(`analytics-eventos-${fileSuffix()}.csv`, rowsToCsv(all));
  }
  function exportSummaryCsv() {
    setCsvOpen(false);
    if (!kpis) return;
    const summary = [
      { metric: "Sessões", atual: kpis.sessions, anterior: kpis.prev.sessions },
      { metric: "Visitantes únicos", atual: kpis.uniqueVisitors, anterior: kpis.prev.uniqueVisitors },
      { metric: "Pageviews", atual: kpis.pageviews, anterior: kpis.prev.pageviews },
      { metric: "Páginas/sessão", atual: kpis.pagesPerSession.toFixed(2), anterior: kpis.prev.pagesPerSession.toFixed(2) },
      { metric: "Tempo médio (s)", atual: Math.round(kpis.avgDurationMs / 1000), anterior: Math.round(kpis.prev.avgDurationMs / 1000) },
      { metric: "Conv. contato (%)", atual: kpis.contactConversion.toFixed(2), anterior: kpis.prev.contactConversion.toFixed(2) },
    ];
    const sections: string[] = [];
    sections.push(`# Analytics — ${range} — dispositivo: ${deviceFilter}`);
    sections.push("", "## KPIs", rowsToCsv(summary));
    sections.push("", "## Sessões e pageviews por dia", rowsToCsv(kpis.daily as unknown as Record<string, unknown>[]));
    sections.push("", "## Top páginas", rowsToCsv(topPaths as unknown as Record<string, unknown>[]));
    sections.push("", "## Top projetos", rowsToCsv(topProjects as unknown as Record<string, unknown>[]));
    sections.push("", "## Referenciadores", rowsToCsv(topReferrers as unknown as Record<string, unknown>[]));
    sections.push("", "## Dispositivos", rowsToCsv(devices as unknown as Record<string, unknown>[]));
    sections.push("", "## UTMs", rowsToCsv(utmRows as unknown as Record<string, unknown>[]));
    downloadBlob(`analytics-resumo-${fileSuffix()}.csv`, sections.join("\n"));
  }

  const cards = useMemo(() => {
    if (!kpis) return [];
    return [
      { label: "Sessões", value: kpis.sessions.toLocaleString("pt-BR"), delta: fmtDelta(kpis.sessions, kpis.prev.sessions) },
      { label: "Visitantes", value: kpis.uniqueVisitors.toLocaleString("pt-BR"), delta: fmtDelta(kpis.uniqueVisitors, kpis.prev.uniqueVisitors) },
      { label: "Pageviews", value: kpis.pageviews.toLocaleString("pt-BR"), delta: fmtDelta(kpis.pageviews, kpis.prev.pageviews) },
      { label: "Pág/sessão", value: kpis.pagesPerSession.toFixed(2), delta: fmtDelta(kpis.pagesPerSession, kpis.prev.pagesPerSession) },
      { label: "Tempo médio", value: fmtMs(kpis.avgDurationMs), delta: fmtDelta(kpis.avgDurationMs, kpis.prev.avgDurationMs) },
      { label: "Conv. contato", value: fmtPct(kpis.contactConversion), delta: fmtDelta(kpis.contactConversion, kpis.prev.contactConversion) },
    ];
  }, [kpis]);

  const maxRefs = Math.max(1, ...topReferrers.map((x) => x.sessions));
  const totalDevices = devices.reduce((acc, x) => acc + x.value, 0) || 1;
  const maxPathPv = Math.max(1, ...topPaths.map((p) => p.pageviews));
  const maxProjViews = Math.max(1, ...topProjects.map((p) => p.views));
  const maxUtm = Math.max(1, ...utmRows.map((u) => u.sessions));

  return (
    <AdminLayout active="analytics">
      <div className="analytics">
        {/* ---------- Toolbar fixa ---------- */}
        <div className="analytics__toolbar">
          <div className="analytics__filters">
            <div className="analytics__filter-group">
              <span className="analytics__filter-label">período</span>
              <div className="analytics-pills" role="group" aria-label="Intervalo">
                {(Object.keys(RANGE_DAYS) as RangeKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`analytics-pill ${range === k ? "is-active" : ""}`}
                    aria-pressed={range === k}
                    onClick={() => setRange(k)}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <div className="analytics__filter-group">
              <span className="analytics__filter-label">dispositivo</span>
              <div className="analytics-pills" role="group" aria-label="Dispositivo">
                {(["all", "desktop", "mobile", "tablet"] as DeviceFilter[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`analytics-pill ${deviceFilter === k ? "is-active" : ""}`}
                    aria-pressed={deviceFilter === k}
                    onClick={() => setDeviceFilter(k)}
                  >
                    {k === "all" ? "todos" : k}
                  </button>
                ))}
              </div>
            </div>

            <div className="analytics__filter-group">
              <span className="analytics__filter-label">comparativo</span>
              <label className="analytics-check">
                <input type="checkbox" checked={showPrev} onChange={(e) => setShowPrev(e.target.checked)} />
                período anterior
              </label>
            </div>
          </div>

          <div className="analytics__actions" ref={csvMenuRef}>
            <button
              type="button"
              className="analytics-btn"
              onClick={() => setCsvOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={csvOpen}
            >
              ↓ exportar
            </button>
            {csvOpen && (
              <div className="analytics-menu" role="menu">
                <button type="button" className="analytics-menu__item" onClick={exportSummaryCsv} role="menuitem">
                  <strong>Resumo</strong>
                  <span>KPIs · top páginas · projetos · devices · utm</span>
                </button>
                <button type="button" className="analytics-menu__item" onClick={exportRawCsv} role="menuitem">
                  <strong>Eventos brutos</strong>
                  <span>todos os registros do período</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ---------- KPI strip ---------- */}
        <div className="analytics-kpis" style={{ marginBottom: 16 }}>
          {(loading || !kpis ? Array.from({ length: 6 }) : cards).map((c, i) => {
            if (loading || !kpis) {
              return (
                <div key={i} className="analytics-kpi" aria-hidden>
                  <div className="analytics-kpi__head">
                    <span className="analytics-kpi__label">—</span>
                  </div>
                  <span className="analytics-kpi__value" style={{ opacity: 0.25 }}>—</span>
                </div>
              );
            }
            const card = c as (typeof cards)[number];
            return (
              <div key={card.label} className="analytics-kpi" role="group" aria-label={card.label}>
                <div className="analytics-kpi__head">
                  <span className="analytics-kpi__label">{card.label}</span>
                  <span className="analytics-kpi__delta" data-dir={card.delta.dir}>
                    {card.delta.dir === "up" ? "↑" : card.delta.dir === "down" ? "↓" : "·"} {card.delta.txt}
                  </span>
                </div>
                <span className="analytics-kpi__value">{card.value}</span>
                {kpis.sparkline.length > 0 && (
                  <div className="analytics-kpi__spark">
                    <SessionsChart data={kpis.sparkline} height={28} showAxes={false} showTooltip={false} variant="line" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ---------- Grid principal ---------- */}
        <div className="analytics__grid">
          {/* Linha 1: Gráfico (8) + Funil (4) */}
          <section className="analytics-panel analytics__col-8">
            <header className="analytics-panel__head">
              <h2 className="analytics-panel__title">Sessões e pageviews</h2>
              <span className="analytics-panel__hint">
                {showPrev ? "linha tracejada = período anterior" : `últimos ${days} dias`}
              </span>
            </header>
            <div className="analytics-panel__body">
              {kpis ? (
                <div className="analytics-chart">
                  <SessionsChart data={kpis.daily} height={260} showPrev={showPrev} />
                </div>
              ) : (
                <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#9a9a93" }}>
                  carregando…
                </p>
              )}
            </div>
          </section>

          <section className="analytics-panel analytics__col-4">
            <header className="analytics-panel__head">
              <h2 className="analytics-panel__title">Funil</h2>
            </header>
            <div className="analytics-panel__body">
              <div className="analytics-funnel">
                <FunnelStep label="sessões" value={funnel.sessions} />
                <FunnelArrow pct={funnel.sessions ? Math.round((funnel.viewed / funnel.sessions) * 100) : 0} />
                <FunnelStep label="viu projeto" value={funnel.viewed} />
                <FunnelArrow pct={funnel.viewed ? Math.round((funnel.clicked / funnel.viewed) * 100) : 0} />
                <FunnelStep label="clicou contato" value={funnel.clicked} />
              </div>
            </div>
          </section>

          {/* Linha 2: Top páginas (6) + Top projetos (6) */}
          <section className="analytics-panel analytics__col-6">
            <header className="analytics-panel__head">
              <h2 className="analytics-panel__title">Top páginas</h2>
              <span className="analytics-panel__hint">{topPaths.length} caminhos</span>
            </header>
            <div className="analytics-panel__body analytics-panel__body--flush">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>caminho</th>
                    <th style={{ textAlign: "right", width: 80 }}>pv</th>
                    <th style={{ textAlign: "right", width: 80 }}>sessões</th>
                  </tr>
                </thead>
                <tbody>
                  {topPaths.map((p) => (
                    <tr
                      key={p.path}
                      style={{ ["--row-pct" as string]: `${(p.pageviews / maxPathPv) * 100}%` }}
                    >
                      <td className="path">{p.path}</td>
                      <td className="num">{p.pageviews.toLocaleString("pt-BR")}</td>
                      <td className="num">{p.sessions.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                  {!topPaths.length && (
                    <tr>
                      <td colSpan={3} className="empty">sem eventos no período</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="analytics-panel analytics__col-6">
            <header className="analytics-panel__head">
              <h2 className="analytics-panel__title">Top projetos</h2>
              <span className="analytics-panel__hint">{topProjects.length} projetos</span>
            </header>
            <div className="analytics-panel__body analytics-panel__body--flush">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>projeto</th>
                    <th style={{ textAlign: "right", width: 80 }}>views</th>
                    <th style={{ textAlign: "right", width: 80 }}>sessões</th>
                  </tr>
                </thead>
                <tbody>
                  {topProjects.map((p) => (
                    <tr
                      key={p.project_slug}
                      style={{ ["--row-pct" as string]: `${(p.views / maxProjViews) * 100}%` }}
                    >
                      <td className="path">
                        <a className="admin-link" href={routes.adminProjectEdit(p.project_slug)}>
                          {p.project_slug}
                        </a>
                      </td>
                      <td className="num">{p.views.toLocaleString("pt-BR")}</td>
                      <td className="num">{p.sessions.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                  {!topProjects.length && (
                    <tr>
                      <td colSpan={3} className="empty">sem visualizações de projeto</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Linha 3: Referenciadores (4) + Dispositivos (4) + UTMs (4) */}
          <section className="analytics-panel analytics__col-4">
            <header className="analytics-panel__head">
              <h2 className="analytics-panel__title">Referenciadores</h2>
            </header>
            <div className="analytics-panel__body">
              {topReferrers.length ? (
                <div className="analytics-bars">
                  {topReferrers.map((r) => (
                    <div key={r.referrer} className="analytics-bar">
                      <span
                        className="analytics-bar__label"
                        title={r.referrer}
                        style={{ ["--bar-pct" as string]: `${(r.sessions / maxRefs) * 100}%` }}
                      >
                        {r.referrer}
                      </span>
                      <span className="analytics-bar__val">{r.sessions}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="analytics-bars__empty">sem referrers no período</p>
              )}
            </div>
          </section>

          <section className="analytics-panel analytics__col-4">
            <header className="analytics-panel__head">
              <h2 className="analytics-panel__title">Dispositivos</h2>
            </header>
            <div className="analytics-panel__body">
              {devices.length ? (
                <div className="analytics-bars">
                  {devices.map((d) => {
                    const pct = (d.value / totalDevices) * 100;
                    return (
                      <div key={d.name} className="analytics-bar">
                        <span
                          className="analytics-bar__label"
                          style={{ ["--bar-pct" as string]: `${pct}%` }}
                        >
                          {d.name}
                        </span>
                        <span className="analytics-bar__val">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="analytics-bars__empty">sem dados</p>
              )}
            </div>
          </section>

          <section className="analytics-panel analytics__col-4">
            <header className="analytics-panel__head">
              <h2 className="analytics-panel__title">UTMs</h2>
            </header>
            <div className="analytics-panel__body">
              {utmRows.length ? (
                <div className="analytics-bars">
                  {utmRows.map((u) => (
                    <div key={u.utm_source} className="analytics-bar">
                      <span
                        className="analytics-bar__label"
                        title={u.utm_source}
                        style={{ ["--bar-pct" as string]: `${(u.sessions / maxUtm) * 100}%` }}
                      >
                        {u.utm_source}
                      </span>
                      <span className="analytics-bar__val">{u.sessions}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="analytics-bars__empty">sem campanhas</p>
              )}
            </div>
          </section>

          {/* Linha 4: Heatmap full-width, colapsável */}
          <section
            className={`analytics-panel analytics-panel--collapsible analytics__col-12 ${heatmapCollapsed ? "is-collapsed" : ""}`}
          >
            <header
              className="analytics-panel__head"
              onClick={() => setHeatmapCollapsed((v) => !v)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setHeatmapCollapsed((v) => !v);
                }
              }}
            >
              <h2 className="analytics-panel__title">Mapa de calor — visitas por hora × dia</h2>
              <span className="analytics-panel__hint">horário do navegador</span>
            </header>
            <div className="analytics-panel__body">
              <HoursHeatmap events={events} />
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

function FunnelStep({ label, value }: { label: string; value: number }) {
  return (
    <div className="analytics-funnel__step">
      <span className="analytics-funnel__step-label">{label}</span>
      <span className="analytics-funnel__step-value">{value.toLocaleString("pt-BR")}</span>
    </div>
  );
}

function FunnelArrow({ pct }: { pct: number }) {
  return (
    <div className="analytics-funnel__arrow">
      <span>→</span>
      <strong>{pct}%</strong>
    </div>
  );
}
