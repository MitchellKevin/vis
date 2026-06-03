import { ALPHA2_TO_NUMERIC, COUNTRY_NAMES, UNKNOWN_VALS, DATA_URLS } from './constants.js';

// ── Flag emoji from ISO-3166-1 alpha-2 ───────────────────────────────────────
export function flag(code) {
  if (!code || code.length !== 2) return '🌍';
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65),
  );
}

// ── Normalise raw OS string ───────────────────────────────────────────────────
export function normalizeOS(raw) {
  const s = (raw || '').toLowerCase();
  if (s.includes('windows'))   return 'Windows';
  if (s.includes('mac'))       return 'macOS';
  if (s.includes('ios'))       return 'iOS';
  if (s.includes('android'))   return 'Android';
  if (s.includes('linux'))     return 'Linux';
  if (s.includes('chrome os')) return 'Chrome OS';
  return 'Overig';
}

// ── Normalise raw browser string ─────────────────────────────────────────────
export function normalizeBrowser(raw) {
  const s = (raw || '').toLowerCase();
  if (s.includes('edge'))                             return 'Edge';
  if (s.includes('chrome'))                          return 'Chrome';
  if (s.includes('firefox'))                         return 'Firefox';
  if (s.includes('safari') && !s.includes('chrome')) return 'Safari';
  if (s.includes('ios'))                             return 'Safari';
  if (s.includes('samsung'))                         return 'Samsung';
  if (s.includes('opera'))                           return 'Opera';
  return 'Overig';
}

// ── Aggregate raw events into per-country stats ───────────────────────────────
export function aggregate(events) {
  const map = {};

  events.forEach(ev => {
    const code  = ev.country;                    if (!code)  return;
    const numId = ALPHA2_TO_NUMERIC[code];       if (!numId) return;

    if (!map[numId]) {
      map[numId] = {
        numId, code,
        name: COUNTRY_NAMES[code] || code,
        events: 0, uploaded: 0, dismissed: 0,
        cities: {}, fish: {}, hours: [],
        mobile: 0, desktop: 0,
        os: {}, browser: {},
      };
    }

    const c = map[numId];
    c.events++;
    if (ev.event_name === 'uploadedFish')       c.uploaded++;
    if (ev.event_name === 'dismissedUploading') c.dismissed++;
    if (ev.city) c.cities[ev.city] = (c.cities[ev.city] || 0) + 1;

    const dev = (ev.device || '').toLowerCase();
    if      (dev === 'mobile'  || dev === 'tablet')  c.mobile++;
    else if (dev === 'laptop'  || dev === 'desktop') c.desktop++;

    const fishMatch = (ev.referrer_query || '').match(/fish=([^&]+)/);
    if (fishMatch) {
      const f = decodeURIComponent(fishMatch[1]);
      c.fish[f] = (c.fish[f] || 0) + 1;
    }

    if (ev.created_at) {
      const h = parseInt(ev.created_at.slice(11, 13), 10);
      if (!isNaN(h)) c.hours.push(h);
    }

    if (ev.os)      { const os = normalizeOS(ev.os);           c.os[os]     = (c.os[os]     || 0) + 1; }
    if (ev.browser) { const br = normalizeBrowser(ev.browser); c.browser[br]= (c.browser[br]|| 0) + 1; }
  });

  // Derive per-country summaries
  const firstKnown = obj => {
    const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    return (sorted.find(([k]) => !UNKNOWN_VALS.includes(k)) || sorted[0])?.[0] || null;
  };

  Object.values(map).forEach(c => {
    c.topCities  = Object.entries(c.cities)
      .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([city]) => city).join(', ');
    c.topFish    = firstKnown(c.fish);
    c.topOS      = firstKnown(c.os);
    c.topBrowser = firstKnown(c.browser);
    c.avgHour    = c.hours.length
      ? Math.round(c.hours.reduce((a, b) => a + b, 0) / c.hours.length)
      : null;
  });

  return map;
}

// ── Fetch + parse NDJSON event data ──────────────────────────────────────────
export async function loadData(period) {
  const res  = await fetch(DATA_URLS[period]);
  const text = await res.text();
  return text.trim().split('\n').map(l => JSON.parse(l));
}

// ── Tooltip rows builder ──────────────────────────────────────────────────────
export function buildTooltipRows(c, mode, colors) {
  const { C, FISH_COLORS, OS_COLORS, BROWSER_COLORS } = colors;
  const n   = v => Number(v).toLocaleString('nl-NL');
  const pct = (a, b) => b > 0 ? ` (${Math.round(a / b * 100)}%)` : '';
  const row = (label, val, color = '') => ({ label, val, color });
  const base = row('Bezoeken', n(c.events));

  if (['choropleth', 'bubble', 'flows'].includes(mode)) {
    return [
      base,
      row('🐟 Gespot',   n(c.uploaded)  + pct(c.uploaded,  c.events), C.green),
      row('👋 Gesloten', n(c.dismissed) + pct(c.dismissed, c.events), C.coral),
      row('Steden', c.topCities || '—'),
    ];
  }

  if (['uploadrate', 'pies'].includes(mode)) {
    const upPct  = c.events > 0 ? Math.round(c.uploaded  / c.events * 100) : 0;
    const disPct = c.events > 0 ? Math.round(c.dismissed / c.events * 100) : 0;
    return [
      base,
      row('🐟 Gespot',   `${n(c.uploaded)} — ${upPct}%`,   C.green),
      row('👋 Gesloten', `${n(c.dismissed)} — ${disPct}%`, C.coral),
    ];
  }

  if (mode === 'device') {
    const other = c.events - c.mobile - c.desktop;
    return [
      base,
      row('💻 Desktop/laptop', n(c.desktop) + pct(c.desktop, c.events), '#f0af00'),  // --color-gold
      row('📱 Mobiel/tablet',  n(c.mobile)  + pct(c.mobile,  c.events), '#9b74ff'),  // --color-purple-bell
      ...(other > 0 ? [row('❓ Overig', n(other) + pct(other, c.events), '#1eacb0')] : []),  // --color-teal
    ];
  }

  if (mode === 'fish') {
    const entries = Object.entries(c.fish).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!entries.length) return [base, row('Vis', 'Geen data')];
    return [base, ...entries.map(([name, count]) =>
      row(`🐟 ${name}`, n(count) + pct(count, c.uploaded || c.events), FISH_COLORS[name] || '#c0a8ff'),  // --color-purple fallback
    )];
  }

  if (mode === 'time') {
    const hl = h => {
      if (h === null) return '—';
      if (h < 6)  return `${h}:00 — Nacht 🌙`;
      if (h < 12) return `${h}:00 — Ochtend 🌅`;
      if (h < 18) return `${h}:00 — Middag ☀️`;
      return `${h}:00 — Avond 🌆`;
    };
    const bk = { nacht: 0, ochtend: 0, middag: 0, avond: 0 };
    (c.hours || []).forEach(h => {
      if      (h < 6)  bk.nacht++;
      else if (h < 12) bk.ochtend++;
      else if (h < 18) bk.middag++;
      else             bk.avond++;
    });
    return [
      base,
      row('⏰ Gem. tijdstip',  hl(c.avgHour)),
      row('🌙 Nacht (0–6u)',    n(bk.nacht)   + pct(bk.nacht,   c.events), '#9b74ff'),  // --color-purple-bell
      row('🌅 Ochtend (6–12u)', n(bk.ochtend) + pct(bk.ochtend, c.events), '#f0af00'),  // --color-gold
      row('☀️ Middag (12–18u)', n(bk.middag)  + pct(bk.middag,  c.events), '#1eacb0'),  // --color-teal
      row('🌆 Avond (18–24u)',  n(bk.avond)   + pct(bk.avond,   c.events), '#ff80b9'),  // --color-pink
    ];
  }

  if (mode === 'os') {
    const entries = Object.entries(c.os || {}).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return [base, row('OS', 'Geen data')];
    return [base, ...entries.map(([name, count]) =>
      row(name, n(count) + pct(count, c.events), OS_COLORS[name] || '#c0a8ff'),  // --color-purple fallback
    )];
  }

  if (mode === 'browser') {
    const entries = Object.entries(c.browser || {}).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return [base, row('Browser', 'Geen data')];
    return [base, ...entries.map(([name, count]) =>
      row(name, n(count) + pct(count, c.events), BROWSER_COLORS[name] || '#c0a8ff'),  // --color-purple fallback
    )];
  }

  return [base];
}

// ── Country fill colour for the current mode ──────────────────────────────────
export function getCountryFill(d, countryData, maxEvents, mode, colors) {
  const { C, FISH_COLORS, OS_COLORS, BROWSER_COLORS } = colors;
  const c = countryData[d.id];

  if (mode === 'choropleth') {
    if (!c) return C.land;
    // Dynamic import of d3 avoided here — caller should pass d3 or use inline
    // This function is used inside D3 callbacks so d3 is available in calling scope
    return null; // sentinel — caller uses its own scale
  }
  if (mode === 'uploadrate') {
    if (!c || c.events === 0) return C.land;
    return null; // sentinel — caller uses its own scale
  }
  if (mode === 'fish')    { if (!c || !c.topFish)    return C.land; return FISH_COLORS[c.topFish]    || '#c0a8ff'; }
  if (mode === 'time') {
    if (!c || c.avgHour === null) return C.land;
    const h = c.avgHour;
    if (h < 6)  return '#9b74ff';  // --color-purple-bell
    if (h < 12) return '#f0af00';  // --color-gold
    if (h < 18) return '#1eacb0';  // --color-teal
    return '#ff80b9';              // --color-pink
  }
  if (mode === 'os')      { if (!c || !c.topOS)      return C.land; return OS_COLORS[c.topOS]        || '#c0a8ff'; }
  if (mode === 'browser') { if (!c || !c.topBrowser)  return C.land; return BROWSER_COLORS[c.topBrowser] || '#c0a8ff'; }
  return C.land;
}