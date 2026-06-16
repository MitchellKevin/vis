// ============================================================================
// fishImage.js — helpers om de vis-PNG's in te kleuren met de soort-kleur.
// ----------------------------------------------------------------------------
// De foto's zijn grijs/neutraal; we "tinten" ze luminantie-behoudend zodat ze
// de soort-kleur krijgen maar hun textuur/details houden. Twee varianten:
//   • ensureTintFilter — voor SVG (radar, net) via een feColorMatrix-filter.
//   • (in aquarium.js) buildSprite — voor canvas, per pixel.
// ============================================================================

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
// (intern: alleen ensureTintFilter gebruikt dit)
function tintFilterId(color) {
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
    // Lichtere tint (zelfde als in het aquarium): meng de soort-kleur richting
    // wit (L) en til de helderheid wat op (lift), zodat de vissen lichter ogen.
    const L = 0.4, lift = 1.12;
    const lr = (r + (1 - r) * L) * lift;
    const lg = (g + (1 - g) * L) * lift;
    const lb = (b + (1 - b) * L) * lift;
    const filter = defs.append('filter').attr('id', id)
      .attr('color-interpolation-filters', 'sRGB');
    // Stap 1: alle RGB-kanalen krijgen dezelfde grijswaarde
    filter.append('feColorMatrix').attr('values',
      `0.299 0.587 0.114 0 0
       0.299 0.587 0.114 0 0
       0.299 0.587 0.114 0 0
       0     0     0     1 0`);
    // Stap 2: schaal elk kanaal naar de (lichtere) doelkleur
    const ct = filter.append('feComponentTransfer');
    ct.append('feFuncR').attr('type', 'linear').attr('slope', lr);
    ct.append('feFuncG').attr('type', 'linear').attr('slope', lg);
    ct.append('feFuncB').attr('type', 'linear').attr('slope', lb);
  }
  return id;
}
