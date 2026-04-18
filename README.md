# Lorena Alves Arquitetura

Site premium do estúdio **Lorena Alves Arquitetura** — arquitetura, interiores e mobiliário de alto padrão com identidade brasileira contemporânea.

## Stack

Site estático (HTML + CSS + JS vanilla) com:

- **GSAP 3.12** — timelines, ScrollTrigger, scrub animations
- **Lenis** — smooth scroll editorial
- **Fraunces** (display) + **General Sans** (body) + **JetBrains Mono** (labels)

## Estrutura

```
.
├── index.html          Home completa (loader, hero, projetos, sobre, método, contato)
├── css/style.css       Design system completo (tokens, tipografia, todas as seções)
├── js/main.js          Interações: Lenis, cursor, loader, reveals, horizontal scroll, counters
├── images/             Imagens do site (hero, 6 projetos, retrato, ambientes)
└── pages/              Páginas internas (expandir quando necessário)
```

## Rodar localmente

```bash
python3 -m http.server 5000
# abrir http://localhost:5000
```

## Deploy

Arquivos estáticos — publicar em qualquer CDN (S3, Vercel, Netlify, Cloudflare Pages).

---

Design & build: abril 2026.
