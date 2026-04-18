import { useEffect, useState } from "react";

export type Route =
  | { name: "home"; anchor?: string }
  | { name: "portfolio" }
  | { name: "project"; slug: string }
  | { name: "not-found" };

function parseHash(hash: string): Route {
  // aceita #/portfolio e #/projeto/slug. âncoras legadas (#projetos, #estudio…)
  // ficam para o scroll da home e são tratadas como rota "home" com anchor.
  const h = hash.replace(/^#/, "");

  if (h === "" || h === "/") return { name: "home" };

  if (h.startsWith("/portfolio")) return { name: "portfolio" };

  const projMatch = h.match(/^\/projeto\/([a-z0-9-]+)\/?$/);
  if (projMatch) return { name: "project", slug: projMatch[1] };

  // anchor legacy (#projetos, #estudio, #metodo, #contato, #hero…)
  if (!h.startsWith("/")) return { name: "home", anchor: h };

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
};

// Utilitário: navegar programaticamente e rolar para o topo.
export function navigate(href: string) {
  window.location.hash = href.replace(/^#/, "");
  window.scrollTo({ top: 0, behavior: "auto" });
}
