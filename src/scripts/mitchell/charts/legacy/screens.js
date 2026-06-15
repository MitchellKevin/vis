import * as d3 from 'd3';
import { C, FONT_BODY } from '../../constants.js';
import { $, fmt, reduceMotion } from '../../utils.js';
import { showTooltip, hideTooltip } from '../../tooltip.js';
import { lifecycle, raf } from '../../state.js';
import { legacyState } from './legacy-support.js';

export function initScreens() {
  const { screensData, orientationData } = legacyState;
  const { cleanups } = lifecycle;
  const stage = $('#screensStage');
  const list = (screensData || []).map(d => ({ ...d, ar: d.w / d.h, portrait: d.w < d.h }));
  if (!list.length) { stage.innerHTML = '<p class="stage-fallback">Geen schermdata.</p>'; return; }
  const maxN = d3.max(list, d => d.n);
  const sScale = d3.scaleSqrt().domain([0, maxN]).range([0, 1]);
  const W = 900, H = 540, cx = W / 2, cy = H / 2;
  list.forEach(d => {
    const base = 46 + sScale(d.n) * 188;
    d.w2 = base * Math.sqrt(d.ar);
    d.h2 = base / Math.sqrt(d.ar);
    d.diag = Math.hypot(d.w2, d.h2);
    d.x = cx + (Math.random() - 0.5) * 220;
    d.y = cy + (Math.random() - 0.5) * 140;
  });
  list.sort((a, b) => b.n - a.n);

  const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const g = svg.selectAll('g.screen-win').data(list).join('g').attr('class', 'screen-win')
    .attr('tabindex', 0).attr('role', 'img').attr('aria-label', d => `${d.w}×${d.h}: ${fmt(d.n)} keer`);
  g.append('rect').attr('x', d => -d.w2 / 2).attr('y', d => -d.h2 / 2)
    .attr('width', d => d.w2).attr('height', d => d.h2).attr('rx', 7)
    .attr('fill', d => d.portrait ? 'rgba(30,172,176,0.16)' : 'rgba(155,116,255,0.16)')
    .attr('stroke', d => d.portrait ? C.teal : C.bell).attr('stroke-width', 1.5);
  const big = g.filter(d => d.w2 > 78 && d.h2 > 46);
  big.append('text').attr('text-anchor', 'middle').attr('dy', '-0.1em')
    .attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
    .attr('fill', C.off).attr('opacity', 0.85).text(d => `${d.w}×${d.h}`);
  big.append('text').attr('text-anchor', 'middle').attr('dy', '1.2em')
    .attr('font-family', FONT_BODY).attr('font-size', 10).attr('fill', C.off).attr('opacity', 0.55).text(d => fmt(d.n));

  g.on('mouseenter mousemove', (e, d) => showTooltip(
      `<strong>${d.w}×${d.h}</strong>${fmt(d.n)} keer · ${d.portrait ? 'staand' : 'liggend'}`, e.clientX, e.clientY))
    .on('mouseleave blur', () => hideTooltip())
    .on('focus', (e, d) => { const bb = e.currentTarget.getBoundingClientRect(); showTooltip(`<strong>${d.w}×${d.h}</strong>${fmt(d.n)} keer`, bb.left + bb.width / 2, bb.top); });

  const sim = d3.forceSimulation(list)
    .force('x', d3.forceX(cx).strength(0.05))
    .force('y', d3.forceY(cy).strength(0.06))
    .force('collide', d3.forceCollide(d => d.diag / 2 * 0.6).strength(0.6))
    .on('tick', () => g.attr('transform', d => `translate(${d.x},${d.y})`));
  if (reduceMotion) { sim.stop(); for (let i = 0; i < 200; i++) sim.tick(); g.attr('transform', d => `translate(${d.x},${d.y})`); }
  else {
    sim.on('end', () => {
      list.forEach(d => { d.bx = d.x; d.by = d.y; d.ph = Math.random() * Math.PI * 2; });
      const t0 = performance.now();
      const bob = () => {
        const t = (performance.now() - t0) / 1000;
        list.forEach(d => { d.x = d.bx + Math.sin(t * 0.45 + d.ph) * 4; d.y = d.by + Math.cos(t * 0.4 + d.ph) * 4; });
        g.attr('transform', d => `translate(${d.x},${d.y})`);
        bobId = raf(bob);
      };
      let bobId = raf(bob);
      cleanups.push(() => cancelAnimationFrame(bobId));
    });
  }
  cleanups.push(() => sim.stop());

  const o = orientationData || { portrait: 0, landscape: 0, total: 1 };
  const stat = $('#screensStat');
  if (stat) stat.innerHTML = `<strong>${Math.round(o.portrait / o.total * 100)}%</strong> kijkt staand (telefoon), <strong>${Math.round(o.landscape / o.total * 100)}%</strong> liggend${o.unique ? ` — uit <strong>${fmt(o.unique)}</strong> verschillende schermformaten` : ''}.`;
  const leg = $('#screensLegend');
  if (leg) leg.innerHTML =
    `<span class="shoal-leg-item"><span class="dot" style="background:${C.teal}"></span>staand (telefoon/tablet)</span>` +
    `<span class="shoal-leg-item"><span class="dot" style="background:${C.bell}"></span>liggend (laptop/desktop)</span>`;
}
