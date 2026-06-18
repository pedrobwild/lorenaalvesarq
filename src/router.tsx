/**
 * Roteador da SPA — extraído de main.tsx para permitir testes unitários
 * sem montar `ReactDOM.createRoot()` (que requer DOM real e quebra em
 * jsdom porque depende do elemento `#root` do index.html).
 *
 * `renderRoute` é a função de despacho: dado um `Route` resolvido por
 * `useHashRoute`, devolve o componente que o roteador deve renderizar.
 *
 * IMPORTANTE: esta é a fonte de verdade do roteamento. Toda rota
 * desconhecida cai no `<NotFoundPage />` final — o teste em
 * `src/__tests__/router.test.tsx` valida que essa cadeia funciona
 * de ponta a ponta.
 *
 * CODE-SPLITTING: páginas pesadas/secundárias entram via `React.lazy`
 * para tirar peso do bundle inicial (admin, blog, formulários). O
 * `App` (home) e `PortfolioPage` ficam síncronos porque são o LCP
 * principal — lazy aqui só introduziria flash de Suspense fallback.
 */
import { lazy, Suspense } from "react";
import App from "./App";
import PortfolioPage from "./pages/PortfolioPage";
import ProjectPage from "./pages/ProjectPage";
import NotFoundPage from "./pages/NotFoundPage";
import type { Route } from "./lib/useHashRoute";

// Rotas públicas secundárias — lazy para reduzir bundle inicial.
const FaqPage = lazy(() => import("./pages/FaqPage"));
const SobrePage = lazy(() => import("./pages/SobrePage"));
const PrivacidadePage = lazy(() => import("./pages/PrivacidadePage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const BlogTagsPage = lazy(() => import("./pages/BlogTagsPage"));
const BlogTagPage = lazy(() => import("./pages/BlogTagPage"));

// Admin — TODAS lazy. Visitante público nunca baixa esse código.
const LoginPage = lazy(() => import("./pages/admin/LoginPage"));
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const AnalyticsPage = lazy(() => import("./pages/admin/AnalyticsPage"));
const SeoPage = lazy(() => import("./pages/admin/SeoPage"));
const Seo404Page = lazy(() => import("./pages/admin/Seo404Page"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const ProjectsListPage = lazy(() => import("./pages/admin/ProjectsListPage"));
const ProjectFormPage = lazy(() => import("./pages/admin/ProjectFormPage"));
const FaqAdminPage = lazy(() => import("./pages/admin/FaqAdminPage"));
const BlogListPage = lazy(() => import("./pages/admin/BlogListPage"));
const BlogFormPage = lazy(() => import("./pages/admin/BlogFormPage"));
const TypographyPage = lazy(() => import("./pages/admin/TypographyPage"));
const ProtectedRoute = lazy(() => import("./components/admin/ProtectedRoute"));

// Fallback minimalista — o `route-transition` já está mascarando o swap,
// então um simples placeholder vazio evita flash de "Carregando…".
function LazyFallback() {
  return <div aria-hidden="true" style={{ minHeight: "100vh" }} />;
}

function L(node: React.ReactNode) {
  return <Suspense fallback={<LazyFallback />}>{node}</Suspense>;
}

export function renderRoute(route: Route) {
  if (route.name === "portfolio") return <PortfolioPage />;
  if (route.name === "project") return <ProjectPage slug={route.slug} />;
  if (route.name === "faq") return L(<FaqPage />);
  if (route.name === "sobre") return L(<SobrePage />);
  if (route.name === "privacidade") return L(<PrivacidadePage />);
  if (route.name === "blog") return L(<BlogPage />);
  if (route.name === "blog-tags") return L(<BlogTagsPage />);
  if (route.name === "blog-tag") return L(<BlogTagPage slug={route.slug} />);
  if (route.name === "blog-post") return L(<BlogPostPage slug={route.slug} />);
  if (route.name === "admin-login") return L(<LoginPage />);
  if (route.name === "admin-dashboard")
    return L(
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-analytics")
    return L(
      <ProtectedRoute>
        <AnalyticsPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-seo")
    return L(
      <ProtectedRoute>
        <SeoPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-seo-404")
    return L(
      <ProtectedRoute>
        <Seo404Page />
      </ProtectedRoute>
    );
  if (route.name === "admin-settings")
    return L(
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-projects")
    return L(
      <ProtectedRoute>
        <ProjectsListPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-project-new")
    return L(
      <ProtectedRoute>
        <ProjectFormPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-project-edit")
    return L(
      <ProtectedRoute>
        <ProjectFormPage slug={route.slug} />
      </ProtectedRoute>
    );
  if (route.name === "admin-faq")
    return L(
      <ProtectedRoute>
        <FaqAdminPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-blog")
    return L(
      <ProtectedRoute>
        <BlogListPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-blog-new")
    return L(
      <ProtectedRoute>
        <BlogFormPage />
      </ProtectedRoute>
    );
  if (route.name === "admin-blog-edit")
    return L(
      <ProtectedRoute>
        <BlogFormPage slug={route.slug} />
      </ProtectedRoute>
    );
  if (route.name === "admin-typography")
    return L(
      <ProtectedRoute>
        <TypographyPage />
      </ProtectedRoute>
    );
  // Home (com ou sem âncora) — única rota que renderiza o App principal
  if (route.name === "home") return <App />;
  // Qualquer outra rota (incluindo "not-found" e nomes futuros não mapeados acima)
  // cai aqui — renderiza 404 dedicada com noindex, evitando soft-404 do Google.
  return <NotFoundPage />;
}
