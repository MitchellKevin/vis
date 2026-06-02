import { useEffect, useRef } from 'react';
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

export default function Mitchell() {
  const initialized = useRef(false);
  useStylesheet('/styles/mitchell.css');
  useStylesheet('/styles/mitchell-week1.css');
  useStylesheet('/styles/mitchell-carousel.css');
  useStylesheet('/styles/mitchell-sections.css');

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
