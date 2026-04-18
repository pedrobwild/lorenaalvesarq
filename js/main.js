/* ============================================
   LORENA ALVES ARQUITETURA — Premium interactions
   ============================================ */

// ---------- Smooth scroll (Lenis) ----------
let lenis;
if (window.Lenis && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  lenis = new Lenis({
    duration: 1.25,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    wheelMultiplier: 1,
    smoothWheel: true
  });

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    // Fallback: RAF manual só quando GSAP não está disponível
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }
}

// ---------- Loader ----------
window.addEventListener('load', () => {
  const loader = document.querySelector('.loader');
  if (!loader) return;

  // Safety net: se GSAP não carregar, derruba o loader em 5s
  const failsafe = setTimeout(() => {
    loader.style.transform = 'translateY(-100%)';
    loader.style.pointerEvents = 'none';
    document.body.classList.add('is-ready');
    document.querySelectorAll('.hero__title .word > span, .manifesto__text .reveal-line > span, .reveal-mask > *')
      .forEach(el => { el.style.transform = 'none'; });
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
  }, 5000);

  if (!window.gsap) return; // noscript/CSS fallback cuida do resto

  const mark = loader.querySelector('.loader__mark span');
  const line = loader.querySelector('.loader__line');
  const counter = loader.querySelector('.loader__counter');

  const tl = gsap.timeline({ onComplete: () => {
    clearTimeout(failsafe);
    loader.style.pointerEvents = 'none';
    document.body.classList.add('is-ready');
    startHeroAnim();
  }});

  if (mark) tl.to(mark, { y: 0, duration: 1, ease: 'power4.out' });
  if (counter) {
    const obj = { v: 0 };
    tl.to(obj, {
      v: 100,
      duration: 1.8,
      ease: 'power2.inOut',
      onUpdate: () => { counter.textContent = String(Math.floor(obj.v)).padStart(3, '0'); }
    }, 0.1);
  }
  if (line) tl.to(line, { width: '100%', duration: 1.8, ease: 'power2.inOut' }, 0.1);
  tl.to(loader, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '+=0.25');
});

// ---------- Hero intro ----------
function startHeroAnim() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const heroImg = hero.querySelector('.hero__media img');
  const words = hero.querySelectorAll('.hero__title .word > span');
  const lede = hero.querySelector('.hero__lede');
  const scroll = hero.querySelector('.hero__scroll');

  const tl = gsap.timeline();
  if (heroImg) tl.fromTo(heroImg, { scale: 1.25, filter: 'brightness(0.5)' }, { scale: 1.08, filter: 'brightness(1)', duration: 2.2, ease: 'expo.out' }, 0);
  if (words.length) tl.to(words, { y: 0, duration: 1.2, stagger: 0.08, ease: 'power4.out' }, 0.3);
  if (lede) tl.fromTo(lede, { y: 16, opacity: 0 }, { y: 0, opacity: 0.82, duration: 1, ease: 'power3.out' }, 1.1);
  if (scroll) tl.fromTo(scroll, { y: 8, opacity: 0 }, { y: 0, opacity: 0.75, duration: 0.8, ease: 'power3.out' }, 1.3);
}

// ---------- Custom cursor ----------
(function cursor() {
  const c = document.querySelector('.cursor');
  // Só em dispositivos com hover real + pointer fino (desktops)
  if (!c || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  let tx = x, ty = y;

  window.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
  function render() {
    x += (tx - x) * 0.22;
    y += (ty - y) * 0.22;
    c.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    requestAnimationFrame(render);
  }
  render();

  document.querySelectorAll('a, button, .project-card, .process__item, [data-cursor="hover"]').forEach(el => {
    el.addEventListener('mouseenter', () => c.classList.add('cursor--hover'));
    el.addEventListener('mouseleave', () => c.classList.remove('cursor--hover'));
  });
})();

// ---------- Nav hide on scroll down ----------
(function navBehavior() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > lastY && y > 120) nav.style.transform = 'translateY(-110%)';
    else nav.style.transform = 'translateY(0)';
    lastY = y;
  }, { passive: true });
})();

// ---------- Mobile menu (com ARIA) ----------
(function mobileMenu() {
  const btn = document.querySelector('.nav__toggle');
  const menu = document.querySelector('.mobile-menu');
  if (!btn || !menu) return;

  const setState = (open) => {
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.setAttribute('aria-hidden', String(!open));
  };

  btn.addEventListener('click', () => setState(!menu.classList.contains('is-open')));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setState(false)));

  // Fecha com Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) setState(false);
  });
})();

// ---------- Hero parallax + reveals (requer GSAP) ----------
if (window.gsap && window.ScrollTrigger) {

  const heroImg = document.querySelector('.hero__media img');
  if (heroImg) {
    gsap.to(heroImg, {
      yPercent: 18,
      scale: 1.18,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 }
    });
  }

  // ---------- Reveal text masks ----------
  document.querySelectorAll('.reveal-mask, .manifesto__text .reveal-line').forEach(el => {
    const child = el.querySelector(':scope > *') || el.firstElementChild;
    if (!child) return;
    gsap.fromTo(child, { y: '110%' }, {
      y: '0%', duration: 1, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  // ---------- Generic reveals ----------
  document.querySelectorAll('.reveal').forEach(el => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      onEnter: () => el.classList.add('is-visible'),
      once: true
    });
  });

  // ---------- Horizontal projects scroll ----------
  const track = document.querySelector('.projects__track');
  if (track) {
    const cards = track.querySelectorAll('.project-card');
    if (cards.length > 2 && window.matchMedia('(min-width: 900px)').matches) {
      const scrollLen = () => track.scrollWidth - window.innerWidth + 120;
      gsap.to(track, {
        x: () => -scrollLen(),
        ease: 'none',
        scrollTrigger: {
          trigger: '.projects',
          start: 'top top',
          end: () => `+=${scrollLen()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true
        }
      });

      // subtle per-card parallax on images
      requestAnimationFrame(() => {
        const containerST = ScrollTrigger.getAll().find(st => st.trigger === document.querySelector('.projects') && st.pin);
        if (!containerST || !containerST.animation) return;
        cards.forEach((card) => {
          const img = card.querySelector('img');
          if (!img) return;
          gsap.fromTo(img, { yPercent: -4 }, {
            yPercent: 4,
            ease: 'none',
            scrollTrigger: { trigger: card, start: 'left right', end: 'right left', scrub: 1, containerAnimation: containerST.animation }
          });
        });
      });
    }
  }

  // ---------- Fullbleed image zoom on scroll ----------
  document.querySelectorAll('.fullbleed img').forEach(img => {
    gsap.fromTo(img, { scale: 1.18 }, {
      scale: 1,
      ease: 'none',
      scrollTrigger: { trigger: img.closest('.fullbleed'), start: 'top bottom', end: 'bottom top', scrub: 1.1 }
    });
  });

  // ---------- Footer mega title (horizontal drift) ----------
  const mega = document.querySelector('.footer__mega');
  if (mega) {
    gsap.fromTo(mega, { xPercent: 8 }, {
      xPercent: -8,
      ease: 'none',
      scrollTrigger: { trigger: mega, start: 'top bottom', end: 'bottom top', scrub: 1.2 }
    });
  }
}

// ---------- Refresh ScrollTrigger after images load ----------
window.addEventListener('load', () => {
  if (window.ScrollTrigger) ScrollTrigger.refresh();
});
