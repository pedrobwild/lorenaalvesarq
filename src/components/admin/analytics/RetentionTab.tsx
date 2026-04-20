/**
 * RetentionTab — aba "Retenção".
 *
 * Matriz de coortes semanais (analytics_retention):
 *  - Linhas: semana de primeira visita (cohort_week)
 *  - Colunas: week_offset (W0, W1, W2…)
 *  - Células: % de visitantes da coorte que voltaram naquela semana
 *
 * A RPC ignora p_until/segmentos — usa p_since e p_weeks.
 * Aqui derivamos p_since a partir de range.from e p_weeks a partir do tamanho da janela
 * (limitado a 12 para manter a tabela legível).
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange, Segment } from "./types";

type Row = { cohort_week: string; week_offset: number; visitors: number };

type Props = {
  range: DateRange;
  segments: Segment[];
};

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}
function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(0)}%`;
}
function fmtCohortLabel(iso: string): string {
  // iso é YYYY-MM-DD vindo da RPC (date)
  const d = new Date(`${iso}T00:00:00`);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

export default function RetentionTab({ range, segments }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  // p_weeks derivado do range, capado em 12
  const weeks = useMemo(() => {
    const ms = range.to.getTime() - range.from.getTime();
    const w = Math.ceil(ms / (7 * 86400_000));
    return Math.max(2, Math.min(12, w));
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.resolve(
      supabase.rpc("analytics_retention", {
        p_since: range.from.toISOString(),
        p_weeks: weeks,
      })
    )
      .then((res) => {
        if (cancelled) return;
        type RpcRes = { data: Row[] | null; error: { message: string } | null };
        const r = res as unknown as RpcRes;
        if (r.error) throw new Error(r.error.message);
        setRows(
          (r.data ?? []).map((row) => ({
            cohort_week: String(row.cohort_week),
            week_offset: Number(row.week_offset),
            visitors: Number(row.visitors ?? 0),
          }))
        );
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[retention] rpc error", err);
        if (!cancelled) setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range, weeks]);

  // Constrói matriz: cohort -> { offset -> visitors }
  const matrix = useMemo(() => {
    const cohorts = new Map<string, Map<number, number>>();
    for (const r of rows) {
      if (!cohorts.has(r.cohort_week)) cohorts.set(r.cohort_week, new Map());
      cohorts.get(r.cohort_week)!.set(r.week_offset, r.visitors);
    }
    const sortedCohorts = [...cohorts.keys()].sort();
    return { cohorts, sortedCohorts };
  }, [rows]);

  // KPIs agregados
  const kpis = useMemo(() => {
    const { cohorts, sortedCohorts } = matrix;
    let totalNew = 0;
    let w1Sum = 0;
    let w1Count = 0;
    let w4Sum = 0;
    let w4Count = 0;
    for (const c of sortedCohorts) {
      const m = cohorts.get(c)!;
      const w0 = m.get(0) ?? 0;
      if (w0 > 0) {
        totalNew += w0;
        const w1 = m.get(1);
        if (w1 !== undefined) {
          w1Sum += (w1 / w0) * 100;
          w1Count++;
        }
        const w4 = m.get(4);
        if (w4 !== undefined) {
          w4Sum += (w4 / w0) * 100;
          w4Count++;
        }
      }
    }
    return {
      cohortCount: sortedCohorts.length,
      totalNew,
      avgW1: w1Count > 0 ? w1Sum / w1Count : 0,
      avgW4: w4Count > 0 ? w4Sum / w4Count : 0,
    };
  }, [matrix]);

  if (loading) {
    return (
      <div className="aa-grid">
        <div className="aa-col-3 aa-skel" style={{ height: 110 }} />
        <div className="aa-col-3 aa-skel" style={{ height: 110 }} />
        <div className="aa-col-3 aa-skel" style={{ height: 110 }} />
        <div className="aa-col-3 aa-skel" style={{ height: 110 }} />
        <div className="aa-col-12 aa-skel" style={{ height: 420 }} />
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

  if (matrix.sortedCohorts.length === 0) {
    return (
      <div className="aa-empty">
        <span className="aa-empty__icon">∅</span>
        sem dados de retenção neste período · amplie o intervalo
      </div>
    );
  }

  return (
    <div className="aa-grid">
      {segments.length > 0 && (
        <div className="aa-col-12">
          <div
            className="aa-faint aa-mono"
            style={{
              fontSize: 11,
              padding: "8px 12px",
              border: "1px dashed var(--aa-border)",
              borderRadius: 6,
              background: "var(--aa-bg-soft)",
            }}
          >
            ⓘ retenção global · segmentos ativos não se aplicam aqui (ainda)
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="aa-col-3 aa-card">
        <div className="aa-kpi__label">coortes</div>
        <div className="aa-kpi__value">{kpis.cohortCount}</div>
        <div className="aa-kpi__delta aa-faint" style={{ fontSize: 11 }}>
          janela: {weeks} semanas
        </div>
      </div>
      <div className="aa-col-3 aa-card">
        <div className="aa-kpi__label">novos visitantes</div>
        <div className="aa-kpi__value">{fmtNum(kpis.totalNew)}</div>
        <div className="aa-kpi__delta aa-faint" style={{ fontSize: 11 }}>
          soma de W0 · todas as coortes
        </div>
      </div>
      <div className="aa-col-3 aa-card">
        <div className="aa-kpi__label">retorno W1</div>
        <div className="aa-kpi__value">{fmtPct(kpis.avgW1)}</div>
        <div className="aa-kpi__delta aa-faint" style={{ fontSize: 11 }}>
          média entre coortes
        </div>
      </div>
      <div className="aa-col-3 aa-card">
        <div className="aa-kpi__label">retorno W4</div>
        <div className="aa-kpi__value">{fmtPct(kpis.avgW4)}</div>
        <div className="aa-kpi__delta aa-faint" style={{ fontSize: 11 }}>
          média entre coortes
        </div>
      </div>

      {/* Matriz de coortes */}
      <div className="aa-col-12 aa-card">
        <div className="aa-card__head">
          <h3 className="aa-card__title">matriz de coortes semanais</h3>
          <span className="aa-card__action aa-faint">
            % de visitantes da coorte que retornaram · W0 = semana de origem
          </span>
        </div>
        <CohortMatrix
          cohorts={matrix.sortedCohorts}
          getRow={(c) => matrix.cohorts.get(c)!}
          weeks={weeks}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CohortMatrix
// ---------------------------------------------------------------------------
function CohortMatrix({
  cohorts,
  getRow,
  weeks,
}: {
  cohorts: string[];
  getRow: (cohort: string) => Map<number, number>;
  weeks: number;
}) {
  const offsets = Array.from({ length: weeks + 1 }, (_, i) => i);

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        className="aa-table"
        style={{ borderCollapse: "separate", borderSpacing: 2, minWidth: 720 }}
      >
        <thead>
          <tr>
            <th style={{ textAlign: "left", paddingRight: 12 }}>coorte</th>
            <th className="num" style={{ paddingRight: 12 }}>tam.</th>
            {offsets.map((o) => (
              <th
                key={o}
                className="num aa-mono"
                style={{ fontSize: 10, color: "var(--aa-fg-faint)", padding: "4px 6px" }}
              >
                W{o}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => {
            const row = getRow(c);
            const w0 = row.get(0) ?? 0;
            return (
              <tr key={c}>
                <td className="aa-mono" style={{ fontSize: 11, paddingRight: 12 }}>
                  {fmtCohortLabel(c)}
                </td>
                <td className="num aa-mono" style={{ paddingRight: 12 }}>
                  {fmtNum(w0)}
                </td>
                {offsets.map((o) => {
                  const v = row.get(o);
                  if (v === undefined || w0 === 0) {
                    return (
                      <td
                        key={o}
                        style={{
                          padding: 0,
                          width: 56,
                          height: 32,
                          background: "var(--aa-bg-soft)",
                          borderRadius: 3,
                        }}
                      />
                    );
                  }
                  const pct = (v / w0) * 100;
                  // Para W0 sempre 100% — usa cor mais saturada
                  const intensity = Math.min(1, pct / 100);
                  return (
                    <td
                      key={o}
                      title={`${fmtCohortLabel(c)} · W${o}: ${v} visitantes (${fmtPct(pct)})`}
                      className="aa-mono"
                      style={{
                        padding: 0,
                        width: 56,
                        height: 32,
                        textAlign: "center",
                        verticalAlign: "middle",
                        fontSize: 11,
                        color: intensity > 0.55 ? "var(--aa-bg)" : "var(--aa-fg)",
                        background: `color-mix(in srgb, var(--aa-accent) ${10 + intensity * 75}%, transparent)`,
                        borderRadius: 3,
                      }}
                    >
                      {fmtPct(pct)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
