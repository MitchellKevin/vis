import * as d3 from 'd3';
import { C, FONT_BODY, MONTH_FULL } from '../constants.js';
import { $, fmt, mulberry32, reduceMotion } from '../utils.js';
import { ensureTintFilter, fishImagePath } from '../fishImage.js';
import { state, lifecycle, raf } from '../state.js';

export function initRadar() {
  const { visData } = state;
  const { cleanups } = lifecycle;
  const W = 620, H = 620, cx = W / 2, cy = H / 2, R = 270;
  const svg = d3.select($('#radarStage')).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

  for (let i = 1; i <= 4; i++) {
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R * i / 4)
      .attr('fill', 'none').attr('stroke', 'rgba(1,70,60,0.14)').attr('stroke-dasharray', '2 6');
  }
  [['x1', cx - R, 'y1', cy, 'x2', cx + R, 'y2', cy],
   ['x1', cx, 'y1', cy - R, 'x2', cx, 'y2', cy + R]].forEach(([k1, v1, k2, v2, k3, v3, k4, v4]) => {
    svg.append('line').attr(k1, v1).attr(k2, v2).attr(k3, v3).attr(k4, v4)
      .attr('stroke', 'rgba(1,70,60,0.1)');
  });

  const grad = svg.append('defs').append('linearGradient').attr('id', 'radarSweep')
    .attr('x1', 0).attr('y1', 0).attr('x2', 1).attr('y2', 0);
  grad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(1,70,60,0.0)');
  grad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(1,70,60,0.22)');

  const sweep = svg.append('path')
    .attr('d', `M ${cx} ${cy} L ${cx + R} ${cy} A ${R} ${R} 0 0 0 ${cx + Math.cos(-Math.PI / 4) * R} ${cy + Math.sin(-Math.PI / 4) * R} Z`)
    .attr('fill', 'url(#radarSweep)').attr('opacity', 0.6);
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 5).attr('fill', C.green);

  // Afstand tot het midden = inverse van waarnemingen: vaakst gezien dicht bij
  // het scherm, zeldzaam aan de rand. Hoeken willekeurig met rejection sampling
  // zodat soorten elkaar niet overlappen.
  const pingSeed = mulberry32(42);
  const counts = visData.map(v => v.count || 0);
  const maxC = Math.max(...counts, 1);
  const positiveCounts = counts.filter(c => c > 0);
  const minC = positiveCounts.length ? Math.min(...positiveCounts) : maxC;
  const innerD = 70, outerD = R - 55;
  const dscale = d3.scaleSqrt().domain([minC, maxC]).range([outerD, innerD]).clamp(true);
  const minGap = 70; // minimale onderlinge afstand in px
  const pings = [];
  visData.forEach(v => {
    const distance = v.count > 0
      ? dscale(v.count) + (pingSeed() - 0.5) * 22
      : outerD + 10;
    let best = null, bestScore = -Infinity;
    for (let t = 0; t < 60; t++) {
      const angle = pingSeed() * Math.PI * 2;
      const px = cx + Math.cos(angle) * distance;
      const py = cy + Math.sin(angle) * distance;
      const nearest = pings.reduce((m, p) => Math.min(m, Math.hypot(p.x - px, p.y - py)), Infinity);
      if (nearest >= minGap) { best = { angle, x: px, y: py }; break; }
      if (nearest > bestScore) { bestScore = nearest; best = { angle, x: px, y: py }; }
    }
    pings.push({ ...v, ...best });
  });

  const detailPanel = $('#radarDetail');
  const pingsGroup = svg.append('g');
  pings.forEach(p => {
    const g = pingsGroup.append('g')
      .attr('class', 'radar-ping').attr('data-naam', p.naam)
      .attr('transform', `translate(${p.x}, ${p.y})`)
      .attr('opacity', 0).attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', `${p.naam}: ${fmt(p.count)} waarnemingen`);
    g.append('circle').attr('class', 'radar-ping-bg').attr('r', 18).attr('fill', p.color).attr('opacity', 0.18);
    g.append('circle').attr('r', 8).attr('fill', p.color).attr('opacity', 0.6);
    const tint = ensureTintFilter(svg, p.color);
    g.append('g').attr('class', 'fish-wiggle')
      .append('image').attr('href', fishImagePath(p.naam))
      .attr('x', -22).attr('y', -14).attr('width', 44).attr('height', 28)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('filter', `url(#${tint})`);
    // Label rechts van de vis, tenzij het dan de rand raakt; idem voor links
    let labelRight = p.x > cx;
    const labelText = `${p.naam} · ${fmt(p.count)}`;
    const estW = labelText.length * 7 + 26;
    if (labelRight && p.x + estW > W - 6) labelRight = false;
    else if (!labelRight && p.x - estW < 6) labelRight = true;
    g.append('text')
      .attr('x', labelRight ? 26 : -26).attr('y', 4)
      .attr('text-anchor', labelRight ? 'start' : 'end')
      .attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
      .attr('fill', C.green).attr('opacity', 0.85)
      .text(labelText);

    const showDetail = () => {
      pingsGroup.selectAll('.radar-ping').classed('selected', false);
      g.classed('selected', true);
      detailPanel.innerHTML = `<strong>${p.naam}</strong>${fmt(p.count)} waarnemingen<br/>Piek: ${MONTH_FULL[p.monthly.indexOf(Math.max(...p.monthly))]}<br/>Diepte: ${p.diepte}<br/>Gewicht: ~${p.weight} kg`;
      detailPanel.classList.add('visible');
    };
    g.on('click', showDetail);
    g.on('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDetail(); } });
    p.elem = g;
  });

  let angle = -Math.PI / 2, raf2 = 0, running = false;
  const revealed = new Set();
  function tick() {
    angle += reduceMotion ? 0.03 : 0.01;
    sweep.attr('transform', `rotate(${angle * 180 / Math.PI} ${cx} ${cy})`);
    pings.forEach((p, i) => {
      const da = (Math.atan2(p.y - cy, p.x - cx) - angle + Math.PI * 4) % (Math.PI * 2);
      if (!revealed.has(i) && da < 0.18) { revealed.add(i); p.elem.transition().duration(300).attr('opacity', 1); }
    });
    if (running) raf2 = raf(tick);
  }
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { if (!running) { running = true; tick(); } }
    else { running = false; cancelAnimationFrame(raf2); }
  }, { threshold: 0.2 });
  io.observe($('#radarStage'));
  cleanups.push(() => { running = false; cancelAnimationFrame(raf2); io.disconnect(); });
}
