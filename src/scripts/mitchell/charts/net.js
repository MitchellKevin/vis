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
const W = 900, H = 680;        // tekenvlak
const MESH_BOTTOM = 380;       // hoe ver het net naar beneden hangt
const BUBBLE_PADDING = 8;      // ruimte tussen de bellen
const FALL_FROM = 200;         // van hoe hoog het net en de bellen invallen
const FISH_FACTOR = 1.4, FISH_MAX = 96; // vis-plaatje t.o.v. de bel (met plafond)
const LABEL_MIN_R = 28;        // onder deze straal verbergen we het naam-label

// De drie weergaven: waarop baseren we de belgrootte?
const statFn = {
  count:   d => d.count,
  weight:  d => d.weight,
  biomass: d => d.count * d.weight,
};
const statLabel = {
  count:   v => `${formatNumber(v.count)} waarnemingen`,
  weight:  v => `~${v.weight} kg per vis`,
  biomass: v => `${formatNumber(v.count * v.weight)} kg biomassa (${formatNumber(v.count)} × ${v.weight} kg)`,
};
const explainer = {
  count:   'Verdeeld op aantal waarnemingen.',
  weight:  'Verdeeld op gemiddeld gewicht per vis.',
  biomass: 'Verdeeld op biomassa: aantal × gewicht.',
};

export function initNet() {
  const { visData } = state;
  const { cleanups } = lifecycle;
  const host = $('#netStage');
  const info = $('#netInfo');
  const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

  drawNet(svg);
  const bubbleGroup = svg.append('g').attr('transform', 'translate(20, 80)');
  const defs = svg.append('defs');
  let currentStat = 'biomass';

  // Eén bel aanmaken: kleurverloop, hoofdcirkel, glansplekje, vis-plek, label.
  function createBubble(g, d) {
    const gradId = `bubGrad-${d.data.naam.replace(/\W/g, '')}`;
    const grad = defs.append('radialGradient').attr('id', gradId).attr('cx', '35%').attr('cy', '30%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', COLORS.off).attr('stop-opacity', 0.7);
    grad.append('stop').attr('offset', '50%').attr('stop-color', d.data.color).attr('stop-opacity', 0.55);
    grad.append('stop').attr('offset', '100%').attr('stop-color', d.data.color).attr('stop-opacity', 0.85);

    g.append('circle').attr('class', 'bub-main').attr('r', d.r).attr('fill', `url(#${gradId})`)
      .attr('stroke', 'rgb(1 70 60 / 0.28)').attr('stroke-width', 1);
    g.append('circle').attr('class', 'bub-shine')
      .attr('cx', -d.r * 0.3).attr('cy', -d.r * 0.3).attr('r', d.r * 0.25)
      .attr('fill', 'rgb(253 247 239 / 0.45)');
    g.append('g').attr('class', 'bub-fish').style('color', d.data.color);
    g.append('text').attr('class', 'bub-label').attr('text-anchor', 'middle')
      .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('fill', COLORS.green);
  }

  // Eén bel bijwerken voor de gekozen weergave: vis-plaatje, info, en animeren
  // naar de nieuwe grootte (zo "morphen" de bellen bij het wisselen).
  function updateBubble(g, d, stat, motionScale) {
    const fishSize = Math.min(d.r * FISH_FACTOR, FISH_MAX);
    const tint = ensureTintFilter(svg, d.data.color);
    g.select('.bub-fish').html(
      `<image href="${fishImagePath(d.data.naam)}" x="${-fishSize / 2}" y="${-fishSize / 3}" width="${fishSize}" height="${fishSize / 1.8}" preserveAspectRatio="xMidYMid meet" filter="url(#${tint})"/>`
    );

    g.attr('aria-label', `${d.data.naam}: ${statLabel[stat](d.data)}`);
    const setInfo = () => { info.textContent = `${d.data.naam} — ${statLabel[stat](d.data)}.`; };
    g.on('click', setInfo).on('mouseenter', setInfo)
      .on('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setInfo(); } });

    g.select('.bub-main').transition().duration(800 * motionScale).attr('r', d.r);
    g.select('.bub-shine').transition().duration(800 * motionScale)
      .attr('cx', -d.r * 0.3).attr('cy', -d.r * 0.3).attr('r', d.r * 0.25);
    g.select('.bub-label').transition().duration(800 * motionScale)
      .attr('y', d.r * 0.55).attr('font-size', Math.min(d.r * 0.32, 18))
      .attr('opacity', d.r > LABEL_MIN_R ? 0.92 : 0);
  }

  // Herteken alle bellen voor 'stat' met circle-packing + een data-join.
  function renderPack(stat) {
    const packed = packBubbles(stat);
    const motionScale = reduceMotion() ? 0 : 1;

    const sel = bubbleGroup.selectAll('.net-bubble').data(packed, d => d.data.naam);

    // verdwenen soorten → krimpen en weg
    sel.exit().transition().duration(500 * motionScale)
      .attr('transform', d => `translate(${d.x}, ${d.y}) scale(0)`).remove();

    // nieuwe soorten → klein en hoog beginnen, dan invallen
    const enter = sel.enter().append('g')
      .attr('class', 'net-bubble').attr('tabindex', 0).attr('role', 'button')
      .attr('transform', d => `translate(${d.x}, ${d.y - FALL_FROM}) scale(0)`);
    enter.each(function (d) { createBubble(d3.select(this), d); });

    // nieuw + bestaand bijwerken naar de nieuwe grootte
    enter.merge(sel).each(function (d) { updateBubble(d3.select(this), d, stat, motionScale); });

    enter.transition().delay((d, i) => (reduceMotion() ? 0 : 200 + i * 70))
      .duration(900 * motionScale).ease(d3.easeCubicOut)
      .attr('transform', d => `translate(${d.x}, ${d.y}) scale(1)`);
    sel.transition().duration(800 * motionScale).ease(d3.easeCubicInOut)
      .attr('transform', d => `translate(${d.x}, ${d.y}) scale(1)`);
  }

  // Rangschik de soorten als compacte cirkels (grootte = de gekozen weergave).
  function packBubbles(stat) {
    const packData = visData.map(v => ({ ...v, value: statFn[stat](v) }));
    const pack = d3.pack().size([W - 40, H - 100]).padding(BUBBLE_PADDING);
    const root = d3.hierarchy({ children: packData }).sum(d => d.value);
    return pack(root).leaves();
  }

  renderPack(currentStat);
  if (info) info.textContent = explainer[currentStat];

  // De drie knoppen. onclick (i.p.v. addEventListener) zodat er bij hertekenen
  // niets opstapelt.
  const markActive = () => $$('.net-toggle-btn').forEach(b => {
    const on = b.dataset.stat === currentStat;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  $$('.net-toggle-btn').forEach(btn => {
    btn.onclick = () => {
      if (btn.dataset.stat === currentStat) return;
      currentStat = btn.dataset.stat;
      markActive();
      renderPack(currentStat);
      if (info) info.textContent = explainer[currentStat];
    };
  });
  markActive();
  cleanups.push(() => { $$('.net-toggle-btn').forEach(b => { b.onclick = null; }); });
}

// Het net dat van bovenaf in beeld zakt: verticale + horizontale "touwen".
function drawNet(svg) {
  const netGroup = svg.append('g');

  for (let i = 0; i <= 16; i++) {
    const x = (i / 16) * W;
    netGroup.append('path').attr('class', 'net-rope')
      .attr('d', `M ${x} 0 Q ${x + Math.sin(i) * 12} 200, ${x + Math.sin(i + 0.5) * 30} ${MESH_BOTTOM}`);
  }
  for (let j = 0; j <= 8; j++) {
    const y = (j / 8) * MESH_BOTTOM, sag = 8 + j * 2;
    netGroup.append('path').attr('class', 'net-rope')
      .attr('d', `M 0 ${y} Q ${W / 2} ${y + sag}, ${W} ${y}`);
  }
  netGroup.append('line').attr('x1', 0).attr('y1', 0).attr('x2', W).attr('y2', 0)
    .attr('stroke', 'rgb(1 70 60 / 0.45)').attr('stroke-width', 2);

  // van boven in beeld laten zakken
  netGroup.attr('transform', `translate(0,-${FALL_FROM})`)
    .transition().delay(reduceMotion() ? 0 : 300).duration(reduceMotion() ? 0 : 1400)
    .attr('transform', 'translate(0,0)');
}
