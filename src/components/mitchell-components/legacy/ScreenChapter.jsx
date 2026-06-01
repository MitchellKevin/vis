export default function ScreenChapter(){
    return(
        <section id="ch-screens" className="chapter chapter--dark" aria-label="Schermen">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">Schermen-aquarium</p>
            <h2 className="reveal">Door wat voor schermpje?</h2>
            <p className="lede reveal">Elk venster is een schermformaat dat naar de sluis tuurt — van staande telefoon tot breed bureaublad.</p>
            <p className="chapter-stat reveal" id="screensStat" aria-live="polite"></p>
          </div>
          <div className="screens-stage" id="screensStage" aria-label="Schermresoluties als vensters"></div>
          <div className="shoal-legend" id="screensLegend"></div>
        </div>
      </section>
    );
}