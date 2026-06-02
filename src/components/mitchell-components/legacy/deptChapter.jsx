export default function DepthChapter(){
    return(
       <section id="ch-depth" className="chapter chapter--dark" aria-label="Dieptewereld">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">Onder het oppervlak</p>
            <h2 className="reveal">Elke soort op zijn eigen diepte.</h2>
            <p className="lede reveal">Sommige vissen scheren langs het oppervlak, andere kruipen over de bodem. Beweeg over een vis en hij licht op in het donker.</p>
          </div>
          <div className="depth-stage" id="depthStage" aria-label="Vissoorten op hun waterdiepte">
            <div className="depth-detail" id="depthDetail" role="status" aria-live="polite"></div>
          </div>
        </div>
      </section>
    );
}
