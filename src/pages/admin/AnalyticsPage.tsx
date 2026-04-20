/**
 * Página /admin/analytics — usa AnalyticsShell (layout próprio, denso).
 */
import { useAnalyticsState } from "@/components/admin/analytics/useAnalyticsState";
import AnalyticsShell from "@/components/admin/analytics/AnalyticsShell";
import OverviewTab from "@/components/admin/analytics/OverviewTab";
import AcquisitionTab from "@/components/admin/analytics/AcquisitionTab";
import BehaviorTab from "@/components/admin/analytics/BehaviorTab";
import ConversionTab from "@/components/admin/analytics/ConversionTab";
import ProtectedRoute from "@/components/admin/ProtectedRoute";

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="aa-empty">
      <span className="aa-empty__icon">⏳</span>
      aba <strong style={{ color: "var(--aa-fg)" }}>{name}</strong> em construção · próximas fases
    </div>
  );
}

function AnalyticsContent() {
  const state = useAnalyticsState();

  return (
    <AnalyticsShell state={state}>
      {state.tab === "overview" && (
        <OverviewTab
          range={state.range}
          segments={state.segments}
          comparePrev={state.comparePrev}
        />
      )}
      {state.tab === "acquisition" && (
        <AcquisitionTab
          range={state.range}
          comparePrev={state.comparePrev}
          segments={state.segments}
          onAddSegment={state.addSegment}
          onRemoveSegment={state.removeSegment}
        />
      )}
      {state.tab === "behavior" && (
        <BehaviorTab
          range={state.range}
          segments={state.segments}
          onAddSegment={state.addSegment}
          onRemoveSegment={state.removeSegment}
        />
      )}
      {state.tab === "conversion" && (
        <ConversionTab
          range={state.range}
          segments={state.segments}
          comparePrev={state.comparePrev}
        />
      )}
      {state.tab === "retention" && <ComingSoon name="Retenção" />}
      {state.tab === "realtime" && <ComingSoon name="Tempo real" />}
    </AnalyticsShell>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}
