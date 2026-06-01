export default function HeroChapter() {
  return (
    <section id="ch-hero" className="chapter chapter--hero" aria-label="Intro">
      <div className="hero-stage" id="heroStage" aria-hidden="true"></div>
      <div className="hero-overlay">
        <p className="hero-eyebrow">De Visdeurbel in cijfers</p>
        <h1 className="hero-title"><span id="heroCount">0</span></h1>
        <p className="hero-sub">keer ging de bel · <span id="heroPeriod">…</span></p>
        <p className="hero-lede">Duizenden mensen drukken op de knop om een vis door de sluis te helpen. Samen vormen ze één grote vis — scroll en laat ze los.</p>
        <div className="hero-scroll" aria-hidden="true"><span className="hero-scroll-dot"></span>scroll</div>
      </div>
    </section>
  );
}
