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
  const { matrix, max, totalByDay, peak } = useMemo(() => {
    const m: Set<string>[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => new Set<string>())
    );
    for (const r of events) {
      if (r.event_type !== "pageview" || !r.session_id) continue;
      const d = new Date(r.created_at);
      m[d.getDay()][d.getHours()].add(r.session_id);
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
    return { matrix: counts, max, totalByDay, peak };
  }, [events]);

  if (max === 0) {
    return (
      <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#9a9a93" }}>
        sem dados de visitas no período
      </p>
    );
  }

  const bestDayIdx = totalByDay.indexOf(Math.max(...totalByDay));

  return (
    <div className="analytics-heatmap">
      <div
        className="analytics-heatmap__grid"
        role="img"
        aria-label="mapa de calor de visitas por dia e hora"
      >
        <div className="analytics-heatmap__corner" />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={`h-${h}`} className="analytics-heatmap__hhead">
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </div>
        ))}

        {DAYS.map((label, dayIdx) => (
          <Row
            key={dayIdx}
            label={label}
            cells={matrix[dayIdx]}
            max={max}
            dayIdx={dayIdx}
            isPeakDay={peak.day === dayIdx}
            peakHour={peak.hour}
          />
        ))}
      </div>

      <aside className="analytics-heatmap__legend">
        <span>menos</span>
        <span className="analytics-heatmap__legend-bar" />
        <span>mais</span>
        <span className="analytics-heatmap__legend-sep" />
        <span>
          pico:{" "}
          <strong>
            {DAYS[peak.day]} {String(peak.hour).padStart(2, "0")}h
          </strong>{" "}
          ({peak.value} sessões)
        </span>
        <span className="analytics-heatmap__legend-sep" />
        <span>
          dia mais ativo:{" "}
          <strong>
            {DAYS[bestDayIdx]} ({totalByDay[bestDayIdx]})
          </strong>
        </span>
      </aside>
    </div>
  );
}

function Row({
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
      <div className="analytics-heatmap__rowlabel">{label}</div>
      {cells.map((v, h) => {
        const intensity = max ? v / max : 0;
        const isPeak = isPeakDay && h === peakHour && v > 0;
        return (
          <div
            key={`c-${dayIdx}-${h}`}
            className={`analytics-heatmap__cell ${isPeak ? "is-peak" : ""}`}
            style={{
              background:
                v === 0
                  ? undefined
                  : `rgba(17, 17, 17, ${0.1 + intensity * 0.85})`,
            }}
            title={`${label} ${String(h).padStart(2, "0")}h — ${v} sessões`}
            aria-label={`${label} ${h} horas: ${v} sessões`}
          />
        );
      })}
    </>
  );
}
