import { $, fmt, reduceMotion } from '../../utils.js';
import { state, lifecycle, raf } from '../../state.js';

export function initPond() {
  const { pondWeekData } = state;
  const { cleanups } = lifecycle;
  const stage = $('#pondStage');
  const week = pondWeekData;
  if (!week || !week.length) { stage.innerHTML = '<p class="stage-fallback">Geen tijddata.</p>'; return; }

  const canvas = document.createElement('canvas');
  canvas.className = 'pond-canvas';
  stage.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let Wd = 0, Hd = 0;
  function resize() {
    const r = stage.getBoundingClientRect();
    Wd = r.width; Hd = r.height;
    canvas.width = Wd * dpr; canvas.height = Hd * dpr;
    canvas.style.width = Wd + 'px'; canvas.style.height = Hd + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(stage);

  const clock = document.createElement('div'); clock.className = 'pond-clock'; stage.appendChild(clock);
  const counter = document.createElement('div'); counter.className = 'pond-counter'; stage.appendChild(counter);

  const dayLabels = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
  const MIN = week.length, DURATION = 60000;
  const maxPer = Math.max(...week, 1);
  const prefix = new Array(MIN + 1).fill(0);
  for (let i = 0; i < MIN; i++) prefix[i + 1] = prefix[i] + week[i];

  let ripples = [];
  function spawn(count) {
    const inten = Math.min(count / maxPer, 1);
    const n = Math.min(count, 5);
    const col = inten > 0.6 ? '255,128,185' : inten > 0.25 ? '155,116,255' : '30,172,176';
    for (let k = 0; k < n; k++) {
      ripples.push({ x: Math.random() * Wd, y: Hd * 0.05 + Math.random() * Hd * 0.9, r: 1.5, max: 16 + inten * 34, a: 0.7, col, sp: 0.5 + inten * 0.7 });
    }
  }

  if (reduceMotion) {
    clock.textContent = 'week-overzicht';
    ctx.clearRect(0, 0, Wd, Hd);
    for (let m = 0; m < MIN; m += 3) {
      if (!week[m]) continue;
      const inten = Math.min(week[m] / maxPer, 1);
      ctx.beginPath();
      ctx.arc((m / MIN) * Wd, Hd / 2 + (Math.random() - 0.5) * Hd * 0.5, 1 + inten * 4, 0, 7);
      ctx.fillStyle = `rgba(155,116,255,${0.15 + inten * 0.5})`; ctx.fill();
    }
    counter.textContent = `${fmt(prefix[MIN])} bel oproepen in een week`;
    cleanups.push(() => ro.disconnect());
    return;
  }

  let startT = 0, lastMin = 0, running = false, raf4 = 0;
  function frame(t) {
    if (!startT) startT = t;
    const p = ((t - startT) % DURATION) / DURATION;
    const curMin = Math.floor(p * MIN);
    let lo = lastMin + 1;
    if (curMin < lastMin) lo = 0;
    for (let m = lo; m <= curMin; m++) { if (week[m] > 0) spawn(week[m]); }
    lastMin = curMin;

    ctx.clearRect(0, 0, Wd, Hd);
    ripples = ripples.filter(rp => rp.a > 0.02 && rp.r < rp.max);
    for (const rp of ripples) {
      rp.r += rp.sp * (1 + rp.max / 28); rp.a *= 0.965;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, 7);
      ctx.strokeStyle = `rgba(${rp.col},${rp.a})`; ctx.lineWidth = 1.5; ctx.stroke();
    }
    const dow = Math.min(6, Math.floor(curMin / 1440)), hod = Math.floor((curMin % 1440) / 60), moh = curMin % 60;
    clock.textContent = `${dayLabels[dow]} ${String(hod).padStart(2, '0')}:${String(moh).padStart(2, '0')}`;
    counter.textContent = `${fmt(prefix[curMin])} bel oproepen`;
    if (running) raf4 = raf(frame);
  }
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!running) { running = true; raf4 = raf(frame); } }
    else { running = false; cancelAnimationFrame(raf4); }
  }, { threshold: 0.2 });
  io.observe(stage);
  cleanups.push(() => { running = false; cancelAnimationFrame(raf4); io.disconnect(); ro.disconnect(); });
}
