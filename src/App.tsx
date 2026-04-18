import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  useEffect(() => {
    // ---------- Smooth scroll (Lenis) ----------
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis: Lenis | null = null;
    let rafId: number | null = null;

    if (!prefersReducedMotion) {
      lenis = new Lenis({
        duration: 1.25,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        wheelMultiplier: 1,
        smoothWheel: true,
      });

      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis?.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }

    // ---------- Loader ----------
    const loader = document.querySelector<HTMLDivElement>(".loader");
    let failsafe: ReturnType<typeof setTimeout> | null = null;

    if (loader) {
      failsafe = setTimeout(() => {
        loader.style.transform = "translateY(-100%)";
        loader.style.pointerEvents = "none";
        document.body.classList.add("is-ready");
        document
          .querySelectorAll<HTMLElement>(
            ".hero__title .word > span, .manifesto__text .reveal-line > span, .reveal-mask > *"
          )
          .forEach((el) => (el.style.transform = "none"));
        document
          .querySelectorAll<HTMLElement>(".reveal")
          .forEach((el) => el.classList.add("is-visible"));
      }, 5000);

      const mark = loader.querySelector<HTMLElement>(".loader__mark span");
      const line = loader.querySelector<HTMLElement>(".loader__line");
      const counter = loader.querySelector<HTMLElement>(".loader__counter");

      const tl = gsap.timeline({
        onComplete: () => {
          if (failsafe) clearTimeout(failsafe);
          loader.style.pointerEvents = "none";
          document.body.classList.add("is-ready");
          startHeroAnim();
        },
      });

      if (mark) tl.to(mark, { y: 0, duration: 1, ease: "power4.out" });
      if (counter) {
        const obj = { v: 0 };
        tl.to(
          obj,
          {
            v: 100,
            duration: 1.8,
            ease: "power2.inOut",
            onUpdate: () => {
              counter.textContent = String(Math.floor(obj.v)).padStart(3, "0");
            },
          },
          0.1
        );
      }
      if (line) tl.to(line, { width: "100%", duration: 1.8, ease: "power2.inOut" }, 0.1);
      tl.to(loader, { yPercent: -100, duration: 1.1, ease: "expo.inOut" }, "+=0.25");
    }

    // ---------- Hero intro ----------
    function startHeroAnim() {
      const hero = document.querySelector<HTMLElement>(".hero");
      if (!hero) return;
      const heroImg = hero.querySelector<HTMLImageElement>(".hero__media img");
      const words = hero.querySelectorAll<HTMLElement>(".hero__title .word > span");
      const lede = hero.querySelector<HTMLElement>(".hero__lede");
      const scroll = hero.querySelector<HTMLElement>(".hero__scroll");

      const tl = gsap.timeline();
      if (heroImg)
        tl.fromTo(
          heroImg,
          { scale: 1.25, filter: "brightness(0.5)" },
          { scale: 1.08, filter: "brightness(1)", duration: 2.2, ease: "expo.out" },
          0
        );
      if (words.length)
        tl.to(words, { y: 0, duration: 1.2, stagger: 0.08, ease: "power4.out" }, 0.3);
      if (lede)
        tl.fromTo(
          lede,
          { y: 16, opacity: 0 },
          { y: 0, opacity: 0.82, duration: 1, ease: "power3.out" },
          1.1
        );
      if (scroll)
        tl.fromTo(
          scroll,
          { y: 8, opacity: 0 },
          { y: 0, opacity: 0.75, duration: 0.8, ease: "power3.out" },
          1.3
        );
    }

    // ---------- Custom cursor ----------
    const c = document.querySelector<HTMLElement>(".cursor");
    const hasFineHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const cursorCleanups: Array<() => void> = [];

    if (c && hasFineHover) {
      let x = window.innerWidth / 2;
      let y = window.innerHeight / 2;
      let tx = x;
      let ty = y;
      let cursorRafId: number;

      const onMove = (e: MouseEvent) => {
        tx = e.clientX;
        ty = e.clientY;
      };
      window.addEventListener("mousemove", onMove);
      cursorCleanups.push(() => window.removeEventListener("mousemove", onMove));

      const render = () => {
        x += (tx - x) * 0.22;
        y += (ty - y) * 0.22;
        c.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        cursorRafId = requestAnimationFrame(render);
      };
      render();
      cursorCleanups.push(() => cancelAnimationFrame(cursorRafId));

      document
        .querySelectorAll<HTMLElement>(
          'a, button, .project-card, .process__item, [data-cursor="hover"]'
        )
        .forEach((el) => {
          const enter = () => c.classList.add("cursor--hover");
          const leave = () => c.classList.remove("cursor--hover");
          el.addEventListener("mouseenter", enter);
          el.addEventListener("mouseleave", leave);
          cursorCleanups.push(() => {
            el.removeEventListener("mouseenter", enter);
            el.removeEventListener("mouseleave", leave);
          });
        });
    }

    // ---------- Nav hide on scroll ----------
    const nav = document.querySelector<HTMLElement>(".nav");
    let lastY = window.scrollY;
    const onScroll = () => {
      if (!nav) return;
      const y = window.scrollY;
      if (y > lastY && y > 120) nav.style.transform = "translateY(-110%)";
      else nav.style.transform = "translateY(0)";
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // ---------- Mobile menu ----------
    const btn = document.querySelector<HTMLButtonElement>(".nav__toggle");
    const menu = document.querySelector<HTMLDivElement>(".mobile-menu");
    const mobileCleanups: Array<() => void> = [];
    if (btn && menu) {
      const setState = (open: boolean) => {
        menu.classList.toggle("is-open", open);
        document.body.classList.toggle("menu-open", open);
        btn.setAttribute("aria-expanded", String(open));
        btn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
        menu.setAttribute("aria-hidden", String(!open));
      };
      const onClick = () => setState(!menu.classList.contains("is-open"));
      btn.addEventListener("click", onClick);
      mobileCleanups.push(() => btn.removeEventListener("click", onClick));

      menu.querySelectorAll<HTMLAnchorElement>("a").forEach((a) => {
        const close = () => setState(false);
        a.addEventListener("click", close);
        mobileCleanups.push(() => a.removeEventListener("click", close));
      });

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape" && menu.classList.contains("is-open")) setState(false);
      };
      document.addEventListener("keydown", onKey);
      mobileCleanups.push(() => document.removeEventListener("keydown", onKey));
    }

    // ---------- ScrollTrigger animations ----------
    const heroImg = document.querySelector<HTMLImageElement>(".hero__media img");
    if (heroImg) {
      gsap.to(heroImg, {
        yPercent: 18,
        scale: 1.18,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.8,
        },
      });
    }

    document
      .querySelectorAll<HTMLElement>(".reveal-mask, .manifesto__text .reveal-line")
      .forEach((el) => {
        const child = (el.querySelector(":scope > *") || el.firstElementChild) as HTMLElement | null;
        if (!child) return;
        gsap.fromTo(
          child,
          { y: "110%" },
          {
            y: "0%",
            duration: 1,
            ease: "power4.out",
            scrollTrigger: { trigger: el, start: "top 88%" },
          }
        );
      });

    document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        onEnter: () => el.classList.add("is-visible"),
        once: true,
      });
    });

    // Horizontal projects — native horizontal scroll (no page pin)
    // The track scrolls horizontally on its own axis; the page can be scrolled past freely.

    // Fullbleed zoom
    document.querySelectorAll<HTMLImageElement>(".fullbleed img").forEach((img) => {
      gsap.fromTo(
        img,
        { scale: 1.18 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: img.closest(".fullbleed") as HTMLElement,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.1,
          },
        }
      );
    });

    // Essay split — parallax na textura + drift no objeto
    document.querySelectorAll<HTMLElement>(".essay").forEach((section) => {
      const texture = section.querySelector<HTMLImageElement>(".essay__texture");
      const object = section.querySelector<HTMLImageElement>(".essay__object");
      if (texture) {
        gsap.fromTo(
          texture,
          { scale: 1.15, yPercent: -3 },
          {
            scale: 1,
            yPercent: 3,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.1,
            },
          }
        );
      }
      if (object) {
        gsap.fromTo(
          object,
          { yPercent: 8 },
          {
            yPercent: -8,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.2,
            },
          }
        );
      }
    });

    // Footer mega drift
    const mega = document.querySelector<HTMLElement>(".footer__mega");
    if (mega) {
      gsap.fromTo(
        mega,
        { xPercent: 8 },
        {
          xPercent: -8,
          ease: "none",
          scrollTrigger: {
            trigger: mega,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.2,
          },
        }
      );
    }

    // Refresh once images load
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);

    // ---------- Cleanup ----------
    return () => {
      if (failsafe) clearTimeout(failsafe);
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("load", onLoad);
      cursorCleanups.forEach((fn) => fn());
      mobileCleanups.forEach((fn) => fn());
      ScrollTrigger.getAll().forEach((st) => st.kill());
      lenis?.destroy();
    };
  }, []);

  return (
    <>
      {/* Skip link */}
      <a href="#inicio" className="skip-link">
        Pular para o conteúdo
      </a>

      {/* Custom cursor */}
      <div className="cursor" aria-hidden="true"></div>

      {/* Loader */}
      <div className="loader" aria-hidden="true">
        <div className="loader__inner">
          <div className="loader__mark">
            <span>Lorena Alves</span>
          </div>
          <div className="loader__counter">000</div>
        </div>
        <div className="loader__line"></div>
      </div>

      {/* Nav */}
      <header className="nav">
        <a className="nav__brand" href="/" aria-label="Lorena Alves — Arquitetura">
          <span>Lorena Alves</span>
        </a>
        <nav className="nav__menu" aria-label="Principal">
          <a href="#projetos">Portifólio</a>
          <a href="#estudio">serviços</a>
          <a href="#metodo">Método</a>
          <a href="#contato">Sobre</a>
        </nav>
        <a className="nav__cta" href="#contato">
          ENTRE EM CONTATO
        </a>
        <button
          className="nav__toggle"
          aria-label="Abrir menu"
          aria-expanded="false"
          aria-controls="mobile-menu"
        >
          <span></span>
          <span></span>
        </button>
      </header>

      {/* Mobile menu */}
      <div className="mobile-menu" id="mobile-menu" aria-hidden="true">
        <nav>
          <a href="#projetos">Portifólio</a>
          <a href="#estudio">serviços</a>
          <a href="#metodo">Método</a>
          <a href="#contato">Sobre</a>
        </nav>
        <div>
          <div className="mono" style={{ marginBottom: "0.8rem" }}>
            Sobre
          </div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem" }}>
            contato@lorenaalves.arq.br
          </p>
        </div>
      </div>

      {/* Hero */}
      <section className="hero" id="inicio">
        <div className="hero__media">
          <img
            src="/images/hero-main.png"
            alt="Residência contemporânea brasileira projetada pelo estúdio Lorena Alves"
            fetchPriority="high"
          />
        </div>
        <div className="hero__vignette"></div>
        <div className="hero__ticker">São Paulo · 2026 · Estúdio autoral</div>
        <div className="hero__content">
          <h1 className="hero__title">
            <span className="word">
              <span>Lorena Alves</span>
            </span>
          </h1>
          <div className="hero__meta">
            <p className="hero__lede">
              Arquitetura vai muito além de forma &mdash; é sobre criar <em>futuro</em>,{" "}
              <em>propósito</em> e <em>legado</em>.
            </p>
            <div className="hero__scroll">Role para descobrir</div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          <span>
            Residencial <span className="marquee__dot"></span>
            Comercial <span className="marquee__dot"></span>
            <em>Interiores</em> <span className="marquee__dot"></span>
            Retrofit <span className="marquee__dot"></span>
            Consultoria <span className="marquee__dot"></span>
            <em>Autoral</em> <span className="marquee__dot"></span>
            Atemporal <span className="marquee__dot"></span>
          </span>
          <span>
            Residencial <span className="marquee__dot"></span>
            Comercial <span className="marquee__dot"></span>
            <em>Interiores</em> <span className="marquee__dot"></span>
            Retrofit <span className="marquee__dot"></span>
            Consultoria <span className="marquee__dot"></span>
            <em>Autoral</em> <span className="marquee__dot"></span>
            Atemporal <span className="marquee__dot"></span>
          </span>
        </div>
      </div>

      {/* Manifesto */}
      <section className="section section--tight manifesto" id="manifesto">
        <div className="manifesto__grid">
          <div className="section__eyebrow">Manifesto · 01</div>
          <div className="manifesto__text">
            <span className="reveal-line">
              <span>Construir é, antes de tudo,</span>
            </span>
            <span className="reveal-line">
              <span>
                um gesto de <em>escuta</em>.
              </span>
            </span>
            <span className="reveal-line">
              <span>Arquitetura que respeita o</span>
            </span>
            <span className="reveal-line">
              <span>tempo, o território e quem</span>
            </span>
            <span className="reveal-line">
              <span>irá habitar — para durar.</span>
            </span>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="projects" id="projetos">
        <div className="projects__head">
          <div>
            <div className="section__eyebrow">Projetos em destaque · 02</div>
            <h2 className="section__title" style={{ marginTop: "1.2rem" }}>
              Obras que carregam <em>silêncio</em>, presença e memória.
            </h2>
          </div>
          <div className="projects__count mono">Selecionados · 2024 — 2026</div>
        </div>
        <div className="projects__track">
          {[
            { n: "01", title: "Casa", em: "Paineira", tag: "Residencial", year: "2026", img: "project-01.png", alt: "Casa Paineira — pavilhão horizontal de concreto e ipê" },
            { n: "02", title: "Casa", em: "Jequitibá", tag: "Interiores", year: "2025", img: "project-02.png", alt: "Casa Jequitibá — interior contemporâneo brasileiro" },
            { n: "03", title: "Apto.", em: "Higienópolis", tag: "Residencial", year: "2025", img: "project-03.png", alt: "Apartamento Higienópolis — sala com estante em walnut" },
            { n: "04", title: "Casa", em: "Pau-Brasil", tag: "Residencial", year: "2025", img: "project-04.png", alt: "Casa Pau-Brasil — residência de praia com volume cantilevered" },
            { n: "05", title: "Restaurante", em: "Takka", tag: "Comercial", year: "2024", img: "project-05.png", alt: "Restaurante Takka — interior sofisticado com banquettes em couro" },
            { n: "06", title: "Fazenda", em: "Porto", tag: "Rural", year: "2024", img: "project-06.png", alt: "Fazenda Porto — pavilhão rural em taipa e telha cerâmica" },
          ].map((p) => (
            <article className="project-card" key={p.n}>
              <div className="project-card__media">
                <span className="project-card__number mono">{p.n} / 06</span>
                <img src={`/images/${p.img}`} alt={p.alt} loading="lazy" />
              </div>
              <div className="project-card__meta">
                <h3 className="project-card__title">
                  {p.title} <em>{p.em}</em>
                </h3>
                <div className="project-card__tags">
                  <span>{p.tag}</span>
                  <span>·</span>
                  <span>{p.year}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="projects__cta">
          <p className="mono" style={{ opacity: 0.6, maxWidth: "34ch" }}>
            Cada obra é um manuscrito — desenhada à mão, do primeiro risco ao último detalhe.
          </p>
          <a href="#estudio" className="btn-big">
            <span>VISITAR GALERIA COMPLETA</span>
            <span className="btn-big__arrow"></span>
          </a>
        </div>
      </section>

      {/* About */}
      <section className="section about" id="estudio">
        <div className="section__header">
          <div className="section__eyebrow">Estúdio · 03</div>
          <h2 className="section__title">
            Uma arquitetura <em>do silêncio</em>, do gesto e do detalhe.
          </h2>
        </div>
        <div className="about__grid">
          <div className="about__portrait reveal">
            <img
              src="/images/portrait.png"
              alt="Retrato de Lorena Alves, arquiteta fundadora do estúdio"
              loading="lazy"
            />
          </div>
          <div className="about__body">
            <h3 className="about__name reveal">
              Lorena <em>Alves</em>,<br />
              arquiteta fundadora.
            </h3>
            <div className="about__bio">
              <p>
                Lorena projeta obras como quem escreve — devagar, com intenção e memória. Sua
                prática une a escola modernista brasileira, a precisão construtiva europeia e uma
                sensibilidade material para os trópicos.
              </p>
              <p>
                O estúdio trabalha em poucas obras por ano, com dedicação integral. Do conceito às
                especificações finais: arquitetura, interiores, mobiliário autoral e paisagem —
                uma única linguagem, cuidada em cada detalhe.
              </p>
            </div>

            <div className="pillars">
              {[
                { n: "01", title: "Autoria", text: "Cada obra nasce de dentro para fora — sem fórmulas, sem recortes." },
                { n: "02", title: "Brasilidade", text: "Materiais, técnicas e luz do Brasil — traduzidos em uma arquitetura contemporânea." },
                { n: "03", title: "Atemporal", text: "Obras feitas para envelhecer com beleza — décadas depois da entrega." },
              ].map((pi) => (
                <div className="pillar reveal" key={pi.n}>
                  <div className="pillar__num">{pi.n}</div>
                  <h4 className="pillar__title">{pi.title}</h4>
                  <p className="pillar__text">{pi.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ensaio editorial — composição dupla (textura + objeto escultural) */}
      <section className="essay reveal" aria-label="Ensaio · Casa Pau-Brasil">
        <div className="essay__grid">
          <div className="essay__copy">
            <div className="essay__top">
              <span className="essay__tag">Ensaio · Casa Pau-Brasil</span>
            </div>

            <h2 className="essay__title">
              <span>O silêncio</span>
              <span><em>entre os volumes</em></span>
            </h2>

            <div className="essay__meta">
              <div className="essay__num">02.</div>
              <p className="essay__lede">
                Uma varanda suspensa sobre o mar — onde a luz se senta e a
                madeira carrega o gesto do ofício em cada junta. É nos intervalos
                que a casa respira.
              </p>
            </div>

            <div className="essay__footer">
              <a href="#projetos" className="essay__link">
                <span>Ver ensaio completo</span>
                <span className="essay__arrow" aria-hidden="true">→</span>
              </a>
              <span className="essay__index mono">001 / 006</span>
            </div>
          </div>

          <div className="essay__media">
            <img
              src="/images/intro-texture.png"
              alt="Textura de madeira maciça em close — veios e grãos"
              className="essay__texture"
              loading="lazy"
            />
            <img
              src="/images/stair-detail.png"
              alt="Detalhe escultural — escada helicoidal em madeira maciça"
              className="essay__object"
              loading="lazy"
            />
          </div>

          <div className="essay__scroll" aria-hidden="true">
            <span>Role</span>
            <span className="essay__scroll-arrow">↓</span>
          </div>
        </div>
      </section>

      {/* Credos */}
      <section className="credos" aria-label="Princípios do estúdio">
        {[
          { m: "I", text: <>Projetar é <em>escutar</em> antes de desenhar.</> },
          { m: "II", text: <>Poucas obras por ano, <em>cada uma inteira</em>.</> },
          { m: "III", text: <>O detalhe é <em>onde mora</em> a arquitetura.</> },
          { m: "IV", text: <>Desenhar para o <em>tempo longo</em>, não para o aplauso.</> },
        ].map((c) => (
          <div className="credo reveal" key={c.m}>
            <div className="credo__mark">{c.m}</div>
            <p className="credo__text">{c.text}</p>
          </div>
        ))}
      </section>

      {/* Fullbleed 2 */}
      <section className="fullbleed reveal">
        <img
          src="/images/intro-texture.png"
          alt="Detalhe de luz entre brise de madeira e parede de concreto"
          loading="lazy"
        />
        <div className="fullbleed__caption">
          <p className="fullbleed__quote">
            A matéria é linguagem. <br />O tempo, <em>o maior dos arquitetos</em>.
          </p>
          <p className="mono">— Filosofia do estúdio</p>
        </div>
      </section>

      {/* Process */}
      <section className="section process" id="metodo">
        <div className="section__header">
          <div className="section__eyebrow">Método · 04</div>
          <h2 className="section__title">
            Do primeiro <em>encontro</em> à casa habitada.
          </h2>
        </div>
        <div className="process__list">
          {[
            { n: "01", title: "Escuta", desc: "Uma conversa longa antes de qualquer risco. Ler a rotina, o território, os desejos não ditos." },
            { n: "02", title: "Conceito", desc: "O primeiro risco nasce à mão, em papel. Volumetria, luz, fluxo, atmosfera." },
            { n: "03", title: "Projeto", desc: "Desenvolvimento executivo e detalhamento integral. Nada de improviso em obra." },
            { n: "04", title: "Interiores", desc: "Mobiliário autoral, curadoria de peças clássicas, iluminação e paisagem." },
            { n: "05", title: "Obra", desc: "Presença semanal em campo, do canteiro ao ajuste fino. Precisão construída." },
            { n: "06", title: "Entrega", desc: "Ambientação, styling e registro fotográfico. A obra, pronta para o tempo." },
          ].map((p) => (
            <div className="process__item" tabIndex={0} key={p.n}>
              <span className="process__num">{p.n}</span>
              <h3 className="process__title">{p.title}</h3>
              <p className="process__desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section cta" id="contato">
        <div className="cta__grid">
          <h2 className="cta__title reveal">
            Para obras que exigem <em>tempo</em> e <em>cuidado.</em>
          </h2>
          <div className="cta__details">
            <div className="cta__detail">
              <span className="label">Escreva</span>
              <a href="mailto:contato@lorenaalves.arq.br">contato@lorenaalves.arq.br</a>
            </div>
            <div className="cta__detail">
              <span className="label">Telefone</span>
              <a href="tel:+5511999999999">+55 11 9 9999 9999</a>
            </div>
            <div className="cta__detail">
              <span className="label">Estúdio</span>
              <p>
                Rua Jerônimo da Veiga, 164
                <br />
                Itaim Bibi, São Paulo — SP
              </p>
            </div>
            <a href="mailto:contato@lorenaalves.arq.br" className="btn-big" data-cursor="hover">
              <span>ENTRE EM CONTATO</span>
              <span className="btn-big__arrow"></span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer__top">
          <div>
            <div className="footer__brand">Lorena Alves</div>
            <p className="footer__tag">
              Futuro, propósito e legado. Brasilidade contemporânea, desenhada para permanecer.
            </p>
          </div>
          <div className="footer__col">
            <h4>serviços</h4>
            <ul>
              <li>
                <a href="#estudio">Sobre</a>
              </li>
              <li>
                <a href="#metodo">Método</a>
              </li>
              <li>
                <a href="#projetos">Portifólio</a>
              </li>
            </ul>
          </div>
          <div className="footer__col">
            <h4>Social</h4>
            <ul>
              <li>
                <a href="#" aria-label="Instagram" rel="noopener">
                  Instagram
                </a>
              </li>
              <li>
                <a href="#" aria-label="Pinterest" rel="noopener">
                  Pinterest
                </a>
              </li>
              <li>
                <a href="#" aria-label="LinkedIn" rel="noopener">
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
          <div className="footer__col">
            <h4>Sobre</h4>
            <ul>
              <li>
                <a href="mailto:contato@lorenaalves.arq.br">contato@lorenaalves.arq.br</a>
              </li>
              <li>
                <a href="tel:+5511999999999">+55 11 9 9999 9999</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer__mega">
          Lorena Alves <em>arq</em>.
        </div>
        <div className="footer__bottom">
          <span>© 2026 Lorena Alves Arquitetura. Todos os direitos reservados.</span>
          <span>CAU BR · Brasil</span>
        </div>
      </footer>
    </>
  );
}
