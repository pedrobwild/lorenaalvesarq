import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { navigate, routes } from "@/lib/useHashRoute";

export default function LoginPage() {
  const { user, isAdmin, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate(routes.adminDashboard);
    }
  }, [loading, user, isAdmin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email.trim(), password);
        if (error) throw error;
      } else {
        const { error } = await signUp(email.trim(), password);
        if (error) throw error;
        setInfo(
          "Conta criada. Se a confirmação por email estiver ativa, verifique sua caixa de entrada antes de entrar."
        );
        setMode("signin");
      }
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
        <h1 className="admin-login__title">
          {mode === "signin" ? "Acesso ao painel" : "Criar conta admin"}
        </h1>
        <p className="admin-login__lede mono">
          {mode === "signin"
            ? "entre com seu email autorizado"
            : "primeiro acesso — apenas o email autorizado vira admin"}
        </p>

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
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-field__input"
            />
          </label>

          {error && <p className="admin-login__error mono">{error}</p>}
          {info && <p className="admin-login__info mono">{info}</p>}

          <button
            type="submit"
            className="admin-btn admin-btn--primary admin-login__submit"
            disabled={submitting}
          >
            {submitting ? "…" : mode === "signin" ? "entrar" : "criar conta"}
          </button>
        </form>

        <div className="admin-login__switch mono">
          {mode === "signin" ? (
            <button type="button" onClick={() => setMode("signup")}>
              criar conta admin (primeiro acesso)
            </button>
          ) : (
            <button type="button" onClick={() => setMode("signin")}>
              já tenho conta — entrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
