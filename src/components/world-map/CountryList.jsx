import { useEffect, useRef, useState } from 'react';
import { CENTROIDS } from './constants.js';
import { flag } from './utils.js';

// Sidebar list of countries sorted by upload count.
// Tab order: "Bekijk meer" button first, then the top-3 cards, then the expanded cards.
// The button comes first in the DOM; CSS flex order pushes it visually to the bottom.
export default function CountryList({ countryData, onFlyTo }) {
  const [expanded, setExpanded] = useState(false);
  // Refs to every bar element so we can animate width from 0 to target after render
  const barRefs = useRef([]);
  // Ref to the toggle button so we can return focus to it after Escape closes the list
  const toggleBtnRef = useRef(null);
  // Ref to the expanded region so we can catch the Escape key while it is open
  const restRef = useRef(null);

  // Sort descending by uploads; skip countries with zero uploads
  const sorted = Object.values(countryData)
    .filter(c => c.uploaded > 0)
    .sort((a, b) => b.uploaded - a.uploaded);

  // Top value used to normalise all bar widths to a 0-100% scale
  const top  = sorted[0]?.uploaded || 1;
  const top3 = sorted.slice(0, 3); // always shown
  const rest = sorted.slice(3);    // hidden until expanded

  // After render (or when data changes), animate bars from 0 to their target width
  useEffect(() => {
    requestAnimationFrame(() => {
      barRefs.current.forEach(el => {
        if (el) el.style.width = el.dataset.w + '%';
      });
    });
  }, [countryData, expanded]);

  // When the list opens, move focus to the first card inside it so keyboard users land there
  useEffect(() => {
    if (expanded && restRef.current) {
      const firstCard = restRef.current.querySelector('[tabindex="0"]');
      if (firstCard) firstCard.focus();
    }
  }, [expanded]);

  // Collapse the list and return focus to the toggle button
  function handleCollapse() {
    setExpanded(false);
    toggleBtnRef.current?.focus();
  }

  // Escape anywhere inside the expanded region collapses the list and returns focus
  function handleRestKeyDown(e) {
    if (e.key === 'Escape') handleCollapse();
  }

  if (!sorted.length) return null;

  // Builds the screen-reader label for a card e.g. "Nummer 4. Land: Nederland. Aantal vissen gespot: 1.234."
  function cardAriaLabel(c, globalIndex) {
    return `Nummer ${globalIndex + 1}. Land: ${c.name}. Aantal vissen gespot: ${c.uploaded.toLocaleString('nl-NL')}.`;
  }

  // Renders a single country card; tabIndex=-1 hides it from tab order when collapsed
  const renderCard = (c, globalIndex, tabbable = true) => {
    const barPct = ((c.uploaded / top) * 100).toFixed(1);
    const coords = CENTROIDS[c.code];
    return (
      <div
        key={c.numId}
        className="country-card"
        tabIndex={tabbable ? 0 : -1}
        role="button"
        aria-label={cardAriaLabel(c, globalIndex)}
        onClick={coords ? () => onFlyTo(coords[0], coords[1]) : undefined}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ' ') && coords) {
            e.preventDefault();
            onFlyTo(coords[0], coords[1]);
          }
        }}
        style={coords ? { cursor: 'pointer' } : {}}
      >
        <span className="country-card__rank" aria-hidden="true">#{globalIndex + 1}</span>
        <span className="country-card__flag" aria-hidden="true">{flag(c.code)}</span>
        <div className="country-card__info">
          <span className="country-card__name" aria-hidden="true">{c.name}</span>
          <div className="country-card__bar-wrap" aria-hidden="true">
            <div
              className="country-card__bar"
              data-w={barPct}
              ref={el => barRefs.current[globalIndex] = el}
              style={{ width: 0 }}
            />
          </div>
        </div>
        <span className="country-card__count" aria-hidden="true">🐟 {c.uploaded.toLocaleString('nl-NL')}</span>
      </div>
    );
  };

  return (
    <>
      {/* Top-3 always visible and tabbable — wrapped so CSS gap applies */}
      <div className="country-list-top3">
        {top3.map((c, i) => renderCard(c, i))}
      </div>

      {/* Button sits here in the DOM so Tab reaches it right after the top-3 */}
      {rest.length > 0 && (
        <button
          ref={toggleBtnRef}
          className="see-more-btn"
          aria-expanded={expanded}
          aria-controls="country-card-rest"
          onClick={() => (expanded ? handleCollapse() : setExpanded(true))}
        >
          {expanded ? 'Minder' : 'Bekijk meer'}
        </button>
      )}

      {/* Expanded cards: tabIndex=-1 on every card until the list is open */}
      {rest.length > 0 && (
        <div
          ref={restRef}
          id="country-card-rest"
          className={`country-card-rest${expanded ? ' open' : ''}`}
          aria-live="polite"
          onKeyDown={handleRestKeyDown}
        >
          {/* Screen-reader hint announced as soon as the region opens */}
          {expanded && (
            <p className="sr-only">
              Druk op Escape om de lijst te sluiten.
            </p>
          )}
          {/* Cards are only tabbable when the list is open */}
          {rest.map((c, i) => renderCard(c, i + 3, expanded))}
        </div>
      )}
    </>
  );
}