export default function WorldChapter() {
  return (
    <section id="ch-world" className="chapter" aria-label="Wereldkaart">
      <div className="chapter-inner chapter-inner--wide">
        <div className="chapter-text">
          <p className="eyebrow reveal">Wereldkaart</p>
          <h2 className="reveal">De hele wereld belt aan.</h2>
          <p className="lede reveal">Eén Utrechtse sluis, <strong id="worldCountryCount">159</strong> landen die meekijken. Van Polen tot de Filipijnen drukt iedereen mee op de knop.</p>
          <p className="world-stat reveal" id="worldStat" aria-live="polite"></p>
        </div>
        <div className="world-stage" id="worldStage" aria-label="Wereldkaart met bel oproepen per land"></div>
      </div>
    </section>
  );
}
