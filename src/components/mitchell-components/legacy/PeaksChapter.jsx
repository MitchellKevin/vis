export default function PeaksChapter() {
  return (
    <section id="ch-peaks" className="chapter" aria-label="Piekdagen">
      <div className="chapter-inner chapter-inner--wide">
        <div className="chapter-text">
          <p className="eyebrow reveal">Piekdagen</p>
          <h2 className="reveal">Eén maand, een paar uitbarstingen.</h2>
          <p className="lede reveal">Bel oproepen komen niet gelijkmatig binnen. Op sommige dagen barst het los.</p>
          <p className="chapter-stat reveal" id="peaksStat" aria-live="polite"></p>
        </div>
        <div className="peaks-stage" id="peaksStage" aria-label="Dagelijkse bel oproepen over de maand"></div>
      </div>
    </section>
  );
}
