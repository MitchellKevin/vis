import { useEffect, useRef } from 'react';
import { CENTROIDS } from './constants.js';
import { flag } from './utils.js';

export default function CountryList({ countryData, onFlyTo }) {
  const barRefs = useRef([]);

  // All countries with at least 1 uploaded fish, sorted by uploaded descending
  const sorted = Object.values(countryData)
    .filter(c => c.uploaded > 0)
    .sort((a, b) => b.uploaded - a.uploaded);

  const top = sorted[0]?.uploaded || 1;

  // Animate bars in after render / data change
  useEffect(() => {
    requestAnimationFrame(() => {
      barRefs.current.forEach(el => {
        if (el) el.style.width = el.dataset.w + '%';
      });
    });
  }, [countryData]);

  if (!sorted.length) {
    return <div style={{ padding: '16px', color: 'var(--text-muted)' }}>Geen data beschikbaar.</div>;
  }

  return (
    <div id="country-list">
      {sorted.map((c, i) => {
        const barPct = ((c.uploaded / top) * 100).toFixed(1);
        const coords = CENTROIDS[c.code];

        return (
          <div
            key={c.numId}
            className="country-row"
            style={coords ? { cursor: 'pointer' } : {}}
            onClick={coords ? () => onFlyTo(coords[0], coords[1]) : undefined}
            onKeyDown={coords ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onFlyTo(coords[0], coords[1]);
              }
            } : undefined}
            role={coords ? 'button' : undefined}
            tabIndex={coords ? 0 : undefined}
            aria-label={coords ? `${c.name}, ${c.uploaded.toLocaleString('nl-NL')} vissen gespot` : undefined}
          >
            {/* Rank */}
            <div className="country-rank">#{i + 1}</div>

            {/* Flag */}
            <div className="country-flag">{flag(c.code)}</div>

            {/* Name + bar */}
            <div className="country-info">
              <div className="country-name">{c.name}</div>
              <div className="country-bars">
                <div className="bar-row">
                  <div
                    className="bar-segment bar-green"
                    data-w={barPct}
                    ref={el => barRefs.current[i] = el}
                    style={{ width: 0 }}
                  />
                </div>
              </div>
            </div>

            {/* Uploaded count */}
            <div className="country-count">
              🐟 {c.uploaded.toLocaleString('nl-NL')}
            </div>
          </div>
        );
      })}
    </div>
  );
}