import * as d3 from 'd3';
import { UNKNOWN_VALS } from './constants.js';

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
    rows: Object.entries(FISH_COLORS).filter(([k]) => !UNKNOWN_VALS.includes(k)).map(([k, v]) => ({ color: v, label: k })),
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

  // Add the glow blur filter once; reuse it on subsequent renders
  const svgDefs = svg.select('defs');
  if (svgDefs.select('#flowGlow').empty()) {
    svgDefs.append('filter').attr('id', 'flowGlow')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
      .html(`<feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>\n             <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>`);
  }

  // Stroke width scales with sqrt(events) so busy countries have thicker arcs
  const wScale     = d3.scaleSqrt([0, mx], [0.4, 3]);
  const GEO_INTERP = d3.geoInterpolate; // great-circle interpolation between two points
  const arcData    = [];
  const cx0 = W / 2, cy0 = H / 2; // canvas centre used to compute radial lift direction

  Object.values(cdata).forEach(c => {
    const coords = CENTROIDS[c.code]; if (!coords) return;
    const [lon, lat] = coords;
    // Skip Utrecht itself to avoid a zero-length arc
    if (Math.abs(lon - UTRECHT[0]) < 2 && Math.abs(lat - UTRECHT[1]) < 2) return;

    // Sample 80 points along the great-circle path from this country to Utrecht
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

    // Compute how far to bow the arc outward from the globe centre
    const p0 = rawPts[0].pt, p1 = rawPts[rawPts.length - 1].pt;
    const chordLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const maxLift  = Math.max(10, chordLen * 0.30); // minimum 10 px so short arcs still bow

    // Apply radial lift: zero at endpoints, max at the midpoint (sine curve)
    const points = rawPts.map(({ pt, glon, glat, t }) => {
      const dx = pt[0] - cx0, dy = pt[1] - cy0;
      const len = Math.hypot(dx, dy) || 1;
      const lift = maxLift * Math.sin(t * Math.PI);
      return { pt: [pt[0] + (dx / len) * lift, pt[1] + (dy / len) * lift], glon, glat, t, basePt: pt.slice() };
    });

    arcData.push({
      c, lon, lat, points, maxLift,
      width: wScale(c.events),
      phase: Math.random(),                          // stagger particle start positions
      speed: 0.0006, // uniform speed so all lines feel consistent
    });
  });

  // Store arc data so redrawAll() can reproject it after globe rotation
  flowStateRef.current = { arcData };

  // Create three SVG elements per arc: glow trail, solid trail, travelling particle
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

  // Utrecht beacon — inlined Visdeurbel logo, pulsing ring, label
  const utG = overlaysG.append('g').attr('class', 'flow-utrecht-beacon').attr('pointer-events', 'none');
  // Pulsing glow ring behind the logo
  utG.append('circle').attr('class', 'flow-utpulse').attr('r', 18).attr('fill', '#ff80b9').attr('fill-opacity', 0.20);
  // Inlined logo paths — scale(0.036) maps 554px SVG to ~20px, translate centres it, rotate(-90) turns CCW
  const logoG = utG.append('g')
    .attr('transform', 'rotate(-90) scale(0.036) translate(-277, -241)');
  logoG.append('path').attr('fill', '#F0AF00')
    .attr('d', 'M91.5367 265.238C89.5855 304.604 56.9269 336.043 17.0732 336.043C13.878 336.043 11.2926 333.458 11.2926 330.263L11.2926 303.921C11.2926 280.336 19.8049 258.043 35.3659 240.555C19.8049 223.068 11.2926 200.775 11.2926 177.189L11.2926 150.848C11.2926 147.653 13.878 145.067 17.0732 145.067C56.9269 145.067 89.5611 176.482 91.5367 215.848');
  logoG.append('path').attr('fill', '#01463C')
    .attr('d', 'M3.11616e-05 330.264L3.2313e-05 303.922C3.33163e-05 280.971 7.34146 258.8 20.8293 240.556C7.34146 222.312 3.68494e-05 200.141 3.78527e-05 177.19L3.90041e-05 150.849C3.94156e-05 141.434 7.65855 133.775 17.0732 133.775C62.8538 133.775 100.537 169.58 102.805 215.288C103.098 221.532 98.3173 226.824 92.0733 227.141C85.8294 227.459 80.5367 222.654 80.2197 216.41C78.6343 184.605 53.7806 159.312 22.5854 156.605L22.5854 177.166C22.5854 197.824 30.122 217.654 43.805 233.019C47.6099 237.312 47.6099 243.776 43.805 248.068C30.122 263.41 22.5854 283.263 22.5854 303.922L22.5854 324.483C53.7806 321.776 78.6343 296.483 80.2197 264.678C80.5367 258.434 85.8294 253.654 92.0733 253.946C98.3173 254.263 103.147 259.556 102.805 265.8C100.537 311.507 62.8538 347.337 17.0732 347.337C7.65854 347.337 3.07501e-05 339.678 3.11616e-05 330.264Z');
  logoG.append('path').attr('fill', '#F0AF00')
    .attr('d', 'M91.5368 414.725L91.5368 66.4072C91.5368 44.3584 104.073 25.0901 124.22 16.1633C144.391 7.21202 167.073 10.8706 183.415 25.6755L209.366 49.2121C219.488 58.3828 232.586 63.4316 246.22 63.4316L364.586 63.4316C387.001 63.4316 408.854 67.578 429.562 75.7243C462.269 88.6268 490.172 110.773 510.269 139.749C530.855 169.432 542.562 204.31 542.562 240.554C542.562 276.798 530.855 311.652 510.269 341.359C490.172 370.359 462.269 392.505 429.562 405.383C408.854 413.554 387.001 417.676 364.586 417.676L246.22 417.676C232.561 417.676 219.464 422.725 209.366 431.896L183.415 455.432C167.073 470.237 144.391 473.896 124.22 464.945C104.049 456.018 91.5368 436.749 91.5368 414.701L91.5368 414.725Z');
  logoG.append('path').attr('fill', '#01463C')
    .attr('d', 'M80.2197 414.727L80.2197 66.4088C80.2197 39.8234 95.3173 16.6039 119.634 5.82338C143.952 -4.95713 171.293 -0.566877 191 17.3112L216.976 40.8478C225 48.1161 235.391 52.1405 246.244 52.1405L364.611 52.1405C388.464 52.1405 411.708 56.5552 433.733 65.2381C468.513 78.9699 498.22 102.506 519.586 133.36C542.025 165.751 553.904 202.824 553.904 240.604C553.904 278.385 542.05 315.458 519.586 347.848C498.22 378.678 468.538 402.239 433.733 415.97C411.708 424.653 388.464 429.068 364.61 429.068L246.244 429.068C235.391 429.068 225 433.092 216.976 440.361L191.025 463.897C171.317 481.751 143.976 486.166 119.659 475.385C95.3417 464.605 80.2441 441.385 80.2441 414.8L80.2197 414.727ZM531.269 240.58C531.269 207.433 520.806 174.799 500.977 146.214C482.172 119.067 456.025 98.3357 425.415 86.2626C406.05 78.6284 385.586 74.7503 364.586 74.7503L246.22 74.7503C229.757 74.7503 213.976 68.6528 201.781 57.604L175.805 34.0673C162.83 22.3112 144.805 19.4088 128.781 26.5063C112.756 33.6039 102.805 48.8966 102.805 66.4332L102.805 414.775C102.805 432.288 112.756 447.605 128.781 454.702C144.805 461.8 162.83 458.897 175.805 447.141L201.757 423.605C213.976 412.531 229.757 406.458 246.22 406.458L364.586 406.458C385.586 406.458 406.05 402.58 425.415 394.946C456.025 382.873 482.172 362.141 500.977 334.995C520.781 306.409 531.269 273.775 531.269 240.629L531.269 240.58Z');
  logoG.append('path').attr('fill', '#A172FF')
    .attr('d', 'M380.098 185.434C380.098 200.723 392.492 213.117 407.781 213.117C423.07 213.117 435.464 200.723 435.464 185.434C435.464 170.145 423.07 157.751 407.781 157.751C392.492 157.751 380.098 170.145 380.098 185.434Z');
  logoG.append('path').attr('fill', '#01463C')
    .attr('d', 'M368.806 185.434C368.806 163.946 386.293 146.458 407.781 146.458C429.269 146.458 446.757 163.946 446.757 185.434C446.757 206.922 429.269 224.409 407.781 224.409C386.293 224.409 368.806 206.922 368.806 185.434ZM424.147 185.434C424.147 176.409 416.806 169.068 407.781 169.068C398.757 176.409 391.415 176.409 391.415 185.434C391.415 194.458 398.757 201.8 407.781 201.8C416.806 201.8 424.147 194.458 424.147 185.434Z');
  logoG.append('path').attr('fill', '#01463C')
    .attr('d', 'M447.611 285.41C447.611 279.166 452.659 274.117 458.903 274.117C465.147 274.117 470.196 279.166 470.196 285.41C470.196 306.8 487.611 324.215 509.001 324.215C515.245 324.215 520.294 329.264 520.294 335.508C520.294 341.751 515.245 346.8 509.001 346.8C475.147 346.8 447.586 319.239 447.586 285.386L447.611 285.41Z');
  // Utrecht label above the logo
  utG.append('text').attr('y', -16).attr('text-anchor', 'middle')
    .attr('fill', '#01463c').attr('font-size', '9px').attr('font-weight', '700')
    .attr('font-family', 'PT Sans, sans-serif').text('Utrecht');

  // rAF loop: advances particle positions and updates the Utrecht beacon each frame
  function flowTick(ts) {
    if (modeRef.current !== 'choropleth_flows') return; // bail if mode changed
    const arcGs = overlaysG.selectAll('.flow-arc-g').nodes();

    arcData.forEach((d, i) => {
      const pts     = d.points;
      const visible = isVisible(d.lon, d.lat);
      const gEl     = d3.select(arcGs[i]);
      gEl.attr('opacity', visible ? 1 : 0);
      if (!visible) return; // skip arcs on the back of the globe

      // Rebuild the full path string from projected points
      const lineStr = 'M' + pts.filter(p => p.pt).map(p => `${p.pt[0]},${p.pt[1]}`).join('L');
      gEl.select('.flow-trail-glow').attr('d', lineStr);
      gEl.select('.flow-trail').attr('d', lineStr);

      // Phase 0→1 maps to position along the arc; interpolate between adjacent points for smoothness
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

    // Reproject Utrecht beacon and animate its pulse radius with a sine wave
    const [ux, uy] = proj(UTRECHT) || [W / 2, H / 2];
    const beacon   = overlaysG.select('.flow-utrecht-beacon');
    beacon.attr('transform', `translate(${ux},${uy})`);
    const pulseR = 18 + 7 * Math.abs(Math.sin(ts * 0.002));
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

// Maps each mode key to its renderer; GlobeMap calls (MODE_RENDERERS[mode])(ctx)
export const MODE_RENDERERS = {
  choropleth_flows:  renderChoroplethFlows,
  fish:              renderFish,
  time:              renderTime,
};