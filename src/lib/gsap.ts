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
}

export { gsap, ScrollTrigger };
