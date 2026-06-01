export const $  = (s, p = document) => p.querySelector(s);
export const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

export const fmt = n => new Intl.NumberFormat('nl-NL').format(Math.round(n));

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mulberry32(seed) {
  return function () {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rng = mulberry32(20260518);

export function generateMonthly(total) {
  const peak = [0.06, 0.22, 0.28, 0.16, 0.10, 0.06, 0.05, 0.04, 0.03];
  return peak.map(p => Math.round(p * total * (0.92 + rng() * 0.16)));
}

export function fishSymbolId(shape) {
  return 'fish-' + shape;
}
