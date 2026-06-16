import * as d3 from 'd3';
import { C, FONT_BODY, FONT_DISPLAY } from '../../constants.js';
import { $, fmt, reduceMotion } from '../../utils.js';
import { state, lifecycle, raf } from '../../state.js';

export function initFunnel() {
  const { funnelData } = state;
  const { cleanups } = lifecycle;
  const stage = $('#funnelStage');
  const f = funnelData || { uploadedFish: 0, dismissedUploading: 0, total: 0 };
  const total = f.total || 1;
  const upRatio = f.uploadedFish / total;
  const disRatio = f.dismissedUploading / total;

  const W = 820, H = 560;
  const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const defs = svg.append('defs');
  const bellGrad = defs.append('radialGradient').attr('id', 'funnelBell').attr('cx', '38%').attr('cy', '32%');
  bellGrad.append('stop').attr('offset', '0%').attr('stop-color', '#e7dcff');
  bellGrad.append('stop').attr('offset', '55%').attr('stop-color', C.purple);
  bellGrad.append('stop').attr('offset', '100%').attr('stop-color', C.bell);

  const srcX = W / 2, srcY = 70, splitY = 200;
  const trunkW = 56;
  const upEnd  = [560, 458], disEnd = [180, 470];

  svg.append('rect').attr('x', srcX - 150).attr('y', srcY - 30).attr('width', 300).attr('height', 56)
    .attr('rx', 28).attr('fill', C.gold).attr('stroke', C.green).attr('stroke-width', 1);
  svg.append('text').attr('x', srcX).attr('y', srcY - 4).attr('text-anchor', 'middle')
    .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('font-size', 22).attr('fill', C.green).text(fmt(total));
  svg.append('text').attr('x', srcX).attr('y', srcY + 16).attr('text-anchor', 'middle')
    .attr('font-family', FONT_BODY).attr('font-size', 12).attr('fill', C.green).attr('opacity', 0.7).text('keer een vis gespot');

  const disPath = `M${srcX},${srcY + 26} C${srcX},${splitY} ${disEnd[0] + 120},${splitY + 20} ${disEnd[0]},${disEnd[1]}`;
  const upPath  = `M${srcX},${srcY + 26} C${srcX},${splitY} ${upEnd[0] - 40},${splitY + 30} ${upEnd[0]},${upEnd[1]}`;
  const disEl = svg.append('path').attr('d', disPath).attr('fill', 'none')
    .attr('stroke', 'rgba(1,70,60,0.18)').attr('stroke-width', Math.max(trunkW * disRatio, 10)).attr('stroke-linecap', 'round');
  const upEl = svg.append('path').attr('d', upPath).attr('fill', 'none')
    .attr('stroke', 'rgba(155,116,255,0.22)').attr('stroke-width', Math.max(trunkW * upRatio, 9)).attr('stroke-linecap', 'round');

  svg.append('text').attr('x', disEnd[0]).attr('y', disEnd[1] + 30).attr('text-anchor', 'middle')
    .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('font-size', 19).attr('fill', C.green).attr('opacity', 0.8)
    .text(`${Math.round(disRatio * 100)}%`);
  svg.append('text').attr('x', disEnd[0]).attr('y', disEnd[1] + 50).attr('text-anchor', 'middle')
    .attr('font-family', FONT_BODY).attr('font-size', 12).attr('fill', C.green).attr('opacity', 0.6).text('weggeklikt');

  const bell = svg.append('g').attr('class', 'funnel-bell').attr('transform', `translate(${upEnd[0]},${upEnd[1]})`);
  const pulseLayer = bell.append('g');
  bell.append('circle').attr('r', 34).attr('fill', 'url(#funnelBell)').attr('stroke', C.green).attr('stroke-width', 1);
  bell.append('path').attr('d', 'M-10,6 C-10,-6 -5,-12 0,-12 C5,-12 10,-6 10,6 L13,9 L-13,9 Z M-3,11 a3,3 0 0,0 6,0')
    .attr('fill', C.green).attr('transform', 'translate(0,-1) scale(0.9)');
  bell.append('text').attr('x', 0).attr('y', 54).attr('text-anchor', 'middle')
    .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('font-size', 19).attr('fill', C.bell)
    .text(`${(upRatio * 100).toFixed(0)}%`);
  bell.append('text').attr('x', 0).attr('y', 74).attr('text-anchor', 'middle')
    .attr('font-family', FONT_BODY).attr('font-size', 12).attr('fill', C.green).attr('opacity', 0.7).text('aangebeld');

  const leg = $('#funnelLegend');
  if (leg) leg.innerHTML = `
    <div class="funnel-leg-item"><span class="dot" style="background:${C.bell}"></span><b>${fmt(f.uploadedFish)}</b> keer écht aangebeld</div>
    <div class="funnel-leg-item"><span class="dot" style="background:rgba(1,70,60,0.35)"></span><b>${fmt(f.dismissedUploading)}</b> keer weggeklikt</div>`;

  if (reduceMotion) return;

  const upNode = upEl.node(), disNode = disEl.node();
  const upLen = upNode.getTotalLength(), disLen = disNode.getTotalLength();
  const pLayer = svg.append('g').attr('class', 'funnel-particles');
  const mkParts = (n, seedSpeed) => d3.range(n).map(i => ({ p: i / n, sp: seedSpeed * (0.7 + Math.random() * 0.6) }));
  const upParts = mkParts(7, 0.006), disParts = mkParts(20, 0.006);
  const upSel = pLayer.selectAll('.fp-up').data(upParts).join('circle')
    .attr('class', 'fp-up').attr('r', 3.2).attr('fill', C.bell);
  const disSel = pLayer.selectAll('.fp-dis').data(disParts).join('circle')
    .attr('class', 'fp-dis').attr('r', 2.6).attr('fill', C.greenMid);

  let running = false, rafId = 0, lastPulse = 0;
  function pulse() {
    const now = performance.now();
    if (now - lastPulse < 220) return;
    lastPulse = now;
    const ring = pulseLayer.append('circle').attr('r', 30).attr('fill', 'none')
      .attr('stroke', C.bell).attr('stroke-width', 2).attr('opacity', 0.7);
    ring.transition().duration(900).ease(d3.easeCubicOut).attr('r', 64).attr('opacity', 0).remove();
    bell.transition().duration(120).attr('transform', `translate(${upEnd[0]},${upEnd[1]}) scale(1.08)`)
      .transition().duration(220).attr('transform', `translate(${upEnd[0]},${upEnd[1]}) scale(1)`);
  }
  function step() {
    upParts.forEach(d => {
      d.p += d.sp; if (d.p >= 1) { d.p = 0; pulse(); }
      const pt = upNode.getPointAtLength(d.p * upLen);
      d._x = pt.x; d._y = pt.y;
    });
    disParts.forEach(d => {
      d.p += d.sp; if (d.p >= 1) d.p = 0;
      const pt = disNode.getPointAtLength(d.p * disLen);
      d._x = pt.x; d._y = pt.y; d._o = d.p > 0.78 ? Math.max(0, (1 - d.p) / 0.22) : 0.8;
    });
    upSel.attr('cx', d => d._x).attr('cy', d => d._y);
    disSel.attr('cx', d => d._x).attr('cy', d => d._y).attr('opacity', d => d._o);
    if (running) rafId = raf(step);
  }
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!running) { running = true; step(); } }
    else { running = false; cancelAnimationFrame(rafId); }
  }, { threshold: 0.15 });
  io.observe(stage);
  cleanups.push(() => { running = false; cancelAnimationFrame(rafId); io.disconnect(); });
}
