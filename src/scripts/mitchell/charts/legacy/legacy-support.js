// ============================================================================
// legacy-support.js — gebundelde support-code die ALLEEN de gearchiveerde
// legacy-charts gebruiken (apparaten/sessies/vijver/etc.). Stond eerder
// verspreid in de gedeelde live-modules (constants.js, utils.js, state.js,
// dataLoad.js); hierheen verplaatst zodat die live-modules schoon blijven.
// De live app importeert dit bestand niet — alleen legacy-charts doen dat.
// ============================================================================

import { COLORS } from '../../constants.js';

// ── Browserfamilies (apparaten-charts: shoal) ────────────────────────────────
export const BROWSER_FAMILY = {
  chrome: 'google', crios: 'google', 'chromium-webview': 'google', 'edge-chromium': 'google',
  samsung: 'google', opera: 'google', miui: 'google', yandexbrowser: 'google', silk: 'google',
  ios: 'apple', safari: 'apple', 'ios-webview': 'apple', 'edge-ios': 'apple',
  firefox: 'firefox', fxios: 'firefox',
  instagram: 'social', facebook: 'social',
};
export const FAMILY = {
  google:  { color: COLORS.teal,     label: 'Chrome-achtig' },
  apple:   { color: COLORS.bell,     label: 'Safari / iOS' },
  firefox: { color: COLORS.goldDeep, label: 'Firefox' },
  social:  { color: COLORS.pink,     label: 'Social in-app' },
  other:   { color: COLORS.greenMid, label: 'Overig' },
};
export const BROWSER_LABEL = {
  chrome: 'Chrome', crios: 'Chrome iOS', 'chromium-webview': 'Chrome WebView',
  'edge-chromium': 'Edge', samsung: 'Samsung', opera: 'Opera', firefox: 'Firefox',
  fxios: 'Firefox iOS', ios: 'Safari iOS', safari: 'Safari', 'ios-webview': 'iOS WebView',
  instagram: 'Instagram', facebook: 'Facebook', silk: 'Silk', 'edge-ios': 'Edge iOS',
  miui: 'MIUI', yandexbrowser: 'Yandex',
};

// ── <symbol>-id voor de FishSprite-sheet (depth) ─────────────────────────────
// Bouwt het id van een <symbol> op uit de vorm-naam (bv. 'round' → 'fish-round').
export function fishSymbolId(shape) {
  return 'fish-' + shape;
}

// ── Legacy-only state + datavulling ──────────────────────────────────────────
// Velden die alleen legacy-charts lezen (apparaten, sessies, vijver, dagtotalen).
// Werden eerder in `state` gedeclareerd en in `dataLoad` gevuld; nu hier, los
// van de live data-laag. Om een legacy-chart te reviven: roep in de laad-flow
// scaleLegacyCounts(live) (alleen jaar-modus) en populateLegacyState(live) aan.
export const legacyState = {
  techData: null,        // device / browser / os verdeling
  dailyData: null,       // oproepen per dag
  sessionsData: null,    // sessies: bellers, totaal aanbellen, fanatici
  pondWeekData: null,    // tijdlijn voor de vijver-replay
  screensData: null,     // schermresoluties
  orientationData: null, // portret / landschap
};

const SCALE = 12; // maand → jaar: vermenigvuldig de tellers
const scaleNum = v => (typeof v === 'number' ? Math.round(v * SCALE) : v);
const scaleObj = obj => { if (obj) Object.keys(obj).forEach(k => { obj[k] = scaleNum(obj[k]); }); };
const scaleKeys = (obj, keys) => { if (obj) keys.forEach(k => { if (typeof obj[k] === 'number') obj[k] = scaleNum(obj[k]); }); };

// Schaal de legacy-only velden ×12 (jaar-modus). Muteert `live` in-place.
export function scaleLegacyCounts(live) {
  if (typeof live.pondTotal === 'number') live.pondTotal = scaleNum(live.pondTotal);
  if (live.tech) ['device', 'browser', 'os'].forEach(cat => scaleObj(live.tech[cat]));
  if (Array.isArray(live.screens)) live.screens.forEach(s => { if (typeof s.n === 'number') s.n = scaleNum(s.n); });
  scaleKeys(live.orientation, ['portrait', 'landscape', 'square', 'total', 'unique']);
  if (live.sessions) {
    scaleKeys(live.sessions, ['totalSessions', 'ringers', 'totalRings']);
    if (Array.isArray(live.sessions.hist)) live.sessions.hist = live.sessions.hist.map(scaleNum);
  }
  live.daily = buildDailyTotals(live.weekHours || []);
}

// Totaal aantal belletjes per dag (gebruikt door de dailyData-chart).
function buildDailyTotals(hours) {
  const daily = {};
  const days = Math.floor(hours.length / 24);
  for (let d = 0; d < days; d++) {
    let sum = 0;
    for (let h = 0; h < 24; h++) sum += hours[d * 24 + h] || 0;
    daily[d + 1] = sum;
  }
  return daily;
}

// Kopieer de legacy-only velden uit de geladen dataset naar legacyState.
export function populateLegacyState(live) {
  legacyState.techData        = live.tech        || null;
  legacyState.dailyData       = live.daily       || null;
  legacyState.sessionsData    = live.sessions    || null;
  legacyState.pondWeekData    = live.pondWeek    || null;
  legacyState.screensData     = live.screens     || null;
  legacyState.orientationData = live.orientation || null;
}
