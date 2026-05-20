/* =========================================================
   DATA
   ========================================================= */
const visData = [
  { naam: 'Blankvoorn', count: 1240, color: '#7ec8e3', weight: 0.3,  shape: 'round', diepte: 'mid',   habitat: 'open' },
  { naam: 'Brasem',     count: 980,  color: '#5aafcf', weight: 1.8,  shape: 'round', diepte: 'bodem', habitat: 'zand' },
  { naam: 'Baars',      count: 740,  color: '#4a9ab8', weight: 0.6,  shape: 'baars', diepte: 'mid',   habitat: 'open' },
  { naam: 'Snoekbaars', count: 510,  color: '#3a8aa8', weight: 2.4,  shape: 'pred',  diepte: 'mid',   habitat: 'open' },
  { naam: 'Paling',     count: 390,  color: '#2a7a98', weight: 0.5,  shape: 'long',  diepte: 'bodem', habitat: 'steen' },
  { naam: 'Kolblei',    count: 320,  color: '#f4c560', weight: 0.4,  shape: 'round', diepte: 'mid',   habitat: 'zand' },
  { naam: 'Alver',      count: 280,  color: '#e8b85a', weight: 0.08, shape: 'tiny',  diepte: 'top',   habitat: 'oppervlak' },
  { naam: 'Ruisvoorn',  count: 190,  color: '#5a8a3f', weight: 0.35, shape: 'round', diepte: 'top',   habitat: 'riet' },
  { naam: 'Snoek',      count: 95,   color: '#ff7849', weight: 3.2,  shape: 'pred',  diepte: 'mid',   habitat: 'riet' },
  { naam: 'Winde',      count: 62,   color: '#c8a96e', weight: 0.8,  shape: 'baars', diepte: 'mid',   habitat: 'stroom' },
  { naam: 'Meerval',    count: 14,   color: '#9b6bae', weight: 12.0, shape: 'long',  diepte: 'bodem', habitat: 'steen' }
];
const TOTAL = visData.reduce((s, v) => s + v.count, 0);
const MONTHS = ['mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov'];
const MONTH_FULL = ['Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November'];
const FIRST_OBS = {
  Blankvoorn: '12 maart', Brasem: '14 maart', Baars: '18 maart', Snoekbaars: '24 maart',
  Paling: '31 maart', Kolblei: '02 april', Alver: '06 april', Ruisvoorn: '08 april',
  Snoek: '11 april', Winde: '19 april', Meerval: '02 mei'
};

/* Reproducible PRNG */
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260518);

/* Monthly distribution per species — peaks april/mei */
function generateMonthly(total) {
  const peak = [0.06, 0.22, 0.28, 0.16, 0.10, 0.06, 0.05, 0.04, 0.03];
  return peak.map(p => Math.round(p * total * (0.92 + rng() * 0.16)));
}
visData.forEach(v => { v.monthly = generateMonthly(v.count); });

/* Daily counts (365 days starting Jan 1) */
function generateDaily(total) {
  const daily = new Array(365).fill(0);
  const peakDay = 110;
  const sigma = 35;
  for (let i = 0; i < 365; i++) {
    if (i < 60 || i > 305) { daily[i] = 0; continue; }
    const g = Math.exp(-((i - peakDay) ** 2) / (2 * sigma * sigma));
    daily[i] = g * total * (0.7 + rng() * 0.6);
  }
  const sum = daily.reduce((a, b) => a + b, 0);
  return daily.map(v => Math.round(v / sum * total));
}
const dailyTotals = generateDaily(TOTAL);

/* Util */
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));
const NL = new Intl.NumberFormat('nl-NL');
const fmt = n => NL.format(Math.round(n));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================================
   SHARED: SVG FISH HELPER
   ========================================================= */
function fishSymbolId(shape, vintage = false) {
  return (vintage ? 'fish-etch-' : 'fish-') + shape;
}
function fishUse(shape, x, y, w, color, rotate = 0, opacity = 1, wiggle = false, vintage = false) {
  const h = w * (shape === 'long' ? 0.18 : shape === 'tiny' ? 0.34 : 0.4);
  const cls = wiggle ? 'fish-shape fish-wiggle' : 'fish-shape';
  return `<g class="${cls}" transform="translate(${x},${y}) rotate(${rotate})" style="color: ${color}; opacity: ${opacity}">
    <use href="#${fishSymbolId(shape, vintage)}" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}"/>
  </g>`;
}

/* =========================================================
   GLOBAL: FLOATING TOOLTIP HELPER
   ========================================================= */
const tooltipEl = $('#fishTooltip');
let tooltipHideTimer = 0;
function showTooltip(html, x, y) {
  clearTimeout(tooltipHideTimer);
  tooltipEl.innerHTML = html;
  tooltipEl.style.left = x + 'px';
  tooltipEl.style.top = y + 'px';
  tooltipEl.classList.add('visible');
}
function hideTooltip(delay = 0) {
  clearTimeout(tooltipHideTimer);
  if (delay > 0) {
    tooltipHideTimer = setTimeout(() => tooltipEl.classList.remove('visible'), delay);
  } else {
    tooltipEl.classList.remove('visible');
  }
}

/* =========================================================
   GLOBAL: CHAPTER NAV (side dots)
   ========================================================= */
const chapterMeta = [
  { id: 'ch-dive',     label: '0 · De duik' },
  { id: 'ch-bell',     label: '1 · De bel' },
  { id: 'ch-race',     label: '2 · Zwemrace' },
  { id: 'ch-sluis',    label: '3 · Sluis' },
  { id: 'ch-clock',    label: '4 · Klok' },
  { id: 'ch-strata',   label: '5 · Diepte' },
  { id: 'ch-aquarium', label: '6 · Aquarium' },
  { id: 'ch-flow',     label: '7 · Stroming' },
  { id: 'ch-ring',     label: '8 · Kalender' },
  { id: 'ch-radar',    label: '9 · Radar' },
  { id: 'ch-habitat',  label: '10 · Habitat' },
  { id: 'ch-net',      label: '11 · Net' },
  { id: 'ch-journal',  label: '12 · Journaal' },
  { id: 'ch-outro',    label: '13 · Tot ziens' }
];
function buildChapterNav() {
  const nav = $('#chapterNav');
  const ul = nav.querySelector('ul');
  chapterMeta.forEach(ch => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chapter-nav-dot';
    btn.dataset.target = ch.id;
    btn.setAttribute('aria-label', 'Ga naar ' + ch.label);
    const label = document.createElement('span');
    label.className = 'chapter-nav-label';
    label.textContent = ch.label;
    label.setAttribute('aria-hidden', 'true');
    btn.addEventListener('click', () => {
      const target = document.getElementById(ch.id);
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    li.appendChild(btn);
    li.appendChild(label);
    ul.appendChild(li);
  });

  const navObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        $$('.chapter-nav-dot', nav).forEach(d => {
          d.classList.toggle('active', d.dataset.target === id);
        });
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  $$('.chapter').forEach(c => navObs.observe(c));

  // Reveal after dive section
  const reveal = () => {
    const diveEl = $('#ch-dive');
    const past = diveEl.getBoundingClientRect().bottom < window.innerHeight * 0.5;
    nav.classList.toggle('visible', past);
  };
  window.addEventListener('scroll', reveal, { passive: true });
  reveal();
}

/* =========================================================
   GLOBAL: SECTION OBSERVER + BACKGROUND BUBBLES
   ========================================================= */
const observers = new Map();
const chapterInit = {};

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      if (!entry.target.dataset.inited) {
        entry.target.dataset.inited = '1';
        const id = entry.target.id;
        if (chapterInit[id]) chapterInit[id](entry.target);
      }
    }
  });
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

/* Background bubbles — gentle stream */
function spawnBackgroundBubbles() {
  if (reduceMotion) return;
  const root = $('.bubbles-bg');
  if (!root) return;
  function add() {
    const size = 4 + Math.random() * 14;
    const x = Math.random() * 100;
    const dur = 14 + Math.random() * 14;
    const drift = (Math.random() - 0.5) * 8;
    const b = document.createElement('div');
    b.className = 'bubble';
    b.style.cssText = `
      left: ${x}vw;
      width: ${size}px;
      height: ${size}px;
      --max-op: ${0.25 + Math.random() * 0.35};
      animation: bg-bubble-up ${dur}s linear forwards;
      --drift: ${drift}vw;
    `;
    document.querySelector('.atmosphere').appendChild(b);
    setTimeout(() => b.remove(), dur * 1000 + 200);
  }
  setInterval(add, 1100);
  for (let i = 0; i < 8; i++) setTimeout(add, i * 600);
}
const bgBubblesStyle = document.createElement('style');
bgBubblesStyle.textContent = `
  @keyframes bg-bubble-up {
    0%   { transform: translateY(0) translateX(0); opacity: 0; }
    10%  { opacity: var(--max-op, 0.5); }
    90%  { opacity: var(--max-op, 0.5); }
    100% { transform: translateY(-110vh) translateX(var(--drift, 0)); opacity: 0; }
  }`;
document.head.appendChild(bgBubblesStyle);

/* =========================================================
   CHAPTER 0 — DIVE
   ========================================================= */
chapterInit['ch-dive'] = (el) => {
  const stage = $('#diveStage');
  const sky = $('#diveSky');
  const surface = $('#diveWaterSurface');
  const under = $('#diveUnderwater');
  const skyline = $('#diveSkyline');
  const rays = $('#diveRays');

  function update() {
    const rect = el.getBoundingClientRect();
    const total = el.offsetHeight - window.innerHeight;
    const scrolled = Math.max(0, -rect.top);
    const t = Math.max(0, Math.min(1, scrolled / total));

    sky.style.opacity = Math.max(0, 1 - t * 1.8);
    skyline.style.transform = `translateY(${t * 240}px)`;
    skyline.style.opacity = Math.max(0, 1 - t * 2);
    surface.style.height = `${30 + t * 30}%`;
    under.style.opacity = Math.min(1, t * 1.4);
    rays.style.opacity = Math.min(0.7, t * 1.2);

    const headline = $('#diveHeadline');
    headline.style.color = t > 0.3 ? 'var(--foam)' : 'rgba(255, 240, 220, 0.95)';
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
};

/* =========================================================
   CHAPTER 1 — BELL + ORBITS
   ========================================================= */
chapterInit['ch-bell'] = (el) => {
  const orbits = $('#bellOrbits');
  const button = $('#bellButton');
  const counter = $('#bellCounter');
  const stage = $('#bellStage');

  let clicks = 0;
  const sorted = [...visData].sort((a, b) => b.count - a.count);
  const maxOrbit = 47;
  const minOrbit = 17;
  const orbitFish = [];

  sorted.forEach((v, i) => {
    const orbitR = minOrbit + (maxOrbit - minOrbit) * (i / (sorted.length - 1));
    const ringDiv = document.createElement('div');
    ringDiv.className = 'bell-orbit-ring';
    ringDiv.style.width = ringDiv.style.height = `${orbitR * 2}%`;
    orbits.appendChild(ringDiv);

    const fishCount = Math.max(2, Math.min(7, Math.round(v.count / 220)));
    const dir = i % 2 ? 1 : -1;
    const speed = 0.0008 + (sorted.length - i) * 0.00012;
    for (let k = 0; k < fishCount; k++) {
      const fishEl = document.createElement('div');
      fishEl.className = 'bell-fish';
      fishEl.style.color = v.color;
      fishEl.innerHTML = `<svg viewBox="-50 -20 100 40" width="100%" height="100%" style="overflow:visible;"><use href="#${fishSymbolId(v.shape)}"/></svg>`;
      orbits.appendChild(fishEl);
      orbitFish.push({
        el: fishEl,
        r: orbitR,
        phase: (k / fishCount) * Math.PI * 2 + Math.random(),
        dir, speed,
        baseSpeed: speed,
        color: v.color
      });
    }
  });

  let boost = 0;
  let lastT = performance.now();
  let raf = 0;
  let running = true;

  function tick(now) {
    const dt = now - lastT;
    lastT = now;
    const dx = stage.clientWidth / 2;
    const dy = stage.clientHeight / 2;
    orbitFish.forEach(f => {
      const speed = f.baseSpeed * (1 + boost);
      f.phase += dt * speed * f.dir;
      const cx = Math.cos(f.phase) * (dx * f.r / 100);
      const cy = Math.sin(f.phase) * (dy * f.r / 100);
      const tan = f.phase + Math.PI / 2 * f.dir;
      const deg = (tan * 180 / Math.PI) % 360;
      f.el.style.transform = `translate(-50%, -50%) translate(${cx}px, ${cy}px) rotate(${deg}deg) ${f.dir < 0 ? 'scaleX(-1)' : ''}`;
    });
    boost *= 0.94;
    if (running) raf = requestAnimationFrame(tick);
  }
  if (!reduceMotion) raf = requestAnimationFrame(tick);

  function press() {
    clicks++;
    counter.textContent = `${fmt(clicks)} / ${fmt(TOTAL)} belroepen`;
    boost = Math.min(2.5, boost + 1.3);
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    stage.appendChild(ripple);
    setTimeout(() => ripple.remove(), 1400);
  }

  let holdTimer = 0;
  let holdInterval = 0;
  let isHolding = false;
  function startHold() {
    if (isHolding) return;
    isHolding = true;
    press();
    holdTimer = setTimeout(() => {
      button.classList.add('holding');
      holdInterval = setInterval(press, 260);
    }, 420);
  }
  function endHold() {
    if (!isHolding) return;
    isHolding = false;
    button.classList.remove('holding');
    clearTimeout(holdTimer);
    clearInterval(holdInterval);
  }
  button.addEventListener('pointerdown', (e) => { e.preventDefault(); startHold(); });
  button.addEventListener('pointerup', endHold);
  button.addEventListener('pointerleave', endHold);
  button.addEventListener('pointercancel', endHold);
  button.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startHold(); }
  });
  button.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); endHold(); }
  });

  /* Pause when offscreen */
  const pauseObs = new IntersectionObserver(([entry]) => {
    running = entry.isIntersecting;
    if (running && !reduceMotion) {
      lastT = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
    }
  }, { threshold: 0.01 });
  pauseObs.observe(stage);
};

/* =========================================================
   CHAPTER 2 — SWIM RACE
   ========================================================= */
chapterInit['ch-race'] = (el) => {
  const lanes = $('#raceLanes');
  const max = Math.max(...visData.map(v => v.count));
  visData.forEach(v => {
    const pct = (v.count / max) * 100;
    const rank = visData.indexOf(v) + 1;
    const share = (v.count / TOTAL * 100).toFixed(1);
    const lane = document.createElement('div');
    lane.className = 'race-lane';
    lane.setAttribute('role', 'button');
    lane.setAttribute('tabindex', '0');
    lane.setAttribute('aria-label', `${v.naam}: ${fmt(v.count)} waarnemingen, plek ${rank} van ${visData.length}. Klik om opnieuw te zwemmen.`);
    lane.dataset.naam = v.naam;
    lane.innerHTML = `
      <div class="race-name">${v.naam}</div>
      <div class="race-track">
        <div class="race-progress" data-width="${pct}" style="width: 0%;">
          <svg class="race-fish" viewBox="-50 -20 100 40" style="color: ${v.color}; overflow:visible">
            <use href="#${fishSymbolId(v.shape)}"/>
          </svg>
        </div>
      </div>
      <div class="race-count">${fmt(v.count)}</div>
    `;
    lanes.appendChild(lane);

    const restart = () => {
      const p = lane.querySelector('.race-progress');
      lane.classList.remove('dart');
      p.style.transition = 'none';
      p.style.width = '0%';
      // Force reflow so the transition restarts
      void p.offsetWidth;
      p.style.transition = '';
      lane.classList.add('dart');
      setTimeout(() => { p.style.width = p.dataset.width + '%'; }, 30);
      setTimeout(() => lane.classList.remove('dart'), 1300);
    };
    lane.addEventListener('click', restart);
    lane.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); restart(); }
    });
    lane.addEventListener('mouseenter', (e) => {
      const rect = lane.getBoundingClientRect();
      showTooltip(
        `<strong>${v.naam}</strong>${fmt(v.count)} waarnemingen · ${share}% van het seizoen`,
        rect.left + rect.width / 2, rect.top
      );
    });
    lane.addEventListener('mouseleave', () => hideTooltip());
  });
  /* Trigger width transition */
  requestAnimationFrame(() => {
    $$('.race-progress', lanes).forEach((p, i) => {
      setTimeout(() => { p.style.width = p.dataset.width + '%'; }, i * 110);
    });
  });
};

/* =========================================================
   CHAPTER 3 — SLUIS (vertical sankey-style flow)
   ========================================================= */
chapterInit['ch-sluis'] = (el) => {
  const host = $('#sluisStage');
  const W = 720, H = 960;
  const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('aria-hidden', 'true');

  const wallColor = '#142d4a';
  const stoneColor = '#0a1c30';

  // Background water
  svg.append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', H).attr('fill', 'url(#sluis-water)');

  // Outline of sluis chamber (trapezoid-ish)
  const innerL = 130, innerR = W - 130;
  const top = 80;
  const bot = H - 80;
  const mouthW = 80;

  // Side walls (stone)
  svg.append('path')
    .attr('d', `M 0 ${top} L ${innerL} ${top} L ${innerL} ${bot} L 0 ${bot} Z`)
    .attr('fill', wallColor);
  svg.append('path')
    .attr('d', `M ${innerR} ${top} L ${W} ${top} L ${W} ${bot} L ${innerR} ${bot} Z`)
    .attr('fill', wallColor);

  // Stone texture (random rects)
  const rngStone = mulberry32(7);
  for (let i = 0; i < 60; i++) {
    const side = rngStone() > 0.5;
    const x = side ? rngStone() * (innerL - 20) : innerR + 5 + rngStone() * (W - innerR - 25);
    const y = top + rngStone() * (bot - top);
    svg.append('rect').attr('x', x).attr('y', y).attr('width', 14 + rngStone() * 22).attr('height', 8 + rngStone() * 10)
      .attr('fill', stoneColor).attr('opacity', 0.4 + rngStone() * 0.3);
  }

  // Upper gate (closed at top)
  svg.append('rect').attr('x', innerL).attr('y', top - 10).attr('width', innerR - innerL).attr('height', 30)
    .attr('fill', '#1b3a5b').attr('stroke', '#7ec8e3').attr('stroke-opacity', 0.25).attr('stroke-width', 1);
  svg.append('text').attr('x', W/2).attr('y', top - 22).attr('text-anchor', 'middle')
    .attr('fill', '#7ec8e3').attr('font-family', 'DM Mono, monospace').attr('font-size', 14).attr('opacity', 0.7)
    .text('↑ Kromme Rijn');

  // Bottom gate
  svg.append('rect').attr('x', innerL).attr('y', bot - 20).attr('width', innerR - innerL).attr('height', 30)
    .attr('fill', '#1b3a5b').attr('stroke', '#7ec8e3').attr('stroke-opacity', 0.25).attr('stroke-width', 1);
  svg.append('text').attr('x', W/2).attr('y', bot + 30).attr('text-anchor', 'middle')
    .attr('fill', '#7ec8e3').attr('font-family', 'DM Mono, monospace').attr('font-size', 14).attr('opacity', 0.7)
    .text('Gracht ↓');

  // Bell icon
  svg.append('circle').attr('cx', innerR + 40).attr('cy', bot - 5).attr('r', 12)
    .attr('fill', '#f4c560').attr('opacity', 0.9);
  svg.append('text').attr('x', innerR + 40).attr('y', bot - 1).attr('text-anchor', 'middle')
    .attr('font-size', 14).attr('font-family', 'serif').attr('font-style', 'italic').attr('fill', '#1a1a14').text('!');
  svg.append('text').attr('x', innerR + 40).attr('y', bot + 20).attr('text-anchor', 'middle')
    .attr('fill', '#f4c560').attr('font-family', 'DM Mono, monospace').attr('font-size', 10).attr('opacity', 0.8)
    .text('camera');

  // Sankey-style streams (one band per species)
  const sorted = [...visData].sort((a, b) => b.count - a.count);
  const totalC = sorted.reduce((s, v) => s + v.count, 0);
  const usableW = innerR - innerL - 24;
  let offset = innerL + 12;

  const streamGroup = svg.append('g').attr('class', 'sluis-streams');
  const streamLayer = streamGroup.node();
  sorted.forEach((v, i) => {
    const w = Math.max(3, (v.count / totalC) * usableW);
    const wave = 18 + Math.sin(i * 1.3) * 8;
    const ctlY1 = top + (bot - top) * 0.3;
    const ctlY2 = top + (bot - top) * 0.7;
    const xJitter = (rng() - 0.5) * 18;

    const pathD = `
      M ${offset + w/2} ${bot - 25}
      C ${offset + w/2 - wave + xJitter} ${ctlY2},
        ${offset + w/2 + wave - xJitter} ${ctlY1},
        ${offset + w/2} ${top + 25}
    `;
    const stream = streamGroup.append('path').attr('d', pathD)
      .attr('class', 'sluis-stream')
      .attr('data-naam', v.naam)
      .attr('stroke', v.color).attr('stroke-width', w).attr('stroke-linecap', 'round')
      .attr('fill', 'none').attr('opacity', 0)
      .style('color', v.color)
      .style('filter', 'blur(0.5px)')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', `${v.naam}: ${fmt(v.count)} waarnemingen door de sluis`);

    stream.transition().delay(i * 80).duration(900).attr('opacity', 0.7);

    const label = streamGroup.append('text')
      .attr('class', 'sluis-label')
      .attr('data-naam', v.naam)
      .attr('x', offset + w/2)
      .attr('y', top + 12)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', 9)
      .attr('fill', '#7ec8e3')
      .attr('opacity', 0)
      .text(v.naam.length > 8 ? v.naam.slice(0, 4) + '.' : v.naam);
    label.transition().delay(900 + i * 50).duration(400).attr('opacity', 0.8);

    const highlight = (active) => {
      streamLayer.classList.toggle('has-focus', active);
      $$('.sluis-stream', streamLayer).forEach(el => el.classList.toggle('active', active && el.dataset.naam === v.naam));
      $$('.sluis-label', streamLayer).forEach(el => el.classList.toggle('active', active && el.dataset.naam === v.naam));
    };

    stream.on('mouseenter', (e) => {
      highlight(true);
      showTooltip(
        `<strong>${v.naam}</strong>${fmt(v.count)} waarnemingen · ${(v.count / totalC * 100).toFixed(1)}%`,
        e.clientX, e.clientY
      );
    }).on('mousemove', (e) => {
      showTooltip(
        `<strong>${v.naam}</strong>${fmt(v.count)} waarnemingen · ${(v.count / totalC * 100).toFixed(1)}%`,
        e.clientX, e.clientY
      );
    }).on('mouseleave', () => {
      highlight(false);
      hideTooltip();
    }).on('focus', () => highlight(true)).on('blur', () => highlight(false));

    offset += w;
  });

  // Floating fish in the chamber
  const chamberFish = svg.append('g');
  for (let i = 0; i < 12; i++) {
    const v = sorted[i % sorted.length];
    const x = innerL + 30 + rng() * (usableW);
    const y = top + 40 + rng() * (bot - top - 80);
    const rot = rng() > 0.5 ? 270 + rng() * 30 : 250 + rng() * 40;
    chamberFish.append('g').attr('transform', `translate(${x}, ${y}) rotate(${rot}) scale(0.6)`)
      .attr('opacity', 0.85).attr('class', 'fish-wiggle')
      .style('color', v.color)
      .html(`<use href="#${fishSymbolId(v.shape)}" x="-50" y="-20" width="100" height="40"/>`);
  }
};

/* =========================================================
   CHAPTER 4 — SEASONAL CLOCK
   ========================================================= */
chapterInit['ch-clock'] = (el) => {
  const host = $('#clockStage');
  const legend = $('#clockLegend');
  const W = 640, H = 640;
  const cx = W/2, cy = H/2;
  const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

  const TOP5 = visData.slice(0, 5);
  const maxRing = 260;
  const minRing = 70;
  const ringStep = (maxRing - minRing) / TOP5.length;

  // Month wedges with subtle radial lines
  const monthCount = MONTHS.length;
  const angleStep = (Math.PI * 2) / monthCount;
  const startAngle = -Math.PI / 2;

  // Outer circle
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', maxRing + 20)
    .attr('fill', 'none').attr('stroke', 'rgba(126,200,227,0.08)').attr('stroke-width', 1);

  // Month labels & dividers
  for (let m = 0; m < monthCount; m++) {
    const a = startAngle + m * angleStep + angleStep/2;
    const labelR = maxRing + 32;
    const lx = cx + Math.cos(a) * labelR;
    const ly = cy + Math.sin(a) * labelR;
    svg.append('text').attr('x', lx).attr('y', ly + 4)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', 11)
      .attr('letter-spacing', '0.15em')
      .attr('fill', m === 1 || m === 2 ? '#f4c560' : '#7ec8e3')
      .attr('opacity', 0.8)
      .text(MONTHS[m].toUpperCase());

    const dA = startAngle + m * angleStep;
    const r1 = minRing - 10;
    const r2 = maxRing + 10;
    svg.append('line')
      .attr('x1', cx + Math.cos(dA) * r1).attr('y1', cy + Math.sin(dA) * r1)
      .attr('x2', cx + Math.cos(dA) * r2).attr('y2', cy + Math.sin(dA) * r2)
      .attr('stroke', 'rgba(126,200,227,0.1)').attr('stroke-dasharray', '2 4');
  }

  // Concentric rings
  const stage = $('#clockStage');
  const ringPaths = [];
  TOP5.forEach((v, ringIdx) => {
    const ringR = minRing + (TOP5.length - 1 - ringIdx) * ringStep + ringStep/2;
    const maxMonthly = Math.max(...v.monthly);

    const points = [];
    for (let m = 0; m < monthCount; m++) {
      const a = startAngle + m * angleStep + angleStep/2;
      const norm = v.monthly[m] / maxMonthly;
      const r = ringR - ringStep * 0.45 + norm * ringStep * 0.85;
      points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    const lineFn = d3.line().curve(d3.curveCardinalClosed.tension(0.6));
    const path = svg.append('path').attr('d', lineFn(points))
      .attr('class', 'clock-ring')
      .attr('data-naam', v.naam)
      .attr('fill', v.color).attr('fill-opacity', 0.18)
      .attr('stroke', v.color).attr('stroke-width', 1.6)
      .attr('stroke-opacity', 0.85)
      .style('mix-blend-mode', 'screen')
      .style('color', v.color);

    const length = path.node().getTotalLength();
    path.attr('stroke-dasharray', length).attr('stroke-dashoffset', length)
      .transition().delay(ringIdx * 120).duration(1400).attr('stroke-dashoffset', 0);

    ringPaths.push({ path, v, points });

    const dotsGroup = svg.append('g').attr('class', 'clock-ring').attr('data-naam', v.naam);
    points.forEach(([px, py], m) => {
      dotsGroup.append('circle').attr('cx', px).attr('cy', py).attr('r', 0)
        .attr('fill', v.color)
        .transition().delay(ringIdx * 120 + 1400 + m * 30).duration(300).attr('r', 3);
    });

    const highlight = (active) => {
      stage.classList.toggle('has-focus', active);
      $$('.clock-ring', stage).forEach(el => el.classList.toggle('active', active && el.dataset.naam === v.naam));
    };
    path.on('mouseenter', (e) => {
      highlight(true);
      const monthlyMax = Math.max(...v.monthly);
      const peakMonth = MONTH_FULL[v.monthly.indexOf(monthlyMax)];
      showTooltip(
        `<strong>${v.naam}</strong>Piek in ${peakMonth} — ${fmt(monthlyMax)} waarnemingen`,
        e.clientX, e.clientY
      );
    }).on('mousemove', (e) => {
      const monthlyMax = Math.max(...v.monthly);
      const peakMonth = MONTH_FULL[v.monthly.indexOf(monthlyMax)];
      showTooltip(
        `<strong>${v.naam}</strong>Piek in ${peakMonth} — ${fmt(monthlyMax)} waarnemingen`,
        e.clientX, e.clientY
      );
    }).on('mouseleave', () => { highlight(false); hideTooltip(); });
  });

  // Invisible month wedges for hover
  const wedgeR = maxRing + 18;
  for (let m = 0; m < monthCount; m++) {
    const a1 = startAngle + m * angleStep;
    const a2 = startAngle + (m + 1) * angleStep;
    const x1 = cx + Math.cos(a1) * wedgeR;
    const y1 = cy + Math.sin(a1) * wedgeR;
    const x2 = cx + Math.cos(a2) * wedgeR;
    const y2 = cy + Math.sin(a2) * wedgeR;
    const wedge = svg.append('path')
      .attr('class', 'clock-month-wedge')
      .attr('d', `M ${cx} ${cy} L ${x1} ${y1} A ${wedgeR} ${wedgeR} 0 0 1 ${x2} ${y2} Z`)
      .attr('data-month', m);

    wedge.on('mouseenter', (e) => {
      svg.selectAll('.clock-month-wedge').classed('active', false);
      wedge.classed('active', true);
      const lines = TOP5.map(s => `${s.naam}: ${fmt(s.monthly[m])}`).join('<br/>');
      showTooltip(
        `<strong>${MONTH_FULL[m]} 2026</strong>${lines}`,
        e.clientX, e.clientY
      );
    }).on('mousemove', (e) => {
      const lines = TOP5.map(s => `${s.naam}: ${fmt(s.monthly[m])}`).join('<br/>');
      showTooltip(`<strong>${MONTH_FULL[m]} 2026</strong>${lines}`, e.clientX, e.clientY);
    }).on('mouseleave', () => {
      wedge.classed('active', false);
      hideTooltip();
    });
  }

  // Center label
  svg.append('text').attr('x', cx).attr('y', cy - 6).attr('text-anchor', 'middle')
    .attr('font-family', 'Fraunces, serif').attr('font-style', 'italic').attr('font-size', 22)
    .attr('fill', '#f4c560').text('paaipiek');
  svg.append('text').attr('x', cx).attr('y', cy + 16).attr('text-anchor', 'middle')
    .attr('font-family', 'DM Mono, monospace').attr('font-size', 10).attr('letter-spacing', '0.18em')
    .attr('fill', '#7ec8e3').attr('opacity', 0.75).text('APR · MEI');

  // Legend (clickable to highlight)
  TOP5.forEach(v => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'clock-legend-item';
    item.setAttribute('aria-pressed', 'false');
    item.innerHTML = `<span class="clock-legend-dot" style="background:${v.color}"></span><span>${v.naam}</span>`;
    let active = false;
    item.addEventListener('click', () => {
      active = !active;
      item.setAttribute('aria-pressed', String(active));
      if (active) {
        stage.classList.add('has-focus');
        $$('.clock-ring', stage).forEach(el => el.classList.toggle('active', el.dataset.naam === v.naam));
        $$('.clock-legend-item', legend).forEach(b => {
          if (b !== item) { b.classList.add('dim'); b.setAttribute('aria-pressed', 'false'); }
          else b.classList.remove('dim');
        });
      } else {
        stage.classList.remove('has-focus');
        $$('.clock-ring', stage).forEach(el => el.classList.remove('active'));
        $$('.clock-legend-item', legend).forEach(b => b.classList.remove('dim'));
      }
    });
    legend.appendChild(item);
  });
};

/* =========================================================
   CHAPTER 5 — DEPTH STRATA
   ========================================================= */
chapterInit['ch-strata'] = (el) => {
  const layers = { top: $('#strataTop'), mid: $('#strataMid'), bodem: $('#strataBottom') };
  Object.keys(layers).forEach(depth => {
    const fishHere = visData.filter(v => v.diepte === depth);
    const host = layers[depth];
    const W = 800, H = 140;
    const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'xMidYMid meet');

    // Place fish based on count
    let xOff = 30;
    fishHere.forEach((v) => {
      const fishCount = Math.max(3, Math.min(12, Math.round(v.count / 110)));
      for (let i = 0; i < fishCount; i++) {
        const x = xOff + (i / fishCount) * 60 + (rng() - 0.5) * 10;
        const y = 30 + rng() * 80;
        const scale = 0.6 + rng() * 0.4;
        const dir = i % 2 ? 1 : -1;
        svg.append('g').attr('transform', `translate(${x}, ${y}) scale(${scale * dir}, ${scale})`)
          .attr('class', 'fish-wiggle-slow')
          .style('color', v.color)
          .attr('opacity', 0.85)
          .html(`<use href="#${fishSymbolId(v.shape)}" x="-50" y="-20" width="100" height="40"/>`);
      }
      xOff += 90;
    });
  });
};

/* =========================================================
   CHAPTER 6 — AQUARIUM (canvas, flocking-ish)
   ========================================================= */
chapterInit['ch-aquarium'] = (el) => {
  const canvas = $('#aquariumCanvas');
  const ctx = canvas.getContext('2d');
  const counter = $('#aquariumCounter');
  let W = 0, H = 0, dpr = window.devicePixelRatio || 1;

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // Pre-render fish sprites to small canvases (cheap)
  const sprites = {};
  function makeSprite(shape, color) {
    const key = shape + color;
    if (sprites[key]) return sprites[key];
    const w = shape === 'long' ? 64 : shape === 'tiny' ? 32 : 48;
    const h = shape === 'long' ? 14 : shape === 'tiny' ? 12 : 22;
    const c = document.createElement('canvas');
    c.width = w * dpr; c.height = h * dpr;
    const cx = c.getContext('2d');
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.fillStyle = color;
    drawFishPath(cx, shape, w/2, h/2, w, h);
    sprites[key] = c;
    return c;
  }
  function drawFishPath(cx, shape, x, y, w, h) {
    cx.save();
    cx.translate(x, y);
    cx.beginPath();
    if (shape === 'long') {
      cx.moveTo(-w*0.42, 0);
      cx.quadraticCurveTo(-w*0.5, -h*0.35, -w*0.35, -h*0.35);
      cx.quadraticCurveTo(0, -h*0.42, w*0.25, -h*0.28);
      cx.lineTo(w*0.35, -h*0.2);
      cx.lineTo(w*0.46, -h*0.32);
      cx.lineTo(w*0.5, 0);
      cx.lineTo(w*0.46, h*0.32);
      cx.lineTo(w*0.35, h*0.2);
      cx.lineTo(w*0.25, h*0.28);
      cx.quadraticCurveTo(0, h*0.42, -w*0.35, h*0.35);
      cx.quadraticCurveTo(-w*0.5, h*0.35, -w*0.42, 0);
      cx.fill();
    } else if (shape === 'tiny') {
      cx.moveTo(-w*0.36, 0);
      cx.quadraticCurveTo(-w*0.46, -h*0.5, -w*0.18, -h*0.55);
      cx.quadraticCurveTo(w*0.22, -h*0.6, w*0.34, -h*0.25);
      cx.lineTo(w*0.46, -h*0.45);
      cx.lineTo(w*0.42, 0);
      cx.lineTo(w*0.46, h*0.45);
      cx.lineTo(w*0.34, h*0.25);
      cx.quadraticCurveTo(w*0.22, h*0.6, -w*0.18, h*0.55);
      cx.quadraticCurveTo(-w*0.46, h*0.5, -w*0.36, 0);
      cx.fill();
    } else if (shape === 'pred') {
      cx.moveTo(-w*0.36, 0);
      cx.quadraticCurveTo(-w*0.46, -h*0.5, -w*0.18, -h*0.5);
      cx.quadraticCurveTo(w*0.18, -h*0.55, w*0.34, -h*0.3);
      cx.lineTo(w*0.42, -h*0.32);
      cx.lineTo(w*0.46, -h*0.18);
      cx.lineTo(w*0.5, -h*0.5);
      cx.lineTo(w*0.5, 0);
      cx.lineTo(w*0.5, h*0.5);
      cx.lineTo(w*0.46, h*0.18);
      cx.lineTo(w*0.42, h*0.32);
      cx.lineTo(w*0.34, h*0.3);
      cx.quadraticCurveTo(w*0.18, h*0.55, -w*0.18, h*0.5);
      cx.quadraticCurveTo(-w*0.46, h*0.5, -w*0.36, 0);
      cx.fill();
    } else if (shape === 'baars') {
      cx.moveTo(-w*0.36, 0);
      cx.quadraticCurveTo(-w*0.44, -h*0.5, -w*0.2, -h*0.6);
      cx.lineTo(-w*0.08, -h*0.75);
      cx.lineTo(0.04, -h*0.6);
      cx.quadraticCurveTo(w*0.2, -h*0.65, w*0.32, -h*0.22);
      cx.lineTo(w*0.46, -h*0.6);
      cx.lineTo(w*0.5, 0);
      cx.lineTo(w*0.46, h*0.6);
      cx.lineTo(w*0.32, h*0.22);
      cx.quadraticCurveTo(w*0.2, h*0.65, 0.04, h*0.6);
      cx.lineTo(-w*0.08, h*0.75);
      cx.lineTo(-w*0.2, h*0.6);
      cx.quadraticCurveTo(-w*0.44, h*0.5, -w*0.36, 0);
      cx.fill();
    } else {
      cx.moveTo(-w*0.36, 0);
      cx.quadraticCurveTo(-w*0.44, -h*0.5, -w*0.2, -h*0.6);
      cx.quadraticCurveTo(w*0.2, -h*0.7, w*0.32, -h*0.2);
      cx.lineTo(w*0.46, -h*0.5);
      cx.lineTo(w*0.5, 0);
      cx.lineTo(w*0.46, h*0.5);
      cx.lineTo(w*0.32, h*0.2);
      cx.quadraticCurveTo(w*0.2, h*0.7, -w*0.2, h*0.6);
      cx.quadraticCurveTo(-w*0.44, h*0.5, -w*0.36, 0);
      cx.fill();
    }
    cx.restore();
  }

  // Spawn ~80 fish proportional to count
  const sample = [];
  const totalToSample = 80;
  visData.forEach(v => {
    const n = Math.max(1, Math.round((v.count / TOTAL) * totalToSample));
    for (let i = 0; i < n; i++) {
      sample.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.2,
        shape: v.shape,
        color: v.color,
        naam: v.naam,
        size: v.shape === 'tiny' ? 0.6 : v.shape === 'long' ? 1.2 : 0.9,
        wig: Math.random() * Math.PI * 2,
        visible: true
      });
    }
  });

  // Filter chips
  const filtersHost = $('#aquariumFilters');
  visData.forEach(v => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'filter-chip';
    chip.style.color = v.color;
    chip.setAttribute('aria-pressed', 'true');
    chip.dataset.naam = v.naam;
    chip.textContent = v.naam;
    chip.addEventListener('click', () => {
      const muted = chip.classList.toggle('muted');
      chip.setAttribute('aria-pressed', String(!muted));
      sample.forEach(f => { if (f.naam === v.naam) f.visible = !muted; });
    });
    filtersHost.appendChild(chip);
  });

  // Click to scatter
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * 100;
    const py = (e.clientY - rect.top) / rect.height * 100;
    sample.forEach(f => {
      const dx = f.x - px;
      const dy = f.y - py;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 35) {
        const k = (35 - dist) / 35;
        f.vx += (dx / Math.max(0.1, dist)) * k * 2.5;
        f.vy += (dy / Math.max(0.1, dist)) * k * 1.6;
      }
    });
    // Scatter ripple
    const rip = document.createElement('div');
    rip.style.cssText = `
      position: absolute;
      left: ${e.clientX - rect.left}px;
      top: ${e.clientY - rect.top}px;
      width: 8px; height: 8px;
      border: 2px solid var(--foam);
      border-radius: 50%;
      opacity: 0.7;
      transform: translate(-50%, -50%);
      pointer-events: none;
      animation: aquarium-rip 0.9s ease-out forwards;
    `;
    canvas.parentElement.appendChild(rip);
    setTimeout(() => rip.remove(), 950);
  });

  // Hover: find closest fish + show tooltip
  let hoverTimer = 0;
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * 100;
    const py = (e.clientY - rect.top) / rect.height * 100;
    let closest = null;
    let closestDist = 4;
    sample.forEach(f => {
      if (!f.visible) return;
      const dx = f.x - px;
      const dy = f.y - py;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < closestDist) { closestDist = d; closest = f; }
    });
    if (closest) {
      canvas.style.cursor = 'pointer';
      showTooltip(`<strong>${closest.naam}</strong>klik om alle vissen te laten schrikken`, e.clientX, e.clientY);
    } else {
      canvas.style.cursor = 'crosshair';
      hideTooltip();
    }
  });
  canvas.addEventListener('mouseleave', () => hideTooltip());

  let count = 0;
  let running = false;
  let raf = 0;

  function tick() {
    ctx.clearRect(0, 0, W, H);
    // Subtle backlight
    const grd = ctx.createRadialGradient(W/2, H/2, 30, W/2, H/2, Math.max(W, H));
    grd.addColorStop(0, 'rgba(126, 200, 227, 0.08)');
    grd.addColorStop(1, 'rgba(126, 200, 227, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    sample.forEach(f => {
      f.x += f.vx;
      f.y += f.vy + Math.sin(f.wig) * 0.04;
      f.wig += 0.08;
      // gentle steering toward center
      const dx = 50 - f.x, dy = 50 - f.y;
      f.vx += dx * 0.00006;
      f.vy += dy * 0.00006;
      f.vx += (Math.random() - 0.5) * 0.01;
      f.vy += (Math.random() - 0.5) * 0.006;
      // friction
      f.vx *= 0.992; f.vy *= 0.992;
      // wrap
      if (f.x < -5) f.x = 105; if (f.x > 105) f.x = -5;
      if (f.y < -5) f.y = 105; if (f.y > 105) f.y = -5;

      if (!f.visible) return;

      const sprite = makeSprite(f.shape, f.color);
      const px = (f.x / 100) * W;
      const py = (f.y / 100) * H;
      const angle = Math.atan2(f.vy, f.vx);
      const flip = Math.abs(angle) > Math.PI/2 ? -1 : 1;
      const tilt = angle * (flip < 0 ? -1 : 1);
      const sw = sprite.width / dpr * f.size;
      const sh = sprite.height / dpr * f.size;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(tilt);
      ctx.scale(1, flip);
      ctx.globalAlpha = 0.92;
      ctx.drawImage(sprite, -sw/2, -sh/2, sw, sh);
      ctx.restore();
    });

    if (running) raf = requestAnimationFrame(tick);
  }

  // Counter animation
  let counterRaf = 0;
  function animateCounter() {
    const start = performance.now();
    const dur = 3800;
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      count = Math.round(eased * TOTAL);
      counter.textContent = `${fmt(count)} / ${fmt(TOTAL)}`;
      if (t < 1) counterRaf = requestAnimationFrame(step);
    }
    counterRaf = requestAnimationFrame(step);
  }

  const obs = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!running && !reduceMotion) { running = true; tick(); }
      if (!counter.dataset.animated) {
        counter.dataset.animated = '1';
        animateCounter();
      }
      if (reduceMotion) { tick(); /* one frame */ }
    } else {
      running = false;
      cancelAnimationFrame(raf);
    }
  }, { threshold: 0.1 });
  obs.observe(canvas);
};

/* =========================================================
   CHAPTER 7 — FLOW (canvas stream)
   ========================================================= */
chapterInit['ch-flow'] = (el) => {
  const canvas = $('#flowCanvas');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = window.devicePixelRatio || 1;
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // lanes proportional to count
  const lanes = visData.map(v => ({...v, fishCount: Math.max(2, Math.round(v.count / 70))}));
  const total = lanes.reduce((s, l) => s + l.fishCount, 0);
  let yOff = 0;
  lanes.forEach((l) => {
    l.yStart = yOff;
    l.yEnd = yOff + l.fishCount / total;
    yOff = l.yEnd;
  });

  const particles = [];
  lanes.forEach(l => {
    for (let i = 0; i < l.fishCount; i++) {
      particles.push({
        x: Math.random() * 110 - 5,
        baseY: l.yStart + Math.random() * (l.yEnd - l.yStart),
        speed: 0.06 + Math.random() * 0.18,
        amp: 1 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2,
        freq: 0.012 + Math.random() * 0.02,
        shape: l.shape,
        color: l.color,
        size: l.shape === 'tiny' ? 0.55 : l.shape === 'long' ? 1.1 : 0.85
      });
    }
  });

  let t = 0;
  let running = false;
  let raf = 0;

  function tick() {
    ctx.clearRect(0, 0, W, H);
    // subtle horizontal current bands
    for (let i = 0; i < 8; i++) {
      const y = (i / 8 + Math.sin(t * 0.002 + i) * 0.005) * H;
      ctx.strokeStyle = `rgba(126,200,227,${0.04 + Math.sin(t*0.003 + i)*0.02})`;
      ctx.beginPath();
      for (let x = 0; x < W; x += 12) {
        const yy = y + Math.sin(x * 0.008 + t * 0.004 + i) * 3;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    particles.forEach(p => {
      p.x += p.speed;
      if (p.x > 110) p.x = -10;
      const y = (p.baseY * H) + Math.sin(p.x * p.freq * 100 + p.phase + t * 0.004) * p.amp * 6;
      const x = (p.x / 100) * W;
      const angle = Math.cos(p.x * p.freq * 100 + p.phase + t * 0.004) * 0.25;
      const w = (p.shape === 'long' ? 38 : p.shape === 'tiny' ? 22 : 30) * p.size;
      const h = (p.shape === 'long' ? 9 : p.shape === 'tiny' ? 8 : 14) * p.size;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.82;
      drawFishSimple(ctx, p.shape, w, h);
      ctx.restore();
    });

    t++;
    if (running) raf = requestAnimationFrame(tick);
  }

  function drawFishSimple(cx, shape, w, h) {
    cx.beginPath();
    cx.moveTo(-w*0.4, 0);
    cx.quadraticCurveTo(-w*0.5, -h*0.6, -w*0.2, -h*0.6);
    cx.quadraticCurveTo(w*0.2, -h*0.7, w*0.32, -h*0.2);
    cx.lineTo(w*0.5, -h*0.6);
    cx.lineTo(w*0.5, 0);
    cx.lineTo(w*0.5, h*0.6);
    cx.lineTo(w*0.32, h*0.2);
    cx.quadraticCurveTo(w*0.2, h*0.7, -w*0.2, h*0.6);
    cx.quadraticCurveTo(-w*0.5, h*0.6, -w*0.4, 0);
    cx.fill();
  }

  const obs = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !reduceMotion) {
      if (!running) { running = true; tick(); }
    } else {
      running = false;
      cancelAnimationFrame(raf);
      if (reduceMotion) tick();
    }
  }, { threshold: 0.05 });
  obs.observe(canvas);
};

/* =========================================================
   CHAPTER 8 — RING CALENDAR (365 dots)
   ========================================================= */
chapterInit['ch-ring'] = (el) => {
  const host = $('#ringStage');
  const W = 680, H = 680;
  const cx = W/2, cy = H/2;
  const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

  const innerR = 130;
  const outerR = 290;
  const maxV = Math.max(...dailyTotals);
  const monthStart = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const months = ['JAN','FEB','MRT','APR','MEI','JUN','JUL','AUG','SEP','OKT','NOV','DEC'];

  // Month labels
  months.forEach((m, i) => {
    const a = (monthStart[i] / 365) * Math.PI * 2 + (15 / 365) * Math.PI * 2 - Math.PI/2;
    const lr = outerR + 22;
    const lx = cx + Math.cos(a) * lr;
    const ly = cy + Math.sin(a) * lr;
    svg.append('text').attr('x', lx).attr('y', ly + 4)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', 11)
      .attr('letter-spacing', '0.15em')
      .attr('fill', (i >= 2 && i <= 6) ? '#f4c560' : '#7ec8e3')
      .attr('opacity', (i >= 2 && i <= 6) ? 0.9 : 0.55)
      .text(m);
  });

  // Month dividers
  months.forEach((_, i) => {
    const a = (monthStart[i] / 365) * Math.PI * 2 - Math.PI/2;
    svg.append('line')
      .attr('x1', cx + Math.cos(a) * (innerR - 10))
      .attr('y1', cy + Math.sin(a) * (innerR - 10))
      .attr('x2', cx + Math.cos(a) * (outerR + 10))
      .attr('y2', cy + Math.sin(a) * (outerR + 10))
      .attr('stroke', 'rgba(126,200,227,0.08)');
  });

  // Center text
  svg.append('text').attr('x', cx).attr('y', cy - 12).attr('text-anchor', 'middle')
    .attr('font-family', 'Fraunces, serif').attr('font-style', 'italic').attr('font-size', 38)
    .attr('fill', '#7ec8e3').text(fmt(TOTAL));
  svg.append('text').attr('x', cx).attr('y', cy + 12).attr('text-anchor', 'middle')
    .attr('font-family', 'DM Mono, monospace').attr('font-size', 11).attr('letter-spacing', '0.18em')
    .attr('fill', '#7ec8e3').attr('opacity', 0.65).text('TOTAAL BELDRUKKEN');

  // Date helper
  function dayToDateString(d) {
    const base = new Date(2026, 0, 1);
    base.setDate(base.getDate() + d);
    const dd = String(base.getDate()).padStart(2, '0');
    const monthNames = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
    return `${dd} ${monthNames[base.getMonth()]}`;
  }

  // Dots
  const dots = svg.append('g');
  for (let d = 0; d < 365; d++) {
    const a = (d / 365) * Math.PI * 2 - Math.PI/2;
    const norm = dailyTotals[d] / maxV;
    const r = innerR + 50 + norm * (outerR - innerR - 60);
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    const radius = 1.4 + norm * 6;
    const opacity = 0.18 + norm * 0.8;
    const color = norm > 0.6 ? '#f4c560' : norm > 0.25 ? '#7ec8e3' : '#4a9ab8';
    const dot = dots.append('circle')
      .attr('class', 'ring-dot')
      .attr('cx', px).attr('cy', py).attr('r', 0)
      .attr('fill', color).attr('opacity', opacity)
      .attr('data-day', d)
      .attr('tabindex', dailyTotals[d] > 0 ? 0 : -1);
    dot.transition().delay(d * 4).duration(300).attr('r', radius);

    if (dailyTotals[d] > 0) {
      const dateStr = dayToDateString(d);
      const cnt = dailyTotals[d];
      dot.on('mouseenter', (e) => {
        showTooltip(`<strong>${dateStr}</strong>${fmt(cnt)} ${cnt === 1 ? 'belroep' : 'belroepen'}`, e.clientX, e.clientY);
      }).on('mousemove', (e) => {
        showTooltip(`<strong>${dateStr}</strong>${fmt(cnt)} ${cnt === 1 ? 'belroep' : 'belroepen'}`, e.clientX, e.clientY);
      }).on('mouseleave', () => hideTooltip())
        .on('focus', () => {
          const node = dot.node();
          const bbox = node.getBoundingClientRect();
          showTooltip(`<strong>${dateStr}</strong>${fmt(cnt)} ${cnt === 1 ? 'belroep' : 'belroepen'}`, bbox.left + bbox.width/2, bbox.top);
        })
        .on('blur', () => hideTooltip());
    }
  }

  // Inner ring
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', innerR + 40)
    .attr('fill', 'none').attr('stroke', 'rgba(126,200,227,0.1)').attr('stroke-dasharray', '2 5');
};

/* =========================================================
   CHAPTER 9 — RADAR
   ========================================================= */
chapterInit['ch-radar'] = (el) => {
  const host = $('#radarStage');
  const W = 620, H = 620;
  const cx = W/2, cy = H/2;
  const R = 270;
  const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

  // Rings
  for (let i = 1; i <= 4; i++) {
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R * i / 4)
      .attr('fill', 'none').attr('stroke', 'rgba(126,200,227,0.1)').attr('stroke-dasharray', '2 6');
  }
  // Crosshairs
  svg.append('line').attr('x1', cx - R).attr('y1', cy).attr('x2', cx + R).attr('y2', cy)
    .attr('stroke', 'rgba(126,200,227,0.08)');
  svg.append('line').attr('x1', cx).attr('y1', cy - R).attr('x2', cx).attr('y2', cy + R)
    .attr('stroke', 'rgba(126,200,227,0.08)');

  // Pings (one per species, placed by count)
  const pingSeed = mulberry32(42);
  const pings = visData.map((v, i) => {
    const angle = pingSeed() * Math.PI * 2;
    const distance = 60 + pingSeed() * (R - 70);
    return {
      ...v,
      angle,
      distance,
      x: cx + Math.cos(angle) * distance,
      y: cy + Math.sin(angle) * distance
    };
  });

  // Radar sweep gradient
  const sweepGrad = svg.append('defs').append('linearGradient')
    .attr('id', 'radarSweep')
    .attr('x1', 0).attr('y1', 0).attr('x2', 1).attr('y2', 0);
  sweepGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(126,200,227,0.0)');
  sweepGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(126,200,227,0.5)');

  const sweep = svg.append('path')
    .attr('d', `M ${cx} ${cy} L ${cx + R} ${cy} A ${R} ${R} 0 0 0 ${cx + Math.cos(-Math.PI/4) * R} ${cy + Math.sin(-Math.PI/4) * R} Z`)
    .attr('fill', 'url(#radarSweep)')
    .attr('opacity', 0.6);

  // Center dot
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 5).attr('fill', '#f4c560');

  // Render pings (initially hidden)
  const detailPanel = $('#radarDetail');
  const pingsGroup = svg.append('g');
  pings.forEach((p, i) => {
    const g = pingsGroup.append('g')
      .attr('class', 'radar-ping')
      .attr('data-naam', p.naam)
      .attr('transform', `translate(${p.x}, ${p.y})`)
      .attr('opacity', 0)
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', `${p.naam}: ${fmt(p.count)} waarnemingen`);
    g.append('circle').attr('class', 'radar-ping-bg').attr('r', 18).attr('fill', p.color).attr('opacity', 0.18);
    g.append('circle').attr('r', 8).attr('fill', p.color).attr('opacity', 0.6);
    g.append('g').attr('class', 'fish-wiggle').style('color', p.color)
      .html(`<use href="#${fishSymbolId(p.shape)}" x="-22" y="-9" width="44" height="18"/>`);
    g.append('text')
      .attr('x', p.x > cx ? 26 : -26)
      .attr('y', 4)
      .attr('text-anchor', p.x > cx ? 'start' : 'end')
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', 11)
      .attr('fill', '#7ec8e3')
      .attr('opacity', 0.85)
      .text(`${p.naam.toUpperCase()} · ${fmt(p.count)}`);

    const showDetail = () => {
      pingsGroup.selectAll('.radar-ping').classed('selected', false);
      g.classed('selected', true);
      const peakMonth = MONTH_FULL[p.monthly.indexOf(Math.max(...p.monthly))];
      detailPanel.innerHTML = `
        <strong>${p.naam}</strong>
        ${fmt(p.count)} waarnemingen<br/>
        Piek: ${peakMonth}<br/>
        Diepte: ${p.diepte}<br/>
        Gewicht: ~${p.weight} kg
      `;
      detailPanel.classList.add('visible');
    };
    g.on('click', showDetail);
    g.on('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDetail(); }
    });
    p.elem = g;
  });

  let angle = -Math.PI/2;
  let raf = 0;
  let running = false;
  let revealed = new Set();

  function tick() {
    angle += reduceMotion ? 0.03 : 0.01;
    sweep.attr('transform', `rotate(${(angle * 180 / Math.PI)} ${cx} ${cy})`);
    pings.forEach((p, i) => {
      const da = (Math.atan2(p.y - cy, p.x - cx) - angle + Math.PI * 4) % (Math.PI * 2);
      if (!revealed.has(i) && da < 0.18) {
        revealed.add(i);
        p.elem.transition().duration(300).attr('opacity', 1);
      }
    });
    if (revealed.size === pings.length) {
      // fade-out sweep slightly to focus on labels
    }
    if (running) raf = requestAnimationFrame(tick);
  }

  const obs = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!running) { running = true; tick(); }
    } else {
      running = false; cancelAnimationFrame(raf);
    }
  }, { threshold: 0.2 });
  obs.observe(host);
};

/* =========================================================
   CHAPTER 10 — HABITAT LANDSCAPE
   ========================================================= */
chapterInit['ch-habitat'] = (el) => {
  const host = $('#habitatStage');
  const tip = $('#habitatTooltip');
  const W = 1100, H = 618;
  const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

  // Water gradient bg
  const bgGrad = svg.append('defs').append('linearGradient').attr('id', 'habBg').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1);
  bgGrad.append('stop').attr('offset', '0%').attr('stop-color', '#0d2e4f');
  bgGrad.append('stop').attr('offset', '100%').attr('stop-color', '#051321');
  svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'url(#habBg)');

  // Sun rays
  for (let i = 0; i < 4; i++) {
    const x = 100 + i * 280;
    svg.append('polygon')
      .attr('points', `${x},0 ${x-30},${H} ${x+50},${H} ${x+30},0`)
      .attr('fill', 'rgba(244,197,96,0.05)');
  }

  // Sandy bottom curve
  const bottomY = H - 80;
  svg.append('path')
    .attr('d', `M 0 ${bottomY} C ${W*0.25} ${bottomY - 40}, ${W*0.5} ${bottomY + 20}, ${W*0.75} ${bottomY - 20}, ${W} ${bottomY + 10}, ${W} ${H} L 0 ${H} Z`)
    .attr('fill', '#1a2c1a').attr('opacity', 0.85);
  svg.append('path')
    .attr('d', `M 0 ${bottomY+10} C ${W*0.25} ${bottomY - 30}, ${W*0.5} ${bottomY + 30}, ${W*0.75} ${bottomY - 10}, ${W} ${bottomY + 20}, ${W} ${H} L 0 ${H} Z`)
    .attr('fill', '#0f1f10');

  // Habitat zones definition (data-driven)
  const zones = [
    { id: 'riet',      x: 120,  y: 60,  w: 230, h: 480, name: 'Rietkraag',   species: ['Snoek', 'Ruisvoorn'],
      decorate: (g, x, y, w, h) => {
        // Reed stalks
        for (let i = 0; i < 14; i++) {
          const rx = x + 20 + (i * (w - 40) / 14);
          const sway = Math.sin(i) * 12;
          g.append('path')
            .attr('d', `M ${rx} ${y + h} Q ${rx + sway} ${y + h * 0.55}, ${rx + sway * 0.5} ${y + 80}`)
            .attr('stroke', '#5a8a3f').attr('stroke-width', 2 + Math.random()).attr('fill', 'none').attr('opacity', 0.75);
          // Reed tip
          g.append('ellipse').attr('cx', rx + sway * 0.5).attr('cy', y + 80).attr('rx', 2).attr('ry', 14)
            .attr('fill', '#7c9a4f').attr('opacity', 0.75);
        }
      }
    },
    { id: 'zand', x: 380,  y: bottomY - 30, w: 360, h: 110, name: 'Zandbodem', species: ['Brasem', 'Kolblei'],
      decorate: (g, x, y, w, h) => {
        g.append('ellipse').attr('cx', x + w/2).attr('cy', y + 25).attr('rx', w/2.2).attr('ry', 22)
          .attr('fill', '#c8ad7a').attr('opacity', 0.55);
      }
    },
    { id: 'steen', x: 770, y: bottomY - 50, w: 290, h: 130, name: 'Stenen oever', species: ['Paling', 'Meerval'],
      decorate: (g, x, y, w, h) => {
        // Stones cluster
        [[40,90,50,30],[110,70,70,45],[200,95,40,28],[240,80,55,38]].forEach(([dx, dy, rw, rh]) => {
          g.append('ellipse').attr('cx', x + dx).attr('cy', y + dy).attr('rx', rw).attr('ry', rh)
            .attr('fill', '#2c2e36').attr('opacity', 0.9);
          g.append('ellipse').attr('cx', x + dx - rw*0.25).attr('cy', y + dy - rh*0.4).attr('rx', rw*0.45).attr('ry', rh*0.3)
            .attr('fill', '#43484f').attr('opacity', 0.7);
        });
      }
    },
    { id: 'open', x: 380, y: 80, w: 480, h: 320, name: 'Open water', species: ['Baars', 'Snoekbaars', 'Blankvoorn'],
      decorate: (g) => {}
    },
    { id: 'oppervlak', x: 60, y: 30, w: 1000, h: 80, name: 'Oppervlak', species: ['Alver'],
      decorate: (g, x, y, w, h) => {
        // Surface ripples
        for (let i = 0; i < 8; i++) {
          const rx = x + Math.random() * w;
          const ry = y + Math.random() * h * 0.7;
          g.append('path').attr('d', `M ${rx} ${ry} q 12 -4 24 0`)
            .attr('stroke', 'rgba(126,200,227,0.4)').attr('stroke-width', 1).attr('fill', 'none');
        }
      }
    }
  ];

  // Render decorations
  zones.forEach(z => {
    z.decorate(svg, z.x, z.y, z.w, z.h);
  });

  // Place fish per zone
  zones.forEach(z => {
    const fishHere = visData.filter(v => z.species.includes(v.naam));
    const counts = fishHere.reduce((s, f) => s + f.count, 0);
    const g = svg.append('g').attr('class', 'habitat-zone').attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', `${z.name}: ${z.species.join(', ')}, samen ${fmt(counts)} waarnemingen`);
    // Invisible hover box
    g.append('rect').attr('x', z.x).attr('y', z.y).attr('width', z.w).attr('height', z.h)
      .attr('fill', 'transparent');

    fishHere.forEach((v, i) => {
      const n = Math.max(3, Math.min(12, Math.round(v.count / 90)));
      for (let k = 0; k < n; k++) {
        const px = z.x + 30 + Math.random() * (z.w - 60);
        const py = z.y + 30 + Math.random() * (z.h - 60);
        const scale = 0.7 + Math.random() * 0.4;
        const dir = Math.random() > 0.5 ? 1 : -1;
        g.append('g').attr('transform', `translate(${px}, ${py}) scale(${scale * dir}, ${scale})`)
          .attr('class', 'fish-wiggle-slow')
          .style('color', v.color).attr('opacity', 0.92)
          .html(`<use href="#${fishSymbolId(v.shape)}" x="-50" y="-20" width="100" height="40"/>`);
      }
    });

    g.on('mouseenter', (e) => {
      tip.style.opacity = '1';
      tip.innerHTML = `<strong style="color:${visData.find(v => v.naam === z.species[0]).color}">${z.name}</strong><br/>${z.species.join(' · ')}<br/>${fmt(counts)} waarnemingen`;
    }).on('mousemove', (e) => {
      const rect = host.getBoundingClientRect();
      tip.style.left = (e.clientX - rect.left) + 'px';
      tip.style.top = (e.clientY - rect.top) + 'px';
    }).on('mouseleave', () => {
      tip.style.opacity = '0';
    }).on('focus', (e) => {
      tip.style.opacity = '1';
      tip.innerHTML = `<strong>${z.name}</strong><br/>${z.species.join(' · ')}<br/>${fmt(counts)} waarnemingen`;
      const bbox = e.currentTarget.getBoundingClientRect();
      const rect = host.getBoundingClientRect();
      tip.style.left = (bbox.left + bbox.width/2 - rect.left) + 'px';
      tip.style.top = (bbox.top - rect.top + 10) + 'px';
    }).on('blur', () => {
      tip.style.opacity = '0';
    });
  });
};

/* =========================================================
   CHAPTER 11 — NET (bubble pack by weight × count)
   ========================================================= */
chapterInit['ch-net'] = (el) => {
  const host = $('#netStage');
  const info = $('#netInfo');
  const W = 900, H = 680;
  const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

  // The net descending from top
  const netGroup = svg.append('g').attr('transform', 'translate(0, -200)');
  // Net mesh
  const meshTop = 0;
  const meshBot = 380;
  for (let i = 0; i <= 16; i++) {
    const x = (i / 16) * W;
    netGroup.append('path').attr('d', `M ${x} ${meshTop} Q ${x + Math.sin(i) * 12} ${meshTop + 200}, ${x + Math.sin(i+0.5) * 30} ${meshBot}`)
      .attr('class', 'net-rope');
  }
  for (let j = 0; j <= 8; j++) {
    const y = meshTop + (j / 8) * meshBot;
    const r = 8 + j * 2;
    netGroup.append('path').attr('d', `M 0 ${y} Q ${W/2} ${y + r}, ${W} ${y}`).attr('class', 'net-rope');
  }
  // Top rope
  netGroup.append('line').attr('x1', 0).attr('y1', 0).attr('x2', W).attr('y2', 0)
    .attr('stroke', 'rgba(239, 230, 210, 0.7)').attr('stroke-width', 2);

  netGroup.transition().delay(300).duration(1400).attr('transform', 'translate(0, 0)');

  // Pack bubbles — re-runnable with different stat
  const bubbleGroup = svg.append('g').attr('transform', 'translate(20, 80)');
  const defs = svg.append('defs');
  let currentStat = 'biomass';
  let bubbleNodes = [];

  const statFn = {
    count:   d => d.count,
    weight:  d => d.weight,
    biomass: d => d.count * d.weight
  };
  const statLabel = {
    count:   v => `${fmt(v.count)} waarnemingen`,
    weight:  v => `~${v.weight} kg per vis`,
    biomass: v => `${fmt(v.count * v.weight)} kg biomassa (${fmt(v.count)} × ${v.weight} kg)`
  };

  function renderPack(stat) {
    const packData = visData.map(v => ({...v, value: statFn[stat](v)}));
    const pack = d3.pack().size([W - 40, H - 100]).padding(8);
    const root = d3.hierarchy({children: packData}).sum(d => d.value);
    const nodes = pack(root).leaves();
    bubbleNodes = nodes;

    const sel = bubbleGroup.selectAll('.net-bubble').data(nodes, d => d.data.naam);

    // EXIT
    sel.exit().transition().duration(500).attr('transform', d => `translate(${d.x}, ${d.y}) scale(0)`).remove();

    // ENTER
    const enter = sel.enter().append('g')
      .attr('class', 'net-bubble')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('transform', d => `translate(${d.x}, ${d.y - 200}) scale(0)`);

    enter.each(function(d, i) {
      const g = d3.select(this);
      const gradId = `bubGrad-${d.data.naam.replace(/\W/g, '')}`;
      const grad = defs.append('radialGradient').attr('id', gradId).attr('cx', '35%').attr('cy', '30%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', '#fff').attr('stop-opacity', 0.7);
      grad.append('stop').attr('offset', '50%').attr('stop-color', d.data.color).attr('stop-opacity', 0.55);
      grad.append('stop').attr('offset', '100%').attr('stop-color', d.data.color).attr('stop-opacity', 0.85);

      g.append('circle').attr('class', 'bub-main').attr('r', d.r).attr('fill', `url(#${gradId})`)
        .attr('stroke', 'rgba(255,255,255,0.3)').attr('stroke-width', 1);
      g.append('circle').attr('class', 'bub-shine').attr('cx', -d.r*0.3).attr('cy', -d.r*0.3).attr('r', d.r*0.25)
        .attr('fill', 'rgba(255,255,255,0.45)');

      const fishSize = Math.min(d.r * 1.4, 96);
      g.append('g').attr('class', 'bub-fish').style('color', d.data.color)
        .html(`<use href="#${fishSymbolId(d.data.shape)}" x="${-fishSize/2}" y="${-fishSize/4}" width="${fishSize}" height="${fishSize/2.5}"/>`);
      g.append('text').attr('class', 'bub-label').attr('text-anchor', 'middle').attr('y', d.r * 0.55)
        .attr('font-family', 'Fraunces, serif').attr('font-style', 'italic')
        .attr('font-size', Math.min(d.r * 0.32, 18))
        .attr('fill', '#fff').attr('opacity', d.r > 28 ? 0.9 : 0)
        .text(d.data.naam);

      g.attr('aria-label', `${d.data.naam}: ${statLabel[stat](d.data)}`);

      g.on('click', () => {
        info.textContent = `${d.data.naam} — ${statLabel[stat](d.data)}.`;
      }).on('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          info.textContent = `${d.data.naam} — ${statLabel[stat](d.data)}.`;
        }
      }).on('mouseenter', () => {
        info.textContent = `${d.data.naam}: ${statLabel[stat](d.data)}.`;
      });
    });

    enter.transition().delay((d, i) => 200 + i * 70).duration(900).ease(d3.easeCubicOut)
      .attr('transform', d => `translate(${d.x}, ${d.y}) scale(1)`);

    // UPDATE
    sel.transition().duration(800).ease(d3.easeCubicInOut)
      .attr('transform', d => `translate(${d.x}, ${d.y}) scale(1)`);
    sel.each(function(d) {
      const g = d3.select(this);
      const fishSize = Math.min(d.r * 1.4, 96);
      g.select('.bub-main').transition().duration(800).attr('r', d.r);
      g.select('.bub-shine').transition().duration(800).attr('cx', -d.r*0.3).attr('cy', -d.r*0.3).attr('r', d.r*0.25);
      g.select('.bub-fish').html(`<use href="#${fishSymbolId(d.data.shape)}" x="${-fishSize/2}" y="${-fishSize/4}" width="${fishSize}" height="${fishSize/2.5}"/>`);
      g.select('.bub-label').transition().duration(800)
        .attr('y', d.r * 0.55)
        .attr('font-size', Math.min(d.r * 0.32, 18))
        .attr('opacity', d.r > 28 ? 0.9 : 0);
      g.attr('aria-label', `${d.data.naam}: ${statLabel[stat](d.data)}`);
      g.on('click', () => { info.textContent = `${d.data.naam} — ${statLabel[stat](d.data)}.`; });
      g.on('mouseenter', () => { info.textContent = `${d.data.naam}: ${statLabel[stat](d.data)}.`; });
    });
  }
  renderPack(currentStat);

  // Toggle buttons
  $$('.net-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const stat = btn.dataset.stat;
      if (stat === currentStat) return;
      currentStat = stat;
      $$('.net-toggle-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      });
      renderPack(stat);
      const explainer = {
        count: 'Verdeeld op aantal waarnemingen.',
        weight: 'Verdeeld op gemiddeld gewicht per vis.',
        biomass: 'Verdeeld op biomassa: aantal × gewicht.'
      };
      info.textContent = explainer[stat];
    });
  });
};

/* =========================================================
   CHAPTER 12 — JOURNAL
   ========================================================= */
chapterInit['ch-journal'] = (el) => {
  const grid = $('#journalGrid');
  const headlines = {
    Blankvoorn: 'Schoolvis in zilveren wolken — meest geziene gast bij de sluis.',
    Brasem:     'De zware bodemkenner. Stevig op leeftijd, stevig in aantal.',
    Baars:      'Streepjespakje. Verdedigt zijn plek met scherpe rugvin.',
    Snoekbaars: 'Het glanzende oog van het diepe — jagend bij schemering.',
    Paling:     'Slangenstaart op doorreis. Reist duizenden kilometers.',
    Kolblei:    'Het blije neefje van de brasem — kleiner, sneller, slimmer.',
    Alver:      'Glinsterend dakraam. Spettert weg bij de eerste beweging.',
    Ruisvoorn:  'Oranje vinnen, voorzichtig gemoed. Houdt van het riet.',
    Snoek:      'Tirannen met groene strepen. Lange jagers in het ondiep.',
    Winde:      'Stroomzoeker. Zwemt sneller door tegenwind dan eb.',
    Meerval:    'Het zwaarste verhaal van het seizoen. Schaars, indrukwekkend.'
  };
  const stories = {
    Blankvoorn: 'Blankvoorns zwemmen in scholen van honderden tegelijk — een wolk van zilver. Ze zijn de meest geziene vis bij de sluis, en daarmee een goede graadmeter voor de gezondheid van het water.',
    Brasem:     'Brasem leeft op de bodem en grasvinnen het slib af op zoek naar muggenlarven. Ouder dan tien jaar, soms wel twintig. Een oude brasem is een lokale ster.',
    Baars:      'Met zijn streperige pak en stekelige rugvin oogt de baars als een kleine warrior. Hij jaagt op alver en stekelbaars in heldere lagen middenwater.',
    Snoekbaars: 'Een nachtactieve roofvis met enorme ogen — ziet beter in troebel water dan de meeste anderen. Ooit voor de visserij uitgezet, nu vaste bewoner.',
    Paling:     'Geboren in de Sargasso Zee, duizenden kilometers verderop. Een paling die door de Weerdsluis trekt, is bijna klaar voor de reis terug om te paaien.',
    Kolblei:    'Lijkt sprekend op brasem, maar kleiner en levendiger. Vaak in gemengde scholen met blankvoorn — een combinatie die kenners herkennen aan de vinslag.',
    Alver:      'Klein, snel, glinsterend. Drukbevolkt langs het oppervlak waar muggen op het water vallen. Voer voor baars en snoek.',
    Ruisvoorn:  'Te herkennen aan de helderoranje vinnen. Zit het liefst tussen waterplanten en rietkragen — beschut, onzichtbaar van bovenaf.',
    Snoek:      'Liggend op de loer in het riet. Een grote snoek kan tot 1,3 meter lang worden. Bij de Weerdsluis vooral kleine exemplaren — een gezonde teken.',
    Winde:      'Houdt van stroming en kan zelfs sneller stroomopwaarts dan met de stroom mee. Hier in mei het meest gezien — terug naar de paaigronden.',
    Meerval:    'De grootste zoetwatervis van Nederland. Wat 80 kilo kunnen wegen. Slechts veertien keer gespot dit jaar — maar elke keer een gebeurtenis.'
  };
  visData.forEach(v => {
    const entry = document.createElement('article');
    entry.className = 'journal-entry';
    entry.tabIndex = 0;
    entry.setAttribute('role', 'button');
    entry.setAttribute('aria-expanded', 'false');
    entry.setAttribute('aria-label', `${v.naam}: klik om meer te lezen`);
    const monthly = v.monthly;
    const peakIdx = monthly.indexOf(Math.max(...monthly));
    const peakMonth = MONTH_FULL[peakIdx];
    entry.innerHTML = `
      <div class="journal-entry-svg" style="color: var(--ink)">
        <svg viewBox="-50 -22 100 44" preserveAspectRatio="xMidYMid meet">
          <use href="#${fishSymbolId(v.shape, true)}"/>
        </svg>
      </div>
      <h4 class="journal-name">${v.naam}</h4>
      <p class="journal-headline">${headlines[v.naam] || ''}</p>
      <div class="journal-extra">
        <p>${stories[v.naam] || ''}</p>
        <div class="journal-meta">
          <span>Piekmaand: ${peakMonth}</span>
          <span>Biomassa: ${fmt(v.count * v.weight)} kg</span>
        </div>
      </div>
      <dl class="journal-stats">
        <dt>Eerste waarneming</dt><dd>${FIRST_OBS[v.naam] || '—'}</dd>
        <dt>Totaal aantal</dt><dd>${fmt(v.count)}</dd>
        <dt>Gemiddeld gewicht</dt><dd>${v.weight} kg</dd>
        <dt>Diepte</dt><dd>${v.diepte}</dd>
      </dl>
    `;
    grid.appendChild(entry);
    const toggle = () => {
      const open = entry.classList.toggle('expanded');
      entry.setAttribute('aria-expanded', String(open));
    };
    entry.addEventListener('click', toggle);
    entry.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
};

/* =========================================================
   OBSERVE ALL CHAPTERS
   ========================================================= */
$$('.chapter').forEach(c => sectionObserver.observe(c));

/* Init bell total display */
$('#bellTotalNumber').textContent = fmt(TOTAL);
$('#bellCounter').textContent = `0 / ${fmt(TOTAL)} belroepen`;
$('#aquariumCounter').textContent = `1 / ${fmt(TOTAL)}`;

/* Build chapter navigation */
buildChapterNav();

/* Spawn bubbles after first paint */
requestAnimationFrame(() => spawnBackgroundBubbles());

