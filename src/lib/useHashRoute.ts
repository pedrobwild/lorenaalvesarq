import { useEffect, useState } from "react";

export type Route =
  | { name: "home"; anchor?: string }
  | { name: "portfolio" }
  | { name: "faq" }
  | { name: "sobre" }
  | { name: "privacidade" }
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

function parsePath(rawPath: string): Route {
  const path = (rawPath.split("?")[0] || "").replace(/\/+$/, "") || "/";

  if (path === "/" || path === "") return { name: "home" };
  if (path === "/portfolio") return { name: "portfolio" };
  if (path === "/faq") return { name: "faq" };
  if (path === "/sobre") return { name: "sobre" };
  if (path === "/privacidade") return { name: "privacidade" };

  const projMatch = path.match(/^\/projeto\/([a-z0-9-]+)$/);
  if (projMatch) return { name: "project", slug: projMatch[1] };

  // Admin
  if (path === "/admin/login") return { name: "admin-login" };
  if (path === "/admin") return { name: "admin-dashboard" };
  if (path === "/admin/analytics") return { name: "admin-analytics" };
  if (path === "/admin/seo") return { name: "admin-seo" };
  if (path === "/admin/settings") return { name: "admin-settings" };
  if (path === "/admin/projects") return { name: "admin-projects" };
  if (path === "/admin/projects/new") return { name: "admin-project-new" };
  const adminEdit = path.match(/^\/admin\/projects\/([a-z0-9-]+)$/);
  if (adminEdit) return { name: "admin-project-edit", slug: adminEdit[1] };

  return { name: "not-found" };
}

function parseLocation(): Route {
  // Compatibilidade com links antigos #/portfolio, #/projeto/slug, #/admin/...
  const hash = window.location.hash.replace(/^#/, "");
  if (hash.startsWith("/")) {
    // Migra silenciosamente para URL limpa, preservando o histórico.
    const cleanPath = hash;
    window.history.replaceState({}, "", cleanPath || "/");
    return parsePath(cleanPath);
  }
  // Âncoras puras (#estudio, #contato, #projetos) ficam na home
  if (hash && !hash.startsWith("/")) {
    return { name: "home", anchor: hash };
  }
  return parsePath(window.location.pathname || "/");
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseLocation());

  useEffect(() => {
    const onChange = () => setRoute(parseLocation());
    window.addEventListener("popstate", onChange);
    window.addEventListener("hashchange", onChange);
    window.addEventListener("lovable:navigate", onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener("hashchange", onChange);
      window.removeEventListener("lovable:navigate", onChange);
    };
  }, []);

  return route;
}

// Helper para construir links de forma consistente — agora URLs limpas.
export const routes = {
  home: "/",
  portfolio: "/portfolio",
  faq: "/faq",
  sobre: "/sobre",
  privacidade: "/privacidade",
  project: (slug: string) => `/projeto/${slug}`,
  adminLogin: "/admin/login",
  adminDashboard: "/admin",
  adminAnalytics: "/admin/analytics",
  adminSeo: "/admin/seo",
  adminSettings: "/admin/settings",
  adminProjects: "/admin/projects",
  adminProjectNew: "/admin/projects/new",
  adminProjectEdit: (slug: string) => `/admin/projects/${slug}`,
};

// Navega programaticamente sem recarregar a página.
export function navigate(href: string) {
  // Aceita formatos legados "#/algo" e novos "/algo"
  const cleaned = href.startsWith("#") ? href.slice(1) : href;
  const target = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  window.history.pushState({}, "", target);
  window.scrollTo({ top: 0, behavior: "auto" });
  window.dispatchEvent(new Event("lovable:navigate"));
}

// Intercepta cliques em <a href="/..."> internos para usar pushState
// em vez de full page reload — habilita SPA com URLs limpas.
export function installLinkInterceptor() {
  if (typeof window === "undefined") return;
  if ((window as unknown as { __linkInterceptorInstalled?: boolean }).__linkInterceptorInstalled) {
    return;
  }
  (window as unknown as { __linkInterceptorInstalled?: boolean }).__linkInterceptorInstalled = true;

  document.addEventListener("click", (e) => {
    // Ignora cliques com modificadores ou botões não-primários
    const me = e as MouseEvent;
    if (me.defaultPrevented) return;
    if (me.button !== 0) return;
    if (me.metaKey || me.ctrlKey || me.shiftKey || me.altKey) return;

    const target = (me.target as HTMLElement | null)?.closest("a");
    if (!target) return;
    const a = target as HTMLAnchorElement;
    if (!a.href) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download")) return;
    const rel = a.getAttribute("rel");
    if (rel && rel.includes("external")) return;

    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;

    const href = a.getAttribute("href") || "";

    // Âncora pura na mesma página: deixa o browser cuidar (smooth scroll)
    if (href.startsWith("#")) return;

    // Link legado #/algo → migra para URL limpa
    if (url.hash && url.hash.startsWith("#/")) {
      e.preventDefault();
      navigate(url.hash.slice(1));
      return;
    }

    // Link interno com pathname diferente → SPA navigate
    if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
      // Mantém comportamento padrão para arquivos (.pdf, .png, etc.)
      if (/\.[a-z0-9]+$/i.test(url.pathname)) return;
      e.preventDefault();
      navigate(url.pathname + url.search);
    }
  });
}
