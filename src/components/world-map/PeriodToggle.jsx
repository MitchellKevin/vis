export default function PeriodToggle({ period, periodLoading, onSwitch }) {
  return (
    <div className="period-bar">
      <span className="period-label">Periode:</span>
      <div className="period-toggle">
        <button
          className={`period-btn${period === 'week' ? ' active' : ''}`}
          onClick={() => onSwitch('week')}
        >
          Deze week
        </button>
        <button
          className={`period-btn${period === 'maand' ? ' active' : ''}`}
          onClick={() => onSwitch('maand')}
        >
          Deze maand
        </button>
      </div>
      <span className={`period-loading${periodLoading ? ' visible' : ''}`}>Laden…</span>
    </div>
  );
}
