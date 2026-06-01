export default function TideChapter() {
  return (
    <section id="ch-tide" className="chapter chapter--dark" aria-label="24-uurs ritme">
      <div className="chapter-inner">
        <div className="chapter-text">
          <p className="eyebrow reveal">24-uurs getij</p>
          <h2 className="reveal">Het tij van de sluis.</h2>
          <p className="lede reveal">Wanneer drukt de wereld op de knop? Over de hele maand stijgt en daalt het verkeer als een getij.</p>
          <p className="chapter-stat reveal" id="tideStat" aria-live="polite"></p>
        </div>
        <div className="tide-stage" id="tideStage" aria-label="Cirkelvormige 24-uurs klok"></div>
      </div>
    </section>
  );
}
