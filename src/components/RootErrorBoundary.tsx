import { Component, type ErrorInfo, type ReactNode } from "react";
import { devError } from "@/lib/devLog";
import { recordCrash, tryAutoReload } from "@/lib/crashRecovery";

type Props = { children: ReactNode };
type State = { error: Error | null; recovering: boolean };

/**
 * Captura exceções não tratadas em qualquer página e:
 *  1. registra o crash em `localStorage` (via crashRecovery),
 *  2. tenta um reload automático (com guarda anti-loop),
 *  3. se já esgotou as tentativas, mostra fallback estático com
 *     botão de "tentar novamente" e link para o início.
 *
 * Sem isso, qualquer throw em render derrubava o app em tela branca
 * sem feedback nenhum.
 */
export default class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null, recovering: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, recovering: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    devError("[RootErrorBoundary]", error, info.componentStack);
    const reloaded = tryAutoReload();
    recordCrash("react-error-boundary", error, reloaded);
    if (reloaded) {
      this.setState({ recovering: true });
    }
  }

  private reset = () => {
    this.setState({ error: null, recovering: false });
    if (window.location.pathname !== "/") {
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new Event("lovable:navigate"));
    }
  };

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    // Enquanto o reload automático não dispara (150ms), mostra estado
    // neutro de "recuperando" — evita flash da tela de erro em casos
    // em que o reload vai resolver.
    if (this.state.recovering) {
      return (
        <main
          id="main"
          tabIndex={-1}
          className="admin-loading"
          role="status"
          aria-live="polite"
        >
          <div className="admin-loading__inner" style={{ textAlign: "center" }}>
            <p className="mono" style={{ opacity: 0.6 }}>
              recarregando…
            </p>
          </div>
        </main>
      );
    }

    return (
      <main
        id="main"
        tabIndex={-1}
        className="admin-loading"
        role="alert"
        aria-live="assertive"
      >
        <div className="admin-loading__inner" style={{ textAlign: "center" }}>
          <p className="mono" style={{ marginBottom: 8, opacity: 0.6 }}>
            erro inesperado
          </p>
          <p style={{ marginBottom: 24, maxWidth: 480 }}>
            Algo deu errado ao carregar essa parte do site. Tentamos recarregar
            automaticamente sem sucesso — você pode tentar de novo abaixo.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={this.reload}
            >
              tentar novamente
            </button>
            <button
              type="button"
              className="admin-btn"
              onClick={this.reset}
            >
              voltar ao início
            </button>
          </div>
        </div>
      </main>
    );
  }
}
