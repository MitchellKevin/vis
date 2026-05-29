import { useEffect, useRef } from 'react';
import Nav from '../components/Nav.jsx';
import '../styles/nienke.css';

async function loadData() {
  const response = await fetch('/json/event-maand.json');
  const text = await response.text();
  return text.trim().split('\n').map(line => JSON.parse(line));
}

function countPerHour(events) {
  const hours = Array.from({ length: 24 }, () => ({ fish: 0 }));
  events.forEach(event => {
    const hour = parseInt(event.created_at.split(' ')[1].split(':')[0]);
    if (event.event_name === 'uploadedFish') hours[hour].fish++;
  });
  return hours;
}

export default function Nienke() {
  const barsRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    loadData()
      .then(events => {
        const hourData = countPerHour(events);
        const barsEl = barsRef.current;
        if (!barsEl) return;
        const maxFish = Math.max(...hourData.map(h => h.fish), 1);
        barsEl.innerHTML = '';
        hourData.forEach((hourInfo, hour) => {
          const height = Math.round((hourInfo.fish / maxFish) * 240);
          const col = document.createElement('div');
          col.className = 'bar-col';
          col.innerHTML = `
            ${hourInfo.fish > 0 ? `<span class="bar-count">${String(hour).padStart(2, '0')}:00</span>` : ''}
            <div class="bar-fill" style="height: ${height}px;"></div>
            <div class="tooltip">
              ${String(hour).padStart(2, '0')}:00,
              ${hourInfo.fish} vis${hourInfo.fish !== 1 ? 'sen' : ''}
            </div>`;
          barsEl.appendChild(col);
        });
      })
      .catch(err => console.error('Kon data niet laden:', err));
  }, []);

  return (
    <>
      <Nav current="nienke" />
      <main>
        <h2>Tijdlijn</h2>
        <p>Hoe laat op de dag heb je de meeste kans op een vis?</p>
        <p>Aantal gespotte vissen per uur per maand</p>
        <div className="timeline-container">
          <div className="bars" id="bars" ref={barsRef}></div>
        </div>
      </main>
    </>
  );
}
