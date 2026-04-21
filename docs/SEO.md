# Gestão de SEO — Lorena Alves Arquitetura

Este documento explica todas as ferramentas de SEO disponíveis no ambiente admin
e como registrar oficialmente o site no Google.

Acesse o painel em **[/admin/seo](/admin/seo)**.

---

## Estrutura do admin de SEO

A tela `Admin › SEO` é dividida em 7 abas:

| Aba | Função |
|---|---|
| **Global** | Título padrão, descrição, OG image, canonical, keywords, autor, geo |
| **Verificações** | Google Search Console, Bing, Yandex, Facebook, Pinterest |
| **Analytics & Pixels** | GA4, Google Tag Manager, Google Ads, Meta Pixel, Clarity, Hotjar |
| **Negócio local** | Schema LocalBusiness (horário, preço, CEP, mapa, GBP) |
| **Sitemap & Robots** | URLs dinâmicas, copiar, enviar ao Search Console |
| **Auditoria** | Análise automática on-page com score de 0–100 |
| **Guia Google** | 10 passos para registrar e ranquear oficialmente |

Todos os valores são persistidos na tabela `site_settings` do Supabase e aplicados
no `<head>` do site em tempo real via `src/lib/useSeo.ts`.

---

## Registro oficial no Google — resumo rápido

1. **Search Console** — https://search.google.com/search-console/welcome
   - Adicione `lorenaalvesarq.com` como propriedade
   - Escolha método "HTML tag" e copie apenas o `content=` do código
   - Cole em **Admin › SEO › Verificações › Google Search Console**, salve
   - Volte ao Search Console e clique em "Verificar"

2. **Sitemap** — envie `https://lorenaalvesarq.com/sitemap.xml` em Search Console › Sitemaps

3. **Google Analytics 4** — https://analytics.google.com/
   - Crie propriedade, copie o ID `G-XXXXXXX`
   - Cole em **Admin › SEO › Analytics › Google Analytics 4**

4. **Google Business Profile** — https://business.google.com/create
   - Fundamental para buscas locais em Uberlândia
   - Adicione foto, endereço completo, horário, telefone e link

Tudo explicado passo-a-passo na aba **Guia Google** do admin.

---

## Schema.org emitido automaticamente

A home injeta três blocos JSON-LD:

- `ProfessionalService` / `LocalBusiness` — dados do estúdio, endereço, horário, geo, serviços
- `WebSite` — nome, URL, idioma, publisher
- `Organization` — reforça a entidade para o Knowledge Graph

Cada projeto individual adiciona também:

- `CreativeWork` — ficha do projeto
- `BreadcrumbList` — trilha de navegação

Valide tudo em: https://search.google.com/test/rich-results

---

## Sitemap dinâmico

A edge function `supabase/functions/sitemap/index.ts` gera o XML a partir dos
projetos visíveis no banco. Inclui:

- Namespace de imagens (`xmlns:image`) para Google Images
- Hreflang `pt-BR`
- `lastmod` baseado em `updated_at` de cada projeto
- Cache de 1 hora

A função `robots/index.ts` gera o robots.txt dinâmico, bloqueando `/admin`
e incluindo regras para Googlebot, Bingbot, GPTBot e Google-Extended (LLMs).

---

## Auditoria

A aba Auditoria analisa o DOM atual e produz um score de 0–100, verificando:

- Título (comprimento 40–60)
- Meta description (120–160)
- H1 único e presença de H2
- Imagens com atributo alt
- Links com texto ou aria-label
- Canonical URL
- Open Graph image
- Dados estruturados JSON-LD
- Viewport, idioma, HTTPS
- IDs de Search Console e Analytics configurados

Cada execução é registrada na tabela `seo_audit_log`.

---

## Migrations

- `20260420020800` — cria `site_settings`
- `20260420030718` — adiciona campos SEO básicos
- `20260421203500_seo_advanced_fields.sql` — adiciona verificações, analytics,
  pixels, local business e tabela `seo_audit_log`

Para aplicar no Supabase de produção:

```bash
supabase db push
# ou pelo Dashboard: SQL Editor > cole o conteúdo da migration > Run
```

---

## Links rápidos

| Ferramenta | URL |
|---|---|
| Google Search Console | https://search.google.com/search-console |
| Google Analytics | https://analytics.google.com |
| Google Business Profile | https://business.google.com |
| PageSpeed Insights | https://pagespeed.web.dev/?url=https://lorenaalvesarq.com |
| Teste Rich Results | https://search.google.com/test/rich-results?url=https://lorenaalvesarq.com |
| Bing Webmaster | https://www.bing.com/webmasters |
| Meta Business Suite | https://business.facebook.com |
