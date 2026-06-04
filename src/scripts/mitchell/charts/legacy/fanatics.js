import * as d3 from 'd3';
import { C, FONT_BODY } from '../../constants.js';
import { $, fmt, reduceMotion } from '../../utils.js';
import { state } from '../../state.js';

export function initFanatics() {
  const { sessionsData } = state;
  const stage = $('#fanaticsStage');
  const s = sessionsData;
  if (!s || !s.hist) { stage.innerHTML = '<p class="stage-fallback">Geen sessiedata.</p>'; return; }
  const hist = s.hist;
  const W = 720, H = 430, mL = 64, mR = 96, mT = 38, mB = 30;
  const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const x = d3.scaleSqrt().domain([0, d3.max(hist, d => d.n)]).range([mL, W - mR]);
  const y = d3.scaleBand().domain(hist.map(d => String(d.r))).range([mT, H - mB]).padding(0.24);
  const col = (i) => d3.interpolateRgb(C.teal, C.pink)(i / (hist.length - 1));

  svg.append('text').attr('x', mL).attr('y', 20).attr('font-family', FONT_BODY).attr('font-size', 13)
    .attr('font-weight', 700).attr('fill', C.off).attr('opacity', 0.7)
    .text('bel oproepen per bezoek — aantal bezoeken (√-schaal)');

  const rows = svg.selectAll('g.fan-row').data(hist).join('g').attr('class', 'fan-row');
  rows.append('rect').attr('x', mL).attr('y', d => y(String(d.r))).attr('height', y.bandwidth()).attr('rx', 5)
    .attr('fill', (d, i) => col(i)).attr('width', 0)
    .transition().delay((d, i) => reduceMotion ? 0 : i * 45).duration(650).ease(d3.easeCubicOut)
    .attr('width', d => Math.max(x(d.n) - mL, 1));
  rows.append('text').attr('x', mL - 10).attr('y', d => y(String(d.r)) + y.bandwidth() / 2 + 4).attr('text-anchor', 'end')
    .attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700).attr('fill', C.off).attr('opacity', 0.8)
    .text(d => `${d.r}×`);
  rows.append('text').attr('x', d => Math.max(x(d.n) - mL, 1) + mL + 7).attr('y', d => y(String(d.r)) + y.bandwidth() / 2 + 4)
    .attr('font-family', FONT_BODY).attr('font-size', 11).attr('fill', C.off).attr('opacity', 0)
    .text(d => fmt(d.n))
    .transition().delay((d, i) => reduceMotion ? 0 : i * 45 + 400).duration(300).attr('opacity', 0.65);

  const ringPct = Math.round(s.ringers / s.totalSessions * 100);
  const top1 = Math.round(s.topShare.p1 * 100);
  const stat = $('#fanaticsStat');
  if (stat) stat.innerHTML = `Eén bezoek belde maar liefst <strong>${fmt(s.maxRings)}</strong> keer. Slechts <strong>${ringPct}%</strong> van de bezoeken belt überhaupt — en de drukste <strong>1%</strong> is samen goed voor <strong>${top1}%</strong> van álle bel oproepen.`;
}
