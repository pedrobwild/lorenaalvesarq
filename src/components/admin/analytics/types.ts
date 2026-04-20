/**
 * Tipos compartilhados do painel de Analytics.
 */

export type TabKey =
  | "overview"
  | "acquisition"
  | "behavior"
  | "conversion"
  | "retention"
  | "realtime";

export const ALL_TABS: { key: TabKey; label: string; short: string }[] = [
  { key: "overview", label: "Visão", short: "V" },
  { key: "acquisition", label: "Aquisição", short: "A" },
  { key: "behavior", label: "Comportamento", short: "B" },
  { key: "conversion", label: "Conversão", short: "C" },
  { key: "retention", label: "Retenção", short: "R" },
  { key: "realtime", label: "Tempo real", short: "T" },
];

export type SegmentDim =
  | "device"
  | "country"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "landing_path"
  | "referrer_host";

export type Segment = { dim: SegmentDim; value: string };

export type DateRange = { from: Date; to: Date };

export type Theme = "light" | "dark";
