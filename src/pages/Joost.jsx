import { useRef } from 'react';
import Nav              from '../components/Nav.jsx';
import StatsBar         from '../components/world-map/StatsBar.jsx';
import GlobeMap         from '../components/world-map/GlobeMap.jsx';
import PageHeader       from '../components/world-map/PageHeader.jsx';
import PeriodToggle     from '../components/world-map/PeriodToggle.jsx';
import PageFooter       from '../components/world-map/PageFooter.jsx';
import { useStylesheet } from '../hooks/useStylesheet.js';
import useJoostData     from '../components/world-map/useJoostData.js';

export default function Joost() {
  useStylesheet('/styles/joost.css');
  const flyToRef   = useRef(null);
  const flatMapRef = useRef(null);

  const {
    period, allEvents, countryData, maxEvents,
    topoFeatures, loading, periodLoading, statsLoaded,
    switchPeriod,
  } = useJoostData();

  return (
    <>
      <Nav current="joost" />
      <div className="joost-page">

        <PageHeader />

        {/* Constrained content: period toggle + stats */}
        <div className="page-content">
          <PeriodToggle
            period={period}
            periodLoading={periodLoading}
            onSwitch={switchPeriod}
          />
          <section className="section">
            <StatsBar allEvents={allEvents} countryData={countryData} loaded={statsLoaded} />
          </section>
        </div>

        {/* Globe map — lives outside page-content so it naturally fills full width */}
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
            containerClass="map-panel map-panel--fullbleed"
          />
        )}

        {/* Constrained content: flat map heading */}
        <div className="page-content page-content--tight">
          <section className="section">
            <h2 className="section-heading">Kaart</h2>
            <p className="section-sub">Platte weergave — slepen = verschuiven · Scrollen = zoomen</p>
          </section>
        </div>

        {/* Flat map — also outside page-content for full width */}
        {loading ? (
          <div className="map-area2 map-panel--loading">
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
            onRotateTo={flatMapRef}
            defaultProjection="map"
            containerClass="map-area2"
          />
        )}

        <PageFooter />

      </div>
    </>
  );
}