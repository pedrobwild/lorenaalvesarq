import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/**
 * ESLint flat config — alinhado ao default do `create-vite` (React + TS) com
 * algumas regras adicionais já cobertas pelo TypeScript estrito (no-explicit-any
 * fica como warn para não bloquear o build em arquivos legados; correções
 * incrementais ficam para PRs futuros do plano do audit).
 */
export default tseslint.config(
  {
    ignores: [
      "dist",
      "dist-ssr",
      "node_modules",
      "supabase/functions/**",
      "scripts/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Em arquivos de teste, o ambiente jsdom + globals da vitest exigem
    // relaxar a regra de `no-undef`/`require` para os helpers do framework.
    files: ["src/**/*.test.{ts,tsx}", "src/test/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.es2022 },
    },
  }
);
