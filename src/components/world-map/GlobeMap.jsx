import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { C, FISH_COLORS, OS_COLORS, BROWSER_COLORS, CENTROIDS, UTRECHT, MAP_MODES, W, H, R } from './constants.js';
import { flag, buildTooltipRows } from './utils.js';
import { MODE_RENDERERS } from './mapModes.js';
import MapTooltip  from './MapTooltip.jsx';
import MapLegend   from './MapLegend.jsx';
import CountryList from './CountryList.jsx';

const COLORS = { C, FISH_COLORS, OS_COLORS, BROWSER_COLORS };

export default function GlobeMap({ countryData, maxEvents, topoFeatures, onRotateTo }) {
  // ── D3 refs (not React state — mutations shouldn't trigger re-render) ────
  const svgRef         = useRef(null);
  const projRef        = useRef(null);
  const pathGenRef     = useRef(null);
  const draggingRef    = useRef(false);
  const dragStartRef   = useRef(null);
  const rotateStartRef = useRef(null);
  const panStartRef    = useRef(null);
  const autoRotateRef  = useRef(true);
  const rotateTimerRef = useRef(null);
  const rafRef         = useRef(null);
  const flowRafRef     = useRef(null);
  const flowStateRef   = useRef(null);
  const initialized    = useRef(false);

  // ── React state (drives re-render of tabs / tooltip / legend) ────────────
  const [mode,     setMode    ] = useState('choropleth');
  const [projType, setProjType] = useState('globe');        // 'globe' | 'map'
  const [tooltip,  setTooltip ] = useState({ visible: false, x: 0, y: 0, name: '', rows: [] });
  const [legend,   setLegend  ] = useState(null);

  // Refs that mirror state — used inside D3 callbacks to avoid stale closures
  const modeRef     = useRef('choropleth');
  const projTypeRef = useRef('globe');

  // ── Auto-rotate helpers ──────────────────────────────────────────────────
  const stopAutoRotate = useCallback(() => {
    autoRotateRef.current = false;
    clearTimeout(rotateTimerRef.current);
    rotateTimerRef.current = setTimeout(() => {
      if (projTypeRef.current === 'globe') autoRotateRef.current = true;
    }, 4000);
  }, []);

  // ── Expose fly-to-country for CountryList ────────────────────────────────
  useEffect(() => {
    if (!onRotateTo) return;
    onRotateTo.current = (lon, lat) => {
      if (projTypeRef.current !== 'globe') return;
      stopAutoRotate();
      const proj  = projRef.current; if (!proj) return;
      const start = proj.rotate();
      const end   = [-lon, -lat, 0];
      const interp = d3.interpolate(start, end);
      const dur = 800, t0 = performance.now();
      function step(ts) {
        const t    = Math.min(1, (ts - t0) / dur);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        proj.rotate(interp(ease));
        redrawAll();
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
  });

  // ── Visibility check (globe only — flat map always visible) ──────────────
  function isVisible(lon, lat) {
    if (projTypeRef.current !== 'globe') return true;
    const proj = projRef.current; if (!proj) return false;
    const r   = proj.rotate();
    const rot = [-r[0] * Math.PI / 180, -r[1] * Math.PI / 180];
    const pt  = [lon   * Math.PI / 180,  lat  * Math.PI / 180];
    const dot = Math.sin(rot[1]) * Math.sin(pt[1])
              + Math.cos(rot[1]) * Math.cos(pt[1]) * Math.cos(pt[0] - rot[0]);
    return dot > 0;
  }

  // ── Full redraw (called every animation frame and after drag/zoom) ────────
  function redrawAll() {
    const svg = d3.select(svgRef.current);
    const pg  = pathGenRef.current;
    if (!pg) return;
    const isGlobe = projTypeRef.current === 'globe';

    svg.select('#globe-sphere') .attr('d', pg({ type: 'Sphere' })).attr('display', isGlobe ? null : 'none');
    svg.select('#graticule-path').attr('d', pg(d3.geoGraticule()()));
    svg.select('#globe-shine')  .attr('d', pg({ type: 'Sphere' })).attr('display', isGlobe ? null : 'none');
    svg.select('#globe-outline').attr('d', pg({ type: 'Sphere' })).attr('display', isGlobe ? null : 'none');
    // background rect always covers full SVG
    svg.select('#map-bg').attr('display', isGlobe ? 'none' : null);

    if (!isGlobe) {
      // Flat map: redraw the single country layer and overlays.
      svg.select('#countries-g').selectAll('path').attr('d', pg);
      svg.select('#overlays-g').selectAll('.overlay-group').each(function () {
        const g = d3.select(this);
        if (g.classed('flow-arc-g')) return;
        const lon    = +g.attr('data-lon'), lat = +g.attr('data-lat');
        const coords = projRef.current([lon, lat]);
        g.attr('opacity', 1);
        if (coords) g.attr('transform', `translate(${coords[0]},${coords[1]})`);
      });
    } else {
      // Globe mode — single countries-g
      svg.select('#countries-g').selectAll('path').attr('d', pg);

      // Reproject flow arcs
      if (flowStateRef.current) {
        const cx0 = W / 2, cy0 = H / 2;
        flowStateRef.current.arcData.forEach(d => {
          d.points.forEach(p => {
            const raw = projRef.current([p.glon, p.glat]);
            if (!raw) { p.pt = null; return; }
            p.basePt = raw.slice();
            const dx = raw[0] - cx0, dy = raw[1] - cy0;
            const len = Math.hypot(dx, dy) || 1;
            const lift = d.maxLift * Math.sin(p.t * Math.PI);
            p.pt = [raw[0] + (dx / len) * lift, raw[1] + (dy / len) * lift];
          });
        });
      }

      // Reproject non-flow overlays
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
  function hideTT() { setTooltip(t => ({ ...t, visible: false })); }

  function getFlatMinScale() {
    const p = d3.geoNaturalEarth1().scale(1).translate([0, 0]);
    const [[x0, y0], [x1, y1]] = d3.geoPath(p).bounds({ type: 'Sphere' });
    return Math.min(W / (x1 - x0), H / (y1 - y0)) * 0.88;
  }

  function clampFlatProjection(proj) {
    if (!proj) return;

    const minScale = getFlatMinScale();
    if (proj.scale() < minScale) proj.scale(minScale);

    const path = d3.geoPath(proj);
    const [[x0, y0], [x1, y1]] = path.bounds({ type: 'Sphere' });
    const width = x1 - x0;
    const height = y1 - y0;

    let dx = 0;
    let dy = 0;

    if (width <= W) {
      dx = W / 2 - (x0 + x1) / 2;
    } else if (x0 > 0) {
      dx = -x0;
    } else if (x1 < W) {
      dx = W - x1;
    }

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

  // ── Run a mode renderer ───────────────────────────────────────────────────
  const runMode = useCallback((md, cdata, mx) => {
    if (!svgRef.current || !projRef.current) return;
    const svg       = d3.select(svgRef.current);
    const overlaysG = svg.select('#overlays-g');
    const proj      = projRef.current;

    const countriesG = svg.select('#countries-g');

    // Cancel flow animation when leaving flows mode
    if (md !== 'flows' && flowRafRef.current) {
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
      C, FISH_COLORS, OS_COLORS, BROWSER_COLORS,
      CENTROIDS, UTRECHT, W, H,
    };

    const legendData = (MODE_RENDERERS[md] || MODE_RENDERERS.choropleth)(ctx);
    setLegend(legendData);

    redrawAll();
  }, [stopAutoRotate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Init SVG (once, when topoFeatures arrive) ─────────────────────────────
  useEffect(() => {
    if (!svgRef.current || !topoFeatures.length || initialized.current) return;
    initialized.current = true;

    const proj = d3.geoOrthographic()
      .scale(R).translate([W / 2, H / 2]).clipAngle(90).rotate([0, -20, 0]);
    projRef.current    = proj;
    pathGenRef.current = d3.geoPath(proj);

    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%');

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
        // Restore fill via current mode renderer logic
        const c = countryData[d.id];
        if (!c) { d3.select(this).attr('fill', C.land); return; }
        // Re-run fill for this single element
        runMode(modeRef.current, countryData, maxEvents);
      });

    svg.append('path').attr('id', 'globe-shine')
      .attr('d', pathGenRef.current({ type: 'Sphere' }))
      .attr('fill', 'url(#globeShine)').attr('pointer-events', 'none');
    svg.append('path').attr('id', 'globe-outline')
      .attr('d', pathGenRef.current({ type: 'Sphere' }))
      .attr('fill', 'none').attr('stroke', 'rgba(27,67,50,0.2)').attr('stroke-width', 1).attr('pointer-events', 'none');

    // ── Drag: globe=rotate, flat=pan ───────────────────────────────────────
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
        projRef.current.rotate([rotateStartRef.current[0] + dx * 0.3, rotateStartRef.current[1] - dy * 0.3, rotateStartRef.current[2]]);
      } else {
        projRef.current.translate([panStartRef.current[0] + dx, panStartRef.current[1] + dy]);
        clampFlatProjection(projRef.current);
      }
      redrawAll();
    })
    .on('mouseup',    () => { draggingRef.current = false; })
    .on('mouseleave', () => { draggingRef.current = false; });

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

    // ── Scroll: globe=scale, flat=zoom-to-cursor ───────────────────────────
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
        const [tx, ty] = p.translate();
        p.translate([mx + (tx - mx) * (newS / p.scale()), my + (ty - my) * (newS / p.scale())]).scale(newS);
        clampFlatProjection(p);
      }
      redrawAll();
    }, { passive: false });

    // ── Auto-rotation loop ─────────────────────────────────────────────────
    let lastTs = null;
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

  // ── Re-render when data changes ───────────────────────────────────────────
  useEffect(() => {
    if (!initialized.current || !topoFeatures.length) return;
    runMode(modeRef.current, countryData, maxEvents);
  }, [countryData, maxEvents, runMode]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(flowRafRef.current);
  }, []);

  // ── Switch projection ─────────────────────────────────────────────────────
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

      // Remove tile groups, restore single countries-g
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

      // Fit NaturalEarth to viewBox
      const p = d3.geoNaturalEarth1().scale(1).translate([0, 0]);
      const [[x0, y0], [x1, y1]] = d3.geoPath(p).bounds({ type: 'Sphere' });
      const scale = Math.min(W / (x1 - x0), H / (y1 - y0)) * 0.88;
      p.scale(scale).translate([W / 2, H / 2]);
      clampFlatProjection(p);
      projRef.current    = p;
      pathGenRef.current = d3.geoPath(p);

      // Remove any leftover tiled layers from a previous version.
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
  function handleModeChange(md) {
    setMode(md);
    modeRef.current = md;
    if (!initialized.current) return;
    runMode(md, countryData, maxEvents);
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
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
    <div className="map-panel">

      {/* Tab bar — full width across both columns */}
      <div className="map-tabs">
        <div className="proj-toggle">
          <button className={`proj-btn${projType === 'globe' ? ' active' : ''}`} type="button" aria-pressed={projType === 'globe'} onClick={() => switchProjType('globe')} title="Wereldbol">
            🌍 Bol
          </button>
          <button className={`proj-btn${projType === 'map' ? ' active' : ''}`} type="button" aria-pressed={projType === 'map'} onClick={() => switchProjType('map')} title="Platte kaart">
            🗺️ Kaart
          </button>
        </div>

        <div className="map-tabs-divider" />

        {MAP_MODES.map(m => (
          <button
            key={m.key}
            className={`map-tab${mode === m.key ? ' active' : ''}`}
            type="button"
            aria-pressed={mode === m.key}
            onClick={() => handleModeChange(m.key)}
          >
            {m.label}
          </button>
        ))}

        <button className="map-tab map-tab--reset" type="button" onClick={handleReset}>⊙ Reset</button>
      </div>

      {/* Two-column body */}
      <div className="map-body">

        {/* Left: globe SVG */}
        <div className="map-globe-col">
          <svg
            ref={svgRef}
            id="map-svg"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Interactieve wereldkaart met visdeurbel events per land"
          >
            <defs />
            {/* bg extends far left/right to cover tiled world copies */}
            <rect id="map-bg" x="-5000" y="-500" width="12000" height={H + 1000} fill="#c2e8f5" display="none" />
            <g id="graticule-g" />
            <g id="countries-g" />
            <g id="overlays-g" />
          </svg>

          <MapTooltip tooltip={tooltip} />
          <MapLegend  legend={legend}   />
        </div>

        {/* Right: country list */}
        <div className="map-country-col">
          <div className="map-country-col__header">
            <span className="map-country-col__title">Per land</span>
            <span className="map-country-col__sub">🐟 vissen gespot</span>
          </div>
          <CountryList
            countryData={countryData}
            onFlyTo={(lon, lat) => {
              if (onRotateTo?.current) onRotateTo.current(lon, lat);
            }}
          />
        </div>

      </div>

      {/* Loading overlay */}
      <div id="loading-overlay" className="loading-overlay hidden">
        <div className="loading-inner">
          <div className="loading-fish">🐟</div>
          <div className="loading-text">Data laden…</div>
        </div>
      </div>
    </div>
  );
}