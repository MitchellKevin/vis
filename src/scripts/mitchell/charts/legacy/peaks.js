import * as d3 from 'd3';
import { C, FONT_BODY, FONT_DISPLAY, MONTH_SHORT_NL } from '../../constants.js';
import { $, fmt, reduceMotion } from '../../utils.js';
import { showTooltip, hideTooltip } from '../../tooltip.js';
import { state } from '../../state.js';
import { legacyState } from './legacy-support.js';

export function initPeaks() {
  const { weekDayLabels, weekDays } = state;
  const { dailyData } = legacyState;
  const stage = $('#peaksStage');
  if (!dailyData) { stage.innerHTML = '<p class="stage-fallback">Geen dagdata.</p>'; return; }
  const entries = Object.entries(dailyData).sort((a, b) => (+a[0]) - (+b[0]))
    .map(([, v], i) => ({ i, label: weekDayLabels[i] || '', value: +v }));

  const W = 880, H = 420, mL = 54, mR = 24, mT = 28, mB = 46;
  const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const x = d3.scaleLinear().domain([0, entries.length - 1]).range([mL, W - mR]);
  const maxV = d3.max(entries, d => d.value);
  const y = d3.scaleLinear().domain([0, maxV * 1.12]).range([H - mB, mT]);

  const defs = svg.append('defs');
  const grad = defs.append('linearGradient').attr('id', 'peaksGrad').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1);
  grad.append('stop').attr('offset', '0%').attr('stop-color', C.bell).attr('stop-opacity', 0.55);
  grad.append('stop').attr('offset', '100%').attr('stop-color', C.teal).attr('stop-opacity', 0.05);
  const clip = defs.append('clipPath').attr('id', 'peaksClip').append('rect')
    .attr('x', 0).attr('y', 0).attr('height', H).attr('width', reduceMotion ? W : 0);

  y.ticks(4).forEach(t => {
    svg.append('line').attr('x1', mL).attr('x2', W - mR).attr('y1', y(t)).attr('y2', y(t))
      .attr('stroke', 'rgba(1,70,60,0.12)').attr('stroke-dasharray', '2 5');
    svg.append('text').attr('x', mL - 8).attr('y', y(t) + 4).attr('text-anchor', 'end')
      .attr('font-family', FONT_BODY).attr('font-size', 11).attr('fill', C.green).attr('opacity', 0.5).text(fmt(t));
  });

  const area = d3.area().x(d => x(d.i)).y0(H - mB).y1(d => y(d.value)).curve(d3.curveCatmullRom.alpha(0.6));
  const lineG = d3.line().x(d => x(d.i)).y(d => y(d.value)).curve(d3.curveCatmullRom.alpha(0.6));
  svg.append('path').datum(entries).attr('d', area).attr('fill', 'url(#peaksGrad)').attr('clip-path', 'url(#peaksClip)');
  svg.append('path').datum(entries).attr('d', lineG).attr('fill', 'none')
    .attr('stroke', C.bell).attr('stroke-width', 2.5).attr('clip-path', 'url(#peaksClip)');
  if (!reduceMotion) clip.transition().duration(1500).ease(d3.easeCubicInOut).attr('width', W);

  // X-as labels: bij veel dagen één label per maand, anders elke ~5e dag
  if (entries.length > 14) {
    const seenMonths = new Set();
    entries.forEach(d => {
      const dateStr = weekDays[d.i];
      if (!dateStr) return;
      const dt = new Date(dateStr);
      if (Number.isNaN(dt.getTime())) return;
      const key = `${dt.getUTCFullYear()}-${dt.getUTCMonth()}`;
      if (seenMonths.has(key)) return;
      seenMonths.add(key);
      const xPos = x(d.i);
      svg.append('line').attr('x1', xPos).attr('x2', xPos).attr('y1', H - mB).attr('y2', H - mB + 6)
        .attr('stroke', C.green).attr('opacity', 0.35).attr('stroke-width', 1);
      svg.append('text').attr('x', xPos).attr('y', H - mB + 22).attr('text-anchor', 'middle')
        .attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
        .attr('fill', C.green).attr('opacity', 0.75).text(MONTH_SHORT_NL[dt.getUTCMonth()]);
    });
  } else {
    entries.forEach(d => {
      svg.append('text').attr('x', x(d.i)).attr('y', H - mB + 20).attr('text-anchor', 'middle')
        .attr('font-family', FONT_BODY).attr('font-size', 11).attr('fill', C.green).attr('opacity', 0.6).text(d.label);
    });
  }

  const peak = entries.reduce((a, b) => b.value > a.value ? b : a, entries[0]);
  svg.append('circle').attr('cx', x(peak.i)).attr('cy', y(peak.value)).attr('r', 5).attr('fill', C.pink)
    .attr('stroke', C.off).attr('stroke-width', 1.5);
  svg.append('text').attr('x', x(peak.i)).attr('y', y(peak.value) - 14).attr('text-anchor', 'middle')
    .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('font-size', 15).attr('fill', C.green)
    .text(`${peak.label} · ${fmt(peak.value)}`);
  svg.append('text').attr('x', x(peak.i)).attr('y', y(peak.value) - 30).attr('text-anchor', 'middle')
    .attr('font-family', FONT_BODY).attr('font-size', 11).attr('fill', C.green).attr('opacity', 0.6).text('piekdag');

  const guide = svg.append('line').attr('y1', mT).attr('y2', H - mB)
    .attr('stroke', C.green).attr('stroke-width', 1).attr('opacity', 0);
  const focus = svg.append('circle').attr('r', 4).attr('fill', C.bell).attr('stroke', C.off).attr('stroke-width', 1.5).attr('opacity', 0);
  svg.append('rect').attr('x', mL).attr('y', mT).attr('width', W - mR - mL).attr('height', H - mB - mT)
    .attr('fill', 'transparent').style('cursor', 'crosshair')
    .on('mousemove', (e) => {
      const [mx] = d3.pointer(e, svg.node());
      const i = Math.max(0, Math.min(entries.length - 1, Math.round(x.invert(mx))));
      const d = entries[i];
      guide.attr('x1', x(d.i)).attr('x2', x(d.i)).attr('opacity', 0.3);
      focus.attr('cx', x(d.i)).attr('cy', y(d.value)).attr('opacity', 1);
      showTooltip(`<strong>${d.label}</strong>${fmt(d.value)} bel oproepen`, e.clientX, e.clientY);
    })
    .on('mouseleave', () => { guide.attr('opacity', 0); focus.attr('opacity', 0); hideTooltip(); });

  const stat = $('#peaksStat');
  if (stat) stat.innerHTML = `Op de drukste dag (<strong>${peak.label}</strong>) ging de bel <strong>${fmt(peak.value)}</strong> keer.`;
}
