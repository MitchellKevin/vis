export default function ShoalChapter() {
  return (
    <section id="ch-shoal" className="chapter" aria-label="Apparaten">
      <div className="chapter-inner">
        <div className="chapter-text">
          <p className="eyebrow reveal">Door welk schermpje?</p>
          <h2 className="reveal">Een school van apparaten.</h2>
          <p className="lede reveal">Waarmee kijk je mee? Van telefoon tot smart-tv — en zelfs rechtstreeks vanuit Instagram en Facebook zwemt het verkeer binnen.</p>
          <p className="shoal-stat reveal" id="shoalStat" aria-live="polite"></p>
        </div>
        <div className="shoal-stage" id="shoalStage" aria-label="Bellen per browser en apparaat"></div>
        <div className="shoal-legend" id="shoalLegend"></div>
      </div>
    </section>
  );
}
