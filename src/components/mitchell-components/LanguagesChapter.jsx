export default function LanguagesChapter() {
  return (
    <section id="ch-languages" className="chapter" aria-label="Talen">
      <div className="chapter-inner chapter-split">
        <div className="chapter-text">
          <p className="eyebrow reveal">Het koor van talen</p>
          <h2 className="reveal">Hallo, Cześć, 你好.</h2>
          <p className="lede reveal">De sluis spreekt vele talen tegelijk. Elk woord is een groet, zo groot als het aantal bezoekers dat zo binnenkwam.</p>
          <p className="chapter-stat reveal" id="langStat" aria-live="polite"></p>
        </div>
        <div className="chapter-viz">
          <div className="lang-stage" id="langStage" aria-label="Drijvende begroetingen per taal"></div>
        </div>
      </div>
    </section>
  );
}
