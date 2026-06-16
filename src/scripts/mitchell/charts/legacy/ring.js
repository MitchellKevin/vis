import * as d3 from 'd3';
import { COLORS, FONT_BODY, FONT_DISPLAY, MONTH_SHORT_NL, MONTH_LONG_NL } from '../../constants.js';
import { $, formatNumber, reduceMotion } from '../../utils.js';
import { showTooltip, hideTooltip } from '../../tooltip.js';
import { state } from '../../state.js';

/**
 * RINGKALENDER — Radiale visualisatie van activiteit in de tijd
 *
 * CONCEPT:
 * Elke puntje vertegenwoordigt een moment (uur of dag).
 * - Hoek (360°) = wanneer het moment plaatsvond (klok mee vanaf bovenaan)
 * - Afstand tot midden = hoe druk het was (verder = drukker)
 * - Kleur = intensiteit (grijs → groen → paars/rood)
 * - Grootte = drukte (groter = drukker)
 *
 * ZOOMFUNCTIONALITEIT (voor 'jaar' mode):
 * jaar → maand → dag. Elk niveau heeft eigen ring.
 * - drawYear() = 12 maand-wiggen met dagen erin
 * - drawMonth() = 28/31 dag-wiggen met uren erin
 * - drawDay() = 24 uur-wiggen met 1 bal per uur
 *
 * PLATTE RING (voor 'week'/'maand' mode):
 * - drawFlat() = één ring voor alle uren, geen zoom
 */

export function initRing() {
  const { weekHours, weekDayLabels, weekDays, periodLabel, currentPeriod, TOTAL } = state;
  const W = 680, H = 680, cx = W / 2, cy = H / 2;
  const innerR = 130, outerR = 290;
  const stageSel = d3.select($('#ringStage'));
  const svg = stageSel.append('svg').attr('viewBox', `0 0 ${W} ${H}`);

  // Bepaal of we in "jaar-mode" (met zoom) of "flat-mode" (geen zoom) zijn
  const isYear = currentPeriod === 'jaar' && weekDays && weekDays.length;

  /**
   * MAAND-GROEPERING (alleen bij jaar-mode)
   * Organiseer dagen per maand zodat we kunnen in/uitzoomen.
   * Opbouw: months[i] = { monthIdx, year, short/long, days[], total }
   */
  const months = [];
  if (isYear) {
    let cur = null;
    weekDays.forEach((dateStr, i) => {
      const dt = new Date(dateStr);
      if (Number.isNaN(dt.getTime())) return;

      const key = `${dt.getUTCFullYear()}-${dt.getUTCMonth()}`;
      // Nieuwe maand? Maak een maand-object
      if (!cur || cur.key !== key) {
        cur = {
          key, monthIdx: dt.getUTCMonth(), year: dt.getUTCFullYear(),
          short: MONTH_SHORT_NL[dt.getUTCMonth()], long: MONTH_LONG_NL[dt.getUTCMonth()],
          days: [], total: 0,
        };
        months.push(cur);
      }

      // Voeg dag toe aan huidige maand
      const hours = (weekHours || []).slice(i * 24, (i + 1) * 24); // 24 uur voor deze dag
      const total = hours.reduce((s, v) => s + (v || 0), 0); // Totaal voor deze dag
      cur.days.push({ dayOfMonth: dt.getUTCDate(), label: weekDayLabels[i] || '', hours, total });
      cur.total += total; // Accumuleer maandtotaal
    });
  }

  /**
   * VIEW STATE — Bepaalt welke tekenfunctie wordt gebruikt
   * - { level: 'flat' } = eenvoudige ring (week/maand)
   * - { level: 'year' } = jaar-overzicht (klikbare maanden)
   * - { level: 'month', monthIndex } = maand-zoom (klikbare dagen)
   * - { level: 'day', monthIndex, dayIndex } = dag-zoom (niet klikbaar)
   */
  let view = isYear ? { level: 'year' } : { level: 'flat' };
  draw();

  function draw() {
    svg.selectAll('*').remove();
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', innerR + 8)
      .attr('fill', 'none').attr('stroke', 'rgba(1,70,60,0.15)').attr('stroke-dasharray', '2 5');
    if (view.level === 'flat')      drawFlat();
    else if (view.level === 'year') drawYear();
    else if (view.level === 'month') drawMonth(view.monthIndex);
    else if (view.level === 'day')   drawDay(view.monthIndex, view.dayIndex);
  }

  /**
   * Teken centraal getal (+ subtekst en optioneel terug-knop)
   * @param {string} big - Groot getal in midden (bijv. "847")
   * @param {string} sub - Subtekst/eenheid (bijv. "bel oproepen")
   * @param {string} hint - Instructie ("klik maand") of info ("← terug")
   * @param {function} onBack - Callback als gebruiker terug klikt (null = geen knop)
   */
  function drawCenter(big, sub, hint, onBack) {
    // Groot getal
    svg.append('text').attr('x', cx).attr('y', cy - 10).attr('text-anchor', 'middle')
      .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('font-size', big.length > 12 ? 32 : 44)
      .attr('fill', COLORS.green).text(big);

    // Subtekst (eenheid)
    svg.append('text').attr('x', cx).attr('y', cy + 16).attr('text-anchor', 'middle')
      .attr('font-family', FONT_BODY).attr('font-size', 13).attr('font-weight', 700)
      .attr('fill', COLORS.green).attr('opacity', 0.6).text(sub);

    // Optioneel: interactieve terug-knop (als onBack gegeven) of statische hint
    if (onBack) {
      const g = svg.append('g').attr('cursor', 'pointer').attr('tabindex', 0).attr('role', 'button')
        .on('click', onBack).on('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBack(); } });
      g.append('rect').attr('x', cx - 78).attr('y', cy + 32).attr('width', 156).attr('height', 28)
        .attr('rx', 14).attr('fill', 'rgba(1,70,60,0.08)').attr('stroke', 'rgba(1,70,60,0.18)');
      g.append('text').attr('x', cx).attr('y', cy + 51).attr('text-anchor', 'middle')
        .attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
        .attr('fill', COLORS.green).text(hint);
    } else if (hint) {
      // Statische hint-tekst onder het getal
      svg.append('text').attr('x', cx).attr('y', cy + 42).attr('text-anchor', 'middle')
        .attr('font-family', FONT_BODY).attr('font-size', 13)
        .attr('fill', COLORS.bell).attr('opacity', 0.95).text(hint);
    }
  }

  /**
   * FLAT MODE — Eenvoudige ring voor week/maand (geen zoom)
   * Laat alle uren zien verdeeld over dagen, zonder zoomfunctionaliteit.
   */
  function drawFlat() {
    const DAYS  = weekDayLabels.length || 9;
    const SLOTS = DAYS * 24; // Totaal uur-slots (bijv. 7 dagen × 24 uur = 168)
    const data  = weekHours.length ? weekHours : new Array(SLOTS).fill(0);
    const maxValue  = Math.max(...data, 1); // Normaliseer tegen het drukste uur

    // Verdeel ring in DAYS segmenten (één per dag)
    for (let d = 0; d < DAYS; d++) {
      // Hoeken: divider = scheidingslijn tussen dagen, label = plaats dag-naam
      const aDivider = (d / DAYS) * 2 * Math.PI - Math.PI / 2;
      const aLabel   = ((d + 0.5) / DAYS) * 2 * Math.PI - Math.PI / 2;
      svg.append('line')
        .attr('x1', cx + Math.cos(aDivider) * (innerR - 10)).attr('y1', cy + Math.sin(aDivider) * (innerR - 10))
        .attr('x2', cx + Math.cos(aDivider) * (outerR + 10)).attr('y2', cy + Math.sin(aDivider) * (outerR + 10))
        .attr('stroke', 'rgba(1,70,60,0.18)').attr('stroke-dasharray', '3 4');
      svg.append('text')
        .attr('x', cx + Math.cos(aLabel) * (outerR + 24)).attr('y', cy + Math.sin(aLabel) * (outerR + 24) + 4)
        .attr('text-anchor', 'middle').attr('font-family', FONT_BODY).attr('font-size', 13).attr('font-weight', 700)
        .attr('fill', d >= 1 && d <= 7 ? COLORS.bell : COLORS.green).attr('opacity', 0.9)
        .text(weekDayLabels[d] || '');
      const nightStart = (d * 24 + 21) / SLOTS * 2 * Math.PI - Math.PI / 2;
      const nightEnd   = (d * 24 + 29) / SLOTS * 2 * Math.PI - Math.PI / 2;
      svg.append('path')
        .attr('d', d3.arc().innerRadius(innerR - 8).outerRadius(innerR).startAngle(nightStart).endAngle(nightEnd)())
        .attr('transform', `translate(${cx},${cy})`).attr('fill', 'rgba(1,70,60,0.08)');
    }

    const dots = svg.append('g');

    // Vind drukste uur voor samenvatting onderaan
    const activeDots = [];
    for (let i = 0; i < SLOTS; i++) {
      const count = data[i] || 0;
      if (count > 0) activeDots.push({ i, count });
    }
    activeDots.sort((a, b) => b.count - a.count);

    // Teken alle uur-slots als puntjes
    for (let i = 0; i < SLOTS; i++) {
      const count  = data[i] || 0;
      const intensity = count / maxValue; // Normaliseer naar 0..1 (0=leeg, 1=drukste)

      // Polaire coördinaten:
      // a = hoek (welk moment: klok mee vanaf boven)
      // r = afstand tot midden (drukte: drukker = verder naar buiten)
      const a    = (i / SLOTS) * 2 * Math.PI - Math.PI / 2;
      const r    = innerR + 14 + intensity * (outerR - innerR - 20);

      // Kleurschaal: flauw grijs → groen → paars/rood
      const color = intensity > 0.65 ? COLORS.bell : intensity > 0.25 ? COLORS.green : 'rgba(1,70,60,0.4)';

      const dot = dots.append('circle')
        .attr('class', 'ring-dot')
        .attr('cx', cx + Math.cos(a) * r).attr('cy', cy + Math.sin(a) * r).attr('r', 0)
        .attr('fill', color).attr('opacity', count > 0 ? 0.25 + intensity * 0.75 : 0.08)
        .attr('tabindex', -1);

      // Animatie: puntje groeit van klein naar groot
      dot.transition()
        .delay(reduceMotion() ? 0 : i * 2)
        .duration(reduceMotion() ? 0 : 250)
        .attr('r', 1.2 + intensity * 5.5);

      // Interactiviteit: tooltip bij hover
      if (count > 0) {
        const label   = weekDayLabels[Math.floor(i / 24)] || '';
        const tooltip = `<strong>${label} ${String(i % 24).padStart(2, '0')}:00</strong>${formatNumber(count)} bel oproepen`;
        dot.on('mouseenter mousemove', (e) => showTooltip(tooltip, e.clientX, e.clientY))
           .on('mouseleave blur', () => hideTooltip())
           .on('focus', () => {
             const bb = dot.node().getBoundingClientRect();
             showTooltip(tooltip, bb.left + bb.width / 2, bb.top);
           });
      }
    }

    drawCenter(formatNumber(TOTAL), 'bel oproepen', periodLabel || '18 apr – 18 mei 2026', null);

    // Samenvatting voor de ring calendar
    const busySlot = activeDots[0];
    if (busySlot) {
      const busyDayIdx = Math.floor(busySlot.i / 24);
      const busyHour = busySlot.i % 24;
      const busyDay = weekDayLabels[busyDayIdx] || '';
      const summary = $('#ringSummary');
      if (summary) {
        summary.textContent = `In ${periodLabel || 'deze periode'} ging de Visdeurbel ${formatNumber(TOTAL)}× bel. Drukste uur: ${busyDay} ${String(busyHour).padStart(2, '0')}:00 (${formatNumber(busySlot.count)} bel oproepen).`;
      }
    }
  }

  /**
   * YEAR MODE — Buitenste ring per maand, dots per dag (klikbaar)
   * Toon jaar-overzicht met maanden. Klik maand → zoom naar die maand.
   */
  function drawYear() {
    const N = months.length || 12; // Aantal maanden
    const maxDay = Math.max(...months.flatMap(m => m.days.map(d => d.total)), 1); // Schaal op drukste dag

    // Verdeel ring in N maand-wiggen
    months.forEach((m, idx) => {
      // Hoeken: divider = scheidingslijn, label = plaats maand-naam
      const aDivider = (idx / N) * 2 * Math.PI - Math.PI / 2;
      const aLabel   = ((idx + 0.5) / N) * 2 * Math.PI - Math.PI / 2;
      svg.append('line')
        .attr('x1', cx + Math.cos(aDivider) * (innerR - 10)).attr('y1', cy + Math.sin(aDivider) * (innerR - 10))
        .attr('x2', cx + Math.cos(aDivider) * (outerR + 10)).attr('y2', cy + Math.sin(aDivider) * (outerR + 10))
        .attr('stroke', 'rgba(1,70,60,0.18)').attr('stroke-dasharray', '3 4');

      const wedge = svg.append('g').attr('class', 'ring-wedge').attr('cursor', 'pointer').attr('tabindex', 0).attr('role', 'button')
        .attr('aria-label', `Zoom in op ${m.long}`)
        .on('click', () => { view = { level: 'month', monthIndex: idx }; draw(); })
        .on('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); view = { level: 'month', monthIndex: idx }; draw(); } });

      // Onzichtbare hit-arc zodat hele wig klikbaar is
      wedge.append('path')
        .attr('d', d3.arc().innerRadius(innerR - 4).outerRadius(outerR + 18)
          .startAngle(aDivider + Math.PI / 2).endAngle(aDivider + Math.PI / 2 + (2 * Math.PI / N))())
        .attr('transform', `translate(${cx},${cy})`).attr('fill', 'transparent');

      const labelX = cx + Math.cos(aLabel) * (outerR + 24);
      const labelY = cy + Math.sin(aLabel) * (outerR + 24);
      wedge.append('ellipse').attr('class', 'ring-label-mark')
        .attr('cx', labelX).attr('cy', labelY).attr('rx', 20).attr('ry', 14)
        .attr('pathLength', 100);
      wedge.append('text')
        .attr('x', labelX).attr('y', labelY + 4)
        .attr('text-anchor', 'middle').attr('font-family', FONT_BODY).attr('font-size', 13).attr('font-weight', 700)
        .attr('fill', COLORS.green).attr('opacity', 0.9).text(m.short);

      const D = m.days.length || 1;
      m.days.forEach((day, di) => {
        const sub = (idx + (di + 0.5) / D) / N;
        const a = sub * 2 * Math.PI - Math.PI / 2;
        const intensity = day.total / maxDay;
        const r = innerR + 14 + intensity * (outerR - innerR - 20);
        const color = intensity > 0.65 ? COLORS.bell : intensity > 0.25 ? COLORS.green : 'rgba(1,70,60,0.4)';
        const dot = wedge.append('circle')
          .attr('cx', cx + Math.cos(a) * r).attr('cy', cy + Math.sin(a) * r).attr('r', 0)
          .attr('fill', color).attr('opacity', day.total > 0 ? 0.25 + intensity * 0.75 : 0.08);
        dot.transition().delay(reduceMotion() ? 0 : (idx * 24 + di * 2)).duration(reduceMotion() ? 0 : 220).attr('r', 1.3 + intensity * 4);
        if (day.total > 0) {
          const tip = `<strong>${day.dayOfMonth} ${m.short}</strong>${formatNumber(day.total)} bel oproepen`;
          dot.on('mouseenter mousemove', e => showTooltip(tip, e.clientX, e.clientY))
             .on('mouseleave', () => hideTooltip());
        }
      });
    });

    drawCenter(formatNumber(TOTAL), 'bel oproepen', 'klik een maand om in te zoomen', null);

    const busyMonth = months.reduce((max, m, i) => m.total > max.total ? { ...m, i } : max, { total: 0 });
    const summary = $('#ringSummary');
    if (summary && busyMonth.total) {
      summary.textContent = `Het jaar had ${formatNumber(TOTAL)} bel oproepen verdeeld over ${months.length} maanden. Drukste maand: ${busyMonth.long} (${formatNumber(busyMonth.total)} oproepen).`;
    }
  }

  /**
   * MONTH MODE — Dag-wiggen per dag, dots per uur (klikbaar)
   * Toon maand-overzicht met dagen. Klik dag → zoom naar die dag.
   */
  function drawMonth(mIdx) {
    const month = months[mIdx];
    if (!month) return;

    const days = month.days;
    const N = days.length; // Aantal dagen in maand
    const SLOTS = N * 24;
    const allHours = days.flatMap(d => d.hours);
    const maxValue = Math.max(...allHours, 1); // Schaal op drukste uur

    // Verdeel ring in N dag-wiggen
    for (let d = 0; d < N; d++) {
      // Hoeken: divider = scheidingslijn, label = plaats dag-nummers
      const aDivider = (d / N) * 2 * Math.PI - Math.PI / 2;
      const aLabel   = ((d + 0.5) / N) * 2 * Math.PI - Math.PI / 2;
      svg.append('line')
        .attr('x1', cx + Math.cos(aDivider) * (innerR - 10)).attr('y1', cy + Math.sin(aDivider) * (innerR - 10))
        .attr('x2', cx + Math.cos(aDivider) * (outerR + 10)).attr('y2', cy + Math.sin(aDivider) * (outerR + 10))
        .attr('stroke', 'rgba(1,70,60,0.18)').attr('stroke-dasharray', '3 4');

      const wedge = svg.append('g').attr('class', 'ring-wedge').attr('cursor', 'pointer').attr('tabindex', 0).attr('role', 'button')
        .attr('aria-label', `Zoom in op ${days[d].dayOfMonth} ${month.short}`)
        .on('click', () => { view = { level: 'day', monthIndex: mIdx, dayIndex: d }; draw(); })
        .on('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); view = { level: 'day', monthIndex: mIdx, dayIndex: d }; draw(); } });
      wedge.append('path')
        .attr('d', d3.arc().innerRadius(innerR - 4).outerRadius(outerR + 18)
          .startAngle(aDivider + Math.PI / 2).endAngle(aDivider + Math.PI / 2 + (2 * Math.PI / N))())
        .attr('transform', `translate(${cx},${cy})`).attr('fill', 'transparent');
      const labelX = cx + Math.cos(aLabel) * (outerR + 22);
      const labelY = cy + Math.sin(aLabel) * (outerR + 22);
      wedge.append('ellipse').attr('class', 'ring-label-mark')
        .attr('cx', labelX).attr('cy', labelY).attr('rx', N > 20 ? 13 : 15).attr('ry', N > 20 ? 11 : 12)
        .attr('pathLength', 100);
      wedge.append('text')
        .attr('x', labelX).attr('y', labelY + 4)
        .attr('text-anchor', 'middle').attr('font-family', FONT_BODY).attr('font-size', N > 20 ? 10 : 12).attr('font-weight', 700)
        .attr('fill', COLORS.green).attr('opacity', 0.85).text(String(days[d].dayOfMonth));

      const nightStart = (d * 24 + 21) / SLOTS * 2 * Math.PI - Math.PI / 2;
      const nightEnd   = (d * 24 + 29) / SLOTS * 2 * Math.PI - Math.PI / 2;
      svg.append('path')
        .attr('d', d3.arc().innerRadius(innerR - 8).outerRadius(innerR).startAngle(nightStart).endAngle(nightEnd)())
        .attr('transform', `translate(${cx},${cy})`).attr('fill', 'rgba(1,70,60,0.08)');
    }

    const dots = svg.append('g').attr('pointer-events', 'none');
    for (let i = 0; i < SLOTS; i++) {
      const count = allHours[i] || 0, intensity = count / maxValue;
      const a = (i / SLOTS) * 2 * Math.PI - Math.PI / 2;
      const r = innerR + 14 + intensity * (outerR - innerR - 20);
      const color = intensity > 0.65 ? COLORS.bell : intensity > 0.25 ? COLORS.green : 'rgba(1,70,60,0.4)';
      const dot = dots.append('circle')
        .attr('cx', cx + Math.cos(a) * r).attr('cy', cy + Math.sin(a) * r).attr('r', 0)
        .attr('fill', color).attr('opacity', count > 0 ? 0.25 + intensity * 0.75 : 0.08);
      dot.transition().delay(reduceMotion() ? 0 : i * 1).duration(reduceMotion() ? 0 : 200).attr('r', 1.2 + intensity * 5);
    }

    drawCenter(`${month.long} ${month.year}`, `${formatNumber(month.total)} bel oproepen`, '← terug naar jaar', () => {
      view = { level: 'year' }; draw();
    });

    const busyDay = days.reduce((max, d, i) => d.total > max.total ? { ...d, i } : max, { total: 0 });
    const summary = $('#ringSummary');
    if (summary && busyDay.total) {
      summary.textContent = `In ${month.long} ${month.year} was het ${formatNumber(month.total)} bel oproepen. Drukste dag: ${String(busyDay.dayOfMonth)} (${formatNumber(busyDay.total)} oproepen).`;
    }
  }

  /**
   * DAY MODE — Uur-wiggen per uur (niet klikbaar, laagste zoom)
   * Toon dag-details met 24 uur. Dit is het meest gedetailleerde niveau.
   */
  function drawDay(mIdx, dIdx) {
    const month = months[mIdx];
    const day = month && month.days[dIdx];
    if (!day) return;

    const hours = day.hours;
    const maxValue = Math.max(...hours, 1); // Schaal op drukste uur
    const N = 24; // Altijd 24 uur

    // Verdeel ring in 24 uur-wiggen
    for (let h = 0; h < N; h++) {
      // Hoeken: divider = scheidingslijn, label = plaats uur-label
      const aDivider = (h / N) * 2 * Math.PI - Math.PI / 2;
      const aLabel   = ((h + 0.5) / N) * 2 * Math.PI - Math.PI / 2;
      svg.append('line')
        .attr('x1', cx + Math.cos(aDivider) * (innerR - 10)).attr('y1', cy + Math.sin(aDivider) * (innerR - 10))
        .attr('x2', cx + Math.cos(aDivider) * (outerR + 10)).attr('y2', cy + Math.sin(aDivider) * (outerR + 10))
        .attr('stroke', 'rgba(1,70,60,0.18)').attr('stroke-dasharray', '3 4');
      const isNight = h >= 21 || h < 5;
      if (isNight) {
        svg.append('path')
          .attr('d', d3.arc().innerRadius(innerR - 8).outerRadius(innerR)
            .startAngle(aDivider + Math.PI / 2).endAngle(aDivider + Math.PI / 2 + 2 * Math.PI / N)())
          .attr('transform', `translate(${cx},${cy})`).attr('fill', 'rgba(1,70,60,0.08)');
      }
      svg.append('text')
        .attr('x', cx + Math.cos(aLabel) * (outerR + 22)).attr('y', cy + Math.sin(aLabel) * (outerR + 22) + 4)
        .attr('text-anchor', 'middle').attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
        .attr('fill', isNight ? COLORS.bell : COLORS.green).attr('opacity', 0.85).text(`${String(h).padStart(2, '0')}u`);

      const count = hours[h] || 0, intensity = count / maxValue;
      const r = innerR + 18 + intensity * (outerR - innerR - 28);
      const color = intensity > 0.65 ? COLORS.bell : intensity > 0.25 ? COLORS.green : 'rgba(1,70,60,0.4)';
      const dot = svg.append('circle')
        .attr('cx', cx + Math.cos(aLabel) * r).attr('cy', cy + Math.sin(aLabel) * r).attr('r', 0)
        .attr('fill', color).attr('opacity', count > 0 ? 0.3 + intensity * 0.7 : 0.1);
      dot.transition().delay(reduceMotion() ? 0 : h * 18).duration(reduceMotion() ? 0 : 260).attr('r', 4 + intensity * 9);
      if (count > 0) {
        const tip = `<strong>${day.dayOfMonth} ${month.short} ${String(h).padStart(2, '0')}:00</strong>${formatNumber(count)} bel oproepen`;
        dot.attr('cursor', 'pointer')
          .on('mouseenter mousemove', e => showTooltip(tip, e.clientX, e.clientY))
          .on('mouseleave', () => hideTooltip());
      }
    }

    drawCenter(`${day.dayOfMonth} ${month.long}`, `${formatNumber(day.total)} bel oproepen`, `← terug naar ${month.short}`, () => {
      view = { level: 'month', monthIndex: mIdx }; draw();
    });

    const busyHour = hours.indexOf(Math.max(...hours));
    const summary = $('#ringSummary');
    if (summary) {
      summary.textContent = `Op ${day.dayOfMonth} ${month.long} ${month.year} waren het ${formatNumber(day.total)} bel oproepen. Drukste uur: ${String(busyHour).padStart(2, '0')}:00 (${formatNumber(hours[busyHour])} oproepen).`;
    }
  }
}
