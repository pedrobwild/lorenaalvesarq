/**
 * SegmentFilter — popover para adicionar segmentos (dim + value),
 * com chips removíveis ao lado.
 */
import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import type { Segment, SegmentDim } from "./types";

const DIMS: { value: SegmentDim; label: string }[] = [
  { value: "device", label: "dispositivo" },
  { value: "country", label: "país" },
  { value: "utm_source", label: "utm source" },
  { value: "utm_medium", label: "utm medium" },
  { value: "utm_campaign", label: "utm campaign" },
  { value: "landing_path", label: "landing page" },
  { value: "referrer_host", label: "referrer host" },
];

const DEVICE_VALUES = ["desktop", "mobile", "tablet"];

type Props = {
  segments: Segment[];
  onAdd: (s: Segment) => void;
  onRemove: (dim: SegmentDim) => void;
  onClear: () => void;
};

export default function SegmentFilter({ segments, onAdd, onRemove, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const [dim, setDim] = useState<SegmentDim>("device");
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onAdd({ dim, value: value.trim() });
    setValue("");
    setOpen(false);
  }

  function quickPick(v: string) {
    onAdd({ dim, value: v });
    setValue("");
    setOpen(false);
  }

  return (
    <div className="aa-segments">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button type="button" className="admin-analytics__btn">
            <span className="aa-mono" style={{ fontSize: "11px", color: "var(--aa-fg-faint)" }}>
              segmento
            </span>
            <span>+ adicionar</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="admin-analytics__pop"
            align="start"
            sideOffset={6}
          >
            <form onSubmit={submit} className="aa-segment-builder">
              <div className="aa-segment-builder__row">
                <select
                  className="aa-select"
                  value={dim}
                  onChange={(e) => {
                    setDim(e.target.value as SegmentDim);
                    setValue("");
                  }}
                >
                  {DIMS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <input
                  className="aa-input"
                  placeholder="valor exato"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  autoFocus
                />
              </div>
              {dim === "device" && (
                <div className="aa-row" style={{ flexWrap: "wrap", gap: 4 }}>
                  {DEVICE_VALUES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="admin-analytics__btn"
                      data-variant="ghost"
                      onClick={() => quickPick(v)}
                      style={{ padding: "3px 8px", fontSize: 11 }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
              <div className="aa-row" style={{ justifyContent: "flex-end", gap: 4 }}>
                <button
                  type="button"
                  className="admin-analytics__btn"
                  data-variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  cancelar
                </button>
                <button
                  type="submit"
                  className="admin-analytics__btn"
                  data-variant="primary"
                  disabled={!value.trim()}
                >
                  aplicar
                </button>
              </div>
            </form>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {segments.map((s) => (
        <span key={s.dim} className="aa-chip">
          <span className="aa-chip__key">{s.dim.replace("_", " ")}:</span>
          <span>{s.value}</span>
          <button
            type="button"
            className="aa-chip__close"
            onClick={() => onRemove(s.dim)}
            aria-label={`remover filtro ${s.dim}`}
          >
            ×
          </button>
        </span>
      ))}
      {segments.length > 1 && (
        <button
          type="button"
          className="admin-analytics__btn"
          data-variant="ghost"
          onClick={onClear}
          style={{ fontSize: 11 }}
        >
          limpar
        </button>
      )}
    </div>
  );
}
