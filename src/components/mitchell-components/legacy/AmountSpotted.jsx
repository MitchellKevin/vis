export default function AmountSpotted(){
    return(
        <section id="ch-fanatics" className="chapter chapter--dark" aria-label="De fanatici">
            <div className="chapter-inner">
            <div className="chapter-text">
                <p className="eyebrow reveal">De fanatici</p>
                <h2 className="reveal">Wie belt het vaakst?</h2>
                <p className="lede reveal">De meeste bezoekers bellen één keer en zwaaien de vis uit. Maar een handjevol blijft maar drukken.</p>
                <p className="chapter-stat reveal" id="fanaticsStat" aria-live="polite"></p>
            </div>
            <div className="fanatics-stage" id="fanaticsStage" aria-label="Bel oproepen per bezoek"></div>
            </div>
      </section> 
    );
}