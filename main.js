/* ==========================================================================
   AURUM & NOIR — main.js
   Módulos: preloader, cursor, header, reveal, marquee(css-only), tilt,
            storytelling-scroll, parallax, counters, carousel, newsletter,
            progress + back-to-top.
   Concatenado em um arquivo só (comentado por seção) para simplificar o
   deploy estático; cada seção poderia virar seu próprio arquivo ES module
   sem alterações (basta exportar as funções init*).
   ========================================================================== */

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(pointer: coarse)').matches;

if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

/* util: throttle via rAF */
function rafThrottle(fn) {
  let ticking = false;
  return (...args) => {
    if (!ticking) {
      requestAnimationFrame(() => { fn(...args); ticking = false; });
      ticking = true;
    }
  };
}

/* ==========================================================================
   PRELOADER
   Sincroniza a contagem % com o carregamento real das imagens críticas.
   ========================================================================== */
function initPreloader() {
  const preloader = document.getElementById('preloader');
  const percentEl = document.getElementById('preloader-percent');
  const fillEl = document.getElementById('preloader-fill');
  if (!preloader) return Promise.resolve();

  const criticalSrcs = [
    document.getElementById('hero-img')?.src
  ].filter(Boolean);

  let loaded = 0;
  const total = Math.max(criticalSrcs.length, 1);

  function updateProgress(pct) {
    percentEl.textContent = Math.round(pct);
    fillEl.style.width = pct + '%';
  }

  const loadPromises = criticalSrcs.map(src => new Promise(resolve => {
    const img = new Image();
    const done = () => { loaded++; updateProgress((loaded / total) * 100); resolve(); };
    img.onload = done;
    img.onerror = done; // não trava o preloader se a imagem falhar (hotlink/CORS)
    img.src = src;
  }));

  if (criticalSrcs.length === 0) updateProgress(100);

  return Promise.all(loadPromises).then(() => {
    return new Promise(resolve => {
      const finish = () => {
        preloader.classList.add('is-leaving');
        setTimeout(() => {
          preloader.classList.add('is-done');
          document.getElementById('hero-img')?.closest('.hero__image-frame')?.classList.add('is-revealed');
          setTimeout(() => { preloader.style.display = 'none'; resolve(); }, 750);
        }, 550);
      };
      // pequeno delay mínimo para o numero não "piscar" instantâneo
      setTimeout(finish, prefersReduced ? 0 : 350);
    });
  });
}

/* ==========================================================================
   CURSOR CUSTOMIZADO
   ========================================================================== */
function initCursor() {
  if (isTouch) return;
  const cursor = document.getElementById('cursor');
  const label = document.getElementById('cursor-label');
  if (!cursor) return;

  let mouseX = 0, mouseY = 0, curX = 0, curY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    cursor.classList.remove('is-hidden');
  });
  document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));

  function loop() {
    curX += (mouseX - curX) * 0.18;
    curY += (mouseY - curY) * 0.18;
    cursor.style.transform = `translate(${curX}px, ${curY}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  }
  loop();

  document.querySelectorAll('a, button, [data-tilt]').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-link'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-link'));
  });

  document.querySelectorAll('[data-tilt] img, .collection-card__media, .hero__image-frame').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('is-image');
      label.textContent = 'Ver peça';
    });
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-image'));
  });
}

/* ==========================================================================
   MAGNETIC BUTTONS
   ========================================================================== */
function initMagnetic() {
  if (isTouch || prefersReduced) return;
  document.querySelectorAll('[data-magnetic]').forEach(el => {
    el.addEventListener('mousemove', rafThrottle((e) => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${relX * 0.25}px, ${relY * 0.35}px)`;
    }));
    el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0,0)'; });
  });
}

/* ==========================================================================
   HEADER — sticky + glass on scroll
   ========================================================================== */
function initHeader() {
  const header = document.getElementById('header');
  const onScroll = rafThrottle(() => {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ==========================================================================
   SCROLL REVEAL — IntersectionObserver (leve, sem GSAP)
   ========================================================================== */
function initReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach(el => io.observe(el));
}

/* ==========================================================================
   HERO SPLIT-TEXT (letra a letra) via GSAP
   Justificativa: split + stagger com easing coordenado é o caso clássico
   onde GSAP economiza dezenas de linhas de bookkeeping de rAF manual.
   ========================================================================== */
function initHeroSplit() {
  const lines = document.querySelectorAll('.hero__title .line');
  if (!lines.length) return;

  if (prefersReduced || !window.gsap) {
    lines.forEach(l => l.style.opacity = 1);
    return;
  }

  lines.forEach(line => {
    const text = line.textContent;
    line.innerHTML = '';
    text.split('').forEach(ch => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      span.style.display = 'inline-block';
      span.style.willChange = 'transform';
      line.appendChild(span);
    });
  });

  const chars = document.querySelectorAll('.hero__title .line span');
  gsap.set(chars, { yPercent: 120, opacity: 0 });
  gsap.to(chars, {
    yPercent: 0, opacity: 1, duration: 0.9, ease: 'power4.out',
    stagger: 0.02, delay: 0.3
  });
}

/* ==========================================================================
   TILT 3D — perspective + rotateX/rotateY via mousemove
   ========================================================================== */
function initTilt() {
  if (isTouch || prefersReduced) return;
  document.querySelectorAll('[data-tilt]').forEach(el => {
    el.style.transformStyle = 'preserve-3d';
    const strength = 10;
    el.addEventListener('mousemove', rafThrottle((e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${px * strength}deg) rotateX(${-py * strength}deg)`;
      el.classList.add('is-touched');
    }));
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg)';
    });
  });
}

/* ==========================================================================
   STORYTELLING — clip-path scroll reveal via ScrollTrigger scrub
   ========================================================================== */
function initStorytelling() {
  const wrap = document.querySelector('.storytelling__image-wrap');
  if (!wrap) return;

  if (prefersReduced || !window.gsap) {
    wrap.style.clipPath = 'inset(0)';
    return;
  }

  gsap.to(wrap, {
    clipPath: 'inset(0 0% 0 0)',
    ease: 'none',
    scrollTrigger: {
      trigger: '.storytelling',
      start: 'top top',
      end: '+=100%',
      scrub: 0.6
    }
  });
}

/* ==========================================================================
   PARALLAX — múltiplas camadas em "A Arte do Ouro"
   ========================================================================== */
function initParallax() {
  const layers = document.querySelectorAll('[data-parallax]');
  const goldImgWrap = document.querySelector('.gold-art__layer--image');
  if (!layers.length) return;

  if (prefersReduced) {
    goldImgWrap?.classList.add('is-lit');
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) goldImgWrap?.classList.add('is-lit');
    });
  }, { threshold: 0.35 });
  const section = document.querySelector('.gold-art');
  if (section) io.observe(section);

  const onScroll = rafThrottle(() => {
    const section = document.querySelector('.gold-art');
    if (!section) return;
    const rect = section.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
    layers.forEach(layer => {
      const speed = parseFloat(layer.dataset.parallax);
      const offset = (progress - 0.5) * speed * 200;
      layer.style.transform = `translateY(${offset}px)`;
    });
  });
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ==========================================================================
   CONTADORES ANIMADOS — requestAnimationFrame + easing custom
   ========================================================================== */
function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

function initCounters() {
  const counters = document.querySelectorAll('.counter__number');
  if (!counters.length) return;

  const animate = (el) => {
    const target = parseInt(el.dataset.count, 10);
    if (prefersReduced) { el.textContent = target.toLocaleString('pt-BR'); return; }
    const duration = 1600;
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = easeOutExpo(progress);
      el.textContent = Math.round(eased * target).toLocaleString('pt-BR');
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { animate(entry.target); io.unobserve(entry.target); }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => io.observe(el));
}

/* ==========================================================================
   CARROSSEL DE DEPOIMENTOS — drag/swipe (mouse + touch)
   ========================================================================== */
function initCarousel() {
  const track = document.getElementById('testimonial-track');
  const dotsWrap = document.getElementById('testimonial-dots');
  if (!track) return;

  const slides = Array.from(track.children);
  let index = 0;
  let startX = 0, currentX = 0, dragging = false, trackStart = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    if (i === 0) dot.classList.add('is-active');
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function slideWidth() {
    return slides[0].getBoundingClientRect().width + 32; // + gap
  }

  function goTo(i) {
    index = Math.max(0, Math.min(i, slides.length - 1));
    track.style.transform = `translateX(-${index * slideWidth()}px)`;
    dots.forEach((d, di) => d.classList.toggle('is-active', di === index));
  }

  function onDown(clientX) {
    dragging = true; startX = clientX; trackStart = -index * slideWidth();
    track.classList.add('is-dragging');
  }
  function onMove(clientX) {
    if (!dragging) return;
    currentX = clientX - startX;
    track.style.transform = `translateX(${trackStart + currentX}px)`;
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    if (currentX < -60) goTo(index + 1);
    else if (currentX > 60) goTo(index - 1);
    else goTo(index);
    currentX = 0;
  }

  track.addEventListener('mousedown', (e) => onDown(e.clientX));
  window.addEventListener('mousemove', (e) => onMove(e.clientX));
  window.addEventListener('mouseup', onUp);

  track.addEventListener('touchstart', (e) => onDown(e.touches[0].clientX), { passive: true });
  track.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
  track.addEventListener('touchend', onUp);

  window.addEventListener('resize', rafThrottle(() => goTo(index)));
}

/* ==========================================================================
   NEWSLETTER — validação regex + shake/checkmark
   ========================================================================== */
function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;
  const input = document.getElementById('newsletter-email');
  const field = document.querySelector('.newsletter__field');
  const message = document.getElementById('newsletter-message');
  const submitBtn = form.querySelector('.btn');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value.trim();

    field.classList.remove('is-error');
    message.classList.remove('is-error', 'is-success');

    if (!emailRegex.test(value)) {
      field.classList.add('is-error');
      message.textContent = 'Insira um e-mail válido para continuar.';
      message.classList.add('is-error');
      // reflow para reiniciar a animação de shake
      void field.offsetWidth;
      return;
    }

    message.textContent = 'Bem-vindo à lista privada Aurum & Noir.';
    message.classList.add('is-success');
    submitBtn.classList.add('is-success');
    input.value = '';
    setTimeout(() => submitBtn.classList.remove('is-success'), 2400);
  });
}

/* ==========================================================================
   SCROLL PROGRESS + BACK TO TOP
   ========================================================================== */
function initProgress() {
  const bar = document.getElementById('scroll-progress');
  const backToTop = document.getElementById('back-to-top');
  const ring = document.querySelector('.back-to-top__ring circle');
  const circumference = 125.6;

  const onScroll = rafThrottle(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? scrollTop / docHeight : 0;
    bar.style.width = (pct * 100) + '%';
    ring.style.strokeDashoffset = circumference * (1 - pct);
    ring.classList.toggle('progressed', pct > 0.02);
    backToTop.classList.toggle('is-visible', scrollTop > window.innerHeight * 0.6);
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  });
}

/* ==========================================================================
   SMOOTH SCROLL PARA ÂNCORAS
   ========================================================================== */
function initAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  });
}

/* ==========================================================================
   BOOT
   ========================================================================== */
(async function boot() {
  initHeader();
  initReveal();
  initCounters();
  initCarousel();
  initNewsletter();
  initProgress();
  initAnchors();
  initTilt();
  initMagnetic();
  initParallax();
  initStorytelling();
  initCursor();

  await initPreloader();
  initHeroSplit();
})();
