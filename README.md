# Aurum & Noir — Landing Page

Landing page de alta joalheria, direção "dark luxury": preto profundo (#050505/#0a0a0a) com detalhes em dourado (#d4af37 / #f0d78c / #9c7a2e).

## Estrutura

```
aurum-noir/
├── index.html        → markup único, todas as seções
├── css/style.css      → design tokens + todos os estilos/animações CSS
├── js/main.js         → módulos independentes (IIFE) por funcionalidade
└── README.md
```

**Por que sem build step?** O projeto usa apenas HTML/CSS/JS + 2 libs via CDN (GSAP/ScrollTrigger e Three.js). Isso elimina fricção de setup (sem `npm install`), mantém o bundle mínimo (nada de webpack/vite para uma única página) e facilita hospedagem estática em qualquer lugar (Vercel, Netlify, GitHub Pages, S3). Para um projeto maior/multi-página, migraria para Vite + Sass modules.

## Decisões técnicas relevantes

- **Preloader**: progresso real calculado a partir do carregamento de `document.images` (não é um timer fake). Sai com wipe dourado (`scaleX` + `transform-origin` alternado).
- **Cursor customizado**: desativado inteiramente em `pointer: coarse` (toque), tanto via CSS (`@media (pointer:coarse)`) quanto JS (`matchMedia`), evitando custo de listeners `mousemove` em mobile.
- **Partículas douradas**: Canvas 2D simples (sem WebGL) — leve o suficiente para rodar junto com o Three.js sem competir por GPU. Reduzido para 26 partículas em touch, desativado com `prefers-reduced-motion`.
- **Elemento 3D (Three.js)**: `TorusKnotGeometry` com material metálico dourado como "gema abstrata" girando no hero. Envolto em `try/catch` — se WebGL falhar, o hero permanece funcional (vinheta + partículas cobrem o visual).
- **Reveals**: um único `IntersectionObserver` genérico para `.reveal-fade`, outro para as "cortinas" (`clip`/panels) e contadores — evita `scroll` listeners custosos para animações de entrada.
- **Scroll/resize/mousemove**: todos passam por `throttle` (scroll, tilt) ou `debounce` (resize), implementados sem dependências.
- **Tilt 3D / parallax / cursor**: todos verificam `pointer: coarse` antes de anexar listeners, para não gastar ciclos em dispositivos touch.
- **Fallback de imagens**: todo `<img>` com `data-fallback-gradient` troca para um gradiente radial dourado via CSS (`.is-fallback`) se o `onerror` disparar — a página nunca quebra visualmente por causa de uma imagem externa (Unsplash) fora do ar.
- **Sem CLS**: todas as imagens têm `width`/`height` (aspect-ratio implícito) definidos no HTML.
- **`prefers-reduced-motion`**: reduz duração de todas as transições/animações via regra global, e desativa explicitamente partículas, Three.js e parallax no JS.

## Como rodar localmente

Qualquer servidor estático funciona (é necessário servir via HTTP, não `file://`, para os módulos e fetch de fontes funcionarem corretamente).

**Opção 1 — Python (já vem instalado na maioria dos sistemas):**
```bash
cd aurum-noir
python3 -m http.server 8080
```
Depois acesse: http://localhost:8080

**Opção 2 — Node (via npx, sem instalação global):**
```bash
cd aurum-noir
npx live-server --port=8080
```

Abra o navegador em `http://localhost:8080` (a opção `live-server` já abre automaticamente e recarrega a página a cada alteração de arquivo).

## Créditos de imagem

Fotos via Unsplash (images.unsplash.com), com vinheta escura e realce dourado aplicados via CSS `filter` (saturate/contrast/brightness). Caso alguma URL fique indisponível, o fallback em gradiente dourado assume automaticamente — nenhuma ação manual necessária.
