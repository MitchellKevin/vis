import * as d3 from 'd3';
import { COLORS, FONT_DISPLAY } from '../constants.js';
import { $, $$, formatNumber, reduceMotion } from '../utils.js';
import { ensureTintFilter, fishImagePath } from '../fishImage.js';
import { state, lifecycle, raf } from '../state.js';

// ============================================================================
// net.js — een echt "net" met bellen (circle-packing). Elke bel is een vissoort;
// de grootte hangt af van de gekozen weergave: aantal, gemiddeld gewicht, of
// biomassa (aantal × gewicht). Bovenaan zakt een ruitvormig sleepnet in beeld
// dat dóórbuigt onder het gewicht van de zwaarste bellen en zacht meewiegt in
// de stroming.
// ============================================================================

// ── Instelbare waarden ──────────────────────────────────────────────────────
const STAGE_WIDTH = 900, STAGE_HEIGHT = 680; // tekenvlak
const NET_BOTTOM = 380;          // hoe ver het net (in ruststand) naar beneden hangt
const BUBBLE_PADDING = 8;        // ruimte tussen de bellen
const FALL_FROM_OFFSET = 200;    // van hoe hoog het net en de bellen invallen
const FISH_SIZE_FACTOR = 1.4, FISH_SIZE_MAX = 96; // vis-plaatje t.o.v. de bel (met plafond)
const LABEL_MIN_RADIUS = 28;     // onder deze straal verbergen we het naam-label

// Het net als maaswerk: een rooster van knopen waar diagonale "touwen" doorheen
// lopen → ruitvormige mazen i.p.v. een saai vierkant grid.
const NET_COLS = 18;             // mazen breed
const NET_ROWS = 9;              // mazen diep
const NET_GRAVITY = 60;          // basis-doorhang door zwaartekracht (px, lege kolom)
const NET_CENTER_BOW = 28;       // extra doorhang in het midden (hangmat-vorm)
const NET_BOTTOM_MARGIN = 16;    // hoe ver de onderrand ónder de laagste bel blijft
const NET_SWAY_X = 7, NET_SWAY_Y = 4; // amplitude van het zachte wiegen (px, onderrand)

// De soort-bellen-laag staat op translate(BUBBLE_DX, BUBBLE_DY).
const BUBBLE_DX = 20, BUBBLE_DY = 80;

// Tijdlijn van de intro-animatie (ms): eerst strak invallen, dán doorzakken.
const DROP_MS = 1000, SAG_DELAY = 600, SAG_MS = 1150;
const SWAY_DELAY = 1500, SWAY_MS = 1400, MORPH_MS = 850;

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeSag = d3.easeBackOut.overshoot(1.1);   // zacht doorzakken mét lichte settle

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

  // Lagen, van achter naar voren: net → soort-bellen.
  const net = createNet(svg);
  const bubbleLayer = svg.append('g').attr('transform', `translate(${BUBBLE_DX}, ${BUBBLE_DY})`);
  const defs = svg.append('defs');
  let currentStat = 'biomass';
  let firstRender = true;

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

    // Het net laten doorbuigen onder de nieuwe verdeling (animeren ná de eerste keer).
    net.setWeight(packedBubbles, !firstRender);

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

    firstRender = false;
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

  // ── Animatie-loop (net wiegen), gepauzeerd buiten beeld ──
  let running = false, frameId = 0;
  function loop(now) {
    net.tick(now);
    if (running) frameId = raf(loop);
  }

  if (reduceMotion()) {
    net.paintFinal();
  } else {
    net.startIntro();                           // initNet draait al pas in beeld → meteen starten
    running = true; frameId = raf(loop);
    // Observer enkel om te pauzeren/hervatten buiten beeld (zuinig).
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!running) { running = true; frameId = raf(loop); }
      } else { running = false; cancelAnimationFrame(frameId); }
    }, { threshold: 0 });
    visibilityObserver.observe(stageEl);
    cleanups.push(() => { running = false; cancelAnimationFrame(frameId); visibilityObserver.disconnect(); });
  }

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

// ============================================================================
// Het net: een ruitvormig maaswerk dat invalt, doorzakt en meewiegt.
// Geeft een handvol controls terug die initNet aanstuurt.
// ============================================================================
function createNet(svg) {
  const cols = NET_COLS, rows = NET_ROWS;
  const layerSel = svg.append('g').attr('class', 'net-layer');
  const layer = layerSel.node();   // ruwe DOM-node voor snelle setAttribute in de loop

  // ── Knopen: vaste basis-posities (taut), de doorhang komt er los bovenop ──
  const nodes = [];
  const nodeAt = (r, c) => nodes[r * (cols + 1) + c];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const depth = r / rows;                       // 0 bovenaan (vastgemaakt) → 1 onderaan
      const x0 = (c / cols) * STAGE_WIDTH;
      const y0 = depth * NET_BOTTOM;
      nodes.push({ r, c, depth, x0, y0, x: x0, y: y0 });
    }
  }

  // Doorhang per kolom (px t.o.v. ruststand). Basis = zwaartekracht; bij bellen
  // zakt de onderrand verder door zodat het net de vangst omhult.
  const gravityDroop = d3.range(cols + 1).map(c => NET_GRAVITY + NET_CENTER_BOW * Math.sin(Math.PI * c / cols));
  let dropFrom = gravityDroop.slice();
  let dropTo = gravityDroop.slice();
  const drop = gravityDroop.slice();

  // ── Strengen: twee families diagonalen → ruitvormige mazen ──
  const strands = [];
  for (let k = -rows; k <= cols; k++) {               // van linksboven naar rechtsonder
    const chain = [];
    for (let r = 0; r <= rows; r++) { const c = k + r; if (c >= 0 && c <= cols) chain.push(nodeAt(r, c)); }
    if (chain.length > 1) strands.push(chain);
  }
  for (let k = 0; k <= cols + rows; k++) {            // van rechtsboven naar linksonder
    const chain = [];
    for (let r = 0; r <= rows; r++) { const c = k - r; if (c >= 0 && c <= cols) chain.push(nodeAt(r, c)); }
    if (chain.length > 1) strands.push(chain);
  }
  const strandEls = strands.map(() => layerSel.append('path').attr('class', 'net-rope').node());

  // Dikkere rand-touwen: bovenrand (waaraan het hangt) en de doorzakkende onderrand.
  const topNodes = d3.range(cols + 1).map(c => nodeAt(0, c));
  const botNodes = d3.range(cols + 1).map(c => nodeAt(rows, c));
  const topRope = layerSel.append('path').attr('class', 'net-rope net-rope--edge').node();
  const botRope = layerSel.append('path').attr('class', 'net-rope net-rope--edge').node();

  // Knopen waar de strengen kruisen.
  const knotEls = nodes.map(() => layerSel.append('circle').attr('class', 'net-knot').attr('r', 2).node());

  const pathFor = chain => {
    let d = `M${chain[0].x.toFixed(1)} ${chain[0].y.toFixed(1)}`;
    for (let i = 1; i < chain.length; i++) d += `L${chain[i].x.toFixed(1)} ${chain[i].y.toFixed(1)}`;
    return d;
  };

  // Doorhang per kolom: zak tot net ónder het laagste bel-silhouet in die kolom,
  // met de zwaartekracht-doorhang als minimum. Zo omhult het net de vangst.
  function computeDrop(bubbles) {
    const out = gravityDroop.slice();
    for (let c = 0; c <= cols; c++) {
      const x = (c / cols) * STAGE_WIDTH;
      let bottom = NET_BOTTOM + gravityDroop[c];
      for (const b of bubbles) {
        const dx = x - (b.x + BUBBLE_DX);
        if (Math.abs(dx) >= b.r) continue;            // deze kolom snijdt de bel niet
        const silhouette = (b.y + BUBBLE_DY) + Math.sqrt(b.r * b.r - dx * dx) + NET_BOTTOM_MARGIN;
        if (silhouette > bottom) bottom = silhouette;
      }
      out[c] = Math.min(bottom, STAGE_HEIGHT - 6) - NET_BOTTOM;
    }
    return out;
  }

  let introStart = null;     // performance.now() bij start van de intro (null = nog niet)
  let morphStart = null;     // start van een gewicht-overgang bij weergave-wissel

  // Bereken alle knoop-posities voor tijdstip `now` en teken het net.
  function paint(now) {
    let dropEased, sagScale, swayAmp, weightT;
    if (reduceMotion()) {
      dropEased = 1; sagScale = 1; swayAmp = 0; weightT = 1;
    } else if (introStart == null) {
      dropEased = 0; sagScale = 0; swayAmp = 0; weightT = 1;   // wachtstand: nog niet in beeld
    } else {
      const e = now - introStart;
      dropEased = d3.easeCubicOut(clamp01(e / DROP_MS));
      sagScale = easeSag(clamp01((e - SAG_DELAY) / SAG_MS));            // zakt door mét lichte settle
      swayAmp = clamp01((e - SWAY_DELAY) / SWAY_MS);
      weightT = morphStart == null ? 1 : d3.easeCubicInOut(clamp01((now - morphStart) / MORPH_MS));
    }

    for (let c = 0; c <= cols; c++) drop[c] = dropFrom[c] + (dropTo[c] - dropFrom[c]) * weightT;

    layer.setAttribute('transform', `translate(0,${((1 - dropEased) * -FALL_FROM_OFFSET).toFixed(1)})`);

    for (const n of nodes) {
      let x = n.x0;
      let y = n.y0 + sagScale * Math.pow(n.depth, 1.2) * drop[n.c];   // onderrand zakt het meest
      if (swayAmp > 0) {                              // bovenrand blijft vast, onderrand wiegt het meest
        x += n.depth * NET_SWAY_X * swayAmp * Math.sin(now * 0.0012 + n.c * 0.55 + n.r * 0.3);
        y += n.depth * NET_SWAY_Y * swayAmp * Math.sin(now * 0.0009 + n.c * 0.4);
      }
      n.x = x; n.y = Math.min(y, STAGE_HEIGHT - 2);
    }

    for (let i = 0; i < strands.length; i++) strandEls[i].setAttribute('d', pathFor(strands[i]));
    topRope.setAttribute('d', pathFor(topNodes));
    botRope.setAttribute('d', pathFor(botNodes));
    for (let i = 0; i < nodes.length; i++) {
      knotEls[i].setAttribute('cx', nodes[i].x.toFixed(1));
      knotEls[i].setAttribute('cy', nodes[i].y.toFixed(1));
    }
  }

  return {
    // Nieuwe verdeling instellen; `animate` laat het net er soepel naartoe buigen.
    setWeight(bubbles, animate) {
      dropFrom = drop.slice();
      dropTo = computeDrop(bubbles);
      if (animate && !reduceMotion()) morphStart = performance.now();
      else { morphStart = null; for (let c = 0; c <= cols; c++) drop[c] = dropTo[c]; }
    },
    startIntro() { if (introStart == null) introStart = performance.now(); },
    tick(now) { paint(now); },
    paintFinal() { paint(performance.now()); },   // directe eindstand (reduced motion)
  };
}
