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
const WIDTH = 620, HEIGHT = 620;       // tekenvlak
const CENTER_X = WIDTH / 2, CENTER_Y = HEIGHT / 2, RADIUS = 270; // middelpunt + buitenstraal
const INNER_DISTANCE = 70;             // dichtst bij het midden (drukste soort)
const OUTER_DISTANCE = RADIUS - 55;    // bij de rand (zeldzaamste soort)
const ABSENT_DISTANCE = OUTER_DISTANCE + 10; // net buiten de rand: 0 waarnemingen
const MIN_GAP = 70;                    // minimale afstand tussen twee pings (px)
const JITTER_RANGE = 22;               // hoeveel pings van de perfecte cirkel afwijken
const PLACE_ATTEMPTS = 60;             // pogingen om een vrije plek te vinden
const SWEEP_SPEED = 0.01;              // draaisnelheid van de sweep (rad/frame)
const SWEEP_SPEED_REDUCED = 0.03;      // idem bij "animaties uit"
const REVEAL_ARC = 0.18;               // binnen deze hoek licht de sweep een ping op
const MIN_GLOW = 0.12;                 // laagste helderheid (nooit helemaal weg)
const GLOW_MS = 1600;                  // hoe lang de naglooi duurt
const SCRUB_MS = 650;                  // overgangsduur bij het scrubben

// Poolcoördinaat → schermpunt (hoek + afstand → [x, y]).
const polarToPoint = (angle, distance) => [CENTER_X + Math.cos(angle) * distance, CENTER_Y + Math.sin(angle) * distance];
// Afstand-schaal: 0 waarnemingen → buitenrand, 'maxCount' → midden.
const makeDistanceScale = (maxCount) =>
  d3.scaleSqrt().domain([0, maxCount]).range([OUTER_DISTANCE, INNER_DISTANCE]).clamp(true);

export function initRadar() {
  const { visData, weekHours, weekDayLabels, weekDays, currentPeriod } = state;
  const { cleanups } = lifecycle;
  const svg = d3.select($('#radarStage')).append('svg').attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);

  drawDecor(svg);
  const sweep = drawSweep(svg);

  // Afstand op basis van het totaal-aantal (gedeeld door plaatsing + tijdslider).
  const maxCount = Math.max(...visData.map(v => v.count || 0), 1);
  const placementScale = makeDistanceScale(maxCount);
  const distanceForCount = (count, jitter, scale = placementScale) =>
    count > 0 ? scale(count) + jitter : ABSENT_DISTANCE;

  const pings = placePings(visData, distanceForCount);
  const timeBuckets = buildTimeBuckets(visData, weekHours, weekDayLabels, weekDays, currentPeriod);
  const totalObservations = pings.reduce((sum, ping) => sum + ping.total, 0);

  const detailPanel = $('#radarDetail');
  const pingsGroup = svg.append('g');
  pings.forEach(ping => drawPing(ping, pings, pingsGroup, detailPanel, svg));

  // ── Tijdslider (onder de radar, zodat hij niets bedekt) ──
  const sliderLabel = makeSliderLabel();
  const slider = makeSlider(timeBuckets);
  mountScrubber(sliderLabel, slider, cleanups);

  // Zet alle pings op de gekozen tijd-stand (stand 0 = hele periode = totalen).
  function applyTime(bucketIndex) {
    const isWholePeriod = bucketIndex === 0;
    sliderLabel.textContent = isWholePeriod
      ? `Hele ${timeBuckets.noun} · ${formatNumber(totalObservations)} waarnemingen`
      : `${timeBuckets.labels[bucketIndex - 1]}${timeBuckets.subs[bucketIndex - 1] ? ' · ' + timeBuckets.subs[bucketIndex - 1] : ''}`;

    // Aantallen voor deze stand, en de schaal opnieuw normaliseren op de drukste
    // soort van dít tijdvak — zo staan ze altijd ten opzichte van elkaar.
    const countPerPing = pings.map(ping => isWholePeriod ? ping.total : (timeBuckets.perSpecies.get(ping.speciesIndex)?.[bucketIndex - 1] ?? 0));
    const distanceScale = makeDistanceScale(Math.max(...countPerPing, 1));

    pings.forEach((ping, index) => {
      const count = countPerPing[index];
      ping.current = count;
      const distance = count > 0 ? distanceScale(count) + ping.jitter : ABSENT_DISTANCE;
      [ping.x, ping.y] = polarToPoint(ping.angle, distance);
      ping.elem.transition().duration(reduceMotion() ? 0 : SCRUB_MS).ease(d3.easeCubicInOut)
        .attr('transform', `translate(${ping.x}, ${ping.y})`);
      ping.labelTextEl.text(`${ping.naam} · ${formatNumber(count)}`);
      ping.elem.attr('aria-label', `${ping.naam}: ${formatNumber(count)} waarnemingen`);
      if (ping.selected) ping.showDetail();
    });
  }
  slider.addEventListener('input', () => applyTime(+slider.value));
  applyTime(0);

  drawSummary(visData, timeBuckets);
  startSweep(sweep, pings, cleanups);
}

// ── Decor: schijf, ringen en dradenkruis ────────────────────────────────────
function drawDecor(svg) {
  // lichte vulling zodat de radar zich aftekent tegen de achtergrond
  svg.append('circle').attr('cx', CENTER_X).attr('cy', CENTER_Y).attr('r', RADIUS)
    .attr('fill', 'rgba(1,70,60,0.03)').attr('stroke', 'none');

  // vier ringen; de buitenste is steviger en solide, de rest gestippeld
  for (let ring = 1; ring <= 4; ring++) {
    const isOuterRing = ring === 4;
    svg.append('circle').attr('cx', CENTER_X).attr('cy', CENTER_Y).attr('r', RADIUS * ring / 4)
      .attr('fill', 'none')
      .attr('stroke', isOuterRing ? 'rgba(1,70,60,0.40)' : 'rgba(1,70,60,0.22)')
      .attr('stroke-width', isOuterRing ? 1.3 : 1)
      .attr('stroke-dasharray', isOuterRing ? 'none' : '2 6');
  }

  // dradenkruis: één horizontale en één verticale lijn door het midden
  const crosshairColor = 'rgba(1,70,60,0.16)';
  svg.append('line').attr('x1', CENTER_X - RADIUS).attr('y1', CENTER_Y).attr('x2', CENTER_X + RADIUS).attr('y2', CENTER_Y)
    .attr('stroke', crosshairColor).attr('stroke-width', 1);
  svg.append('line').attr('x1', CENTER_X).attr('y1', CENTER_Y - RADIUS).attr('x2', CENTER_X).attr('y2', CENTER_Y + RADIUS)
    .attr('stroke', crosshairColor).attr('stroke-width', 1);
}

// ── De draaiende sweep-wig (taartpunt met kleurverloop) ──────────────────────
function drawSweep(svg) {
  const gradient = svg.append('defs').append('linearGradient').attr('id', 'radarSweep')
    .attr('x1', 0).attr('y1', 0).attr('x2', 1).attr('y2', 0);
  gradient.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(1,70,60,0.0)');
  gradient.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(1,70,60,0.22)');

  const [endX, endY] = polarToPoint(-Math.PI / 4, RADIUS); // de wig beslaat 45°
  const sweep = svg.append('path')
    .attr('d', `M ${CENTER_X} ${CENTER_Y} L ${CENTER_X + RADIUS} ${CENTER_Y} A ${RADIUS} ${RADIUS} 0 0 0 ${endX} ${endY} Z`)
    .attr('fill', 'url(#radarSweep)').attr('opacity', 0.6);

  svg.append('circle').attr('cx', CENTER_X).attr('cy', CENTER_Y).attr('r', 5).attr('fill', COLORS.green); // middelpunt
  return sweep;
}

// ── Pings plaatsen (afstand = aantal, hoek = vrij plekje zonder overlap) ──────
function placePings(visData, distanceForCount) {
  const seed = mulberry32(42); // vaste seed → elke render dezelfde plaatsing
  const pings = [];
  visData.forEach((species, speciesIndex) => {
    const jitter = (seed() - 0.5) * JITTER_RANGE;
    const distance = distanceForCount(species.count, jitter);
    const freeSpot = pickFreeSpot(distance, pings, seed);
    pings.push({
      ...species, ...freeSpot, speciesIndex, jitter,
      total: species.count || 0, current: species.count || 0,
      litAt: -1e9, hover: false, selected: false,
    });
  });
  return pings;
}

// Probeer tot PLACE_ATTEMPTS willekeurige hoeken; pak de eerste die ver genoeg
// van de al-geplaatste pings ligt, anders de beste poging (rejection sampling).
function pickFreeSpot(distance, placed, seed) {
  let bestSpot = null, bestGap = -Infinity;
  for (let attempt = 0; attempt < PLACE_ATTEMPTS; attempt++) {
    const angle = seed() * Math.PI * 2;
    const [x, y] = polarToPoint(angle, distance);
    const nearestDistance = placed.reduce((min, p) => Math.min(min, Math.hypot(p.x - x, p.y - y)), Infinity);
    if (nearestDistance >= MIN_GAP) return { angle, x, y };
    if (nearestDistance > bestGap) { bestGap = nearestDistance; bestSpot = { angle, x, y }; }
  }
  return bestSpot;
}

// ── Eén ping tekenen (halo, kern, vis-plaatje, label) + hover-info ───────────
function drawPing(ping, pings, pingsGroup, detailPanel, svg) {
  const pingGroup = pingsGroup.append('g')
    .attr('class', 'radar-ping').attr('data-naam', ping.naam)
    .attr('transform', `translate(${ping.x}, ${ping.y})`)
    .attr('opacity', 0).attr('tabindex', 0).attr('role', 'img')
    .attr('aria-label', `${ping.naam}: ${formatNumber(ping.count)} waarnemingen`);

  pingGroup.append('circle').attr('class', 'radar-ping-bg').attr('r', 18).attr('fill', ping.color).attr('opacity', 0.18);
  pingGroup.append('circle').attr('r', 8).attr('fill', ping.color).attr('opacity', 0.6);

  const tintFilterId = ensureTintFilter(svg, ping.color);
  pingGroup.append('g').attr('class', 'fish-wiggle')
    .append('image').attr('href', fishImagePath(ping.naam))
    .attr('x', -22).attr('y', -14).attr('width', 44).attr('height', 28)
    .attr('preserveAspectRatio', 'xMidYMid meet').attr('filter', `url(#${tintFilterId})`);

  // label rechts van de vis, tenzij het dan de rand zou raken (dan links)
  const labelOnRight = ping.x > CENTER_X ? (ping.x + 120 < WIDTH - 6) : (ping.x - 120 < 6);
  ping.labelTextEl = pingGroup.append('text')
    .attr('x', labelOnRight ? 26 : -26).attr('y', 4)
    .attr('text-anchor', labelOnRight ? 'start' : 'end')
    .attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
    .attr('fill', COLORS.green).attr('opacity', 0.85)
    .text(`${ping.naam} · ${formatNumber(ping.count)}`);

  const showDetail = () => {
    pings.forEach(other => { other.selected = false; });
    pingsGroup.selectAll('.radar-ping').classed('selected', false);
    ping.selected = true;
    pingGroup.classed('selected', true);
    detailPanel.innerHTML = `<strong>${ping.naam}</strong>${formatNumber(ping.current)} waarnemingen<br/>Piek: ${MONTH_FULL[ping.monthly.indexOf(Math.max(...ping.monthly))]}<br/>Diepte: ${ping.diepte}<br/>Gewicht: ~${ping.weight} kg`;
    detailPanel.classList.add('visible');
  };
  const hideDetail = () => {
    ping.hover = false;
    ping.selected = false;
    pingGroup.classed('selected', false);
    detailPanel.classList.remove('visible');
  };

  // Info op hover (en op focus voor toetsenbord); eraf → weer weg.
  pingGroup.on('mouseenter', () => { ping.hover = true; pingGroup.attr('cursor', 'pointer'); showDetail(); });
  pingGroup.on('mouseleave', hideDetail);
  pingGroup.on('focus', showDetail);
  pingGroup.on('blur', hideDetail);

  ping.elem = pingGroup;
  ping.showDetail = showDetail;
}

// ── Samenvattingszin onder de kop ────────────────────────────────────────────
function drawSummary(visData, timeBuckets) {
  const topSpecies = visData.slice().sort((a, b) => (b.count || 0) - (a.count || 0))[0];
  const summaryEl = $('#radarSummary');
  if (!summaryEl || !topSpecies) return;
  const perLabel = timeBuckets.noun === 'jaar' ? 'maand' : timeBuckets.noun === 'maand' ? 'week' : 'dag';
  summaryEl.textContent = `De radar detecteert ${visData.length} vissoorten. Meest gesignaleerd: ${topSpecies.naam} (${formatNumber(topSpecies.count)} waarnemingen). Sleep de tijdslider om per ${perLabel} te kijken.`;
}

// ── De sweep draaien + de naglooi per frame ──────────────────────────────────
function startSweep(sweep, pings, cleanups) {
  let sweepAngle = -Math.PI / 2, frameId = 0, running = false;

  function tick(now) {
    sweepAngle += reduceMotion() ? SWEEP_SPEED_REDUCED : SWEEP_SPEED;
    sweep.attr('transform', `rotate(${sweepAngle * 180 / Math.PI} ${CENTER_X} ${CENTER_Y})`);

    pings.forEach(ping => {
      const angleBehindSweep = (ping.angle - sweepAngle + Math.PI * 4) % (Math.PI * 2);
      if (angleBehindSweep < REVEAL_ARC) ping.litAt = now; // sweep veegt over de ping → oplichten
      ping.elem.attr('opacity', glowOpacity(ping, now));
    });

    if (running) frameId = raf(tick);
  }

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { if (!running) { running = true; frameId = raf(tick); } }
    else { running = false; cancelAnimationFrame(frameId); }
  }, { threshold: 0.2 });
  visibilityObserver.observe($('#radarStage'));
  cleanups.push(() => { running = false; cancelAnimationFrame(frameId); visibilityObserver.disconnect(); });
}

// Helderheid van een ping: vol bij hover/selectie, anders uitdovende naglooi.
function glowOpacity(ping, now) {
  if (reduceMotion()) return 1;
  if (ping.hover || ping.selected) return 1;
  if (ping.litAt < 0) return 0;                 // nog nooit door de sweep geraakt
  const age = (now - ping.litAt) / GLOW_MS;
  const glow = age >= 1 ? 0 : (1 - age) * (1 - age); // zacht uitdovend (easeOut)
  return MIN_GLOW + (1 - MIN_GLOW) * glow;
}

// ── Tijdslider-bouwstenen ────────────────────────────────────────────────────
function makeSliderLabel() {
  const label = document.createElement('div');
  Object.assign(label.style, { fontWeight: '700', fontSize: '13px', color: COLORS.green, textAlign: 'center' });
  return label;
}
function makeSlider(timeBuckets) {
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = String(timeBuckets.labels.length);
  slider.step = '1';
  slider.value = '0';
  slider.style.width = '100%';
  slider.style.accentColor = COLORS.green;
  slider.setAttribute('aria-label', `Tijdslider — sleep om door de ${timeBuckets.noun} te scrubben`);
  return slider;
}
function mountScrubber(label, slider, cleanups) {
  const scrubberBox = document.createElement('div');
  scrubberBox.className = 'radar-scrubber';
  Object.assign(scrubberBox.style, {
    width: 'min(94%, 460px)', margin: '20px auto 0',
    display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center',
    fontFamily: FONT_BODY, boxSizing: 'border-box',
    background: 'rgba(253,247,239,0.78)',
    padding: '8px 14px 10px', borderRadius: '14px', border: '1px solid rgba(1,70,60,0.16)',
  });
  scrubberBox.append(label, slider);
  $('#radarStage').insertAdjacentElement('afterend', scrubberBox); // direct ónder de radar
  cleanups.push(() => scrubberBox.remove());
}

// ── Tijdvakken: groepeer de dagen en verdeel elk soort-totaal erover ─────────
function buildTimeBuckets(visData, weekHours, weekDayLabels, weekDays, currentPeriod) {
  const dayCount = weekDayLabels.length || Math.max(1, Math.floor((weekHours.length || 0) / 24));

  // totaal aantal belletjes per dag (de echte "drukte-vorm")
  const dayTotals = [];
  for (let day = 0; day < dayCount; day++) {
    let sum = 0;
    for (let hour = 0; hour < 24; hour++) sum += (weekHours[day * 24 + hour] || 0);
    dayTotals.push(sum);
  }

  const groups = groupDays(currentPeriod, dayCount, weekDayLabels, weekDays);

  // gewicht per tijdvak = aandeel van de drukte
  const bucketTotals = groups.map(group => group.days.reduce((sum, day) => sum + (dayTotals[day] || 0), 0));
  const bucketTotalsSum = bucketTotals.reduce((sum, v) => sum + v, 0) || 1;
  const weights = bucketTotals.map(v => v / bucketTotalsSum);

  // verdeel per soort het totaal over de tijdvakken (telt exact op)
  const perSpecies = new Map();
  visData.forEach((species, speciesIndex) => {
    perSpecies.set(speciesIndex, distributeOverBuckets(species.count || 0, weights, mulberry32(1000 + speciesIndex * 7)));
  });

  const noun = currentPeriod === 'week' ? 'week' : currentPeriod === 'jaar' ? 'jaar' : 'maand';
  return { labels: groups.map(g => g.label), subs: groups.map(g => g.sub), perSpecies, noun };
}

// Bepaal de tijdvakken (buckets) afhankelijk van de periode.
function groupDays(period, dayCount, weekDayLabels, weekDays) {
  if (period === 'week') {
    // elke dag een eigen tijdvak
    return Array.from({ length: dayCount }, (_, day) => ({ label: weekDayLabels[day] || `Dag ${day + 1}`, sub: '', days: [day] }));
  }
  if (period === 'jaar') {
    // groepeer per kalendermaand op basis van de datums
    const byMonth = new Map();
    for (let day = 0; day < dayCount; day++) {
      const date = new Date(weekDays[day]);
      const isValidDate = !Number.isNaN(date.getTime());
      const key = isValidDate ? `${date.getUTCFullYear()}-${date.getUTCMonth()}` : `m${Math.floor(day / 30)}`;
      if (!byMonth.has(key)) {
        byMonth.set(key, { label: isValidDate ? MONTH_LONG_NL[date.getUTCMonth()] : `Maand ${byMonth.size + 1}`, sub: '', days: [] });
      }
      byMonth.get(key).days.push(day);
    }
    return [...byMonth.values()];
  }
  // maand → weken van 7 dagen
  const groups = [];
  for (let weekIndex = 0; weekIndex * 7 < dayCount; weekIndex++) {
    const start = weekIndex * 7, end = Math.min(start + 6, dayCount - 1);
    const days = [];
    for (let day = start; day <= end; day++) days.push(day);
    groups.push({ label: `Week ${weekIndex + 1}`, sub: `${weekDayLabels[start] || ''}–${weekDayLabels[end] || ''}`, days });
  }
  return groups;
}

// Verdeel een totaal over de tijdvakken volgens 'weights' + soort-variatie,
// en corrigeer de afronding zodat de som exact het totaal blijft.
function distributeOverBuckets(total, weights, seed) {
  const raw = weights.map(weight => Math.max(0.0001, weight * (0.5 + seed())));
  const rawSum = raw.reduce((sum, x) => sum + x, 0);
  const exact = raw.map(x => (x / rawSum) * total);
  const rounded = exact.map(Math.round);

  let diff = total - rounded.reduce((sum, x) => sum + x, 0);
  const order = exact.map((_, i) => i).sort((a, b) => (exact[b] - rounded[b]) - (exact[a] - rounded[a]));
  for (let k = 0; diff !== 0 && order.length; k++) {
    const i = order[k % order.length];
    const step = diff > 0 ? 1 : -1;
    if (rounded[i] + step >= 0) { rounded[i] += step; diff -= step; }
  }
  return rounded;
}
