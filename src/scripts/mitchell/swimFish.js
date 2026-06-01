import gsap from 'gsap';
import { C } from './constants.js';
import { reduceMotion } from './utils.js';

// Scroll-vis — gids die om de actieve grafiek heen zwemt
export function initSwimFish() {
  if (reduceMotion) return () => {};
  document.querySelectorAll('.swim-fish').forEach(n => n.remove()); // de-dupe bij hermount

  const host = document.createElement('div');
  host.className = 'swim-fish';
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = `
    <div class="swim-fish-rot">
      <svg viewBox="0 0 64 32">
        <defs>
          <linearGradient id="swimFishGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="${C.teal}"/>
            <stop offset="58%" stop-color="${C.bell}"/>
            <stop offset="100%" stop-color="${C.purple}"/>
          </linearGradient>
        </defs>
        <g fill="url(#swimFishGrad)">
          <path class="swim-fish-tail" d="M18 16 L2 5 L6 16 L2 27 Z"/>
          <ellipse cx="36" cy="16" rx="22" ry="10.5"/>
          <path d="M34 7 q7 -8 13 -3 q-5 3 -7 7 Z"/>
        </g>
        <circle cx="48" cy="13" r="2.1" fill="#01211c"/>
      </svg>
    </div>`;
  document.body.appendChild(host);
  const rotEl = host.querySelector('.swim-fish-rot');

  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

  // Zoek alle grafiek-stages waaromheen de vis kan zwemmen (skipt de hero
  // omdat die zijn eigen grote vis heeft).
  function getStages() {
    return Array.from(document.querySelectorAll('.chapter:not(.chapter--hero)'))
      .map(ch => ch.querySelector('[class$="-stage"]') || ch.querySelector('[class*="-stage "]') || ch)
      .filter(Boolean);
  }

  let curX = window.innerWidth * 0.82, curY = window.innerHeight * 0.55;
  let lastDir = 1, lastTilt = 0;
  let initialized = false;
  let raf2 = 0;
  const t0 = performance.now();

  function tick(now) {
    const tt = (now - t0) / 1000;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const viewCy = vh / 2;

    let active = null, activeBox = null, bestDist = Infinity;
    getStages().forEach(s => {
      const r = s.getBoundingClientRect();
      if (r.height < 40 || r.bottom < 0 || r.top > vh) return;
      const sCy = r.top + r.height / 2;
      const d = Math.abs(sCy - viewCy);
      if (d < bestDist) { bestDist = d; active = s; activeBox = r; }
    });

    let targetX, targetY, tx, ty;
    if (active && activeBox) {
      const sCx = activeBox.left + activeBox.width / 2;
      const sCy = activeBox.top + activeBox.height / 2;
      const radX = clamp(activeBox.width  / 2 + 70, 170, vw * 0.45);
      const radY = clamp(activeBox.height / 2 + 50, 130, vh * 0.45);

      const ch = active.closest('.chapter') || active;
      const chR = ch.getBoundingClientRect();
      const span = chR.height + vh;
      const chT  = clamp((vh - chR.top) / span, 0, 1);
      const angle = chT * Math.PI * 2.6 + tt * 0.35;

      targetX = sCx + Math.cos(angle) * radX;
      targetY = sCy + Math.sin(angle) * radY;
      tx = -Math.sin(angle) * radX;
      ty =  Math.cos(angle) * radY;
    } else {
      targetX = vw - 90 + Math.sin(tt * 0.6) * 30;
      targetY = vh - 110 + Math.sin(tt * 0.9) * 20;
      tx = Math.cos(tt * 0.6); ty = Math.sin(tt * 0.9);
    }

    targetX = clamp(targetX, 40, vw - 40);
    targetY = clamp(targetY, 60, vh - 60);

    const k = initialized ? 0.09 : 1;
    curX += (targetX - curX) * k;
    curY += (targetY - curY) * k;
    initialized = true;

    const tang = Math.atan2(ty, Math.abs(tx) + 1e-4) * 180 / Math.PI;
    const dir = tx < -0.05 ? -1 : tx > 0.05 ? 1 : lastDir;
    lastDir = dir;
    lastTilt += (clamp(tang, -22, 22) - lastTilt) * 0.18;

    const bobX = Math.sin(tt * 1.3) * 2.6;
    const bobY = Math.sin(tt * 2.1 + 0.4) * 3.2;
    const yaw  = Math.sin(tt * 1.65 + 0.9) * 3.5;

    gsap.set(host,  { x: curX + bobX, y: curY + bobY, xPercent: -50, yPercent: -50, scaleX: dir });
    gsap.set(rotEl, { rotation: lastTilt + yaw });

    raf2 = requestAnimationFrame(tick);
  }
  raf2 = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf2);
    host.remove();
  };
}
