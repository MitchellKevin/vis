import { ALPHA2_TO_NUMERIC, COUNTRY_NAMES, UNKNOWN_VALS, DATA_URLS } from './constants.js';

// ── Flag emoji from ISO-3166-1 alpha-2 ───────────────────────────────────────

// Converts a 2-letter country code into a flag emoji using Unicode regional indicators
export function flag(code) {
  if (!code || code.length !== 2) return '🌍';
  // Each letter maps to a regional indicator by offsetting from 'A' (65) to U+1F1E6
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65),
  );
}

// ── Normalise raw OS string ───────────────────────────────────────────────────

// Collapses raw OS strings into canonical labels used across the UI
function normalizeOS(raw) {
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

// Collapses raw browser strings; Edge must come before Chrome because its UA contains "chrome"
function normalizeBrowser(raw) {
  const s = (raw || '').toLowerCase();
  if (s.includes('edge'))                             return 'Edge';
  if (s.includes('chrome'))                          return 'Chrome';
  if (s.includes('firefox'))                         return 'Firefox';
  if (s.includes('safari') && !s.includes('chrome')) return 'Safari';
  if (s.includes('ios'))                             return 'Safari'; // iOS webviews
  if (s.includes('samsung'))                         return 'Samsung';
  if (s.includes('opera'))                           return 'Opera';
  return 'Overig';
}

// ── Aggregate raw events into per-country stats ───────────────────────────────

// Reduces raw event array into a map of per-country stats keyed by TopoJSON numeric id
export function aggregate(events) {
  const map = {};

  events.forEach(ev => {
    const code  = ev.country;                    if (!code)  return;
    const numId = ALPHA2_TO_NUMERIC[code];       if (!numId) return; // skip unmapped countries

    // Initialise entry on first encounter for this country
    if (!map[numId]) {
      map[numId] = {
        numId, code,
        name: COUNTRY_NAMES[code] || code, // fall back to raw code if not in lookup
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

    // Fish species is encoded in the referrer query string as ?fish=Baars&…
    const fishMatch = (ev.referrer_query || '').match(/fish=([^&]+)/);
    if (fishMatch) {
      const f = decodeURIComponent(fishMatch[1]);
      c.fish[f] = (c.fish[f] || 0) + 1;
    }

    // Extract hour-of-day (0–23) from the ISO timestamp for time-of-day visualisation
    if (ev.created_at) {
      const h = parseInt(ev.created_at.slice(11, 13), 10);
      if (!isNaN(h)) c.hours.push(h);
    }

    if (ev.os)      { const os = normalizeOS(ev.os);           c.os[os]     = (c.os[os]     || 0) + 1; }
    if (ev.browser) { const br = normalizeBrowser(ev.browser); c.browser[br]= (c.browser[br]|| 0) + 1; }
  });

  // Derive per-country summaries
  // Returns the top-frequency key that isn't in UNKNOWN_VALS, or the absolute top as fallback
  const firstKnown = obj => {
    const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    return (sorted.find(([k]) => !UNKNOWN_VALS.includes(k)) || sorted[0])?.[0] || null;
  };

  Object.values(map).forEach(c => {
    // Top 3 city names as a comma-separated display string
    c.topCities  = Object.entries(c.cities)
      .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([city]) => city).join(', ');
    c.topFish    = firstKnown(c.fish);
    c.topOS      = firstKnown(c.os);
    c.topBrowser = firstKnown(c.browser);
    // Mean hour rounded to nearest integer, or null when no timestamp data exists
    c.avgHour    = c.hours.length
      ? Math.round(c.hours.reduce((a, b) => a + b, 0) / c.hours.length)
      : null;
  });

  return map;
}

// ── Fetch + parse NDJSON event data ──────────────────────────────────────────

// Fetches the NDJSON file for the given period and parses each line as JSON
export async function loadData(period) {
  const res  = await fetch(DATA_URLS[period]);
  const text = await res.text();
  return text.trim().split('\n').map(l => JSON.parse(l));
}

// ── Tooltip rows builder ──────────────────────────────────────────────────────

// Builds the label/value/color rows shown inside the hover tooltip for a given mode
export function buildTooltipRows(c, mode, colors) {
  const { C, FISH_COLORS } = colors;
  const n   = v => Number(v).toLocaleString('nl-NL'); // Dutch number formatting
  const pct = (a, b) => b > 0 ? ` (${Math.round(a / b * 100)}%)` : ''; // percentage string
  const row = (label, val, color = '') => ({ label, val, color });
  const base = row('Bezoeken', n(c.events)); // always the first row

  // Fish mode: top-5 species with counts and percentages
  if (mode === 'fish') {
    const entries = Object.entries(c.fish).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!entries.length) return [base, row('Vis', 'Geen data')];
    return [base, ...entries.map(([name, count]) =>
      row(`🐟 ${name}`, n(count) + pct(count, c.uploaded || c.events), FISH_COLORS[name] || '#c0a8ff'),  // --color-purple fallback
    )];
  }

  // Time mode: average hour label + breakdown into four time-of-day buckets
  if (mode === 'time') {
    // Maps an average hour to a human-readable label with emoji
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

  // OS mode: ranked OS breakdown
  if (mode === 'os') {
    const entries = Object.entries(c.os || {}).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return [base, row('OS', 'Geen data')];
    return [base, ...entries.map(([name, count]) =>
      row(name, n(count) + pct(count, c.events), '#c0a8ff'),
    )];
  }

  // Browser mode: ranked browser breakdown
  if (mode === 'browser') {
    const entries = Object.entries(c.browser || {}).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return [base, row('Browser', 'Geen data')];
    return [base, ...entries.map(([name, count]) =>
      row(name, n(count) + pct(count, c.events), '#c0a8ff'),
    )];
  }

  return [base];
}