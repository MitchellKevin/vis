import { useEffect, useRef } from 'react';
import Nav from '../components/Nav.jsx';
import FishSprite from '../components/mitchell-components/FishSprite.jsx';
import NetChapter from '../components/mitchell-components/NetChapter.jsx';
import DataSwitch from '../components/mitchell-components/DataSwitch.jsx';
import Aquarium from '../components/mitchell-components/Aquarium.jsx';
import HeroChapter from '../components/mitchell-components/HeroChapter.jsx';
import RingChapter from '../components/mitchell-components/RingChapter.jsx';
import WorldChapter from '../components/mitchell-components/WorldChapter.jsx';
import LanguagesChapter from '../components/mitchell-components/LanguagesChapter.jsx';
import RadarChapter from '../components/mitchell-components/RadarChapter.jsx';
import { initMitchell } from '../scripts/mitchell.js';
import '../styles/mitchell.css';
import '../styles/mitchell-week1.css';

export default function Mitchell() {
  const initialized = useRef(false);

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
      <Nav current="mitchell" />
      <FishSprite />
      <DataSwitch />
      <div className="fish-tooltip" id="fishTooltip" role="status" aria-live="polite"></div>
      <HeroChapter />
      <RingChapter />
      <WorldChapter />
      <Aquarium />
      <RadarChapter />
      <LanguagesChapter />
      <NetChapter />
    </>
  );
}
