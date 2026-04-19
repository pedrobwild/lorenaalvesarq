import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { PROJECTS, type Project } from "../data/projects";
import { routes } from "../lib/useHashRoute";
import { shouldUseSmoothScroll } from "../lib/device";

const TAGS = ["Todos", "Residencial", "Interiores", "Comercial", "Rural"] as const;
type Tag = (typeof TAGS)[number];

export default function PortfolioPage() {
  const [filter, setFilter] = useState<Tag>("Todos");
  const [hovered, setHovered] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo<Project[]>(() => {
    if (filter === "Todos") return PROJECTS;
    return PROJECTS.filter((p) => p.tag === filter);
  }, [filter]);

  // Smooth scroll + revelação
  useEffect(() => {
    const useLenis = shouldUseSmoothScroll();
    let lenis: Lenis | null = null;
    let rafId: number | null = null;

    if (useLenis) {
      lenis = new Lenis({ duration: 1.2, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time: number) => {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    }

    // Reveal on scroll
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".pf-reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          }
        );
      });
    });

    // Entrada inicial do topo da página
    gsap.fromTo(
      ".pf-head > *",
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 1, stagger: 0.08, ease: "power3.out", delay: 0.05 }
    );

    return () => {
      ctx.revert();
      if (rafId) cancelAnimationFrame(rafId);
      lenis?.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  // Força refresh do ScrollTrigger ao mudar o filtro
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [filter]);

  return (
    <div className="pf-page">
      {/* Top nav minimal */}
      <nav className="pf-nav">
        <a className="pf-nav__brand" href={routes.home} aria-label="lorenaalves arq — início">
          <span className="brand-lockup">lorena<b>alves</b><sup>arq</sup></span>
        </a>
        <a className="pf-nav__back" href={routes.home} data-cursor="hover">
          <span className="pf-nav__arrow">←</span>
          <span>voltar ao início</span>
        </a>
      </nav>

      {/* Header */}
      <header className="pf-head">
        <p className="pf-head__eyebrow mono">Portfólio completo · 2024 — 2026</p>
        <h1 className="pf-head__title">
          Casas, interiores e <em>lugares que guardam vida</em>.
        </h1>
        <p className="pf-head__lede">
          Uma seleção curada de projetos do estúdio — cada obra desenhada como um manuscrito,
          do primeiro risco à casa habitada.
        </p>

        <div className="pf-filters" role="tablist" aria-label="Filtrar por categoria">
          {TAGS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={filter === t}
              className={`pf-filter ${filter === t ? "is-active" : ""}`}
              onClick={() => setFilter(t)}
              data-cursor="hover"
            >
              {t}
              <span className="pf-filter__count">
                {t === "Todos" ? PROJECTS.length : PROJECTS.filter((p) => p.tag === t).length}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* Grid editorial assimétrico */}
      <section className="pf-grid" ref={gridRef}>
        {filtered.map((p, i) => {
          // padrão editorial: alterna tamanhos para criar ritmo
          const span = i % 5 === 0 ? "pf-card--lg" : i % 3 === 0 ? "pf-card--md" : "pf-card--sm";
          return (
            <a
              key={p.slug}
              href={routes.project(p.slug)}
              className={`pf-card pf-reveal ${span} ${hovered && hovered !== p.slug ? "is-dim" : ""}`}
              onMouseEnter={() => setHovered(p.slug)}
              onMouseLeave={() => setHovered(null)}
              data-cursor="hover"
              aria-label={`Abrir projeto ${p.title} ${p.em}`}
            >
              <div className="pf-card__media" data-cursor="zoom">
                <img src={p.cover} alt={p.alt} loading="lazy" />
                <div className="pf-card__veil" />
                <span className="pf-card__index mono">
                  {p.number} / {String(PROJECTS.length).padStart(2, "0")}
                </span>
                <span className="pf-card__go mono">
                  ver projeto
                  <span aria-hidden="true"> →</span>
                </span>
              </div>
              <div className="pf-card__meta">
                <h2 className="pf-card__title">
                  {p.title} <em>{p.em}</em>
                </h2>
                <div className="pf-card__row">
                  <span className="pf-card__tag mono">{p.tag}</span>
                  <span className="pf-card__dot" aria-hidden="true">·</span>
                  <span className="mono">{p.year}</span>
                  <span className="pf-card__dot" aria-hidden="true">·</span>
                  <span className="mono">{p.location}</span>
                </div>
                <p className="pf-card__summary">{p.summary}</p>
              </div>
            </a>
          );
        })}

        {filtered.length === 0 && (
          <div className="pf-empty pf-reveal">
            <p className="mono">Nenhum projeto nessa categoria — ainda.</p>
          </div>
        )}
      </section>

      {/* Footer leve */}
      <footer className="pf-foot pf-reveal">
        <div>
          <p className="pf-foot__quote">
            Cada obra é um <em>manuscrito</em> — desenhada à mão, do primeiro risco ao último detalhe.
          </p>
        </div>
        <a className="pf-foot__cta" href="#/#contato" data-cursor="hover">
          <span>INICIAR UM PROJETO</span>
          <span className="btn-big__arrow" />
        </a>
      </footer>
    </div>
  );
}
