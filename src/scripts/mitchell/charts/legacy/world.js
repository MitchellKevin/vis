import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { COLORS, FONT_DISPLAY, COUNTRY_GEO, UTRECHT } from '../../constants.js';
import { $, formatNumber, reduceMotion } from '../../utils.js';
import { showTooltip, hideTooltip } from '../../tooltip.js';
import { state, lifecycle } from '../../state.js';

// ============================================================================
// world.js — de wereldkaart. Toont per land een stip (grootte = aantal bel-
// oproepen) en bogen vanuit Utrecht. Er is een wereld- en een Europa-weergave;
// die laatste zoomt in met een eigen Mercator-projectie. Gebruikt d3-geo +
// TopoJSON (state.worldTopo) voor de landgrenzen.
// ============================================================================

// Bereik waarbinnen we landen en punten als 'Europa' beschouwen.
const EUROPE_LNG = [-15, 35], EUROPE_LAT = [34, 65];

export function initWorld() {
  const { worldTopo, geoData } = state;
  const { cleanups } = lifecycle;
  const stage = $('#worldStage');
  if (!worldTopo || !geoData) { stage.innerHTML = '<p class="stage-fallback">Kaart kon niet geladen worden.</p>'; return; }

  // UI — toggle bovenaan, plus container voor de SVG
  stage.innerHTML = '';
  const toggle = document.createElement('div');
  toggle.className = 'world-toggle';
  toggle.setAttribute('role', 'tablist');
  toggle.setAttribute('aria-label', 'Kaart-bereik');
  toggle.innerHTML = `
    <button type="button" class="world-toggle-btn is-active" data-view="world" role="tab" aria-selected="true">Wereld</button>
    <button type="button" class="world-toggle-btn" data-view="europe" role="tab" aria-selected="false">Europa</button>
  `;
  stage.appendChild(toggle);
  const svgHost = document.createElement('div');
  svgHost.className = 'world-svg-host';
  stage.appendChild(svgHost);

  let currentView = 'world';

  function render(view) {
    d3.select(svgHost).selectAll('svg').remove();

    const W = 980, H = 540, m = 12;
    const svg = d3.select(svgHost).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

    let projection;
    if (view === 'europe') {
      // Expliciete Mercator op Europa — fitExtent zoomt niet ver genoeg in
      projection = d3.geoMercator()
        .center([9, 50])
        .scale(680)
        .translate([W / 2, H / 2]);
    } else {
      const sphere = { type: 'Sphere' };
      projection = d3.geoNaturalEarth1().fitExtent([[m, m], [W - m, H - m]], sphere);
      svg.append('path').attr('d', d3.geoPath(projection)(sphere))
        .attr('fill', 'rgba(1,70,60,0.04)')
        .attr('stroke', 'rgba(1,70,60,0.18)').attr('stroke-width', 0.8);
    }
    const path = d3.geoPath(projection);

    // Clip alles op de SVG-viewBox zodat in Europa-view randen schoon zijn
    const clipId = 'worldClip-' + Math.random().toString(36).slice(2, 8);
    svg.append('defs').append('clipPath').attr('id', clipId)
      .append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', H);
    const main = svg.append('g').attr('clip-path', `url(#${clipId})`);

    main.append('path').attr('d', path(d3.geoGraticule10()))
      .attr('fill', 'none').attr('stroke', 'rgba(1,70,60,0.08)').attr('stroke-width', 0.5);

    // Bij Europa alleen landen tekenen waarvan het zwaartepunt binnen het
    // Europa-bereik valt — zo zien we niet de hele wereld klein in beeld.
    const allCountries = topojson.feature(worldTopo, worldTopo.objects.countries).features;
    const inEuropeBounds = (lng, lat) =>
      lng >= EUROPE_LNG[0] && lng <= EUROPE_LNG[1]
      && lat >= EUROPE_LAT[0] && lat <= EUROPE_LAT[1];
    const countries = view === 'europe'
      ? allCountries.filter(c => {
          const [lng, lat] = d3.geoCentroid(c);
          return inEuropeBounds(lng, lat);
        })
      : allCountries;
    main.append('g').selectAll('path').data(countries).join('path')
      .attr('d', path).attr('fill', 'rgba(1,70,60,0.07)')
      .attr('stroke', 'rgba(1,70,60,0.22)').attr('stroke-width', 0.4);

    // bel oproepen per land → punten
    const counts = geoData.countries || {};
    const allPts = Object.entries(COUNTRY_GEO)
      .map(([code, g]) => ({ code, name: g[2], count: counts[code] || 0, lnglat: [g[0], g[1]] }))
      .filter(p => p.count > 0)
      .sort((a, b) => b.count - a.count);

    // Voor Europa alleen punten binnen het zichtbare gebied tonen
    const inEurope = (p) => {
      const lng = p.lnglat[0], lat = p.lnglat[1];
      return lng >= EUROPE_LNG[0] && lng <= EUROPE_LNG[1]
          && lat >= EUROPE_LAT[0] && lat <= EUROPE_LAT[1];
    };
    const pts = view === 'europe' ? allPts.filter(inEurope) : allPts;

    const maxC = d3.max(pts, p => p.count) || 1;
    // Bij Europa kleinere bollen zodat de clusters rond NL/DE/BE niet
    // over elkaar heen lopen.
    const rRange = view === 'europe' ? [2.5, 13] : [2, 18];
    // scaleSqrt: de oppervlakte (niet de straal) schaalt mee met het aantal,
    // zodat de stippen visueel eerlijk te vergelijken zijn.
    const rScale = d3.scaleSqrt().domain([0, maxC]).range(rRange);
    // Geen paars-familie hier: die zou wegvallen op de violette sectie.
    const colorFor = (v) => { const r = v / maxC; return r > 0.45 ? COLORS.pink : r > 0.12 ? COLORS.goldDeep : COLORS.teal; };

    // Bogen alleen in wereld-view — bij Europa zijn ze te kort en chaotisch
    const [ux, uy] = projection(UTRECHT);
    if (view !== 'europe') {
      const arcLayer = svg.append('g').attr('class', 'world-arcs');
      pts.slice(0, 12).forEach((p, i) => {
        if (p.code === 'NL') return;
        const [x0, y0] = projection(p.lnglat);
        const mx = (x0 + ux) / 2, my = (y0 + uy) / 2;
        const dx = ux - x0, dy = uy - y0;
        const len = Math.hypot(dx, dy) || 1;
        const lift = Math.min(len * 0.28, 120);
        const cxp = mx - (dy / len) * lift, cyp = my + (dx / len) * lift;
        const arc = arcLayer.append('path')
          .attr('class', 'world-arc')
          .attr('d', `M${x0},${y0} Q${cxp},${cyp} ${ux},${uy}`)
          .attr('fill', 'none').attr('stroke', COLORS.green).attr('stroke-width', 1.1)
          .attr('opacity', 0).attr('stroke-linecap', 'round');
        arc.transition().delay(reduceMotion() ? 0 : 600 + i * 90).duration(700).attr('opacity', 0.45);
      });
    }

    // de punten
    const dotLayer = svg.append('g');
    pts.forEach((p, i) => {
      const [x, y] = projection(p.lnglat);
      const r = rScale(p.count), col = colorFor(p.count);
      const g = dotLayer.append('g')
        .attr('class', 'world-dot').attr('transform', `translate(${x},${y})`)
        .attr('tabindex', i < 5 ? 0 : -1).attr('role', 'img')
        .attr('aria-label', `${p.name}: ${formatNumber(p.count)} bel oproepen`);
      g.append('circle').attr('class', 'world-dot-glow').attr('r', 0).attr('fill', col).attr('opacity', 0.15);
      const core = g.append('circle').attr('class', 'world-dot-core').attr('r', 0)
        .attr('fill', col).attr('opacity', 0.92)
        .attr('stroke', 'rgba(1,70,60,0.45)').attr('stroke-width', 0.6);
      g.select('.world-dot-glow').transition().delay(reduceMotion() ? 0 : i * 18).duration(500).attr('r', r * 1.9);
      core.transition().delay(reduceMotion() ? 0 : i * 18).duration(500).attr('r', r);

      const pct = ((p.count / geoData.total) * 100);
      const pctStr = pct >= 0.1 ? pct.toFixed(1) : '<0,1';
      const tip = `<strong>${p.name}</strong>${formatNumber(p.count)} bel oproepen · ${pctStr}%`;
      g.on('mouseenter mousemove', (e) => showTooltip(tip, e.clientX, e.clientY))
       .on('mouseleave blur', () => hideTooltip())
       .on('focus', () => { const bb = g.node().getBoundingClientRect(); showTooltip(tip, bb.left + bb.width / 2, bb.top); });
    });

    // Utrecht: de sluis — bij Europa compactere marker omdat de kaart krap is
    const ut = svg.append('g').attr('transform', `translate(${ux},${uy})`);
    const ringR = view === 'europe' ? 4 : 6;
    const coreR = view === 'europe' ? 3 : 4;
    const labelOff = view === 'europe' ? -10 : -14;
    const labelSize = view === 'europe' ? 10 : 13;
    [0, 1, 2].forEach(k => ut.append('circle').attr('class', 'world-utrecht-ring')
      .attr('r', ringR).attr('fill', 'none').attr('stroke', COLORS.goldDeep).attr('stroke-width', 1.4)
      .style('animation-delay', `${k * 0.9}s`));
    ut.append('circle').attr('r', coreR).attr('fill', COLORS.goldDeep);
    ut.append('text').attr('x', 0).attr('y', labelOff).attr('text-anchor', 'middle')
      .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('font-size', labelSize)
      .attr('fill', COLORS.goldDeep).text('Utrecht');
  }

  function setView(view) {
    if (view === currentView) return;
    currentView = view;
    toggle.querySelectorAll('.world-toggle-btn').forEach(b => {
      const on = b.dataset.view === view;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    render(view);
  }
  const onClick = (e) => {
    const btn = e.target.closest('button[data-view]');
    if (btn) setView(btn.dataset.view);
  };
  toggle.addEventListener('click', onClick);
  cleanups.push(() => toggle.removeEventListener('click', onClick));

  render(currentView);

  // dynamische kop-cijfers — blijft hetzelfde ongeacht view
  const cc = $('#worldCountryCount'); if (cc) cc.textContent = String(Object.keys(geoData.countries).length);
  const top5 = Object.entries(COUNTRY_GEO)
    .map(([code, g]) => ({ code, name: g[2], count: (geoData.countries || {})[code] || 0 }))
    .filter(p => p.count > 0).sort((a, b) => b.count - a.count).slice(0, 5)
    .map(p => p.name).join(' · ');
  const stat = $('#worldStat');
  if (stat) stat.innerHTML = `Samen goed voor <strong>${formatNumber(geoData.total)}</strong> bel oproepen.<br><span class="world-top">Grootste bellers: ${top5}</span>`;
}
