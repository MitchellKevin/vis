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

export function initLanguages() {
  const { languagesData } = state;
  const { cleanups } = lifecycle;
  const stage = $('#langStage');
  const list = (languagesData || []).slice(0, 24).map(d => {
    const g = GREETINGS[d.code] || ['Hallo', d.code.toUpperCase()];
    return { code: d.code, n: d.n, greeting: g[0], name: g[1] };
  });
  if (!list.length) { stage.innerHTML = '<p class="stage-fallback">Geen taaldata.</p>'; return; }
  const total = d3.sum(list, d => d.n);
  const maxVisitors = d3.max(list, d => d.n);
  // Lettergrootte 15..70px, geschaald op √bezoekers (eerlijke oppervlakte).
  const fontScale = d3.scaleSqrt().domain([0, maxVisitors]).range([15, 70]);
  // Geen paars-familie: die valt weg op de violette sectie-achtergrond.
  const palette = [COLORS.green, COLORS.greenMid, COLORS.teal, COLORS.pink, COLORS.goldDeep];

  const W = 900, H = 540, cx = W / 2, cy = H / 2;
  list.forEach((d, i) => {
    d.size = fontScale(d.n);
    d.color = palette[i % palette.length];
    d.rad = Math.max(d.greeting.length * d.size * 0.3, d.size * 0.62) + 6;
    d.x = cx + (Math.random() - 0.5) * 260;
    d.y = cy + (Math.random() - 0.5) * 160;
  });

  const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const node = svg.selectAll('g.lang-word').data(list).join('g').attr('class', 'lang-word')
    .attr('tabindex', 0).attr('role', 'img').attr('aria-label', d => `${d.name}: ${formatNumber(d.n)} bezoekers`);
  node.append('text').attr('text-anchor', 'middle').attr('dy', '0.34em')
    .attr('font-family', FONT_DISPLAY).attr('font-weight', 800)
    .attr('font-size', d => d.size).attr('fill', d => d.color).text(d => d.greeting);
  node.filter(d => d.size > 30).append('text').attr('text-anchor', 'middle')
    .attr('dy', d => d.size * 0.62 + 12).attr('font-family', FONT_BODY).attr('font-size', 11)
    .attr('fill', COLORS.green).attr('opacity', 0.55).text(d => d.name);

  node.on('mouseenter mousemove', (e, d) => showTooltip(
      `<strong>${d.name}</strong>${formatNumber(d.n)} bezoekers · ${(d.n / total * 100).toFixed(1)}%`, e.clientX, e.clientY))
    .on('mouseleave blur', () => hideTooltip())
    .on('focus', (e, d) => { const bb = e.currentTarget.getBoundingClientRect(); showTooltip(`<strong>${d.name}</strong>${formatNumber(d.n)} bezoekers`, bb.left + bb.width / 2, bb.top); });

  // Force-simulatie: x/y trekken zacht naar het midden, charge duwt licht af,
  // en collide voorkomt dat woorden over elkaar vallen. Elke 'tick' updaten we
  // de posities.
  const simulation = d3.forceSimulation(list)
    .force('x', d3.forceX(cx).strength(0.04))
    .force('y', d3.forceY(cy).strength(0.06))
    .force('charge', d3.forceManyBody().strength(-4))
    .force('collide', d3.forceCollide(d => d.rad).strength(0.9))
    .on('tick', () => node.attr('transform', d => `translate(${d.x},${d.y})`));

  if (reduceMotion()) {
    simulation.stop(); for (let i = 0; i < 220; i++) simulation.tick();
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  } else {
    simulation.on('end', () => {
      list.forEach(d => { d.bx = d.x; d.by = d.y; d.ph = Math.random() * Math.PI * 2; });
      const startTime = performance.now();
      const bob = () => {
        const t = (performance.now() - startTime) / 1000;
        list.forEach(d => { d.x = d.bx + Math.sin(t * 0.5 + d.ph) * 5; d.y = d.by + Math.cos(t * 0.45 + d.ph) * 5; });
        node.attr('transform', d => `translate(${d.x},${d.y})`);
        bobId = raf(bob);
      };
      let bobId = raf(bob);
      cleanups.push(() => cancelAnimationFrame(bobId));
    });
  }
  cleanups.push(() => simulation.stop());

  const stat = $('#langStat');
  if (stat) stat.innerHTML = `In totaal klinken er <strong>${(languagesData || []).length}</strong> verschillende talen rond de sluis.`;
}
