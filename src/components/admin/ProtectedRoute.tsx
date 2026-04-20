import { ReactNode } from "react";
import { useAuth } from "@/lib/useAuth";
import { navigate, routes } from "@/lib/useHashRoute";

type Props = { children: ReactNode };

export default function ProtectedRoute({ children }: Props) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading__inner mono">carregando…</div>
      </div>
    );
  }

  if (!user) {
    navigate(routes.adminLogin);
    return null;
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
