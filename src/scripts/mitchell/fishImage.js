// Map vissoort-naam naar PNG-bestandspad in public/images/.
export function fishImagePath(naam) {
  return `/images/${naam.toLowerCase()}.png`;
}

// Converteer hex-kleur naar [r,g,b] in 0..1 range.
export function hexToRgb01(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ];
}

// Stabiele id per kleur — gebruikt om het feColorMatrix-filter te delen.
export function tintFilterId(color) {
  return 'fishTint-' + color.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

// Voeg (idempotent) een luminantie-behoudend tint-filter toe aan de defs van
// een d3-svg-selectie. Eerst grijswaarde (Y = 0.299R + 0.587G + 0.114B), dan
// die intensiteit vermenigvuldigen met de doel-kleur. Zo blijven texturen
// en details van de foto zichtbaar terwijl alles de soort-kleur krijgt.
export function ensureTintFilter(svg, color) {
  const id = tintFilterId(color);
  let defs = svg.select('defs');
  if (defs.empty()) defs = svg.append('defs');
  if (defs.select('#' + id).empty()) {
    const [r, g, b] = hexToRgb01(color);
    const filter = defs.append('filter').attr('id', id)
      .attr('color-interpolation-filters', 'sRGB');
    // Stap 1: alle RGB-kanalen krijgen dezelfde grijswaarde
    filter.append('feColorMatrix').attr('values',
      `0.299 0.587 0.114 0 0
       0.299 0.587 0.114 0 0
       0.299 0.587 0.114 0 0
       0     0     0     1 0`);
    // Stap 2: schaal elk kanaal naar de doelkleur (0 → 0, 1 → target)
    const ct = filter.append('feComponentTransfer');
    ct.append('feFuncR').attr('type', 'linear').attr('slope', r);
    ct.append('feFuncG').attr('type', 'linear').attr('slope', g);
    ct.append('feFuncB').attr('type', 'linear').attr('slope', b);
  }
  return id;
}
