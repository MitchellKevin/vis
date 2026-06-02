import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

import Nav         from '../Nav.jsx';
import StatsBar    from './StatsBar.jsx';
import GlobeMap    from './GlobeMap.jsx';
import EventFeed   from './EventFeed.jsx';
import { TOPO_URL } from './constants.js';
import { aggregate, loadData } from './utils.js';
import { useStylesheet } from '../../hooks/useStylesheet.js';

export default function WorldMap() {
  useStylesheet('/styles/joost.css');
  const [period,        setPeriod       ] = useState('maand');
  const [allEvents,     setAllEvents    ] = useState([]);
  const [countryData,   setCountryData  ] = useState({});
  const [maxEvents,     setMaxEvents    ] = useState(1);
  const [topoFeatures,  setTopoFeatures ] = useState([]);
  const [loading,       setLoading      ] = useState(true);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [statsLoaded,   setStatsLoaded  ] = useState(false);
  const flyToRef = useRef(null);

  // ── Initial data load ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [topoData, rawEvents] = await Promise.all([
          d3.json(TOPO_URL),
          loadData('maand'),
        ]);
        const cd = aggregate(rawEvents);
        const mx = Math.max(...Object.values(cd).map(c => c.events), 1);
        setAllEvents(rawEvents);
        setCountryData(cd);
        setMaxEvents(mx);
        setTopoFeatures(topojson.feature(topoData, topoData.objects.countries).features);
        setLoading(false);
        setTimeout(() => setStatsLoaded(true), 300);
      } catch (err) {
        console.error('Fout bij laden data:', err);
        setLoading(false);
      }
    })();
  }, []);

  // ── Period switch ─────────────────────────────────────────────────────────
  async function switchPeriod(p) {
    if (p === period) return;
    setPeriod(p);
    setPeriodLoading(true);
    try {
      const rawEvents = await loadData(p);
      const cd = aggregate(rawEvents);
      const mx = Math.max(...Object.values(cd).map(c => c.events), 1);
      setAllEvents(rawEvents);
      setCountryData(cd);
      setMaxEvents(mx);
    } catch (err) {
      console.error('Fout bij laden periode:', err);
    } finally {
      setPeriodLoading(false);
    }
  }

  return (
    <>
      <Nav current="joost" />

      {/* Page header */}
      <header className="page-header">
        <div className="header-inner">
          <p className="header-eyebrow">Wereldwijd data</p>
          <h1>Waar kijken de <em>viskijkers</em> mee?</h1>
          <p className="header-sub">Bezoekersdata van visdeurbel.nl — per land, per gebeurtenis, per maand.</p>
        </div>
        <div className="header-fish-deco" aria-hidden="true">🐠🐡🐟</div>
      </header>

      <div className="page-content">

        {/* Period toggle */}
        <div className="period-bar">
          <span className="period-label">Periode:</span>
          <div className="period-toggle">
            <button className={`period-btn${period === 'week'  ? ' active' : ''}`} onClick={() => switchPeriod('week') }>Deze week</button>
            <button className={`period-btn${period === 'maand' ? ' active' : ''}`} onClick={() => switchPeriod('maand')}>Deze maand</button>
          </div>
          <span className={`period-loading${periodLoading ? ' visible' : ''}`}>Laden…</span>
        </div>

        {/* Stats */}
        <section className="section">
          <StatsBar allEvents={allEvents} countryData={countryData} loaded={statsLoaded} />
        </section>

        {/* Globe / map — country list is embedded inside */}
        <section className="section">
          <h2 className="section-heading">Wereldbol</h2>
          <p className="section-sub">
            Bol: slepen = draaien · Kaart: slepen = verschuiven · Scrollen = zoomen · Klik op een land
          </p>
          {loading ? (
            <div className="map-panel" style={{ minHeight: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="loading-inner">
                <div className="loading-fish">🐟</div>
                <div className="loading-text">Data laden…</div>
              </div>
            </div>
          ) : (
            <GlobeMap
              countryData={countryData}
              maxEvents={maxEvents}
              topoFeatures={topoFeatures}
              onRotateTo={flyToRef}
            />
          )}
        </section>

        {/* Legend */}
        <section className="section">
          <h2 className="section-heading">Legenda</h2>
          <div className="card legend-list">
            <div className="legend-item">
              <span className="legend-pill legend-pill--green">🐟</span>
              <span>uploadedFish — bezoeker heeft een vis gespot en geüpload</span>
            </div>
            <div className="legend-item">
              <span className="legend-pill legend-pill--coral">👋</span>
              <span>dismissedUploading — bezoeker heeft het uploadvenster gesloten</span>
            </div>
            <div className="legend-item">
              <span className="legend-pill legend-pill--muted">·</span>
              <span>Geen data — geen events uit dit land</span>
            </div>
          </div>
        </section>

        {/* Event feed */}
        <section className="section">
          <h2 className="section-heading">Recente events</h2>
          <p className="section-sub">De 50 meest recente events uit de dataset.</p>
          <div className="card">
            <EventFeed allEvents={allEvents} />
          </div>
        </section>

      </div>

      <footer className="page-footer">
        <div className="footer-brand">
          <span className="footer-logo">🐟</span>
          <strong>Visdeurbel</strong>
        </div>
        <p className="footer-tagline">Druk op de Visdeurbel als je een vis ziet</p>
        <p className="footer-copy">© 2026 Visdeurbel · visdeurbel@utrecht.nl</p>
      </footer>
    </>
  );
}