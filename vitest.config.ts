import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Configuração do Vitest.
 *
 * Os testes rodam no ambiente jsdom para que possamos inspecionar `document.head`
 * (title, <meta name="robots">, JSON-LD) e o DOM renderizado pelo React.
 *
 * O script `npm test` é encadeado no `build` para que regressões em SEO
 * (ex.: alguém remover `noindex` da NotFoundPage) quebrem o build de produção
 * e não cheguem a virar soft-404 no Google.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
