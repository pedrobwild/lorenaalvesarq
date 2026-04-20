import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DailyPoint = {
  day: string;
  sessions: number;
  pageviews: number;
  prevSessions?: number;
  prevPageviews?: number;
};

type Props = {
  data: DailyPoint[];
  height?: number;
  showAxes?: boolean;
  showTooltip?: boolean;
  variant?: "line" | "area";
  showPrev?: boolean;
};

export default function SessionsChart({
  data,
  height = 280,
  showAxes = true,
  showTooltip = true,
  variant = "area",
  showPrev = false,
}: Props) {
  const safe = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: new Date(d.day).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          timeZone: "America/Sao_Paulo",
        }),
      })),
    [data]
  );

  if (variant === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={safe} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          {showAxes && <CartesianGrid stroke="#0001" vertical={false} />}
          {showAxes && (
            <XAxis
              dataKey="label"
              stroke="#0006"
              tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
            />
          )}
          {showAxes && (
            <YAxis
              stroke="#0006"
              tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              width={28}
              allowDecimals={false}
            />
          )}
          {showTooltip && (
            <Tooltip
              contentStyle={{
                background: "hsl(var(--background, 0 0% 100%))",
                border: "1px solid #0001",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="sessions"
            stroke="currentColor"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={safe} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id="grad-sessions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-pv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.08} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        {showAxes && <CartesianGrid stroke="#0001" vertical={false} />}
        {showAxes && (
          <XAxis
            dataKey="label"
            stroke="#0006"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
          />
        )}
        {showAxes && (
          <YAxis
            stroke="#0006"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={28}
            allowDecimals={false}
          />
        )}
        {showTooltip && (
          <Tooltip
            contentStyle={{
              background: "white",
              border: "1px solid #0001",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            labelStyle={{ color: "#0009" }}
          />
        )}
        <Area
          type="monotone"
          dataKey="pageviews"
          stroke="currentColor"
          strokeWidth={1}
          strokeOpacity={0.4}
          fill="url(#grad-pv)"
          name="pageviews"
        />
        <Area
          type="monotone"
          dataKey="sessions"
          stroke="currentColor"
          strokeWidth={1.6}
          fill="url(#grad-sessions)"
          name="sessions"
        />
        {showPrev && (
          <Line
            type="monotone"
            dataKey="prevSessions"
            stroke="currentColor"
            strokeWidth={1.2}
            strokeOpacity={0.55}
            strokeDasharray="3 4"
            dot={false}
            name="sessões (anterior)"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
