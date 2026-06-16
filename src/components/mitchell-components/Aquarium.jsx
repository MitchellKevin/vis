import { $, formatNumber, reduceMotion } from '../../scripts/mitchell/utils.js';
import { fishImagePath, hexToRgb01 } from '../../scripts/mitchell/fishImage.js';
import { showTooltip, hideTooltip } from '../../scripts/mitchell/tooltip.js';
import { state, lifecycle, raf } from '../../scripts/mitchell/state.js';

const spriteCache = {};
const imageCache = {};
const loadImage = url => imageCache[url] ??= Object.assign(new Image(), { src: url });

function buildSprite(naam, color, pixelRatio) {
  const key = naam + color;
  if (spriteCache[key]) return spriteCache[key];
  const img = loadImage(fishImagePath(naam));
  if (!img.complete || !img.naturalWidth) return null;
  const spriteWidth = 64, spriteHeight = 64 * (img.naturalHeight / img.naturalWidth || 0.45);
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = spriteWidth * pixelRatio; spriteCanvas.height = spriteHeight * pixelRatio;
  const spriteContext = spriteCanvas.getContext('2d');
  spriteContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  spriteContext.drawImage(img, 0, 0, spriteWidth, spriteHeight);
  const whiteMix = 0.4, brightnessLift = 1.12;
  const [red, green, blue] = hexToRgb01(color);
  const tintR = red + (1 - red) * whiteMix;
  const tintG = green + (1 - green) * whiteMix;
  const tintB = blue + (1 - blue) * whiteMix;
  const imageData = spriteContext.getImageData(0, 0, spriteCanvas.width, spriteCanvas.height);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) continue;
    const luminance = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    pixels[i]     = Math.min(255, luminance * tintR * brightnessLift);
    pixels[i + 1] = Math.min(255, luminance * tintG * brightnessLift);
    pixels[i + 2] = Math.min(255, luminance * tintB * brightnessLift);
  }
  spriteContext.putImageData(imageData, 0, 0);
  return spriteCache[key] = spriteCanvas;
}

function createFishes(visData, total) {
  const FISH_COUNT = 80, SIZE_SCALE = 0.85;
  return visData.flatMap(species => {
    const fishCountForSpecies = Math.max(1, Math.round((species.count / total) * FISH_COUNT));
    return Array.from({ length: fishCountForSpecies }, () => ({
      x: Math.random() * 100, y: Math.random() * 100,
      velocityX: (Math.random() - 0.5) * 0.4, velocityY: (Math.random() - 0.5) * 0.2,
      color: species.color, naam: species.naam,
      size: Math.cbrt(species.weight) * SIZE_SCALE,
      lengthCm: Math.round((species.lengte || 30) * (0.82 + Math.random() * 0.36)),
      wigglePhase: Math.random() * Math.PI * 2, visible: true,
    }));
  });
}

function setupFilterChips(filtersEl, visData, fishes) {
  if (!filtersEl) return;
  filtersEl.innerHTML = visData.map(species =>
    `<button type="button" class="filter-chip" data-naam="${species.naam}" style="--chip:${species.color}" aria-pressed="true" aria-label="${species.naam}, gemiddelde lengte: ${species.lengte} cm">${species.naam}</button>`
  ).join('');
  filtersEl.querySelectorAll('.filter-chip').forEach((chip, i) => {
    chip.addEventListener('click', () => {
      const muted = chip.classList.toggle('muted');
      chip.setAttribute('aria-pressed', String(!muted));
      fishes.forEach(fish => { if (fish.naam === visData[i].naam) fish.visible = !muted; });
    });
  });
}

function setupClickScare(canvas, stage, fishes) {
  const SCARE_RADIUS = 35, SCARE_PUSH_X = 2.5, SCARE_PUSH_Y = 1.6;
  canvas.addEventListener('click', event => {
    const rect = canvas.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) / rect.width * 100;
    const clickY = (event.clientY - rect.top) / rect.height * 100;
    fishes.forEach(fish => {
      const deltaX = fish.x - clickX, deltaY = fish.y - clickY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance >= SCARE_RADIUS) return;
      const strength = (SCARE_RADIUS - distance) / SCARE_RADIUS;
      const safeDistance = Math.max(0.1, distance);
      fish.velocityX += (deltaX / safeDistance) * strength * SCARE_PUSH_X;
      fish.velocityY += (deltaY / safeDistance) * strength * SCARE_PUSH_Y;
    });
    const ripple = Object.assign(document.createElement('span'), { className: 'aquarium-rip' });
    ripple.style.left = (event.clientX - rect.left) + 'px';
    ripple.style.top = (event.clientY - rect.top) + 'px';
    stage.appendChild(ripple);
    setTimeout(() => ripple.remove(), 950);
  });
}

function setupHoverTooltip(canvas, fishes) {
  canvas.addEventListener('mousemove', event => {
    const rect = canvas.getBoundingClientRect();
    const pointerX = (event.clientX - rect.left) / rect.width * 100;
    const pointerY = (event.clientY - rect.top) / rect.height * 100;
    let closestFish = null, closestDistance = 4;
    fishes.forEach(fish => {
      if (!fish.visible) return;
      const distance = Math.hypot(fish.x - pointerX, fish.y - pointerY);
      if (distance < closestDistance) { closestDistance = distance; closestFish = fish; }
    });
    if (closestFish) {
      canvas.style.cursor = 'pointer';
      showTooltip(`<strong>${closestFish.naam}</strong>~${closestFish.lengthCm} cm<br/>klik om ze te laten schrikken`, event.clientX, event.clientY);
    } else {
      canvas.style.cursor = 'crosshair';
      hideTooltip();
    }
  });
  canvas.addEventListener('mouseleave', () => hideTooltip());
}

export function initAquarium() {
  const { TOTAL, visData } = state;
  const { cleanups } = lifecycle;
  const stage = $('#aquariumStage');
  if (!stage) return;

  stage.querySelectorAll('canvas, .aquarium-counter').forEach(n => n.remove());
  const canvas = document.createElement('canvas');
  const counter = Object.assign(document.createElement('div'), { className: 'aquarium-counter' });
  counter.setAttribute('aria-live', 'polite');
  stage.append(canvas, counter);

  const context = canvas.getContext('2d');
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  let stageWidth = 0, stageHeight = 0;
  function resize() {
    const rect = stage.getBoundingClientRect();
    stageWidth = rect.width; stageHeight = rect.height;
    canvas.width = stageWidth * pixelRatio; canvas.height = stageHeight * pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);

  const total = TOTAL || visData.reduce((sum, v) => sum + v.count, 0) || 1;
  const totalEl = $('#aquariumTotal');
  if (totalEl) totalEl.textContent = formatNumber(total);

  const summaryEl = $('#aquariumSummary');
  if (summaryEl) {
    const top3 = visData.slice().sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 3).map(s => s.naam).join(', ');
    summaryEl.textContent = `In dit kijkglas zwemmen ${visData.length} soorten mee. Meest aanwezig: ${top3}.`;
  }

  const fishes = createFishes(visData, total);
  setupFilterChips($('#aquariumFilters'), visData, fishes);
  setupClickScare(canvas, stage, fishes);
  setupHoverTooltip(canvas, fishes);

  const CENTER_PULL = 0.00006, WANDER = 0.01, FRICTION = 0.992, DRAW_ALPHA = 0.92;
  let running = false, frameId = 0;
  
  function tick() {
    context.clearRect(0, 0, stageWidth, stageHeight);
    const gradient = context.createRadialGradient(stageWidth / 2, stageHeight / 2, 30, stageWidth / 2, stageHeight / 2, Math.max(stageWidth, stageHeight));
    gradient.addColorStop(0, 'rgba(30,172,176,0.10)');
    gradient.addColorStop(1, 'rgba(30,172,176,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, stageWidth, stageHeight);
    fishes.forEach(fish => {
      fish.x += fish.velocityX;
      fish.y += fish.velocityY + Math.sin(fish.wigglePhase) * 0.04;
      fish.wigglePhase += 0.08;
      fish.velocityX = (fish.velocityX + (50 - fish.x) * CENTER_PULL + (Math.random() - 0.5) * WANDER) * FRICTION;
      fish.velocityY = (fish.velocityY + (50 - fish.y) * CENTER_PULL + (Math.random() - 0.5) * WANDER * 0.6) * FRICTION;
      if (fish.x < -5) fish.x = 105; if (fish.x > 105) fish.x = -5;
      if (fish.y < -5) fish.y = 105; if (fish.y > 105) fish.y = -5;
      if (!fish.visible) return;
      const sprite = buildSprite(fish.naam, fish.color, pixelRatio);
      if (!sprite) return;
      const drawWidth = sprite.width / pixelRatio * fish.size;
      const drawHeight = sprite.height / pixelRatio * fish.size;
      const angle = Math.atan2(fish.velocityY, fish.velocityX);
      const flip = Math.abs(angle) > Math.PI / 2 ? -1 : 1;
      context.save();
      context.translate((fish.x / 100) * stageWidth, (fish.y / 100) * stageHeight);
      context.rotate(angle * (flip < 0 ? -1 : 1));
      context.scale(1, flip);
      context.globalAlpha = DRAW_ALPHA;
      context.drawImage(sprite, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      context.restore();
    });
    if (running) frameId = raf(tick);
  }

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!running && !reduceMotion()) { running = true; tick(); }
      if (!counter.dataset.animated) { counter.dataset.animated = '1'; counter.textContent = formatNumber(total); }
      if (reduceMotion()) tick();
    } else { running = false; cancelAnimationFrame(frameId); }
  }, { threshold: 0.1 });
  visibilityObserver.observe(stage);
  cleanups.push(() => { running = false; cancelAnimationFrame(frameId); visibilityObserver.disconnect(); resizeObserver.disconnect(); });
}

export default function Aquarium() {
  return (
    <section id="ch-aquarium" className="chapter" aria-label="Aquarium">
      <div className="chapter-inner chapter-split">
        <div className="chapter-text">
          <p className="eyebrow reveal">Kijkglas</p>
          <h2 className="reveal">Dit is hoe <span id="aquariumTotal">…</span> waarnemingen er ongeveer uitzien.</h2>
          <p className="lede reveal">Niet allemaal tegelijk natuurlijk — een steekproef, elk met een eigen koers, tempo en verhaal.</p>
          <p className="chapter-stat reveal" id="aquariumSummary" aria-live="polite"></p>
          <div className="aquarium-filters" id="aquariumFilters" role="group" aria-label="Filter vissoorten"></div>
          <p className="aquarium-tip">Tip — klik in het aquarium om de vissen te laten schrikken.</p>
        </div>
        <div className="chapter-viz">
          <div className="aquarium-stage" id="aquariumStage" aria-label="Vissen die rondzwemmen"></div>
        </div>
      </div>
    </section>
  );
}
