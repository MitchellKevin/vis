import { useRef, useEffect } from "react";
import GlobeMap from "../components/world-map/GlobeMap.jsx";
import { useStylesheet } from "../hooks/useStylesheet.js";
import useJoostData from "../components/world-map/useJoostData.js";
import DayScroll from "../components/timeline/day-scroll.jsx";
import Clock from "../components/clock/Clock.jsx";
import FishSprite from "../components/mitchell-components/FishSprite.jsx";
import NetChapter from "../components/mitchell-components/NetChapter.jsx";
import DataSwitch from "../components/mitchell-components/DataSwitch.jsx";
import Aquarium from "../components/mitchell-components/Aquarium.jsx";
import DataCarousel from "../components/mitchell-components/DataCarousel.jsx";
import SectionWave from "../components/mitchell-components/SectionWave.jsx";
import LanguagesChapter from "../components/mitchell-components/LanguagesChapter.jsx";
import RadarChapter from "../components/mitchell-components/RadarChapter.jsx";
import Footer from "../components/footer/Footer.jsx";
import { initMitchell } from "../scripts/mitchell.js";

export default function Home() {
  useStylesheet("/styles/index.css");
  useStylesheet("/styles/timeline.css");
  useStylesheet("/styles/joost.css");
  useStylesheet("/styles/mitchell.css");
  useStylesheet("/styles/mitchell-week1.css");
  useStylesheet("/styles/mitchell-carousel.css");
  useStylesheet("/styles/mitchell-sections.css");
  useStylesheet("/styles/clock.css");
  useStylesheet("/styles/footer.css");

  const flyToRef = useRef(null);

  useEffect(() => {
    document.body.classList.add("mitchell-page");
    return () => document.body.classList.remove("mitchell-page");
  }, []);

  useEffect(() => {
    const cleanup = initMitchell();
    return cleanup;
  }, []);

  const { countryData, maxEvents, topoFeatures, loading } = useJoostData();

  return (
    <>
      <header>
        <span className="logo">Visdeurbel</span>
      </header>

      <main>
        <section className="hero">
          <h1>Visualisaties</h1>
          <p>
            Overzicht van alle visualisatieprojecten voor de Visdeurbel
            meesterproef.
          </p>
        </section>
      </main>

      <SectionWave
        top="var(--color-off-white)"
        bottom="var(--color-gold-light)"
      />

      <FishSprite />
      <DataSwitch />
      <div
        className="fish-tooltip"
        id="fishTooltip"
        role="status"
        aria-live="polite"
      ></div>
      <main
        id="mitchell-main"
        aria-label="Datavisualisatie over de Visdeurbel, door Mitchell"
        style={{ paddingBlock: 0, maxWidth: "none" }}
      >
        <DataCarousel />
        <SectionWave
          top="var(--color-gold-light)"
          bottom="var(--color-gold-light)"
        />
        <Aquarium />
        <SectionWave
          top="var(--color-gold-light)"
          bottom="var(--color-off-white)"
        />
        <RadarChapter />
        <SectionWave
          top="var(--color-off-white)"
          bottom="var(--color-purple)"
        />
        <LanguagesChapter />
        <SectionWave
          top="var(--color-purple)"
          bottom="var(--color-gold-light)"
        />
        <NetChapter />
      </main>

      <SectionWave
        top="var(--color-gold-light)"
        bottom="var(--color-off-white)"
      />

      <DayScroll />

      <Clock />

      <SectionWave
        top="var(--color-off-white)"
        bottom="var(--color-gold-light)"
      />

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

      <SectionWave
        top="var(--color-gold-light)"
        bottom="var(--color-purple)"
      />

      <Footer />
    </>
  );
}
