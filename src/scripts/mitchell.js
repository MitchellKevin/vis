// Orchestrator — laadt data, observeert chapters en wijst per chapter een
// init-functie aan. De grafiek-code zelf staat in src/scripts/mitchell/charts/.

import { $, $$ } from './mitchell/utils.js';
import { state, lifecycle } from './mitchell/state.js';
import { loadData, synthesizeYear } from './mitchell/dataLoad.js';
import { initSwimFish } from './mitchell/swimFish.js';

import { initHero      } from './mitchell/charts/hero.js';
import { initRing      } from './mitchell/charts/ring.js';
import { initWorld     } from './mitchell/charts/world.js';
import { initLanguages } from './mitchell/charts/languages.js';
import { initRadar     } from './mitchell/charts/radar.js';
import { initAquarium  } from './mitchell/charts/aquarium.js';
import { initNet       } from './mitchell/charts/net.js';

export function initMitchell() {
  const { cleanups, rafs } = lifecycle;

  // Welke chart hoort bij welke section-id
  const chapterInit = {
    'ch-hero':      initHero,
    'ch-ring':      initRing,
    'ch-world':     initWorld,
    'ch-languages': initLanguages,
    'ch-radar':     initRadar,
    'ch-aquarium':  initAquarium,
    'ch-net':       initNet,
  };

  // De stages die bij clearChapters volledig leeggemaakt worden
  const STAGES = [
    '#heroStage', '#ringStage', '#worldStage', '#langStage',
    '#radarStage', '#aquariumStage', '#netStage',
  ];

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      if (!entry.target.dataset.inited) {
        entry.target.dataset.inited = '1';
        const fn = chapterInit[entry.target.id];
        if (fn) fn(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

  function observeChapters() {
    sectionObserver.disconnect();
    $$('.chapter').forEach(c => sectionObserver.observe(c));
  }

  function clearChapters() {
    cleanups.forEach(fn => { try { fn(); } catch { /* noop */ } });
    cleanups.length = 0;
    rafs.forEach(id => cancelAnimationFrame(id));
    rafs.clear();
    $$('.chapter').forEach(c => { delete c.dataset.inited; });
    STAGES.forEach(sel => {
      const s = $(sel);
      if (s) s.querySelectorAll('svg, canvas, .aquarium-counter, .aquarium-rip').forEach(n => n.remove());
    });
    const rd = $('#radarDetail'); if (rd) rd.classList.remove('visible');
  }

  async function setPeriod(period) {
    if (period === state.currentPeriod) return;
    state.currentPeriod = period;
    const sw = $('.data-switch'); if (sw) sw.classList.add('is-loading');
    $$('.data-switch__btn').forEach(b => {
      const on = b.dataset.period === period;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    clearChapters();
    const url = period === 'week' ? '/json/vis-data-week.json' : '/json/vis-data.json';
    const transform = period === 'jaar' ? synthesizeYear : null;
    try { await loadData(url, transform); }
    catch (e) { console.warn('dataset niet geladen', e); }
    if (sw) sw.classList.remove('is-loading');
    observeChapters();
  }

  let swimTeardown = null;

  async function boot() {
    try { await loadData('/json/vis-data.json'); }
    catch (e) { console.warn('vis-data.json niet geladen', e); }
    try { state.worldTopo = await fetch('/json/world-110m.json').then(r => r.json()); }
    catch (e) { console.warn('world-110m.json niet geladen', e); }
    $$('.data-switch__btn').forEach(b => b.addEventListener('click', () => setPeriod(b.dataset.period)));
    observeChapters();
    // Na de awaits aanmaken: overleeft zo de StrictMode mount→unmount→remount
    // (anders ruimt de unmount-cleanup de vis op vóór hij opnieuw gemaakt wordt).
    swimTeardown = initSwimFish();
  }

  boot();

  return () => {
    sectionObserver.disconnect();
    cleanups.forEach(fn => { try { fn(); } catch { /* noop */ } });
    rafs.forEach(id => cancelAnimationFrame(id));
    if (swimTeardown) swimTeardown();
  };
}
