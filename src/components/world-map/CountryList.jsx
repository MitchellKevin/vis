import { useEffect, useRef, useState } from 'react';
import { CENTROIDS } from './constants.js';
import { flag } from './utils.js';

// Sidebar list of countries sorted by upload count; top 3 always visible, rest collapsible
export default function CountryList({ countryData, onFlyTo }) {
  const [expanded, setExpanded] = useState(false);
  // Refs to every bar element so we can animate width from 0 → target after render
  const barRefs = useRef([]);

  // Sort descending by uploads; skip countries with zero uploads
  const sorted = Object.values(countryData)
    .filter(c => c.uploaded > 0)
    .sort((a, b) => b.uploaded - a.uploaded);

  // Top value used to normalise all bar widths to a 0–100% scale
  const top  = sorted[0]?.uploaded || 1;
  const top3 = sorted.slice(0, 3); // always shown
  const rest = sorted.slice(3);    // hidden until expanded

  // After render (or when data changes), animate bars from 0 → their target width
  useEffect(() => {
    requestAnimationFrame(() => {
      barRefs.current.forEach(el => {
        if (el) el.style.width = el.dataset.w + '%';
      });
    });
  }, [countryData, expanded]);

  if (!sorted.length) return null;

  // Renders a single country card: rank badge, flag, name, animated bar, upload count
  const renderCard = (c, globalIndex) => {
    const barPct = ((c.uploaded / top) * 100).toFixed(1); // target width as a percentage
    const coords = CENTROIDS[c.code]; // may be undefined for less common countries
    return (
      <div
        key={c.numId}
        className="country-card"
        // Only show pointer cursor and click handler when a centroid is available
        onClick={coords ? () => onFlyTo(coords[0], coords[1]) : undefined}
        style={coords ? { cursor: 'pointer' } : {}}
      >
        <span className="country-card__rank">#{globalIndex + 1}</span>
        <span className="country-card__flag">{flag(c.code)}</span>
        <div className="country-card__info">
          <span className="country-card__name">{c.name}</span>
          <div className="country-card__bar-wrap">
            {/* Bar starts at 0; the useEffect above animates it to data-w via CSS transition */}
            <div
              className="country-card__bar"
              data-w={barPct}
              ref={el => barRefs.current[globalIndex] = el}
              style={{ width: 0 }}
            />
          </div>
        </div>
        <span className="country-card__count">🐟 {c.uploaded.toLocaleString('nl-NL')}</span>
      </div>
    );
  };

  return (
    <>
      {/* Top 3 always visible */}
      {top3.map((c, i) => renderCard(c, i))}

      {/* Remaining countries slide open/closed via the .open CSS class */}
      {rest.length > 0 && (
        <div className={`country-card-rest${expanded ? ' open' : ''}`}>
          {rest.map((c, i) => renderCard(c, i + 3))}
        </div>
      )}

      {/* Toggle button rendered directly below the list */}
      {rest.length > 0 && (
        <button
          className="see-more-btn"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? '↑ Minder' : 'Bekijk meer'}
        </button>
      )}
    </>
  );
}