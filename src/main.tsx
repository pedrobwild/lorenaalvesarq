import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import PortfolioPage from "./pages/PortfolioPage";
import ProjectPage from "./pages/ProjectPage";
import { useHashRoute } from "./lib/useHashRoute";
import "./index.css";

function Root() {
  const route = useHashRoute();

  if (route.name === "portfolio") return <PortfolioPage />;
  if (route.name === "project") return <ProjectPage slug={route.slug} />;

  // home (com ou sem âncora) e not-found caem na App (que trata âncoras legadas)
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
