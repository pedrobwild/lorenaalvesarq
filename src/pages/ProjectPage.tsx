import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { type ProjectImage } from "../data/projects";
import { useProjects } from "../lib/useProjects";
import { routes } from "../lib/useHashRoute";
import { track } from "../lib/analytics";
import { shouldRunParallax, shouldUseSmoothScroll } from "../lib/device";
import { useSeo, projectJsonLd, breadcrumbJsonLd } from "../lib/useSeo";
import { useSiteSettings } from "../lib/useSiteSettings";
import SmartImage from "../components/SmartImage";

type Props = { slug: string };

export default function ProjectPage({ slug }: Props) {
  const { projects } = useProjects();
  const { settings } = useSiteSettings();
  const project = projects.find((p) => p.slug === slug);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // SEO derivado: prioriza campos do admin; senão monta um título e descrição ricos.
  const seoTitle =
    project?.seoTitle ||
    (project
      ? `${project.title} ${project.em} — ${project.tag} ${project.location ? `em ${project.location}` : ""} | Lorena Alves Arquitetura`.replace(/\s+/g, " ").trim()
      : "Projeto — Lorena Alves Arquitetura");
  const seoDescription =
    project?.seoDescription ||
    (project
      ? `${project.summary} Projeto ${project.tag.toLowerCase()} ${project.year ? `de ${project.year}` : ""} ${project.location ? `em ${project.location}` : ""} pelo escritório Lorena Alves Arquitetura, com sede em Uberlândia/MG.`.replace(/\s+/g, " ").trim()
      : undefined);
  const ogImage = project?.ogImage || project?.cover;

  const jsonLd = settings && project
    ? [
        projectJsonLd(settings, { ...project, tag: project.tag }),
        breadcrumbJsonLd(settings, [
          { name: "Início", path: "/" },
          { name: "Portfólio", path: "/portfolio" },
          { name: `${project.title} ${project.em}`.trim(), path: `/projeto/${project.slug}` },
        ]),
      ]
    : undefined;

  useSeo({
    title: seoTitle,
    description: seoDescription,
    canonicalPath: `/projeto/${slug}`,
    ogImage,
    ogType: "article",
    jsonLd,
  });

  useEffect(() => {
    track("project_view", { project_slug: slug });
    const useLenis = shouldUseSmoothScroll();
    const canParallax = shouldRunParallax();
    let lenis: Lenis | null = null;
    let rafId: number | null = null;

    if (useLenis) {
      lenis = new Lenis({ duration: 1.25, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time: number) => {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    }

    const ctx = gsap.context(() => {
      // hero entrance
      gsap.from(".pp-hero__eyebrow, .pp-hero__title, .pp-hero__sub", {
        opacity: 0,
        y: 28,
        duration: 1,
        stagger: 0.08,
        ease: "power3.out",
        delay: 0.05,
      });
      gsap.from(".pp-hero__img img", { scale: 1.08, duration: 1.8, ease: "power3.out" });

      gsap.utils.toArray<HTMLElement>(".pp-reveal").forEach((el) => {
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

      // parallax leve nas imagens da galeria — só em desktop
      if (canParallax) {
        gsap.utils.toArray<HTMLElement>(".pp-gallery img").forEach((img) => {
          gsap.to(img, {
            yPercent: -8,
            ease: "none",
            scrollTrigger: {
              trigger: img.parentElement!,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });
        });
      }
    }, pageRef);

    return () => {
      ctx.revert();
      if (rafId) cancelAnimationFrame(rafId);
      lenis?.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [slug]);

  // Controles do lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (!project) return;
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight") setLightboxIdx((i) => (i! + 1) % project.gallery.length);
      if (e.key === "ArrowLeft")
        setLightboxIdx((i) => (i! - 1 + project.gallery.length) % project.gallery.length);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightboxIdx, project]);

  if (!project) {
    return (
      <div className="pp-404">
        <p className="mono">Projeto não encontrado.</p>
        <a href={routes.portfolio} className="pp-404__link">
          ← voltar ao portfólio
        </a>
      </div>
    );
  }

  const i = projects.findIndex((p) => p.slug === slug);
  const next = projects[(i + 1) % projects.length] ?? project;

  return (
    <div className="pp-page" ref={pageRef}>
      {/* Nav topo */}
      <nav className="pf-nav pp-nav">
        <a className="pf-nav__brand" href={routes.home} aria-label="lorenaalves arq — início">
          <span className="brand-lockup">lorena<b>alves</b><sup>arq</sup></span>
        </a>
        <a className="pf-nav__back" href={routes.portfolio} data-cursor="hover">
          <span className="pf-nav__arrow">←</span>
          <span>todos os projetos</span>
        </a>
      </nav>

      {/* Hero */}
      <header className="pp-hero">
        <div className="pp-hero__text">
          <p className="pp-hero__eyebrow mono">
            {project.tag} · {project.year} · {project.number} / 06
          </p>
          <h1 className="pp-hero__title">
            {project.title} <em>{project.em}</em>
          </h1>
          <p className="pp-hero__sub">{project.summary}</p>
        </div>
        <div className="pp-hero__img">
          <SmartImage
            src={project.cover}
            srcMd={project.coverMd}
            srcSm={project.coverSm}
            blurDataUrl={project.coverBlurDataUrl}
            alt={project.alt}
            sizes="(max-width: 900px) 100vw, 60vw"
            priority
            wrapperClassName="pp-hero__img-wrap"
          />
        </div>
      </header>

      {/* Ficha técnica + texto */}
      <section className="pp-facts pp-reveal">
        <div className="pp-facts__specs">
          <SpecRow label="Local" value={project.location} />
          <SpecRow label="Área" value={project.area} />
          <SpecRow label="Status" value={project.status} />
          <SpecRow label="Programa" value={project.program} />
          <SpecRow label="Materiais" value={project.materials.join(", ")} />
          <SpecRow label="Equipe" value={project.team} />
          <SpecRow label="Fotografia" value={project.photographer} />
        </div>
        <div className="pp-facts__intro">
          <p className="pp-facts__lede">{project.intro}</p>
        </div>
      </section>

      {/* Galeria */}
      <section className="pp-gallery">
        <div className="pp-gallery__head pp-reveal">
          <span className="mono">Galeria · {project.gallery.length} imagens</span>
          <span className="mono pp-gallery__hint">clique para ampliar</span>
        </div>
        <div className="pp-gallery__grid">
          {project.gallery.map((img, i) => (
            <GalleryTile
              key={`${project.slug}-${i}`}
              img={img}
              onOpen={() => setLightboxIdx(i)}
            />
          ))}
        </div>
      </section>

      {/* Próximo projeto */}
      <a
        href={routes.project(next.slug)}
        className="pp-next"
        style={{ backgroundImage: `url(${next.cover})` }}
        aria-label={`Próximo projeto: ${next.title} ${next.em}`}
      >
        <div className="pp-next__inner">
          <span className="mono pp-next__eyebrow">próximo projeto</span>
          <h2 className="pp-next__title">
            {next.title} <em>{next.em}</em>
          </h2>
          <span className="mono pp-next__meta">
            {next.tag} · {next.year}
          </span>
        </div>
        <div className="pp-next__veil" />
      </a>

      <footer className="pp-foot pp-reveal">
        <a href={routes.portfolio} className="pp-foot__link" data-cursor="hover">
          ← todos os projetos
        </a>
        <a href="#/#contato" className="pp-foot__link" data-cursor="hover">
          iniciar um projeto →
        </a>
      </footer>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          images={project.gallery}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onPrev={() =>
            setLightboxIdx((i) => (i! - 1 + project.gallery.length) % project.gallery.length)
          }
          onNext={() => setLightboxIdx((i) => (i! + 1) % project.gallery.length)}
        />
      )}
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="pp-spec">
      <span className="pp-spec__label mono">{label}</span>
      <span className="pp-spec__value">{value}</span>
    </div>
  );
}

function GalleryTile({ img, onOpen }: { img: ProjectImage; onOpen: () => void }) {
  const klass = `pp-tile pp-tile--${img.format ?? "full"} pp-reveal`;
  return (
    <figure className={klass}>
      <button type="button" className="pp-tile__btn" onClick={onOpen} data-cursor="zoom">
        <SmartImage
          src={img.src}
          srcMd={img.srcMd}
          srcSm={img.srcSm}
          blurDataUrl={img.blurDataUrl}
          alt={img.alt}
          sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 800px"
          wrapperClassName="pp-tile__img-wrap"
        />
        <span className="pp-tile__zoom mono">ampliar +</span>
      </button>
      {img.caption && <figcaption className="pp-tile__cap mono">{img.caption}</figcaption>}
    </figure>
  );
}

function Lightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: ProjectImage[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const img = images[index];
  return (
    <div className="pp-lb" role="dialog" aria-modal="true" aria-label="Visualizador de imagem">
      <button type="button" className="pp-lb__backdrop" onClick={onClose} aria-label="Fechar" />
      <button type="button" className="pp-lb__close" onClick={onClose} aria-label="Fechar">
        ×
      </button>
      <button type="button" className="pp-lb__nav pp-lb__nav--prev" onClick={onPrev} aria-label="Anterior">
        ←
      </button>
      <figure className="pp-lb__fig" data-cursor="zoom">
        <img src={img.src} alt={img.alt} />
        <figcaption className="pp-lb__cap mono">
          {index + 1} / {images.length} — {img.alt}
        </figcaption>
      </figure>
      <button type="button" className="pp-lb__nav pp-lb__nav--next" onClick={onNext} aria-label="Próxima">
        →
      </button>
    </div>
  );
}
