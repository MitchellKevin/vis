// Floating tooltip that appears next to a hovered country; renders nothing when not visible
export default function MapTooltip({ tooltip }) {
  if (!tooltip.visible) return null;
  return (
    <div className="tooltip visible" style={{ left: tooltip.x, top: tooltip.y }}>
      {/* Country name with flag emoji as the header */}
      <div className="tooltip-name">{tooltip.name}</div>
      <div>
        {(tooltip.rows || []).map((r, i) => (
          <div key={i} className="tt-row">
            {/* Optional colour swatch dot shown for fish/time/OS rows */}
            {r.color && <span className="tt-dot" style={{ background: r.color }} />}
            <span className="tt-label">{r.label}</span>
            <span className="tt-val">{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}