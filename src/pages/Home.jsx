import { useRef } from 'react';
import { Link } from 'react-router-dom';
import Nav              from '../components/Nav.jsx';
import GlobeMap         from '../components/world-map/GlobeMap.jsx';
import { useStylesheet } from '../hooks/useStylesheet.js';
import useJoostData     from '../components/world-map/useJoostData.js';

// Components
import DayScroll    from '../components/timeline/day-scroll.jsx';
import TableStyled  from '../components/timeline/table-styled.jsx';

export default function Home() {
  useStylesheet('/styles/index.css');
  useStylesheet('/styles/timeline.css');
  useStylesheet('/styles/joost.css');

  const flyToRef = useRef(null);

  const {
    countryData, maxEvents,
    topoFeatures, loading,
  } = useJoostData();

  return (
    <>
      <Nav />
      <header>
        <span className="logo">Visdeurbel</span>
      </header>
      <main>
        <section className="hero">
          <h1>Visualisaties</h1>
          <p>Overzicht van alle visualisatieprojecten voor de Visdeurbel meesterproef.</p>
        </section>
        <section>
          <div className="grid">
            <Link className="card" to="/julius">
              <span className="card__label">Julius</span>
              <h2 className="card__title">Visualisatie Julius</h2>
              <p className="card__desc">Persoonlijk visualisatieproject van Julius.</p>
              <span className="card__link">Bekijken →</span>
            </Link>
            <Link className="card" to="/mitchell">
              <span className="card__label">Mitchell</span>
              <h2 className="card__title">Visualisatie Mitchell</h2>
              <p className="card__desc">Persoonlijk visualisatieproject van Mitchell.</p>
              <span className="card__link">Bekijken →</span>
            </Link>
            <a className="card" href="#timeline">
              <h2 className="card__title">Timeline Visualisatie</h2>
              <p className="card__desc">Visualisaties van hoeveel vissen op welk tijdstip van de dag te zien zijn.</p>
              <span className="card__link">Bekijken ↓</span>
            </a>
          </div>
        </section>

      </main>

      {/* Globe map — outside <main> so index.css max-width doesn't constrain it */}
      {loading ? (
        <div className="map-panel map-panel--loading">
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

      <main>
        <DayScroll />
        <TableStyled />
      </main>
      <footer>
        <div className="footer__inner">
          <p>Visdeurbel — Meesterproef Minor Web 2026</p>
        </div>
      </footer>
    </>
  );
}