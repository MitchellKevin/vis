import { MONTH_SHORT_NL } from './constants.js';
import { generateMonthly } from './utils.js';
import { state } from './state.js';

// Bouwt nep-jaardata uit de maand-snapshot — vermenigvuldigt tellers
// en plakt 365 dagen aan elkaar met een ruwe seizoensgolf.
export function synthesizeYear(live) {
  const SCALE = 12;
  const DAYS = 365;
  const scaleNum = v => (typeof v === 'number' ? Math.round(v * SCALE) : v);
  const scaleObj = obj => {
    if (!obj) return;
    Object.keys(obj).forEach(k => { obj[k] = scaleNum(obj[k]); });
  };

  scaleObj(live.species);
  if (typeof live.totalUploads === 'number') live.totalUploads = scaleNum(live.totalUploads);
  if (typeof live.pondTotal === 'number')    live.pondTotal    = scaleNum(live.pondTotal);

  if (live.funnel) {
    ['uploadedFish', 'dismissedUploading', 'total'].forEach(k => {
      if (typeof live.funnel[k] === 'number') live.funnel[k] = scaleNum(live.funnel[k]);
    });
  }

  if (live.geo) {
    if (typeof live.geo.total === 'number') live.geo.total = scaleNum(live.geo.total);
    if (live.geo.countries && typeof live.geo.countries === 'object') {
      Object.keys(live.geo.countries).forEach(k => {
        const v = live.geo.countries[k];
        if (typeof v === 'number') live.geo.countries[k] = scaleNum(v);
        else if (v && typeof v === 'object' && typeof v.n === 'number') v.n = scaleNum(v.n);
      });
    }
  }

  if (live.tech) ['device', 'browser', 'os'].forEach(cat => scaleObj(live.tech[cat]));

  if (Array.isArray(live.languages)) {
    live.languages.forEach(l => { if (typeof l.n === 'number') l.n = scaleNum(l.n); });
  }
  if (Array.isArray(live.screens)) {
    live.screens.forEach(s => { if (typeof s.n === 'number') s.n = scaleNum(s.n); });
  }
  if (live.orientation) {
    ['portrait', 'landscape', 'square', 'total', 'unique'].forEach(k => {
      if (typeof live.orientation[k] === 'number') live.orientation[k] = scaleNum(live.orientation[k]);
    });
  }
  if (live.sessions) {
    ['totalSessions', 'ringers', 'totalRings'].forEach(k => {
      if (typeof live.sessions[k] === 'number') live.sessions[k] = scaleNum(live.sessions[k]);
    });
    if (Array.isArray(live.sessions.hist)) {
      live.sessions.hist = live.sessions.hist.map(v => scaleNum(v));
    }
  }

  // Rek de uurpatronen uit tot 365 dagen met een zachte seizoensgolf
  const srcHours = live.weekHours || [];
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
  live.weekHours = yearHours;

  const startDate = new Date(Date.UTC(2025, 5, 1));
  const dayKeys = [], dayLabels = [];
  for (let i = 0; i < DAYS; i++) {
    const dt = new Date(startDate.getTime() + i * 86400000);
    dayKeys.push(dt.toISOString().slice(0, 10));
    dayLabels.push(`${dt.getUTCDate()} ${MONTH_SHORT_NL[dt.getUTCMonth()]}`);
  }
  live.weekDays = dayKeys;
  live.weekDayLabels = dayLabels;

  const daily = {};
  for (let d = 0; d < DAYS; d++) {
    let s = 0;
    for (let h = 0; h < 24; h++) s += yearHours[d * 24 + h];
    daily[d + 1] = s;
  }
  live.daily = daily;

  const endDate = new Date(startDate.getTime() + (DAYS - 1) * 86400000);
  const fmt = dt => `${dt.getUTCDate()} ${MONTH_SHORT_NL[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
  live.period = {
    start: dayKeys[0],
    end: dayKeys[DAYS - 1],
    label: `${fmt(startDate)} – ${fmt(endDate)}`,
  };

  return live;
}

export async function loadData(url, transform) {
  const live = await fetch(url).then(r => r.json());
  if (transform) transform(live);
  state.visData.forEach(v => { v.count = 0; });
  Object.entries(live.species || {}).forEach(([naam, count]) => {
    const v = state.visData.find(d => d.naam === naam);
    if (v) v.count = count;
  });
  state.weekHours       = live.weekHours     || [];
  state.weekDayLabels   = live.weekDayLabels || [];
  state.weekDays        = live.weekDays      || [];
  state.periodLabel     = live.period?.label || '';
  state.geoData         = live.geo       || null;
  state.funnelData      = live.funnel    || null;
  state.techData        = live.tech      || null;
  state.dailyData       = live.daily     || null;
  state.sessionsData    = live.sessions  || null;
  state.pondWeekData    = live.pondWeek  || null;
  state.languagesData   = live.languages || null;
  state.screensData     = live.screens   || null;
  state.orientationData = live.orientation || null;
  state.TOTAL = (state.funnelData && state.funnelData.uploadedFish) || state.visData.reduce((s, v) => s + v.count, 0);
  state.visData.forEach(v => { v.monthly = generateMonthly(v.count); });
  state.visData.sort((a, b) => b.count - a.count);
}
