import { $ } from './utils.js';

let tooltipEl = null;
let tooltipHideTimer = 0;

function el() {
  if (!tooltipEl) tooltipEl = $('#fishTooltip');
  return tooltipEl;
}

export function showTooltip(html, x, y) {
  const t = el();
  if (!t) return;
  clearTimeout(tooltipHideTimer);
  t.innerHTML = html;
  t.style.left = x + 'px';
  t.style.top  = y + 'px';
  t.classList.add('visible');
}

export function hideTooltip(delay = 0) {
  const t = el();
  if (!t) return;
  clearTimeout(tooltipHideTimer);
  if (delay > 0) tooltipHideTimer = setTimeout(() => t.classList.remove('visible'), delay);
  else t.classList.remove('visible');
}

export function resetTooltipRef() {
  tooltipEl = null;
}
