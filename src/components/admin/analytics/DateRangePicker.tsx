/**
 * Date range picker com presets + custom calendar (react-day-picker).
 */
import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker, type DateRange as DPRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import type { DateRange } from "./types";

type Preset = {
  key: string;
  label: string;
  build: () => DateRange;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function daysAgo(n: number) {
  return startOfDay(new Date(Date.now() - n * 86400_000));
}

const PRESETS: Preset[] = [
  { key: "today", label: "Hoje", build: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  {
    key: "yesterday",
    label: "Ontem",
    build: () => {
      const y = new Date(Date.now() - 86400_000);
      return { from: startOfDay(y), to: endOfDay(y) };
    },
  },
  { key: "7d", label: "Últimos 7 dias", build: () => ({ from: daysAgo(6), to: endOfDay(new Date()) }) },
  { key: "28d", label: "Últimos 28 dias", build: () => ({ from: daysAgo(27), to: endOfDay(new Date()) }) },
  { key: "30d", label: "Últimos 30 dias", build: () => ({ from: daysAgo(29), to: endOfDay(new Date()) }) },
  { key: "90d", label: "Últimos 90 dias", build: () => ({ from: daysAgo(89), to: endOfDay(new Date()) }) },
  {
    key: "mtd",
    label: "Mês até hoje",
    build: () => {
      const now = new Date();
      return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOfDay(now) };
    },
  },
  {
    key: "qtd",
    label: "Trimestre até hoje",
    build: () => {
      const now = new Date();
      const q = Math.floor(now.getMonth() / 3) * 3;
      return { from: startOfDay(new Date(now.getFullYear(), q, 1)), to: endOfDay(now) };
    },
  },
  {
    key: "ytd",
    label: "Ano até hoje",
    build: () => {
      const now = new Date();
      return { from: startOfDay(new Date(now.getFullYear(), 0, 1)), to: endOfDay(now) };
    },
  },
];

function formatRange(r: DateRange): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  if (r.from.toDateString() === r.to.toDateString()) {
    return r.from.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  const sameYear = r.from.getFullYear() === r.to.getFullYear();
  const yearSuffix = sameYear ? `, ${r.to.getFullYear()}` : "";
  return `${fmt(r.from)} – ${fmt(r.to)}${yearSuffix}`;
}

function diffDays(r: DateRange): number {
  return Math.max(
    1,
    Math.round((r.to.getTime() - r.from.getTime()) / 86400_000) + 1
  );
}

function detectPreset(r: DateRange): string | null {
  for (const p of PRESETS) {
    const built = p.build();
    if (
      Math.abs(built.from.getTime() - r.from.getTime()) < 60_000 &&
      Math.abs(built.to.getTime() - r.to.getTime()) < 60_000
    ) {
      return p.key;
    }
  }
  return null;
}

type Props = {
  value: DateRange;
  onChange: (r: DateRange) => void;
};

export default function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DPRange | undefined>({
    from: value.from,
    to: value.to,
  });

  const activePreset = useMemo(() => detectPreset(value), [value]);
  const days = diffDays(value);

  function applyPreset(p: Preset) {
    const r = p.build();
    onChange(r);
    setDraft({ from: r.from, to: r.to });
    setOpen(false);
  }

  function applyDraft() {
    if (draft?.from && draft?.to) {
      onChange({ from: startOfDay(draft.from), to: endOfDay(draft.to) });
      setOpen(false);
    } else if (draft?.from) {
      onChange({ from: startOfDay(draft.from), to: endOfDay(draft.from) });
      setOpen(false);
    }
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft({ from: value.from, to: value.to });
      }}
    >
      <Popover.Trigger asChild>
        <button type="button" className="admin-analytics__btn" aria-label="Selecionar período">
          <span className="aa-mono" style={{ fontSize: "11px", color: "var(--aa-fg-faint)" }}>
            período
          </span>
          <span>{formatRange(value)}</span>
          <span className="aa-mono aa-faint" style={{ fontSize: "11px" }}>
            · {days}d
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="admin-analytics__pop"
          sideOffset={6}
          align="start"
        >
          <div className="aa-daterange__layout">
            <div className="aa-daterange__presets">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className="aa-daterange__preset"
                  data-active={activePreset === p.key}
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="aa-daterange__cal">
              <DayPicker
                mode="range"
                numberOfMonths={2}
                selected={draft}
                onSelect={setDraft}
                weekStartsOn={0}
                locale={undefined}
                className="pointer-events-auto"
              />
              <div className="aa-daterange__foot">
                <span>
                  {draft?.from && draft?.to
                    ? `${formatRange({ from: draft.from, to: draft.to })} · ${diffDays({ from: draft.from, to: draft.to })}d`
                    : "selecione 2 datas"}
                </span>
                <button
                  type="button"
                  className="admin-analytics__btn"
                  data-variant="primary"
                  onClick={applyDraft}
                  disabled={!draft?.from}
                >
                  aplicar
                </button>
              </div>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
