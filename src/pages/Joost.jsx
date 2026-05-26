import { useEffect, useRef } from 'react';
import Nav from '../components/Nav.jsx';
import { initJoost } from '../scripts/joost.js';
import '../styles/joost.css';

export default function Joost() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const cleanup = initJoost();
    return cleanup;
  }, []);

  return (
    <>
      <Nav current="joost" />

      <nav className="navbar">
        <div className="nav-brand">
          <span className="nav-logo">🐟</span>
          <span className="nav-name">Visdeurbel</span>
        </div>
        <div className="nav-links">
          <a href="#">Over</a>
          <a href="#">Waarom</a>
          <a href="#">De vissen</a>
          <a href="#">Community</a>
          <a href="#">FAQ</a>
          <a href="#" className="nav-lang">English</a>
        </div>
      </nav>

      <header className="page-header">
        <div className="header-inner">
          <p className="header-eyebrow">Wereldwijd data</p>
          <h1>Waar kijken de <em>viskijkers</em> mee?</h1>
          <p className="header-sub">Bezoekersdata van visdeurbel.nl — per land, per gebeurtenis, per maand.</p>
        </div>
        <div className="header-fish-deco" aria-hidden="true">🐠🐡🐟</div>
      </header>

      <div className="page-content">
        <div className="period-bar">
          <span className="period-label">Periode:</span>
          <div className="period-toggle">
            <button className="period-btn" data-period="week">Deze week</button>
            <button className="period-btn active" data-period="maand">Deze maand</button>
          </div>
          <span className="period-loading" id="period-loading"></span>
        </div>

        <section className="section">
          <div className="stats-bar">
            <div className="stat-card"><div className="stat-n" id="v-total">—</div><div className="stat-label">Totaal events</div></div>
            <div className="stat-card"><div className="stat-n" id="v-countries">—</div><div className="stat-label">Landen</div></div>
            <div className="stat-card stat-card--green"><div className="stat-n" id="v-upload">—</div><div className="stat-label">Vis gespot 🐟</div></div>
            <div className="stat-card stat-card--coral"><div className="stat-n" id="v-dismiss">—</div><div className="stat-label">Gesloten 👋</div></div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-heading">Wereldbol</h2>
          <p className="section-sub">Slepen om te draaien · Scrollen om te zoomen · Klik op een land om naar toe te vliegen</p>
          <div className="map-panel">
            <div className="map-tabs">
              <button className="map-tab active" data-mode="choropleth">Bezoeken</button>
              <button className="map-tab" data-mode="bubble">Bellen</button>
              <button className="map-tab" data-mode="uploadrate">Upload %</button>
              <button className="map-tab" data-mode="pies">Taarten</button>
              <button className="map-tab" data-mode="flows">Lijnen</button>
              <button className="map-tab" data-mode="device">Apparaat</button>
              <button className="map-tab" data-mode="fish">Vis soort</button>
              <button className="map-tab" data-mode="time">Tijdstip</button>
              <button className="map-tab" data-mode="os">OS</button>
              <button className="map-tab" data-mode="browser">Browser</button>
              <button className="map-tab map-tab--reset" id="zoom-reset">⊙ Reset</button>
            </div>

            <svg id="map-svg" viewBox="0 0 370 340" preserveAspectRatio="xMidYMid meet">
              <defs></defs>
              <g id="graticule-g"></g>
              <g id="countries-g"></g>
              <g id="overlays-g"></g>
            </svg>

            <div className="tooltip" id="tooltip">
              <div className="tooltip-name" id="tt-name">—</div>
              <div id="tt-body"></div>
            </div>

            <div id="map-legend" className="map-legend" style={{ display: 'none' }}></div>

            <div id="loading-overlay" className="loading-overlay">
              <div className="loading-inner">
                <div className="loading-fish">🐟</div>
                <div className="loading-text">Data laden…</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-heading">Per land</h2>
          <p className="section-sub">Top 20 landen gesorteerd op totaal aantal events. Klik op een land om de bol te draaien.</p>
          <div className="card">
            <div id="country-list"></div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-heading">Legenda</h2>
          <div className="card legend-list">
            <div className="legend-item"><span className="legend-pill legend-pill--green">🐟</span><span>uploadedFish — bezoeker heeft een vis gespot en geüpload</span></div>
            <div className="legend-item"><span className="legend-pill legend-pill--coral">👋</span><span>dismissedUploading — bezoeker heeft het uploadvenster gesloten</span></div>
            <div className="legend-item"><span className="legend-pill legend-pill--muted">·</span><span>Geen data — geen events uit dit land</span></div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-heading">Recente events</h2>
          <p className="section-sub">De 50 meest recente events uit de dataset.</p>
          <div className="card">
            <div className="event-feed" id="event-feed"></div>
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
