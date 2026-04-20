/**
 * BehaviorTab — aba "Comportamento".
 *
 * 3 cartões:
 *  - Top páginas (analytics_top_paths_v2) com sessões + pageviews
 *  - Top projetos (analytics_top_projects_v2) com views + sessões
 *  - Heatmap hora × dia da semana (analytics_hours_dow), TZ São Paulo
 *
 * Todos os 3 respeitam os segmentos ativos do shell. Clique em uma linha
 * de "top páginas" cria/remove um segmento landing_path (drill-down).
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange, Segment, SegmentDim } from "./types";

type PathRow = { path: string; pageviews: number; sessions: number };
type ProjRow = { project_slug: string; views: number; sessions: number };
type HourCell = { dow: number; hour: number; sessions: number };

type Props = {
  range: DateRange;
  segments: Segment[];
  onAddSegment: (s: Segment) => void;
  onRemoveSegment: (dim: SegmentDim) => void;
};

const DAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

/** Converte segmentos ativos em parâmetros nomeados das RPCs. */
function segArgs(segments: Segment[]): Record<string, string | null> {
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

export default function BehaviorTab({ range, segments, onAddSegment, onRemoveSegment }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paths, setPaths] = useState<PathRow[]>([]);
  const [projects, setProjects] = useState<ProjRow[]>([]);
  const [hours, setHours] = useState<HourCell[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const sinceISO = range.from.toISOString();
    const untilISO = range.to.toISOString();
    const sa = segArgs(segments);

    Promise.all([
      Promise.resolve(
        supabase.rpc("analytics_top_paths_v2", { p_since: sinceISO, p_until: untilISO, p_limit: 25, ...sa })
      ),
      Promise.resolve(
        supabase.rpc("analytics_top_projects_v2", { p_since: sinceISO, p_until: untilISO, p_limit: 15, ...sa })
      ),
      Promise.resolve(
        supabase.rpc("analytics_hours_dow", { p_since: sinceISO, p_until: untilISO, ...sa })
      ),
    ])
      .then(([pRes, prRes, hRes]) => {
        if (cancelled) return;
        type RpcRes<T> = { data: T | null; error: { message: string } | null };
        const a = pRes as unknown as RpcRes<PathRow[]>;
        const b = prRes as unknown as RpcRes<ProjRow[]>;
        const c = hRes as unknown as RpcRes<HourCell[]>;
        if (a.error) throw new Error(a.error.message);
        if (b.error) throw new Error(b.error.message);
        if (c.error) throw new Error(c.error.message);
        setPaths((a.data ?? []).map((r) => ({
          path: r.path,
          pageviews: Number(r.pageviews ?? 0),
          sessions: Number(r.sessions ?? 0),
        })));
        setProjects((b.data ?? []).map((r) => ({
          project_slug: r.project_slug,
          views: Number(r.views ?? 0),
          sessions: Number(r.sessions ?? 0),
        })));
        setHours((c.data ?? []).map((r) => ({
          dow: Number(r.dow),
          hour: Number(r.hour),
          sessions: Number(r.sessions ?? 0),
        })));
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[behavior] rpc error", err);
        if (!cancelled) setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range, segments]);

  const isActive = (dim: SegmentDim, value: string) =>
    segments.some((s) => s.dim === dim && s.value === value);

  const togglePath = (path: string) => {
    if (isActive("landing_path", path)) onRemoveSegment("landing_path");
    else onAddSegment({ dim: "landing_path", value: path });
  };

  if (loading) {
    return (
      <div className="aa-grid">
        <div className="aa-col-6 aa-skel" style={{ height: 320 }} />
        <div className="aa-col-6 aa-skel" style={{ height: 320 }} />
        <div className="aa-col-12 aa-skel" style={{ height: 280 }} />
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

  const pathMax = paths.reduce((m, r) => Math.max(m, r.pageviews), 0) || 1;
  const projMax = projects.reduce((m, r) => Math.max(m, r.views), 0) || 1;

  return (
    <div className="aa-grid">
      {/* Top páginas */}
      <div className="aa-col-6 aa-card">
        <div className="aa-card__head">
          <h3 className="aa-card__title">top páginas</h3>
          <span className="aa-card__action aa-faint">clique para filtrar por landing_path</span>
        </div>
        {paths.length === 0 ? (
          <Empty />
        ) : (
          <div style={{ overflow: "auto" }}>
            <table className="aa-table">
              <thead>
                <tr>
                  <th>página</th>
                  <th className="num">pv</th>
                  <th className="num">sessões</th>
                </tr>
              </thead>
              <tbody>
                {paths.map((r) => {
                  const active = isActive("landing_path", r.path);
                  return (
                    <tr
                      key={r.path}
                      onClick={() => togglePath(r.path)}
                      style={{ cursor: "pointer", background: active ? "var(--aa-row-hover)" : undefined }}
                      title={active ? "clique para remover filtro" : "clique para filtrar"}
                    >
                      <td>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {active && (
                              <span aria-hidden style={dotStyle} />
                            )}
                            <span style={ellipsisStyle}>{r.path}</span>
                          </span>
                          <Bar value={r.pageviews} max={pathMax} />
                        </div>
                      </td>
                      <td className="num aa-mono">{fmtNum(r.pageviews)}</td>
                      <td className="num aa-mono">{fmtNum(r.sessions)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top projetos */}
      <div className="aa-col-6 aa-card">
        <div className="aa-card__head">
          <h3 className="aa-card__title">top projetos</h3>
          <span className="aa-card__action aa-faint">eventos project_view</span>
        </div>
        {projects.length === 0 ? (
          <Empty />
        ) : (
          <div style={{ overflow: "auto" }}>
            <table className="aa-table">
              <thead>
                <tr>
                  <th>projeto</th>
                  <th className="num">views</th>
                  <th className="num">sessões</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((r) => (
                  <tr key={r.project_slug}>
                    <td>
                      <div style={{ display: "grid", gap: 4 }}>
                        <span style={ellipsisStyle}>{r.project_slug}</span>
                        <Bar value={r.views} max={projMax} />
                      </div>
                    </td>
                    <td className="num aa-mono">{fmtNum(r.views)}</td>
                    <td className="num aa-mono">{fmtNum(r.sessions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Heatmap */}
      <div className="aa-col-12 aa-card">
        <div className="aa-card__head">
          <h3 className="aa-card__title">hora × dia da semana</h3>
          <span className="aa-card__action aa-faint">sessões únicas · TZ São Paulo</span>
        </div>
        <ServerHeatmap cells={hours} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------
const dotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "var(--aa-accent)",
  flexShrink: 0,
};
const ellipsisStyle: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: 320,
  display: "inline-block",
};

function Empty() {
  return (
    <div className="aa-empty" style={{ padding: "24px 0", border: "none" }}>
      <span className="aa-empty__icon">∅</span>
      sem dados neste período
    </div>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div
      aria-hidden
      style={{
        height: 3,
        width: `${(value / max) * 100}%`,
        background: "var(--aa-accent)",
        opacity: 0.55,
        borderRadius: 2,
      }}
    />
  );
}

/** Heatmap 7×24 baseado em dados já agregados pela RPC. */
function ServerHeatmap({ cells }: { cells: HourCell[] }) {
  const { matrix, max, totalByDay, peak } = useMemo(() => {
    const m: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    for (const c of cells) {
      if (c.dow >= 0 && c.dow < 7 && c.hour >= 0 && c.hour < 24) {
        m[c.dow][c.hour] = c.sessions;
      }
    }
    let mx = 0;
    let pk = { day: 0, hour: 0, value: 0 };
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (m[d][h] > mx) mx = m[d][h];
        if (m[d][h] > pk.value) pk = { day: d, hour: h, value: m[d][h] };
      }
    }
    const t = m.map((row) => row.reduce((a, b) => a + b, 0));
    return { matrix: m, max: mx, totalByDay: t, peak: pk };
  }, [cells]);

  if (max === 0) return <Empty />;

  const bestDay = totalByDay.indexOf(Math.max(...totalByDay));

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        role="img"
        aria-label="mapa de calor de visitas por dia e hora"
        style={{
          display: "grid",
          gridTemplateColumns: "32px repeat(24, 1fr)",
          gap: 2,
          fontFamily: "var(--aa-font-mono)",
          fontSize: 10,
          color: "var(--aa-fg-faint)",
        }}
      >
        <div />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={`h-${h}`} style={{ textAlign: "center" }}>
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </div>
        ))}
        {DAYS.map((label, d) => (
          <>
            <div key={`l-${d}`} style={{ textAlign: "right", paddingRight: 4 }}>
              {label}
            </div>
            {matrix[d].map((v, h) => {
              const isPeak = peak.day === d && peak.hour === h && v > 0;
              const intensity = max ? v / max : 0;
              return (
                <div
                  key={`c-${d}-${h}`}
                  title={`${label} ${String(h).padStart(2, "0")}h — ${v} sessões`}
                  aria-label={`${label} ${h}h: ${v} sessões`}
                  style={{
                    height: 18,
                    borderRadius: 3,
                    background:
                      v === 0
                        ? "var(--aa-bg-soft)"
                        : `color-mix(in srgb, var(--aa-accent) ${15 + intensity * 75}%, transparent)`,
                    outline: isPeak ? "1px solid var(--aa-accent)" : undefined,
                    outlineOffset: isPeak ? -1 : undefined,
                  }}
                />
              );
            })}
          </>
        ))}
      </div>
      <aside
        className="aa-mono"
        style={{
          display: "flex",
          gap: 16,
          fontSize: 11,
          color: "var(--aa-fg-faint)",
          flexWrap: "wrap",
        }}
      >
        <span>
          pico:{" "}
          <strong style={{ color: "var(--aa-fg)" }}>
            {DAYS[peak.day]} {String(peak.hour).padStart(2, "0")}h
          </strong>{" "}
          ({peak.value} sessões)
        </span>
        <span>
          dia mais ativo:{" "}
          <strong style={{ color: "var(--aa-fg)" }}>
            {DAYS[bestDay]}
          </strong>{" "}
          ({totalByDay[bestDay]})
        </span>
      </aside>
    </div>
  );
}
