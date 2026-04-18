import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import PortfolioPage from "./pages/PortfolioPage";
import ProjectPage from "./pages/ProjectPage";
import { useHashRoute, type Route } from "./lib/useHashRoute";
import "./index.css";

const TRANSITION_MS = 380;

function renderRoute(route: Route) {
  if (route.name === "portfolio") return <PortfolioPage />;
  if (route.name === "project") return <ProjectPage slug={route.slug} />;
  // home (com ou sem âncora) e not-found caem na App (que trata âncoras legadas)
  return <App />;
}

function routeKeyOf(route: Route) {
  return route.name === "project" ? `project:${route.slug}` : route.name;
}

function Root() {
  const route = useHashRoute();

  // "displayed" é a rota que está renderizada no DOM. Quando a rota real muda,
  // disparamos um fade-out, trocamos `displayed` no meio e fazemos fade-in.
  const [displayed, setDisplayed] = useState<Route>(route);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const lastRouteKey = useRef<string>(routeKeyOf(route));

  useEffect(() => {
    const nextKey = routeKeyOf(route);
    if (nextKey === lastRouteKey.current) return;

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

  return (
    <>
      <div className="cursor" aria-hidden="true"></div>
      <div
        className={`route-transition route-transition--${phase}`}
        style={{ ["--route-transition-ms" as string]: `${TRANSITION_MS}ms` }}
      >
        {renderRoute(displayed)}
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
