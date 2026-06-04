import * as d3 from 'd3';
import { C } from '../constants.js';
import { $, fmt, rng, reduceMotion } from '../utils.js';
import { state, lifecycle, raf } from '../state.js';

// ============================================================================
// hero.js — de intro: duizenden deeltjes vormen samen één grote vis.
// Werking: we tekenen een vis-silhouet offscreen, lezen de pixels uit als
// puntenwolk, en animeren elk deeltje van een willekeurige startplek naar zijn
// plek in de vis. Bij scrollen "exploderen" ze weer uit elkaar. Alles op een
// <canvas> (sneller dan duizenden SVG-elementen).
// ============================================================================

export function initHero(sectionEl) {
  const { TOTAL, periodLabel } = state;
  const { cleanups } = lifecycle;
  const stage = $('#heroStage');
  if (!stage) return;
  const overlay = sectionEl.querySelector('.hero-overlay');
  const countEl = $('#heroCount');
  const periodEl = $('#heroPeriod');
  if (periodEl) periodEl.textContent = periodLabel || '';
  const target = TOTAL || 0;

  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t * t;
  // Palet leesbaar op de lichte (violette) achtergrond — donkergroen + accenten.
  const heroCol = d3.interpolateRgbBasis([C.green, C.teal, C.pink, C.goldDeep, C.greenMid]);

  // Vis-silhouet → puntenwolk (offscreen tekenen, pixels uitlezen)
  function buildFishPoints(n) {
    const FW = 900, FH = 460, fcx = FW / 2, fcy = FH / 2, hw = 360, hh = 150;
    const oc = document.createElement('canvas'); oc.width = FW; oc.height = FH;
    const o = oc.getContext('2d'); o.fillStyle = '#fff';
    o.beginPath(); o.ellipse(fcx + hw * 0.06, fcy, hw * 0.68, hh * 0.82, 0, 0, Math.PI * 2); o.fill();           // romp
    o.beginPath(); o.moveTo(fcx - hw * 0.5, fcy); o.lineTo(fcx - hw, fcy - hh * 0.95); o.lineTo(fcx - hw, fcy + hh * 0.95); o.closePath(); o.fill(); // staart
    o.beginPath(); o.moveTo(fcx - hw * 0.18, fcy - hh * 0.6); o.lineTo(fcx + hw * 0.34, fcy - hh * 0.6); o.lineTo(fcx + hw * 0.02, fcy - hh * 1.12); o.closePath(); o.fill(); // rugvin
    o.beginPath(); o.moveTo(fcx - hw * 0.02, fcy + hh * 0.5); o.lineTo(fcx + hw * 0.3, fcy + hh * 0.5); o.lineTo(fcx + hw * 0.12, fcy + hh * 0.95); o.closePath(); o.fill(); // buikvin
    const img = o.getImageData(0, 0, FW, FH).data;
    const pts = [];
    for (let y = 0; y < FH; y += 2) for (let x = 0; x < FW; x += 2) { if (img[(y * FW + x) * 4 + 3] > 128) pts.push([x, y]); }
    for (let i = pts.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const p of pts) { if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
    const bw = maxX - minX || 1, bxc = (minX + maxX) / 2, byc = (minY + maxY) / 2;
    const take = Math.min(n, pts.length), out = [];
    for (let i = 0; i < take; i++) { const p = pts[i]; out.push({ fx: (p[0] - bxc) / bw, fy: (p[1] - byc) / bw }); }
    return out;
  }

  // Aantal deeltjes: zoveel als er oproepen waren, met een plafond (mobiel
  // lager voor de prestaties). Elk deeltje krijgt: zijn doelplek in de vis
  // (fx/fy), een willekeurige startplek (ca/cr = hoek/straal), een vertraging
  // en duur voor het "samenkomen", een explosie-richting (ea/er), grootte en
  // een kleur op basis van zijn x-positie in de vis.
  const N = Math.min(target || 6000, window.innerWidth < 700 ? 6500 : 13000);
  const parts = buildFishPoints(N).map(fp => ({
    fx: fp.fx, fy: fp.fy,
    ca: rng() * Math.PI * 2, cr: 0.28 + rng() * 0.82,
    delay: rng() * 850, dur: 1400 + rng() * 900,
    ea: rng() * Math.PI * 2, er: 0.4 + rng() * 0.95,
    size: 2.1 + rng() * 2.3, ph: rng() * Math.PI * 2,
    col: heroCol(clamp(fp.fx + 0.5, 0, 1)),
  }));

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-canvas';
  stage.appendChild(canvas);
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

  function draw(elapsed) {
    // s = scroll-voortgang door de hero (0 = bovenaan, 1 = grotendeels weg).
    // Stuurt het uiteenspatten van de vis en het vervagen van de tekst.
    const rct = sectionEl.getBoundingClientRect();
    const s = clamp(-rct.top / (rct.height * 0.85), 0, 1);
    const maxR = Math.hypot(W, H) * 0.62;
    const scale = Math.min(W * 0.66, 760);
    const cx = W / 2, cy = H * 0.5;
    const expEase = easeIn(s);
    ctx.clearRect(0, 0, W, H);
    // Normale blending (geen additive glow) zodat de deeltjes leesbaar
    // blijven op de lichte achtergrond.
    ctx.globalCompositeOperation = 'source-over';
    for (const p of parts) {
      // ef = "vorm-voortgang" van dit deeltje (0 = startplek, 1 = in de vis).
      const ft = clamp((elapsed - p.delay) / p.dur, 0, 1), ef = easeOut(ft);
      // fh* = doelplek in de vis, cl* = willekeurige startplek; we interpoleren
      // ertussen op basis van ef → de wolk trekt samen tot een vis.
      const fhx = cx + p.fx * scale, fhy = cy + p.fy * scale;
      const clx = cx + Math.cos(p.ca) * p.cr * maxR, cly = cy + Math.sin(p.ca) * p.cr * maxR;
      let x = clx + (fhx - clx) * ef, y = cly + (fhy - cly) * ef;
      const wob = (1 - s) * ef;
      x += Math.sin(elapsed * 0.0011 + p.ph) * 3 * wob;
      y += Math.cos(elapsed * 0.0009 + p.ph) * 3 * wob;
      // Bij scrollen (s > 0): elk deeltje schiet zijn eigen richting op én zakt
      // naar beneden — de vis spat uiteen en "valt weg".
      if (s > 0) { x += Math.cos(p.ea) * p.er * maxR * 0.9 * expEase; y += Math.sin(p.ea) * p.er * maxR * 0.55 * expEase + expEase * expEase * H * 0.5; }
      const a = ef * (1 - smoothstep(0.6, 1, s));
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.col;
      ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const ce = easeOut(clamp(elapsed / 2200, 0, 1));
    if (countEl) countEl.textContent = fmt(Math.round(ce * target));
    if (overlay) { overlay.style.opacity = String(1 - smoothstep(0, 0.55, s)); overlay.style.transform = `translateY(${-s * 40}px)`; }
  }

  if (reduceMotion()) {
    draw(99999);
    cleanups.push(() => ro.disconnect());
    return;
  }

  let formStart = 0, running = false, rafId = 0;
  function frame(now) {
    if (!formStart) formStart = now;
    draw(now - formStart);
    if (running) rafId = raf(frame);
  }
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!running) { running = true; rafId = raf(frame); } }
    else { running = false; cancelAnimationFrame(rafId); }
  }, { threshold: 0 });
  io.observe(sectionEl);
  cleanups.push(() => { running = false; cancelAnimationFrame(rafId); io.disconnect(); ro.disconnect(); });
}
