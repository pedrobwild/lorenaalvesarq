/**
 * OverviewTab — aba "Visão executiva" (server-side).
 *
 * Usa duas RPCs:
 *   - analytics_overview_kpis(since, until, ...filters): KPIs + sparkline (14d)
 *   - analytics_timeseries(since, until, grain): série diária para o chart principal
 *
 * O cliente nunca puxa eventos brutos. Todos os filtros de segmento são
 * traduzidos em parâmetros nomeados da RPC. Comparativo com período anterior
 * faz uma segunda chamada paralela com a janela equivalente.
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
import type { DateRange, Segment, SegmentDim } from "./types";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
type Kpis = {
  sessions: number;
  unique_visitors: number;
  pageviews: number;
  pages_per_session: number;
  avg_engagement_ms: number;
  bounce_rate: number;
  conversions: number;
  conversion_rate: number;
  spark: { d: string; sessions: number; pageviews: number }[];
};

type DailyPoint = {
  day: string;
  sessions: number;
  pageviews: number;
  prevSessions?: number;
  prevPageviews?: number;
};

const EMPTY_KPIS: Kpis = {
  sessions: 0,
  unique_visitors: 0,
  pageviews: 0,
  pages_per_session: 0,
  avg_engagement_ms: 0,
  bounce_rate: 0,
  conversions: 0,
  conversion_rate: 0,
  spark: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
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

/** Converte segmentos ativos em parâmetros nomeados da RPC. */
function segmentsToRpcArgs(segments: Segment[]): Record<string, string | null> {
  const map: Partial<Record<SegmentDim, string>> = {};
  for (const s of segments) map[s.dim] = s.value;
  return {
    p_device: map.device ?? null,
    p_country: map.country ?? null,
    p_utm_source: map.utm_source ?? null,
    p_utm_medium: map.utm_medium ?? null,
    p_utm_campaign: map.utm_campaign ?? null,
    p_landing_path: map.landing_path ?? null,
    p_referrer_host: map.referrer_host ?? null,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
type Props = {
  range: DateRange;
  segments: Segment[];
  comparePrev: boolean;
};

export default function OverviewTab({ range, segments, comparePrev }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<Kpis>(EMPTY_KPIS);
  const [prevKpis, setPrevKpis] = useState<Kpis>(EMPTY_KPIS);
  const [series, setSeries] = useState<DailyPoint[]>([]);
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
    setError(null);

    const segArgs = segmentsToRpcArgs(segments);
    const sinceISO = range.from.toISOString();
    const untilISO = range.to.toISOString();

    // grain heurístico: ≤2 dias = hora, ≤90 = dia, ≤365 = semana, > = mês
    const days = (range.to.getTime() - range.from.getTime()) / 86400_000;
    const grain: "hour" | "day" | "week" | "month" =
      days <= 2 ? "hour" : days <= 90 ? "day" : days <= 365 ? "week" : "month";

    const calls: Promise<unknown>[] = [
      supabase.rpc("analytics_overview_kpis", {
        p_since: sinceISO,
        p_until: untilISO,
        ...segArgs,
      }),
      supabase.rpc("analytics_timeseries", {
        p_since: sinceISO,
        p_until: untilISO,
        p_grain: grain,
      }),
    ];

    if (prevRange) {
      calls.push(
        supabase.rpc("analytics_overview_kpis", {
          p_since: prevRange.from.toISOString(),
          p_until: sinceISO,
          ...segArgs,
        }),
        supabase.rpc("analytics_timeseries", {
          p_since: prevRange.from.toISOString(),
          p_until: sinceISO,
          p_grain: grain,
        })
      );
    }

    Promise.all(calls)
      .then((results) => {
        if (cancelled) return;
        type RpcRes<T> = { data: T | null; error: { message: string } | null };

        const kpiRes = results[0] as RpcRes<Kpis[]>;
        const tsRes = results[1] as RpcRes<{ bucket: string; sessions: number; pageviews: number; conversions: number }[]>;

        if (kpiRes.error) throw new Error(kpiRes.error.message);
        if (tsRes.error) throw new Error(tsRes.error.message);

        const k = kpiRes.data?.[0] ?? EMPTY_KPIS;
        // spark vem como jsonb; pode chegar como objeto já parseado
        const sparkRaw = (k as unknown as { spark?: unknown }).spark;
        const spark = Array.isArray(sparkRaw)
          ? (sparkRaw as Kpis["spark"])
          : typeof sparkRaw === "string"
            ? (JSON.parse(sparkRaw) as Kpis["spark"])
            : [];
        setKpis({ ...k, spark });

        const ts = tsRes.data ?? [];
        const main: DailyPoint[] = ts.map((p) => ({
          day: p.bucket,
          sessions: Number(p.sessions ?? 0),
          pageviews: Number(p.pageviews ?? 0),
        }));

        if (prevRange) {
          const prevKpiRes = results[2] as RpcRes<Kpis[]>;
          const prevTsRes = results[3] as RpcRes<{ bucket: string; sessions: number; pageviews: number }[]>;
          if (prevKpiRes.error) throw new Error(prevKpiRes.error.message);
          if (prevTsRes.error) throw new Error(prevTsRes.error.message);

          const pk = prevKpiRes.data?.[0] ?? EMPTY_KPIS;
          const pSparkRaw = (pk as unknown as { spark?: unknown }).spark;
          const pSpark = Array.isArray(pSparkRaw)
            ? (pSparkRaw as Kpis["spark"])
            : typeof pSparkRaw === "string"
              ? (JSON.parse(pSparkRaw) as Kpis["spark"])
              : [];
          setPrevKpis({ ...pk, spark: pSpark });

          // alinha série anterior ao mesmo offset da série atual
          const prevTs = prevTsRes.data ?? [];
          for (let i = 0; i < main.length; i++) {
            const p = prevTs[i];
            if (!p) continue;
            main[i].prevSessions = Number(p.sessions ?? 0);
            main[i].prevPageviews = Number(p.pageviews ?? 0);
          }
        } else {
          setPrevKpis(EMPTY_KPIS);
        }

        setSeries(main);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[analytics overview] rpc error", err);
        if (!cancelled) setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range, prevRange, segments]);

  // ----- render -----
  if (loading) {
    return (
      <div className="aa-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aa-col-3 aa-skel" style={{ height: 92 }} />
        ))}
        <div className="aa-col-12 aa-skel" style={{ height: 320 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="aa-empty">
        <span className="aa-empty__icon">!</span>
        erro ao carregar · <span className="aa-mono">{error}</span>
      </div>
    );
  }

  if (!kpis.sessions && !prevKpis.sessions) {
    return (
      <div className="aa-empty">
        <span className="aa-empty__icon">∅</span>
        sem eventos no período · tente ajustar o intervalo ou os segmentos
      </div>
    );
  }

  const kpiList: { label: string; value: string; cur: number; prev: number; sparkKey: "sessions" | "pageviews" }[] = [
    { label: "sessões",            value: fmtNum(kpis.sessions),           cur: kpis.sessions,           prev: prevKpis.sessions,           sparkKey: "sessions" },
    { label: "visitantes únicos",  value: fmtNum(kpis.unique_visitors),    cur: kpis.unique_visitors,    prev: prevKpis.unique_visitors,    sparkKey: "sessions" },
    { label: "pageviews",          value: fmtNum(kpis.pageviews),          cur: kpis.pageviews,          prev: prevKpis.pageviews,          sparkKey: "pageviews" },
    { label: "pv / sessão",        value: kpis.pages_per_session.toFixed(2), cur: kpis.pages_per_session, prev: prevKpis.pages_per_session, sparkKey: "pageviews" },
    { label: "tempo engajado",     value: fmtMs(kpis.avg_engagement_ms),   cur: kpis.avg_engagement_ms,  prev: prevKpis.avg_engagement_ms,  sparkKey: "sessions" },
    { label: "bounce rate",        value: fmtPct(kpis.bounce_rate),        cur: kpis.bounce_rate,        prev: prevKpis.bounce_rate,        sparkKey: "sessions" },
    { label: "conversões",         value: fmtNum(kpis.conversions),        cur: kpis.conversions,        prev: prevKpis.conversions,        sparkKey: "sessions" },
    { label: "taxa de conversão",  value: fmtPct(kpis.conversion_rate),    cur: kpis.conversion_rate,    prev: prevKpis.conversion_rate,    sparkKey: "sessions" },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* KPI strip */}
      <div className="aa-kpi-grid">
        {kpiList.map((k) => {
          const d = delta(k.cur, k.prev);
          // bounce rate: cair é bom — inverte a cor do delta
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
                  <AreaChart data={kpis.spark}>
                    <Area
                      type="monotone"
                      dataKey={k.sparkKey}
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

      {/* Main chart */}
      <div className="aa-card">
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
        <div style={{ height: 300, color: "var(--aa-fg)" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="g-cur" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--aa-accent)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--aa-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--aa-border)" vertical={false} />
              <XAxis
                dataKey="day"
                tickFormatter={(d: string) => {
                  const dt = new Date(d);
                  if (Number.isNaN(dt.getTime())) return d;
                  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
                }}
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
                labelFormatter={(d: string) => {
                  const dt = new Date(d);
                  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleString("pt-BR");
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
    </div>
  );
}
