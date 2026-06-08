// Floating legend panel describing the current mode's colour encoding; renders nothing when legend is null
export default function MapLegend({ legend }) {
  if (!legend) return null;
  return (
    <div className="map-legend" style={{ display: 'block' }}>
      <div className="map-legend-title">{legend.title}</div>

      {/* Gradient legend: horizontal colour bar with lo/hi labels (used for continuous scales) */}
      {legend.type === 'gradient' && (
        <>
          <div
            className="map-legend-gradient"
            style={{ background: `linear-gradient(to right, ${legend.from}, ${legend.to})` }}
          />
          <div className="map-legend-gradient-labels">
            <span>{legend.lo}</span>
            <span>{legend.hi}</span>
          </div>
        </>
      )}

      {/* Row legend: colour swatches with labels (used for categorical modes) */}
      {legend.type === 'rows' && legend.rows.map((r, i) => (
        <div key={i} className="map-legend-row">
          <div
            className="map-legend-swatch"
            style={{
              background:   r.color,
              // Shape variants: circle for point markers, thin bar for lines, square by default
              borderRadius: r.circle ? '50%' : r.line ? '2px' : undefined,
              height:       r.line ? '3px' : undefined,
            }}
          />
          {r.label}
        </div>
      ))}
    </div>
  );
}