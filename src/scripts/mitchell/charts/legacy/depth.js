import * as d3 from 'd3';
import { C, FONT_BODY } from '../../constants.js';
import { $, fmt, rng, reduceMotion } from '../../utils.js';
import { showTooltip, hideTooltip } from '../../tooltip.js';
import { state, lifecycle, raf } from '../../state.js';
import { fishSymbolId } from './legacy-support.js';

export function initDepth() {
  const { visData } = state;
  const { cleanups } = lifecycle;
  const stage = $('#depthStage');
  if (!stage) return;
  const detail = $('#depthDetail');
  const list = visData.filter(v => v.count > 0).map(v => ({ ...v }));
  if (!list.length) { stage.insertAdjacentHTML('afterbegin', '<p class="stage-fallback">Geen soortdata.</p>'); return; }
  const totalC = d3.sum(list, d => d.count);

  const W = 900, H = 620;
  const svg = d3.select(stage).append('svg').attr('class', 'depth-svg').attr('viewBox', `0 0 ${W} ${H}`);
  const defs = svg.append('defs');
  const ray = defs.append('linearGradient').attr('id', 'depthRay').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1);
  ray.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(30,172,176,0.20)');
  ray.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(30,172,176,0)');

  const rays = svg.append('g').attr('class', 'depth-rays');
  [[-0.05, 90], [0.28, 130], [0.58, 80], [0.82, 150]].forEach(([fx, w], i) => {
    const x = fx * W;
    rays.append('polygon')
      .attr('points', `${x},0 ${x + w},0 ${x + w * 2.2},${H} ${x + w * 1.2},${H}`)
      .attr('fill', 'url(#depthRay)')
      .style('animation', `depth-ray-sway ${9 + i * 2}s ease-in-out ${i * 1.4}s infinite`);
  });

  const bands = [
    { key: 'top', label: 'Oppervlak', y: H * 0.22 },
    { key: 'mid', label: 'Midden', y: H * 0.52 },
    { key: 'bodem', label: 'Bodem', y: H * 0.82 },
  ];
  bands.forEach(b => {
    svg.append('line').attr('x1', 74).attr('x2', W - 18).attr('y1', b.y).attr('y2', b.y)
      .attr('stroke', 'rgba(253,247,239,0.10)').attr('stroke-dasharray', '2 7');
    svg.append('text').attr('x', 16).attr('y', b.y + 4).attr('font-family', FONT_BODY)
      .attr('font-size', 12).attr('font-weight', 700).attr('fill', C.off).attr('opacity', 0.45).text(b.label);
  });

  const snow = d3.range(46).map(() => ({ x: rng() * W, y: rng() * H, r: 0.6 + rng() * 1.6, sp: 7 + rng() * 17, sw: rng() * Math.PI * 2 }));
  const snowSel = svg.append('g').attr('class', 'depth-snow').selectAll('circle').data(snow).join('circle')
    .attr('r', d => d.r).attr('cx', d => d.x).attr('cy', d => d.y).attr('fill', 'rgba(253,247,239,0.5)');

  const byBand = { top: [], mid: [], bodem: [] };
  list.forEach(v => { (byBand[v.diepte] || byBand.mid).push(v); });
  const maxCount = d3.max(list, d => d.count);
  const wScale = d3.scaleSqrt().domain([0, maxCount]).range([44, 150]);
  const nodes = [];
  bands.forEach(b => {
    const arr = byBand[b.key], n = arr.length || 1;
    arr.forEach((v, i) => {
      const w = wScale(v.count);
      const tx = 120 + ((i + 0.5) / n) * (W - 190);
      nodes.push({ ...v, w, h: w * 0.46, tx, ty: b.y, x: tx + (rng() - 0.5) * 60, y: b.y + (rng() - 0.5) * 50, bandLabel: b.label });
    });
  });

  const fishG = svg.append('g').attr('class', 'depth-fishes');
  const node = fishG.selectAll('g.depth-fish').data(nodes).join('g')
    .attr('class', 'depth-fish').attr('tabindex', 0).attr('role', 'img')
    .attr('aria-label', d => `${d.naam}: ${fmt(d.count)} waarnemingen, diepte ${d.bandLabel}`)
    .style('color', d => d.color);
  node.append('ellipse').attr('class', 'depth-glow').attr('rx', d => d.w * 0.72).attr('ry', d => d.h * 1.4)
    .attr('fill', d => d.color).style('animation-delay', () => `${rng() * 4}s`);
  node.append('use').attr('class', 'depth-fish-body')
    .attr('href', d => '#' + fishSymbolId(d.shape))
    .attr('x', d => -d.w / 2).attr('y', d => -d.h / 2).attr('width', d => d.w).attr('height', d => d.h);
  node.append('text').attr('class', 'depth-label').attr('text-anchor', 'middle')
    .attr('y', d => d.h / 2 + 16).attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
    .attr('fill', C.off).text(d => d.naam);

  function activate(d) {
    svg.classed('has-focus', true);
    node.classed('active', n => n === d);
    if (detail) {
      detail.innerHTML = `<strong>${d.naam}</strong>${fmt(d.count)} waarnemingen · ${(d.count / totalC * 100).toFixed(1)}%<br/>Diepte: ${d.bandLabel}<br/>Gewicht: ~${d.weight} kg`;
      detail.classList.add('visible');
    }
  }
  function deactivate() { svg.classed('has-focus', false); node.classed('active', false); if (detail) detail.classList.remove('visible'); }
  node.on('mouseenter mousemove', (e, d) => { activate(d); showTooltip(`<strong>${d.naam}</strong>${fmt(d.count)} waarnemingen`, e.clientX, e.clientY); })
    .on('mouseleave', () => { deactivate(); hideTooltip(); })
    .on('focus', (e, d) => { activate(d); const bb = e.currentTarget.getBoundingClientRect(); showTooltip(`<strong>${d.naam}</strong>${fmt(d.count)} waarnemingen`, bb.left + bb.width / 2, bb.top); })
    .on('blur', () => { deactivate(); hideTooltip(); });

  const place = () => node.attr('transform', d => `translate(${d.x},${d.y})`);
  const sim = d3.forceSimulation(nodes)
    .force('x', d3.forceX(d => d.tx).strength(0.18))
    .force('y', d3.forceY(d => d.ty).strength(0.32))
    .force('collide', d3.forceCollide(d => Math.max(d.w * 0.55, 28)).strength(0.85))
    .on('tick', place);

  if (reduceMotion) {
    sim.stop(); for (let i = 0; i < 240; i++) sim.tick(); place();
    cleanups.push(() => sim.stop());
    return;
  }

  let ended = false;
  sim.on('end', () => { ended = true; nodes.forEach(d => { d.bx = d.x; d.by = d.y; d.ph = rng() * Math.PI * 2; }); });
  let running = false, rafD = 0, prev = 0; const t0 = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - (prev || now)) / 1000); prev = now;
    snow.forEach(p => { p.y += p.sp * dt; p.sw += dt; p.x += Math.sin(p.sw) * 0.25; if (p.y > H + 4) { p.y = -4; p.x = rng() * W; } });
    snowSel.attr('cx', p => p.x).attr('cy', p => p.y);
    if (ended) { const t = (now - t0) / 1000; nodes.forEach(d => { d.x = d.bx + Math.sin(t * 0.5 + d.ph) * 5; d.y = d.by + Math.cos(t * 0.42 + d.ph) * 5; }); place(); }
    if (running) rafD = raf(loop);
  }
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!running) { running = true; rafD = raf(loop); } }
    else { running = false; cancelAnimationFrame(rafD); }
  }, { threshold: 0.15 });
  io.observe(stage);
  cleanups.push(() => { running = false; cancelAnimationFrame(rafD); io.disconnect(); sim.stop(); });
}
