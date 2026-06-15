import * as d3 from 'd3';
import { COLORS, FONT_BODY, FONT_DISPLAY, GREETINGS } from '../constants.js';
import { $, formatNumber, reduceMotion } from '../utils.js';
import { showTooltip, hideTooltip } from '../tooltip.js';
import { state, lifecycle, raf } from '../state.js';

// ============================================================================
// languages.js — drijvende begroetingen per taal. Elke taal is een woord;
// de lettergrootte staat voor het aantal bezoekers. Een d3-force-simulatie
// duwt de woorden netjes uit elkaar (geen overlap) en daarna dobberen ze zacht.
// ============================================================================

// ── Instelbare waarden ──────────────────────────────────────────────────────
const MAX_LANGUAGES = 24;      // hoeveel talen we tonen (drukste eerst)
const FONT_MIN = 15, FONT_MAX = 70; // kleinste/grootste woord in px
const PULL_TO_CENTER_X = 0.04; // hoe sterk woorden naar het midden trekken (horizontaal)
const PULL_TO_CENTER_Y = 0.06; // idem verticaal
const REPEL = -4;              // hoe sterk woorden elkaar afstoten
const SETTLE_TICKS = 220;      // rekenstappen vooraf als animaties uit staan
const BOB_RADIUS = 5;          // hoeveel px de woorden rondjes dobberen

const W = 900, H = 540, cx = W / 2, cy = H / 2;

export function initLanguages() {
  const { languagesData } = state;
  const { cleanups } = lifecycle;
  const stage = $('#langStage');

  const words = makeWords(languagesData);
  if (!words.length) { stage.innerHTML = '<p class="stage-fallback">Geen taaldata.</p>'; return; }
  const totalVisitors = d3.sum(words, w => w.n);

  const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const node = drawWords(svg, words);
  attachTooltip(node, totalVisitors);

  // Force-simulatie: trek naar het midden, stoot elkaar af, en voorkom overlap.
  const simulation = d3.forceSimulation(words)
    .force('x', d3.forceX(cx).strength(PULL_TO_CENTER_X))
    .force('y', d3.forceY(cy).strength(PULL_TO_CENTER_Y))
    .force('charge', d3.forceManyBody().strength(REPEL))
    .force('collide', d3.forceCollide(w => w.radius).strength(0.9))
    .on('tick', () => positionWords(node));

  if (reduceMotion()) {
    // Geen animatie: reken de layout in één keer uit en zet de woorden neer.
    simulation.stop();
    for (let i = 0; i < SETTLE_TICKS; i++) simulation.tick();
    positionWords(node);
  } else {
    // Zodra de layout tot rust komt, laten we de woorden zacht dobberen.
    simulation.on('end', () => startBobbing(words, node, cleanups));
  }
  cleanups.push(() => simulation.stop());

  const stat = $('#langStat');
  if (stat) {
    stat.innerHTML = `In totaal klinken er <strong>${(languagesData || []).length}</strong> verschillende talen rond de sluis.`;
  }
}

// Zet de ruwe taaldata om in tekenbare woorden (begroeting, grootte, kleur, plek).
function makeWords(languagesData) {
  const top = (languagesData || []).slice(0, MAX_LANGUAGES);
  if (!top.length) return [];

  const maxVisitors = d3.max(top, d => d.n);
  // Lettergrootte op √bezoekers, zodat de oppervlakte eerlijk meeschaalt.
  const fontScale = d3.scaleSqrt().domain([0, maxVisitors]).range([FONT_MIN, FONT_MAX]);
  // Geen paars: dat valt weg op de violette sectie-achtergrond.
  const palette = [COLORS.green, COLORS.greenMid, COLORS.teal, COLORS.pink, COLORS.goldDeep];

  return top.map((d, i) => {
    const [greeting, name] = GREETINGS[d.code] || ['', d.code.toUpperCase()];
    const size = fontScale(d.n);
    return {
      code: d.code, n: d.n, greeting, name, size,
      color: palette[i % palette.length],
      // botsstraal: breder bij langere/grotere woorden, zodat ze niet overlappen
      radius: Math.max(greeting.length * size * 0.3, size * 0.62) + 6,
      x: cx + (Math.random() - 0.5) * 260,
      y: cy + (Math.random() - 0.5) * 160,
    };
  });
}

// Teken per woord een groep met de begroeting (groot) en evt. de taalnaam (klein).
function drawWords(svg, words) {
  const node = svg.selectAll('g.lang-word').data(words).join('g')
    .attr('class', 'lang-word').attr('tabindex', 0).attr('role', 'img')
    .attr('aria-label', w => `${w.name}: ${formatNumber(w.n)} bezoekers`);

  node.append('text')
    .attr('text-anchor', 'middle').attr('dy', '0.34em')
    .attr('font-family', FONT_DISPLAY).attr('font-weight', 800)
    .attr('font-size', w => w.size).attr('fill', w => w.color)
    .text(w => w.greeting);

  // De taalnaam alleen onder grotere woorden, anders wordt het te druk.
  node.filter(w => w.size > 30).append('text')
    .attr('text-anchor', 'middle').attr('dy', w => w.size * 0.62 + 12)
    .attr('font-family', FONT_BODY).attr('font-size', 11)
    .attr('fill', COLORS.green).attr('opacity', 0.55)
    .text(w => w.name);

  return node;
}

// Verplaats elke woord-groep naar zijn huidige x/y.
function positionWords(node) {
  node.attr('transform', w => `translate(${w.x},${w.y})`);
}

// Tooltip bij hover/focus met aantal en percentage.
function attachTooltip(node, totalVisitors) {
  const pct = w => (w.n / totalVisitors * 100).toFixed(1);
  node
    .on('mouseenter mousemove', (e, w) =>
      showTooltip(`<strong>${w.name}</strong>${formatNumber(w.n)} bezoekers · ${pct(w)}%`, e.clientX, e.clientY))
    .on('mouseleave blur', () => hideTooltip())
    .on('focus', (e, w) => {
      const box = e.currentTarget.getBoundingClientRect();
      showTooltip(`<strong>${w.name}</strong>${formatNumber(w.n)} bezoekers`, box.left + box.width / 2, box.top);
    });
}

// Laat de woorden zacht rond hun rustplek dobberen (elk met een eigen fase).
function startBobbing(words, node, cleanups) {
  words.forEach(w => { w.baseX = w.x; w.baseY = w.y; w.phase = Math.random() * Math.PI * 2; });
  const start = performance.now();
  let bobId = 0;

  const bob = () => {
    const t = (performance.now() - start) / 1000;
    words.forEach(w => {
      w.x = w.baseX + Math.sin(t * 0.5 + w.phase) * BOB_RADIUS;
      w.y = w.baseY + Math.cos(t * 0.45 + w.phase) * BOB_RADIUS;
    });
    positionWords(node);
    bobId = raf(bob);
  };

  bobId = raf(bob);
  cleanups.push(() => cancelAnimationFrame(bobId));
}
