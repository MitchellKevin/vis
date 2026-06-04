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
  const flyToRef    = useRef(null);
  const flatMapRef  = useRef(null);

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

        <div className="page-content">

          <PeriodToggle
            period={period}
            periodLoading={periodLoading}
            onSwitch={switchPeriod}
          />

          <section className="section">
            <StatsBar allEvents={allEvents} countryData={countryData} loaded={statsLoaded} />
          </section>

          <section className="section section--map">
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

          <section className="section">
            <h2 className="section-heading">Kaart</h2>
            <p className="section-sub">Platte weergave — slepen = verschuiven · Scrollen = zoomen</p>
            {loading ? (
              <div className="map-area2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          </section>

        </div>

        <PageFooter />

      </div>
    </>
  );
}