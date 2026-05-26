import { useEffect, useRef } from 'react';
import Nav from '../components/Nav.jsx';
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

      <div className="fish-tooltip" id="fishTooltip" role="status" aria-live="polite"></div>

      <section id="ch-ring" className="chapter" aria-label="Hoofdstuk 8: Ringkalender">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">Ringkalender</p>
            <h2 className="reveal">Elk puntje is een dag.</h2>
            <p className="lede reveal">Elke gloed is een hartslag van de sluis. Hoe groter en lichter, hoe meer vissen er die dag gemeld zijn.</p>
          </div>
          <div className="ring-stage" id="ringStage" aria-label="Cirkelvormige kalender van 365 dagen"></div>
        </div>
      </section>

      <section id="ch-radar" className="chapter" aria-label="Hoofdstuk 9: Visradar">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">Sonar</p>
            <h2 className="reveal">Wat zwemt er onder de sluis?</h2>
            <p className="lede reveal">We zien meer dan je denkt. De radar tikt door en bij elke draai licht weer een soort op.</p>
          </div>
          <div className="radar-stage" id="radarStage" aria-label="Radar met opflitsende vissoorten">
            <div className="radar-detail-panel" id="radarDetail" role="status" aria-live="polite"></div>
          </div>
        </div>
      </section>
    </>
  );
}
