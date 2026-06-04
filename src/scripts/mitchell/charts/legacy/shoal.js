import * as d3 from 'd3';
import { C, FONT_BODY, FONT_DISPLAY, BROWSER_FAMILY, BROWSER_LABEL, FAMILY } from '../../constants.js';
import { $, fmt, reduceMotion } from '../../utils.js';
import { showTooltip, hideTooltip } from '../../tooltip.js';
import { state, lifecycle, raf } from '../../state.js';

export function initShoal() {
  const { techData } = state;
  const { cleanups } = lifecycle;
  const stage = $('#shoalStage');
  const tech = techData || { browser: {}, device: {}, os: {} };
  const browsers = Object.entries(tech.browser || {}).slice(0, 14)
    .map(([name, count]) => {
      const fam = BROWSER_FAMILY[name] || 'other';
      return { name, label: BROWSER_LABEL[name] || name, count, fam, color: FAMILY[fam].color };
    });
  if (!browsers.length) { stage.innerHTML = '<p class="stage-fallback">Geen apparaatdata.</p>'; return; }

  const browserTotal = d3.sum(browsers, b => b.count);
  const W = 900, H = 540, cx = W / 2, cy = H / 2;
  const maxC = d3.max(browsers, b => b.count);
  const rScale = d3.scaleSqrt().domain([0, maxC]).range([16, 82]);
  browsers.forEach(b => { b.r = rScale(b.count); b.x = cx + (Math.random() - 0.5) * 200; b.y = cy + (Math.random() - 0.5) * 120; });

  const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const node = svg.selectAll('.shoal-bubble').data(browsers).join('g')
    .attr('class', 'shoal-bubble').attr('tabindex', 0).attr('role', 'img')
    .attr('aria-label', d => `${d.label}: ${fmt(d.count)} bellen`);
  node.append('circle').attr('r', d => d.r).attr('fill', d => d.color)
    .attr('opacity', 0.9).attr('stroke', C.off).attr('stroke-width', 1.5);
  node.filter(d => d.r > 26).append('text').attr('text-anchor', 'middle').attr('dy', '-0.15em')
    .attr('font-family', FONT_DISPLAY).attr('font-weight', 800)
    .attr('font-size', d => Math.min(d.r * 0.5, 20)).attr('fill', C.green).attr('pointer-events', 'none')
    .text(d => d.label);
  node.filter(d => d.r > 26).append('text').attr('text-anchor', 'middle').attr('dy', '1.1em')
    .attr('font-family', FONT_BODY).attr('font-size', d => Math.min(d.r * 0.32, 13))
    .attr('fill', C.green).attr('opacity', 0.8).attr('pointer-events', 'none')
    .text(d => `${(d.count / browserTotal * 100).toFixed(0)}%`);

  node.on('mouseenter mousemove', (e, d) => showTooltip(
      `<strong>${d.label}</strong>${fmt(d.count)} bellen · ${(d.count / browserTotal * 100).toFixed(1)}%`, e.clientX, e.clientY))
    .on('mouseleave blur', () => hideTooltip())
    .on('focus', (e, d) => { const bb = e.currentTarget.getBoundingClientRect();
      showTooltip(`<strong>${d.label}</strong>${fmt(d.count)} bellen`, bb.left + bb.width / 2, bb.top); });

  const sim = d3.forceSimulation(browsers)
    .force('x', d3.forceX(cx).strength(0.05))
    .force('y', d3.forceY(cy).strength(0.07))
    .force('charge', d3.forceManyBody().strength(-6))
    .force('collide', d3.forceCollide(d => d.r + 2).strength(0.9))
    .on('tick', () => node.attr('transform', d => `translate(${d.x},${d.y})`));

  if (reduceMotion) {
    sim.stop();
    for (let i = 0; i < 200; i++) sim.tick();
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  } else {
    sim.on('end', () => {
      browsers.forEach(b => { b.bx = b.x; b.by = b.y; b.ph = Math.random() * Math.PI * 2; });
      const t0 = performance.now();
      const bob = () => {
        const t = (performance.now() - t0) / 1000;
        browsers.forEach(b => {
          b.x = b.bx + Math.sin(t * 0.6 + b.ph) * 4;
          b.y = b.by + Math.cos(t * 0.5 + b.ph) * 4;
        });
        node.attr('transform', d => `translate(${d.x},${d.y})`);
        bobId = raf(bob);
      };
      let bobId = raf(bob);
      cleanups.push(() => cancelAnimationFrame(bobId));
    });
  }
  cleanups.push(() => sim.stop());

  const dev = tech.device || {};
  const devTotal = d3.sum(Object.values(dev)) || 1;
  const pctDev = (k) => Math.round((dev[k] || 0) / devTotal * 100);
  const stat = $('#shoalStat');
  if (stat) stat.innerHTML = `<strong>${pctDev('mobile')}%</strong> mobiel · <strong>${pctDev('laptop')}%</strong> laptop · <strong>${pctDev('tablet') + pctDev('desktop')}%</strong> tablet/desktop`;

  const leg = $('#shoalLegend');
  if (leg) {
    const used = [...new Set(browsers.map(b => b.fam))];
    leg.innerHTML = used.map(fam =>
      `<span class="shoal-leg-item"><span class="dot" style="background:${FAMILY[fam].color}"></span>${FAMILY[fam].label}</span>`).join('');
  }
}
