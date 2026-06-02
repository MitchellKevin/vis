export default function EventFeed({ allEvents }) {
  const recent = [...allEvents]
    .filter(e => e.event_name === 'uploadedFish' || e.event_name === 'dismissedUploading')
    .slice(-50)
    .reverse();

  return (
    <div className="event-feed">
      {recent.map((ev, i) => {
        const isUp   = ev.event_name === 'uploadedFish';
        const fish   = ev.referrer_query?.match(/fish=([^&]+)/)?.[1] || '';
        const detail = [
          ev.city,
          ev.country,
          ev.created_at?.slice(11, 16),
          isUp && fish ? decodeURIComponent(fish) : '',
        ].filter(Boolean).join(' · ');

        return (
          <div key={i} className="event-item" style={{ animationDelay: `${i * 25}ms` }}>
            <div className={`event-icon ${isUp ? 'upload' : 'dismiss'}`}>
              {isUp ? '🐟' : '👋'}
            </div>
            <div className="event-meta">
              <div className={`event-type ${isUp ? 'upload' : 'dismiss'}`}>
                {isUp ? 'Vis gespot' : 'Gesloten'}
              </div>
              <div className="event-detail">{detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}