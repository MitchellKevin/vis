import * as d3 from 'd3';
import { COLORS, FONT_BODY, FONT_DISPLAY, GREETINGS } from '../../scripts/mitchell/constants.js';
import { $, formatNumber, reduceMotion } from '../../scripts/mitchell/utils.js';
import { showTooltip, hideTooltip } from '../../scripts/mitchell/tooltip.js';
import { state, lifecycle } from '../../scripts/mitchell/state.js';

const MAX_LANGUAGES = 24;
const FONT_SIZE_MIN = 15, FONT_SIZE_MAX = 70;
const PULL_TO_CENTER_X = 0.04;
const PULL_TO_CENTER_Y = 0.06;
const REPEL_STRENGTH = -4;
const SETTLE_TICKS = 220;

const STAGE_WIDTH = 900, STAGE_HEIGHT = 540;
const CENTER_X = STAGE_WIDTH / 2, CENTER_Y = STAGE_HEIGHT / 2;

// Builds the list of word objects used by the force simulation.
function buildWords(languagesData) {
  const topLanguages = (languagesData || []).slice(0, MAX_LANGUAGES);
  if (!topLanguages.length) return [];

  const maxVisitors = d3.max(topLanguages, lang => lang.n);
  // Square-root scale: large languages grow more slowly than linear,
  // keeping small languages readable alongside dominant ones.
  const fontSizeScale = d3.scaleSqrt().domain([0, maxVisitors]).range([FONT_SIZE_MIN, FONT_SIZE_MAX]);
  const palette = [COLORS.green, COLORS.greenMid, COLORS.teal, COLORS.pink, COLORS.goldDeep];

  return topLanguages.map((lang, i) => {
    const [greeting, name] = GREETINGS[lang.code] || ['', lang.code.toUpperCase()];
    const fontSize = fontSizeScale(lang.n);
    return {
      code: lang.code, visitors: lang.n, greeting, name, fontSize,
      // i % palette.length cycles the colour palette over all languages.
      color: palette[i % palette.length],
      // radius = collision radius for d3.forceCollide: based on text width × font size.
      radius: Math.max(greeting.length * fontSize * 0.3, fontSize * 0.62) + 6,
      // Random starting position around the centre; the force simulation resolves overlaps.
      x: CENTER_X + (Math.random() - 0.5) * 260,
      y: CENTER_Y + (Math.random() - 0.5) * 160,
    };
  });
}

function drawWords(svg, words) {
  const wordGroups = svg.selectAll('g.lang-word').data(words).join('g')
    .attr('class', 'lang-word').attr('tabindex', 0).attr('role', 'img')
    .attr('aria-label', word => `${word.name}: ${formatNumber(word.visitors)} bezoekers`);

  wordGroups.append('text')
    .attr('text-anchor', 'middle').attr('dy', '0.34em')
    .attr('font-family', FONT_DISPLAY).attr('font-weight', 800)
    .attr('font-size', word => word.fontSize).attr('fill', word => word.color)
    .text(word => word.greeting);

  wordGroups.filter(word => word.fontSize > 30).append('text')
    .attr('text-anchor', 'middle').attr('dy', word => word.fontSize * 0.62 + 12)
    .attr('font-family', FONT_BODY).attr('font-size', 11)
    .attr('fill', COLORS.green).attr('opacity', 0.55)
    .text(word => word.name);

  return wordGroups;
}

function positionWords(wordGroups) {
  wordGroups.attr('transform', word => `translate(${word.x},${word.y})`);
}

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

export function initLanguages() {
  const { languagesData } = state;
  const { cleanups } = lifecycle;
  const stage = $('#langStage');
  if (!stage) return;

  const words = buildWords(languagesData);
  if (!words.length) { stage.innerHTML = '<p class="stage-fallback">Geen taaldata.</p>'; return; }
  const totalVisitors = d3.sum(words, word => word.visitors);

  const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`);
  const wordGroups = drawWords(svg, words);
  attachTooltip(wordGroups, totalVisitors);

  // D3 force simulation: forces pull words to the centre and push them apart.
  // forceX/Y: attract each word towards (CENTER_X, CENTER_Y) with a soft spring.
  // forceManyBody (negative): electrostatic repulsion so words don't cluster together.
  // forceCollide: prevents physical overlap based on the computed radius per word.
  const simulation = d3.forceSimulation(words)
    .force('x', d3.forceX(CENTER_X).strength(PULL_TO_CENTER_X))
    .force('y', d3.forceY(CENTER_Y).strength(PULL_TO_CENTER_Y))
    .force('charge', d3.forceManyBody().strength(REPEL_STRENGTH))
    .force('collide', d3.forceCollide(word => word.radius).strength(0.9))
    .on('tick', () => positionWords(wordGroups));

  if (reduceMotion()) {
    // With prefers-reduced-motion: skip the animation and compute the layout immediately.
    // simulation.tick() runs one iteration; SETTLE_TICKS iterations gives a stable layout.
    simulation.stop();
    for (let i = 0; i < SETTLE_TICKS; i++) simulation.tick();
    positionWords(wordGroups);
  }

  cleanups.push(() => simulation.stop());

  const stat = $('#langStat');
  if (stat) stat.innerHTML = `In totaal klinken er <strong>${(languagesData || []).length}</strong> verschillende talen rond de sluis.`;
}

export default function LanguagesChapter() {
  return (
    <section id="ch-languages" className="chapter" aria-label="Talen">
      <div className="chapter-inner chapter-split">
        <div className="chapter-text">
          <p className="eyebrow reveal">Het koor van talen</p>
          <h2 className="reveal">Hallo, Cześć, 你好.</h2>
          <p className="lede reveal">De sluis spreekt vele talen tegelijk. Elk woord is een groet, zo groot als het aantal bezoekers dat zo binnenkwam.</p>
          <p className="chapter-stat reveal" id="langStat" aria-live="polite"></p>
        </div>
        <div className="chapter-viz">
          <div className="lang-stage" id="langStage" aria-label="Drijvende begroetingen per taal"></div>
        </div>
      </div>
    </section>
  );
}
