import { ReactNode, useEffect, useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  FolderKanban,
  Search,
  Settings,
  ExternalLink,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { navigate, routes } from "@/lib/useHashRoute";

type ActiveKey =
  | "dashboard"
  | "projects"
  | "analytics"
  | "seo"
  | "settings"
  | "faq";

type Props = {
  children: ReactNode;
  active?: ActiveKey;
  /** Page title shown in the topbar; defaults to the active section label. */
  title?: string;
  /** Optional description below the title. */
  description?: string;
  /** Optional action area on the right of the page header. */
  actions?: ReactNode;
};

const NAV: { key: ActiveKey; label: string; href: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", href: routes.adminDashboard, icon: LayoutDashboard },
  { key: "analytics", label: "Analytics", href: routes.adminAnalytics, icon: BarChart3 },
  { key: "projects", label: "Projetos", href: routes.adminProjects, icon: FolderKanban },
  { key: "faq", label: "FAQ", href: routes.adminFaq, icon: HelpCircle },
  { key: "seo", label: "SEO", href: routes.adminSeo, icon: Search },
  { key: "settings", label: "Configurações", href: routes.adminSettings, icon: Settings },
];

const STORAGE_KEY = "admin-sidebar-collapsed";

export default function AdminLayout({
  children,
  active,
  title,
  description,
  actions,
}: Props) {
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    }
  }, [collapsed]);

  // Fecha o drawer mobile ao trocar de rota
  useEffect(() => {
    setMobileOpen(false);
  }, [active]);

  const activeItem = NAV.find((n) => n.key === active);
  const pageTitle = title ?? activeItem?.label ?? "Admin";

  async function handleSignOut() {
    await signOut();
    navigate(routes.adminLogin);
  }

  return (
    <div className={`admin ${collapsed ? "admin--collapsed" : ""} ${mobileOpen ? "admin--mobile-open" : ""}`}>
      {/* Sidebar */}
      <aside className="admin__sidebar" aria-label="Navegação do painel">
        <div className="admin__brand-row">
          <a href={routes.adminDashboard} className="admin__brand" aria-label="Início do painel">
            <span className="admin__brand-mark">L</span>
            <span className="admin__brand-text">
              <span className="admin__brand-name">lorena<b>alves</b><sup>arq</sup></span>
              <span className="admin__brand-tag">painel</span>
            </span>
          </a>
          <button
            type="button"
            className="admin__collapse"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <nav className="admin__nav" aria-label="Seções">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <a
                key={n.key}
                href={n.href}
                className={`admin__nav-item ${active === n.key ? "is-active" : ""}`}
                title={n.label}
              >
                <Icon size={16} className="admin__nav-icon" aria-hidden />
                <span className="admin__nav-label">{n.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="admin__sidebar-foot">
          <a
            href={routes.home}
            className="admin__nav-item admin__nav-item--ghost"
            title="Ver site"
          >
            <ExternalLink size={14} className="admin__nav-icon" aria-hidden />
            <span className="admin__nav-label">Ver site</span>
          </a>
          <button
            type="button"
            className="admin__nav-item admin__nav-item--ghost admin__nav-item--button"
            onClick={handleSignOut}
            title="Sair"
          >
            <LogOut size={14} className="admin__nav-icon" aria-hidden />
            <span className="admin__nav-label">Sair</span>
          </button>
          {user?.email && !collapsed && (
            <span className="admin__user" title={user.email}>{user.email}</span>
          )}
        </div>
      </aside>

      {/* Mobile drawer scrim */}
      <button
        type="button"
        className="admin__scrim"
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
        tabIndex={-1}
      />

      {/* Main */}
      <div className="admin__main">
        <header className="admin__topbar">
          <button
            type="button"
            className="admin__mobile-toggle"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Abrir menu"
          >
            <Menu size={18} />
          </button>
          <div className="admin__topbar-titles">
            <span className="admin__topbar-eyebrow">{activeItem?.label ?? "Painel"}</span>
            <h1 className="admin__topbar-title">{pageTitle}</h1>
            {description && <p className="admin__topbar-desc">{description}</p>}
          </div>
          <div className="admin__topbar-right">{actions}</div>
        </header>
        <main className="admin__content">{children}</main>
      </div>
    </div>
  );
}
