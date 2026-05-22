/* =========================================================
   DATA
   ========================================================= */
const visData = [
  { naam: 'Blankvoorn', count: 0, color: '#7ec8e3', weight: 0.3,  shape: 'round', diepte: 'mid',   habitat: 'open' },
  { naam: 'Brasem',     count: 0, color: '#5aafcf', weight: 1.8,  shape: 'round', diepte: 'bodem', habitat: 'zand' },
  { naam: 'Baars',      count: 0, color: '#4a9ab8', weight: 0.6,  shape: 'baars', diepte: 'mid',   habitat: 'open' },
  { naam: 'Snoekbaars', count: 0, color: '#3a8aa8', weight: 2.4,  shape: 'pred',  diepte: 'mid',   habitat: 'open' },
  { naam: 'Paling',     count: 0, color: '#2a7a98', weight: 0.5,  shape: 'long',  diepte: 'bodem', habitat: 'steen' },
  { naam: 'Kolblei',    count: 0, color: '#f4c560', weight: 0.4,  shape: 'round', diepte: 'mid',   habitat: 'zand' },
  { naam: 'Alver',      count: 0, color: '#e8b85a', weight: 0.08, shape: 'tiny',  diepte: 'top',   habitat: 'oppervlak' },
  { naam: 'Ruisvoorn',  count: 0, color: '#5a8a3f', weight: 0.35, shape: 'round', diepte: 'top',   habitat: 'riet' },
  { naam: 'Snoek',      count: 0, color: '#ff7849', weight: 3.2,  shape: 'pred',  diepte: 'mid',   habitat: 'riet' },
  { naam: 'Winde',      count: 0, color: '#c8a96e', weight: 0.8,  shape: 'baars', diepte: 'mid',   habitat: 'stroom' },
  { naam: 'Meerval',    count: 0, color: '#9b6bae', weight: 12.0, shape: 'long',  diepte: 'bodem', habitat: 'steen' },
  { naam: 'Karper',     count: 0, color: '#a07850', weight: 2.5,  shape: 'round', diepte: 'bodem', habitat: 'zand' },
];
let TOTAL = 0;
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

/* Daily counts (365 days starting Jan 1) */
let dailyTotals = new Array(365).fill(0);

/* Week/maand data — gevuld vanuit vis-data.json */
let weekHours     = [];
let weekDayLabels = [];
let periodLabel   = '';

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
  if (!nav) return;
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
    const past = diveEl ? diveEl.getBoundingClientRect().bottom < window.innerHeight * 0.5 : true;
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
   CHAPTER 8 — WEEK RING (9 dagen × 24 uur = 216 stippen)
   ========================================================= */
chapterInit['ch-ring'] = (el) => {
  const host = $('#ringStage');
  const W = 680, H = 680;
  const cx = W/2, cy = H/2;
  const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

  const DAYS  = weekDayLabels.length || 9;
  const SLOTS = DAYS * 24;            // 216 uur-stippen
  const data  = weekHours.length ? weekHours : new Array(SLOTS).fill(0);
  const maxV  = Math.max(...data, 1);
  const innerR = 130;
  const outerR = 290;

  // Dag-scheidingslijnen + labels
  for (let d = 0; d < DAYS; d++) {
    const aDivider = (d / DAYS) * Math.PI * 2 - Math.PI / 2;
    svg.append('line')
      .attr('x1', cx + Math.cos(aDivider) * (innerR - 10))
      .attr('y1', cy + Math.sin(aDivider) * (innerR - 10))
      .attr('x2', cx + Math.cos(aDivider) * (outerR + 10))
      .attr('y2', cy + Math.sin(aDivider) * (outerR + 10))
      .attr('stroke', 'rgba(1,70,60,0.2)').attr('stroke-dasharray', '3 4');

    const aLabel = ((d + 0.5) / DAYS) * Math.PI * 2 - Math.PI / 2;
    const lr = outerR + 24;
    svg.append('text')
      .attr('x', cx + Math.cos(aLabel) * lr)
      .attr('y', cy + Math.sin(aLabel) * lr + 4)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', 13)
      .attr('letter-spacing', '0.12em')
      .attr('fill', d >= 1 && d <= 7 ? '#6941c6' : '#01463c')
      .attr('opacity', 0.85)
      .text((weekDayLabels[d] || '').toUpperCase());
  }

  // Dag-nacht ring (binnenzijde): grijze band voor nachturen 21-05
  for (let d = 0; d < DAYS; d++) {
    const nightStart = (d * 24 + 21) / SLOTS * Math.PI * 2 - Math.PI / 2;
    const nightEnd   = (d * 24 + 29) / SLOTS * Math.PI * 2 - Math.PI / 2; // +8 uur = 05:00
    const arc = d3.arc()
      .innerRadius(innerR - 8).outerRadius(innerR)
      .startAngle(nightStart).endAngle(nightEnd);
    svg.append('path').attr('d', arc()).attr('transform', `translate(${cx},${cy})`)
      .attr('fill', 'rgba(1,70,60,0.08)');
  }

  // Middelste tekst
  svg.append('text').attr('x', cx).attr('y', cy - 14).attr('text-anchor', 'middle')
    .attr('font-family', 'Fraunces, serif').attr('font-style', 'italic').attr('font-size', 52)
    .attr('fill', '#01463c').text(fmt(TOTAL));
  svg.append('text').attr('x', cx).attr('y', cy + 18).attr('text-anchor', 'middle')
    .attr('font-family', 'DM Mono, monospace').attr('font-size', 13).attr('letter-spacing', '0.18em')
    .attr('fill', '#01463c').attr('opacity', 0.6).text('BELROEPEN');
  svg.append('text').attr('x', cx).attr('y', cy + 36).attr('text-anchor', 'middle')
    .attr('font-family', 'DM Mono, monospace').attr('font-size', 12).attr('letter-spacing', '0.12em')
    .attr('fill', '#6941c6').attr('opacity', 0.9).text(periodLabel || '18 APR – 18 MEI 2026');

  // Uur-stippen
  const dots = svg.append('g');
  for (let i = 0; i < SLOTS; i++) {
    const cnt  = data[i] || 0;
    const norm = cnt / maxV;
    const a    = (i / SLOTS) * Math.PI * 2 - Math.PI / 2;
    const r    = innerR + 14 + norm * (outerR - innerR - 20);
    const px   = cx + Math.cos(a) * r;
    const py   = cy + Math.sin(a) * r;
    const radius  = 1.2 + norm * 5.5;
    const opacity = cnt > 0 ? 0.25 + norm * 0.75 : 0.08;
    const color   = norm > 0.65 ? '#6941c6' : norm > 0.25 ? '#01463c' : 'rgba(1,70,60,0.35)';

    const dot = dots.append('circle')
      .attr('class', 'ring-dot')
      .attr('cx', px).attr('cy', py).attr('r', 0)
      .attr('fill', color).attr('opacity', opacity)
      .attr('tabindex', cnt > 0 ? 0 : -1);
    dot.transition().delay(i * 2).duration(250).attr('r', radius);

    if (cnt > 0) {
      const dayIdx  = Math.floor(i / 24);
      const hour    = i % 24;
      const label   = weekDayLabels[dayIdx] || '';
      const tooltip = `<strong>${label} ${String(hour).padStart(2,'0')}:00</strong>${fmt(cnt)} belroepen`;
      dot.on('mouseenter', (e) => showTooltip(tooltip, e.clientX, e.clientY))
         .on('mousemove',  (e) => showTooltip(tooltip, e.clientX, e.clientY))
         .on('mouseleave', () => hideTooltip())
         .on('focus', () => {
           const bb = dot.node().getBoundingClientRect();
           showTooltip(tooltip, bb.left + bb.width / 2, bb.top);
         })
         .on('blur', () => hideTooltip());
    }
  }

  // Binnenring
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', innerR + 8)
    .attr('fill', 'none').attr('stroke', 'rgba(1,70,60,0.15)').attr('stroke-dasharray', '2 5');
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
      .attr('fill', 'none').attr('stroke', 'rgba(248,231,205,0.1)').attr('stroke-dasharray', '2 6');
  }
  // Crosshairs
  svg.append('line').attr('x1', cx - R).attr('y1', cy).attr('x2', cx + R).attr('y2', cy)
    .attr('stroke', 'rgba(248,231,205,0.08)');
  svg.append('line').attr('x1', cx).attr('y1', cy - R).attr('x2', cx).attr('y2', cy + R)
    .attr('stroke', 'rgba(248,231,205,0.08)');

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
  sweepGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(192,168,255,0.0)');
  sweepGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(192,168,255,0.5)');

  const sweep = svg.append('path')
    .attr('d', `M ${cx} ${cy} L ${cx + R} ${cy} A ${R} ${R} 0 0 0 ${cx + Math.cos(-Math.PI/4) * R} ${cy + Math.sin(-Math.PI/4) * R} Z`)
    .attr('fill', 'url(#radarSweep)')
    .attr('opacity', 0.6);

  // Center dot
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 5).attr('fill', '#c0a8ff');

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
      .attr('fill', '#f8e7cd')
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
   BOOT — laad echte data, start daarna alle hoofdstukken
   ========================================================= */
async function boot() {
  try {
    const res  = await fetch('json/vis-data.json');
    const live = await res.json();

    /* Vul counts in vanuit de echte data */
    Object.entries(live.species).forEach(([naam, count]) => {
      const v = visData.find(d => d.naam === naam);
      if (v) v.count = count;
    });

    /* Herbereken totaal en maandverdeling */
    TOTAL = visData.reduce((s, v) => s + v.count, 0);
    visData.forEach(v => { v.monthly = generateMonthly(v.count); });

    /* Zet echte dagcijfers in de kalender (rest blijft 0) */
    Object.entries(live.daily).forEach(([doy, n]) => {
      dailyTotals[+doy] = n;
    });

    /* Week/maand-uurdata voor ringkalender */
    if (live.weekHours)     weekHours     = live.weekHours;
    if (live.weekDayLabels) weekDayLabels = live.weekDayLabels;
    if (live.period?.label) periodLabel   = live.period.label.toUpperCase();

  } catch (e) {
    console.warn('vis-data.json niet geladen, gebruik gegenereerde data', e);
    TOTAL = visData.reduce((s, v) => s + v.count, 0);
    visData.forEach(v => { v.monthly = generateMonthly(v.count); });
  }

  /* Sorteer visData op count zodat grafieken kloppen */
  visData.sort((a, b) => b.count - a.count);

  /* Init statische teksten — elementen kunnen ontbreken als hun chapter uit staat */
  const elBellTotal   = $('#bellTotalNumber');
  const elBellCounter = $('#bellCounter');
  const elAqCounter   = $('#aquariumCounter');
  if (elBellTotal)   elBellTotal.textContent   = fmt(TOTAL);
  if (elBellCounter) elBellCounter.textContent = `0 / ${fmt(TOTAL)} belroepen`;
  if (elAqCounter)   elAqCounter.textContent   = `1 / ${fmt(TOTAL)}`;

  /* Start hoofdstukobserver en navigatie */
  $$('.chapter').forEach(c => sectionObserver.observe(c));
  buildChapterNav();
  requestAnimationFrame(() => spawnBackgroundBubbles());
}

boot();

