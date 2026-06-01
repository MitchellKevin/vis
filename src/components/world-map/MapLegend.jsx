export default function MapLegend({ legend }) {
  if (!legend) return null;
  return (
    <div className="map-legend" style={{ display: 'block' }}>
      <div className="map-legend-title">{legend.title}</div>

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

      {legend.type === 'rows' && legend.rows.map((r, i) => (
        <div key={i} className="map-legend-row">
          <div
            className="map-legend-swatch"
            style={{
              background:   r.color,
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
