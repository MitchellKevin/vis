import * as d3 from 'd3';

// ── 1. Fish species ───────────────────────────────────────────────────────────
export function renderFish(ctx) {
  const { countriesG, overlaysG, cdata, C, FISH_COLORS } = ctx;
  countriesG.selectAll('path').attr('fill', d => {
    const c = cdata[d.id];
    if (!c || !c.topFish) return C.land;
    return FISH_COLORS[c.topFish] || '#c0a8ff';
  });
  overlaysG.selectAll('*').remove();
  return {
    type: 'rows', title: 'Meest geziene vis',
    rows: Object.entries(FISH_COLORS).map(([k, v]) => ({ color: v, label: k })),
  };
}

// ── 2. Time of day ────────────────────────────────────────────────────────────
export function renderTime(ctx) {
  const { countriesG, overlaysG, cdata, C } = ctx;
  const hourColor = h => {
    if (h === null) return C.land;
    if (h < 6)  return '#9b74ff';
    if (h < 12) return '#f0af00';
    if (h < 18) return '#1eacb0';
    return '#ff80b9';
  };
  countriesG.selectAll('path').attr('fill', d => {
    const c = cdata[d.id]; return c ? hourColor(c.avgHour) : C.land;
  });
  overlaysG.selectAll('*').remove();
  return {
    type: 'rows', title: 'Actief tijdstip', rows: [
      { color: '#9b74ff', label: 'Nacht (0–6u)'    },
      { color: '#f0af00', label: 'Ochtend (6–12u)' },
      { color: '#1eacb0', label: 'Middag (12–18u)' },
      { color: '#ff80b9', label: 'Avond (18–24u)'  },
    ],
  };
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
export const MODE_RENDERERS = {
  fish:              renderFish,
  time:              renderTime,
};
