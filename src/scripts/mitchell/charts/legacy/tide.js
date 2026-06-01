import * as d3 from 'd3';
import { C, FONT_BODY, FONT_DISPLAY } from '../../constants.js';
import { $, reduceMotion } from '../../utils.js';
import { state } from '../../state.js';

export function initTide() {
  const { weekHours } = state;
  const stage = $('#tideStage');
  const hourly = new Array(24).fill(0);
  (weekHours || []).forEach((v, i) => { hourly[i % 24] += v || 0; });
  if (!d3.sum(hourly)) { stage.innerHTML = '<p class="stage-fallback">Geen uurdata.</p>'; return; }
  const maxH = d3.max(hourly), minH = d3.min(hourly);
  const peakHour = hourly.indexOf(maxH), lowHour = hourly.indexOf(minH);

  const W = 600, H = 600, cx = W / 2, cy = H / 2, baseR = 92, maxR = 246;
  const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const grad = svg.append('defs').append('radialGradient').attr('id', 'tideGrad');
  grad.append('stop').attr('offset', '30%').attr('stop-color', C.teal).attr('stop-opacity', 0.12);
  grad.append('stop').attr('offset', '75%').attr('stop-color', C.bell).attr('stop-opacity', 0.32);
  grad.append('stop').attr('offset', '100%').attr('stop-color', C.purple).attr('stop-opacity', 0.5);

  [0.25, 0.5, 0.75, 1].forEach(t => svg.append('circle').attr('cx', cx).attr('cy', cy)
    .attr('r', baseR + t * (maxR - baseR)).attr('fill', 'none')
    .attr('stroke', 'rgba(253,247,239,0.08)').attr('stroke-dasharray', '2 6'));

  const aToXY = (a, r) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  for (let h = 0; h < 24; h++) {
    const a = (h / 24) * 2 * Math.PI;
    const [x1, y1] = aToXY(a, maxR + 6), [x2, y2] = aToXY(a, maxR + (h % 6 === 0 ? 16 : 11));
    svg.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
      .attr('stroke', 'rgba(253,247,239,0.25)').attr('stroke-width', h % 6 === 0 ? 1.4 : 0.8);
    if (h % 6 === 0) {
      const [lx, ly] = aToXY(a, maxR + 32);
      svg.append('text').attr('x', lx).attr('y', ly + 4).attr('text-anchor', 'middle')
        .attr('font-family', FONT_BODY).attr('font-size', 13).attr('font-weight', 700)
        .attr('fill', C.off).attr('opacity', 0.8).text(`${String(h).padStart(2, '0')}u`);
    }
  }

  const lineGen = d3.lineRadial().angle((d, i) => (i / 24) * 2 * Math.PI)
    .radius(d => baseR + (d / maxH) * (maxR - baseR)).curve(d3.curveCardinalClosed.tension(0.5));
  const tide = svg.append('g').attr('transform', `translate(${cx},${cy})`)
    .append('path').attr('fill', 'url(#tideGrad)')
    .attr('stroke', C.purple).attr('stroke-width', 2).attr('stroke-opacity', 0.85);
  if (reduceMotion) tide.attr('d', lineGen(hourly));
  else {
    const interp = d3.interpolate(hourly.map(() => 0), hourly);
    tide.transition().duration(1200).ease(d3.easeCubicOut).attrTween('d', () => (t) => lineGen(interp(t)));
  }

  const [px, py] = aToXY((peakHour / 24) * 2 * Math.PI, maxR);
  svg.append('circle').attr('cx', px).attr('cy', py).attr('r', 6).attr('fill', C.pink)
    .attr('stroke', C.off).attr('stroke-width', 1).attr('opacity', reduceMotion ? 1 : 0)
    .transition().delay(reduceMotion ? 0 : 900).duration(400).attr('opacity', 1);

  svg.append('text').attr('x', cx).attr('y', cy - 4).attr('text-anchor', 'middle')
    .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('font-size', 46).attr('fill', C.off)
    .text(`${peakHour}u`);
  svg.append('text').attr('x', cx).attr('y', cy + 24).attr('text-anchor', 'middle')
    .attr('font-family', FONT_BODY).attr('font-size', 14).attr('fill', C.purple).text('hoogtij');

  const stat = $('#tideStat');
  if (stat) stat.innerHTML = `Het stilst rond <strong>${String(lowHour).padStart(2, '0')}u</strong>, hoogtij rond <strong>${String(peakHour).padStart(2, '0')}u</strong> — als Nederland thuiskomt van werk en school.`;
}
