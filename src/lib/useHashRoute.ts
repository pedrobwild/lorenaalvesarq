import { useEffect, useState } from "react";

export type Route =
  | { name: "home"; anchor?: string }
  | { name: "portfolio" }
  | { name: "project"; slug: string }
  | { name: "admin-login" }
  | { name: "admin-dashboard" }
  | { name: "admin-analytics" }
  | { name: "admin-seo" }
  | { name: "admin-settings" }
  | { name: "admin-projects" }
  | { name: "admin-project-new" }
  | { name: "admin-project-edit"; slug: string }
  | { name: "not-found" };

function parseHash(hash: string): Route {
  // aceita #/portfolio, #/projeto/slug e rotas /admin/*. âncoras legadas (#projetos, #estudio…)
  // ficam para o scroll da home e são tratadas como rota "home" com anchor.
  const h = hash.replace(/^#/, "");
  const path = h.split("?")[0] || "";

  if (path === "" || path === "/") return { name: "home" };

  if (path.startsWith("/portfolio")) return { name: "portfolio" };

  const projMatch = path.match(/^\/projeto\/([a-z0-9-]+)\/?$/);
  if (projMatch) return { name: "project", slug: projMatch[1] };

  // Admin
  if (path === "/admin/login") return { name: "admin-login" };
  if (path === "/admin" || path === "/admin/") return { name: "admin-dashboard" };
  if (path === "/admin/analytics" || path === "/admin/analytics/") {
    return { name: "admin-analytics" };
  }
  if (path === "/admin/seo" || path === "/admin/seo/") return { name: "admin-seo" };
  if (path === "/admin/settings" || path === "/admin/settings/") return { name: "admin-settings" };
  if (path === "/admin/projects" || path === "/admin/projects/") return { name: "admin-projects" };
  if (path === "/admin/projects/new") return { name: "admin-project-new" };
  const adminEdit = path.match(/^\/admin\/projects\/([a-z0-9-]+)\/?$/);
  if (adminEdit) return { name: "admin-project-edit", slug: adminEdit[1] };

  // anchor legacy (#projetos, #estudio, #metodo, #contato, #hero…)
  if (!path.startsWith("/")) return { name: "home", anchor: path };

  return { name: "not-found" };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

// Helper para construir links de forma consistente.
export const routes = {
  home: "#/",
  portfolio: "#/portfolio",
  project: (slug: string) => `#/projeto/${slug}`,
  adminLogin: "#/admin/login",
  adminDashboard: "#/admin",
  adminAnalytics: "#/admin/analytics",
  adminSeo: "#/admin/seo",
  adminSettings: "#/admin/settings",
  adminProjects: "#/admin/projects",
  adminProjectNew: "#/admin/projects/new",
  adminProjectEdit: (slug: string) => `#/admin/projects/${slug}`,
};

// Utilitário: navegar programaticamente e rolar para o topo.
export function navigate(href: string) {
  window.location.hash = href.replace(/^#/, "");
  window.scrollTo({ top: 0, behavior: "auto" });
}
