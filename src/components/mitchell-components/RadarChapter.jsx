export default function RadarChapter() {
  return (
    <section id="ch-radar" className="chapter chapter--dark" aria-label="Visradar">
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
  );
}
