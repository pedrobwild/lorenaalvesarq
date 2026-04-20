import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import SessionsChart, { type DailyPoint } from "@/components/admin/SessionsChart";
import { supabase } from "@/integrations/supabase/client";
import { routes } from "@/lib/useHashRoute";

type RangeKey = "7d" | "30d" | "90d" | "12m";
const RANGE_DAYS: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 };

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

type KpiSet = {
  sessions: number;
  uniqueVisitors: number;
  pageviews: number;
  pagesPerSession: number;
  avgDurationMs: number;
  contactConversion: number; // %
  prev: {
    sessions: number;
    uniqueVisitors: number;
    pageviews: number;
    pagesPerSession: number;
    avgDurationMs: number;
    contactConversion: number;
  };
  daily: DailyPoint[];
  sparkline: DailyPoint[];
};

type TopPath = { path: string; pageviews: number; sessions: number };
type TopProject = { project_slug: string; views: number; sessions: number };
type TopReferrer = { referrer: string; sessions: number };

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

function startOfDayKey(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function buildDaily(rows: RawEvent[], days: number): DailyPoint[] {
  const map = new Map<string, { sessions: Set<string>; pageviews: number }>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400_000);
    const k = d.toISOString().slice(0, 10);
    map.set(k, { sessions: new Set(), pageviews: 0 });
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

function computeKpis(rows: RawEvent[], prevRows: RawEvent[], days: number): KpiSet {
  const calc = (set: RawEvent[]) => {
    const sessionIds = new Set<string>();
    const allSessionIds = new Set<string>();
    let pageviews = 0;
    let durSum = 0;
    let durCount = 0;
    let contactClicks = 0;
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
  const daily = buildDaily(rows, days);
  const sparkline = buildDaily(rows, Math.min(14, days));

  return {
    ...cur,
    prev,
    daily,
    sparkline,
  };
}

function fmtMs(ms: number): string {
  if (!ms) return "0:00";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`;
}

function fmtDelta(cur: number, prev: number): { txt: string; dir: "up" | "down" | "flat" } {
  if (!prev && !cur) return { txt: "—", dir: "flat" };
  if (!prev) return { txt: "+∞", dir: "up" };
  const d = ((cur - prev) / prev) * 100;
  const dir: "up" | "down" | "flat" = d > 0.5 ? "up" : d < -0.5 ? "down" : "flat";
  return { txt: `${d > 0 ? "+" : ""}${d.toFixed(1)}%`, dir };
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiSet | null>(null);
  const [topPaths, setTopPaths] = useState<TopPath[]>([]);
  const [topProjects, setTopProjects] = useState<TopProject[]>([]);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [devices, setDevices] = useState<{ name: string; value: number }[]>([]);
  const [utmRows, setUtmRows] = useState<{ utm_source: string; sessions: number }[]>([]);
  const [funnel, setFunnel] = useState<{ sessions: number; viewed: number; clicked: number }>({
    sessions: 0,
    viewed: 0,
    clicked: 0,
  });
  const cacheRef = useRef<Map<RangeKey, unknown>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const days = RANGE_DAYS[range];
      const since = daysAgoIso(days);
      const prevSince = daysAgoIso(days * 2);

      try {
        const [evRes, prevRes, pathsRes, projsRes, refsRes] = await Promise.all([
          supabase
            .from("analytics_events")
            .select(
              "id,event_type,session_id,path,referrer,device,duration_ms,utm_source,project_slug,created_at"
            )
            .gte("created_at", since)
            .order("created_at", { ascending: true })
            .limit(50000),
          supabase
            .from("analytics_events")
            .select(
              "id,event_type,session_id,path,referrer,device,duration_ms,utm_source,project_slug,created_at"
            )
            .gte("created_at", prevSince)
            .lt("created_at", since)
            .limit(50000),
          supabase.rpc("analytics_top_paths", { p_since: since, p_limit: 10 }),
          supabase.rpc("analytics_top_projects", { p_since: since, p_limit: 10 }),
          supabase.rpc("analytics_top_referrers", { p_since: since, p_limit: 10 }),
        ]);

        if (cancelled) return;

        const events = (evRes.data ?? []) as RawEvent[];
        const prevEvents = (prevRes.data ?? []) as RawEvent[];

        const k = computeKpis(events, prevEvents, days);
        setKpis(k);

        // devices donut + utm table + funil a partir dos eventos do período
        const devCount = new Map<string, Set<string>>();
        const utmCount = new Map<string, Set<string>>();
        const sessionsAll = new Set<string>();
        const sessionsViewedProject = new Set<string>();
        const sessionsClickedContact = new Set<string>();
        for (const r of events) {
          if (r.session_id) sessionsAll.add(r.session_id);
          if (r.event_type === "project_view" && r.session_id)
            sessionsViewedProject.add(r.session_id);
          if (r.event_type === "click_contact" && r.session_id)
            sessionsClickedContact.add(r.session_id);
          if (r.event_type === "pageview") {
            const dev = r.device || "desktop";
            if (!devCount.has(dev)) devCount.set(dev, new Set());
            if (r.session_id) devCount.get(dev)!.add(r.session_id);
            const utm = r.utm_source || "(direto)";
            if (!utmCount.has(utm)) utmCount.set(utm, new Set());
            if (r.session_id) utmCount.get(utm)!.add(r.session_id);
          }
        }

        setDevices(
          Array.from(devCount.entries())
            .map(([name, s]) => ({ name, value: s.size }))
            .sort((a, b) => b.value - a.value)
        );
        setUtmRows(
          Array.from(utmCount.entries())
            .map(([utm_source, s]) => ({ utm_source, sessions: s.size }))
            .sort((a, b) => b.sessions - a.sessions)
            .slice(0, 8)
        );
        setFunnel({
          sessions: sessionsAll.size,
          viewed: sessionsViewedProject.size,
          clicked: sessionsClickedContact.size,
        });

        setTopPaths((pathsRes.data ?? []) as TopPath[]);
        setTopProjects((projsRes.data ?? []) as TopProject[]);
        setTopReferrers((refsRes.data ?? []) as TopReferrer[]);
      } catch (err) {
        // silencioso
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [range]);

  async function exportCsv() {
    const days = RANGE_DAYS[range];
    const since = daysAgoIso(days);
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
      const batch = data ?? [];
      all = all.concat(batch as Record<string, unknown>[]);
      if (batch.length < PAGE) break;
      from += PAGE;
      if (from > 50000) break;
    }
    if (!all.length) return;
    const headers = Object.keys(all[0]);
    const csv = [
      headers.join(","),
      ...all.map((r) =>
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
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    a.download = `analytics-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const cards = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: "Sessões",
        value: kpis.sessions.toLocaleString("pt-BR"),
        delta: fmtDelta(kpis.sessions, kpis.prev.sessions),
      },
      {
        label: "Visitantes únicos",
        value: kpis.uniqueVisitors.toLocaleString("pt-BR"),
        delta: fmtDelta(kpis.uniqueVisitors, kpis.prev.uniqueVisitors),
      },
      {
        label: "Pageviews",
        value: kpis.pageviews.toLocaleString("pt-BR"),
        delta: fmtDelta(kpis.pageviews, kpis.prev.pageviews),
      },
      {
        label: "Páginas / sessão",
        value: kpis.pagesPerSession.toFixed(2),
        delta: fmtDelta(kpis.pagesPerSession, kpis.prev.pagesPerSession),
      },
      {
        label: "Tempo médio",
        value: fmtMs(kpis.avgDurationMs),
        delta: fmtDelta(kpis.avgDurationMs, kpis.prev.avgDurationMs),
      },
      {
        label: "Conv. contato",
        value: fmtPct(kpis.contactConversion),
        delta: fmtDelta(kpis.contactConversion, kpis.prev.contactConversion),
      },
    ];
  }, [kpis]);

  // suprime warning de cache não usado (preparado para refinos futuros)
  void cacheRef;

  return (
    <AdminLayout active="analytics">
      <section className="admin-toolbar">
        <div className="admin-pills" role="group" aria-label="Intervalo">
          {(Object.keys(RANGE_DAYS) as RangeKey[]).map((k) => (
            <button
              key={k}
              type="button"
              className={`admin-pill ${range === k ? "is-active" : ""}`}
              aria-pressed={range === k}
              onClick={() => setRange(k)}
            >
              {k}
            </button>
          ))}
        </div>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={exportCsv}>
          ↓ exportar CSV
        </button>
      </section>

      <section className="admin-cards admin-cards--6">
        {(loading || !kpis ? Array.from({ length: 6 }) : cards).map((c, i) => {
          if (loading || !kpis) {
            return (
              <div key={i} className="admin-card" style={{ opacity: 0.4 }} role="group">
                <span className="admin-card__label mono">—</span>
                <span className="admin-card__value">—</span>
              </div>
            );
          }
          const card = c as (typeof cards)[number];
          return (
            <div key={card.label} className="admin-card" role="group" aria-label={card.label}>
              <span className="admin-card__label mono">{card.label}</span>
              <span className="admin-card__value">{card.value}</span>
              <span
                className="admin-card__delta mono"
                data-dir={card.delta.dir}
                aria-label={`variação ${card.delta.txt}`}
              >
                {card.delta.dir === "up" ? "↑" : card.delta.dir === "down" ? "↓" : "·"}{" "}
                {card.delta.txt}
              </span>
              {kpis.sparkline.length > 0 && (
                <div className="admin-card__spark">
                  <SessionsChart
                    data={kpis.sparkline}
                    height={48}
                    showAxes={false}
                    showTooltip={false}
                    variant="line"
                  />
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="admin-section">
        <header className="admin-section__head">
          <h2 className="admin-section__title">Sessões e pageviews ao longo do tempo</h2>
        </header>
        <div className="admin-chart">
          {kpis && <SessionsChart data={kpis.daily} height={280} />}
        </div>
      </section>

      <section className="admin-grid-2">
        <div className="admin-section">
          <header className="admin-section__head">
            <h2 className="admin-section__title">Top páginas</h2>
          </header>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Caminho</th>
                  <th style={{ textAlign: "right" }}>PV</th>
                  <th style={{ textAlign: "right" }}>Sessões</th>
                </tr>
              </thead>
              <tbody>
                {topPaths.map((p) => (
                  <tr key={p.path}>
                    <td className="mono">{p.path}</td>
                    <td className="mono" style={{ textAlign: "right" }}>
                      {Number(p.pageviews).toLocaleString("pt-BR")}
                    </td>
                    <td className="mono" style={{ textAlign: "right" }}>
                      {Number(p.sessions).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
                {!topPaths.length && (
                  <tr>
                    <td colSpan={3} className="mono" style={{ opacity: 0.6 }}>
                      sem eventos no período
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-section">
          <header className="admin-section__head">
            <h2 className="admin-section__title">Top projetos</h2>
          </header>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th style={{ textAlign: "right" }}>Views</th>
                  <th style={{ textAlign: "right" }}>Sessões</th>
                </tr>
              </thead>
              <tbody>
                {topProjects.map((p) => (
                  <tr key={p.project_slug}>
                    <td>
                      <a className="admin-link" href={routes.adminProjectEdit(p.project_slug)}>
                        {p.project_slug}
                      </a>
                    </td>
                    <td className="mono" style={{ textAlign: "right" }}>
                      {Number(p.views).toLocaleString("pt-BR")}
                    </td>
                    <td className="mono" style={{ textAlign: "right" }}>
                      {Number(p.sessions).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
                {!topProjects.length && (
                  <tr>
                    <td colSpan={3} className="mono" style={{ opacity: 0.6 }}>
                      sem visualizações de projeto no período
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="admin-grid-3">
        <div className="admin-section">
          <header className="admin-section__head">
            <h2 className="admin-section__title">Referenciadores</h2>
          </header>
          <div className="admin-bars">
            {topReferrers.map((r) => {
              const max = Math.max(1, ...topReferrers.map((x) => x.sessions));
              const pct = (r.sessions / max) * 100;
              return (
                <div key={r.referrer} className="admin-bar-row">
                  <span className="admin-bar-row__label mono" title={r.referrer}>
                    {r.referrer}
                  </span>
                  <span className="admin-bar-row__bar">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span className="admin-bar-row__val mono">{r.sessions}</span>
                </div>
              );
            })}
            {!topReferrers.length && (
              <p className="mono" style={{ opacity: 0.6 }}>
                sem referrers no período
              </p>
            )}
          </div>
        </div>

        <div className="admin-section">
          <header className="admin-section__head">
            <h2 className="admin-section__title">Dispositivos</h2>
          </header>
          <div className="admin-bars">
            {devices.map((d) => {
              const total = devices.reduce((acc, x) => acc + x.value, 0) || 1;
              const pct = (d.value / total) * 100;
              return (
                <div key={d.name} className="admin-bar-row">
                  <span className="admin-bar-row__label mono">{d.name}</span>
                  <span className="admin-bar-row__bar">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span className="admin-bar-row__val mono">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
            {!devices.length && (
              <p className="mono" style={{ opacity: 0.6 }}>
                sem dados
              </p>
            )}
          </div>
        </div>

        <div className="admin-section">
          <header className="admin-section__head">
            <h2 className="admin-section__title">UTMs</h2>
          </header>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>utm_source</th>
                  <th style={{ textAlign: "right" }}>Sessões</th>
                </tr>
              </thead>
              <tbody>
                {utmRows.map((r) => (
                  <tr key={r.utm_source}>
                    <td className="mono">{r.utm_source}</td>
                    <td className="mono" style={{ textAlign: "right" }}>
                      {r.sessions}
                    </td>
                  </tr>
                ))}
                {!utmRows.length && (
                  <tr>
                    <td colSpan={2} className="mono" style={{ opacity: 0.6 }}>
                      sem campanhas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <header className="admin-section__head">
          <h2 className="admin-section__title">Funil de conversão</h2>
        </header>
        <div className="admin-funnel">
          <FunnelStep label="Sessão" value={funnel.sessions} />
          <FunnelArrow
            pct={
              funnel.sessions ? Math.round((funnel.viewed / funnel.sessions) * 100) : 0
            }
          />
          <FunnelStep label="Viu projeto" value={funnel.viewed} />
          <FunnelArrow
            pct={funnel.viewed ? Math.round((funnel.clicked / funnel.viewed) * 100) : 0}
          />
          <FunnelStep label="Clicou contato" value={funnel.clicked} />
        </div>
      </section>
    </AdminLayout>
  );
}

function FunnelStep({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-funnel__step">
      <span className="admin-card__label mono">{label}</span>
      <span className="admin-card__value">{value.toLocaleString("pt-BR")}</span>
    </div>
  );
}

function FunnelArrow({ pct }: { pct: number }) {
  return (
    <div className="admin-funnel__arrow mono">
      <span>→</span>
      <span>{pct}%</span>
    </div>
  );
}
