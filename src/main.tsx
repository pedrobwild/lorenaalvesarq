import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import CookieBanner from "./components/CookieBanner";
import RootErrorBoundary from "./components/RootErrorBoundary";
import { useCustomCursor } from "./lib/useCustomCursor";
import { useHashRoute, installLinkInterceptor, type Route } from "./lib/useHashRoute";
import { initAnalytics } from "./lib/analytics";
import { renderRoute } from "./router";
import "./index.css";

installLinkInterceptor();

const TRANSITION_MS = 380;

function isAdminRoute(route: Route) {
  return route.name.startsWith("admin-");
}

function routeKeyOf(route: Route) {
  if (route.name === "project") return `project:${route.slug}`;
  if (route.name === "admin-project-edit") return `admin-edit:${route.slug}`;
  if (route.name === "blog-post") return `blog:${route.slug}`;
  if (route.name === "blog-tag") return `blog-tag:${route.slug}`;
  if (route.name === "admin-blog-edit") return `admin-blog-edit:${route.slug}`;
  return route.name;
}

function Root() {
  const route = useHashRoute();
  const isAdmin = route.name.startsWith("admin");
  useCustomCursor(!isAdmin);

  // Inicializa analytics uma vez no mount
  useEffect(() => {
    const cleanup = initAnalytics();
    return cleanup;
  }, []);

  // "displayed" é a rota que está renderizada no DOM. Quando a rota real muda,
  // disparamos um fade-out, trocamos `displayed` no meio e fazemos fade-in.
  const [displayed, setDisplayed] = useState<Route>(route);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const lastRouteKey = useRef<string>(routeKeyOf(route));

  useEffect(() => {
    const nextKey = routeKeyOf(route);
    if (nextKey === lastRouteKey.current) {
      // A rota voltou para o que já está sendo exibido em meio a uma
      // transição (ex.: A → B → A em rajada): o timer da fase anterior
      // foi cancelado pelo cleanup, mas `phase` ficou em "out" e nunca
      // mais é reposto, deixando a tela permanentemente invisível.
      // Reposicionar para "in" aqui garante que o conteúdo volte a aparecer.
      setPhase("in");
      return;
    }

    // Fase 1: fade-out da rota atual
    setPhase("out");
    const swapTimer = window.setTimeout(() => {
      // Troca o conteúdo e volta ao topo no momento "invisível"
      setDisplayed(route);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      lastRouteKey.current = nextKey;
      // Fase 2: fade-in da nova rota
      requestAnimationFrame(() => setPhase("in"));
    }, TRANSITION_MS);

    return () => window.clearTimeout(swapTimer);
  }, [route]);

  const adminMode = isAdminRoute(displayed);

  // O elemento `.cursor` é criado/removido pelo próprio `useCustomCursor`
  // — manter um <div className="cursor"> renderizado aqui em paralelo
  // duplicava a responsabilidade e abria janela para dois nodes coexistirem
  // se o hook fosse desabilitado/habilitado durante a vida do app. (M7)
  return (
    <>
      <div
        className={`route-transition route-transition--${phase}`}
        style={{ ["--route-transition-ms" as string]: `${TRANSITION_MS}ms` }}
      >
        {renderRoute(displayed)}
      </div>
      {!adminMode && <CookieBanner />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <Root />
    </RootErrorBoundary>
  </React.StrictMode>
);
