# Lorena Alves Arquitetura

Site premium do estúdio **Lorena Alves Arquitetura** — arquitetura, interiores e mobiliário de alto padrão com identidade brasileira contemporânea.

## Stack

SPA React + TypeScript com:

- **Vite 5** — bundler / dev server
- **React 18** + roteador próprio baseado em hash (`src/lib/useHashRoute.ts`)
- **Supabase** — banco, auth e storage (`src/integrations/supabase`)
- **GSAP 3.12** + **ScrollTrigger** — timelines e reveals
- **Lenis** — smooth scroll editorial
- **Tailwind 3** — utilitários complementares ao design system
- **Vitest** + **@testing-library/react** — testes em ambiente jsdom

## Variáveis de ambiente

O app espera três variáveis prefixadas com `VITE_` (expostas ao bundle):

| Variável | Origem |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_PROJECT_ID` | Supabase → Project Settings → General → Reference ID |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → `anon` public key |

Copie o template e preencha localmente:

```bash
cp .env.example .env
# edite .env com os valores do painel do Supabase
```

> **Importante:** `.env` não é versionado (entrou no `.gitignore`). Apenas `.env.example` permanece no repositório como referência.

## Rodar localmente

```bash
npm ci          # instala dependências exatas do package-lock.json
npm run dev     # Vite dev server em http://localhost:5173
```

## Testes

```bash
npm test            # roda a suíte completa uma vez (vitest run)
npm run test:watch  # modo watch
```

## Build de produção

```bash
npm run build       # parity check + tsc -b + vite build
npm run preview     # serve o bundle de dist/ localmente
```

## Estrutura

```
.
├── index.html                  shell SPA (carrega /src/main.tsx)
├── src/
│   ├── main.tsx                bootstrap (router + cursor + analytics)
│   ├── App.tsx                 home (hero, projetos, sobre, método, contato)
│   ├── pages/                  rotas (Blog, BlogPost, Privacidade, admin/*)
│   ├── components/             componentes compartilhados (cursor, banner, footer)
│   ├── lib/                    hooks e serviços (useAuth, useBlog, useSeo, analytics)
│   ├── integrations/supabase/  cliente do Supabase e tipos gerados
│   └── __tests__/              testes de unidade do roteador e fluxos SEO
├── supabase/                   migrações e edge functions
├── scripts/                    utilitários (check-routes-parity, etc.)
└── public/                     ativos estáticos servidos como-são
```

## Deploy

Bundle de SPA — qualquer CDN compatível (Vercel, Netlify, Cloudflare Pages, S3 + CloudFront).
Defina as três variáveis `VITE_*` no painel do provedor antes do build.

---

Design & build: abril 2026.
