import * as d3 from 'd3';
import { C, FONT_BODY, FONT_DISPLAY, MONTH_SHORT_NL, MONTH_LONG_NL } from '../constants.js';
import { $, fmt, reduceMotion } from '../utils.js';
import { showTooltip, hideTooltip } from '../tooltip.js';
import { state } from '../state.js';

// ============================================================================
// ring.js — de ringkalender. Elke stip is een tijdslot (uur of dag); de hoek
// is het tijdstip (met de klok mee vanaf bovenaan) en de afstand tot het
// midden + kleur/grootte tonen hoe druk het was.
// Bij 'jaar' is de ring inzoombaar: jaar → maand → dag (drawYear/Month/Day).
// Bij 'week'/'maand' is er één platte ring (drawFlat).
// ============================================================================

export function initRing() {
  const { weekHours, weekDayLabels, weekDays, periodLabel, currentPeriod, TOTAL } = state;
  const W = 680, H = 680, cx = W / 2, cy = H / 2;
  const innerR = 130, outerR = 290;
  const stageSel = d3.select($('#ringStage'));
  const svg = stageSel.append('svg').attr('viewBox', `0 0 ${W} ${H}`);

  // Voor jaar: groepeer dagen per maand zodat we kunnen in- en uitzoomen
  const isYear = currentPeriod === 'jaar' && weekDays && weekDays.length;
  const months = [];
  if (isYear) {
    let cur = null;
    weekDays.forEach((dateStr, i) => {
      const dt = new Date(dateStr);
      if (Number.isNaN(dt.getTime())) return;
      const key = `${dt.getUTCFullYear()}-${dt.getUTCMonth()}`;
      if (!cur || cur.key !== key) {
        cur = {
          key, monthIdx: dt.getUTCMonth(), year: dt.getUTCFullYear(),
          short: MONTH_SHORT_NL[dt.getUTCMonth()], long: MONTH_LONG_NL[dt.getUTCMonth()],
          days: [], total: 0,
        };
        months.push(cur);
      }
      const hours = (weekHours || []).slice(i * 24, (i + 1) * 24);
      const total = hours.reduce((s, v) => s + (v || 0), 0);
      cur.days.push({ dayOfMonth: dt.getUTCDate(), label: weekDayLabels[i] || '', hours, total });
      cur.total += total;
    });
  }

  // `view` houdt bij welk zoomniveau getoond wordt; draw() kiest de juiste
  // teken-functie op basis hiervan. Klikken op een wig past `view` aan.
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

  function drawCenter(big, sub, hint, onBack) {
    svg.append('text').attr('x', cx).attr('y', cy - 10).attr('text-anchor', 'middle')
      .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('font-size', big.length > 12 ? 32 : 44)
      .attr('fill', C.green).text(big);
    svg.append('text').attr('x', cx).attr('y', cy + 16).attr('text-anchor', 'middle')
      .attr('font-family', FONT_BODY).attr('font-size', 13).attr('font-weight', 700)
      .attr('fill', C.green).attr('opacity', 0.6).text(sub);
    if (onBack) {
      const g = svg.append('g').attr('cursor', 'pointer').attr('tabindex', 0).attr('role', 'button')
        .on('click', onBack).on('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBack(); } });
      g.append('rect').attr('x', cx - 78).attr('y', cy + 32).attr('width', 156).attr('height', 28)
        .attr('rx', 14).attr('fill', 'rgba(1,70,60,0.08)').attr('stroke', 'rgba(1,70,60,0.18)');
      g.append('text').attr('x', cx).attr('y', cy + 51).attr('text-anchor', 'middle')
        .attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
        .attr('fill', C.green).text(hint);
    } else if (hint) {
      svg.append('text').attr('x', cx).attr('y', cy + 42).attr('text-anchor', 'middle')
        .attr('font-family', FONT_BODY).attr('font-size', 13)
        .attr('fill', C.bell).attr('opacity', 0.95).text(hint);
    }
  }

  // Plat — bestaande weergave voor week/maand
  function drawFlat() {
    const DAYS  = weekDayLabels.length || 9;
    const SLOTS = DAYS * 24;
    const data  = weekHours.length ? weekHours : new Array(SLOTS).fill(0);
    const maxV  = Math.max(...data, 1);

    for (let d = 0; d < DAYS; d++) {
      const aDivider = (d / DAYS) * 2 * Math.PI - Math.PI / 2;
      const aLabel   = ((d + 0.5) / DAYS) * 2 * Math.PI - Math.PI / 2;
      svg.append('line')
        .attr('x1', cx + Math.cos(aDivider) * (innerR - 10)).attr('y1', cy + Math.sin(aDivider) * (innerR - 10))
        .attr('x2', cx + Math.cos(aDivider) * (outerR + 10)).attr('y2', cy + Math.sin(aDivider) * (outerR + 10))
        .attr('stroke', 'rgba(1,70,60,0.18)').attr('stroke-dasharray', '3 4');
      svg.append('text')
        .attr('x', cx + Math.cos(aLabel) * (outerR + 24)).attr('y', cy + Math.sin(aLabel) * (outerR + 24) + 4)
        .attr('text-anchor', 'middle').attr('font-family', FONT_BODY).attr('font-size', 13).attr('font-weight', 700)
        .attr('fill', d >= 1 && d <= 7 ? C.bell : C.green).attr('opacity', 0.9)
        .text(weekDayLabels[d] || '');
      const nightStart = (d * 24 + 21) / SLOTS * 2 * Math.PI - Math.PI / 2;
      const nightEnd   = (d * 24 + 29) / SLOTS * 2 * Math.PI - Math.PI / 2;
      svg.append('path')
        .attr('d', d3.arc().innerRadius(innerR - 8).outerRadius(innerR).startAngle(nightStart).endAngle(nightEnd)())
        .attr('transform', `translate(${cx},${cy})`).attr('fill', 'rgba(1,70,60,0.08)');
    }

    const dots = svg.append('g');
    for (let i = 0; i < SLOTS; i++) {
      // Per uur-slot: norm = drukte t.o.v. het drukste uur (0..1).
      // a = hoek (tijd, met de klok mee vanaf boven), r = afstand tot midden
      // (drukker = verder naar buiten), kleur loopt op van flauw → groen → paars.
      const cnt  = data[i] || 0, norm = cnt / maxV;
      const a    = (i / SLOTS) * 2 * Math.PI - Math.PI / 2;
      const r    = innerR + 14 + norm * (outerR - innerR - 20);
      const color = norm > 0.65 ? C.bell : norm > 0.25 ? C.green : 'rgba(1,70,60,0.4)';
      const dot = dots.append('circle')
        .attr('class', 'ring-dot')
        .attr('cx', cx + Math.cos(a) * r).attr('cy', cy + Math.sin(a) * r).attr('r', 0)
        .attr('fill', color).attr('opacity', cnt > 0 ? 0.25 + norm * 0.75 : 0.08)
        .attr('tabindex', cnt > 0 ? 0 : -1);
      dot.transition().delay(reduceMotion ? 0 : i * 2).duration(reduceMotion ? 0 : 250).attr('r', 1.2 + norm * 5.5);
      if (cnt > 0) {
        const label   = weekDayLabels[Math.floor(i / 24)] || '';
        const tooltip = `<strong>${label} ${String(i % 24).padStart(2, '0')}:00</strong>${fmt(cnt)} bel oproepen`;
        dot.on('mouseenter mousemove', (e) => showTooltip(tooltip, e.clientX, e.clientY))
           .on('mouseleave blur', () => hideTooltip())
           .on('focus', () => {
             const bb = dot.node().getBoundingClientRect();
             showTooltip(tooltip, bb.left + bb.width / 2, bb.top);
           });
      }
    }

    drawCenter(fmt(TOTAL), 'bel oproepen', periodLabel || '18 apr – 18 mei 2026', null);
  }

  // Jaar — buitenste ring zijn maanden, dots binnen elke wig zijn dagen
  function drawYear() {
    const N = months.length || 12;
    const maxDay = Math.max(...months.flatMap(m => m.days.map(d => d.total)), 1);
    months.forEach((m, idx) => {
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
        .attr('fill', C.green).attr('opacity', 0.9).text(m.short);

      const D = m.days.length || 1;
      m.days.forEach((day, di) => {
        const sub = (idx + (di + 0.5) / D) / N;
        const a = sub * 2 * Math.PI - Math.PI / 2;
        const norm = day.total / maxDay;
        const r = innerR + 14 + norm * (outerR - innerR - 20);
        const color = norm > 0.65 ? C.bell : norm > 0.25 ? C.green : 'rgba(1,70,60,0.4)';
        const dot = wedge.append('circle')
          .attr('cx', cx + Math.cos(a) * r).attr('cy', cy + Math.sin(a) * r).attr('r', 0)
          .attr('fill', color).attr('opacity', day.total > 0 ? 0.25 + norm * 0.75 : 0.08);
        dot.transition().delay(reduceMotion ? 0 : (idx * 24 + di * 2)).duration(reduceMotion ? 0 : 220).attr('r', 1.3 + norm * 4);
        if (day.total > 0) {
          const tip = `<strong>${day.dayOfMonth} ${m.short}</strong>${fmt(day.total)} bel oproepen`;
          dot.on('mouseenter mousemove', e => showTooltip(tip, e.clientX, e.clientY))
             .on('mouseleave', () => hideTooltip());
        }
      });
    });

    drawCenter(fmt(TOTAL), 'bel oproepen', 'klik een maand om in te zoomen', null);
  }

  // Maand — wedges per dag, dots per uur (zoals plat, maar voor één maand)
  function drawMonth(mIdx) {
    const month = months[mIdx];
    if (!month) return;
    const days = month.days;
    const N = days.length;
    const SLOTS = N * 24;
    const allHours = days.flatMap(d => d.hours);
    const maxV = Math.max(...allHours, 1);

    for (let d = 0; d < N; d++) {
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
        .attr('fill', C.green).attr('opacity', 0.85).text(String(days[d].dayOfMonth));

      const nightStart = (d * 24 + 21) / SLOTS * 2 * Math.PI - Math.PI / 2;
      const nightEnd   = (d * 24 + 29) / SLOTS * 2 * Math.PI - Math.PI / 2;
      svg.append('path')
        .attr('d', d3.arc().innerRadius(innerR - 8).outerRadius(innerR).startAngle(nightStart).endAngle(nightEnd)())
        .attr('transform', `translate(${cx},${cy})`).attr('fill', 'rgba(1,70,60,0.08)');
    }

    const dots = svg.append('g').attr('pointer-events', 'none');
    for (let i = 0; i < SLOTS; i++) {
      const cnt = allHours[i] || 0, norm = cnt / maxV;
      const a = (i / SLOTS) * 2 * Math.PI - Math.PI / 2;
      const r = innerR + 14 + norm * (outerR - innerR - 20);
      const color = norm > 0.65 ? C.bell : norm > 0.25 ? C.green : 'rgba(1,70,60,0.4)';
      const dot = dots.append('circle')
        .attr('cx', cx + Math.cos(a) * r).attr('cy', cy + Math.sin(a) * r).attr('r', 0)
        .attr('fill', color).attr('opacity', cnt > 0 ? 0.25 + norm * 0.75 : 0.08);
      dot.transition().delay(reduceMotion ? 0 : i * 1).duration(reduceMotion ? 0 : 200).attr('r', 1.2 + norm * 5);
    }

    drawCenter(`${month.long} ${month.year}`, `${fmt(month.total)} bel oproepen`, '← terug naar jaar', () => {
      view = { level: 'year' }; draw();
    });
  }

  // Dag — 24 uur-wedges met één bal per uur
  function drawDay(mIdx, dIdx) {
    const month = months[mIdx];
    const day = month && month.days[dIdx];
    if (!day) return;
    const hours = day.hours;
    const maxV = Math.max(...hours, 1);
    const N = 24;

    for (let h = 0; h < N; h++) {
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
        .attr('fill', isNight ? C.bell : C.green).attr('opacity', 0.85).text(`${String(h).padStart(2, '0')}u`);

      const cnt = hours[h] || 0, norm = cnt / maxV;
      const r = innerR + 18 + norm * (outerR - innerR - 28);
      const color = norm > 0.65 ? C.bell : norm > 0.25 ? C.green : 'rgba(1,70,60,0.4)';
      const dot = svg.append('circle')
        .attr('cx', cx + Math.cos(aLabel) * r).attr('cy', cy + Math.sin(aLabel) * r).attr('r', 0)
        .attr('fill', color).attr('opacity', cnt > 0 ? 0.3 + norm * 0.7 : 0.1);
      dot.transition().delay(reduceMotion ? 0 : h * 18).duration(reduceMotion ? 0 : 260).attr('r', 4 + norm * 9);
      if (cnt > 0) {
        const tip = `<strong>${day.dayOfMonth} ${month.short} ${String(h).padStart(2, '0')}:00</strong>${fmt(cnt)} bel oproepen`;
        dot.attr('cursor', 'pointer')
          .on('mouseenter mousemove', e => showTooltip(tip, e.clientX, e.clientY))
          .on('mouseleave', () => hideTooltip());
      }
    }

    drawCenter(`${day.dayOfMonth} ${month.long}`, `${fmt(day.total)} bel oproepen`, `← terug naar ${month.short}`, () => {
      view = { level: 'month', monthIndex: mIdx }; draw();
    });
  }
}
