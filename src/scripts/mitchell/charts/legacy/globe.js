import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { C, FONT_BODY, COUNTRY_GEO } from '../../constants.js';
import { $, fmt, reduceMotion } from '../../utils.js';
import { showTooltip, hideTooltip } from '../../tooltip.js';
import { state, lifecycle, raf } from '../../state.js';

export function initGlobe() {
  const { worldTopo, geoData, weekHours } = state;
  const { cleanups } = lifecycle;
  const stage = $('#globeStage');
  if (!worldTopo || !geoData) { stage.innerHTML = '<p class="stage-fallback">Globe kon niet laden.</p>'; return; }
  const hourly = new Array(24).fill(0);
  (weekHours || []).forEach((v, i) => { hourly[i % 24] += v || 0; });
  const maxHourly = d3.max(hourly) || 1;

  const W = 600, H = 600, cx = W / 2, cy = H / 2, R = 248;
  const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const og = svg.append('defs').append('radialGradient').attr('id', 'globeOcean').attr('cx', '40%').attr('cy', '38%');
  og.append('stop').attr('offset', '0%').attr('stop-color', '#0a8a78');
  og.append('stop').attr('offset', '55%').attr('stop-color', C.green);
  og.append('stop').attr('offset', '100%').attr('stop-color', '#01211c');

  const projection = d3.geoOrthographic().scale(R).translate([cx, cy]).clipAngle(90);
  const path = d3.geoPath(projection);
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R).attr('fill', 'url(#globeOcean)')
    .attr('stroke', 'rgba(253,247,239,0.15)').attr('stroke-width', 1);
  const gratPath = svg.append('path').attr('fill', 'none').attr('stroke', 'rgba(253,247,239,0.07)').attr('stroke-width', 0.5);
  const landPath = svg.append('path').attr('fill', 'rgba(253,247,239,0.08)').attr('stroke', 'rgba(253,247,239,0.18)').attr('stroke-width', 0.4);
  const graticule = d3.geoGraticule10();
  const land = topojson.feature(worldTopo, worldTopo.objects.land);

  const counts = geoData.countries || {};
  const pts = Object.entries(COUNTRY_GEO).map(([code, g]) => ({ code, name: g[2], count: counts[code] || 0, ll: [g[0], g[1]] })).filter(p => p.count > 0);
  const maxC = d3.max(pts, p => p.count) || 1;
  const rS = d3.scaleSqrt().domain([0, maxC]).range([1.6, 12]);
  const dots = svg.append('g').selectAll('g.globe-dot').data(pts).join('g').attr('class', 'globe-dot')
    .attr('tabindex', 0).attr('role', 'img').attr('aria-label', p => `${p.name}: ${fmt(p.count)} bel oproepen`);
  dots.append('circle').attr('class', 'gd-glow');
  dots.append('circle').attr('class', 'gd-core').attr('stroke', 'rgba(253,247,239,0.6)').attr('stroke-width', 0.5);
  dots.on('mouseenter mousemove', (e, p) => showTooltip(`<strong>${p.name}</strong>${fmt(p.count)} bel oproepen`, e.clientX, e.clientY))
    .on('mouseleave blur', () => hideTooltip());

  const clockLabel = svg.append('text').attr('x', cx).attr('y', H - 22).attr('text-anchor', 'middle')
    .attr('font-family', FONT_BODY).attr('font-size', 13).attr('font-weight', 700).attr('fill', C.off).attr('opacity', 0.75);

  let gh = 18;
  function render() {
    const S = (12 - gh) * 15;
    projection.rotate([-S, -8]);
    gratPath.attr('d', path(graticule));
    landPath.attr('d', path(land));
    const center = [S, 8];
    dots.attr('transform', p => { const xy = projection(p.ll); return xy ? `translate(${xy[0]},${xy[1]})` : 'translate(-99,-99)'; })
      .attr('opacity', p => d3.geoDistance(p.ll, center) < Math.PI / 2 ? 1 : 0);
    dots.each(function (p) {
      const localH = ((gh + p.ll[0] / 15) % 24 + 24) % 24;
      const act = hourly[Math.floor(localH)] / maxHourly;
      const base = rS(p.count);
      const col = act > 0.6 ? C.pink : act > 0.25 ? C.purple : C.teal;
      const sel = d3.select(this);
      sel.select('.gd-core').attr('r', base).attr('fill', col).attr('opacity', 0.5 + act * 0.5);
      sel.select('.gd-glow').attr('r', base * (1.8 + act * 2.2)).attr('fill', col).attr('opacity', 0.08 + act * 0.4);
    });
    clockLabel.text(`wereldklok ~ ${String(Math.floor(gh) % 24).padStart(2, '0')}:00 — de avond reist mee`);
  }
  render();

  if (reduceMotion) return;
  let raf3 = 0, running = false;
  function tick() { gh = (gh + 0.02) % 24; render(); if (running) raf3 = raf(tick); }
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!running) { running = true; tick(); } }
    else { running = false; cancelAnimationFrame(raf3); }
  }, { threshold: 0.2 });
  io.observe(stage);
  cleanups.push(() => { running = false; cancelAnimationFrame(raf3); io.disconnect(); });
}
