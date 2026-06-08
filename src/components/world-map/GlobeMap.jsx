import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { C, FISH_COLORS, CENTROIDS, UTRECHT, MAP_MODES, W, H, R } from './constants.js';
import { flag, buildTooltipRows } from './utils.js';
import { MODE_RENDERERS } from './mapModes.js';
import MapTooltip  from './MapTooltip.jsx';
import MapLegend   from './MapLegend.jsx';
import CountryList from './CountryList.jsx';

// Bundle colour tokens so helpers can receive them without a second constants import
const COLORS = { C, FISH_COLORS };

// Main interactive map component — renders an SVG globe or flat world map with drag, zoom, flow arcs and tooltips
export default function GlobeMap({ countryData, maxEvents, topoFeatures, onRotateTo, defaultProjection = 'globe', containerClass = 'map-panel' }) {

  // ── D3 refs (mutations don't need to trigger re-renders) ──────────────────
  const svgRef         = useRef(null);  // SVG DOM element
  const projRef        = useRef(null);  // current D3 projection instance
  const pathGenRef     = useRef(null);  // current D3 geoPath generator
  const draggingRef    = useRef(false); // true while the user is dragging
  const dragStartRef   = useRef(null);  // cursor position at drag start
  const rotateStartRef = useRef(null);  // projection rotation at drag start (globe mode)
  const panStartRef    = useRef(null);  // projection translate at drag start (flat mode)
  const autoRotateRef  = useRef(true);  // whether the globe is currently auto-spinning
  const rotateTimerRef = useRef(null);  // setTimeout id for re-enabling auto-rotate after pause
  const rafRef         = useRef(null);  // rAF id for the main rotation loop
  const flowRafRef     = useRef(null);  // rAF id for the flow arc animation loop
  const flowStateRef   = useRef(null);  // latest arc point data (reprojected in redrawAll)
  const initialized    = useRef(false); // guards the init effect so it only runs once

  // ── React state (drives tooltip / legend / tab re-renders) ────────────────
  const [mode,     setMode    ] = useState('choropleth_flows');
  const [projType, setProjType] = useState(defaultProjection);
  const [tooltip,  setTooltip ] = useState({ visible: false, x: 0, y: 0, name: '', rows: [] });
  const [legend,   setLegend  ] = useState(null);

  // Refs mirror mode/projType so D3 callbacks read the latest value without stale closures
  const modeRef     = useRef('choropleth_flows');
  const projTypeRef = useRef(defaultProjection);

  // ── Auto-rotate helpers ───────────────────────────────────────────────────

  // Pauses auto-rotation and schedules a resume 4 s later (globe mode only)
  const stopAutoRotate = useCallback(() => {
    autoRotateRef.current = false;
    clearTimeout(rotateTimerRef.current);
    rotateTimerRef.current = setTimeout(() => {
      if (projTypeRef.current === 'globe') autoRotateRef.current = true;
    }, 4000);
  }, []);

  // ── Fly-to: called by CountryList when the user clicks a country card ─────

  // Sets onRotateTo.current to a function that smoothly rotates the globe to the given lon/lat
  useEffect(() => {
    if (!onRotateTo) return;
    onRotateTo.current = (lon, lat) => {
      if (projTypeRef.current !== 'globe') return;
      stopAutoRotate();
      const proj  = projRef.current; if (!proj) return;
      const start = proj.rotate();
      const end   = [-lon, -lat, 0]; // negate because projection rotate is the inverse of globe rotate
      const interp = d3.interpolate(start, end);
      const dur = 800, t0 = performance.now();
      function step(ts) {
        const t    = Math.min(1, (ts - t0) / dur);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out quadratic
        proj.rotate(interp(ease));
        redrawAll();
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
  });

  // ── Visibility check ──────────────────────────────────────────────────────

  // Returns true if a lon/lat point is on the visible hemisphere; always true in flat mode
  function isVisible(lon, lat) {
    if (projTypeRef.current !== 'globe') return true;
    const proj = projRef.current; if (!proj) return false;
    const r   = proj.rotate();
    const rot = [-r[0] * Math.PI / 180, -r[1] * Math.PI / 180];
    const pt  = [lon   * Math.PI / 180,  lat  * Math.PI / 180];
    // Spherical dot product > 0 means the point faces the viewer
    const dot = Math.sin(rot[1]) * Math.sin(pt[1])
              + Math.cos(rot[1]) * Math.cos(pt[1]) * Math.cos(pt[0] - rot[0]);
    return dot > 0;
  }

  // ── Full redraw ───────────────────────────────────────────────────────────

  // Re-renders all SVG elements after any projection change (rotation, pan, zoom)
  function redrawAll() {
    const svg = d3.select(svgRef.current);
    const pg  = pathGenRef.current;
    if (!pg) return;
    const isGlobe = projTypeRef.current === 'globe';

    svg.select('#globe-sphere') .attr('d', pg({ type: 'Sphere' })).attr('display', isGlobe ? null : 'none');
    svg.select('#graticule-path').attr('d', pg(d3.geoGraticule()()));
    svg.select('#globe-shine')  .attr('d', pg({ type: 'Sphere' })).attr('display', isGlobe ? null : 'none');
    svg.select('#globe-outline').attr('d', pg({ type: 'Sphere' })).attr('display', isGlobe ? null : 'none');
    // Water background rect is only shown in flat mode
    svg.select('#map-bg').attr('display', isGlobe ? 'none' : null);

    if (!isGlobe) {
      svg.select('#countries-g').selectAll('path').attr('d', pg);
      svg.select('#overlays-g').selectAll('.overlay-group').each(function () {
        const g = d3.select(this);
        if (g.classed('flow-arc-g')) return; // flow arcs are handled by their own rAF loop
        const lon    = +g.attr('data-lon'), lat = +g.attr('data-lat');
        const coords = projRef.current([lon, lat]);
        g.attr('opacity', 1);
        if (coords) g.attr('transform', `translate(${coords[0]},${coords[1]})`);
      });
    } else {
      svg.select('#countries-g').selectAll('path').attr('d', pg);

      // Reproject flow arc points so the animation loop picks up updated screen coords
      if (flowStateRef.current) {
        const cx0 = W / 2, cy0 = H / 2;
        flowStateRef.current.arcData.forEach(d => {
          d.points.forEach(p => {
            const raw = projRef.current([p.glon, p.glat]);
            if (!raw) { p.pt = null; return; }
            p.basePt = raw.slice();
            // Re-apply radial lift so arcs always bow outward from the canvas centre
            const dx = raw[0] - cx0, dy = raw[1] - cy0;
            const len = Math.hypot(dx, dy) || 1;
            const lift = d.maxLift * Math.sin(p.t * Math.PI);
            p.pt = [raw[0] + (dx / len) * lift, raw[1] + (dy / len) * lift];
          });
        });
      }

      // Reproject non-flow overlays (e.g. city dots)
      svg.select('#overlays-g').selectAll('.overlay-group').each(function () {
        const g = d3.select(this);
        if (g.classed('flow-arc-g')) return;
        const lon = +g.attr('data-lon'), lat = +g.attr('data-lat');
        const coords = projRef.current([lon, lat]);
        g.attr('opacity', isVisible(lon, lat) ? 1 : 0);
        if (coords) g.attr('transform', `translate(${coords[0]},${coords[1]})`);
      });
    }
  }

  // ── Tooltip helpers ───────────────────────────────────────────────────────

  // Positions and populates the tooltip; clamps X so it doesn't overflow the SVG edge
  function showTT(c, event) {
    const rect = svgRef.current.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: Math.min(event.clientX - rect.left + 14, rect.width - 230),
      y: Math.max(event.clientY - rect.top  - 10, 0),
      name: `${flag(c.code)} ${c.name}`,
      rows: buildTooltipRows(c, modeRef.current, COLORS),
    });
  }
  // Hides tooltip without clearing content to avoid flicker on mouseleave
  function hideTT() { setTooltip(t => ({ ...t, visible: false })); }

  // ── Flat-map helpers ──────────────────────────────────────────────────────

  // Returns the minimum Natural Earth scale that fits the world into the SVG canvas
  function getFlatMinScale() {
    const p = d3.geoNaturalEarth1().scale(1).translate([0, 0]);
    const [[x0, y0], [x1, y1]] = d3.geoPath(p).bounds({ type: 'Sphere' });
    return Math.min(W / (x1 - x0), H / (y1 - y0)) * 0.88;
  }

  // Clamps scale and translate so the flat map never shows empty space on any side
  function clampFlatProjection(proj) {
    if (!proj) return;

    // Prevent zooming out past the "fit world" scale
    const minScale = getFlatMinScale();
    if (proj.scale() < minScale) proj.scale(minScale);

    const path = d3.geoPath(proj);
    const [[x0, y0], [x1, y1]] = path.bounds({ type: 'Sphere' });
    const width = x1 - x0;
    const height = y1 - y0;

    let dx = 0;
    let dy = 0;

    // Centre horizontally if map is narrower than canvas; otherwise snap to the nearer edge
    if (width <= W) {
      dx = W / 2 - (x0 + x1) / 2;
    } else if (x0 > 0) {
      dx = -x0;
    } else if (x1 < W) {
      dx = W - x1;
    }

    // Same logic vertically
    if (height <= H) {
      dy = H / 2 - (y0 + y1) / 2;
    } else if (y0 > 0) {
      dy = -y0;
    } else if (y1 < H) {
      dy = H - y1;
    }

    if (dx || dy) {
      const [tx, ty] = proj.translate();
      proj.translate([tx + dx, ty + dy]);
    }
  }

  // ── Mode renderer ─────────────────────────────────────────────────────────

  // Invokes the renderer for the given mode, passing a shared context, then updates the legend
  const runMode = useCallback((md, cdata, mx) => {
    if (!svgRef.current || !projRef.current) return;
    const svg       = d3.select(svgRef.current);
    const overlaysG = svg.select('#overlays-g');
    const proj      = projRef.current;

    const countriesG = svg.select('#countries-g');

    // Cancel the flow animation when leaving choropleth_flows mode
    if (md !== 'choropleth_flows' && flowRafRef.current) {
      cancelAnimationFrame(flowRafRef.current);
      flowRafRef.current  = null;
      flowStateRef.current = null;
    }

    const ctx = {
      svg, countriesG, overlaysG, proj,
      pg: pathGenRef.current,
      cdata, mx,
      isVisible, stopAutoRotate,
      showTT, hideTT,
      flowRafRef, flowStateRef, modeRef,
      C, FISH_COLORS,
      CENTROIDS, UTRECHT, W, H,
    };

    const legendData = (MODE_RENDERERS[md] || MODE_RENDERERS.choropleth_flows)(ctx);
    setLegend(legendData);

    redrawAll();
  }, [stopAutoRotate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SVG initialisation (runs once when topoFeatures arrive) ──────────────

  useEffect(() => {
    if (!svgRef.current || !topoFeatures.length || initialized.current) return;
    initialized.current = true;

    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%');

    // Inject SVG defs: ocean gradient, specular shine, drop-shadow filter
    svg.select('defs').html(`
      <radialGradient id="oceanGrad" cx="38%" cy="35%" r="65%">
        <stop offset="0%"   stop-color="#C2E4F5"/>
        <stop offset="100%" stop-color="#6BAED6"/>
      </radialGradient>
      <radialGradient id="globeShine" cx="35%" cy="30%" r="60%">
        <stop offset="0%"   stop-color="white" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </radialGradient>
      <filter id="globeShadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="4" dy="8" stdDeviation="18" flood-color="#1B4332" flood-opacity="0.18"/>
      </filter>
    `);

    if (defaultProjection === 'map') {
      // ── Flat map init ──────────────────────────────────────────────────────
      autoRotateRef.current = false;
      // Fit Natural Earth to the canvas at 88% zoom
      const p = d3.geoNaturalEarth1().scale(1).translate([0, 0]);
      const [[x0, y0], [x1, y1]] = d3.geoPath(p).bounds({ type: 'Sphere' });
      const scale = Math.min(W / (x1 - x0), H / (y1 - y0)) * 0.88;
      p.scale(scale).translate([W / 2, H / 2]);
      projRef.current    = p;
      pathGenRef.current = d3.geoPath(p);

      // Show water background; hide globe-only elements
      svg.select('#map-bg').attr('display', null);
      svg.insert('path', '#graticule-g').attr('id', 'globe-sphere').attr('display', 'none');
      svg.append('path').attr('id', 'globe-shine').attr('display', 'none');
      svg.append('path').attr('id', 'globe-outline').attr('display', 'none');

      // Flat map uses centred alignment
      d3.select(svgRef.current).attr('preserveAspectRatio', 'xMidYMid meet');

      svg.select('#graticule-g').append('path')
        .attr('id', 'graticule-path')
        .attr('d', pathGenRef.current(d3.geoGraticule()()))
        .attr('fill', 'none').attr('stroke', C.graticule).attr('stroke-width', 0.5);

      svg.select('#countries-g').selectAll('path')
        .data(topoFeatures).join('path')
        .attr('class', 'map-country')
        .attr('d', pathGenRef.current)
        .attr('stroke', C.stroke).attr('stroke-width', 0.5).attr('fill', C.land)
        .on('mouseover', function (event, d) {
          const c = countryData[d.id];
          if (c) showTT(c, event);
          const current = d3.select(this).attr('fill') || C.land;
          try { d3.select(this).attr('fill', d3.color(current).darker(0.5).toString()); } catch (e) {}
        })
        .on('mouseleave', function () {
          hideTT();
          runMode(modeRef.current, countryData, maxEvents);
        });

    } else {
      // ── Globe init ─────────────────────────────────────────────────────────
      const proj = d3.geoOrthographic()
        .scale(R).translate([W / 2, H / 2]).clipAngle(90).rotate([0, -20, 0]);
      projRef.current    = proj;
      pathGenRef.current = d3.geoPath(proj);

      // Ocean sphere rendered behind graticule and countries
      svg.insert('path', '#graticule-g')
        .attr('id', 'globe-sphere')
        .attr('d', pathGenRef.current({ type: 'Sphere' }))
        .attr('fill', 'url(#oceanGrad)')
        .attr('filter', 'url(#globeShadow)');

      svg.select('#graticule-g').append('path')
        .attr('id', 'graticule-path')
        .attr('d', pathGenRef.current(d3.geoGraticule()()))
        .attr('fill', 'none').attr('stroke', C.graticule).attr('stroke-width', 0.5);

      svg.select('#countries-g').selectAll('path')
        .data(topoFeatures).join('path')
        .attr('class', 'map-country')
        .attr('d', pathGenRef.current)
        .attr('stroke', C.stroke).attr('stroke-width', 0.5).attr('fill', C.land)
        .on('mouseover', function (event, d) {
          const c = countryData[d.id];
          if (c) { stopAutoRotate(); showTT(c, event); }
          const current = d3.select(this).attr('fill') || C.land;
          try { d3.select(this).attr('fill', d3.color(current).darker(0.5).toString()); } catch (e) {}
        })
        .on('mouseleave', function (event, d) {
          hideTT();
          const c = countryData[d.id];
          if (!c) { d3.select(this).attr('fill', C.land); return; }
          runMode(modeRef.current, countryData, maxEvents);
        });

      // Specular highlight on top of countries, below tooltips
      svg.append('path').attr('id', 'globe-shine')
        .attr('d', pathGenRef.current({ type: 'Sphere' }))
        .attr('fill', 'url(#globeShine)').attr('pointer-events', 'none');
      // Thin ring around the globe edge
      svg.append('path').attr('id', 'globe-outline')
        .attr('d', pathGenRef.current({ type: 'Sphere' }))
        .attr('fill', 'none').attr('stroke', 'rgba(27,67,50,0.2)').attr('stroke-width', 1).attr('pointer-events', 'none');
    }

    // ── Drag: globe = rotate, flat = pan ──────────────────────────────────
    svg.on('mousedown', function (event) {
      draggingRef.current = true;
      dragStartRef.current = [event.clientX, event.clientY];
      if (projTypeRef.current === 'globe') rotateStartRef.current = projRef.current.rotate().slice();
      else panStartRef.current = projRef.current.translate().slice();
      stopAutoRotate();
      event.preventDefault();
    })
    .on('mousemove', function (event) {
      if (!draggingRef.current) return;
      const dx = event.clientX - dragStartRef.current[0];
      const dy = event.clientY - dragStartRef.current[1];
      if (projTypeRef.current === 'globe') {
        // 0.3 deg/px feels natural without being over-sensitive
        projRef.current.rotate([rotateStartRef.current[0] + dx * 0.3, rotateStartRef.current[1] - dy * 0.3, rotateStartRef.current[2]]);
      } else {
        projRef.current.translate([panStartRef.current[0] + dx, panStartRef.current[1] + dy]);
        clampFlatProjection(projRef.current);
      }
      redrawAll();
    })
    .on('mouseup',    () => { draggingRef.current = false; })
    .on('mouseleave', () => { draggingRef.current = false; });

    // ── Touch drag (mirrors mouse drag logic for mobile) ───────────────────
    svg.on('touchstart', function (event) {
      const t = event.touches[0];
      draggingRef.current  = true;
      dragStartRef.current = [t.clientX, t.clientY];
      if (projTypeRef.current === 'globe') rotateStartRef.current = projRef.current.rotate().slice();
      else panStartRef.current = projRef.current.translate().slice();
      stopAutoRotate();
    }, { passive: true })
    .on('touchmove', function (event) {
      if (!draggingRef.current) return;
      const t  = event.touches[0];
      const dx = t.clientX - dragStartRef.current[0];
      const dy = t.clientY - dragStartRef.current[1];
      if (projTypeRef.current === 'globe') {
        projRef.current.rotate([rotateStartRef.current[0] + dx * 0.35, rotateStartRef.current[1] - dy * 0.35, rotateStartRef.current[2]]);
      } else {
        projRef.current.translate([panStartRef.current[0] + dx, panStartRef.current[1] + dy]);
        clampFlatProjection(projRef.current);
      }
      redrawAll();
    }, { passive: true })
    .on('touchend', () => { draggingRef.current = false; });

    // ── Scroll: globe = scale, flat = zoom toward cursor ──────────────────
    svg.on('wheel', function (event) {
      event.preventDefault();
      stopAutoRotate();
      const p = projRef.current;
      if (projTypeRef.current === 'globe') {
        const delta = event.deltaY > 0 ? -20 : 20;
        p.scale(Math.max(150, Math.min(800, p.scale() + delta)));
      } else {
        const rect   = svgRef.current.getBoundingClientRect();
        const mx     = (event.clientX - rect.left) * (W / rect.width);
        const my     = (event.clientY - rect.top)  * (H / rect.height);
        const factor = event.deltaY > 0 ? 0.91 : 1.1;
        const newS   = Math.max(getFlatMinScale(), Math.min(1200, p.scale() * factor));
        // Adjust translate so the point under the cursor stays fixed during zoom
        const [tx, ty] = p.translate();
        p.translate([mx + (tx - mx) * (newS / p.scale()), my + (ty - my) * (newS / p.scale())]).scale(newS);
        clampFlatProjection(p);
      }
      redrawAll();
    }, { passive: false });

    // ── Auto-rotation loop ─────────────────────────────────────────────────
    let lastTs = null;
    // Advances the globe 0.012 deg per ms when auto-rotate is active
    function frame(ts) {
      if (autoRotateRef.current && !draggingRef.current) {
        if (lastTs !== null) {
          const dt = ts - lastTs;
          const r  = projRef.current.rotate();
          projRef.current.rotate([r[0] + dt * 0.012, r[1], r[2]]);
          redrawAll();
        }
      }
      lastTs = ts;
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    runMode(modeRef.current, countryData, maxEvents);
  }, [topoFeatures]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-runs the current mode renderer whenever countryData or maxEvents changes (period switch)
  useEffect(() => {
    if (!initialized.current || !topoFeatures.length) return;
    runMode(modeRef.current, countryData, maxEvents);
  }, [countryData, maxEvents, runMode]);

  // Cancel both animation loops on unmount to prevent memory leaks
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(flowRafRef.current);
  }, []);

  // ── Projection switch ─────────────────────────────────────────────────────

  // Switches between 'globe' (orthographic) and 'map' (Natural Earth) projections
  function switchProjType(pt) {
    if (!initialized.current) return;
    projTypeRef.current = pt;
    setProjType(pt);

    const svg = d3.select(svgRef.current);

    if (pt === 'globe') {
      autoRotateRef.current = true;
      const p = d3.geoOrthographic().scale(R).translate([W / 2, H / 2]).clipAngle(90).rotate([0, -20, 0]);
      projRef.current    = p;
      pathGenRef.current = d3.geoPath(p);

      // Remove any flat-map-specific groups and restore the single countries layer
      svg.selectAll('.tile-g').remove();
      svg.selectAll('.graticule-tile').remove();
      let cg = svg.select('#countries-g');
      if (cg.empty()) cg = svg.insert('g', '#overlays-g').attr('id', 'countries-g');
      cg.selectAll('path')
        .data(topoFeatures).join('path')
        .attr('class', 'map-country')
        .attr('d', pathGenRef.current)
        .attr('stroke', C.stroke).attr('stroke-width', 0.5).attr('fill', C.land)
        .on('mouseover', function (event, d) {
          const c = countryData[d.id];
          if (c) { stopAutoRotate(); showTT(c, event); }
          const current = d3.select(this).attr('fill') || C.land;
          try { d3.select(this).attr('fill', d3.color(current).darker(0.5).toString()); } catch (e) {}
        })
        .on('mouseleave', function () {
          hideTT();
          runMode(modeRef.current, countryData, maxEvents);
        });

    } else {
      autoRotateRef.current = false;
      clearTimeout(rotateTimerRef.current);

      // Fit Natural Earth to the canvas at 88% zoom
      const p = d3.geoNaturalEarth1().scale(1).translate([0, 0]);
      const [[x0, y0], [x1, y1]] = d3.geoPath(p).bounds({ type: 'Sphere' });
      const scale = Math.min(W / (x1 - x0), H / (y1 - y0)) * 0.88;
      p.scale(scale).translate([W / 2, H / 2]);
      clampFlatProjection(p);
      projRef.current    = p;
      pathGenRef.current = d3.geoPath(p);

      svg.selectAll('.tile-g').remove();
      svg.selectAll('.graticule-tile').remove();

      let cg = svg.select('#countries-g');
      if (cg.empty()) cg = svg.insert('g', '#overlays-g').attr('id', 'countries-g');
      cg.selectAll('path')
        .data(topoFeatures).join('path')
        .attr('class', 'map-country')
        .attr('d', pathGenRef.current)
        .attr('stroke', C.stroke).attr('stroke-width', 0.5).attr('fill', C.land)
        .on('mouseover', function (event, d) {
          const c = countryData[d.id];
          if (c) showTT(c, event);
          const current = d3.select(this).attr('fill') || C.land;
          try { d3.select(this).attr('fill', d3.color(current).darker(0.5).toString()); } catch (e) {}
        })
        .on('mouseleave', function () {
          hideTT();
          runMode(modeRef.current, countryData, maxEvents);
        });
    }

    runMode(modeRef.current, countryData, maxEvents);
    redrawAll();
  }

  // ── Mode tab change ───────────────────────────────────────────────────────

  // Updates both React state (active tab highlight) and the ref (D3 callbacks read the ref)
  function handleModeChange(md) {
    setMode(md);
    modeRef.current = md;
    if (!initialized.current) return;
    runMode(md, countryData, maxEvents);
  }

  // ── Reset view ────────────────────────────────────────────────────────────

  // Resets zoom/rotation to defaults: globe returns to R scale at -20° tilt, flat refits the world
  function handleReset() {
    stopAutoRotate();
    if (!projRef.current) return;
    if (projTypeRef.current === 'globe') {
      projRef.current.scale(R).rotate([0, -20, 0]);
      autoRotateRef.current = true;
    } else {
      const p = d3.geoNaturalEarth1().scale(1).translate([0, 0]);
      const [[x0, y0], [x1, y1]] = d3.geoPath(p).bounds({ type: 'Sphere' });
      const scale = Math.min(W / (x1 - x0), H / (y1 - y0)) * 0.92;
      projRef.current.scale(scale).translate([W / 2, H / 2]);
      clampFlatProjection(projRef.current);
    }
    redrawAll();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={containerClass}>

      {/* Globe SVG — positioned right, overflows intentionally */}
      <div className="map-globe-col">
        <svg
          ref={svgRef}
          id="map-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio={defaultProjection === 'map' ? 'xMidYMid meet' : 'xMaxYMid meet'}
        >
          <defs />
          {/* Flat-map water background (hidden in globe mode) */}
          <rect id="map-bg" x="-5000" y="-500" width="12000" height={H + 1000} fill="#c2e8f5" display="none" />
          <g id="graticule-g" />
          <g id="countries-g" />
          <g id="overlays-g" />
        </svg>
        <MapTooltip tooltip={tooltip} />
      </div>

      {/* Country cards — floating top-left */}
      <div className="map-overlay-left">
        <CountryList
          countryData={countryData}
          onFlyTo={(lon, lat) => {
            if (onRotateTo?.current) onRotateTo.current(lon, lat);
          }}
        />
      </div>

      {/* Legend — floating bottom-left */}
      <div className="map-overlay-legend">
        <MapLegend legend={legend} />
      </div>

      {/* Mode tabs — floating bottom-right */}
      <div className="map-tabs">
        {MAP_MODES.map(m => (
          <button
            key={m.key}
            className={`map-tab${mode === m.key ? ' active' : ''}`}
            onClick={() => handleModeChange(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Loading overlay — toggled via CSS by the parent when data is loading */}
      <div id="loading-overlay" className="loading-overlay hidden">
        <div className="loading-inner">
          <div className="loading-fish">🐟</div>
          <div className="loading-text">Data laden…</div>
        </div>
      </div>
    </div>
  );
}