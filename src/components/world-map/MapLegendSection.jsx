export default function MapLegendSection() {
  return (
    <section className="section">
      <h2 className="section-heading">Legenda</h2>
      <div className="card legend-list">
        <div className="legend-item">
          <span className="legend-pill legend-pill--green">🐟</span>
          <span>uploadedFish — bezoeker heeft een vis gespot en geüpload</span>
        </div>
        <div className="legend-item">
          <span className="legend-pill legend-pill--coral">👋</span>
          <span>dismissedUploading — bezoeker heeft het uploadvenster gesloten</span>
        </div>
        <div className="legend-item">
          <span className="legend-pill legend-pill--muted">·</span>
          <span>Geen data — geen events uit dit land</span>
        </div>
      </div>
    </section>
  );
}
