import * as d3 from 'd3';

export function initMitchell() {
  const visData = [
    { naam: 'Blankvoorn', count: 0, color: '#7ec8e3', weight: 0.3,  shape: 'round', diepte: 'mid',   habitat: 'open' },
    { naam: 'Brasem',     count: 0, color: '#5aafcf', weight: 1.8,  shape: 'round', diepte: 'bodem', habitat: 'zand' },
    { naam: 'Baars',      count: 0, color: '#4a9ab8', weight: 0.6,  shape: 'baars', diepte: 'mid',   habitat: 'open' },
    { naam: 'Snoekbaars', count: 0, color: '#3a8aa8', weight: 2.4,  shape: 'pred',  diepte: 'mid',   habitat: 'open' },
    { naam: 'Paling',     count: 0, color: '#2a7a98', weight: 0.5,  shape: 'long',  diepte: 'bodem', habitat: 'steen' },
    { naam: 'Kolblei',    count: 0, color: '#f4c560', weight: 0.4,  shape: 'round', diepte: 'mid',   habitat: 'zand' },
    { naam: 'Alver',      count: 0, color: '#e8b85a', weight: 0.08, shape: 'tiny',  diepte: 'top',   habitat: 'oppervlak' },
    { naam: 'Ruisvoorn',  count: 0, color: '#5a8a3f', weight: 0.35, shape: 'round', diepte: 'top',   habitat: 'riet' },
    { naam: 'Snoek',      count: 0, color: '#ff7849', weight: 3.2,  shape: 'pred',  diepte: 'mid',   habitat: 'riet' },
    { naam: 'Winde',      count: 0, color: '#c8a96e', weight: 0.8,  shape: 'baars', diepte: 'mid',   habitat: 'stroom' },
    { naam: 'Meerval',    count: 0, color: '#9b6bae', weight: 12.0, shape: 'long',  diepte: 'bodem', habitat: 'steen' },
    { naam: 'Karper',     count: 0, color: '#a07850', weight: 2.5,  shape: 'round', diepte: 'bodem', habitat: 'zand' },
  ];

  let TOTAL = 0;
  const MONTH_FULL = ['Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November'];
  let weekHours = [], weekDayLabels = [], periodLabel = '';

  function mulberry32(seed) {
    return function() {
      let t = seed += 0x6d2b79f5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(20260518);

  function generateMonthly(total) {
    const peak = [0.06, 0.22, 0.28, 0.16, 0.10, 0.06, 0.05, 0.04, 0.03];
    return peak.map(p => Math.round(p * total * (0.92 + rng() * 0.16)));
  }

  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));
  const fmt = n => new Intl.NumberFormat('nl-NL').format(Math.round(n));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fishSymbolId(shape) { return 'fish-' + shape; }

  // ── Tooltip ────────────────────────────────────────
  const tooltipEl = $('#fishTooltip');
  let tooltipHideTimer = 0;

  function showTooltip(html, x, y) {
    clearTimeout(tooltipHideTimer);
    tooltipEl.innerHTML = html;
    tooltipEl.style.left = x + 'px';
    tooltipEl.style.top  = y + 'px';
    tooltipEl.classList.add('visible');
  }

  function hideTooltip(delay = 0) {
    clearTimeout(tooltipHideTimer);
    if (delay > 0) {
      tooltipHideTimer = setTimeout(() => tooltipEl.classList.remove('visible'), delay);
    } else {
      tooltipEl.classList.remove('visible');
    }
  }

  // ── Section Observer ───────────────────────────────
  const chapterInit = {};

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      if (!entry.target.dataset.inited) {
        entry.target.dataset.inited = '1';
        const fn = chapterInit[entry.target.id];
        if (fn) fn(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

  // ── Ringkalender ───────────────────────────────────
  chapterInit['ch-ring'] = (el) => {
    const W = 680, H = 680, cx = W / 2, cy = H / 2;
    const innerR = 130, outerR = 290;
    const DAYS  = weekDayLabels.length || 9;
    const SLOTS = DAYS * 24;
    const data  = weekHours.length ? weekHours : new Array(SLOTS).fill(0);
    const maxV  = Math.max(...data, 1);

    const svg = d3.select($('#ringStage')).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

    for (let d = 0; d < DAYS; d++) {
      const aDivider = (d / DAYS) * 2 * Math.PI - Math.PI / 2;
      const aLabel   = ((d + 0.5) / DAYS) * 2 * Math.PI - Math.PI / 2;
      svg.append('line')
        .attr('x1', cx + Math.cos(aDivider) * (innerR - 10)).attr('y1', cy + Math.sin(aDivider) * (innerR - 10))
        .attr('x2', cx + Math.cos(aDivider) * (outerR + 10)).attr('y2', cy + Math.sin(aDivider) * (outerR + 10))
        .attr('stroke', 'rgba(1,70,60,0.2)').attr('stroke-dasharray', '3 4');
      svg.append('text')
        .attr('x', cx + Math.cos(aLabel) * (outerR + 24)).attr('y', cy + Math.sin(aLabel) * (outerR + 24) + 4)
        .attr('text-anchor', 'middle').attr('font-family', 'DM Mono, monospace').attr('font-size', 13)
        .attr('letter-spacing', '0.12em').attr('fill', d >= 1 && d <= 7 ? '#6941c6' : '#01463c').attr('opacity', 0.85)
        .text((weekDayLabels[d] || '').toUpperCase());
      const nightStart = (d * 24 + 21) / SLOTS * 2 * Math.PI - Math.PI / 2;
      const nightEnd   = (d * 24 + 29) / SLOTS * 2 * Math.PI - Math.PI / 2;
      svg.append('path')
        .attr('d', d3.arc().innerRadius(innerR - 8).outerRadius(innerR).startAngle(nightStart).endAngle(nightEnd)())
        .attr('transform', `translate(${cx},${cy})`).attr('fill', 'rgba(1,70,60,0.08)');
    }

    svg.append('text').attr('x', cx).attr('y', cy - 14).attr('text-anchor', 'middle')
      .attr('font-family', 'Fraunces, serif').attr('font-style', 'italic').attr('font-size', 52)
      .attr('fill', '#01463c').text(fmt(TOTAL));
    svg.append('text').attr('x', cx).attr('y', cy + 18).attr('text-anchor', 'middle')
      .attr('font-family', 'DM Mono, monospace').attr('font-size', 13).attr('letter-spacing', '0.18em')
      .attr('fill', '#01463c').attr('opacity', 0.6).text('BELROEPEN');
    svg.append('text').attr('x', cx).attr('y', cy + 36).attr('text-anchor', 'middle')
      .attr('font-family', 'DM Mono, monospace').attr('font-size', 12).attr('letter-spacing', '0.12em')
      .attr('fill', '#6941c6').attr('opacity', 0.9).text(periodLabel || '18 APR – 18 MEI 2026');

    const dots = svg.append('g');
    for (let i = 0; i < SLOTS; i++) {
      const cnt  = data[i] || 0, norm = cnt / maxV;
      const a    = (i / SLOTS) * 2 * Math.PI - Math.PI / 2;
      const r    = innerR + 14 + norm * (outerR - innerR - 20);
      const color = norm > 0.65 ? '#6941c6' : norm > 0.25 ? '#01463c' : 'rgba(1,70,60,0.35)';
      const dot = dots.append('circle')
        .attr('class', 'ring-dot')
        .attr('cx', cx + Math.cos(a) * r).attr('cy', cy + Math.sin(a) * r).attr('r', 0)
        .attr('fill', color).attr('opacity', cnt > 0 ? 0.25 + norm * 0.75 : 0.08)
        .attr('tabindex', cnt > 0 ? 0 : -1);
      dot.transition().delay(i * 2).duration(250).attr('r', 1.2 + norm * 5.5);
      if (cnt > 0) {
        const label   = weekDayLabels[Math.floor(i / 24)] || '';
        const tooltip = `<strong>${label} ${String(i % 24).padStart(2, '0')}:00</strong>${fmt(cnt)} belroepen`;
        dot.on('mouseenter mousemove', (e) => showTooltip(tooltip, e.clientX, e.clientY))
           .on('mouseleave blur', () => hideTooltip())
           .on('focus', () => {
             const bb = dot.node().getBoundingClientRect();
             showTooltip(tooltip, bb.left + bb.width / 2, bb.top);
           });
      }
    }

    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', innerR + 8)
      .attr('fill', 'none').attr('stroke', 'rgba(1,70,60,0.15)').attr('stroke-dasharray', '2 5');
  };

  // ── Radar ──────────────────────────────────────────
  chapterInit['ch-radar'] = (el) => {
    const W = 620, H = 620, cx = W / 2, cy = H / 2, R = 270;
    const svg = d3.select($('#radarStage')).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

    for (let i = 1; i <= 4; i++) {
      svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R * i / 4)
        .attr('fill', 'none').attr('stroke', 'rgba(248,231,205,0.1)').attr('stroke-dasharray', '2 6');
    }

    [['x1', cx-R, 'y1', cy, 'x2', cx+R, 'y2', cy],
     ['x1', cx, 'y1', cy-R, 'x2', cx, 'y2', cy+R]].forEach(([k1,v1,k2,v2,k3,v3,k4,v4]) => {
      svg.append('line').attr(k1,v1).attr(k2,v2).attr(k3,v3).attr(k4,v4)
        .attr('stroke', 'rgba(248,231,205,0.08)');
    });

    const grad = svg.append('defs').append('linearGradient').attr('id', 'radarSweep')
      .attr('x1', 0).attr('y1', 0).attr('x2', 1).attr('y2', 0);
    grad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(192,168,255,0.0)');
    grad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(192,168,255,0.5)');

    const sweep = svg.append('path')
      .attr('d', `M ${cx} ${cy} L ${cx+R} ${cy} A ${R} ${R} 0 0 0 ${cx+Math.cos(-Math.PI/4)*R} ${cy+Math.sin(-Math.PI/4)*R} Z`)
      .attr('fill', 'url(#radarSweep)').attr('opacity', 0.6);
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 5).attr('fill', '#c0a8ff');

    const pingSeed = mulberry32(42);
    const pings = visData.map(v => {
      const angle    = pingSeed() * Math.PI * 2;
      const distance = 60 + pingSeed() * (R - 70);
      return { ...v, x: cx + Math.cos(angle) * distance, y: cy + Math.sin(angle) * distance };
    });

    const detailPanel = $('#radarDetail');
    const pingsGroup  = svg.append('g');

    pings.forEach(p => {
      const g = pingsGroup.append('g')
        .attr('class', 'radar-ping').attr('data-naam', p.naam)
        .attr('transform', `translate(${p.x}, ${p.y})`)
        .attr('opacity', 0).attr('tabindex', 0).attr('role', 'button')
        .attr('aria-label', `${p.naam}: ${fmt(p.count)} waarnemingen`);

      g.append('circle').attr('class', 'radar-ping-bg').attr('r', 18).attr('fill', p.color).attr('opacity', 0.18);
      g.append('circle').attr('r', 8).attr('fill', p.color).attr('opacity', 0.6);
      g.append('g').attr('class', 'fish-wiggle').style('color', p.color)
        .html(`<use href="#${fishSymbolId(p.shape)}" x="-22" y="-9" width="44" height="18"/>`);
      g.append('text')
        .attr('x', p.x > cx ? 26 : -26).attr('y', 4)
        .attr('text-anchor', p.x > cx ? 'start' : 'end')
        .attr('font-family', 'DM Mono, monospace').attr('font-size', 11)
        .attr('fill', '#f8e7cd').attr('opacity', 0.85)
        .text(`${p.naam.toUpperCase()} · ${fmt(p.count)}`);

      const showDetail = () => {
        pingsGroup.selectAll('.radar-ping').classed('selected', false);
        g.classed('selected', true);
        detailPanel.innerHTML = `<strong>${p.naam}</strong>${fmt(p.count)} waarnemingen<br/>Piek: ${MONTH_FULL[p.monthly.indexOf(Math.max(...p.monthly))]}<br/>Diepte: ${p.diepte}<br/>Gewicht: ~${p.weight} kg`;
        detailPanel.classList.add('visible');
      };
      g.on('click', showDetail);
      g.on('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDetail(); } });
      p.elem = g;
    });

    let angle = -Math.PI / 2, raf = 0, running = false;
    const revealed = new Set();

    function tick() {
      angle += reduceMotion ? 0.03 : 0.01;
      sweep.attr('transform', `rotate(${angle * 180 / Math.PI} ${cx} ${cy})`);
      pings.forEach((p, i) => {
        const da = (Math.atan2(p.y - cy, p.x - cx) - angle + Math.PI * 4) % (Math.PI * 2);
        if (!revealed.has(i) && da < 0.18) { revealed.add(i); p.elem.transition().duration(300).attr('opacity', 1); }
      });
      if (running) raf = requestAnimationFrame(tick);
    }

    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { if (!running) { running = true; tick(); } }
      else { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0.2 }).observe($('#radarStage'));
  };

  // ── Boot ──────────────────────────────────────────
  async function boot() {
    try {
      const live = await fetch('/json/vis-data.json').then(r => r.json());
      Object.entries(live.species).forEach(([naam, count]) => {
        const v = visData.find(d => d.naam === naam);
        if (v) v.count = count;
      });
      if (live.weekHours)     weekHours     = live.weekHours;
      if (live.weekDayLabels) weekDayLabels = live.weekDayLabels;
      if (live.period?.label) periodLabel   = live.period.label.toUpperCase();
    } catch (e) {
      console.warn('vis-data.json niet geladen', e);
    }

    TOTAL = visData.reduce((s, v) => s + v.count, 0);
    visData.forEach(v => { v.monthly = generateMonthly(v.count); });
    visData.sort((a, b) => b.count - a.count);

    $$('.chapter').forEach(c => sectionObserver.observe(c));
  }

  boot();

  return () => {
    sectionObserver.disconnect();
  };
}
