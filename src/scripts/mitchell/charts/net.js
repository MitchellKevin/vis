import * as d3 from 'd3';
import { C, FONT_DISPLAY } from '../constants.js';
import { $, $$, fmt, reduceMotion } from '../utils.js';
import { ensureTintFilter, fishImagePath } from '../fishImage.js';
import { state, lifecycle } from '../state.js';

export function initNet() {
  const { visData } = state;
  const { cleanups } = lifecycle;
  const host = $('#netStage');
  const info = $('#netInfo');
  const W = 900, H = 680;
  const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

  // het net dat van bovenaf zakt
  const netGroup = svg.append('g');
  const meshBot = 380;
  for (let i = 0; i <= 16; i++) {
    const x = (i / 16) * W;
    netGroup.append('path').attr('class', 'net-rope')
      .attr('d', `M ${x} 0 Q ${x + Math.sin(i) * 12} 200, ${x + Math.sin(i + 0.5) * 30} ${meshBot}`);
  }
  for (let j = 0; j <= 8; j++) {
    const y = (j / 8) * meshBot, r = 8 + j * 2;
    netGroup.append('path').attr('class', 'net-rope').attr('d', `M 0 ${y} Q ${W / 2} ${y + r}, ${W} ${y}`);
  }
  netGroup.append('line').attr('x1', 0).attr('y1', 0).attr('x2', W).attr('y2', 0)
    .attr('stroke', 'rgb(1 70 60 / 0.45)').attr('stroke-width', 2);
  netGroup.attr('transform', 'translate(0,-200)')
    .transition().delay(reduceMotion ? 0 : 300).duration(reduceMotion ? 0 : 1400).attr('transform', 'translate(0,0)');

  const bubbleGroup = svg.append('g').attr('transform', 'translate(20, 80)');
  const defs = svg.append('defs');
  let currentStat = 'biomass';

  const statFn = { count: d => d.count, weight: d => d.weight, biomass: d => d.count * d.weight };
  const statLabel = {
    count:   v => `${fmt(v.count)} waarnemingen`,
    weight:  v => `~${v.weight} kg per vis`,
    biomass: v => `${fmt(v.count * v.weight)} kg biomassa (${fmt(v.count)} × ${v.weight} kg)`,
  };
  const explainer = {
    count: 'Verdeeld op aantal waarnemingen.',
    weight: 'Verdeeld op gemiddeld gewicht per vis.',
    biomass: 'Verdeeld op biomassa: aantal × gewicht.',
  };

  function renderPack(stat) {
    const packData = visData.map(v => ({ ...v, value: statFn[stat](v) }));
    const pack = d3.pack().size([W - 40, H - 100]).padding(8);
    const root = d3.hierarchy({ children: packData }).sum(d => d.value);
    const nodes = pack(root).leaves();
    const D = reduceMotion ? 0 : 1;

    const sel = bubbleGroup.selectAll('.net-bubble').data(nodes, d => d.data.naam);
    sel.exit().transition().duration(500 * D).attr('transform', d => `translate(${d.x}, ${d.y}) scale(0)`).remove();

    const enter = sel.enter().append('g')
      .attr('class', 'net-bubble').attr('tabindex', 0).attr('role', 'button')
      .attr('transform', d => `translate(${d.x}, ${d.y - 200}) scale(0)`);

    enter.each(function (d) {
      const g = d3.select(this);
      const gradId = `bubGrad-${d.data.naam.replace(/\W/g, '')}`;
      const grad = defs.append('radialGradient').attr('id', gradId).attr('cx', '35%').attr('cy', '30%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', C.off).attr('stop-opacity', 0.7);
      grad.append('stop').attr('offset', '50%').attr('stop-color', d.data.color).attr('stop-opacity', 0.55);
      grad.append('stop').attr('offset', '100%').attr('stop-color', d.data.color).attr('stop-opacity', 0.85);
      g.append('circle').attr('class', 'bub-main').attr('r', d.r).attr('fill', `url(#${gradId})`)
        .attr('stroke', 'rgb(1 70 60 / 0.28)').attr('stroke-width', 1);
      g.append('circle').attr('class', 'bub-shine').attr('cx', -d.r * 0.3).attr('cy', -d.r * 0.3).attr('r', d.r * 0.25)
        .attr('fill', 'rgb(253 247 239 / 0.45)');
      g.append('g').attr('class', 'bub-fish').style('color', d.data.color);
      g.append('text').attr('class', 'bub-label').attr('text-anchor', 'middle')
        .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('fill', C.green);
    });

    const all = enter.merge(sel);
    all.each(function (d) {
      const g = d3.select(this);
      const fishSize = Math.min(d.r * 1.4, 96);
      const tint = ensureTintFilter(svg, d.data.color);
      g.select('.bub-fish').html(
        `<image href="${fishImagePath(d.data.naam)}" x="${-fishSize / 2}" y="${-fishSize / 3}" width="${fishSize}" height="${fishSize / 1.8}" preserveAspectRatio="xMidYMid meet" filter="url(#${tint})"/>`
      );
      g.attr('aria-label', `${d.data.naam}: ${statLabel[stat](d.data)}`);
      const setInfo = () => { info.textContent = `${d.data.naam} — ${statLabel[stat](d.data)}.`; };
      g.on('click', setInfo).on('mouseenter', setInfo)
        .on('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setInfo(); } });
      g.select('.bub-main').transition().duration(800 * D).attr('r', d.r);
      g.select('.bub-shine').transition().duration(800 * D).attr('cx', -d.r * 0.3).attr('cy', -d.r * 0.3).attr('r', d.r * 0.25);
      g.select('.bub-label').transition().duration(800 * D)
        .attr('y', d.r * 0.55).attr('font-size', Math.min(d.r * 0.32, 18)).attr('opacity', d.r > 28 ? 0.92 : 0);
    });
    enter.transition().delay((d, i) => (reduceMotion ? 0 : 200 + i * 70)).duration(900 * D).ease(d3.easeCubicOut)
      .attr('transform', d => `translate(${d.x}, ${d.y}) scale(1)`);
    sel.transition().duration(800 * D).ease(d3.easeCubicInOut)
      .attr('transform', d => `translate(${d.x}, ${d.y}) scale(1)`);
  }
  renderPack(currentStat);
  if (info) info.textContent = explainer[currentStat];

  // toggle — onclick i.p.v. addEventListener zodat er bij hertekenen niets opstapelt
  $$('.net-toggle-btn').forEach(btn => {
    const on = btn.dataset.stat === currentStat;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', String(on));
    btn.onclick = () => {
      if (btn.dataset.stat === currentStat) return;
      currentStat = btn.dataset.stat;
      $$('.net-toggle-btn').forEach(b => {
        const a = b.dataset.stat === currentStat;
        b.classList.toggle('active', a);
        b.setAttribute('aria-selected', String(a));
      });
      renderPack(currentStat);
      if (info) info.textContent = explainer[currentStat];
    };
  });
  cleanups.push(() => { $$('.net-toggle-btn').forEach(b => { b.onclick = null; }); });
}
