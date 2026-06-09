import * as d3 from 'd3';

// ── Fish species mode ─────────────────────────────────────────────────────────

// Colours each country by its most-seen fish species and returns the legend descriptor
export function renderFish(ctx) {
  const { countriesG, overlaysG, cdata, C, FISH_COLORS } = ctx;
  countriesG.selectAll('path').attr('fill', d => {
    const c = cdata[d.id];
    if (!c || !c.topFish) return C.land;
    return FISH_COLORS[c.topFish] || '#c0a8ff'; // fallback: --color-purple
  });
  // Clear any overlays (flow arcs etc.) left over from the previous mode
  overlaysG.selectAll('*').remove();
  return {
    type: 'rows', title: 'Meest geziene vis',
    rows: Object.entries(FISH_COLORS).map(([k, v]) => ({ color: v, label: k })),
  };
}

// ── Time-of-day mode ──────────────────────────────────────────────────────────

// Colours each country by average active hour, bucketed into night/morning/afternoon/evening
export function renderTime(ctx) {
  const { countriesG, overlaysG, cdata, C } = ctx;
  // Maps an average hour to the brand colour for its time bucket
  const hourColor = h => {
    if (h === null) return C.land;
    if (h < 6)  return '#9b74ff'; // night — --color-purple-bell
    if (h < 12) return '#f0af00'; // morning — --color-gold
    if (h < 18) return '#1eacb0'; // afternoon — --color-teal
    return '#ff80b9';             // evening — --color-pink
  };
  countriesG.selectAll('path').attr('fill', d => {
    const c = cdata[d.id]; return c ? hourColor(c.avgHour) : C.land;
  });
  overlaysG.selectAll('*').remove();
  return {
    type: 'rows', title: 'Actief tijdstip', rows: [
      { color: '#9b74ff', label: 'Nacht (0–6u)'    },
      { color: '#f0af00', label: 'Ochtend (6–12u)' },
      { color: '#1eacb0', label: 'Middag (12–18u)' },
      { color: '#ff80b9', label: 'Avond (18–24u)'  },
    ],
  };
}

// ── Choropleth + animated flow arcs ──────────────────────────────────────────

// Renders a log-scale visit heatmap plus animated great-circle arcs flowing into Utrecht
export function renderChoroplethFlows(ctx) {
  const {
    svg, countriesG, overlaysG, proj, cdata, mx,
    isVisible, stopAutoRotate, showTT, hideTT,
    flowRafRef, flowStateRef, modeRef,
    C, CENTROIDS, UTRECHT, W, H,
  } = ctx;

  // Log-scale sequential colour: light green (few) → dark green (many)
  const scale = d3.scaleSequentialLog(d3.interpolate('#c8ebe6', '#01463c')).domain([1, mx]);
  countriesG.selectAll('path').attr('fill', d => {
    const c = cdata[d.id]; return c ? scale(c.events) : C.land;
  });

  // Clear previous overlays and cancel any running flow animation
  overlaysG.selectAll('*').remove();
  if (flowRafRef.current) { cancelAnimationFrame(flowRafRef.current); flowRafRef.current = null; }
  flowStateRef.current = null;

  // Single shared glow filter — only on the particle dot, not on every trail path
  const svgDefs = svg.select('defs');
  if (svgDefs.select('#flowGlow').empty()) {
    svgDefs.append('filter').attr('id', 'flowGlow')
      .attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%')
      .html('<feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>');
  }

  // Stroke width scales with sqrt(events) so busy countries have thicker arcs
  const wScale     = d3.scaleSqrt([0, mx], [0.4, 3]);
  const GEO_INTERP = d3.geoInterpolate;
  const arcData    = [];
  const cx0 = W / 2, cy0 = H / 2;

  Object.values(cdata).forEach(c => {
    const coords = CENTROIDS[c.code]; if (!coords) return;
    const [lon, lat] = coords;
    if (Math.abs(lon - UTRECHT[0]) < 2 && Math.abs(lat - UTRECHT[1]) < 2) return;

    // 20 steps — smooth enough at globe scale, quarter of original work per frame — visually identical, half the path-string work per frame
    const interp = GEO_INTERP([lon, lat], UTRECHT);
    const steps  = 20;
    const rawPts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const [glon, glat] = interp(t);
      const pt = proj([glon, glat]);
      if (pt) rawPts.push({ pt: pt.slice(), glon, glat, t });
    }
    if (rawPts.length < 2) return;

    const p0 = rawPts[0].pt, p1 = rawPts[rawPts.length - 1].pt;
    const chordLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const maxLift  = Math.max(10, chordLen * 0.30);

    const points = rawPts.map(({ pt, glon, glat, t }) => {
      const dx = pt[0] - cx0, dy = pt[1] - cy0;
      const len = Math.hypot(dx, dy) || 1;
      const lift = maxLift * Math.sin(t * Math.PI);
      return { pt: [pt[0] + (dx / len) * lift, pt[1] + (dy / len) * lift], glon, glat, t, basePt: pt.slice() };
    });

    arcData.push({
      c, lon, lat, points, maxLift,
      width: wScale(c.events),
      phase: Math.random(),
      speed: 0.0004 + (c.events / mx) * 0.0008,
    });
  });

  flowStateRef.current = { arcData };

  // Pre-build cached DOM refs — avoids querySelectorAll every frame
  const arcEls = []; // { gEl, trailEl, particleEl }

  arcData.forEach(d => {
    const g = overlaysG.append('g')
      .attr('class', 'overlay-group flow-arc-g')
      .attr('data-lon', d.lon).attr('data-lat', d.lat)
      .attr('opacity', isVisible(d.lon, d.lat) ? 1 : 0)
      .on('mouseover', ev => { stopAutoRotate(); showTT(d.c, ev); })
      .on('mouseleave', hideTT);

    // Single trail path — no glow filter on the trail (big perf win)
    const trailEl = g.append('path').attr('class', 'flow-trail')
      .attr('fill', 'none').attr('stroke', 'rgba(255,255,255,0.5)')
      .attr('stroke-width', d.width).attr('stroke-linecap', 'round')
      .attr('pointer-events', 'none').node();

    // Glow only on the small particle dot — much cheaper than filtering entire paths
    const particleEl = g.append('circle').attr('class', 'flow-particle')
      .attr('r', Math.max(2.5, d.width * 1.2))
      .attr('fill', '#ff80b9').attr('fill-opacity', 0.95)
      .attr('filter', 'url(#flowGlow)').attr('pointer-events', 'none').node();

    arcEls.push({ gNode: g.node(), trailEl, particleEl });
  });

  // Utrecht beacon — logo image + pulsing ring + label
  const utG = overlaysG.append('g').attr('class', 'flow-utrecht-beacon').attr('pointer-events', 'none');
  // Pulsing glow ring behind the logo
  utG.append('circle').attr('class', 'flow-utpulse').attr('r', 10).attr('fill', '#ff80b9').attr('fill-opacity', 0.25);
  // Logo: 16x16, centred on beacon point
  utG.append('image')
    .attr('href', '/images/visdeurbel-logo.svg')
    .attr('width', 16).attr('height', 16)
    .attr('x', -8).attr('y', -8)
    .attr('transform', 'rotate(-90, 0, 0)'); // rotate 90deg clockwise around the beacon centre
  // Utrecht label above
  utG.append('text').attr('y', -14).attr('text-anchor', 'middle')
    .attr('fill', '#01463c').attr('font-size', '8.5px').attr('font-weight', '700')
    .attr('font-family', 'PT Sans, sans-serif').text('Utrecht');

  const beaconNode  = overlaysG.select('.flow-utrecht-beacon').node();
  const utpulseNode = beaconNode.querySelector('.flow-utpulse');

  // Hot rAF loop — uses raw DOM attrs to avoid D3 selector overhead every frame
  function flowTick(ts) {
    if (modeRef.current !== 'choropleth_flows') return;

    arcData.forEach((d, i) => {
      const pts     = d.points;
      const visible = isVisible(d.lon, d.lat);
      const { gNode, trailEl, particleEl } = arcEls[i];

      gNode.setAttribute('opacity', visible ? '1' : '0');
      if (!visible) return;

      // Build path string — skip null points without allocating a filtered array
      let lineStr = '';
      for (let j = 0; j < pts.length; j++) {
        const p = pts[j].pt;
        if (!p) continue;
        lineStr += (lineStr === '' ? 'M' : 'L') + p[0] + ',' + p[1];
      }
      trailEl.setAttribute('d', lineStr);

      // Particle position
      const phase = (ts * d.speed + d.phase) % 1;
      const idx   = Math.floor(phase * (pts.length - 1));
      const pt0   = pts[idx]?.pt;
      const pt1   = pts[Math.min(idx + 1, pts.length - 1)]?.pt;
      if (pt0 && pt1) {
        const frac = phase * (pts.length - 1) - idx;
        particleEl.setAttribute('cx', pt0[0] + (pt1[0] - pt0[0]) * frac);
        particleEl.setAttribute('cy', pt0[1] + (pt1[1] - pt0[1]) * frac);
      } else if (pt0) {
        particleEl.setAttribute('cx', pt0[0]);
        particleEl.setAttribute('cy', pt0[1]);
      }
    });

    // Utrecht beacon — update every frame so it stays in sync with globe rotation
    const [ux, uy] = proj(UTRECHT) || [W / 2, H / 2];
    beaconNode.setAttribute('transform', `translate(${ux},${uy})`);
    // Pulse is cheap — only recalculate every 3rd frame
    if ((flowTick._frame = ((flowTick._frame || 0) + 1) % 3) === 0) {
      const pulseR = 9 + 5 * Math.abs(Math.sin(ts * 0.002));
      utpulseNode.setAttribute('r', pulseR);
      utpulseNode.setAttribute('fill-opacity', 0.15 + 0.15 * Math.abs(Math.sin(ts * 0.002)));
    }

    flowRafRef.current = requestAnimationFrame(flowTick);
  }

  flowRafRef.current = requestAnimationFrame(flowTick);

  return {
    type: 'rows', title: 'Bezoeken + Lijnen', rows: [
      { color: '#c8ebe6', label: 'Weinig bezoeken' },
      { color: '#01463c', label: 'Veel bezoeken'   },
      { color: '#ff80b9', circle: true, label: 'Stroom naar Utrecht' },
    ],
  };
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

// Maps each mode key to its renderer; GlobeMap calls (MODE_RENDERERS[mode])(ctx)
export const MODE_RENDERERS = {
  choropleth_flows:  renderChoroplethFlows,
  fish:              renderFish,
  time:              renderTime,
};