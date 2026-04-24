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
 */
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
import Seo404Page from "./pages/admin/Seo404Page";
import SettingsPage from "./pages/admin/SettingsPage";
import ProjectsListPage from "./pages/admin/ProjectsListPage";
import ProjectFormPage from "./pages/admin/ProjectFormPage";
import FaqAdminPage from "./pages/admin/FaqAdminPage";
import BlogListPage from "./pages/admin/BlogListPage";
import BlogFormPage from "./pages/admin/BlogFormPage";
import ProtectedRoute from "./components/admin/ProtectedRoute";
import type { Route } from "./lib/useHashRoute";

export function renderRoute(route: Route) {
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
  if (route.name === "admin-seo-404")
    return (
      <ProtectedRoute>
        <Seo404Page />
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
  // Home (com ou sem âncora) — única rota que renderiza o App principal
  if (route.name === "home") return <App />;
  // Qualquer outra rota (incluindo "not-found" e nomes futuros não mapeados acima)
  // cai aqui — renderiza 404 dedicada com noindex, evitando soft-404 do Google.
  return <NotFoundPage />;
}
