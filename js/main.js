/* =========================================================================
   AURUM & NOIR — main.js
   Vanilla JS + GSAP/ScrollTrigger + Three.js (via CDN, ver index.html).
   Organizado em módulos independentes (IIFE) para que uma falha em um
   módulo (ex.: WebGL indisponível) não quebre os demais.
   ========================================================================= */

// ---- Helpers -------------------------------------------------------------
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function throttle(fn, wait){
  let last = 0, timer = null;
  return (...args) => {
    const now = Date.now();
    if (now - last >= wait){
      last = now; fn(...args);
    } else {
      clearTimeout(timer);
      timer = setTimeout(() => { last = Date.now(); fn(...args); }, wait - (now - last));
    }
  };
}
function debounce(fn, wait){
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

if (window.gsap && window.ScrollTrigger){ gsap.registerPlugin(ScrollTrigger); }

/* =========================================================================
   1. IMAGE FALLBACK — gradiente dourado radial se a imagem do Unsplash falhar
   ========================================================================= */
(function imageFallback(){
  document.querySelectorAll('img[data-fallback-gradient]').forEach(img => {
    img.addEventListener('error', () => {
      img.classList.add('is-fallback');
      img.removeAttribute('src');
    }, { once:true });
  });
})();

/* =========================================================================
   2. PRELOADER — progresso real via contagem de assets (imagens + fonts)
   ========================================================================= */
(function preloader(){
  const el = document.getElementById('preloader');
  const fill = document.getElementById('preloaderFill');
  const pct = document.getElementById('preloaderPct');
  if (!el) return;

  const assets = Array.from(document.images);
  const total = Math.max(assets.length, 1);
  let loaded = 0;

  function update(){
    loaded++;
    const p = Math.min(100, Math.round((loaded/total)*100));
    fill.style.width = p + '%';
    pct.textContent = p + '%';
    if (loaded >= total) finish();
  }

  function finish(){
    document.body.classList.add('is-loaded');
    el.classList.add('is-done');
    setTimeout(() => {
      el.style.display = 'none';
      // dispara animações de entrada do hero somente após o preloader sair
      window.dispatchEvent(new CustomEvent('app:ready'));
    }, 950);
  }

  if (assets.length === 0){ finish(); return; }

  assets.forEach(img => {
    if (img.complete) { update(); }
    else {
      img.addEventListener('load', update, { once:true });
      img.addEventListener('error', update, { once:true });
    }
  });

  // safety net: nunca deixa o usuário preso no preloader
  setTimeout(() => { if (!el.classList.contains('is-done')) finish(); }, 6000);
})();

/* =========================================================================
   3. CURSOR CUSTOMIZADO — desativado em touch (pointer:coarse)
   ========================================================================= */
(function customCursor(){
  if (isTouch) { document.body.classList.add('no-cursor'); return; }
  const cursor = document.getElementById('cursor');
  const dot = cursor.querySelector('.cursor__dot');
  const ring = cursor.querySelector('.cursor__ring');
  let mx = window.innerWidth/2, my = window.innerHeight/2, rx = mx, ry = my;

  window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px)`; });

  function raf(){
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.transform = `translate(${rx}px,${ry}px)`;
    requestAnimationFrame(raf);
  }
  raf();

  document.querySelectorAll('[data-cursor="link"], a, button').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-link'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-link'));
  });
  document.querySelectorAll('.jewel-card, .curtain-reveal').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-image'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-image'));
  });
})();

/* =========================================================================
   4. SCROLL PROGRESS BAR + BACK TO TOP (com anel de progresso SVG)
   ========================================================================= */
(function scrollProgress(){
  const bar = document.getElementById('scrollProgress');
  const btn = document.getElementById('backToTop');
  const ring = btn.querySelector('circle');
  const CIRC = 119; // 2 * PI * r(19)

  const onScroll = throttle(() => {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? scrolled/max : 0;
    bar.style.width = (p*100) + '%';
    ring.style.strokeDashoffset = CIRC - (p*CIRC);
    btn.classList.toggle('is-visible', scrolled > window.innerHeight * 0.6);
  }, 16);

  window.addEventListener('scroll', onScroll, { passive:true });
  btn.addEventListener('click', () => window.scrollTo({ top:0, behavior: prefersReducedMotion ? 'auto' : 'smooth' }));
})();

/* =========================================================================
   5. HEADER — transparente -> glass preto com borda dourada no scroll
   ========================================================================= */
(function headerState(){
  const header = document.getElementById('header');
  const onScroll = throttle(() => {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  }, 50);
  window.addEventListener('scroll', onScroll, { passive:true });

  // smooth anchor scroll com "curtain reveal" leve entre seções
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block:'start' });
    });
  });
})();

/* =========================================================================
   6. HERO — split-text letra a letra + botão magnético
   ========================================================================= */
(function heroTitleSplit(){
  const titleEl = document.getElementById('heroTitle');
  const text = titleEl.textContent;
  titleEl.innerHTML = text.split('').map(ch =>
    `<span class="char">${ch === ' ' ? '&nbsp;' : ch}</span>`
  ).join('');

  const chars = titleEl.querySelectorAll('.char');

  function playIntro(){
    if (!window.gsap){
      chars.forEach(c => c.style.opacity = 1);
      document.querySelectorAll('.reveal-fade').forEach(el => el.classList.add('is-visible'));
      return;
    }
    gsap.set(chars, { opacity:0, y: 40, rotateX: -60 });
    gsap.to(chars, {
      opacity:1, y:0, rotateX:0, duration:.9, ease:'power3.out',
      stagger: 0.028,
    });
    gsap.utils.toArray('.hero .reveal-fade').forEach((el, i) => {
      gsap.to(el, { opacity:1, y:0, duration:.9, ease:'power3.out', delay: 0.4 + i*0.12 });
    });
  }

  window.addEventListener('app:ready', playIntro, { once:true });
  // fallback: se o preloader já tiver sumido antes do listener ser preso
  setTimeout(() => { if (document.body.classList.contains('is-loaded')) playIntro(); }, 100);
})();

(function magneticButton(){
  if (isTouch) return;
  const btn = document.getElementById('btnMagnetic');
  if (!btn) return;
  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left - r.width/2;
    const y = e.clientY - r.top - r.height/2;
    btn.style.transform = `translate(${x*0.28}px, ${y*0.35}px)`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate(0,0)'; });
})();

/* =========================================================================
   7. PARTÍCULAS DOURADAS (canvas 2D — leve, sem dependências)
   "poeira de ouro" flutuando no hero
   ========================================================================= */
(function goldParticles(){
  const canvas = document.getElementById('particles');
  if (!canvas || prefersReducedMotion) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];
  const COUNT = isTouch ? 26 : 60;

  function resize(){
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }
  function makeParticles(){
    particles = Array.from({ length: COUNT }, () => ({
      x: Math.random()*w,
      y: Math.random()*h,
      r: Math.random()*1.8 + 0.4,
      vy: -(Math.random()*0.25 + 0.05),
      vx: (Math.random()-0.5)*0.15,
      a: Math.random()*0.6 + 0.15,
      tw: Math.random()*Math.PI*2, // fase de "twinkle"
    }));
  }

  function tick(){
    ctx.clearRect(0,0,w,h);
    particles.forEach(p => {
      p.y += p.vy; p.x += p.vx; p.tw += 0.02;
      if (p.y < -10) { p.y = h+10; p.x = Math.random()*w; }
      const alpha = p.a * (0.6 + 0.4*Math.sin(p.tw));
      ctx.beginPath();
      ctx.fillStyle = `rgba(240,215,140,${alpha})`;
      ctx.shadowColor = 'rgba(212,175,55,0.8)';
      ctx.shadowBlur = 6;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }

  resize(); makeParticles(); tick();
  window.addEventListener('resize', debounce(() => { resize(); makeParticles(); }, 200));
})();

/* =========================================================================
   8. THREE.JS — anel/gema 3D abstrata girando suavemente no hero
   Fallback gracioso: se WebGL/Three indisponível, apenas não renderiza
   (a imagem/gradiente do hero por trás já cobre o visual).
   ========================================================================= */
(function heroThree(){
  const mount = document.getElementById('hero3d');
  if (!mount || !window.THREE || prefersReducedMotion) return;

  try {
    const width = mount.offsetWidth, height = mount.offsetHeight;
    const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width/height, .1, 100);
    camera.position.set(0, 0, 6);

    // "gema" — torus knot facetado, material dourado metálico
    const geo = new THREE.TorusKnotGeometry(1.15, 0.34, 140, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, metalness: 0.9, roughness: 0.18,
      emissive: 0x2a1f08, emissiveIntensity: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    const key = new THREE.PointLight(0xf0d78c, 40, 20);
    key.position.set(4, 3, 5);
    scene.add(key);
    const fill = new THREE.PointLight(0x9c7a2e, 18, 20);
    fill.position.set(-4, -2, 3);
    scene.add(fill);
    scene.add(new THREE.AmbientLight(0x151004, 1.2));

    let mouseX = 0, mouseY = 0;
    if (!isTouch){
      window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5);
        mouseY = (e.clientY / window.innerHeight - 0.5);
      });
    }

    function animate(){
      mesh.rotation.y += 0.0032;
      mesh.rotation.x += 0.0011;
      mesh.rotation.y += (mouseX*0.6 - mesh.rotation.y) * 0.0; // reservado p/ parallax futuro
      camera.position.x += (mouseX*1.2 - camera.position.x) * 0.03;
      camera.position.y += (-mouseY*1.2 - camera.position.y) * 0.03;
      camera.lookAt(0,0,0);
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    window.addEventListener('resize', debounce(() => {
      const w2 = mount.offsetWidth, h2 = mount.offsetHeight;
      renderer.setSize(w2, h2);
      camera.aspect = w2/h2;
      camera.updateProjectionMatrix();
    }, 200));
  } catch(err){
    // WebGL indisponível — falha silenciosa, hero segue funcional
    console.warn('Three.js hero disabled:', err);
  }
})();

/* =========================================================================
   9. REVEALS — IntersectionObserver genérico (fade + contadores + cortina)
   ========================================================================= */
(function reveals(){
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.reveal-fade').forEach(el => {
    // elementos do hero já são animados via GSAP no app:ready
    if (el.closest('.hero')) return;
    io.observe(el);
  });

  document.querySelectorAll('.divider').forEach(el => {
    const dio = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('is-drawn'); dio.unobserve(e.target); } });
    }, { threshold: .4 });
    dio.observe(el);
  });

  document.querySelectorAll('[data-curtain]').forEach(el => {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('is-open'); cio.unobserve(e.target); } });
    }, { threshold: .35 });
    cio.observe(el);
  });
})();

/* =========================================================================
   10. CONTADORES ANIMADOS
   ========================================================================= */
(function counters(){
  const els = document.querySelectorAll('[data-counter]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.counter, 10);
      const duration = 1800;
      const start = performance.now();
      function step(now){
        const p = Math.min(1, (now-start)/duration);
        const eased = 1 - Math.pow(1-p, 3);
        el.textContent = Math.round(eased*target).toLocaleString('pt-BR');
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      io.unobserve(el);
    });
  }, { threshold:.6 });
  els.forEach(el => io.observe(el));
})();

/* =========================================================================
   11. TILT 3D NOS CARDS DE COLEÇÃO (mousemove) — desativado em touch
   ========================================================================= */
(function tiltCards(){
  if (isTouch) return;
  document.querySelectorAll('[data-tilt]').forEach(card => {
    const onMove = throttle((e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left)/r.width - 0.5;
      const py = (e.clientY - r.top)/r.height - 0.5;
      card.style.transform = `perspective(800px) rotateY(${px*10}deg) rotateX(${-py*10}deg) translateY(-4px)`;
    }, 16);
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', () => { card.style.transform = 'perspective(800px) rotateY(0) rotateX(0)'; });
  });
})();

/* =========================================================================
   12. PARALLAX MULTICAMADAS (seção masculina + glows do hero)
   ========================================================================= */
(function parallax(){
  if (isTouch || prefersReducedMotion) return;
  const layers = document.querySelectorAll('[data-parallax-layer]');
  const glows = document.querySelectorAll('.hero__glow');

  const onScroll = throttle(() => {
    const sy = window.scrollY;
    layers.forEach(el => {
      const speed = parseFloat(el.dataset.parallaxLayer);
      el.style.transform = `translateY(${sy*speed*0.15}px)`;
    });
    glows.forEach((el,i) => {
      el.style.transform = `translateY(${sy*(0.05+i*0.03)}px)`;
    });
  }, 16);
  window.addEventListener('scroll', onScroll, { passive:true });
})();

/* =========================================================================
   13. CARROSSEL DE DEPOIMENTOS — drag/swipe (mouse + touch)
   ========================================================================= */
(function testimonialsCarousel(){
  const wrap = document.getElementById('testimonials');
  const track = document.getElementById('testimonialsTrack');
  const dotsWrap = document.getElementById('testimonialsDots');
  if (!wrap || !track) return;

  const slides = Array.from(track.children);
  let index = 0, startX = 0, deltaX = 0, dragging = false, width = wrap.offsetWidth;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.setAttribute('aria-label', `Ir para depoimento ${i+1}`);
    if (i===0) dot.classList.add('is-active');
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function goTo(i){
    index = Math.max(0, Math.min(slides.length-1, i));
    track.style.transform = `translateX(-${index*width}px)`;
    dots.forEach((d,di) => d.classList.toggle('is-active', di===index));
  }

  function dragStart(x){ dragging = true; startX = x; wrap.classList.add('is-dragging'); }
  function dragMove(x){ if (!dragging) return; deltaX = x - startX; track.style.transform = `translateX(${-index*width + deltaX}px)`; }
  function dragEnd(){
    if (!dragging) return;
    dragging = false; wrap.classList.remove('is-dragging');
    if (Math.abs(deltaX) > width*0.18){ goTo(index + (deltaX < 0 ? 1 : -1)); }
    else { goTo(index); }
    deltaX = 0;
  }

  wrap.addEventListener('mousedown', (e) => dragStart(e.clientX));
  window.addEventListener('mousemove', (e) => dragMove(e.clientX));
  window.addEventListener('mouseup', dragEnd);

  wrap.addEventListener('touchstart', (e) => dragStart(e.touches[0].clientX), { passive:true });
  wrap.addEventListener('touchmove', (e) => dragMove(e.touches[0].clientX), { passive:true });
  wrap.addEventListener('touchend', dragEnd);

  window.addEventListener('resize', debounce(() => { width = wrap.offsetWidth; goTo(index); }, 200));

  // autoplay suave, pausa em interação
  let autoplay = setInterval(() => goTo((index+1) % slides.length), 5200);
  wrap.addEventListener('mouseenter', () => clearInterval(autoplay));
  wrap.addEventListener('mouseleave', () => { autoplay = setInterval(() => goTo((index+1) % slides.length), 5200); });
})();

/* =========================================================================
   14. NEWSLETTER — validação regex, shake no erro, check dourado no sucesso
   ========================================================================= */
(function newsletter(){
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  const field = document.getElementById('newsletterField');
  const input = document.getElementById('newsletterEmail');
  const msg = document.getElementById('newsletterMsg');
  const label = document.getElementById('newsletterBtnLabel');
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value.trim();

    if (!EMAIL_RE.test(value)){
      field.classList.remove('is-shake'); void field.offsetWidth; // restart animação
      field.classList.add('is-shake');
      msg.textContent = 'Por favor, insira um e-mail válido.';
      msg.className = 'newsletter__msg is-error';
      return;
    }

    label.textContent = 'Inscrito';
    form.classList.add('is-success');
    msg.textContent = `Obrigado! Enviaremos novidades para ${value}.`;
    msg.className = 'newsletter__msg is-success';
    input.disabled = true;
  });
})();

/* =========================================================================
   15. GSAP SCROLLTRIGGER — parallax fino extra nos glows do hero ao sair
   (mantido leve; grosso do parallax já é feito no módulo 12 acima)
   ========================================================================= */
(function scrollTriggerExtras(){
  if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;

  gsap.utils.toArray('.jewel-card').forEach((card, i) => {
    gsap.fromTo(card, { opacity:0, y:50 }, {
      opacity:1, y:0, duration:.8, ease:'power2.out',
      scrollTrigger: { trigger: card, start:'top 88%' },
      delay: (i%4)*0.08,
    });
  });
})();
