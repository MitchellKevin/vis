import * as d3 from 'd3';
import { COLORS, FONT_BODY, MONTH_LONG_NL } from '../../scripts/mitchell/constants.js';
import { $, formatNumber, mulberry32, reduceMotion } from '../../scripts/mitchell/utils.js';
import { ensureTintFilter, fishImagePath } from '../../scripts/mitchell/fishImage.js';
import { state, lifecycle } from '../../scripts/mitchell/state.js';

const WIDTH = 620, HEIGHT = 620;
const CENTER_X = WIDTH / 2, CENTER_Y = HEIGHT / 2, RADIUS = 270;
const INNER_DISTANCE = 70;
const OUTER_DISTANCE = RADIUS - 55;
const ABSENT_DISTANCE = OUTER_DISTANCE + 10;
const MIN_GAP = 70;
const JITTER_RANGE = 22;
const PLACE_ATTEMPTS = 60;
const SCRUB_MS = 650;
const SWEEP_PERIOD = 10; // seconds — must match CSS animation duration

// Converts polar coordinates (angle in radians, radius) to SVG Cartesian coordinates.
const polarToPoint = (angle, r) => [CENTER_X + Math.cos(angle) * r, CENTER_Y + Math.sin(angle) * r];
// End point of the sweep sector: -π/4 = 315°, so the sector spans a quarter from right to top.
const [SWEEP_END_X, SWEEP_END_Y] = polarToPoint(-Math.PI / 4, RADIUS);
// Square-root scale: larger counts move towards the centre more slowly than a linear scale,
// keeping small species visible alongside dominant ones.
const makeDistanceScale = (maxCount) =>
  d3.scaleSqrt().domain([0, maxCount]).range([OUTER_DISTANCE, INNER_DISTANCE]).clamp(true);

export function initRadar() {
  const { visData, weekHours, weekDayLabels, weekDays, currentPeriod } = state;
  const { cleanups } = lifecycle;
  const svg = d3.select($('#radarStage').querySelector('svg[data-static]'));
  const maxCount = Math.max(...visData.map(v => v.count || 0), 1);
  const placementScale = makeDistanceScale(maxCount);

  const pings = placePings(visData, placementScale);
  const timePeriods = buildTimePeriods(visData, weekHours, weekDayLabels, weekDays, currentPeriod);
  const totalObservations = pings.reduce((sum, p) => sum + p.total, 0);

  const detailPanel = $('#radarDetail');
  const pingsGroup = svg.append('g');
  pings.forEach(ping => drawPing(ping, pings, pingsGroup, detailPanel, svg));
  cleanups.push(() => pingsGroup.remove());

  const sliderLabel = $('#radarSliderLabel');
  const slider = $('#radarSlider');
  slider.max = String(timePeriods.labels.length);
  slider.value = '0';
  slider.setAttribute('aria-label', `Tijdslider — sleep om door de ${timePeriods.noun} te scrubben`);
  cleanups.push(() => { slider.value = '0'; });

  function applyTime(i) {
    const whole = i === 0;
    sliderLabel.textContent = whole
      ? `Hele ${timePeriods.noun} · ${formatNumber(totalObservations)} waarnemingen`
      : `${timePeriods.labels[i - 1]}${timePeriods.subs[i - 1] ? ' · ' + timePeriods.subs[i - 1] : ''}`;

    const counts = pings.map(p => whole ? p.total : (timePeriods.perSpecies.get(p.speciesIndex)?.[i - 1] ?? 0));
    const scale = makeDistanceScale(Math.max(...counts, 1));

    pings.forEach((ping, idx) => {
      const count = counts[idx];
      ping.current = count;
      const r = count > 0 ? scale(count) + ping.jitter : ABSENT_DISTANCE;
      [ping.x, ping.y] = polarToPoint(ping.angle, r);
      ping.elem.transition().duration(reduceMotion() ? 0 : SCRUB_MS).ease(d3.easeCubicInOut)
        .attr('transform', `translate(${ping.x}, ${ping.y})`);
      ping.labelTextEl.text(`${ping.naam} · ${formatNumber(count)}`);
      ping.elem.attr('aria-label', `${ping.naam}: ${formatNumber(count)} waarnemingen`);
      if (ping.selected) ping.showDetail();
    });
  }
  slider.addEventListener('input', () => applyTime(+slider.value));
  applyTime(0);

  const summaryEl = $('#radarSummary');
  if (summaryEl) {
    const top = visData.slice().sort((a, b) => (b.count || 0) - (a.count || 0))[0];
    const perLabel = timePeriods.noun === 'jaar' ? 'maand' : timePeriods.noun === 'maand' ? 'week' : 'dag';
    if (top) summaryEl.textContent = `De radar detecteert ${visData.length} vissoorten. Meest gesignaleerd: ${top.naam} (${formatNumber(top.count)} waarnemingen). Sleep de slider om per ${perLabel} te kijken.`;
  }

  const radarStage = $('#radarStage');
  const visObs = new IntersectionObserver(([e]) => {
    radarStage.classList.toggle('is-paused', !e.isIntersecting);
  }, { threshold: 0.1 });
  visObs.observe(radarStage);
  cleanups.push(() => visObs.disconnect());
}

// Finds a position on the radar for each species so pings don't overlap.
// Strategy: try up to PLACE_ATTEMPTS random angles and pick the spot with
// the largest minimum distance to already-placed pings (best-of-N).
function placePings(visData, scale) {
  // Fixed seed so the layout is identical on every render (reproducible).
  const seed = mulberry32(42);
  const pings = [];
  visData.forEach((species, speciesIndex) => {
    // Small random offset per species so the ring doesn't look too rigid.
    const jitter = (seed() - 0.5) * JITTER_RANGE;
    const distance = species.count > 0 ? scale(species.count) + jitter : ABSENT_DISTANCE;
    let bestSpot = null, bestGap = -Infinity;
    for (let attempt = 0; attempt < PLACE_ATTEMPTS; attempt++) {
      // seed() * 2π = random angle distributed over the full circle.
      const angle = seed() * Math.PI * 2;
      const [x, y] = polarToPoint(angle, distance);
      // Math.hypot = Euclidean distance; reduce finds the nearest already-placed ping.
      const nearest = pings.reduce((min, p) => Math.min(min, Math.hypot(p.x - x, p.y - y)), Infinity);
      if (nearest >= MIN_GAP) { bestSpot = { angle, x, y }; break; } // enough space found
      if (nearest > bestGap) { bestGap = nearest; bestSpot = { angle, x, y }; } // remember best option
    }
    pings.push({ ...species, ...bestSpot, speciesIndex, jitter, total: species.count || 0, current: species.count || 0, selected: false });
  });
  return pings;
}

// Made with Claude
function drawPing(ping, pings, pingsGroup, detailPanel, svg) {
  // Compute a negative animation-delay so the CSS sweep animation appears in sync
  // with the ping's angle: pings at the start of the sweep get a smaller delay.
  // Formula: -(SWEEP_PERIOD × (1 - angle / 2π)) → ping at angle 0 = maximum delay.
  const glowDelay = `${-(SWEEP_PERIOD * (1 - ping.angle / (Math.PI * 2))).toFixed(2)}s`;

  const pingGroup = pingsGroup.append('g')
    .attr('class', 'radar-ping')
    .attr('transform', `translate(${ping.x}, ${ping.y})`)
    .attr('tabindex', 0).attr('role', 'img')
    .attr('aria-label', `${ping.naam}: ${formatNumber(ping.current)} waarnemingen`)
    .style('animation-delay', glowDelay);

  pingGroup.append('circle').attr('class', 'radar-ping-bg').attr('r', 18).attr('fill', ping.color).attr('opacity', 0.18);
  pingGroup.append('circle').attr('r', 8).attr('fill', ping.color).attr('opacity', 0.6);

  const tintFilterId = ensureTintFilter(svg, ping.color);
  pingGroup.append('g').attr('class', 'fish-wiggle')
    .append('image').attr('href', fishImagePath(ping.naam))
    .attr('x', -22).attr('y', -14).attr('width', 44).attr('height', 28)
    .attr('preserveAspectRatio', 'xMidYMid meet').attr('filter', `url(#${tintFilterId})`);

  const labelOnRight = ping.x > CENTER_X ? (ping.x + 120 < WIDTH - 6) : (ping.x - 120 < 6);
  ping.labelTextEl = pingGroup.append('text')
    .attr('x', labelOnRight ? 26 : -26).attr('y', 4)
    .attr('text-anchor', labelOnRight ? 'start' : 'end')
    .attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
    .attr('fill', COLORS.green).attr('opacity', 0.85)
    .text(`${ping.naam} · ${formatNumber(ping.current)}`);

  ping.showDetail = () => {
    pings.forEach(p => { p.selected = false; });
    pingsGroup.selectAll('.radar-ping').classed('selected', false);
    ping.selected = true;
    pingGroup.classed('selected', true);
    detailPanel.innerHTML = `<strong>${ping.naam}</strong>${formatNumber(ping.current)} waarnemingen`;
    detailPanel.classList.add('visible');
  };
  const hideDetail = () => {
    ping.selected = false;
    pingGroup.classed('selected', false);
    detailPanel.classList.remove('visible');
  };

  pingGroup.on('mouseenter', ping.showDetail).on('mouseleave', hideDetail)
           .on('focus', ping.showDetail).on('blur', hideDetail);
  ping.elem = pingGroup;
}


// Builds the time periods for the slider: groups days into weeks or months
// and distributes each species' observation count proportionally across those periods.
function buildTimePeriods(visData, weekHours, weekDayLabels, weekDays, currentPeriod) {
  // weekHours is a flat array of 24 values per day; derive how many days there are.
  const dayCount = weekDayLabels.length || Math.max(1, Math.floor((weekHours.length || 0) / 24));

  // Sum the hourly values per day (day d = indices d*24 through d*24+23).
  const dayTotals = Array.from({ length: dayCount }, (_, day) => {
    let sum = 0;
    for (let h = 0; h < 24; h++) sum += weekHours[day * 24 + h] || 0;
    return sum;
  });

  // Group days into periods (day / week / month) depending on the active period.
  const groups = buildGroups(currentPeriod, dayCount, weekDayLabels, weekDays);

  // Calculate the weight of each period: its share of the total hourly volume.
  // This determines how observations are distributed proportionally across periods.
  const weights = (() => {
    const totals = groups.map(g => g.days.reduce((s, d) => s + (dayTotals[d] || 0), 0));
    const sum = totals.reduce((s, v) => s + v, 0) || 1; // || 1 prevents division by zero
    return totals.map(v => v / sum); // normalise to fractions that sum to 1
  })();

  // Distribute each species' total across the periods; each species gets its own seed
  // so the noise differs per species but remains reproducible.
  const perSpecies = new Map();
  visData.forEach((species, idx) => {
    perSpecies.set(idx, distributeOverPeriods(species.count || 0, weights, mulberry32(1000 + idx * 7)));
  });

  const noun = currentPeriod === 'week' ? 'week' : currentPeriod === 'jaar' ? 'jaar' : 'maand';
  return { labels: groups.map(g => g.label), subs: groups.map(g => g.sub), perSpecies, noun };
}

// Returns an array of periods, each with { label, sub, days[] }.
// days[] contains the day indices that belong to that period.
function buildGroups(period, dayCount, weekDayLabels, weekDays) {
  if (period === 'week') {
    // One period per day; label = the day name from weekDayLabels.
    return Array.from({ length: dayCount }, (_, d) => ({ label: weekDayLabels[d] || `Dag ${d + 1}`, sub: '', days: [d] }));
  }
  if (period === 'jaar') {
    // Group by calendar month using a Map with key "year-month".
    const byMonth = new Map();
    for (let d = 0; d < dayCount; d++) {
      const date = new Date(weekDays[d]);
      const valid = !Number.isNaN(date.getTime()); // weekDays[d] may be missing or invalid
      // Key: "2025-5" for June 2025 (getUTCMonth() is 0-based).
      // Fallback: "m0", "m1", … based on day index divided by 30.
      const key = valid ? `${date.getUTCFullYear()}-${date.getUTCMonth()}` : `m${Math.floor(d / 30)}`;
      if (!byMonth.has(key)) byMonth.set(key, { label: valid ? MONTH_LONG_NL[date.getUTCMonth()] : `Maand ${byMonth.size + 1}`, sub: '', days: [] });
      byMonth.get(key).days.push(d);
    }
    return [...byMonth.values()]; // spread iterator into array
  }
  // Default (month): groups of 7 days per week.
  // Math.ceil(dayCount / 7) = number of full weeks plus any partial final week.
  return Array.from({ length: Math.ceil(dayCount / 7) }, (_, w) => {
    const start = w * 7, end = Math.min(start + 6, dayCount - 1); // last week may be shorter
    return { label: `Week ${w + 1}`, sub: `${weekDayLabels[start] || ''}–${weekDayLabels[end] || ''}`, days: Array.from({ length: end - start + 1 }, (_, i) => start + i) };
  });
}

// Distributes `total` observations proportionally across periods according to `weights`,
// with random noise so the result doesn't look artificial.
// Uses the "largest remainder" correction to fix rounding errors:
// the sum of rounded values must equal `total` exactly.
function distributeOverPeriods(total, weights, seed) {
  // Add noise to each weight (0.5 + seed() = range 0.5–1.5) for a natural distribution.
  const raw = weights.map(w => Math.max(0.0001, w * (0.5 + seed())));
  const rawSum = raw.reduce((s, x) => s + x, 0);
  // First estimate: proportions multiplied by total, rounded to whole numbers.
  const rounded = raw.map(x => Math.round((x / rawSum) * total));
  // diff = the error introduced by rounding (can be positive or negative).
  let diff = total - rounded.reduce((s, x) => s + x, 0);
  // Sort periods by rounding error size (largest remainder first) to spread the correction fairly.
  const order = rounded.map((_, i) => i).sort((a, b) => (raw[b] / rawSum * total - rounded[b]) - (raw[a] / rawSum * total - rounded[a]));
  for (let k = 0; diff !== 0; k++) {
    const i = order[k % order.length];
    const step = diff > 0 ? 1 : -1;
    if (rounded[i] + step >= 0) { rounded[i] += step; diff -= step; }
  }
  return rounded;
}

export default function RadarChapter() {
  const sweepPath = `M ${CENTER_X} ${CENTER_Y} L ${CENTER_X + RADIUS} ${CENTER_Y} A ${RADIUS} ${RADIUS} 0 0 0 ${SWEEP_END_X} ${SWEEP_END_Y} Z`;
  return (
    <section id="ch-radar" className="chapter" aria-label="Visradar">
      <div className="chapter-inner chapter-split chapter-split--reverse">
        <div className="chapter-text">
          <p className="eyebrow reveal">Sonar</p>
          <h2 className="reveal">Wat zwemt er onder de sluis?</h2>
          <p className="lede reveal">We zien meer dan je denkt. De radar tikt door en bij elke draai licht weer een soort op.</p>
          <p className="chapter-stat reveal" id="radarSummary" aria-live="polite"></p>
        </div>
        <div className="chapter-viz">
          <div className="radar-stage" id="radarStage" aria-label="Radar met opflitsende vissoorten">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} data-static="true" width="100%" height="100%">
              <defs>
                <linearGradient id="radarSweep" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(1,70,60,0.0)" />
                  <stop offset="100%" stopColor="rgba(1,70,60,0.22)" />
                </linearGradient>
              </defs>
              <circle cx={CENTER_X} cy={CENTER_Y} r={RADIUS} fill="rgba(1,70,60,0.03)" />
              <circle cx={CENTER_X} cy={CENTER_Y} r={RADIUS * 1 / 4} fill="none" stroke="rgba(1,70,60,0.22)" strokeWidth={1} strokeDasharray="2 6" />
              <circle cx={CENTER_X} cy={CENTER_Y} r={RADIUS * 2 / 4} fill="none" stroke="rgba(1,70,60,0.22)" strokeWidth={1} strokeDasharray="2 6" />
              <circle cx={CENTER_X} cy={CENTER_Y} r={RADIUS * 3 / 4} fill="none" stroke="rgba(1,70,60,0.22)" strokeWidth={1} strokeDasharray="2 6" />
              <circle cx={CENTER_X} cy={CENTER_Y} r={RADIUS} fill="none" stroke="rgba(1,70,60,0.40)" strokeWidth={1.3} />
              <line x1={CENTER_X - RADIUS} y1={CENTER_Y} x2={CENTER_X + RADIUS} y2={CENTER_Y} stroke="rgba(1,70,60,0.16)" strokeWidth={1} />
              <line x1={CENTER_X} y1={CENTER_Y - RADIUS} x2={CENTER_X} y2={CENTER_Y + RADIUS} stroke="rgba(1,70,60,0.16)" strokeWidth={1} />
              <g className="radar-sweep-group">
                <path d={sweepPath} fill="url(#radarSweep)" opacity={0.6} />
              </g>
              <circle cx={CENTER_X} cy={CENTER_Y} r={5} fill={COLORS.green} />
            </svg>
            <div className="radar-detail-panel" id="radarDetail" role="status" aria-live="polite"></div>
          </div>
          <div className="radar-scrubber">
            <div id="radarSliderLabel"></div>
            <input id="radarSlider" type="range" min="0" defaultValue="0" step="1" />
          </div>
        </div>
      </div>
    </section>
  );
}
