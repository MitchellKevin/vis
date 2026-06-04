import { useEffect, useRef, useState } from 'react';
import { CENTROIDS } from './constants.js';
import { flag } from './utils.js';

export default function CountryList({ countryData, onFlyTo }) {
  const [expanded, setExpanded] = useState(false);
  const barRefs = useRef([]);

  const sorted = Object.values(countryData)
    .filter(c => c.uploaded > 0)
    .sort((a, b) => b.uploaded - a.uploaded);

  const top  = sorted[0]?.uploaded || 1;
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  useEffect(() => {
    requestAnimationFrame(() => {
      barRefs.current.forEach(el => {
        if (el) el.style.width = el.dataset.w + '%';
      });
    });
  }, [countryData, expanded]);

  if (!sorted.length) return null;

  const renderCard = (c, globalIndex) => {
    const barPct = ((c.uploaded / top) * 100).toFixed(1);
    const coords = CENTROIDS[c.code];
    return (
      <div
        key={c.numId}
        className="country-card"
        onClick={coords ? () => onFlyTo(coords[0], coords[1]) : undefined}
        style={coords ? { cursor: 'pointer' } : {}}
      >
        <span className="country-card__rank">#{globalIndex + 1}</span>
        <span className="country-card__flag">{flag(c.code)}</span>
        <div className="country-card__info">
          <span className="country-card__name">{c.name}</span>
          <div className="country-card__bar-wrap">
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
      {/* Always visible: top 3 */}
      {top3.map((c, i) => renderCard(c, i))}

      {/* Expandable rest — animated via .open class */}
      {rest.length > 0 && (
        <div className={`country-card-rest${expanded ? ' open' : ''}`}>
          {rest.map((c, i) => renderCard(c, i + 3))}
        </div>
      )}

      {/* Button always right below */}
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