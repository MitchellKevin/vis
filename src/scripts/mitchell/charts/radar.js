import * as d3 from 'd3';
import { COLORS, FONT_BODY, MONTH_FULL, MONTH_LONG_NL } from '../constants.js';
import { $, formatNumber, mulberry32, reduceMotion } from '../utils.js';
import { ensureTintFilter, fishImagePath } from '../fishImage.js';
import { state, lifecycle, raf } from '../state.js';

// ============================================================================
// radar.js — een sonar/radar. Elke vissoort is een "ping": hoe vaker gezien,
// hoe dichter bij het midden. De draaiende sweep veegt eroverheen; elke ping
// licht op zodra de sweep passeert en dooft daarna langzaam weer (naglooi).
// Met de tijdslider scrub je door de periode: week→per dag, maand→per week,
// jaar→per maand.
// ============================================================================

// ── Instelbare waarden ──────────────────────────────────────────────────────
const W = 620, H = 620, cx = W / 2, cy = H / 2, R = 270; // vlak + middelpunt + buitenstraal
const INNER_DIST = 70;                 // dichtst bij het midden (drukste soort)
const OUTER_DIST = R - 55;             // bij de rand (zeldzaamste soort)
const ABSENT_DIST = OUTER_DIST + 10;   // net buiten de rand: 0 waarnemingen
const MIN_GAP = 70;                    // minimale afstand tussen twee pings (px)
const JITTER_RANGE = 22;               // hoeveel pings van de perfecte cirkel afwijken
const PLACE_TRIES = 60;                // pogingen om een vrije plek te vinden
const SWEEP_SPEED = 0.01;              // draaisnelheid van de sweep (rad/frame)
const SWEEP_SPEED_RM = 0.03;           // idem bij "animaties uit"
const REVEAL_ARC = 0.18;              // binnen deze hoek licht de sweep een ping op
const FLOOR = 0.12;                    // laagste helderheid (nooit helemaal weg)
const GLOW_MS = 1600;                  // hoe lang de naglooi duurt
const SCRUB_MS = 650;                  // overgangsduur bij het scrubben

// Poolcoördinaat → schermpunt (hoek + afstand → [x, y]).
const point = (angle, r) => [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
// Afstand-schaal: 0 waarnemingen → buitenrand, 'max' → midden.
const makeDistanceScale = (max) =>
  d3.scaleSqrt().domain([0, max]).range([OUTER_DIST, INNER_DIST]).clamp(true);

export function initRadar() {
  const { visData, weekHours, weekDayLabels, weekDays, currentPeriod } = state;
  const { cleanups } = lifecycle;
  const svg = d3.select($('#radarStage')).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

  drawDecor(svg);
  const sweep = drawSweep(svg);

  // Afstand op basis van het totaal-aantal (gedeeld door plaatsing + tijdslider).
  const maxCount = Math.max(...visData.map(v => v.count || 0), 1);
  const placeScale = makeDistanceScale(maxCount);
  const distanceFor = (count, jitter, scale = placeScale) =>
    count > 0 ? scale(count) + jitter : ABSENT_DIST;

  const pings = placePings(visData, distanceFor);
  const buckets = buildTimeBuckets(visData, weekHours, weekDayLabels, weekDays, currentPeriod);
  const totalAll = pings.reduce((s, p) => s + p.total, 0);

  const detailPanel = $('#radarDetail');
  const pingsGroup = svg.append('g');
  pings.forEach(p => drawPing(p, pings, pingsGroup, detailPanel, svg));

  // ── Tijdslider (onder de radar, zodat hij niets bedekt) ──
  const sliderLabel = makeSliderLabel();
  const slider = makeSlider(buckets);
  mountScrubber(sliderLabel, slider, cleanups);

  // Zet alle pings op de gekozen tijd-stand (pos 0 = hele periode = totalen).
  function applyTime(pos) {
    const isAll = pos === 0;
    sliderLabel.textContent = isAll
      ? `Hele ${buckets.noun} · ${formatNumber(totalAll)} waarnemingen`
      : `${buckets.labels[pos - 1]}${buckets.subs[pos - 1] ? ' · ' + buckets.subs[pos - 1] : ''}`;

    // Aantallen voor deze stand, en de schaal opnieuw normaliseren op de drukste
    // soort van dít tijdvak — zo staan ze altijd ten opzichte van elkaar.
    const counts = pings.map(p => isAll ? p.total : (buckets.perSpecies.get(p.si)?.[pos - 1] ?? 0));
    const scale = makeDistanceScale(Math.max(...counts, 1));

    pings.forEach((p, idx) => {
      const count = counts[idx];
      p.current = count;
      const dist = count > 0 ? scale(count) + p.jitter : ABSENT_DIST;
      [p.x, p.y] = point(p.angle, dist);
      p.elem.transition().duration(reduceMotion() ? 0 : SCRUB_MS).ease(d3.easeCubicInOut)
        .attr('transform', `translate(${p.x}, ${p.y})`);
      p.labelTextEl.text(`${p.naam} · ${formatNumber(count)}`);
      p.elem.attr('aria-label', `${p.naam}: ${formatNumber(count)} waarnemingen`);
      if (p.selected) p.showDetail();
    });
  }
  slider.addEventListener('input', () => applyTime(+slider.value));
  applyTime(0);

  drawSummary(visData, buckets);
  startSweep(sweep, pings, cleanups);
}

// ── Decor: schijf, ringen en dradenkruis ────────────────────────────────────
function drawDecor(svg) {
  // lichte vulling zodat de radar zich aftekent tegen de achtergrond
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R)
    .attr('fill', 'rgba(1,70,60,0.03)').attr('stroke', 'none');

  // vier ringen; de buitenste is steviger en solide, de rest gestippeld
  for (let i = 1; i <= 4; i++) {
    const isEdge = i === 4;
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R * i / 4)
      .attr('fill', 'none')
      .attr('stroke', isEdge ? 'rgba(1,70,60,0.40)' : 'rgba(1,70,60,0.22)')
      .attr('stroke-width', isEdge ? 1.3 : 1)
      .attr('stroke-dasharray', isEdge ? 'none' : '2 6');
  }

  // dradenkruis: één horizontale en één verticale lijn door het midden
  const crosshair = 'rgba(1,70,60,0.16)';
  svg.append('line').attr('x1', cx - R).attr('y1', cy).attr('x2', cx + R).attr('y2', cy)
    .attr('stroke', crosshair).attr('stroke-width', 1);
  svg.append('line').attr('x1', cx).attr('y1', cy - R).attr('x2', cx).attr('y2', cy + R)
    .attr('stroke', crosshair).attr('stroke-width', 1);
}

// ── De draaiende sweep-wig (taartpunt met kleurverloop) ──────────────────────
function drawSweep(svg) {
  const grad = svg.append('defs').append('linearGradient').attr('id', 'radarSweep')
    .attr('x1', 0).attr('y1', 0).attr('x2', 1).attr('y2', 0);
  grad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(1,70,60,0.0)');
  grad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(1,70,60,0.22)');

  const [endX, endY] = point(-Math.PI / 4, R); // de wig beslaat 45°
  const sweep = svg.append('path')
    .attr('d', `M ${cx} ${cy} L ${cx + R} ${cy} A ${R} ${R} 0 0 0 ${endX} ${endY} Z`)
    .attr('fill', 'url(#radarSweep)').attr('opacity', 0.6);

  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 5).attr('fill', COLORS.green); // middelpunt
  return sweep;
}

// ── Pings plaatsen (afstand = aantal, hoek = vrij plekje zonder overlap) ──────
function placePings(visData, distanceFor) {
  const seed = mulberry32(42); // vaste seed → elke render dezelfde plaatsing
  const pings = [];
  visData.forEach((v, si) => {
    const jitter = (seed() - 0.5) * JITTER_RANGE;
    const distance = distanceFor(v.count, jitter);
    const spot = pickFreeSpot(distance, pings, seed);
    pings.push({
      ...v, ...spot, si, jitter,
      total: v.count || 0, current: v.count || 0,
      litAt: -1e9, hover: false, selected: false,
    });
  });
  return pings;
}

// Probeer tot PLACE_TRIES willekeurige hoeken; pak de eerste die ver genoeg van
// de al-geplaatste pings ligt, anders de beste poging (rejection sampling).
function pickFreeSpot(distance, placed, seed) {
  let best = null, bestGap = -Infinity;
  for (let t = 0; t < PLACE_TRIES; t++) {
    const angle = seed() * Math.PI * 2;
    const [x, y] = point(angle, distance);
    const nearest = placed.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.y - y)), Infinity);
    if (nearest >= MIN_GAP) return { angle, x, y };
    if (nearest > bestGap) { bestGap = nearest; best = { angle, x, y }; }
  }
  return best;
}

// ── Eén ping tekenen (halo, kern, vis-plaatje, label) + hover-info ───────────
function drawPing(p, pings, pingsGroup, detailPanel, svg) {
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
    .attr('preserveAspectRatio', 'xMidYMid meet').attr('filter', `url(#${tint})`);

  // label rechts van de vis, tenzij het dan de rand zou raken (dan links)
  const labelRight = p.x > cx ? (p.x + 120 < W - 6) : (p.x - 120 < 6);
  p.labelTextEl = g.append('text')
    .attr('x', labelRight ? 26 : -26).attr('y', 4)
    .attr('text-anchor', labelRight ? 'start' : 'end')
    .attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
    .attr('fill', COLORS.green).attr('opacity', 0.85)
    .text(`${p.naam} · ${formatNumber(p.count)}`);

  const showDetail = () => {
    pings.forEach(x => { x.selected = false; });
    pingsGroup.selectAll('.radar-ping').classed('selected', false);
    p.selected = true;
    g.classed('selected', true);
    detailPanel.innerHTML = `<strong>${p.naam}</strong>${formatNumber(p.current)} waarnemingen<br/>Piek: ${MONTH_FULL[p.monthly.indexOf(Math.max(...p.monthly))]}<br/>Diepte: ${p.diepte}<br/>Gewicht: ~${p.weight} kg`;
    detailPanel.classList.add('visible');
  };
  const hideDetail = () => {
    p.hover = false;
    p.selected = false;
    g.classed('selected', false);
    detailPanel.classList.remove('visible');
  };

  // Info op hover (en op focus voor toetsenbord); eraf → weer weg.
  g.on('mouseenter', () => { p.hover = true; g.attr('cursor', 'pointer'); showDetail(); });
  g.on('mouseleave', hideDetail);
  g.on('focus', showDetail);
  g.on('blur', hideDetail);

  p.elem = g;
  p.showDetail = showDetail;
}

// ── Samenvattingszin onder de kop ────────────────────────────────────────────
function drawSummary(visData, buckets) {
  const top = visData.slice().sort((a, b) => (b.count || 0) - (a.count || 0))[0];
  const el = $('#radarSummary');
  if (!el || !top) return;
  const per = buckets.noun === 'jaar' ? 'maand' : buckets.noun === 'maand' ? 'week' : 'dag';
  el.textContent = `De radar detecteert ${visData.length} vissoorten. Meest gesignaleerd: ${top.naam} (${formatNumber(top.count)} waarnemingen). Sleep de tijdslider om per ${per} te kijken.`;
}

// ── De sweep draaien + de naglooi per frame ──────────────────────────────────
function startSweep(sweep, pings, cleanups) {
  let sweepAngle = -Math.PI / 2, frameId = 0, running = false;

  function tick(now) {
    sweepAngle += reduceMotion() ? SWEEP_SPEED_RM : SWEEP_SPEED;
    sweep.attr('transform', `rotate(${sweepAngle * 180 / Math.PI} ${cx} ${cy})`);

    pings.forEach(p => {
      const delta = (p.angle - sweepAngle + Math.PI * 4) % (Math.PI * 2);
      if (delta < REVEAL_ARC) p.litAt = now; // sweep veegt over de ping → oplichten
      p.elem.attr('opacity', glowOpacity(p, now));
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

// Helderheid van een ping: vol bij hover/selectie, anders uitdovende naglooi.
function glowOpacity(p, now) {
  if (reduceMotion()) return 1;
  if (p.hover || p.selected) return 1;
  if (p.litAt < 0) return 0;                 // nog nooit door de sweep geraakt
  const age = (now - p.litAt) / GLOW_MS;
  const glow = age >= 1 ? 0 : (1 - age) * (1 - age); // zacht uitdovend (easeOut)
  return FLOOR + (1 - FLOOR) * glow;
}

// ── Tijdslider-bouwstenen ────────────────────────────────────────────────────
function makeSliderLabel() {
  const el = document.createElement('div');
  Object.assign(el.style, { fontWeight: '700', fontSize: '13px', color: COLORS.green, textAlign: 'center' });
  return el;
}
function makeSlider(buckets) {
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = String(buckets.labels.length);
  slider.step = '1';
  slider.value = '0';
  slider.style.width = '100%';
  slider.style.accentColor = COLORS.green;
  slider.setAttribute('aria-label', `Tijdslider — sleep om door de ${buckets.noun} te scrubben`);
  return slider;
}
function mountScrubber(label, slider, cleanups) {
  const box = document.createElement('div');
  box.className = 'radar-scrubber';
  Object.assign(box.style, {
    width: 'min(94%, 460px)', margin: '20px auto 0',
    display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center',
    fontFamily: FONT_BODY, boxSizing: 'border-box',
    background: 'rgba(253,247,239,0.78)',
    padding: '8px 14px 10px', borderRadius: '14px', border: '1px solid rgba(1,70,60,0.16)',
  });
  box.append(label, slider);
  $('#radarStage').insertAdjacentElement('afterend', box); // direct ónder de radar
  cleanups.push(() => box.remove());
}

// ── Tijdvakken: groepeer de dagen en verdeel elk soort-totaal erover ─────────
function buildTimeBuckets(visData, weekHours, weekDayLabels, weekDays, currentPeriod) {
  const dayCount = weekDayLabels.length || Math.max(1, Math.floor((weekHours.length || 0) / 24));

  // totaal aantal belletjes per dag (de echte "drukte-vorm")
  const dayTotals = [];
  for (let d = 0; d < dayCount; d++) {
    let sum = 0;
    for (let h = 0; h < 24; h++) sum += (weekHours[d * 24 + h] || 0);
    dayTotals.push(sum);
  }

  const groups = groupDays(currentPeriod, dayCount, weekDayLabels, weekDays);

  // gewicht per tijdvak = aandeel van de drukte
  const agg = groups.map(g => g.days.reduce((s, d) => s + (dayTotals[d] || 0), 0));
  const aggSum = agg.reduce((s, v) => s + v, 0) || 1;
  const weights = agg.map(v => v / aggSum);

  // verdeel per soort het totaal over de tijdvakken (telt exact op)
  const perSpecies = new Map();
  visData.forEach((v, si) => {
    perSpecies.set(si, distributeOverBuckets(v.count || 0, weights, mulberry32(1000 + si * 7)));
  });

  const noun = currentPeriod === 'week' ? 'week' : currentPeriod === 'jaar' ? 'jaar' : 'maand';
  return { labels: groups.map(g => g.label), subs: groups.map(g => g.sub), agg, perSpecies, noun };
}

// Bepaal de tijdvakken (buckets) afhankelijk van de periode.
function groupDays(period, dayCount, weekDayLabels, weekDays) {
  if (period === 'week') {
    // elke dag een eigen tijdvak
    return Array.from({ length: dayCount }, (_, d) => ({ label: weekDayLabels[d] || `Dag ${d + 1}`, sub: '', days: [d] }));
  }
  if (period === 'jaar') {
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
    return [...byMonth.values()];
  }
  // maand → weken van 7 dagen
  const groups = [];
  for (let w = 0; w * 7 < dayCount; w++) {
    const start = w * 7, end = Math.min(start + 6, dayCount - 1);
    const days = [];
    for (let d = start; d <= end; d++) days.push(d);
    groups.push({ label: `Week ${w + 1}`, sub: `${weekDayLabels[start] || ''}–${weekDayLabels[end] || ''}`, days });
  }
  return groups;
}

// Verdeel een totaal over de tijdvakken volgens 'weights' + soort-variatie,
// en corrigeer de afronding zodat de som exact het totaal blijft.
function distributeOverBuckets(total, weights, seed) {
  const raw = weights.map(w => Math.max(0.0001, w * (0.5 + seed())));
  const rawSum = raw.reduce((s, x) => s + x, 0);
  const exact = raw.map(x => (x / rawSum) * total);
  const rounded = exact.map(Math.round);

  let diff = total - rounded.reduce((s, x) => s + x, 0);
  const order = exact.map((_, i) => i).sort((a, b) => (exact[b] - rounded[b]) - (exact[a] - rounded[a]));
  for (let k = 0; diff !== 0 && order.length; k++) {
    const i = order[k % order.length];
    const step = diff > 0 ? 1 : -1;
    if (rounded[i] + step >= 0) { rounded[i] += step; diff -= step; }
  }
  return rounded;
}
