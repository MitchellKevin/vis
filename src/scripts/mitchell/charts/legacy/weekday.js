import * as d3 from 'd3';
import { C, FONT_BODY } from '../../constants.js';
import { $, reduceMotion } from '../../utils.js';
import { legacyState } from './legacy-support.js';

export function initWeekday() {
  const { pondWeekData } = legacyState;
  const stage = $('#weekdayStage');
  const week = pondWeekData;
  if (!week || week.length < 7 * 1440) { stage.innerHTML = '<p class="stage-fallback">Geen weekdata.</p>'; return; }
  const wd = new Array(24).fill(0), we = new Array(24).fill(0);
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) {
    let s = 0; for (let m = 0; m < 60; m++) s += week[d * 1440 + h * 60 + m] || 0;
    if (d < 5) wd[h] += s; else we[h] += s;
  }
  for (let h = 0; h < 24; h++) { wd[h] /= 5; we[h] /= 2; }
  const maxV = Math.max(d3.max(wd), d3.max(we)) || 1;

  const W = 860, H = 420, mL = 48, mR = 24, mT = 28, mB = 46;
  const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const x = d3.scaleLinear().domain([0, 23]).range([mL, W - mR]);
  const y = d3.scaleLinear().domain([0, maxV * 1.12]).range([H - mB, mT]);
  const clip = svg.append('defs').append('clipPath').attr('id', 'wdClip').append('rect')
    .attr('x', 0).attr('y', 0).attr('height', H).attr('width', reduceMotion ? W : 0);

  y.ticks(4).forEach(t => svg.append('line').attr('x1', mL).attr('x2', W - mR).attr('y1', y(t)).attr('y2', y(t))
    .attr('stroke', 'rgba(1,70,60,0.12)').attr('stroke-dasharray', '2 5'));
  [0, 3, 6, 9, 12, 15, 18, 21].forEach(h => svg.append('text').attr('x', x(h)).attr('y', H - mB + 20)
    .attr('text-anchor', 'middle').attr('font-family', FONT_BODY).attr('font-size', 11)
    .attr('fill', C.green).attr('opacity', 0.55).text(`${h}u`));

  const area = d3.area().x((d, i) => x(i)).y0(H - mB).y1(d => y(d)).curve(d3.curveCatmullRom);
  const lineG = d3.line().x((d, i) => x(i)).y(d => y(d)).curve(d3.curveCatmullRom);
  const draw = (data, color, dash) => {
    svg.append('path').datum(data).attr('d', area).attr('fill', color).attr('opacity', 0.1).attr('clip-path', 'url(#wdClip)');
    svg.append('path').datum(data).attr('d', lineG).attr('fill', 'none').attr('stroke', color)
      .attr('stroke-width', 2.5).attr('stroke-dasharray', dash || 'none').attr('clip-path', 'url(#wdClip)');
  };
  draw(wd, C.bell, null);
  draw(we, C.pink, '6 4');
  if (!reduceMotion) clip.transition().duration(1400).ease(d3.easeCubicInOut).attr('width', W);

  const lg = svg.append('g').attr('transform', `translate(${W - mR - 168},${mT})`);
  lg.append('line').attr('x1', 0).attr('x2', 22).attr('y1', 0).attr('y2', 0).attr('stroke', C.bell).attr('stroke-width', 2.5);
  lg.append('text').attr('x', 28).attr('y', 4).attr('font-family', FONT_BODY).attr('font-size', 12).attr('fill', C.green).text('doordeweeks');
  lg.append('line').attr('x1', 0).attr('x2', 22).attr('y1', 18).attr('y2', 18).attr('stroke', C.pink).attr('stroke-width', 2.5).attr('stroke-dasharray', '6 4');
  lg.append('text').attr('x', 28).attr('y', 22).attr('font-family', FONT_BODY).attr('font-size', 12).attr('fill', C.green).text('weekend');

  const wdPeak = wd.indexOf(d3.max(wd)), wePeak = we.indexOf(d3.max(we));
  const stat = $('#weekdayStat');
  if (stat) stat.innerHTML = `Doordeweeks piekt de bel rond <strong>${wdPeak}u</strong>, in het weekend rond <strong>${wePeak}u</strong>.`;
}
