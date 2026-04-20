import { useEffect } from "react";

/**
 * Monta um cursor customizado animado (elemento .cursor) no body e segue o mouse
 * com easing. Adiciona estado `cursor--hover` ao passar sobre links, botões e
 * qualquer elemento com `[data-cursor="hover"]`.
 *
 * Só ativa em desktop com mouse (hover: hover) e (pointer: fine).
 * Self-contained: cria/remove o elemento .cursor automaticamente, então cada
 * página pode chamar este hook sem precisar renderizar markup extra.
 */
export function useCustomCursor(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    const hasFineHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!hasFineHover) return;

    // Cria o elemento .cursor se ainda não existir
    let c = document.querySelector<HTMLElement>(".cursor");
    let createdHere = false;
    if (!c) {
      c = document.createElement("div");
      c.className = "cursor";
      c.setAttribute("aria-hidden", "true");
      document.body.appendChild(c);
      createdHere = true;
    }

    document.body.classList.add("has-custom-cursor");

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let rafId = 0;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    window.addEventListener("mousemove", onMove);

    const render = () => {
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      if (c) c.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(render);
    };
    render();

    // Define o conteúdo interno do cursor (label "ver +" para variante zoom)
    c.innerHTML = '<span class="cursor__label">ver <i>+</i></span>';

    const HOVER_SEL = 'a, button, .project-card, .process__item, [data-cursor="hover"]';
    const ZOOM_SEL = '[data-cursor="zoom"]';

    // Hover state — usa delegação para cobrir elementos adicionados depois
    const enter = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest(ZOOM_SEL)) {
        c?.classList.add("cursor--zoom");
        c?.classList.remove("cursor--hover");
      } else if (t.closest(HOVER_SEL)) {
        c?.classList.add("cursor--hover");
      }
    };
    const leave = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest(ZOOM_SEL)) {
        c?.classList.remove("cursor--zoom");
      } else if (t.closest(HOVER_SEL)) {
        c?.classList.remove("cursor--hover");
      }
    };
    document.addEventListener("mouseover", enter);
    document.addEventListener("mouseout", leave);


    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", enter);
      document.removeEventListener("mouseout", leave);
      document.body.classList.remove("has-custom-cursor");
      if (createdHere && c?.parentNode) c.parentNode.removeChild(c);
    };
  }, []);
}
