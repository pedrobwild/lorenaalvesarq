import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import PortfolioPage from "./pages/PortfolioPage";
import ProjectPage from "./pages/ProjectPage";
import FaqPage from "./pages/FaqPage";
import SobrePage from "./pages/SobrePage";
import PrivacidadePage from "./pages/PrivacidadePage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import BlogTagsPage from "./pages/BlogTagsPage";
import BlogTagPage from "./pages/BlogTagPage";
import NotFoundPage from "./pages/NotFoundPage";
import LoginPage from "./pages/admin/LoginPage";
import DashboardPage from "./pages/admin/DashboardPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import SeoPage from "./pages/admin/SeoPage";
import SettingsPage from "./pages/admin/SettingsPage";
import ProjectsListPage from "./pages/admin/ProjectsListPage";
import ProjectFormPage from "./pages/admin/ProjectFormPage";
import FaqAdminPage from "./pages/admin/FaqAdminPage";
import BlogListPage from "./pages/admin/BlogListPage";
import BlogFormPage from "./pages/admin/BlogFormPage";
import ProtectedRoute from "./components/admin/ProtectedRoute";
import CookieBanner from "./components/CookieBanner";
import { useCustomCursor } from "./lib/useCustomCursor";
import { useHashRoute, installLinkInterceptor, type Route } from "./lib/useHashRoute";
import { initAnalytics } from "./lib/analytics";
import "./index.css";

installLinkInterceptor();

const TRANSITION_MS = 380;

function renderRoute(route: Route) {
  if (route.name === "portfolio") return <PortfolioPage />;
  if (route.name === "project") return <ProjectPage slug={route.slug} />;
  if (route.name === "faq") return <FaqPage />;
  if (route.name === "sobre") return <SobrePage />;
  if (route.name === "privacidade") return <PrivacidadePage />;
  if (route.name === "blog") return <BlogPage />;
  if (route.name === "blog-tags") return <BlogTagsPage />;
  if (route.name === "blog-tag") return <BlogTagPage slug={route.slug} />;
  if (route.name === "blog-post") return <BlogPostPage slug={route.slug} />;
  if (route.name === "admin-login") return <LoginPage />;
  if (route.name === "admin-dashboard")
    return (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-analytics")
    return (
      <ProtectedRoute>
        <AnalyticsPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-seo")
    return (
      <ProtectedRoute>
        <SeoPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-settings")
    return (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-projects")
    return (
      <ProtectedRoute>
        <ProjectsListPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-project-new")
    return (
      <ProtectedRoute>
        <ProjectFormPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-project-edit")
    return (
      <ProtectedRoute>
        <ProjectFormPage slug={route.slug} />
      </ProtectedRoute>
    );
  if (route.name === "admin-faq")
    return (
      <ProtectedRoute>
        <FaqAdminPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-blog")
    return (
      <ProtectedRoute>
        <BlogListPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-blog-new")
    return (
      <ProtectedRoute>
        <BlogFormPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-blog-edit")
    return (
      <ProtectedRoute>
        <BlogFormPage slug={route.slug} />
      </ProtectedRoute>
    );
  // 404 dedicada — evita soft-404 do Google ao renderizar a home em URLs inválidas
  if (route.name === "not-found") return <NotFoundPage />;
  // home (com ou sem âncora) cai na App (que também trata âncoras legadas)
  return <App />;
}

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

  const adminMode = isAdminRoute(displayed);

  return (
    <>
      {!adminMode && <div className="cursor" aria-hidden="true"></div>}
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
    <Root />
  </React.StrictMode>
);
