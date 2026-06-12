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
const MAX_LANGUAGES = 24;        // hoeveel talen we tonen (drukste eerst)
const FONT_SIZE_MIN = 15, FONT_SIZE_MAX = 70; // kleinste/grootste woord in px
const PULL_TO_CENTER_X = 0.04;   // hoe sterk woorden naar het midden trekken (horizontaal)
const PULL_TO_CENTER_Y = 0.06;   // idem verticaal
const REPEL_STRENGTH = -4;       // hoe sterk woorden elkaar afstoten
const SETTLE_TICKS = 220;        // rekenstappen vooraf als animaties uit staan
const BOB_RADIUS = 5;            // hoeveel px de woorden rondjes dobberen

const STAGE_WIDTH = 900, STAGE_HEIGHT = 540;
const CENTER_X = STAGE_WIDTH / 2, CENTER_Y = STAGE_HEIGHT / 2;

export function initLanguages() {
  const { languagesData } = state;
  const { cleanups } = lifecycle;
  const stage = $('#langStage');

  const words = buildWords(languagesData);
  if (!words.length) { stage.innerHTML = '<p class="stage-fallback">Geen taaldata.</p>'; return; }
  const totalVisitors = d3.sum(words, word => word.visitors);

  const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`);
  const wordGroups = drawWords(svg, words);
  attachTooltip(wordGroups, totalVisitors);

  // Force-simulatie: trek naar het midden, stoot elkaar af, en voorkom overlap.
  const simulation = d3.forceSimulation(words)
    .force('x', d3.forceX(CENTER_X).strength(PULL_TO_CENTER_X))
    .force('y', d3.forceY(CENTER_Y).strength(PULL_TO_CENTER_Y))
    .force('charge', d3.forceManyBody().strength(REPEL_STRENGTH))
    .force('collide', d3.forceCollide(word => word.radius).strength(0.9))
    .on('tick', () => positionWords(wordGroups));

  if (reduceMotion()) {
    // Geen animatie: reken de layout in één keer uit en zet de woorden neer.
    simulation.stop();
    for (let i = 0; i < SETTLE_TICKS; i++) simulation.tick();
    positionWords(wordGroups);
  } else {
    // Zodra de layout tot rust komt, laten we de woorden zacht dobberen.
    simulation.on('end', () => startBobbing(words, wordGroups, cleanups));
  }
  cleanups.push(() => simulation.stop());

  const stat = $('#langStat');
  if (stat) {
    stat.innerHTML = `In totaal klinken er <strong>${(languagesData || []).length}</strong> verschillende talen rond de sluis.`;
  }
}

// Zet de ruwe taaldata om in tekenbare woorden (begroeting, grootte, kleur, plek).
function buildWords(languagesData) {
  const topLanguages = (languagesData || []).slice(0, MAX_LANGUAGES);
  if (!topLanguages.length) return [];

  const maxVisitors = d3.max(topLanguages, lang => lang.n);
  // Lettergrootte op √bezoekers, zodat de oppervlakte eerlijk meeschaalt.
  const fontSizeScale = d3.scaleSqrt().domain([0, maxVisitors]).range([FONT_SIZE_MIN, FONT_SIZE_MAX]);
  // Geen paars: dat valt weg op de violette sectie-achtergrond.
  const palette = [COLORS.green, COLORS.greenMid, COLORS.teal, COLORS.pink, COLORS.goldDeep];

  return topLanguages.map((lang, i) => {
    const [greeting, name] = GREETINGS[lang.code] || ['', lang.code.toUpperCase()];
    const fontSize = fontSizeScale(lang.n);
    return {
      code: lang.code, visitors: lang.n, greeting, name, fontSize,
      color: palette[i % palette.length],
      // botsstraal: breder bij langere/grotere woorden, zodat ze niet overlappen
      radius: Math.max(greeting.length * fontSize * 0.3, fontSize * 0.62) + 6,
      x: CENTER_X + (Math.random() - 0.5) * 260,
      y: CENTER_Y + (Math.random() - 0.5) * 160,
    };
  });
}

// Teken per woord een groep met de begroeting (groot) en evt. de taalnaam (klein).
function drawWords(svg, words) {
  const wordGroups = svg.selectAll('g.lang-word').data(words).join('g')
    .attr('class', 'lang-word').attr('tabindex', 0).attr('role', 'img')
    .attr('aria-label', word => `${word.name}: ${formatNumber(word.visitors)} bezoekers`);

  wordGroups.append('text')
    .attr('text-anchor', 'middle').attr('dy', '0.34em')
    .attr('font-family', FONT_DISPLAY).attr('font-weight', 800)
    .attr('font-size', word => word.fontSize).attr('fill', word => word.color)
    .text(word => word.greeting);

  // De taalnaam alleen onder grotere woorden, anders wordt het te druk.
  wordGroups.filter(word => word.fontSize > 30).append('text')
    .attr('text-anchor', 'middle').attr('dy', word => word.fontSize * 0.62 + 12)
    .attr('font-family', FONT_BODY).attr('font-size', 11)
    .attr('fill', COLORS.green).attr('opacity', 0.55)
    .text(word => word.name);

  return wordGroups;
}

// Verplaats elke woord-groep naar zijn huidige x/y.
function positionWords(wordGroups) {
  wordGroups.attr('transform', word => `translate(${word.x},${word.y})`);
}

// Tooltip bij hover/focus met aantal en percentage.
function attachTooltip(wordGroups, totalVisitors) {
  const percentage = word => (word.visitors / totalVisitors * 100).toFixed(1);
  wordGroups
    .on('mouseenter mousemove', (event, word) =>
      showTooltip(`<strong>${word.name}</strong>${formatNumber(word.visitors)} bezoekers · ${percentage(word)}%`, event.clientX, event.clientY))
    .on('mouseleave blur', () => hideTooltip())
    .on('focus', (event, word) => {
      const box = event.currentTarget.getBoundingClientRect();
      showTooltip(`<strong>${word.name}</strong>${formatNumber(word.visitors)} bezoekers`, box.left + box.width / 2, box.top);
    });
}

// Laat de woorden zacht rond hun rustplek dobberen (elk met een eigen fase).
function startBobbing(words, wordGroups, cleanups) {
  words.forEach(word => { word.baseX = word.x; word.baseY = word.y; word.phase = Math.random() * Math.PI * 2; });
  const startTime = performance.now();
  let bobFrameId = 0;

  const bobFrame = () => {
    const elapsedSeconds = (performance.now() - startTime) / 1000;
    words.forEach(word => {
      word.x = word.baseX + Math.sin(elapsedSeconds * 0.5 + word.phase) * BOB_RADIUS;
      word.y = word.baseY + Math.cos(elapsedSeconds * 0.45 + word.phase) * BOB_RADIUS;
    });
    positionWords(wordGroups);
    bobFrameId = raf(bobFrame);
  };

  bobFrameId = raf(bobFrame);
  cleanups.push(() => cancelAnimationFrame(bobFrameId));
}
