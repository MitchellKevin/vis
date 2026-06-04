export default function StatsBar({ allEvents, countryData, loaded }) {
  const total     = allEvents.length;
  const countries = Object.keys(countryData).length;
  const uploaded  = allEvents.filter(e => e.event_name === 'uploadedFish').length;
  const dismissed = allEvents.filter(e => e.event_name === 'dismissedUploading').length;

  return (
    <div className="stats-bar">
      <div className={`stat-card${loaded ? ' loaded' : ''}`}>
        <div className="stat-n">{total.toLocaleString('nl-NL')}</div>
        <div className="stat-label">Totaal events</div>
      </div>
      <div className={`stat-card${loaded ? ' loaded' : ''}`} style={{ animationDelay: '150ms' }}>
        <div className="stat-n">{countries.toLocaleString('nl-NL')}</div>
        <div className="stat-label">Landen</div>
      </div>
      <div className={`stat-card stat-card--green${loaded ? ' loaded' : ''}`} style={{ animationDelay: '300ms' }}>
        <div className="stat-n">{uploaded.toLocaleString('nl-NL')}</div>
        <div className="stat-label">Vis gespot 🐟</div>
      </div>
      <div className={`stat-card stat-card--coral${loaded ? ' loaded' : ''}`} style={{ animationDelay: '450ms' }}>
        <div className="stat-n">{dismissed.toLocaleString('nl-NL')}</div>
        <div className="stat-label">Gesloten 👋</div>
      </div>
    </div>
  );
}