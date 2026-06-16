import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Nav from "../components/Nav.jsx";
import GlobeMap from "../components/world-map/GlobeMap.jsx";
import { useStylesheet } from "../hooks/useStylesheet.js";
import useJoostData from "../components/world-map/useJoostData.js";

// Components
import DayScroll from "../components/timeline/day-scroll.jsx";
import TableStyled from "../components/timeline/table-styled.jsx";
import Clock from "../components/clock/Clock.jsx";

// Mitchell components
import FishSprite from "../components/mitchell-components/FishSprite.jsx";
import NetChapter from "../components/mitchell-components/NetChapter.jsx";
import DataSwitch from "../components/mitchell-components/DataSwitch.jsx";
import Aquarium from "../components/mitchell-components/Aquarium.jsx";
import DataCarousel from "../components/mitchell-components/DataCarousel.jsx";
import SectionWave from "../components/mitchell-components/SectionWave.jsx";
import LanguagesChapter from "../components/mitchell-components/LanguagesChapter.jsx";
import RadarChapter from "../components/mitchell-components/RadarChapter.jsx";
import { initMitchell } from "../scripts/mitchell.js";

function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(
    localStorage.getItem("a11y-reduce-motion") === "true" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [highContrast, setHighContrast] = useState(
    localStorage.getItem("a11y-high-contrast") === "true",
  );

  useEffect(() => {
    window.__reduceMotion = reduceMotion;
    document.body.classList.toggle("a11y-reduce-motion", reduceMotion);
    localStorage.setItem("a11y-reduce-motion", reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    document.body.classList.toggle("a11y-high-contrast", highContrast);
    localStorage.setItem("a11y-high-contrast", highContrast);
  }, [highContrast]);

  return (
    <div
      className="a11y-menu"
      role="region"
      aria-label="Toegankelijkheidsinstellingen"
    >
      <button
        className="a11y-menu-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="a11y-menu-panel"
        title="Toegankelijkheidsinstellingen"
      >
        ♿
      </button>
      {open && (
        <div className="a11y-menu-panel" id="a11y-menu-panel">
          <h3>Instellingen</h3>
          <label>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
            />{" "}
            Animaties uit
          </label>
          <label>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
            />{" "}
            Hoger contrast
          </label>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  useStylesheet("/styles/index.css");
  useStylesheet("/styles/timeline.css");
  useStylesheet("/styles/joost.css");
  useStylesheet("/styles/mitchell.css");
  useStylesheet("/styles/mitchell-week1.css");
  useStylesheet("/styles/mitchell-carousel.css");
  useStylesheet("/styles/mitchell-sections.css");
  useStylesheet("/styles/a11y-menu.css");
  useStylesheet("/styles/clock.css");

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
      <Nav />
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
        <section>
          <div className="grid">
            <Link className="card" to="/julius">
              <span className="card__label">Julius</span>
              <h2 className="card__title">Visualisatie Julius</h2>
              <p className="card__desc">
                Persoonlijk visualisatieproject van Julius.
              </p>
              <span className="card__link">Bekijken →</span>
            </Link>
            <Link className="card" to="/mitchell">
              <span className="card__label">Mitchell</span>
              <h2 className="card__title">Visualisatie Mitchell</h2>
              <p className="card__desc">
                Persoonlijk visualisatieproject van Mitchell.
              </p>
              <span className="card__link">Bekijken →</span>
            </Link>
            <a className="card" href="#timeline">
              <h2 className="card__title">Timeline Visualisatie</h2>
              <p className="card__desc">
                Visualisaties van hoeveel vissen op welk tijdstip van de dag te
                zien zijn.
              </p>
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

      <main style={{ paddingBlock: 0, maxWidth: "none" }}>
        <DayScroll />
        <TableStyled />
        <Clock />
      </main>

      <FishSprite />
      <DataSwitch />
      <AccessibilityMenu />
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
        <p className="sr-only">
          Dit is een scrollende datavisualisatie over de Visdeurbel. De
          grafieken zijn visueel; bij elke sectie staat de uitleg en staan de
          cijfers in tekst. Gebruik de schakelaar bovenaan om tussen week, maand
          en jaar te wisselen.
        </p>
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

      <footer>
        <div className="footer__inner">
          <p>Visdeurbel — Meesterproef Minor Web 2026</p>
        </div>
      </footer>
    </>
  );
}
