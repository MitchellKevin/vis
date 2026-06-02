export default function FunnelChapter(){
    return(
        <section id="ch-funnel" className="chapter" aria-label="De belstroom">
            <div className="chapter-inner">
            <div className="chapter-text">
                <p className="eyebrow reveal">De belstroom</p>
                <h2 className="reveal">Aanbellen of toch afhaken?</h2>
                <p className="lede reveal">Niet elke gespotte vis wordt gemeld. Voor elke vijf keer dat iemand twijfelt en wegklikt, gaat er één keer écht de bel.</p>
            </div>
            <div className="funnel-stage" id="funnelStage" aria-label="Stroomdiagram van meldingen naar bel oproepen"></div>
            <div className="funnel-legend" id="funnelLegend"></div>
            </div>
        </section>
    );
}