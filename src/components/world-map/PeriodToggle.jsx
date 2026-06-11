// Two-button toggle for switching between "Deze week" and "Deze maand" with a loading indicator
export default function PeriodToggle({ period, periodLoading, onSwitch }) {
  return (
    <div className="period-bar">
      <span className="period-label">Periode:</span>
      <div className="period-toggle">
        {/* Active button gets the .active modifier for highlight styling */}
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
      {/* Loading label fades in via .visible while a period fetch is in flight */}
      <span className={`period-loading${periodLoading ? ' visible' : ''}`}>Laden…</span>
    </div>
  );
}