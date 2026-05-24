import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { navigate, routes } from "@/lib/useHashRoute";

export default function LoginPage() {
  const { user, isAdmin, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate(routes.adminDashboard);
    }
  }, [loading, user, isAdmin]);

  if (!loading && user && isAdmin) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) throw error;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <a href={routes.home} className="admin-login__brand">
          <span className="brand-lockup">
            lorena<b>alves</b>
            <sup>arq</sup>
          </span>
        </a>
        <h1 className="admin-login__title">Acesso ao painel</h1>
        <p className="admin-login__lede mono">entre com seu email autorizado</p>

        <form onSubmit={handleSubmit} className="admin-login__form">
          <label className="admin-field">
            <span className="admin-field__label mono">email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="admin-field__input"
            />
          </label>

          <label className="admin-field">
            <span className="admin-field__label mono">senha</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-field__input"
            />
          </label>

          {error && <p className="admin-login__error mono">{error}</p>}

          <button
            type="submit"
            className="admin-btn admin-btn--primary admin-login__submit"
            disabled={submitting}
          >
            {submitting ? "…" : "entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
