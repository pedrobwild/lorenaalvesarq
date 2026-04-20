import { useMemo } from "react";

/**
 * Heatmap 7×24 — sessões únicas por dia da semana × hora do dia.
 * Cada célula = quantidade de sessões distintas que tiveram pelo menos
 * um pageview naquele bucket.
 */
export type HeatmapEvent = {
  event_type: string;
  session_id: string | null;
  created_at: string;
};

const DAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default function HoursHeatmap({ events }: { events: HeatmapEvent[] }) {
  const { matrix, max, totalByDay, totalByHour, peak } = useMemo(() => {
    // matrix[day][hour] = Set<session_id>
    const m: Set<string>[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => new Set<string>())
    );
    for (const r of events) {
      if (r.event_type !== "pageview" || !r.session_id) continue;
      const d = new Date(r.created_at);
      const day = d.getDay();
      const hour = d.getHours();
      m[day][hour].add(r.session_id);
    }
    const counts: number[][] = m.map((row) => row.map((s) => s.size));
    let max = 0;
    let peak: { day: number; hour: number; value: number } = { day: 0, hour: 0, value: 0 };
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (counts[d][h] > max) max = counts[d][h];
        if (counts[d][h] > peak.value) peak = { day: d, hour: h, value: counts[d][h] };
      }
    }
    const totalByDay = counts.map((row) => row.reduce((a, b) => a + b, 0));
    const totalByHour: number[] = Array.from({ length: 24 }, (_, h) =>
      counts.reduce((acc, row) => acc + row[h], 0)
    );
    return { matrix: counts, max, totalByDay, totalByHour, peak };
  }, [events]);

  if (max === 0) {
    return (
      <p className="mono" style={{ opacity: 0.6 }}>
        sem dados de visitas no período
      </p>
    );
  }

  return (
    <div className="admin-heatmap">
      <div className="admin-heatmap__grid" role="img" aria-label="mapa de calor de visitas por dia e hora">
        {/* Header de horas (eixo X) */}
        <div className="admin-heatmap__corner" />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={`h-${h}`} className="admin-heatmap__hhead mono">
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </div>
        ))}

        {/* Linhas */}
        {DAYS.map((label, dayIdx) => (
          <FragmentRow
            key={dayIdx}
            label={label}
            cells={matrix[dayIdx]}
            max={max}
            dayIdx={dayIdx}
            isPeakDay={peak.day === dayIdx}
            peakHour={peak.hour}
          />
        ))}

        {/* Rodapé (totais por hora) */}
        <div className="admin-heatmap__rowtotal mono">Σ</div>
        {totalByHour.map((t, h) => (
          <div key={`tt-${h}`} className="admin-heatmap__hourtotal mono" title={`${t} sessões às ${h}h`}>
            {t || ""}
          </div>
        ))}
      </div>

      <aside className="admin-heatmap__legend mono">
        <span>menos</span>
        <span className="admin-heatmap__legend-bar" />
        <span>mais</span>
        <span className="admin-heatmap__legend-spacer" />
        <span>
          pico: <strong>{DAYS[peak.day]} {String(peak.hour).padStart(2, "0")}h</strong> ({peak.value} sessões)
        </span>
        <span className="admin-heatmap__legend-spacer" />
        <span>
          dia mais ativo:{" "}
          <strong>
            {DAYS[totalByDay.indexOf(Math.max(...totalByDay))]} ({Math.max(...totalByDay)})
          </strong>
        </span>
      </aside>
    </div>
  );
}

function FragmentRow({
  label,
  cells,
  max,
  dayIdx,
  isPeakDay,
  peakHour,
}: {
  label: string;
  cells: number[];
  max: number;
  dayIdx: number;
  isPeakDay: boolean;
  peakHour: number;
}) {
  return (
    <>
      <div className="admin-heatmap__rowlabel mono">{label}</div>
      {cells.map((v, h) => {
        const intensity = max ? v / max : 0;
        const isPeak = isPeakDay && h === peakHour && v > 0;
        return (
          <div
            key={`c-${dayIdx}-${h}`}
            className={`admin-heatmap__cell ${isPeak ? "is-peak" : ""}`}
            style={{
              // intensity 0..1 → opacidade do fundo escuro
              background:
                v === 0
                  ? "transparent"
                  : `rgba(17, 17, 17, ${0.08 + intensity * 0.85})`,
            }}
            title={`${label} ${String(h).padStart(2, "0")}h — ${v} sessões`}
            aria-label={`${label} ${h} horas: ${v} sessões`}
          />
        );
      })}
    </>
  );
}
