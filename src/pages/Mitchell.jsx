import { useEffect, useRef, useState } from 'react';
import Nav from '../components/Nav.jsx';
import { useStylesheet } from '../hooks/useStylesheet.js';
import FishSprite from '../components/mitchell-components/FishSprite.jsx';
import NetChapter from '../components/mitchell-components/NetChapter.jsx';
import DataSwitch from '../components/mitchell-components/DataSwitch.jsx';
import Aquarium from '../components/mitchell-components/Aquarium.jsx';
import HeroChapter from '../components/mitchell-components/HeroChapter.jsx';
import DataCarousel from '../components/mitchell-components/DataCarousel.jsx';
import SectionWave from '../components/mitchell-components/SectionWave.jsx';
import RingChapter from '../components/mitchell-components/RingChapter.jsx';
import WorldChapter from '../components/mitchell-components/WorldChapter.jsx';
import LanguagesChapter from '../components/mitchell-components/LanguagesChapter.jsx';
import RadarChapter from '../components/mitchell-components/RadarChapter.jsx';
import { initMitchell } from '../scripts/mitchell.js';

function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(
    localStorage.getItem('a11y-reduce-motion') === 'true' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [highContrast, setHighContrast] = useState(
    localStorage.getItem('a11y-high-contrast') === 'true'
  );

  useEffect(() => {
    window.__reduceMotion = reduceMotion;
    document.body.classList.toggle('a11y-reduce-motion', reduceMotion);
    localStorage.setItem('a11y-reduce-motion', reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    document.body.classList.toggle('a11y-high-contrast', highContrast);
    localStorage.setItem('a11y-high-contrast', highContrast);
  }, [highContrast]);

  return (
    <div className="a11y-menu" role="region" aria-label="Toegankelijkheidsinstellingen">
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
            />
            {' '}Animaties uit
          </label>
          <label>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
            />
            {' '}Hoger contrast
          </label>
        </div>
      )}
    </div>
  );
}

export default function Mitchell() {
  const initialized = useRef(false);
  useStylesheet('/styles/mitchell.css');
  useStylesheet('/styles/mitchell-week1.css');
  useStylesheet('/styles/mitchell-carousel.css');
  useStylesheet('/styles/mitchell-sections.css');
  useStylesheet('/styles/a11y-menu.css');

  useEffect(() => {
    document.body.classList.add('mitchell-page');
    return () => document.body.classList.remove('mitchell-page');
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const cleanup = initMitchell();
    return cleanup;
  }, []);

  return (
    <>
      {/* Sla de navigatie over en spring direct naar de inhoud (alleen
          zichtbaar zodra hij toetsenbord-focus krijgt). */}
      <a className="sr-skip" href="#mitchell-main">Direct naar de inhoud</a>
      <Nav current="mitchell" />
      {/* Decoratief: vis-symbolen en het meescrollende visje — voor SR verborgen. */}
      <FishSprite />
      <DataSwitch />
      <AccessibilityMenu />
      <div className="fish-tooltip" id="fishTooltip" role="status" aria-live="polite"></div>
      <main id="mitchell-main" aria-label="Datavisualisatie over de Visdeurbel, door Mitchell">
        {/* Korte uitleg voor schermlezers: de grafieken zijn visueel, maar de
            cijfers en conclusies staan als tekst bij elke sectie. */}
        <p className="sr-only">
          Dit is een scrollende datavisualisatie over de Visdeurbel. De grafieken
          zijn visueel; bij elke sectie staat de uitleg en staan de cijfers in
          tekst. Gebruik de schakelaar bovenaan om tussen week, maand en jaar te
          wisselen.
        </p>
        <HeroChapter />
        <SectionWave top="var(--color-purple)" bottom="var(--color-gold-light)" />
        <DataCarousel />
        <SectionWave top="var(--color-gold-light)" bottom="var(--color-off-white)" />
        <RingChapter />
        <SectionWave top="var(--color-off-white)" bottom="var(--color-purple)" />
        <WorldChapter />
        <SectionWave top="var(--color-purple)" bottom="var(--color-gold-light)" />
        <Aquarium />
        <SectionWave top="var(--color-gold-light)" bottom="var(--color-off-white)" />
        <RadarChapter />
        <SectionWave top="var(--color-off-white)" bottom="var(--color-purple)" />
        <LanguagesChapter />
        <SectionWave top="var(--color-purple)" bottom="var(--color-gold-light)" />
        <NetChapter />
      </main>
    </>
  );
}
