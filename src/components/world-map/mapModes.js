/**
 * mapModes.js
 * Each exported function receives a context object and mutates the D3 SVG
 * selection in-place. They return a legend descriptor that MapLegend renders.
 *
 * Context shape:
 *   { svg, countriesG, overlaysG, proj, pg, cdata, mx, isVisible,
 *     stopAutoRotate, showTT, hideTT, flowRafRef, flowStateRef, modeRef,
 *     C, FISH_COLORS, OS_COLORS, BROWSER_COLORS, CENTROIDS, UTRECHT, W, H }
 */

import * as d3 from 'd3';

// ── 1. Choropleth ─────────────────────────────────────────────────────────────
export function renderChoropleth(ctx) {
  const { countriesG, overlaysG, cdata, mx, C } = ctx;
  const scale = d3.scaleSequentialLog(d3.interpolate('#c8ebe6', '#01463c')).domain([1, mx]);
  countriesG.selectAll('path').attr('fill', d => {
    const c = cdata[d.id]; return c ? scale(c.events) : C.land;
  });
  overlaysG.selectAll('*').remove();
  return { type: 'gradient', title: 'Bezoeken', from: '#c8ebe6', to: '#01463c', lo: 'Weinig', hi: 'Veel' };
}

// ── 2. Bubble ─────────────────────────────────────────────────────────────────
export function renderBubble(ctx) {
  const { countriesG, overlaysG, proj, cdata, mx, isVisible, stopAutoRotate, showTT, hideTT, C, CENTROIDS, W, H } = ctx;
  countriesG.selectAll('path').attr('fill', C.land);
  overlaysG.selectAll('*').remove();
  const rScale = d3.scaleSqrt([0, mx], [0, 22]);

  Object.values(cdata).forEach(c => {
    const coords = CENTROIDS[c.code]; if (!coords) return;
    const [lon, lat] = coords;
    const r = rScale(c.events);
    const [cx, cy] = proj([lon, lat]) || [W / 2, H / 2];

    const g = overlaysG.append('g')
      .attr('class', 'overlay-group')
      .attr('data-lon', lon).attr('data-lat', lat)
      .attr('transform', `translate(${cx},${cy})`)
      .attr('opacity', isVisible(lon, lat) ? 1 : 0)
      .on('mouseover', ev => { stopAutoRotate(); showTT(c, ev); })
      .on('mouseleave', hideTT);

    g.append('circle').attr('r', r * 2).attr('fill', C.green).attr('fill-opacity', 0.08);
    g.append('circle').attr('r', r).attr('fill', C.green).attr('fill-opacity', 0.25)
      .attr('stroke', C.green).attr('stroke-width', 1.5);
    if (r > 6) {
      g.append('text').attr('y', 4).attr('text-anchor', 'middle')
        .attr('fill', C.greenDark)
        .attr('font-size', Math.max(8, Math.min(12, r * 0.55)) + 'px')
        .attr('font-family', 'PT Sans, sans-serif').attr('font-weight', '600')
        .attr('pointer-events', 'none')
        .text(c.events.toLocaleString('nl-NL'));
    }
  });

  return { type: 'rows', title: 'Bellen = bezoeken', rows: [{ color: C.green, circle: true, label: 'Groter = meer' }] };
}

// ── 3. Upload rate ────────────────────────────────────────────────────────────
export function renderUploadRate(ctx) {
  const { countriesG, overlaysG, cdata, C } = ctx;
  const scale = d3.scaleSequential(d3.interpolate('#ff80b9', '#1eacb0')).domain([0, 1]);
  countriesG.selectAll('path').attr('fill', d => {
    const c = cdata[d.id];
    if (!c || c.events === 0) return C.land;
    return scale(c.uploaded / c.events);
  });
  overlaysG.selectAll('*').remove();
  return { type: 'gradient', title: 'Upload ratio', from: '#ff80b9', to: '#1eacb0', lo: 'Gesloten', hi: 'Gespot' };
}

// ── 4. Pies (upload vs dismiss) ───────────────────────────────────────────────
export function renderPies(ctx) {
  const { countriesG, overlaysG, proj, cdata, mx, isVisible, stopAutoRotate, showTT, hideTT, C, CENTROIDS, W, H } = ctx;
  countriesG.selectAll('path').attr('fill', C.land);
  overlaysG.selectAll('*').remove();
  const rScale = d3.scaleSqrt([0, mx], [0, 18]);
  const arc    = d3.arc().innerRadius(0);

  Object.values(cdata).forEach(c => {
    const coords = CENTROIDS[c.code]; if (!coords) return;
    const [lon, lat] = coords;
    const r = Math.max(6, rScale(c.events)); arc.outerRadius(r);
    const total = c.uploaded + c.dismissed; if (!total) return;
    const tau    = 2 * Math.PI;
    const startA = -Math.PI / 2;
    const midA   = startA + (c.uploaded / total) * tau;
    const [cx, cy] = proj([lon, lat]) || [W / 2, H / 2];

    const g = overlaysG.append('g')
      .attr('class', 'overlay-group')
      .attr('data-lon', lon).attr('data-lat', lat)
      .attr('transform', `translate(${cx},${cy})`)
      .attr('opacity', isVisible(lon, lat) ? 1 : 0)
      .on('mouseover', ev => { stopAutoRotate(); showTT(c, ev); })
      .on('mouseleave', hideTT);

    if (c.uploaded  > 0) g.append('path').datum({ startAngle: startA, endAngle: midA       }).attr('d', arc).attr('fill', C.green).attr('fill-opacity', 0.9);
    if (c.dismissed > 0) g.append('path').datum({ startAngle: midA,   endAngle: startA+tau }).attr('d', arc).attr('fill', C.coral).attr('fill-opacity', 0.9);
  });

  return { type: 'rows', title: 'Taarten', rows: [{ color: C.green, label: 'Gespot' }, { color: C.coral, label: 'Gesloten' }] };
}

// ── 5. Flows (animated arcs to Utrecht) ──────────────────────────────────────
export function renderFlows(ctx) {
  const {
    svg, countriesG, overlaysG, proj, cdata, mx,
    isVisible, stopAutoRotate, showTT, hideTT,
    flowRafRef, flowStateRef, modeRef,
    C, CENTROIDS, UTRECHT, W, H,
  } = ctx;

  countriesG.selectAll('path').attr('fill', C.land);
  overlaysG.selectAll('*').remove();
  if (flowRafRef.current) { cancelAnimationFrame(flowRafRef.current); flowRafRef.current = null; }
  flowStateRef.current = null;

  // Ensure glow filter in defs
  const svgDefs = svg.select('defs');
  if (svgDefs.select('#flowGlow').empty()) {
    svgDefs.append('filter').attr('id', 'flowGlow')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
      .html(`<feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
             <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>`);
  }

  const wScale    = d3.scaleSqrt([0, mx], [0.4, 3]);
  const GEO_INTERP = d3.geoInterpolate;
  const arcData   = [];
  const cx0 = W / 2, cy0 = H / 2;

  Object.values(cdata).forEach(c => {
    const coords = CENTROIDS[c.code]; if (!coords) return;
    const [lon, lat] = coords;
    if (Math.abs(lon - UTRECHT[0]) < 2 && Math.abs(lat - UTRECHT[1]) < 2) return;

    const interp  = GEO_INTERP([lon, lat], UTRECHT);
    const steps   = 80;
    const rawPts  = [];
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

  arcData.forEach(d => {
    const g = overlaysG.append('g')
      .attr('class', 'overlay-group flow-arc-g')
      .attr('data-lon', d.lon).attr('data-lat', d.lat)
      .attr('opacity', isVisible(d.lon, d.lat) ? 1 : 0)
      .on('mouseover', ev => { stopAutoRotate(); showTT(d.c, ev); })
      .on('mouseleave', hideTT);

    g.append('path').attr('class', 'flow-trail-glow')
      .attr('fill', 'none').attr('stroke', '#1eacb0')
      .attr('stroke-width', d.width + 2).attr('stroke-opacity', 0.12)
      .attr('stroke-linecap', 'round').attr('filter', 'url(#flowGlow)').attr('pointer-events', 'none');
    g.append('path').attr('class', 'flow-trail')
      .attr('fill', 'none').attr('stroke', '#1eacb0')
      .attr('stroke-width', d.width).attr('stroke-opacity', 0.5)
      .attr('stroke-linecap', 'round').attr('pointer-events', 'none');
    g.append('circle').attr('class', 'flow-particle')
      .attr('r', Math.max(2.5, d.width * 1.2))
      .attr('fill', '#fdf7ef').attr('fill-opacity', 0.9)
      .attr('filter', 'url(#flowGlow)').attr('pointer-events', 'none');
  });

  // Utrecht beacon
  const utG = overlaysG.append('g').attr('class', 'flow-utrecht-beacon').attr('pointer-events', 'none');
  utG.append('circle').attr('class', 'flow-utpulse').attr('r', 9).attr('fill', '#ff80b9').attr('fill-opacity', 0.25);
  utG.append('circle').attr('r', 5).attr('fill', '#ff80b9').attr('stroke', '#01463c').attr('stroke-width', 1.5);
  utG.append('text').attr('y', -10).attr('text-anchor', 'middle')
    .attr('fill', '#01463c').attr('font-size', '8.5px').attr('font-weight', '700')
    .attr('font-family', 'PT Sans, sans-serif').text('Utrecht 📍');

  // Animation loop
  function flowTick(ts) {
    if (modeRef.current !== 'flows') return;
    const arcGs = overlaysG.selectAll('.flow-arc-g').nodes();

    arcData.forEach((d, i) => {
      const pts     = d.points;
      const visible = isVisible(d.lon, d.lat);
      const gEl     = d3.select(arcGs[i]);
      gEl.attr('opacity', visible ? 1 : 0);
      if (!visible) return;

      const lineStr = 'M' + pts.filter(p => p.pt).map(p => `${p.pt[0]},${p.pt[1]}`).join('L');
      gEl.select('.flow-trail-glow').attr('d', lineStr);
      gEl.select('.flow-trail').attr('d', lineStr);

      const phase = (ts * d.speed + d.phase) % 1;
      const idx   = Math.floor(phase * (pts.length - 1));
      const pt0   = pts[idx]?.pt;
      const pt1   = pts[Math.min(idx + 1, pts.length - 1)]?.pt;
      if (pt0 && pt1) {
        const frac = phase * (pts.length - 1) - idx;
        gEl.select('.flow-particle').attr('cx', pt0[0] + (pt1[0] - pt0[0]) * frac).attr('cy', pt0[1] + (pt1[1] - pt0[1]) * frac);
      } else if (pt0) {
        gEl.select('.flow-particle').attr('cx', pt0[0]).attr('cy', pt0[1]);
      }
    });

    const [ux, uy] = proj(UTRECHT) || [W / 2, H / 2];
    const beacon   = overlaysG.select('.flow-utrecht-beacon');
    beacon.attr('transform', `translate(${ux},${uy})`);
    const pulseR = 9 + 5 * Math.abs(Math.sin(ts * 0.002));
    beacon.select('.flow-utpulse').attr('r', pulseR).attr('fill-opacity', 0.15 + 0.15 * Math.abs(Math.sin(ts * 0.002)));

    flowRafRef.current = requestAnimationFrame(flowTick);
  }

  flowRafRef.current = requestAnimationFrame(flowTick);

  return {
    type: 'rows', title: 'Lijnen naar Utrecht', rows: [
      { color: '#1eacb0', line: true, label: 'Dikker = meer bezoeken' },
      { color: '#ff80b9', circle: true, label: 'Utrecht 📍' },
    ],
  };
}

// ── 6. Device split ───────────────────────────────────────────────────────────
export function renderDevice(ctx) {
  const { countriesG, overlaysG, proj, cdata, mx, isVisible, stopAutoRotate, showTT, hideTT, C, CENTROIDS, W, H } = ctx;
  countriesG.selectAll('path').attr('fill', C.land);
  overlaysG.selectAll('*').remove();

  const MOBILE_COLOR  = '#9b74ff';  // --color-purple-bell
  const DESKTOP_COLOR = '#f0af00';  // --color-gold
  const OTHER_COLOR   = '#1eacb0';  // --color-teal
  const rScale = d3.scaleSqrt([0, mx], [0, 18]);
  const arc    = d3.arc().innerRadius(0);

  Object.values(cdata).forEach(c => {
    const coords = CENTROIDS[c.code]; if (!coords) return;
    const [lon, lat] = coords;
    const r = Math.max(6, rScale(c.events)); arc.outerRadius(r);
    const total   = c.events; if (!total) return;
    const mobile  = c.mobile  || 0;
    const desktop = c.desktop || 0;
    const other   = total - mobile - desktop;
    const tau = 2 * Math.PI, s = -Math.PI / 2;
    const m1  = s + (desktop / total) * tau;
    const m2  = m1 + (mobile  / total) * tau;
    const [cx, cy] = proj([lon, lat]) || [W / 2, H / 2];

    const g = overlaysG.append('g')
      .attr('class', 'overlay-group')
      .attr('data-lon', lon).attr('data-lat', lat)
      .attr('transform', `translate(${cx},${cy})`)
      .attr('opacity', isVisible(lon, lat) ? 1 : 0)
      .on('mouseover', ev => { stopAutoRotate(); showTT(c, ev); })
      .on('mouseleave', hideTT);

    if (desktop > 0) g.append('path').datum({ startAngle: s,  endAngle: m1     }).attr('d', arc).attr('fill', DESKTOP_COLOR).attr('fill-opacity', 0.88);
    if (mobile  > 0) g.append('path').datum({ startAngle: m1, endAngle: m2     }).attr('d', arc).attr('fill', MOBILE_COLOR ).attr('fill-opacity', 0.88);
    if (other   > 0) g.append('path').datum({ startAngle: m2, endAngle: s + tau}).attr('d', arc).attr('fill', OTHER_COLOR  ).attr('fill-opacity', 0.88);
  });

  return {
    type: 'rows', title: 'Apparaat', rows: [
      { color: DESKTOP_COLOR, label: 'Desktop/laptop' },
      { color: MOBILE_COLOR,  label: 'Mobiel/tablet'  },
    ],
  };
}

// ── 7. Fish species ───────────────────────────────────────────────────────────
export function renderFish(ctx) {
  const { countriesG, overlaysG, cdata, C, FISH_COLORS } = ctx;
  countriesG.selectAll('path').attr('fill', d => {
    const c = cdata[d.id];
    if (!c || !c.topFish) return C.land;
    return FISH_COLORS[c.topFish] || '#c0a8ff';  // --color-purple fallback
  });
  overlaysG.selectAll('*').remove();
  return {
    type: 'rows', title: 'Meest geziene vis',
    rows: Object.entries(FISH_COLORS).map(([k, v]) => ({ color: v, label: k })),
  };
}

// ── 8. Time of day ────────────────────────────────────────────────────────────
export function renderTime(ctx) {
  const { countriesG, overlaysG, cdata, C } = ctx;
  const hourColor = h => {
    if (h === null) return C.land;
    if (h < 6)  return '#9b74ff';  // --color-purple-bell  (nacht)
    if (h < 12) return '#f0af00';  // --color-gold         (ochtend)
    if (h < 18) return '#1eacb0';  // --color-teal         (middag)
    return '#ff80b9';              // --color-pink         (avond)
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

// ── 9. OS ─────────────────────────────────────────────────────────────────────
export function renderOS(ctx) {
  const { countriesG, overlaysG, cdata, C, OS_COLORS } = ctx;
  countriesG.selectAll('path').attr('fill', d => {
    const c = cdata[d.id];
    if (!c || !c.topOS) return C.land;
    return OS_COLORS[c.topOS] || '#c0a8ff';  // --color-purple fallback
  });
  overlaysG.selectAll('*').remove();
  return {
    type: 'rows', title: 'Meest gebruikt OS',
    rows: Object.entries(OS_COLORS).map(([k, v]) => ({ color: v, label: k })),
  };
}

// ── 10. Browser ───────────────────────────────────────────────────────────────
export function renderBrowser(ctx) {
  const { countriesG, overlaysG, cdata, C, BROWSER_COLORS } = ctx;
  countriesG.selectAll('path').attr('fill', d => {
    const c = cdata[d.id];
    if (!c || !c.topBrowser) return C.land;
    return BROWSER_COLORS[c.topBrowser] || '#c0a8ff';  // --color-purple fallback
  });
  overlaysG.selectAll('*').remove();
  return {
    type: 'rows', title: 'Meest gebruikt browser',
    rows: Object.entries(BROWSER_COLORS).map(([k, v]) => ({ color: v, label: k })),
  };
}

// ── 11. Choropleth + Flows combined ───────────────────────────────────────────
export function renderChoroplethFlows(ctx) {
  const {
    svg, countriesG, overlaysG, proj, cdata, mx,
    isVisible, stopAutoRotate, showTT, hideTT,
    flowRafRef, flowStateRef, modeRef,
    C, CENTROIDS, UTRECHT, W, H,
  } = ctx;

  // — Choropleth fill —
  const scale = d3.scaleSequentialLog(d3.interpolate('#c8ebe6', '#01463c')).domain([1, mx]);
  countriesG.selectAll('path').attr('fill', d => {
    const c = cdata[d.id]; return c ? scale(c.events) : C.land;
  });

  overlaysG.selectAll('*').remove();
  if (flowRafRef.current) { cancelAnimationFrame(flowRafRef.current); flowRafRef.current = null; }
  flowStateRef.current = null;

  // — Glow filter —
  const svgDefs = svg.select('defs');
  if (svgDefs.select('#flowGlow').empty()) {
    svgDefs.append('filter').attr('id', 'flowGlow')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
      .html(`<feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
             <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>`);
  }

  const wScale     = d3.scaleSqrt([0, mx], [0.4, 3]);
  const GEO_INTERP = d3.geoInterpolate;
  const arcData    = [];
  const cx0 = W / 2, cy0 = H / 2;

  Object.values(cdata).forEach(c => {
    const coords = CENTROIDS[c.code]; if (!coords) return;
    const [lon, lat] = coords;
    if (Math.abs(lon - UTRECHT[0]) < 2 && Math.abs(lat - UTRECHT[1]) < 2) return;

    const interp = GEO_INTERP([lon, lat], UTRECHT);
    const steps  = 80;
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

  arcData.forEach(d => {
    const g = overlaysG.append('g')
      .attr('class', 'overlay-group flow-arc-g')
      .attr('data-lon', d.lon).attr('data-lat', d.lat)
      .attr('opacity', isVisible(d.lon, d.lat) ? 1 : 0)
      .on('mouseover', ev => { stopAutoRotate(); showTT(d.c, ev); })
      .on('mouseleave', hideTT);

    g.append('path').attr('class', 'flow-trail-glow')
      .attr('fill', 'none').attr('stroke', '#ffffff')
      .attr('stroke-width', d.width + 2).attr('stroke-opacity', 0.15)
      .attr('stroke-linecap', 'round').attr('filter', 'url(#flowGlow)').attr('pointer-events', 'none');
    g.append('path').attr('class', 'flow-trail')
      .attr('fill', 'none').attr('stroke', '#ffffff')
      .attr('stroke-width', d.width).attr('stroke-opacity', 0.45)
      .attr('stroke-linecap', 'round').attr('pointer-events', 'none');
    g.append('circle').attr('class', 'flow-particle')
      .attr('r', Math.max(2.5, d.width * 1.2))
      .attr('fill', '#ff80b9').attr('fill-opacity', 0.95)
      .attr('filter', 'url(#flowGlow)').attr('pointer-events', 'none');
  });

  // Utrecht beacon
  const utG = overlaysG.append('g').attr('class', 'flow-utrecht-beacon').attr('pointer-events', 'none');
  utG.append('circle').attr('class', 'flow-utpulse').attr('r', 9).attr('fill', '#ff80b9').attr('fill-opacity', 0.25);
  utG.append('circle').attr('r', 5).attr('fill', '#ff80b9').attr('stroke', '#01463c').attr('stroke-width', 1.5);
  utG.append('text').attr('y', -10).attr('text-anchor', 'middle')
    .attr('fill', '#01463c').attr('font-size', '8.5px').attr('font-weight', '700')
    .attr('font-family', 'PT Sans, sans-serif').text('Utrecht 📍');

  // Animation loop
  function flowTick(ts) {
    if (modeRef.current !== 'choropleth_flows') return;
    const arcGs = overlaysG.selectAll('.flow-arc-g').nodes();

    arcData.forEach((d, i) => {
      const pts     = d.points;
      const visible = isVisible(d.lon, d.lat);
      const gEl     = d3.select(arcGs[i]);
      gEl.attr('opacity', visible ? 1 : 0);
      if (!visible) return;

      const lineStr = 'M' + pts.filter(p => p.pt).map(p => `${p.pt[0]},${p.pt[1]}`).join('L');
      gEl.select('.flow-trail-glow').attr('d', lineStr);
      gEl.select('.flow-trail').attr('d', lineStr);

      const phase = (ts * d.speed + d.phase) % 1;
      const idx   = Math.floor(phase * (pts.length - 1));
      const pt0   = pts[idx]?.pt;
      const pt1   = pts[Math.min(idx + 1, pts.length - 1)]?.pt;
      if (pt0 && pt1) {
        const frac = phase * (pts.length - 1) - idx;
        gEl.select('.flow-particle').attr('cx', pt0[0] + (pt1[0] - pt0[0]) * frac).attr('cy', pt0[1] + (pt1[1] - pt0[1]) * frac);
      } else if (pt0) {
        gEl.select('.flow-particle').attr('cx', pt0[0]).attr('cy', pt0[1]);
      }
    });

    const [ux, uy] = proj(UTRECHT) || [W / 2, H / 2];
    const beacon   = overlaysG.select('.flow-utrecht-beacon');
    beacon.attr('transform', `translate(${ux},${uy})`);
    const pulseR = 9 + 5 * Math.abs(Math.sin(ts * 0.002));
    beacon.select('.flow-utpulse').attr('r', pulseR).attr('fill-opacity', 0.15 + 0.15 * Math.abs(Math.sin(ts * 0.002)));

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
export const MODE_RENDERERS = {
  choropleth:        renderChoropleth,
  bubble:            renderBubble,
  uploadrate:        renderUploadRate,
  pies:              renderPies,
  flows:             renderFlows,
  choropleth_flows:  renderChoroplethFlows,
  device:            renderDevice,
  fish:              renderFish,
  time:              renderTime,
  os:                renderOS,
  browser:           renderBrowser,
};