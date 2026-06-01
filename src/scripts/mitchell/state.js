import { visData } from './constants.js';

// Module-state — wordt door dataLoad gemuteerd, gelezen door alle chart-inits.
export const state = {
  TOTAL: 0,
  weekHours: [],
  weekDayLabels: [],
  weekDays: [],
  periodLabel: '',
  currentPeriod: 'maand',

  visData,            // dezelfde referentie, in-place gemuteerd
  geoData: null,
  funnelData: null,
  techData: null,
  worldTopo: null,
  dailyData: null,
  sessionsData: null,
  pondWeekData: null,
  languagesData: null,
  screensData: null,
  orientationData: null,
};

// Levensduur — gevuld door initMitchell, gelezen door chart-inits voor cleanup.
export const lifecycle = {
  cleanups: [],
  rafs: new Set(),
};

export function raf(fn) {
  const id = requestAnimationFrame(fn);
  lifecycle.rafs.add(id);
  return id;
}
