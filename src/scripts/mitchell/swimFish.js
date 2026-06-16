import gsap from 'gsap';
import { reduceMotion } from './utils.js';

// ============================================================================
// swimFish.js — het kleine "gids-visje" dat met je meescrolt.
// Het zoekt elke frame de grafiek die het dichtst bij het midden van het scherm
// staat en cirkelt daar met een soepele beweging omheen (GSAP). Buiten beeld
// dobbert het rechtsonder rond. Wordt overgeslagen bij prefers-reduced-motion.
// ============================================================================

// ── Instelbare waarden ──────────────────────────────────────────────────────
const LERP = 0.09;       // hoe snel het visje naar zijn doel toe glijdt (0..1)
const MAX_TILT = 22;     // maximale kanteling in graden
const TILT_EASE = 0.18;  // hoe vlot de kanteling meedraait

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

// Alle grafiek-stages waaromheen de vis kan zwemmen (de hero heeft een eigen vis).
function getStages() {
  return Array.from(document.querySelectorAll('.chapter:not(.chapter--hero)'))
    .map(ch => ch.querySelector('[class$="-stage"]') || ch.querySelector('[class*="-stage "]') || ch)
    .filter(Boolean);
}

// De stage die het dichtst bij het verticale midden van het scherm staat.
function getActiveStage(viewH) {
  let best = null, bestDist = Infinity;
  getStages().forEach(stage => {
    const box = stage.getBoundingClientRect();
    if (box.height < 40 || box.bottom < 0 || box.top > viewH) return; // niet (goed) in beeld
    const midY = box.top + box.height / 2;
    const dist = Math.abs(midY - viewH / 2);
    if (dist < bestDist) { bestDist = dist; best = { stage, box }; }
  });
  return best;
}

// Een punt op de ellips-baan rond een stage, plus de bewegingsrichting (tx, ty).
// De hoek volgt uit de scroll-voortgang door het hoofdstuk + een trage tijd-drift.
function orbitTarget(stage, box, elapsed, viewW, viewH) {
  const centerX = box.left + box.width / 2;
  const centerY = box.top + box.height / 2;
  const radiusX = clamp(box.width / 2 + 70, 170, viewW * 0.45);
  const radiusY = clamp(box.height / 2 + 50, 130, viewH * 0.45);

  const chapter = stage.closest('.chapter') || stage;
  const chapterBox = chapter.getBoundingClientRect();
  const scrollProgress = clamp((viewH - chapterBox.top) / (chapterBox.height + viewH), 0, 1);
  const angle = scrollProgress * Math.PI * 2.6 + elapsed * 0.35;

  return {
    x: centerX + Math.cos(angle) * radiusX,
    y: centerY + Math.sin(angle) * radiusY,
    tx: -Math.sin(angle) * radiusX,
    ty:  Math.cos(angle) * radiusY,
  };
}

// Geen stage in beeld: dobber rustig rechtsonder rond.
function idleTarget(elapsed, viewW, viewH) {
  return {
    x: viewW - 90 + Math.sin(elapsed * 0.6) * 30,
    y: viewH - 110 + Math.sin(elapsed * 0.9) * 20,
    tx: Math.cos(elapsed * 0.6),
    ty: Math.sin(elapsed * 0.9),
  };
}

export function initSwimFish() {
  if (reduceMotion()) return () => {};
  document.querySelectorAll('.swim-fish').forEach(n => n.remove()); // de-dupe bij hermount

  const host = document.createElement('div');
  host.className = 'swim-fish';
  host.setAttribute('aria-hidden', 'true');
  // Het gids-visje is het baars-plaatje. De baars kijkt van nature naar links;
  // de zwemrichting wordt met scaleX afgehandeld (zie -dir).
  host.innerHTML = `
    <div class="swim-fish-rot">
      <img src="/images/baars.png" alt="" draggable="false"
        style="width:100%;height:100%;object-fit:contain;display:block;" />
    </div>`;
  document.body.appendChild(host);
  const rotEl = host.querySelector('.swim-fish-rot');

  let curX = window.innerWidth * 0.82, curY = window.innerHeight * 0.55;
  let lastDir = 1, lastTilt = 0;
  let initialized = false;
  let frameId = 0;
  const startTime = performance.now();

  function tick(now) {
    const elapsed = (now - startTime) / 1000;
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    // Kies het doel: rond de actieve grafiek, of anders dobberen rechtsonder.
    const active = getActiveStage(viewH);
    const target = active
      ? orbitTarget(active.stage, active.box, elapsed, viewW, viewH)
      : idleTarget(elapsed, viewW, viewH);

    const targetX = clamp(target.x, 40, viewW - 40);
    const targetY = clamp(target.y, 60, viewH - 60);

    // Soepel naar het doel (lerp); het eerste frame meteen op z'n plek zetten
    // (factor 1) zodat hij niet vanuit de hoek komt aanschieten.
    const smoothing = initialized ? LERP : 1;
    curX += (targetX - curX) * smoothing;
    curY += (targetY - curY) * smoothing;
    initialized = true;

    // Richting (links/rechts) en kanteling uit de bewegingsrichting halen.
    const tiltDeg = Math.atan2(target.ty, Math.abs(target.tx) + 1e-4) * 180 / Math.PI;
    const dir = target.tx < -0.05 ? -1 : target.tx > 0.05 ? 1 : lastDir;
    lastDir = dir;
    lastTilt += (clamp(tiltDeg, -MAX_TILT, MAX_TILT) - lastTilt) * TILT_EASE;

    // Kleine dobber + gier zodat het levendig oogt.
    const bobX = Math.sin(elapsed * 1.3) * 2.6;
    const bobY = Math.sin(elapsed * 2.1 + 0.4) * 3.2;
    const yaw  = Math.sin(elapsed * 1.65 + 0.9) * 3.5;

    gsap.set(host,  { x: curX + bobX, y: curY + bobY, xPercent: -50, yPercent: -50, scaleX: -dir });
    gsap.set(rotEl, { rotation: lastTilt + yaw });

    frameId = requestAnimationFrame(tick);
  }
  frameId = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frameId);
    host.remove();
  };
}
