import { $, fmt, reduceMotion } from '../utils.js';
import { fishImagePath, hexToRgb01 } from '../fishImage.js';
import { showTooltip, hideTooltip } from '../tooltip.js';
import { state, lifecycle, raf } from '../state.js';

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
  const tEl = $('#aquariumTotal'); if (tEl) tEl.textContent = fmt(total);

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
    const cc = c.getContext('2d');
    cc.setTransform(dpr, 0, 0, dpr, 0, 0);
    cc.drawImage(img, 0, 0, w, h);
    // Luminantie-behoudend tinten: grijswaarde × doelkleur. Texturen van de
    // foto blijven leesbaar maar alles krijgt de soort-kleur.
    const [tr, tg, tb] = hexToRgb01(color);
    const pixW = c.width, pixH = c.height;
    const data = cc.getImageData(0, 0, pixW, pixH);
    const arr = data.data;
    for (let i = 0; i < arr.length; i += 4) {
      if (arr[i + 3] === 0) continue;
      const y = 0.299 * arr[i] + 0.587 * arr[i + 1] + 0.114 * arr[i + 2];
      arr[i]     = y * tr;
      arr[i + 1] = y * tg;
      arr[i + 2] = y * tb;
    }
    cc.putImageData(data, 0, 0);
    sprites[key] = c;
    return c;
  }

  // ~80 vissen, evenredig per soort
  const sample = [];
  visData.forEach(v => {
    const n = Math.max(1, Math.round((v.count / total) * 80));
    for (let i = 0; i < n; i++) sample.push({
      x: Math.random() * 100, y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.2,
      shape: v.shape, color: v.color, naam: v.naam,
      size: v.shape === 'tiny' ? 0.6 : v.shape === 'long' ? 1.2 : 0.9,
      wig: Math.random() * Math.PI * 2, visible: true,
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
      const dx = f.x - px, dy = f.y - py, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 35) { const k = (35 - dist) / 35; f.vx += (dx / Math.max(0.1, dist)) * k * 2.5; f.vy += (dy / Math.max(0.1, dist)) * k * 1.6; }
    });
    const rip = document.createElement('span');
    rip.className = 'aquarium-rip';
    rip.style.left = (e.clientX - rect.left) + 'px';
    rip.style.top = (e.clientY - rect.top) + 'px';
    stage.appendChild(rip);
    setTimeout(() => rip.remove(), 950);
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * 100;
    const py = (e.clientY - rect.top) / rect.height * 100;
    let closest = null, cd = 4;
    sample.forEach(f => { if (!f.visible) return; const d = Math.hypot(f.x - px, f.y - py); if (d < cd) { cd = d; closest = f; } });
    if (closest) { canvas.style.cursor = 'pointer'; showTooltip(`<strong>${closest.naam}</strong>klik om de vissen te laten schrikken`, e.clientX, e.clientY); }
    else { canvas.style.cursor = 'crosshair'; hideTooltip(); }
  });
  canvas.addEventListener('mouseleave', () => hideTooltip());

  let running = false, rafId = 0, counterRafId = 0;
  function tick() {
    ctx.clearRect(0, 0, W, H);
    const grd = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, Math.max(W, H));
    grd.addColorStop(0, 'rgba(30,172,176,0.10)'); grd.addColorStop(1, 'rgba(30,172,176,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    sample.forEach(f => {
      f.x += f.vx; f.y += f.vy + Math.sin(f.wig) * 0.04; f.wig += 0.08;
      f.vx += (50 - f.x) * 0.00006; f.vy += (50 - f.y) * 0.00006;
      f.vx += (Math.random() - 0.5) * 0.01; f.vy += (Math.random() - 0.5) * 0.006;
      f.vx *= 0.992; f.vy *= 0.992;
      if (f.x < -5) f.x = 105; if (f.x > 105) f.x = -5;
      if (f.y < -5) f.y = 105; if (f.y > 105) f.y = -5;
      if (!f.visible) return;
      const sprite = makeSprite(f.naam, f.color);
      if (!sprite) return; // afbeelding nog niet geladen — volgende frame
      const px = (f.x / 100) * W, py = (f.y / 100) * H;
      const angle = Math.atan2(f.vy, f.vx);
      const flip = Math.abs(angle) > Math.PI / 2 ? -1 : 1;
      const sw = sprite.width / dpr * f.size, sh = sprite.height / dpr * f.size;
      ctx.save(); ctx.translate(px, py); ctx.rotate(angle * (flip < 0 ? -1 : 1)); ctx.scale(1, flip);
      ctx.globalAlpha = 0.92; ctx.drawImage(sprite, -sw / 2, -sh / 2, sw, sh); ctx.restore();
    });
    if (running) rafId = raf(tick);
  }
  function animateCounter() {
    const start = performance.now(), dur = 3800;
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      counter.textContent = `${fmt(Math.round(eased * total))} / ${fmt(total)}`;
      if (t < 1) counterRafId = raf(step);
    }
    counterRafId = raf(step);
  }

  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!running && !reduceMotion) { running = true; tick(); }
      if (!counter.dataset.animated) {
        counter.dataset.animated = '1';
        if (reduceMotion) counter.textContent = `${fmt(total)} / ${fmt(total)}`; else animateCounter();
      }
      if (reduceMotion) tick();
    } else { running = false; cancelAnimationFrame(rafId); }
  }, { threshold: 0.1 });
  io.observe(stage);
  cleanups.push(() => { running = false; cancelAnimationFrame(rafId); cancelAnimationFrame(counterRafId); io.disconnect(); ro.disconnect(); });
}
