export default function NetChapter(){
    return(
         <section id="ch-net" className="chapter chapter--dark" aria-label="Het net">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">Het net</p>
            <h2 className="reveal">Als we ze allemaal in één net zouden vangen…</h2>
            <p className="lede reveal">…wie zou er dan het zwaarst uitkomen? Een handvol meervallen weegt op tegen een hele school blankvoorns.</p>
          </div>
          <div className="net-controls-wrap">
            <span className="net-controls-label">Bekijk op</span>
            <div className="net-toggle" role="tablist" aria-label="Verdeling op">
              <button type="button" className="net-toggle-btn" data-stat="count" role="tab" aria-selected="false">Aantal</button>
              <button type="button" className="net-toggle-btn active" data-stat="biomass" role="tab" aria-selected="true">Biomassa</button>
              <button type="button" className="net-toggle-btn" data-stat="weight" role="tab" aria-selected="false">Gewicht / vis</button>
            </div>
          </div>
          <div className="net-stage" id="netStage" aria-label="Bubbel-diagram per soort"></div>
          <div className="net-info" id="netInfo" aria-live="polite">Klik op een bubbel voor details, of wissel hierboven van weergave.</div>
        </div>
      </section>
    );
}