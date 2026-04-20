/**
 * OverviewTab — aba "Visão executiva".
 *
 * Por enquanto, mantém a mesma lógica que a página antiga já tinha
 * (fetch direto em analytics_events com filtro por dispositivo e
 * comparativo com período anterior). Nas próximas fases isso vai
 * migrar para as RPCs server-side (analytics_timeseries / breakdown).
 */
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import HoursHeatmap from "@/components/admin/HoursHeatmap";
import type { DateRange, Segment } from "./types";

type RawEvent = {
  event_type: string;
  session_id: string | null;
  visitor_id: string | null;
  path: string | null;
  device: string | null;
  duration_ms: number | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  country: string | null;
  landing_path: string | null;
  referrer_host: string | null;
  project_slug: string | null;
  created_at: string;
};

type DailyPoint = {
  day: string;
  sessions: number;
  pageviews: number;
  prevSessions?: number;
  prevPageviews?: number;
};

const SEGMENT_COL_MAP: Record<Segment["dim"], keyof RawEvent> = {
  device: "device",
  country: "country",
  utm_source: "utm_source",
  utm_medium: "utm_medium",
  utm_campaign: "utm_campaign",
  landing_path: "landing_path",
  referrer_host: "referrer_host",
};

function applySegments(rows: RawEvent[], segments: Segment[]): RawEvent[] {
  if (!segments.length) return rows;
  return rows.filter((r) =>
    segments.every((s) => {
      const col = SEGMENT_COL_MAP[s.dim];
      const v = r[col];
      return (v ?? "").toString().toLowerCase() === s.value.toLowerCase();
    })
  );
}

function startOfUtcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDailySeries(
  rows: RawEvent[],
  range: DateRange,
  prevRange: DateRange | null,
  prevRows: RawEvent[]
): DailyPoint[] {
  const dayMs = 86400_000;
  const start = new Date(range.from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(range.to);
  end.setHours(0, 0, 0, 0);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);

  const map = new Map<string, { sessions: Set<string>; pageviews: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * dayMs);
    map.set(startOfUtcDay(d), { sessions: new Set(), pageviews: 0 });
  }
  for (const r of rows) {
    if (r.event_type !== "pageview") continue;
    const k = startOfUtcDay(new Date(r.created_at));
    const b = map.get(k);
    if (!b) continue;
    b.pageviews++;
    if (r.session_id) b.sessions.add(r.session_id);
  }

  // previous period aligned by day offset
  const prevMap: { sessions: Set<string>; pageviews: number }[] = [];
  if (prevRange && prevRows.length) {
    const prevStart = new Date(prevRange.from);
    prevStart.setHours(0, 0, 0, 0);
    for (let i = 0; i < days; i++) {
      prevMap.push({ sessions: new Set(), pageviews: 0 });
    }
    for (const r of prevRows) {
      if (r.event_type !== "pageview") continue;
      const t = new Date(r.created_at).getTime();
      const off = Math.floor((t - prevStart.getTime()) / dayMs);
      if (off < 0 || off >= days) continue;
      const b = prevMap[off];
      b.pageviews++;
      if (r.session_id) b.sessions.add(r.session_id);
    }
  }

  return Array.from(map.entries()).map(([day, v], i) => ({
    day,
    sessions: v.sessions.size,
    pageviews: v.pageviews,
    prevSessions: prevMap[i]?.sessions.size,
    prevPageviews: prevMap[i]?.pageviews,
  }));
}

type Kpis = {
  sessions: number;
  uniqueVisitors: number;
  pageviews: number;
  pagesPerSession: number;
  avgEngagementMs: number;
  bounceRate: number;
  conversions: number;
  conversionRate: number;
};

function calcKpis(rows: RawEvent[]): Kpis {
  const sessionPV = new Map<string, number>();
  const visitors = new Set<string>();
  const sessionsConverted = new Set<string>();
  let pageviews = 0;
  let conversions = 0;
  let engagementSum = 0;
  let engagementCount = 0;

  for (const r of rows) {
    if (r.visitor_id) visitors.add(r.visitor_id);
    if (r.event_type === "pageview") {
      pageviews++;
      if (r.session_id) {
        sessionPV.set(r.session_id, (sessionPV.get(r.session_id) || 0) + 1);
      }
    }
    if (r.event_type === "engagement_time" && r.duration_ms && r.duration_ms > 0) {
      engagementSum += r.duration_ms;
      engagementCount++;
    }
    if (
      (r.event_type === "click_contact" ||
        r.event_type === "click_whatsapp" ||
        r.event_type === "form_submit") &&
      r.session_id
    ) {
      sessionsConverted.add(r.session_id);
      conversions++;
    }
  }

  const sessions = sessionPV.size;
  let bounced = 0;
  for (const [sid, pv] of sessionPV) {
    if (pv <= 1 && !sessionsConverted.has(sid)) bounced++;
  }

  return {
    sessions,
    uniqueVisitors: visitors.size,
    pageviews,
    pagesPerSession: sessions ? pageviews / sessions : 0,
    avgEngagementMs: engagementCount ? engagementSum / engagementCount : 0,
    bounceRate: sessions ? (bounced / sessions) * 100 : 0,
    conversions,
    conversionRate: sessions ? (sessionsConverted.size / sessions) * 100 : 0,
  };
}

function fmtNum(n: number): string {
  return n.toLocaleString("pt-BR");
}
function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}
function fmtMs(ms: number): string {
  if (!ms) return "0:00";
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function delta(cur: number, prev: number): { txt: string; dir: "up" | "down" | "flat" } {
  if (!prev && !cur) return { txt: "—", dir: "flat" };
  if (!prev) return { txt: "novo", dir: "up" };
  const d = ((cur - prev) / prev) * 100;
  const dir: "up" | "down" | "flat" = d > 0.5 ? "up" : d < -0.5 ? "down" : "flat";
  return { txt: `${d > 0 ? "+" : ""}${d.toFixed(1)}%`, dir };
}

type Props = {
  range: DateRange;
  segments: Segment[];
  comparePrev: boolean;
};

export default function OverviewTab({ range, segments, comparePrev }: Props) {
  const [loading, setLoading] = useState(true);
  const [rawCur, setRawCur] = useState<RawEvent[]>([]);
  const [rawPrev, setRawPrev] = useState<RawEvent[]>([]);
  const [metric, setMetric] = useState<"sessions" | "pageviews">("sessions");

  const prevRange = useMemo<DateRange | null>(() => {
    if (!comparePrev) return null;
    const ms = range.to.getTime() - range.from.getTime();
    const to = new Date(range.from.getTime() - 1);
    const from = new Date(to.getTime() - ms);
    return { from, to };
  }, [range, comparePrev]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const cols =
      "event_type,session_id,visitor_id,path,device,duration_ms,utm_source,utm_medium,utm_campaign,country,landing_path,referrer_host,project_slug,created_at";

    const sinceISO = range.from.toISOString();
    const untilISO = range.to.toISOString();

    const curQuery = supabase
      .from("analytics_events")
      .select(cols)
      .gte("created_at", sinceISO)
      .lte("created_at", untilISO)
      .order("created_at", { ascending: true })
      .limit(50000);

    const prevQuery = prevRange
      ? supabase
          .from("analytics_events")
          .select(cols)
          .gte("created_at", prevRange.from.toISOString())
          .lt("created_at", sinceISO)
          .limit(50000)
      : null;

    Promise.all([
      Promise.resolve(curQuery),
      prevQuery ? Promise.resolve(prevQuery) : Promise.resolve({ data: [] as RawEvent[] }),
    ])
      .then((results) => {
        if (cancelled) return;
        const cur = (results[0] as { data?: RawEvent[] }).data ?? [];
        const prev = prevRange ? ((results[1] as { data?: RawEvent[] }).data ?? []) : [];
        setRawCur(cur);
        setRawPrev(prev);
      })
      .catch((err) => {
        console.error("[analytics overview] fetch error", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range, prevRange]);

  const events = useMemo(() => applySegments(rawCur, segments), [rawCur, segments]);
  const prevEvents = useMemo(() => applySegments(rawPrev, segments), [rawPrev, segments]);

  const kpis = useMemo(() => calcKpis(events), [events]);
  const prevKpis = useMemo(() => calcKpis(prevEvents), [prevEvents]);
  const daily = useMemo(
    () => buildDailySeries(events, range, prevRange, prevEvents),
    [events, range, prevRange, prevEvents]
  );

  const heatmapEvents = useMemo(
    () =>
      events.map((e) => ({
        event_type: e.event_type,
        session_id: e.session_id,
        created_at: e.created_at,
      })),
    [events]
  );

  if (loading) {
    return (
      <div className="aa-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aa-col-3 aa-skel" style={{ height: 92 }} />
        ))}
        <div className="aa-col-8 aa-skel" style={{ height: 320 }} />
        <div className="aa-col-4 aa-skel" style={{ height: 320 }} />
      </div>
    );
  }

  if (!events.length && !prevEvents.length) {
    return (
      <div className="aa-empty">
        <span className="aa-empty__icon">∅</span>
        sem eventos no período · tente ajustar o intervalo ou os segmentos
      </div>
    );
  }

  const kpiList: { label: string; value: string; cur: number; prev: number }[] = [
    { label: "sessões", value: fmtNum(kpis.sessions), cur: kpis.sessions, prev: prevKpis.sessions },
    { label: "visitantes únicos", value: fmtNum(kpis.uniqueVisitors), cur: kpis.uniqueVisitors, prev: prevKpis.uniqueVisitors },
    { label: "pageviews", value: fmtNum(kpis.pageviews), cur: kpis.pageviews, prev: prevKpis.pageviews },
    { label: "pv / sessão", value: kpis.pagesPerSession.toFixed(2), cur: kpis.pagesPerSession, prev: prevKpis.pagesPerSession },
    { label: "tempo engajado", value: fmtMs(kpis.avgEngagementMs), cur: kpis.avgEngagementMs, prev: prevKpis.avgEngagementMs },
    { label: "bounce rate", value: fmtPct(kpis.bounceRate), cur: kpis.bounceRate, prev: prevKpis.bounceRate },
    { label: "conversões", value: fmtNum(kpis.conversions), cur: kpis.conversions, prev: prevKpis.conversions },
    { label: "taxa de conversão", value: fmtPct(kpis.conversionRate), cur: kpis.conversionRate, prev: prevKpis.conversionRate },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* KPI strip */}
      <div className="aa-kpi-grid">
        {kpiList.map((k) => {
          const d = delta(k.cur, k.prev);
          // for bounce rate, "down" is good. invert color logic
          const invert = k.label === "bounce rate";
          const dir = invert ? (d.dir === "up" ? "down" : d.dir === "down" ? "up" : "flat") : d.dir;
          return (
            <div key={k.label} className="aa-kpi">
              <span className="aa-kpi__label">{k.label}</span>
              <span className="aa-kpi__value">{k.value}</span>
              {comparePrev && (
                <span className="aa-kpi__delta" data-dir={dir}>
                  {d.dir === "up" ? "↑" : d.dir === "down" ? "↓" : "·"} {d.txt}
                </span>
              )}
              <div className="aa-kpi__spark">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily.slice(-14)}>
                    <Area
                      type="monotone"
                      dataKey={k.label === "pageviews" ? "pageviews" : "sessions"}
                      stroke="var(--aa-accent)"
                      fill="var(--aa-accent)"
                      fillOpacity={0.15}
                      strokeWidth={1.2}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main chart + heatmap */}
      <div className="aa-grid">
        <div className="aa-col-8 aa-card">
          <div className="aa-card__head">
            <h3 className="aa-card__title">série temporal</h3>
            <div className="aa-row" style={{ gap: 4 }}>
              <button
                type="button"
                className="admin-analytics__btn"
                data-variant="ghost"
                aria-pressed={metric === "sessions"}
                onClick={() => setMetric("sessions")}
                style={{ fontSize: 11, padding: "3px 8px" }}
              >
                sessões
              </button>
              <button
                type="button"
                className="admin-analytics__btn"
                data-variant="ghost"
                aria-pressed={metric === "pageviews"}
                onClick={() => setMetric("pageviews")}
                style={{ fontSize: 11, padding: "3px 8px" }}
              >
                pageviews
              </button>
            </div>
          </div>
          <div style={{ height: 280, color: "var(--aa-fg)" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="g-cur" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--aa-accent)" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="var(--aa-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--aa-border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(d: string) => d.slice(5).replace("-", "/")}
                  tick={{ fontSize: 10, fontFamily: "var(--aa-font-mono)", fill: "var(--aa-fg-faint)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fontFamily: "var(--aa-font-mono)", fill: "var(--aa-fg-faint)" }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--aa-bg-elev)",
                    border: "1px solid var(--aa-border)",
                    borderRadius: 6,
                    fontFamily: "var(--aa-font-mono)",
                    fontSize: 11,
                    color: "var(--aa-fg)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke="var(--aa-accent)"
                  strokeWidth={1.6}
                  fill="url(#g-cur)"
                  name="atual"
                  isAnimationActive={false}
                />
                {comparePrev && (
                  <Line
                    type="monotone"
                    dataKey={metric === "sessions" ? "prevSessions" : "prevPageviews"}
                    stroke="var(--aa-fg-faint)"
                    strokeWidth={1.2}
                    strokeDasharray="3 4"
                    dot={false}
                    name="anterior"
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="aa-col-4 aa-card">
          <div className="aa-card__head">
            <h3 className="aa-card__title">hora × dia da semana</h3>
            <span className="aa-card__action">sessões únicas</span>
          </div>
          <HoursHeatmap events={heatmapEvents} />
        </div>
      </div>
    </div>
  );
}
