/**
 * AnalyticsShell — layout próprio do painel de Analytics.
 * NÃO reusa AdminLayout (queremos topbar mais denso, tipografia Inter, tema próprio).
 */
import { ReactNode, useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAuth } from "@/lib/useAuth";
import { routes } from "@/lib/useHashRoute";
import { ALL_TABS } from "./types";
import type { AnalyticsState } from "./useAnalyticsState";
import DateRangePicker from "./DateRangePicker";
import SegmentFilter from "./SegmentFilter";
import "./analytics.css";

type Props = {
  state: AnalyticsState;
  children: ReactNode;
};

export default function AnalyticsShell({ state, children }: Props) {
  const { signOut } = useAuth();
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [savedName, setSavedName] = useState("");

  // atalhos de teclado
  useEffect(() => {
    let lastG = 0;
    function onKey(e: KeyboardEvent) {
      // ignora quando digitando
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))
        return;
      if (e.key === "g" || e.key === "G") {
        lastG = Date.now();
        return;
      }
      if (Date.now() - lastG < 800) {
        const tabKey = ALL_TABS.find((t) => t.short.toLowerCase() === e.key.toLowerCase());
        if (tabKey) {
          state.setTab(tabKey.key);
          lastG = 0;
          e.preventDefault();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  function toggleTheme() {
    state.setTheme(state.theme === "dark" ? "light" : "dark");
  }

  function handleSave() {
    if (!savedName.trim()) return;
    state.saveView(savedName.trim());
    setSavedName("");
    setSavePromptOpen(false);
  }

  return (
    <div className="admin-analytics" data-theme={state.theme}>
      <div className="admin-analytics__shell">
        <header className="admin-analytics__topbar">
          {/* Linha 1: brand + tabs + ações principais */}
          <div className="admin-analytics__topbar-row">
            <a href={routes.adminDashboard} className="admin-analytics__back" title="Voltar ao admin">
              ← admin
            </a>
            <span className="admin-analytics__brand">
              lorena<b>·</b>analytics
            </span>

            <div role="tablist" className="admin-analytics__tabs" style={{ marginLeft: 12 }}>
              {ALL_TABS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  type="button"
                  className="admin-analytics__tab"
                  data-active={state.tab === t.key}
                  onClick={() => state.setTab(t.key)}
                  title={`G ${t.short} — ir para ${t.label}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="admin-analytics__spacer" />

            {/* Views salvas */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button type="button" className="admin-analytics__btn" data-variant="ghost">
                  views {state.savedViews.length > 0 && <>· {state.savedViews.length}</>}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="admin-analytics__pop"
                  align="end"
                  sideOffset={6}
                  style={{ minWidth: 240 }}
                >
                  <DropdownMenu.Item
                    className="aa-daterange__preset"
                    onSelect={() => setSavePromptOpen(true)}
                  >
                    + salvar view atual
                  </DropdownMenu.Item>
                  {state.savedViews.length > 0 && (
                    <div
                      style={{
                        height: 1,
                        background: "var(--aa-border)",
                        margin: "6px 0",
                      }}
                    />
                  )}
                  {state.savedViews.map((v) => (
                    <div
                      key={v.id}
                      className="aa-row"
                      style={{ padding: "2px 4px" }}
                    >
                      <button
                        type="button"
                        className="aa-daterange__preset"
                        onClick={() => state.loadView(v)}
                        style={{ flex: 1 }}
                      >
                        {v.name}
                        <span
                          className="aa-mono aa-faint"
                          style={{ fontSize: 10, marginLeft: 6 }}
                        >
                          {v.tab}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="aa-chip__close"
                        onClick={() => state.deleteView(v.id)}
                        aria-label={`apagar view ${v.name}`}
                        style={{ padding: "0 6px" }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {state.savedViews.length === 0 && (
                    <div
                      className="aa-faint aa-mono"
                      style={{ padding: "6px 10px", fontSize: 11 }}
                    >
                      nenhuma view salva
                    </div>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            <button
              type="button"
              className="admin-analytics__icon-btn"
              onClick={toggleTheme}
              title={state.theme === "dark" ? "modo claro" : "modo escuro"}
              aria-label="alternar tema"
            >
              {state.theme === "dark" ? "☀" : "☾"}
            </button>

            <button
              type="button"
              className="admin-analytics__btn"
              data-variant="ghost"
              onClick={async () => {
                await signOut();
                window.location.hash = routes.adminLogin.replace(/^#/, "");
              }}
            >
              sair
            </button>
          </div>

          {/* Linha 2: filtros (date range, comparar, segmentos) */}
          <div className="admin-analytics__topbar-row">
            <DateRangePicker value={state.range} onChange={state.setRange} />
            <button
              type="button"
              className="admin-analytics__btn"
              aria-pressed={state.comparePrev}
              onClick={() => state.setComparePrev(!state.comparePrev)}
              title="Comparar com período anterior"
            >
              <span className="aa-mono" style={{ fontSize: 11, color: "var(--aa-fg-faint)" }}>
                comparar
              </span>
              <span>{state.comparePrev ? "ativo" : "off"}</span>
            </button>
            <SegmentFilter
              segments={state.segments}
              onAdd={state.addSegment}
              onRemove={state.removeSegment}
              onClear={state.clearSegments}
            />
          </div>
        </header>

        <main className="admin-analytics__content">{children}</main>
      </div>

      {/* Save view dialog (simples, sem Radix Dialog para reduzir superfície) */}
      {savePromptOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 80,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSavePromptOpen(false);
          }}
        >
          <div
            className="admin-analytics__pop"
            style={{ width: 320, padding: 16, display: "grid", gap: 10 }}
          >
            <div className="aa-card__title">salvar view atual</div>
            <input
              className="aa-input"
              placeholder="ex: Instagram Março"
              value={savedName}
              onChange={(e) => setSavedName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setSavePromptOpen(false);
              }}
            />
            <div className="aa-row" style={{ justifyContent: "flex-end", gap: 6 }}>
              <button
                type="button"
                className="admin-analytics__btn"
                data-variant="ghost"
                onClick={() => setSavePromptOpen(false)}
              >
                cancelar
              </button>
              <button
                type="button"
                className="admin-analytics__btn"
                data-variant="primary"
                onClick={handleSave}
                disabled={!savedName.trim()}
              >
                salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
