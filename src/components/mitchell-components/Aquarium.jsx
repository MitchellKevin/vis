export default function Aquarium() {
    return(
        <section id="ch-aquarium" className="chapter" aria-label="Aquarium">
            <div className="chapter-inner chapter-inner--wide">
            <div className="chapter-text">
                <p className="eyebrow reveal">Kijkglas</p>
                <h2 className="reveal">Dit is hoe <span id="aquariumTotal">…</span> waarnemingen er ongeveer uitzien.</h2>
                <p className="lede reveal">Niet allemaal tegelijk natuurlijk — een steekproef, elk met een eigen koers, tempo en verhaal.</p>
            </div>
            <div className="aquarium-stage" id="aquariumStage" aria-label="Vissen die rondzwemmen"></div>
            <div className="aquarium-filters" id="aquariumFilters" role="group" aria-label="Filter vissoorten"></div>
            <p className="aquarium-tip">Tip — klik in het aquarium om de vissen te laten schrikken.</p>
            </div>
      </section>
    );
}