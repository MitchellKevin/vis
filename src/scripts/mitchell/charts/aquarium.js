import { $, formatNumber, reduceMotion } from '../utils.js';
import { fishImagePath, hexToRgb01 } from '../fishImage.js';
import { showTooltip, hideTooltip } from '../tooltip.js';
import { state, lifecycle, raf } from '../state.js';

// ============================================================================
// aquarium.js — het "kijkglas": ~80 vissen zwemmen rond op een <canvas>,
// evenredig verdeeld per soort. Elke vis is een ingekleurde PNG (makeSprite).
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
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(stage);

  const total = TOTAL || visData.reduce((s, v) => s + v.count, 0) || 1;
  const totalEl = $('#aquariumTotal'); if (totalEl) totalEl.textContent = formatNumber(total);

  // Aquarium samenvatting
  const sortedSpecies = visData.slice().sort((a, b) => (b.count || 0) - (a.count || 0));
  const top3 = sortedSpecies.slice(0, 3).map(s => s.naam).join(', ');
  const summaryEl = $('#aquariumSummary');
  if (summaryEl) {
    summaryEl.textContent = `In dit kijkglas zwemmen ${visData.length} soorten mee. Meest aanwezig: ${top3}.`;
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
  const sprites = {};
  const imgCache = {};
  function loadImage(url) {
    if (imgCache[url]) return imgCache[url];
    const img = new Image();
    img.src = url;
    imgCache[url] = img;
    return img;
  }
  function makeSprite(naam, color) {
    const key = naam + color;
    if (sprites[key]) return sprites[key];
    const img = loadImage(fishImagePath(naam));
    if (!img.complete || !img.naturalWidth) return null;
    const baseW = 64;
    const aspect = img.naturalHeight / img.naturalWidth || 0.45;
    const w = baseW, h = baseW * aspect;
    const c = document.createElement('canvas');
    c.width = w * dpr; c.height = h * dpr;
    const offCtx = c.getContext('2d');
    offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    offCtx.drawImage(img, 0, 0, w, h);
    // Luminantie-behoudend tinten: grijswaarde × doelkleur. Texturen van de
    // foto blijven leesbaar maar alles krijgt de soort-kleur.
    // De soort-kleur wordt eerst richting wit gemengd (L) en de helderheid
    // licht opgetild (lift), zodat de vissen lichter oplichten op de donkere
    // kijkglas-achtergrond.
    const L = 0.4, lift = 1.12;
    const [r0, g0, b0] = hexToRgb01(color);
    const tr = r0 + (1 - r0) * L;
    const tg = g0 + (1 - g0) * L;
    const tb = b0 + (1 - b0) * L;
    const pixW = c.width, pixH = c.height;
    const data = offCtx.getImageData(0, 0, pixW, pixH);
    const arr = data.data;
    for (let i = 0; i < arr.length; i += 4) {
      if (arr[i + 3] === 0) continue;
      const y = 0.299 * arr[i] + 0.587 * arr[i + 1] + 0.114 * arr[i + 2];
      arr[i]     = Math.min(255, y * tr * lift);
      arr[i + 1] = Math.min(255, y * tg * lift);
      arr[i + 2] = Math.min(255, y * tb * lift);
    }
    offCtx.putImageData(data, 0, 0);
    sprites[key] = c;
    return c;
  }

  // Grootte op schaal: massa schaalt met lengte³, dus zichtbare lengte ∝
  // gewicht^(1/3). Zo staan de soorten in de juiste verhouding tot elkaar
  // (meerval ~12 kg wordt fors, alver ~0,08 kg blijft klein). De factor 0.85
  // bepaalt alleen de algehele schaal; de onderlinge verhoudingen blijven gelijk.
  const sizeForWeight = (kg) => Math.cbrt(kg) * SIZE_SCALE;

  // Verdeel FISH_COUNT visjes over de soorten, evenredig met hoe vaak ze gezien zijn
  const sample = [];
  visData.forEach(v => {
    const n = Math.max(1, Math.round((v.count / total) * FISH_COUNT));
    for (let i = 0; i < n; i++) sample.push({
      x: Math.random() * 100, y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.2,
      shape: v.shape, color: v.color, naam: v.naam,
      size: sizeForWeight(v.weight),
      // Lengte per individu: typische soort-lengte ± ~18% zodat ze niet allemaal
      // exact even lang "zijn" (hoeft niet exact, moet realistisch ogen).
      lengthCm: Math.round((v.lengte || 30) * (0.82 + Math.random() * 0.36)),
      wiggle: Math.random() * Math.PI * 2, visible: true,
    });
  });

  // filter-chips per soort
  const filtersHost = $('#aquariumFilters');
  if (filtersHost) {
    filtersHost.innerHTML = '';
    visData.forEach(v => {
      const chip = document.createElement('button');
      chip.type = 'button'; chip.className = 'filter-chip'; chip.dataset.naam = v.naam;
      chip.style.setProperty('--chip', v.color); chip.setAttribute('aria-pressed', 'true');
      chip.textContent = v.naam;
      chip.addEventListener('click', () => {
        const muted = chip.classList.toggle('muted');
        chip.setAttribute('aria-pressed', String(!muted));
        sample.forEach(f => { if (f.naam === v.naam) f.visible = !muted; });
      });
      filtersHost.appendChild(chip);
    });
  }

  // klik = laten schrikken + rimpel
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * 100;
    const py = (e.clientY - rect.top) / rect.height * 100;
    sample.forEach(f => {
      const dx = f.x - px;
      const dy = f.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= SCARE_RADIUS) return;                       // te ver weg → niet schrikken
      const strength = (SCARE_RADIUS - dist) / SCARE_RADIUS;  // dichterbij = harder schrikken
      const safeDist = Math.max(0.1, dist);                   // voorkom delen door 0
      f.vx += (dx / safeDist) * strength * SCARE_PUSH_X;      // duw wég van de klikplek
      f.vy += (dy / safeDist) * strength * SCARE_PUSH_Y;
    });
    const ripple = document.createElement('span');
    ripple.className = 'aquarium-rip';
    ripple.style.left = (e.clientX - rect.left) + 'px';
    ripple.style.top = (e.clientY - rect.top) + 'px';
    stage.appendChild(ripple);
    setTimeout(() => ripple.remove(), 950);
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * 100;
    const py = (e.clientY - rect.top) / rect.height * 100;
    let closest = null;
    let closestDist = 4;                         // alleen een tooltip binnen 4% van een visje
    sample.forEach(f => {
      if (!f.visible) return;
      const d = Math.hypot(f.x - px, f.y - py);
      if (d < closestDist) { closestDist = d; closest = f; }
    });
    if (closest) { canvas.style.cursor = 'pointer'; showTooltip(`<strong>${closest.naam}</strong>~${closest.lengthCm} cm<br/>klik om ze te laten schrikken`, e.clientX, e.clientY); }
    else { canvas.style.cursor = 'crosshair'; hideTooltip(); }
  });
  canvas.addEventListener('mouseleave', () => hideTooltip());

  let running = false, rafId = 0, counterRafId = 0;
  function tick() {
    ctx.clearRect(0, 0, W, H);
    const gradient = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, Math.max(W, H));
    gradient.addColorStop(0, 'rgba(30,172,176,0.10)'); gradient.addColorStop(1, 'rgba(30,172,176,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
    sample.forEach(f => {
      // ── Beweging (posities lopen in 0..100 = procent van het kijkglas) ──
      f.x += f.vx;                                  // verplaats horizontaal
      f.y += f.vy + Math.sin(f.wiggle) * 0.04;      // verticaal + een lichte golf
      f.wiggle += 0.08;                             // golf-fase doortikken

      f.vx += (50 - f.x) * CENTER_PULL;             // zachte trek naar het midden (50%)
      f.vy += (50 - f.y) * CENTER_PULL;
      f.vx += (Math.random() - 0.5) * WANDER;       // een beetje willekeurig dwalen
      f.vy += (Math.random() - 0.5) * WANDER * 0.6;
      f.vx *= FRICTION;                             // afremmen (wrijving)
      f.vy *= FRICTION;

      // Zwemt 'ie van het scherm? Zet 'm aan de overkant terug (eindeloos kijkglas)
      if (f.x < -5) f.x = 105;
      if (f.x > 105) f.x = -5;
      if (f.y < -5) f.y = 105;
      if (f.y > 105) f.y = -5;

      if (!f.visible) return;                       // uitgefilterd → niet tekenen
      const sprite = makeSprite(f.naam, f.color);
      if (!sprite) return;                          // plaatje nog niet geladen → volgende frame

      // ── Tekenen ──
      const px = (f.x / 100) * W;                   // procent → pixels
      const py = (f.y / 100) * H;
      const angle = Math.atan2(f.vy, f.vx);         // kijkrichting uit de snelheid
      const flip = Math.abs(angle) > Math.PI / 2 ? -1 : 1; // naar links? dan spiegelen
      const drawW = sprite.width / dpr * f.size;
      const drawH = sprite.height / dpr * f.size;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle * (flip < 0 ? -1 : 1));
      ctx.scale(1, flip);
      ctx.globalAlpha = DRAW_ALPHA;
      ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    });
    if (running) rafId = raf(tick);
  }
  function animateCounter() {
    const start = performance.now(), dur = COUNTER_MS;
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      counter.textContent = `${formatNumber(Math.round(eased * total))} / ${formatNumber(total)}`;
      if (t < 1) counterRafId = raf(step);
    }
    counterRafId = raf(step);
  }

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!running && !reduceMotion()) { running = true; tick(); }
      if (!counter.dataset.animated) {
        counter.dataset.animated = '1';
        if (reduceMotion()) counter.textContent = `${formatNumber(total)} / ${formatNumber(total)}`; else animateCounter();
      }
      if (reduceMotion()) tick();
    } else { running = false; cancelAnimationFrame(rafId); }
  }, { threshold: 0.1 });
  observer.observe(stage);
  cleanups.push(() => { running = false; cancelAnimationFrame(rafId); cancelAnimationFrame(counterRafId); observer.disconnect(); ro.disconnect(); });
}
