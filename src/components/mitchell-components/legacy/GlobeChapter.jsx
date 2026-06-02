export default function GlobeChapter() {
  return (
    <section id="ch-globe" className="chapter chapter--dark" aria-label="Draaiende globe">
      <div className="chapter-inner">
        <div className="chapter-text">
          <p className="eyebrow reveal">De avond reist</p>
          <h2 className="reveal">De bel volgt de schemering.</h2>
          <p className="lede reveal">Het drukste uur is overal hetzelfde lokale moment. Kijk hoe de avondpiek met de draaiing van de aarde de wereld rondreist.</p>
        </div>
        <div className="globe-stage" id="globeStage" aria-label="Draaiende wereldbol met bel oproepen"></div>
      </div>
    </section>
  );
}
