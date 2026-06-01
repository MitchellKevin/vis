import { visData } from './constants.js';

// ============================================================================
// state.js — gedeelde module-state.
// ----------------------------------------------------------------------------
// `dataLoad.js` vult/muteert dit object met de geladen dataset; alle chart-
// init-functies lézen eruit. Eén bron van waarheid, zodat de schakelaar
// (week / maand / jaar) maar op één plek de data hoeft te verversen.
// ============================================================================
export const state = {
  TOTAL: 0,              // totaal aantal bel-oproepen in de huidige periode
  weekHours: [],         // aantal oproepen per uur (plat: dagen × 24 slots)
  weekDayLabels: [],     // labels per dag, bv. "18 apr"
  weekDays: [],          // datum-strings (yyyy-mm-dd) per dag
  periodLabel: '',       // mensvriendelijke periode, bv. "18 apr – 18 mei 2026"
  currentPeriod: 'maand',// actieve schakelaar-stand: 'week' | 'maand' | 'jaar'

  visData,            // dezelfde referentie, in-place gemuteerd
  geoData: null,      // landen + totalen voor de wereldkaart
  funnelData: null,   // trechter: geüpload vs. weggeklikt
  techData: null,     // device / browser / os verdeling
  worldTopo: null,    // TopoJSON van de wereld (landgrenzen)
  dailyData: null,    // oproepen per dag
  sessionsData: null, // sessies: bellers, totaal aanbellen, fanatici
  pondWeekData: null, // tijdlijn voor de vijver-replay
  languagesData: null,// talen van de bezoekers
  screensData: null,  // schermresoluties
  orientationData: null, // portret / landschap
};

// ============================================================================
// lifecycle — opruim-haakjes en lopende animatieframes.
// Elke chart pusht hier zijn cleanup-functie; bij periodewissel of unmount
// worden ze allemaal aangeroepen zodat er geen animaties blijven hangen.
// ============================================================================
export const lifecycle = {
  cleanups: [],
  rafs: new Set(),
};

// Wrapper om requestAnimationFrame: registreert het frame-id in lifecycle.rafs
// zodat het later netjes geannuleerd kan worden.
export function raf(fn) {
  const id = requestAnimationFrame(fn);
  lifecycle.rafs.add(id);
  return id;
}
