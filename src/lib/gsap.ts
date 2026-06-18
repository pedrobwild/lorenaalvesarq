/**
 * Importação central de GSAP + plugins.
 *
 * Antes deste módulo, cada página fazia `import { ScrollTrigger } from
 * "gsap/ScrollTrigger"` e contava com a chamada `gsap.registerPlugin`
 * que vive em `App.tsx` ter rodado primeiro. Em rotas que não passam
 * pela home (link compartilhado direto pra /blog, /portfolio, etc.) o
 * `App` não era a primeira mount, e o ScrollTrigger ficava sem
 * registrar — animações silenciosamente faliam ou caíam no fallback
 * de `onRefresh`.
 *
 * Importar SEMPRE deste módulo garante que o plugin esteja registrado
 * antes do primeiro uso. A flag de módulo impede dupla-registrada,
 * que é avisada com warning no console pelo próprio GSAP.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;
if (!registered) {
  gsap.registerPlugin(ScrollTrigger);
  registered = true;

  // Respeita `prefers-reduced-motion: reduce` — zera a duração padrão de
  // qualquer tween criado depois deste módulo. Animações decorativas
  // (parallax, fades, reveals) pulam para o estado final instantaneamente,
  // mantendo o layout funcional sem movimento. O CSS já zera transitions
  // e animations declarativas; este bloco cobre o lado JS.
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    gsap.defaults({ duration: 0, ease: "none" });
    // ScrollTrigger ainda dispara callbacks; o que conta é que os tweens
    // associados terminam em 0s e o estado final fica imediato.
  }
}

export { gsap, ScrollTrigger };
