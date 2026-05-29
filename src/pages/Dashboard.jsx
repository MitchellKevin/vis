import { useEffect, useRef } from 'react';
import Nav from '../components/Nav.jsx';
import { initJoost } from '../scripts/joost.js';
import '../styles/dashboard.css';

export default function Dashboard() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const cleanup = initJoost();
    return cleanup;
  }, []);

  return (
    <>
      <Nav current="dashboard" />

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

      <div className="period-bar">
        <span className="period-label">Periode:</span>
        <div className="period-toggle">
          <button className="period-btn" data-period="week">Deze week</button>
          <button className="period-btn active" data-period="maand">Deze maand</button>
        </div>
        <span className="period-loading" id="period-loading"></span>
      </div>

      <div className="stats-bar">
        <div className="stat-card"><div className="stat-n" id="v-total">—</div><div className="stat-label">Totaal events</div></div>
        <div className="stat-card"><div className="stat-n" id="v-countries">—</div><div className="stat-label">Landen</div></div>
        <div className="stat-card stat-card--green"><div className="stat-n" id="v-upload">—</div><div className="stat-label">Vis gespot 🐟</div></div>
        <div className="stat-card stat-card--coral"><div className="stat-n" id="v-dismiss">—</div><div className="stat-label">Gesloten 👋</div></div>
      </div>

      <div className="main-layout">
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
          <div className="zoom-hint">Slepen om te draaien · Scrollen om te zoomen · Klik op een land in de lijst</div>

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

        <div className="sidebar">
          <div className="sidebar-block">
            <h2 className="sidebar-heading">Per land</h2>
            <div id="country-list"></div>
          </div>
          <div className="sidebar-block sidebar-block--legend">
            <h2 className="sidebar-heading">Legenda</h2>
            <div className="legend-list">
              <div className="legend-item"><span className="legend-pill legend-pill--green">🐟</span><span>uploadedFish</span></div>
              <div className="legend-item"><span className="legend-pill legend-pill--coral">👋</span><span>dismissedUploading</span></div>
              <div className="legend-item"><span className="legend-pill legend-pill--muted">·</span><span>Geen data</span></div>
            </div>
          </div>
          <div className="sidebar-block sidebar-block--feed">
            <h2 className="sidebar-heading">Recente events</h2>
            <div className="event-feed" id="event-feed"></div>
          </div>
        </div>
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
