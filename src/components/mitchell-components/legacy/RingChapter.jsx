export default function RingChapter() {
  return (
    <section id="ch-ring" className="chapter" aria-label="Ringkalender">
      <div className="chapter-inner">
        <div className="chapter-text">
          <p className="eyebrow reveal">Ringkalender</p>
          <h2 className="reveal">Elke stip is een uur.</h2>
          <p className="lede reveal">Elke gloed is een hartslag van de sluis. Hoe groter en lichter, hoe vaker er dat uur op de knop werd gedrukt.</p>
          <p className="chapter-stat reveal" id="ringSummary" aria-live="polite"></p>
        </div>
        <div className="ring-stage" id="ringStage" aria-label="Cirkelvormige kalender van uren"></div>
      </div>
    </section>
  );
}
