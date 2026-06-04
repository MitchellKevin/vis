import { $ } from './utils.js';

// ============================================================================
// tooltip.js — één gedeelde tooltip voor de hele pagina.
// Er is maar één tooltip-element (#fishTooltip in de DOM); alle charts vullen
// en positioneren hetzelfde element i.p.v. elk een eigen tooltip te maken.
// ============================================================================

let tooltipEl = null;      // gecachte verwijzing naar het DOM-element
let tooltipHideTimer = 0;  // timer-id voor het vertraagd verbergen

// Haal het tooltip-element op en onthoud het (lazy + gecachet).
function el() {
  if (!tooltipEl) tooltipEl = $('#fishTooltip');
  return tooltipEl;
}

// Toon de tooltip met HTML-inhoud op schermpositie (x, y).
export function showTooltip(html, x, y) {
  const t = el();
  if (!t) return;
  clearTimeout(tooltipHideTimer); // eventueel lopend verberg-timertje afbreken
  t.innerHTML = html;
  t.style.left = x + 'px';
  t.style.top  = y + 'px';
  t.classList.add('visible');
}

// Verberg de tooltip — direct, of na `delay` ms (handig om geflikker te
// voorkomen als de muis kort tussen twee elementen beweegt).
export function hideTooltip(delay = 0) {
  const t = el();
  if (!t) return;
  clearTimeout(tooltipHideTimer);
  if (delay > 0) tooltipHideTimer = setTimeout(() => t.classList.remove('visible'), delay);
  else t.classList.remove('visible');
}

// Vergeet de gecachte verwijzing — nodig als de DOM opnieuw is opgebouwd
// (bv. na een hermount), zodat el() het verse element weer opzoekt.
export function resetTooltipRef() {
  tooltipEl = null;
}
