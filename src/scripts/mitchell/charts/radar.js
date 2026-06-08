import * as d3 from 'd3';
import { COLORS, FONT_BODY, MONTH_FULL, MONTH_LONG_NL } from '../constants.js';
import { $, formatNumber, mulberry32, reduceMotion } from '../utils.js';
import { ensureTintFilter, fishImagePath } from '../fishImage.js';
import { state, lifecycle, raf } from '../state.js';

// ============================================================================
// radar.js — een sonar/radar. Elke vissoort is een "ping": hoe vaker gezien,
// hoe dichter bij het midden. De draaiende sweep veegt eroverheen; elke ping
// licht op zodra de sweep passeert en dooft daarna langzaam weer (naglooi).
// Met de tijdslider scrub je door de periode: bij 'week' per dag, bij 'maand'
// per week, bij 'jaar' per maand — de vissen komen dan dichterbij of drijven
// naar de rand al naar gelang hoe vaak ze in dat tijdvak gezien zijn.
// ============================================================================

export function initRadar() {
  const { visData, weekHours, weekDayLabels, weekDays, currentPeriod } = state;
  const { cleanups } = lifecycle;
  const W = 620, H = 620, cx = W / 2, cy = H / 2, R = 270;
  const svg = d3.select($('#radarStage')).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

  // Subtiele schijf-vulling zodat de radar zich aftekent tegen de achtergrond
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R)
    .attr('fill', 'rgba(1,70,60,0.03)').attr('stroke', 'none');

  // Concentrische ringen + dradenkruis. De buitenrand is iets steviger als
  // begrenzing; de binnenringen gestippeld maar zichtbaar.
  for (let i = 1; i <= 4; i++) {
    const isEdge = i === 4;
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R * i / 4)
      .attr('fill', 'none')
      .attr('stroke', isEdge ? 'rgba(1,70,60,0.40)' : 'rgba(1,70,60,0.22)')
      .attr('stroke-width', isEdge ? 1.3 : 1)
      .attr('stroke-dasharray', isEdge ? 'none' : '2 6');
  }
  [['x1', cx - R, 'y1', cy, 'x2', cx + R, 'y2', cy],
   ['x1', cx, 'y1', cy - R, 'x2', cx, 'y2', cy + R]].forEach(([k1, v1, k2, v2, k3, v3, k4, v4]) => {
    svg.append('line').attr(k1, v1).attr(k2, v2).attr(k3, v3).attr(k4, v4)
      .attr('stroke', 'rgba(1,70,60,0.16)').attr('stroke-width', 1);
  });

  // De draaiende sweep-wig (kleurverloop van transparant → groen)
  const grad = svg.append('defs').append('linearGradient').attr('id', 'radarSweep')
    .attr('x1', 0).attr('y1', 0).attr('x2', 1).attr('y2', 0);
  grad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(1,70,60,0.0)');
  grad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(1,70,60,0.22)');
  const sweep = svg.append('path')
    .attr('d', `M ${cx} ${cy} L ${cx + R} ${cy} A ${R} ${R} 0 0 0 ${cx + Math.cos(-Math.PI / 4) * R} ${cy + Math.sin(-Math.PI / 4) * R} Z`)
    .attr('fill', 'url(#radarSweep)').attr('opacity', 0.6);
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 5).attr('fill', COLORS.green);

  // --- Plaatsing -------------------------------------------------------------
  // Afstand tot midden = functie van waarnemingen: 0 → rand, drukst → midden.
  // De hoek is willekeurig (seeded) met rejection sampling zodat soorten niet
  // bovenop elkaar landen. Per ping bewaren we hoek + vaste jitter, zodat hij
  // bij het scrubben alleen radiaal beweegt (niet rondspringt).
  const pingSeed = mulberry32(42);
  const counts = visData.map(v => v.count || 0);
  const maxCount = Math.max(...counts, 1);
  const innerDist = 70, outerDist = R - 55;
  const distanceScale = d3.scaleSqrt().domain([0, maxCount]).range([outerDist, innerDist]).clamp(true);
  const distFor = (count, jitter) => count > 0 ? distanceScale(count) + jitter : outerDist + 10;
  const minGap = 70; // minimale onderlinge afstand in px

  const pings = [];
  visData.forEach((v, si) => {
    const jitter = (pingSeed() - 0.5) * 22;
    const distance = distFor(v.count, jitter);
    let best = null, bestScore = -Infinity;
    for (let t = 0; t < 60; t++) {
      const angle = pingSeed() * Math.PI * 2;
      const px = cx + Math.cos(angle) * distance;
      const py = cy + Math.sin(angle) * distance;
      const nearest = pings.reduce((m, p) => Math.min(m, Math.hypot(p.x - px, p.y - py)), Infinity);
      if (nearest >= minGap) { best = { angle, x: px, y: py }; break; }
      if (nearest > bestScore) { bestScore = nearest; best = { angle, x: px, y: py }; }
    }
    pings.push({
      ...v, ...best, si, jitter,
      total: v.count || 0, current: v.count || 0,
      litAt: -1e9, hover: false, selected: false,
    });
  });

  // --- Tijd-buckets per periode ---------------------------------------------
  // Er is geen per-soort tijddata; we leiden 'm af uit de geaggregeerde drukte
  // (weekHours) als basisvorm, met een vaste per-soort variatie eroverheen.
  // Elke soort telt over de buckets exact op tot zijn totaal.
  const buckets = buildTimeBuckets();
  const totalAll = pings.reduce((s, p) => s + p.total, 0);

  function buildTimeBuckets() {
    const dayCount = weekDayLabels.length || Math.max(1, Math.floor((weekHours.length || 0) / 24));
    const dayTotals = [];
    for (let d = 0; d < dayCount; d++) {
      let s = 0;
      for (let h = 0; h < 24; h++) s += (weekHours[d * 24 + h] || 0);
      dayTotals.push(s);
    }

    // Groepeer dagen tot buckets afhankelijk van de periode
    let groups = [];
    if (currentPeriod === 'week') {
      // elke dag een bucket
      groups = dayTotals.map((_, d) => ({ label: weekDayLabels[d] || `Dag ${d + 1}`, sub: '', days: [d] }));
    } else if (currentPeriod === 'jaar') {
      // groepeer per kalendermaand op basis van de datums
      const byMonth = new Map();
      for (let d = 0; d < dayCount; d++) {
        const dt = new Date(weekDays[d]);
        const valid = !Number.isNaN(dt.getTime());
        const key = valid ? `${dt.getUTCFullYear()}-${dt.getUTCMonth()}` : `m${Math.floor(d / 30)}`;
        if (!byMonth.has(key)) {
          byMonth.set(key, { label: valid ? MONTH_LONG_NL[dt.getUTCMonth()] : `Maand ${byMonth.size + 1}`, sub: '', days: [] });
        }
        byMonth.get(key).days.push(d);
      }
      groups = [...byMonth.values()];
    } else {
      // maand → weken van 7 dagen
      for (let w = 0; w * 7 < dayCount; w++) {
        const start = w * 7, end = Math.min(start + 6, dayCount - 1);
        const days = [];
        for (let d = start; d <= end; d++) days.push(d);
        const sub = `${weekDayLabels[start] || ''}–${weekDayLabels[end] || ''}`;
        groups.push({ label: `Week ${w + 1}`, sub, days });
      }
    }

    // Aggregaat-gewicht per bucket (de echte drukte-vorm)
    const agg = groups.map(g => g.days.reduce((s, d) => s + (dayTotals[d] || 0), 0));
    const aggSum = agg.reduce((s, v) => s + v, 0) || 1;
    const weights = agg.map(v => v / aggSum);

    // Per soort verdelen over de buckets, met behoud van het totaal
    const perSpecies = new Map();
    visData.forEach((v, si) => {
      const rnd = mulberry32(1000 + si * 7);
      const raw = weights.map(w => Math.max(0.0001, w * (0.5 + rnd()))); // soort-variatie
      const rawSum = raw.reduce((s, x) => s + x, 0);
      const exact = raw.map(x => (x / rawSum) * (v.count || 0));
      const rounded = exact.map(Math.round);
      // afrondings-rest verdelen zodat de som exact het totaal is
      let diff = (v.count || 0) - rounded.reduce((s, x) => s + x, 0);
      const order = exact.map((_, i) => i).sort((a, b) => (exact[b] - rounded[b]) - (exact[a] - rounded[a]));
      for (let k = 0; diff !== 0 && order.length; k++) {
        const i = order[k % order.length];
        const step = diff > 0 ? 1 : -1;
        if (rounded[i] + step >= 0) { rounded[i] += step; diff -= step; }
      }
      perSpecies.set(si, rounded);
    });

    const noun = currentPeriod === 'week' ? 'week' : currentPeriod === 'jaar' ? 'jaar' : 'maand';
    return { labels: groups.map(g => g.label), subs: groups.map(g => g.sub), agg, perSpecies, noun };
  }

  // --- Pings tekenen ---------------------------------------------------------
  const detailPanel = $('#radarDetail');
  const pingsGroup = svg.append('g');
  pings.forEach(p => {
    const g = pingsGroup.append('g')
      .attr('class', 'radar-ping').attr('data-naam', p.naam)
      .attr('transform', `translate(${p.x}, ${p.y})`)
      .attr('opacity', 0).attr('tabindex', 0).attr('role', 'img')
      .attr('aria-label', `${p.naam}: ${formatNumber(p.count)} waarnemingen`);
    g.append('circle').attr('class', 'radar-ping-bg').attr('r', 18).attr('fill', p.color).attr('opacity', 0.18);
    g.append('circle').attr('r', 8).attr('fill', p.color).attr('opacity', 0.6);
    const tint = ensureTintFilter(svg, p.color);
    g.append('g').attr('class', 'fish-wiggle')
      .append('image').attr('href', fishImagePath(p.naam))
      .attr('x', -22).attr('y', -14).attr('width', 44).attr('height', 28)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('filter', `url(#${tint})`);
    // Label rechts van de vis, tenzij het dan de rand raakt; idem voor links
    const labelRight = p.x > cx ? (p.x + 120 < W - 6) : (p.x - 120 < 6);
    const labelTextEl = g.append('text')
      .attr('x', labelRight ? 26 : -26).attr('y', 4)
      .attr('text-anchor', labelRight ? 'start' : 'end')
      .attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
      .attr('fill', COLORS.green).attr('opacity', 0.85)
      .text(`${p.naam} · ${formatNumber(p.count)}`);
    p.labelTextEl = labelTextEl;

    const showDetail = () => {
      pings.forEach(x => { x.selected = false; });
      pingsGroup.selectAll('.radar-ping').classed('selected', false);
      p.selected = true;
      g.classed('selected', true);
      detailPanel.innerHTML = `<strong>${p.naam}</strong>${formatNumber(p.current)} waarnemingen<br/>Piek: ${MONTH_FULL[p.monthly.indexOf(Math.max(...p.monthly))]}<br/>Diepte: ${p.diepte}<br/>Gewicht: ~${p.weight} kg`;
      detailPanel.classList.add('visible');
    };
    // Info verschijnt op hover (en op focus voor toetsenbord-navigatie). De
    // ping blijft dan vol zichtbaar; verlaat je 'm, dan verdwijnt het paneel
    // weer en dooft de ping mee met de sweep.
    const hideDetail = () => {
      p.hover = false;
      p.selected = false;
      g.classed('selected', false);
      detailPanel.classList.remove('visible');
    };
    g.on('mouseenter', () => { p.hover = true; g.attr('cursor', 'pointer'); showDetail(); });
    g.on('mouseleave', hideDetail);
    g.on('focus', showDetail);
    g.on('blur', hideDetail);
    p.elem = g;
    p.showDetail = showDetail;
  });

  // --- Tijdslider ------------------------------------------------------------
  // Onder de radar als los blok (niet zwevend), zodat hij nooit het
  // detailpaneel of de pings bedekt.
  const stageEl = $('#radarStage');
  const scrubber = document.createElement('div');
  scrubber.className = 'radar-scrubber';
  Object.assign(scrubber.style, {
    width: 'min(94%, 460px)', margin: '20px auto 0',
    display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center',
    fontFamily: FONT_BODY, boxSizing: 'border-box',
    background: 'rgba(253,247,239,0.78)',
    padding: '8px 14px 10px', borderRadius: '14px', border: '1px solid rgba(1,70,60,0.16)',
  });
  const sliderLabel = document.createElement('div');
  Object.assign(sliderLabel.style, { fontWeight: '700', fontSize: '13px', color: COLORS.green, textAlign: 'center' });
  const range = document.createElement('input');
  range.type = 'range';
  range.min = '0';
  range.max = String(buckets.labels.length);
  range.step = '1';
  range.value = '0';
  range.style.width = '100%';
  range.style.accentColor = COLORS.green;
  range.setAttribute('aria-label', `Tijdslider — sleep om door de ${buckets.noun} te scrubben`);
  scrubber.append(sliderLabel, range);
  stageEl.insertAdjacentElement('afterend', scrubber); // direct ónder de radar
  cleanups.push(() => scrubber.remove());

  // Zet alle pings op het gekozen tijdvak (pos 0 = hele periode = totalen)
  function applyTime(pos) {
    const isAll = pos === 0;
    sliderLabel.textContent = isAll
      ? `Hele ${buckets.noun} · ${formatNumber(totalAll)} waarnemingen`
      : `${buckets.labels[pos - 1]}${buckets.subs[pos - 1] ? ' · ' + buckets.subs[pos - 1] : ''}`;

    // Aantallen voor deze stand, en de afstand-schaal hierop hernormaliseren:
    // de drukste soort van dít tijdvak komt naar het midden, de rest erbuiten.
    // Zo staan ze altijd ten opzichte van elkaar i.p.v. allemaal aan de rand.
    const viewCounts = pings.map(p => isAll ? p.total : (buckets.perSpecies.get(p.si)?.[pos - 1] ?? 0));
    const viewMax = Math.max(...viewCounts, 1);
    const scale = d3.scaleSqrt().domain([0, viewMax]).range([outerDist, innerDist]).clamp(true);

    pings.forEach((p, idx) => {
      const c = viewCounts[idx];
      p.current = c;
      const dist = c > 0 ? scale(c) + p.jitter : outerDist + 10;
      p.x = cx + Math.cos(p.angle) * dist;
      p.y = cy + Math.sin(p.angle) * dist;
      p.elem.transition().duration(reduceMotion() ? 0 : 650).ease(d3.easeCubicInOut)
        .attr('transform', `translate(${p.x}, ${p.y})`);
      p.labelTextEl.text(`${p.naam} · ${formatNumber(c)}`);
      p.elem.attr('aria-label', `${p.naam}: ${formatNumber(c)} waarnemingen`);
      if (p.selected) p.showDetail(); // ververs detailpaneel met het nieuwe aantal
    });
  }
  range.addEventListener('input', () => applyTime(+range.value));
  applyTime(0);

  // --- Samenvatting ----------------------------------------------------------
  const topSpecies = visData.slice().sort((a, b) => (b.count || 0) - (a.count || 0))[0];
  const summaryEl = $('#radarSummary');
  if (summaryEl && topSpecies) {
    summaryEl.textContent = `De radar detecteert ${visData.length} vissoorten. Meest gesignaleerd: ${topSpecies.naam} (${formatNumber(topSpecies.count)} waarnemingen). Sleep de tijdslider om per ${buckets.noun === 'jaar' ? 'maand' : buckets.noun === 'maand' ? 'week' : 'dag'} te kijken.`;
  }

  // --- Sweep + naglooi -------------------------------------------------------
  // Elke ping onthoudt wanneer de sweep er voor het laatst overheen veegde
  // (litAt). De helderheid zakt daarna in ~GLOW_MS weg naar een lage vloer,
  // zodat de radar bij elke draai opnieuw "aftast" i.p.v. alles vast aan laat.
  const FLOOR = 0.12, GLOW_MS = 1600;
  let sweepAngle = -Math.PI / 2, frameId = 0, running = false;

  function tick(now) {
    sweepAngle += reduceMotion() ? 0.03 : 0.01;
    sweep.attr('transform', `rotate(${sweepAngle * 180 / Math.PI} ${cx} ${cy})`);
    pings.forEach(p => {
      const delta = (p.angle - sweepAngle + Math.PI * 4) % (Math.PI * 2);
      if (delta < 0.18) p.litAt = now; // sweep veegt over de ping → oplichten

      let op;
      if (reduceMotion()) op = 1;
      else if (p.hover || p.selected) op = 1;
      else if (p.litAt < 0) op = 0; // nog nooit gedetecteerd
      else {
        const age = (now - p.litAt) / GLOW_MS;
        const glow = age >= 1 ? 0 : (1 - age) * (1 - age); // easeOut-uitdoving
        op = FLOOR + (1 - FLOOR) * glow;
      }
      p.elem.attr('opacity', op);
    });
    if (running) frameId = raf(tick);
  }

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { if (!running) { running = true; frameId = raf(tick); } }
    else { running = false; cancelAnimationFrame(frameId); }
  }, { threshold: 0.2 });
  observer.observe($('#radarStage'));
  cleanups.push(() => { running = false; cancelAnimationFrame(frameId); observer.disconnect(); });
}
