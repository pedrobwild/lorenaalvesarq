import { ReactNode } from "react";
import { useAuth } from "@/lib/useAuth";
import { navigate, routes } from "@/lib/useHashRoute";

type Props = {
  children: ReactNode;
  active?: "dashboard" | "projects" | "analytics" | "seo" | "settings";
};

export default function AdminLayout({ children, active }: Props) {
  const { user, signOut } = useAuth();

  const navItems = [
    { key: "dashboard", label: "Dashboard", href: routes.adminDashboard },
    { key: "analytics", label: "Analytics", href: routes.adminAnalytics },
    { key: "projects", label: "Projetos", href: routes.adminProjects },
    { key: "seo", label: "SEO", href: routes.adminSeo },
    { key: "settings", label: "Configurações", href: routes.adminSettings },
  ];

  async function handleSignOut() {
    await signOut();
    navigate(routes.adminLogin);
  }

  return (
    <div className="admin">
      <aside className="admin__sidebar">
        <div className="admin__brand">
          <span className="brand-lockup">
            lorena<b>alves</b>
            <sup>arq</sup>
          </span>
          <span className="admin__brand-tag mono">painel</span>
        </div>
        <nav className="admin__nav">
          {navItems.map((n) => (
            <a
              key={n.key}
              href={n.href}
              className={`admin__nav-item ${active === n.key ? "is-active" : ""}`}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="admin__sidebar-foot">
          <a href={routes.home} className="admin__nav-item admin__nav-item--ghost">
            ↗ ver site
          </a>
        </div>
      </aside>

      <div className="admin__main">
        <header className="admin__topbar">
          <span className="admin__topbar-title mono">
            {active === "projects"
              ? "Projetos"
              : active === "analytics"
                ? "Analytics"
                : active === "seo"
                  ? "SEO"
                  : active === "settings"
                    ? "Configurações"
                    : "Dashboard"}
          </span>
          <div className="admin__topbar-right">
            {user?.email && <span className="admin__user mono">{user.email}</span>}
            <button type="button" className="admin-btn admin-btn--ghost" onClick={handleSignOut}>
              sair
            </button>
          </div>
        </header>
        <main className="admin__content">{children}</main>
      </div>
    </div>
  );
}
