import { Component, type ErrorInfo, type ReactNode } from "react";
import { devError } from "@/lib/devLog";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Captura exceções não tratadas em qualquer página e mostra um fallback
 * em vez de deixar a tela em branco (que era o comportamento padrão até
 * o audit B/M1: sem boundary, qualquer throw em render derrubava o app
 * sem feedback ao usuário).
 *
 * Escopo intencionalmente largo (root-level): boundaries por rota podem
 * ser adicionados depois para preservar shell / nav, mas o objetivo
 * mínimo aqui é nunca renderizar a tela em branco.
 *
 * Em DEV o erro é logado para facilitar debug; em produção é silenciado
 * (placeholder para um sink externo — Sentry, Logflare, etc.).
 */
export default class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    devError("[RootErrorBoundary]", error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
    if (window.location.pathname !== "/") {
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new Event("lovable:navigate"));
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

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
            Algo deu errado ao carregar essa parte do site. Você pode tentar
            voltar à página inicial.
          </p>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={this.reset}
          >
            voltar ao início
          </button>
        </div>
      </main>
    );
  }
}
