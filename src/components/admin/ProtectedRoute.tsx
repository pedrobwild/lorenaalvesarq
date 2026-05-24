import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/useAuth";
import { navigate, routes } from "@/lib/useHashRoute";

type Props = { children: ReactNode };

/**
 * Bloqueia o render do painel para quem não está logado / não é admin.
 *
 * O redirect para `/admin/login` é disparado em `useEffect` — chamar
 * `navigate()` durante o render gera double-navigate sob React Strict Mode
 * e abre janela para loops quando o estado de auth oscila. Enquanto o
 * efeito não roda, devolvemos o mesmo estado de "carregando" que o
 * fallback inicial, evitando piscar UI vazia no caminho.
 */
export default function ProtectedRoute({ children }: Props) {
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate(routes.adminLogin);
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="admin-loading">
        <div className="admin-loading__inner mono">carregando…</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-loading">
        <div className="admin-loading__inner">
          <p className="mono" style={{ marginBottom: 16 }}>
            Sua conta não tem permissão para acessar o painel.
          </p>
          <a href={routes.home} className="admin-btn">
            voltar ao site
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
