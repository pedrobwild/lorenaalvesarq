/**
 * AcquisitionTab — aba "Aquisição".
 *
 * Mostra 4 tabelas de canais (UTM source / medium / campaign / referrer host)
 * usando a RPC `analytics_breakdown`. Cada linha clicável vira um segmento
 * ativo no shell (drill-down), abrindo o resto do painel já filtrado.
 *
 * Colunas: dim · sessões (com bar) · conversões · bounce % · tempo médio
 * Comparativo com período anterior é exibido como Δ% no número de sessões.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange, Segment, SegmentDim } from "./types";

type Row = {
  dim: string;
  sessions: number;
  conversions: number;
  bounce_rate: number;
  avg_duration_s: number;
  prev_sessions?: number;
};

type Group = {
  dim: SegmentDim;
  label: string;
  hint: string;
};

const GROUPS: Group[] = [
  { dim: "utm_source",    label: "UTM source",    hint: "origem da campanha (google, instagram, newsletter…)" },
  { dim: "utm_medium",    label: "UTM medium",    hint: "tipo de mídia (cpc, social, email, organic…)" },
  { dim: "utm_campaign",  label: "UTM campaign",  hint: "nome da campanha (lançamento, retomada-março…)" },
  { dim: "referrer_host", label: "referrer host", hint: "domínio que enviou tráfego (instagram.com, google.com…)" },
];

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}
function fmtPct(n: number): string {
  return `${(n * (n <= 1 ? 100 : 1)).toFixed(1)}%`;
}
function fmtDur(s: number): string {
  if (!s) return "0:00";
  const total = Math.round(s);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function deltaPct(cur: number, prev?: number): { txt: string; dir: "up" | "down" | "flat" } {
  if (!prev && !cur) return { txt: "—", dir: "flat" };
  if (!prev) return { txt: "novo", dir: "up" };
  const d = ((cur - prev) / prev) * 100;
  const dir: "up" | "down" | "flat" = d > 0.5 ? "up" : d < -0.5 ? "down" : "flat";
  return { txt: `${d > 0 ? "+" : ""}${d.toFixed(0)}%`, dir };
}

type Props = {
  range: DateRange;
  comparePrev: boolean;
  segments: Segment[];
  onAddSegment: (s: Segment) => void;
  onRemoveSegment: (dim: SegmentDim) => void;
};

type State = {
  loading: boolean;
  error: string | null;
  data: Record<SegmentDim, Row[]>;
};

const EMPTY_DATA: Record<SegmentDim, Row[]> = {
  utm_source: [],
  utm_medium: [],
  utm_campaign: [],
  referrer_host: [],
  device: [],
  country: [],
  landing_path: [],
};

/**
 * Nota: a RPC `analytics_breakdown` (assinatura atual) aceita apenas
 * (p_since, p_until, p_dim, p_limit). Segmentos do shell são respeitados
 * apenas para destaque visual (linha ativa) — drill-down adiciona o segmento
 * à URL e o resto do painel filtra normalmente. Para filtrar a própria tabela
 * por segmentos cruzados, será necessário criar `analytics_breakdown_v2`.
 */

export default function AcquisitionTab({
  range,
  comparePrev,
  segments,
  onAddSegment,
  onRemoveSegment,
}: Props) {
  const [state, setState] = useState<State>({ loading: true, error: null, data: EMPTY_DATA });

  const prevRange = useMemo<DateRange | null>(() => {
    if (!comparePrev) return null;
    const ms = range.to.getTime() - range.from.getTime();
    const to = new Date(range.from.getTime() - 1);
    const from = new Date(to.getTime() - ms);
    return { from, to };
  }, [range, comparePrev]);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    const sinceISO = range.from.toISOString();
    const untilISO = range.to.toISOString();
    const sa = segArgs(segments);

    const curCalls = GROUPS.map((g) =>
      Promise.resolve(
        supabase.rpc("analytics_breakdown", {
          p_since: sinceISO,
          p_until: untilISO,
          p_dim: g.dim,
          p_limit: 25,
          ...sa,
        })
      )
    );
    const prevCalls = prevRange
      ? GROUPS.map((g) =>
          Promise.resolve(
            supabase.rpc("analytics_breakdown", {
              p_since: prevRange.from.toISOString(),
              p_until: sinceISO,
              p_dim: g.dim,
              p_limit: 25,
              ...sa,
            })
          )
        )
      : null;

    Promise.all([Promise.all(curCalls), prevCalls ? Promise.all(prevCalls) : Promise.resolve(null)])
      .then(([curRes, prevRes]) => {
        if (cancelled) return;
        const next: Record<SegmentDim, Row[]> = { ...EMPTY_DATA };
        GROUPS.forEach((g, i) => {
          type RpcRes = { data: Row[] | null; error: { message: string } | null };
          const cr = curRes[i] as unknown as RpcRes;
          if (cr.error) throw new Error(cr.error.message);
          const rows = (cr.data ?? []).map((r) => ({
            ...r,
            sessions: Number(r.sessions ?? 0),
            conversions: Number(r.conversions ?? 0),
            bounce_rate: Number(r.bounce_rate ?? 0),
            avg_duration_s: Number(r.avg_duration_s ?? 0),
          }));

          if (prevRes) {
            const pr = prevRes[i] as unknown as RpcRes;
            if (!pr.error) {
              const prevMap = new Map<string, number>();
              for (const r of pr.data ?? []) prevMap.set(r.dim, Number(r.sessions ?? 0));
              for (const r of rows) r.prev_sessions = prevMap.get(r.dim) ?? 0;
            }
          }
          next[g.dim] = rows;
        });
        setState({ loading: false, error: null, data: next });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[acquisition] rpc error", err);
        if (!cancelled) setState({ loading: false, error: msg, data: EMPTY_DATA });
      });

    return () => {
      cancelled = true;
    };
  }, [range, prevRange, segments]);

  function isActiveSegment(dim: SegmentDim, value: string) {
    return segments.some((s) => s.dim === dim && s.value === value);
  }

  function toggleSegment(dim: SegmentDim, value: string) {
    if (isActiveSegment(dim, value)) onRemoveSegment(dim);
    else onAddSegment({ dim, value });
  }

  if (state.loading) {
    return (
      <div className="aa-grid">
        {GROUPS.map((g) => (
          <div key={g.dim} className="aa-col-6 aa-skel" style={{ height: 280 }} />
        ))}
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="aa-empty">
        <span className="aa-empty__icon">!</span>
        erro ao carregar · <span className="aa-mono">{state.error}</span>
      </div>
    );
  }

  return (
    <div className="aa-grid">
      {GROUPS.map((g) => {
        const rows = state.data[g.dim];
        const max = rows.reduce((acc, r) => Math.max(acc, r.sessions), 0) || 1;
        return (
          <div key={g.dim} className="aa-col-6 aa-card">
            <div className="aa-card__head">
              <h3 className="aa-card__title">{g.label}</h3>
              <span className="aa-card__action aa-faint">{g.hint}</span>
            </div>
            {rows.length === 0 ? (
              <div className="aa-empty" style={{ padding: "24px 0", border: "none" }}>
                <span className="aa-empty__icon">∅</span>
                sem dados neste período
              </div>
            ) : (
              <div style={{ overflow: "auto" }}>
                <table className="aa-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 140 }}>{g.dim.replace("_", " ")}</th>
                      <th className="num">sessões</th>
                      {comparePrev && <th className="num">Δ</th>}
                      <th className="num">conv.</th>
                      <th className="num">bounce</th>
                      <th className="num">tempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const active = isActiveSegment(g.dim, r.dim);
                      const d = comparePrev ? deltaPct(r.sessions, r.prev_sessions) : null;
                      return (
                        <tr
                          key={r.dim}
                          onClick={() => toggleSegment(g.dim, r.dim)}
                          style={{
                            cursor: "pointer",
                            background: active ? "var(--aa-row-hover)" : undefined,
                          }}
                          title={active ? "clique para remover filtro" : "clique para filtrar por este valor"}
                        >
                          <td>
                            <div style={{ display: "grid", gap: 4 }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {active && (
                                  <span
                                    aria-hidden
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      background: "var(--aa-accent)",
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                                  {r.dim}
                                </span>
                              </span>
                              <div
                                aria-hidden
                                style={{
                                  height: 3,
                                  width: `${(r.sessions / max) * 100}%`,
                                  background: "var(--aa-accent)",
                                  opacity: 0.55,
                                  borderRadius: 2,
                                }}
                              />
                            </div>
                          </td>
                          <td className="num aa-mono">{fmtNum(r.sessions)}</td>
                          {comparePrev && d && (
                            <td className="num aa-mono">
                              <span
                                style={{
                                  color:
                                    d.dir === "up"
                                      ? "var(--aa-accent-conversions)"
                                      : d.dir === "down"
                                        ? "var(--aa-accent-negative)"
                                        : "var(--aa-fg-faint)",
                                }}
                              >
                                {d.txt}
                              </span>
                            </td>
                          )}
                          <td className="num aa-mono">{fmtNum(r.conversions)}</td>
                          <td className="num aa-mono">{fmtPct(r.bounce_rate)}</td>
                          <td className="num aa-mono">{fmtDur(r.avg_duration_s)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
