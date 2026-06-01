import * as d3 from 'd3';
import { C, FONT_BODY, FONT_DISPLAY, GREETINGS } from '../constants.js';
import { $, fmt, reduceMotion } from '../utils.js';
import { showTooltip, hideTooltip } from '../tooltip.js';
import { state, lifecycle, raf } from '../state.js';

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
  const maxN = d3.max(list, d => d.n);
  const fs = d3.scaleSqrt().domain([0, maxN]).range([15, 70]);
  const palette = [C.green, C.bell, C.teal, C.pink, C.goldDeep];

  const W = 900, H = 540, cx = W / 2, cy = H / 2;
  list.forEach((d, i) => {
    d.size = fs(d.n);
    d.color = palette[i % palette.length];
    d.rad = Math.max(d.greeting.length * d.size * 0.3, d.size * 0.62) + 6;
    d.x = cx + (Math.random() - 0.5) * 260;
    d.y = cy + (Math.random() - 0.5) * 160;
  });

  const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const node = svg.selectAll('g.lang-word').data(list).join('g').attr('class', 'lang-word')
    .attr('tabindex', 0).attr('role', 'img').attr('aria-label', d => `${d.name}: ${fmt(d.n)} bezoekers`);
  node.append('text').attr('text-anchor', 'middle').attr('dy', '0.34em')
    .attr('font-family', FONT_DISPLAY).attr('font-weight', 800)
    .attr('font-size', d => d.size).attr('fill', d => d.color).text(d => d.greeting);
  node.filter(d => d.size > 30).append('text').attr('text-anchor', 'middle')
    .attr('dy', d => d.size * 0.62 + 12).attr('font-family', FONT_BODY).attr('font-size', 11)
    .attr('fill', C.green).attr('opacity', 0.55).text(d => d.name);

  node.on('mouseenter mousemove', (e, d) => showTooltip(
      `<strong>${d.name}</strong>${fmt(d.n)} bezoekers · ${(d.n / total * 100).toFixed(1)}%`, e.clientX, e.clientY))
    .on('mouseleave blur', () => hideTooltip())
    .on('focus', (e, d) => { const bb = e.currentTarget.getBoundingClientRect(); showTooltip(`<strong>${d.name}</strong>${fmt(d.n)} bezoekers`, bb.left + bb.width / 2, bb.top); });

  const sim = d3.forceSimulation(list)
    .force('x', d3.forceX(cx).strength(0.04))
    .force('y', d3.forceY(cy).strength(0.06))
    .force('charge', d3.forceManyBody().strength(-4))
    .force('collide', d3.forceCollide(d => d.rad).strength(0.9))
    .on('tick', () => node.attr('transform', d => `translate(${d.x},${d.y})`));

  if (reduceMotion) {
    sim.stop(); for (let i = 0; i < 220; i++) sim.tick();
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  } else {
    sim.on('end', () => {
      list.forEach(d => { d.bx = d.x; d.by = d.y; d.ph = Math.random() * Math.PI * 2; });
      const t0 = performance.now();
      const bob = () => {
        const t = (performance.now() - t0) / 1000;
        list.forEach(d => { d.x = d.bx + Math.sin(t * 0.5 + d.ph) * 5; d.y = d.by + Math.cos(t * 0.45 + d.ph) * 5; });
        node.attr('transform', d => `translate(${d.x},${d.y})`);
        bobId = raf(bob);
      };
      let bobId = raf(bob);
      cleanups.push(() => cancelAnimationFrame(bobId));
    });
  }
  cleanups.push(() => sim.stop());

  const stat = $('#langStat');
  if (stat) stat.innerHTML = `In totaal klinken er <strong>${(languagesData || []).length}</strong> verschillende talen rond de sluis.`;
}
