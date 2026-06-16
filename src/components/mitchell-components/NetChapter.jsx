import * as d3 from 'd3';
import { $, $$, formatNumber, reduceMotion } from '../../scripts/mitchell/utils.js';
import { ensureTintFilter, fishImagePath } from '../../scripts/mitchell/fishImage.js';
import { state } from '../../scripts/mitchell/state.js';

const STAGE_WIDTH = 900, STAGE_HEIGHT = 680;
const BUBBLE_PADDING = 8;
const FALL_FROM_OFFSET = 200;
const FISH_SIZE_FACTOR = 1.4, FISH_SIZE_MAX = 96;
const LABEL_MIN_RADIUS = 28;

const valueForStat = {
  count:   s => s.count,
  weight:  s => s.weight,
  biomass: s => s.count * s.weight,
};
const summaryForStat = {
  count:   s => `${formatNumber(s.count)} waarnemingen`,
  weight:  s => `~${s.weight} kg per vis`,
  biomass: s => `${formatNumber(s.count * s.weight)} kg biomassa (${formatNumber(s.count)} × ${s.weight} kg)`,
};
const explanationForStat = {
  count:   'Verdeeld op aantal waarnemingen.',
  weight:  'Verdeeld op gemiddeld gewicht per vis.',
  biomass: 'Verdeeld op biomassa: aantal × gewicht.',
};

export function initNet() {
  const { visData } = state;
  const infoEl = $('#netInfo');
  const svg = d3.select($('#netStage')).append('svg').attr('viewBox', `0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`);
  const bubbleLayer = svg.append('g').attr('transform', 'translate(20, 80)');
  const defs = svg.append('defs');
  let currentStat = 'biomass';

  // Builds the SVG elements for one bubble: radial gradient, shine, fish image and label.
  // replace(/\W/g, '') strips non-word characters from the species name for a safe SVG id.
  function createBubble(group, bubble) {
    const gradientId = `bubGrad-${bubble.data.naam.replace(/\W/g, '')}`;
    // cx="35%" cy="30%" places the light source top-left inside the circle for a sphere illusion.
    const gradient = defs.append('radialGradient').attr('id', gradientId).attr('cx', '35%').attr('cy', '30%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', 'var(--color-off-white)').attr('stop-opacity', 0.7);
    gradient.append('stop').attr('offset', '50%').attr('stop-color', bubble.data.color).attr('stop-opacity', 0.55);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', bubble.data.color).attr('stop-opacity', 0.85);
    group.append('circle').attr('class', 'bub-main').attr('r', bubble.r).attr('fill', `url(#${gradientId})`);
    // Small white circle top-left simulates a light reflection on the sphere surface.
    group.append('circle').attr('class', 'bub-shine')
      .attr('cx', -bubble.r * 0.3).attr('cy', -bubble.r * 0.3).attr('r', bubble.r * 0.25);
    group.append('g').attr('class', 'bub-fish').style('color', bubble.data.color);
    group.append('text').attr('class', 'bub-label');
  }

  function updateBubble(group, bubble, stat, motionScale) {
    const fishSize = Math.min(bubble.r * FISH_SIZE_FACTOR, FISH_SIZE_MAX);
    const tintFilterId = ensureTintFilter(svg, bubble.data.color);
    group.select('.bub-fish').html(
      `<image href="${fishImagePath(bubble.data.naam)}" x="${-fishSize / 2}" y="${-fishSize / 3}" width="${fishSize}" height="${fishSize / 1.8}" preserveAspectRatio="xMidYMid meet" filter="url(#${tintFilterId})"/>`
    );
    group.attr('aria-label', `${bubble.data.naam}: ${summaryForStat[stat](bubble.data)}`);
    const showInfo = () => { infoEl.textContent = `${bubble.data.naam} — ${summaryForStat[stat](bubble.data)}.`; };
    group.on('click', showInfo).on('mouseenter', showInfo)
      .on('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showInfo(); } });
    group.select('.bub-main').transition().duration(800 * motionScale).attr('r', bubble.r);
    group.select('.bub-shine').transition().duration(800 * motionScale)
      .attr('cx', -bubble.r * 0.3).attr('cy', -bubble.r * 0.3).attr('r', bubble.r * 0.25);
    group.select('.bub-label').transition().duration(800 * motionScale)
      .attr('y', bubble.r * 0.55).attr('font-size', Math.min(bubble.r * 0.32, 18))
      .attr('opacity', bubble.r > LABEL_MIN_RADIUS ? 0.92 : 0);
  }

  function renderBubbles(stat) {
    // d3.pack calculates the radius and position of each circle so they don't overlap.
    // .hierarchy() builds a tree structure; .sum() sets the value per leaf for the packer.
    // .leaves() returns only the leaf nodes (the actual species, without the root).
    const packedBubbles = d3.pack().size([STAGE_WIDTH - 40, STAGE_HEIGHT - 100]).padding(BUBBLE_PADDING)
      (d3.hierarchy({ children: visData.map(s => ({ ...s, value: valueForStat[stat](s) })) }).sum(s => s.value)).leaves();
    // motionScale = 0 with prefers-reduced-motion: multiply by duration to disable animations.
    const motionScale = reduceMotion() ? 0 : 1;
    // D3 key function (b => b.data.naam) ensures existing bubbles are reused on a stat switch.
    const existing = bubbleLayer.selectAll('.net-bubble').data(packedBubbles, b => b.data.naam);
    // Exiting bubbles shrink to scale(0) before being removed from the DOM.
    existing.exit().transition().duration(500 * motionScale)
      .attr('transform', b => `translate(${b.x}, ${b.y}) scale(0)`).remove();
    // New bubbles start above the canvas (y - FALL_FROM_OFFSET) at scale(0) for the drop effect.
    const entering = existing.enter().append('g')
      .attr('class', 'net-bubble').attr('tabindex', 0).attr('role', 'button')
      .attr('transform', b => `translate(${b.x}, ${b.y - FALL_FROM_OFFSET}) scale(0)`);
    entering.each(function(b) { createBubble(d3.select(this), b); });
    entering.merge(existing).each(function(b) { updateBubble(d3.select(this), b, stat, motionScale); });
    // Stagger incoming bubbles by 70 ms per index so they fall in one by one.
    entering.transition().delay((_, i) => reduceMotion() ? 0 : 200 + i * 70)
      .duration(900 * motionScale).ease(d3.easeCubicOut)
      .attr('transform', b => `translate(${b.x}, ${b.y}) scale(1)`);
    // Existing bubbles slide smoothly to their new position on a stat switch.
    existing.transition().duration(800 * motionScale).ease(d3.easeCubicInOut)
      .attr('transform', b => `translate(${b.x}, ${b.y}) scale(1)`);
  }

  renderBubbles(currentStat);

  $$('.net-toggle-btn').forEach(btn => {
    btn.onclick = () => {
      if (btn.dataset.stat === currentStat) return;
      currentStat = btn.dataset.stat;
      $$('.net-toggle-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      });
      renderBubbles(currentStat);
      if (infoEl) infoEl.textContent = explanationForStat[currentStat];
    };
  });
}

export default function NetChapter() {
  return (
  <section id="ch-net" className="chapter" aria-label="Luchtbelletjes">
      <div className="chapter-inner chapter-split chapter-split--reverse">
        <div className="chapter-text">
          <p className="eyebrow reveal">Luchtbelletjes</p>
          <h2 className="reveal">Elke soort, een eigen bel.</h2>
          <p className="lede reveal">Hoe groter de bel, hoe meer er van die soort voorbijkwam. Een handvol meervallen weegt op tegen een hele school blankvoorns.</p>
          <div className="net-controls-wrap">
            <span className="net-controls-label">Bekijk op</span>
            <div className="net-toggle" role="tablist" aria-label="Verdeling op">
              <button type="button" className="net-toggle-btn" data-stat="count" role="tab" aria-selected="false">Aantal</button>
              <button type="button" className="net-toggle-btn active" data-stat="biomass" role="tab" aria-selected="true">Biomassa</button>
              <button type="button" className="net-toggle-btn" data-stat="weight" role="tab" aria-selected="false">Gewicht / vis</button>
            </div>
          </div>
        </div>
        <div className="chapter-viz">
          <div className="net-stage" id="netStage" aria-label="Bubbel-diagram per soort"></div>
          <div className="net-info" id="netInfo" aria-live="polite">Verdeeld op biomassa: aantal × gewicht.</div>
        </div>
      </div>
    </section>
  );
}
