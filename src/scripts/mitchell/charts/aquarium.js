import { $, formatNumber, reduceMotion } from '../utils.js';
import { fishImagePath, hexToRgb01 } from '../fishImage.js';
import { showTooltip, hideTooltip } from '../tooltip.js';
import { state, lifecycle, raf } from '../state.js';

// ============================================================================
// aquarium.js — het "kijkglas": ~80 vissen zwemmen rond op een <canvas>,
// evenredig verdeeld per soort. Elke vis is een ingekleurde PNG (buildSprite).
// Klik laat ze schrikken; chips onderaan filteren soorten in/uit; een teller
// telt op naar het totaal.
// ============================================================================

export function initAquarium() {
  const { TOTAL, visData } = state;
  const { cleanups } = lifecycle;
  const stage = $('#aquariumStage');
  if (!stage) return;
  stage.querySelectorAll('canvas, .aquarium-counter').forEach(n => n.remove());
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const counter = document.createElement('div');
  counter.className = 'aquarium-counter';
  counter.setAttribute('aria-live', 'polite');
  stage.appendChild(counter);
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
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage);

  const total = TOTAL || visData.reduce((sum, v) => sum + v.count, 0) || 1;
  const totalEl = $('#aquariumTotal'); if (totalEl) totalEl.textContent = formatNumber(total);

  // Aquarium samenvatting
  const sortedSpecies = visData.slice().sort((a, b) => (b.count || 0) - (a.count || 0));
  const top3Names = sortedSpecies.slice(0, 3).map(s => s.naam).join(', ');
  const summaryEl = $('#aquariumSummary');
  if (summaryEl) {
    summaryEl.textContent = `In dit kijkglas zwemmen ${visData.length} soorten mee. Meest aanwezig: ${top3Names}.`;
  }

  // ── Instelbare waarden (hier draai je aan het gedrag) ─────────────────────
  const FISH_COUNT   = 80;       // totaal aantal visjes, verdeeld over de soorten
  const SIZE_SCALE   = 0.85;     // algehele grootte van de visjes
  const SCARE_RADIUS = 35;       // straal (in %) waarbinnen een klik visjes laat schrikken
  const SCARE_PUSH_X = 2.5;      // hoe hard ze horizontaal wegschieten bij een klik
  const SCARE_PUSH_Y = 1.6;      // idem verticaal
  const CENTER_PULL  = 0.00006;  // hoe sterk visjes naar het midden (50%) trekken
  const WANDER       = 0.01;     // hoeveel ze willekeurig "dwalen"
  const FRICTION     = 0.992;    // afremmen per frame (lager = stroperiger)
  const DRAW_ALPHA   = 0.92;     // doorzichtigheid waarmee een visje getekend wordt
  const COUNTER_MS   = 3800;     // duur van het optellende totaal-getal

  // Per vissoort + kleur cachen we een getint offscreen-canvas (goedkoop hertekenen).
  const spriteCache = {};
  const imageCache = {};
  function loadImage(url) {
    if (imageCache[url]) return imageCache[url];
    const img = new Image();
    img.src = url;
    imageCache[url] = img;
    return img;
  }
  function buildSprite(naam, color) {
    const key = naam + color;
    if (spriteCache[key]) return spriteCache[key];
    const img = loadImage(fishImagePath(naam));
    if (!img.complete || !img.naturalWidth) return null;
    const aspectRatio = img.naturalHeight / img.naturalWidth || 0.45;
    const spriteWidth = 64, spriteHeight = 64 * aspectRatio;
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = spriteWidth * pixelRatio; spriteCanvas.height = spriteHeight * pixelRatio;
    const spriteContext = spriteCanvas.getContext('2d');
    spriteContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    spriteContext.drawImage(img, 0, 0, spriteWidth, spriteHeight);
    // Luminantie-behoudend tinten: grijswaarde × doelkleur. Texturen van de
    // foto blijven leesbaar maar alles krijgt de soort-kleur.
    // De soort-kleur wordt eerst richting wit gemengd (whiteMix) en de helderheid
    // licht opgetild (brightnessLift), zodat de vissen lichter oplichten op de
    // donkere kijkglas-achtergrond.
    const whiteMix = 0.4, brightnessLift = 1.12;
    const [red, green, blue] = hexToRgb01(color);
    const tintR = red + (1 - red) * whiteMix;
    const tintG = green + (1 - green) * whiteMix;
    const tintB = blue + (1 - blue) * whiteMix;
    const pixelWidth = spriteCanvas.width, pixelHeight = spriteCanvas.height;
    const imageData = spriteContext.getImageData(0, 0, pixelWidth, pixelHeight);
    const pixels = imageData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) continue;
      const luminance = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      pixels[i]     = Math.min(255, luminance * tintR * brightnessLift);
      pixels[i + 1] = Math.min(255, luminance * tintG * brightnessLift);
      pixels[i + 2] = Math.min(255, luminance * tintB * brightnessLift);
    }
    spriteContext.putImageData(imageData, 0, 0);
    spriteCache[key] = spriteCanvas;
    return spriteCanvas;
  }

  // Grootte op schaal: massa schaalt met lengte³, dus zichtbare lengte ∝
  // gewicht^(1/3). Zo staan de soorten in de juiste verhouding tot elkaar
  // (meerval ~12 kg wordt fors, alver ~0,08 kg blijft klein). De factor 0.85
  // bepaalt alleen de algehele schaal; de onderlinge verhoudingen blijven gelijk.
  const sizeForWeight = (kg) => Math.cbrt(kg) * SIZE_SCALE;

  // Verdeel FISH_COUNT visjes over de soorten, evenredig met hoe vaak ze gezien zijn
  const fishes = [];
  visData.forEach(species => {
    const fishCountForSpecies = Math.max(1, Math.round((species.count / total) * FISH_COUNT));
    for (let i = 0; i < fishCountForSpecies; i++) fishes.push({
      x: Math.random() * 100, y: Math.random() * 100,
      velocityX: (Math.random() - 0.5) * 0.4, velocityY: (Math.random() - 0.5) * 0.2,
      color: species.color, naam: species.naam,
      size: sizeForWeight(species.weight),
      // Lengte per individu: typische soort-lengte ± ~18% zodat ze niet allemaal
      // exact even lang "zijn" (hoeft niet exact, moet realistisch ogen).
      lengthCm: Math.round((species.lengte || 30) * (0.82 + Math.random() * 0.36)),
      wigglePhase: Math.random() * Math.PI * 2, visible: true,
    });
  });

  // filter-chips per soort
  const filtersEl = $('#aquariumFilters');
  if (filtersEl) {
    filtersEl.innerHTML = '';
    visData.forEach(species => {
      const chip = document.createElement('button');
      chip.type = 'button'; chip.className = 'filter-chip'; chip.dataset.naam = species.naam;
      chip.style.setProperty('--chip', species.color); chip.setAttribute('aria-pressed', 'true');
      chip.textContent = species.naam;
      chip.addEventListener('click', () => {
        const muted = chip.classList.toggle('muted');
        chip.setAttribute('aria-pressed', String(!muted));
        fishes.forEach(fish => { if (fish.naam === species.naam) fish.visible = !muted; });
      });
      filtersEl.appendChild(chip);
    });
  }

  // Muispositie binnen het canvas → procent-coördinaten (0..100), net als de vis-x/y.
  const toPercent = (event, rect) => [(event.clientX - rect.left) / rect.width * 100, (event.clientY - rect.top) / rect.height * 100];

  // klik = laten schrikken + rimpel
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const [clickX, clickY] = toPercent(event, rect);
    fishes.forEach(fish => {
      const deltaX = fish.x - clickX;
      const deltaY = fish.y - clickY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance >= SCARE_RADIUS) return;                       // te ver weg → niet schrikken
      const strength = (SCARE_RADIUS - distance) / SCARE_RADIUS;  // dichterbij = harder schrikken
      const safeDistance = Math.max(0.1, distance);               // voorkom delen door 0
      fish.velocityX += (deltaX / safeDistance) * strength * SCARE_PUSH_X; // duw wég van de klikplek
      fish.velocityY += (deltaY / safeDistance) * strength * SCARE_PUSH_Y;
    });
    const ripple = document.createElement('span');
    ripple.className = 'aquarium-rip';
    ripple.style.left = (event.clientX - rect.left) + 'px';
    ripple.style.top = (event.clientY - rect.top) + 'px';
    stage.appendChild(ripple);
    setTimeout(() => ripple.remove(), 950);
  });

  canvas.addEventListener('mousemove', (event) => {
    const [pointerX, pointerY] = toPercent(event, canvas.getBoundingClientRect());
    let closestFish = null;
    let closestDistance = 4;                      // alleen een tooltip binnen 4% van een visje
    fishes.forEach(fish => {
      if (!fish.visible) return;
      const distance = Math.hypot(fish.x - pointerX, fish.y - pointerY);
      if (distance < closestDistance) { closestDistance = distance; closestFish = fish; }
    });
    if (closestFish) { canvas.style.cursor = 'pointer'; showTooltip(`<strong>${closestFish.naam}</strong>~${closestFish.lengthCm} cm<br/>klik om ze te laten schrikken`, event.clientX, event.clientY); }
    else { canvas.style.cursor = 'crosshair'; hideTooltip(); }
  });
  canvas.addEventListener('mouseleave', () => hideTooltip());

  let running = false, frameId = 0, counterFrameId = 0;
  function tick() {
    context.clearRect(0, 0, stageWidth, stageHeight);
    const gradient = context.createRadialGradient(stageWidth / 2, stageHeight / 2, 30, stageWidth / 2, stageHeight / 2, Math.max(stageWidth, stageHeight));
    gradient.addColorStop(0, 'rgba(30,172,176,0.10)'); gradient.addColorStop(1, 'rgba(30,172,176,0)');
    context.fillStyle = gradient; context.fillRect(0, 0, stageWidth, stageHeight);
    fishes.forEach(fish => {
      // ── Beweging (posities lopen in 0..100 = procent van het kijkglas) ──
      fish.x += fish.velocityX;                              // verplaats horizontaal
      fish.y += fish.velocityY + Math.sin(fish.wigglePhase) * 0.04; // verticaal + een lichte golf
      fish.wigglePhase += 0.08;                              // golf-fase doortikken

      fish.velocityX += (50 - fish.x) * CENTER_PULL;         // zachte trek naar het midden (50%)
      fish.velocityY += (50 - fish.y) * CENTER_PULL;
      fish.velocityX += (Math.random() - 0.5) * WANDER;      // een beetje willekeurig dwalen
      fish.velocityY += (Math.random() - 0.5) * WANDER * 0.6;
      fish.velocityX *= FRICTION;                            // afremmen (wrijving)
      fish.velocityY *= FRICTION;

      // Zwemt 'ie van het scherm? Zet 'm aan de overkant terug (eindeloos kijkglas)
      if (fish.x < -5) fish.x = 105;
      if (fish.x > 105) fish.x = -5;
      if (fish.y < -5) fish.y = 105;
      if (fish.y > 105) fish.y = -5;

      if (!fish.visible) return;                    // uitgefilterd → niet tekenen
      const sprite = buildSprite(fish.naam, fish.color);
      if (!sprite) return;                          // plaatje nog niet geladen → volgende frame

      // ── Tekenen ──
      const pixelX = (fish.x / 100) * stageWidth;   // procent → pixels
      const pixelY = (fish.y / 100) * stageHeight;
      const angle = Math.atan2(fish.velocityY, fish.velocityX); // kijkrichting uit de snelheid
      const flip = Math.abs(angle) > Math.PI / 2 ? -1 : 1;      // naar links? dan spiegelen
      const drawWidth = sprite.width / pixelRatio * fish.size;
      const drawHeight = sprite.height / pixelRatio * fish.size;
      context.save();
      context.translate(pixelX, pixelY);
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
      if (!counter.dataset.animated) {
        counter.dataset.animated = '1';
        if (reduceMotion()) counter.textContent = `${formatNumber(total)} / ${formatNumber(total)}`; else animateCounter();
      }
      if (reduceMotion()) tick();
    } else { running = false; cancelAnimationFrame(frameId); }
  }, { threshold: 0.1 });
  visibilityObserver.observe(stage);
  cleanups.push(() => { running = false; cancelAnimationFrame(frameId); cancelAnimationFrame(counterFrameId); visibilityObserver.disconnect(); resizeObserver.disconnect(); });
}
