/**
 * preloadProjectCovers — injeta `<link rel="preload" as="image">` no <head>
 * para as primeiras N capas de projeto assim que a lista é resolvida.
 *
 * Por quê: na home, o usuário tende a clicar em uma das primeiras capas
 * visíveis. Sem preload, a navegação para `/projeto/:slug` só inicia o
 * download da capa depois que o React monta a `ProjectPage` — gerando
 * "flash" perceptível. Com preload de baixa prioridade, o browser já
 * começa o fetch enquanto o usuário ainda está explorando a home, sem
 * disputar banda com a hero (que tem fetchpriority="high").
 *
 * Idempotente: cada URL é injetada uma única vez (Set persistente entre
 * chamadas). Seguro chamar a cada render — só age quando a lista muda.
 */
const preloaded = new Set<string>();

export function preloadProjectCovers(urls: Array<string | null | undefined>, limit = 4): void {
  if (typeof document === "undefined") return;
  const targets = urls.filter((u): u is string => Boolean(u)).slice(0, limit);
  for (const url of targets) {
    if (preloaded.has(url)) continue;
    preloaded.add(url);
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = url;
    // Baixa prioridade — não compete com LCP/scripts críticos.
    link.setAttribute("fetchpriority", "low");
    // Marca para depuração + para cleanup futuro se algum dia for necessário.
    link.setAttribute("data-preload", "project-cover");
    document.head.appendChild(link);
  }
}
