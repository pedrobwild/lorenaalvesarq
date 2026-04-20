/**
 * ConversionTab — aba "Conversão".
 *
 * Funil sequencial: pageview → portfolio_view → project_view → click_contact
 * usando RPC analytics_funnel. Mostra:
 *  - Cards de totais por tipo de conversão
 *  - Visualização do funil com barras proporcionais e taxa de passagem
 *
 * Observação: analytics_funnel ainda não aceita segmentos como argumentos —
 * por ora a aba mostra dados globais do período. Quando a RPC for estendida,
 * basta repassar segArgs aqui.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange, Segment } from "./types";

type FunnelRow = { step: number; event_type: string; sessions: number };

type Props = {
  range: DateRange;
  segments: Segment[];
  comparePrev: boolean;
};

const FUNNEL_STEPS = [
  { key: "pageview", label: "visita", description: "qualquer página" },
  { key: "portfolio_view", label: "portfólio", description: "viu a lista" },
  { key: "project_view", label: "projeto", description: "abriu um projeto" },
  { key: "click_contact", label: "contato", description: "clicou contato" },
] as const;

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}
function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export default function ConversionTab({ range, segments }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<FunnelRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const sinceISO = range.from.toISOString();
    const untilISO = range.to.toISOString();
    const steps = FUNNEL_STEPS.map((s) => s.key);

    supabase
      .rpc("analytics_funnel", {
        p_since: sinceISO,
        p_until: untilISO,
        p_steps: steps,
      })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) throw new Error(err.message);
        setRows(
          (data ?? []).map((r) => ({
            step: Number(r.step),
            event_type: String(r.event_type),
            sessions: Number(r.sessions ?? 0),
          }))
        );
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[conversion] rpc error", err);
        if (!cancelled) setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  // Mapeia cada step -> sessions (preserva ordem dos FUNNEL_STEPS)
  const stepData = useMemo(() => {
    return FUNNEL_STEPS.map((def, idx) => {
      const found = rows.find((r) => r.event_type === def.key);
      return {
        ...def,
        index: idx + 1,
        sessions: found?.sessions ?? 0,
      };
    });
  }, [rows]);

  const top = stepData[0]?.sessions ?? 0;

  if (loading) {
    return (
      <div className="aa-grid">
        <div className="aa-col-3 aa-skel" style={{ height: 110 }} />
        <div className="aa-col-3 aa-skel" style={{ height: 110 }} />
        <div className="aa-col-3 aa-skel" style={{ height: 110 }} />
        <div className="aa-col-3 aa-skel" style={{ height: 110 }} />
        <div className="aa-col-12 aa-skel" style={{ height: 360 }} />
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

  if (top === 0) {
    return (
      <div className="aa-empty">
        <span className="aa-empty__icon">∅</span>
        sem eventos no período · publique conteúdo ou amplie o intervalo
      </div>
    );
  }

  return (
    <div className="aa-grid">
      {/* Aviso sobre segmentos */}
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
            ⓘ funil global do período · segmentos ativos não se aplicam aqui (ainda)
          </div>
        </div>
      )}

      {/* Cards de totais */}
      {stepData.map((s) => {
        const pctTop = top > 0 ? (s.sessions / top) * 100 : 0;
        return (
          <div key={s.key} className="aa-col-3 aa-card">
            <div className="aa-kpi__label">
              <span className="aa-mono" style={{ opacity: 0.5 }}>
                {String(s.index).padStart(2, "0")}
              </span>{" "}
              {s.label}
            </div>
            <div className="aa-kpi__value">{fmtNum(s.sessions)}</div>
            <div className="aa-kpi__delta aa-faint" style={{ fontSize: 11 }}>
              {fmtPct(pctTop)} do topo · {s.description}
            </div>
          </div>
        );
      })}

      {/* Funil */}
      <div className="aa-col-12 aa-card">
        <div className="aa-card__head">
          <h3 className="aa-card__title">funil de conversão</h3>
          <span className="aa-card__action aa-faint">
            sessões únicas · ordem cronológica respeitada
          </span>
        </div>
        <FunnelChart steps={stepData} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FunnelChart
// ---------------------------------------------------------------------------
type StepView = {
  key: string;
  label: string;
  description: string;
  index: number;
  sessions: number;
};

function FunnelChart({ steps }: { steps: StepView[] }) {
  const top = steps[0]?.sessions ?? 0;
  if (top === 0) {
    return (
      <div className="aa-empty" style={{ padding: "24px 0", border: "none" }}>
        <span className="aa-empty__icon">∅</span>
        sem dados de funil neste período
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].sessions : s.sessions;
        const widthPct = top > 0 ? (s.sessions / top) * 100 : 0;
        const stepRate = prev > 0 ? (s.sessions / prev) * 100 : 0;
        const dropoff = prev - s.sessions;
        const isDropHeavy = i > 0 && stepRate < 25;

        return (
          <div key={s.key} style={{ display: "grid", gap: 6 }}>
            {/* Header da etapa */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                fontSize: 12,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  className="aa-mono"
                  style={{
                    color: "var(--aa-fg-faint)",
                    fontSize: 10,
                  }}
                >
                  {String(s.index).padStart(2, "0")}
                </span>
                <strong style={{ color: "var(--aa-fg)" }}>{s.label}</strong>
                <span className="aa-faint" style={{ fontSize: 11 }}>
                  {s.description}
                </span>
              </span>
              <span className="aa-mono" style={{ color: "var(--aa-fg)" }}>
                {fmtNum(s.sessions)}
              </span>
            </div>

            {/* Barra */}
            <div
              style={{
                position: "relative",
                height: 36,
                background: "var(--aa-bg-soft)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${widthPct}%`,
                  background: `linear-gradient(90deg, var(--aa-accent) 0%, color-mix(in srgb, var(--aa-accent) 70%, transparent) 100%)`,
                  transition: "width 240ms ease-out",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 10px",
                  fontSize: 11,
                  color: "var(--aa-fg)",
                  mixBlendMode: "difference",
                  filter: "invert(1)",
                }}
                className="aa-mono"
              >
                <span>{fmtPct(widthPct)} do topo</span>
              </div>
            </div>

            {/* Taxa de passagem (não mostra na primeira etapa) */}
            {i > 0 && (
              <div
                className="aa-mono"
                style={{
                  display: "flex",
                  gap: 14,
                  fontSize: 11,
                  color: "var(--aa-fg-faint)",
                  paddingLeft: 4,
                }}
              >
                <span>
                  passagem:{" "}
                  <strong
                    style={{
                      color: isDropHeavy ? "var(--aa-accent-negative, #c0392b)" : "var(--aa-fg)",
                    }}
                  >
                    {fmtPct(stepRate)}
                  </strong>
                </span>
                <span>
                  perda: <strong style={{ color: "var(--aa-fg)" }}>{fmtNum(dropoff)}</strong> sessões
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Resumo final */}
      <div
        style={{
          marginTop: 10,
          paddingTop: 12,
          borderTop: "1px dashed var(--aa-border)",
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          fontSize: 11,
        }}
        className="aa-mono aa-faint"
      >
        <span>
          conversão total:{" "}
          <strong style={{ color: "var(--aa-fg)" }}>
            {fmtPct(top > 0 ? (steps[steps.length - 1].sessions / top) * 100 : 0)}
          </strong>
        </span>
        <span>
          {fmtNum(steps[0].sessions)} → {fmtNum(steps[steps.length - 1].sessions)} sessões
        </span>
      </div>
    </div>
  );
}
