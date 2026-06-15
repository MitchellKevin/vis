import { MONTH_SHORT_NL } from './constants.js';
import { generateMonthly } from './utils.js';
import { state } from './state.js';

// ============================================================================
// dataLoad.js — haalt de dataset op en vult `state`.
//   • loadData()      — fetcht een JSON-bestand en kopieert alles naar state.
//   • synthesizeYear()— verzint een heel jaar uit de maand-snapshot (de echte
//                       jaardata is te groot voor de browser).
// ============================================================================

const SCALE = 12;                          // maand → jaar: vermenigvuldig de tellers
const DAYS = 365;
const YEAR_START = Date.UTC(2025, 5, 1);   // 1 juni 2025
const MS_PER_DAY = 86400000;

// Maakt nep-jaardata uit de maand-snapshot. `live` wordt in-place aangepast
// (en ook teruggegeven). Opgebouwd in losse, leesbare stappen:
export function synthesizeYear(live) {
  scaleAllCounts(live);                       // 1. alle tellers ×12
  live.weekHours = buildYearHours(live.weekHours || []); // 2. 365 dagen aan uren
  const { dayKeys, dayLabels } = buildCalendar();        // 3. datums + labels
  live.weekDays = dayKeys;
  live.weekDayLabels = dayLabels;
  live.daily = buildDailyTotals(live.weekHours);         // 4. dagtotalen
  live.period = buildPeriod(dayKeys);                    // 5. periode-label
  return live;
}

// — Tellers schalen ——————————————————————————————————————————————————————————
const scaleNum = v => (typeof v === 'number' ? Math.round(v * SCALE) : v);
const scaleObj = obj => { if (obj) Object.keys(obj).forEach(k => { obj[k] = scaleNum(obj[k]); }); };
// Schaal alleen de opgegeven numerieke velden van een object.
const scaleKeys = (obj, keys) => { if (obj) keys.forEach(k => { if (typeof obj[k] === 'number') obj[k] = scaleNum(obj[k]); }); };

function scaleAllCounts(live) {
  scaleObj(live.species);
  if (typeof live.totalUploads === 'number') live.totalUploads = scaleNum(live.totalUploads);
  if (typeof live.pondTotal === 'number')    live.pondTotal    = scaleNum(live.pondTotal);

  scaleKeys(live.funnel, ['uploadedFish', 'dismissedUploading', 'total']);

  if (live.geo) {
    if (typeof live.geo.total === 'number') live.geo.total = scaleNum(live.geo.total);
    const countries = live.geo.countries;
    if (countries && typeof countries === 'object') {
      Object.keys(countries).forEach(k => {
        const v = countries[k];
        if (typeof v === 'number') countries[k] = scaleNum(v);
        else if (v && typeof v === 'object' && typeof v.n === 'number') v.n = scaleNum(v.n);
      });
    }
  }

  if (live.tech) ['device', 'browser', 'os'].forEach(cat => scaleObj(live.tech[cat]));
  if (Array.isArray(live.languages)) live.languages.forEach(l => { if (typeof l.n === 'number') l.n = scaleNum(l.n); });
  if (Array.isArray(live.screens))   live.screens.forEach(s => { if (typeof s.n === 'number') s.n = scaleNum(s.n); });

  scaleKeys(live.orientation, ['portrait', 'landscape', 'square', 'total', 'unique']);

  if (live.sessions) {
    scaleKeys(live.sessions, ['totalSessions', 'ringers', 'totalRings']);
    if (Array.isArray(live.sessions.hist)) live.sessions.hist = live.sessions.hist.map(scaleNum);
  }
}

// — Een heel jaar aan uren maken ———————————————————————————————————————————————
// Herhaal het uur-patroon van de snapshot over 365 dagen, met een zachte
// seizoensgolf (piek in het voorjaar) en wat ruis, zodat het natuurlijk oogt.
function buildYearHours(srcHours) {
  const srcDays = Math.max(1, Math.floor(srcHours.length / 24));
  const yearHours = new Array(DAYS * 24).fill(0);
  for (let d = 0; d < DAYS; d++) {
    const season = 0.65 + 0.55 * Math.sin(((d - 80) / DAYS) * Math.PI * 2);
    const jitter = 0.82 + Math.random() * 0.36;
    const factor = season * jitter;
    for (let h = 0; h < 24; h++) {
      const base = srcHours[(d % srcDays) * 24 + h] || 0;
      yearHours[d * 24 + h] = Math.round(base * factor);
    }
  }
  return yearHours;
}

// — Datums (yyyy-mm-dd) + korte labels ("1 jun") voor 365 dagen —————————————————
function buildCalendar() {
  const dayKeys = [], dayLabels = [];
  for (let i = 0; i < DAYS; i++) {
    const dt = new Date(YEAR_START + i * MS_PER_DAY);
    dayKeys.push(dt.toISOString().slice(0, 10));
    dayLabels.push(`${dt.getUTCDate()} ${MONTH_SHORT_NL[dt.getUTCMonth()]}`);
  }
  return { dayKeys, dayLabels };
}

// — Totaal aantal belletjes per dag ————————————————————————————————————————————
function buildDailyTotals(yearHours) {
  const daily = {};
  for (let d = 0; d < DAYS; d++) {
    let sum = 0;
    for (let h = 0; h < 24; h++) sum += yearHours[d * 24 + h];
    daily[d + 1] = sum;
  }
  return daily;
}

// — Mensvriendelijk periode-label ("1 jun 2025 – 31 mei 2026") ————————————————————
function buildPeriod(dayKeys) {
  const start = new Date(YEAR_START);
  const end = new Date(YEAR_START + (DAYS - 1) * MS_PER_DAY);
  const fmt = date => `${date.getUTCDate()} ${MONTH_SHORT_NL[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  return { start: dayKeys[0], end: dayKeys[DAYS - 1], label: `${fmt(start)} – ${fmt(end)}` };
}

// Haalt een dataset op (week/maand) en spiegelt alles naar `state`. Een
// optionele `transform` (zoals synthesizeYear) past de data eerst aan.
export async function loadData(url, transform) {
  const live = await fetch(url).then(r => r.json());
  if (transform) transform(live);
  fillSpeciesCounts(live);
  copyToState(live);
}

// Zet per vissoort de teller op het aantal uit live.species (rest op 0).
function fillSpeciesCounts(live) {
  state.visData.forEach(v => { v.count = 0; });
  Object.entries(live.species || {}).forEach(([naam, count]) => {
    const v = state.visData.find(d => d.naam === naam);
    if (v) v.count = count;
  });
}

// Kopieer de geladen dataset naar de gedeelde state + leid afgeleide waarden af.
function copyToState(live) {
  state.weekHours       = live.weekHours     || [];
  state.weekDayLabels   = live.weekDayLabels || [];
  state.weekDays        = live.weekDays      || [];
  state.periodLabel     = live.period?.label || '';
  state.geoData         = live.geo         || null;
  state.funnelData      = live.funnel      || null;
  state.techData        = live.tech        || null;
  state.dailyData       = live.daily       || null;
  state.sessionsData    = live.sessions    || null;
  state.pondWeekData    = live.pondWeek    || null;
  state.languagesData   = live.languages   || null;
  state.screensData     = live.screens     || null;
  state.orientationData = live.orientation || null;

  // TOTAL = geüploade vissen uit de trechter, of anders de som per soort.
  state.TOTAL = (state.funnelData && state.funnelData.uploadedFish)
    || state.visData.reduce((s, v) => s + v.count, 0);

  // Per soort een nep-maandverloop verzinnen + sorteren op aantal (grootst eerst).
  state.visData.forEach(v => { v.monthly = generateMonthly(v.count); });
  state.visData.sort((a, b) => b.count - a.count);
}
