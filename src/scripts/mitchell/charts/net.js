import * as d3 from 'd3';
import { COLORS, FONT_DISPLAY } from '../constants.js';
import { $, $$, formatNumber, reduceMotion } from '../utils.js';
import { ensureTintFilter, fishImagePath } from '../fishImage.js';
import { state, lifecycle } from '../state.js';

// ============================================================================
// net.js — een "net" met bellen (circle-packing). Elke bel is een vissoort;
// de grootte hangt af van de gekozen weergave: aantal, gemiddeld gewicht, of
// biomassa (aantal × gewicht). Bovenaan zakt een net-patroon in beeld.
// ============================================================================

// ── Instelbare waarden ──────────────────────────────────────────────────────
const STAGE_WIDTH = 900, STAGE_HEIGHT = 680; // tekenvlak
const NET_BOTTOM = 380;          // hoe ver het net naar beneden hangt
const BUBBLE_PADDING = 8;        // ruimte tussen de bellen
const FALL_FROM_OFFSET = 200;    // van hoe hoog het net en de bellen invallen
const FISH_SIZE_FACTOR = 1.4, FISH_SIZE_MAX = 96; // vis-plaatje t.o.v. de bel (met plafond)
const LABEL_MIN_RADIUS = 28;     // onder deze straal verbergen we het naam-label

// De drie weergaven: waarop baseren we de belgrootte?
const valueForStat = {
  count:   species => species.count,
  weight:  species => species.weight,
  biomass: species => species.count * species.weight,
};
const summaryForStat = {
  count:   species => `${formatNumber(species.count)} waarnemingen`,
  weight:  species => `~${species.weight} kg per vis`,
  biomass: species => `${formatNumber(species.count * species.weight)} kg biomassa (${formatNumber(species.count)} × ${species.weight} kg)`,
};
const explanationForStat = {
  count:   'Verdeeld op aantal waarnemingen.',
  weight:  'Verdeeld op gemiddeld gewicht per vis.',
  biomass: 'Verdeeld op biomassa: aantal × gewicht.',
};

export function initNet() {
  const { visData } = state;
  const { cleanups } = lifecycle;
  const stageEl = $('#netStage');
  const infoEl = $('#netInfo');
  const svg = d3.select(stageEl).append('svg').attr('viewBox', `0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`);

  drawNet(svg);
  const bubbleLayer = svg.append('g').attr('transform', 'translate(20, 80)');
  const defs = svg.append('defs');
  let currentStat = 'biomass';

  // Eén bel aanmaken: kleurverloop, hoofdcirkel, glansplekje, vis-plek, label.
  function createBubble(group, bubble) {
    const gradientId = `bubGrad-${bubble.data.naam.replace(/\W/g, '')}`;
    const gradient = defs.append('radialGradient').attr('id', gradientId).attr('cx', '35%').attr('cy', '30%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', COLORS.off).attr('stop-opacity', 0.7);
    gradient.append('stop').attr('offset', '50%').attr('stop-color', bubble.data.color).attr('stop-opacity', 0.55);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', bubble.data.color).attr('stop-opacity', 0.85);

    group.append('circle').attr('class', 'bub-main').attr('r', bubble.r).attr('fill', `url(#${gradientId})`)
      .attr('stroke', 'rgb(1 70 60 / 0.28)').attr('stroke-width', 1);
    group.append('circle').attr('class', 'bub-shine')
      .attr('cx', -bubble.r * 0.3).attr('cy', -bubble.r * 0.3).attr('r', bubble.r * 0.25)
      .attr('fill', 'rgb(253 247 239 / 0.45)');
    group.append('g').attr('class', 'bub-fish').style('color', bubble.data.color);
    group.append('text').attr('class', 'bub-label').attr('text-anchor', 'middle')
      .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('fill', COLORS.green);
  }

  // Eén bel bijwerken voor de gekozen weergave: vis-plaatje, info, en animeren
  // naar de nieuwe grootte (zo "morphen" de bellen bij het wisselen).
  function updateBubble(group, bubble, stat, motionScale) {
    const fishSize = Math.min(bubble.r * FISH_SIZE_FACTOR, FISH_SIZE_MAX);
    const tintFilterId = ensureTintFilter(svg, bubble.data.color);
    group.select('.bub-fish').html(
      `<image href="${fishImagePath(bubble.data.naam)}" x="${-fishSize / 2}" y="${-fishSize / 3}" width="${fishSize}" height="${fishSize / 1.8}" preserveAspectRatio="xMidYMid meet" filter="url(#${tintFilterId})"/>`
    );

    group.attr('aria-label', `${bubble.data.naam}: ${summaryForStat[stat](bubble.data)}`);
    const showInfo = () => { infoEl.textContent = `${bubble.data.naam} — ${summaryForStat[stat](bubble.data)}.`; };
    group.on('click', showInfo).on('mouseenter', showInfo)
      .on('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showInfo(); } });

    group.select('.bub-main').transition().duration(800 * motionScale).attr('r', bubble.r);
    group.select('.bub-shine').transition().duration(800 * motionScale)
      .attr('cx', -bubble.r * 0.3).attr('cy', -bubble.r * 0.3).attr('r', bubble.r * 0.25);
    group.select('.bub-label').transition().duration(800 * motionScale)
      .attr('y', bubble.r * 0.55).attr('font-size', Math.min(bubble.r * 0.32, 18))
      .attr('opacity', bubble.r > LABEL_MIN_RADIUS ? 0.92 : 0);
  }

  // Herteken alle bellen voor 'stat' met circle-packing + een data-join.
  function renderBubbles(stat) {
    const packedBubbles = packBubbles(stat);
    const motionScale = reduceMotion() ? 0 : 1;

    const existingBubbles = bubbleLayer.selectAll('.net-bubble').data(packedBubbles, bubble => bubble.data.naam);

    // verdwenen soorten → krimpen en weg
    existingBubbles.exit().transition().duration(500 * motionScale)
      .attr('transform', bubble => `translate(${bubble.x}, ${bubble.y}) scale(0)`).remove();

    // nieuwe soorten → klein en hoog beginnen, dan invallen
    const enteringBubbles = existingBubbles.enter().append('g')
      .attr('class', 'net-bubble').attr('tabindex', 0).attr('role', 'button')
      .attr('transform', bubble => `translate(${bubble.x}, ${bubble.y - FALL_FROM_OFFSET}) scale(0)`);
    enteringBubbles.each(function (bubble) { createBubble(d3.select(this), bubble); });

    // nieuw + bestaand bijwerken naar de nieuwe grootte
    enteringBubbles.merge(existingBubbles).each(function (bubble) { updateBubble(d3.select(this), bubble, stat, motionScale); });

    enteringBubbles.transition().delay((bubble, i) => (reduceMotion() ? 0 : 200 + i * 70))
      .duration(900 * motionScale).ease(d3.easeCubicOut)
      .attr('transform', bubble => `translate(${bubble.x}, ${bubble.y}) scale(1)`);
    existingBubbles.transition().duration(800 * motionScale).ease(d3.easeCubicInOut)
      .attr('transform', bubble => `translate(${bubble.x}, ${bubble.y}) scale(1)`);
  }

  // Rangschik de soorten als compacte cirkels (grootte = de gekozen weergave).
  function packBubbles(stat) {
    const bubbleData = visData.map(species => ({ ...species, value: valueForStat[stat](species) }));
    const packLayout = d3.pack().size([STAGE_WIDTH - 40, STAGE_HEIGHT - 100]).padding(BUBBLE_PADDING);
    const hierarchyRoot = d3.hierarchy({ children: bubbleData }).sum(species => species.value);
    return packLayout(hierarchyRoot).leaves();
  }

  renderBubbles(currentStat);
  if (infoEl) infoEl.textContent = explanationForStat[currentStat];

  // De drie knoppen. onclick (i.p.v. addEventListener) zodat er bij hertekenen
  // niets opstapelt.
  const updateActiveToggle = () => $$('.net-toggle-btn').forEach(button => {
    const isActive = button.dataset.stat === currentStat;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
  $$('.net-toggle-btn').forEach(button => {
    button.onclick = () => {
      if (button.dataset.stat === currentStat) return;
      currentStat = button.dataset.stat;
      updateActiveToggle();
      renderBubbles(currentStat);
      if (infoEl) infoEl.textContent = explanationForStat[currentStat];
    };
  });
  updateActiveToggle();
  cleanups.push(() => { $$('.net-toggle-btn').forEach(button => { button.onclick = null; }); });
}

// Het net dat van bovenaf in beeld zakt: verticale + horizontale "touwen".
function drawNet(svg) {
  const netGroup = svg.append('g');

  for (let i = 0; i <= 16; i++) {
    const x = (i / 16) * STAGE_WIDTH;
    netGroup.append('path').attr('class', 'net-rope')
      .attr('d', `M ${x} 0 Q ${x + Math.sin(i) * 12} 200, ${x + Math.sin(i + 0.5) * 30} ${NET_BOTTOM}`);
  }
  for (let j = 0; j <= 8; j++) {
    const y = (j / 8) * NET_BOTTOM, sagAmount = 8 + j * 2;
    netGroup.append('path').attr('class', 'net-rope')
      .attr('d', `M 0 ${y} Q ${STAGE_WIDTH / 2} ${y + sagAmount}, ${STAGE_WIDTH} ${y}`);
  }
  netGroup.append('line').attr('x1', 0).attr('y1', 0).attr('x2', STAGE_WIDTH).attr('y2', 0)
    .attr('stroke', 'rgb(1 70 60 / 0.45)').attr('stroke-width', 2);

  // van boven in beeld laten zakken
  netGroup.attr('transform', `translate(0,-${FALL_FROM_OFFSET})`)
    .transition().delay(reduceMotion() ? 0 : 300).duration(reduceMotion() ? 0 : 1400)
    .attr('transform', 'translate(0,0)');
}
