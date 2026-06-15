// ============================================================================
// utils.js — kleine, herbruikbare hulpfuncties voor alle Mitchell-charts.
// ============================================================================

// Korte selectors: $ = één element, $$ = array van elementen.
// (p = parent) maakt het mogelijk om binnen een specifiek element te zoeken.
export const $  = (s, p = document) => p.querySelector(s);
export const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

// Getal netjes met Nederlandse duizendtal-puntjes tonen (49736 → "49.736").
export const formatNumber = n => new Intl.NumberFormat('nl-NL').format(Math.round(n));

// True als de bezoeker "verminderde beweging" heeft aangezet in zijn OS of via a11y menu.
// Charts gebruiken dit om animaties over te slaan / direct eindstand te tonen.
export const reduceMotion = () =>
  window.__reduceMotion === true || matchMedia('(prefers-reduced-motion: reduce)').matches;

// Mulberry32: een kleine, snelle "seeded" random-generator. Met dezelfde seed
// krijg je dezelfde reeks getallen — zo zien posities er bij elke render gelijk
// uit (reproduceerbaar), in tegenstelling tot Math.random().
export function mulberry32(seed) {
  return function () {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gedeelde gezaaide generator (seed = een datum) voor stabiele "willekeur".
export const rng = mulberry32(20260518);

// Verdeel een totaal over 9 maanden volgens een ruwe seizoenscurve (piek in
// het voorjaar), met wat ruis erop zodat het natuurlijk oogt. Gebruikt om per
// vissoort een nep-maandverloop te verzinnen.
export function generateMonthly(total) {
  const peak = [0.06, 0.22, 0.28, 0.16, 0.10, 0.06, 0.05, 0.04, 0.03];
  return peak.map(p => Math.round(p * total * (0.92 + rng() * 0.16)));
}

// Bouwt het id van een <symbol> in de FishSprite-sheet op uit de vorm-naam
// (bv. 'round' → 'fish-round').
export function fishSymbolId(shape) {
  return 'fish-' + shape;
}
