let scrollOffset = 0;
const HOURS = 24;

let hourData = [];

const bars = document.getElementById('bars');

document.getElementById('scroll-left')
  .addEventListener('click', () => {

    scrollOffset = (scrollOffset - 1 + HOURS) % HOURS;
    render(hourData);
});

document.getElementById('scroll-right')
  .addEventListener('click', () => {

    scrollOffset = (scrollOffset + 1) % HOURS;
    render(hourData);
});


// Data ophalen uit het JSON-bestand
async function loadData() {
    const response = await fetch('../json/event-maand.json');
    const text = await response.text();

    // Elke regel is een los JSON-object
    const events = text
        .trim()
        .split('\n')
        .map(line => JSON.parse(line));

    return events;
}

// Tel hoeveel vissen er per uur zijn
function countPerHour(events) {
  const hours = Array.from({ length: 24 }, () => ({
    total: 0,
    days: new Set(),
    fishCounts: new Map(),
    average: 0,
    topFish: null
  }));

  events.forEach(event => {
    if (event.event_name !== 'uploadedFish') return;

    const [date, time] = event.created_at.split(' ');
    const hour = parseInt(time.slice(0, 2), 10);

    hours[hour].total++;
    hours[hour].days.add(date);

    const fish = event.referrer_query.match(/fish=([^&]+)/)?.[1];

    if (!fish || fish === 'unknown' || fish === 'onbekend') return;

    hours[hour].fishCounts.set(fish, (hours[hour].fishCounts.get(fish) || 0) + 1);
  });

  hours.forEach(hour => {
    const dayCount = hour.days.size || 1;
    hour.average = hour.total / dayCount;

    let topFish = null;
    let topCount = 0;

    for (const [fish, count] of hour.fishCounts) {
      if (count > topCount) {
        topCount = count;
        topFish = fish;
      }
    }

    hour.topFish = topFish;
  });

  return hours;
}

// Maak de grafiek zichtbaar in de HTML
function render(hourData) {
  const barsEl = document.getElementById('bars');
  const maxFish = Math.max(...hourData.map(hour => hour.average), 1);
  const fragment = document.createDocumentFragment();

  barsEl.innerHTML = '';

  hourData.forEach((_, i) => {
    const hour = (i + scrollOffset) % HOURS;
    const hourInfo = hourData[hour];
    const height = Math.round((hourInfo.average / maxFish) * 240);

    const col = document.createElement('div');
    col.className = 'bar-col';

    const fishUrl = hourInfo.topFish
    ? `./images/${encodeURIComponent(hourInfo.topFish.toLowerCase())}.png`
    : '';

    col.innerHTML = `
      ${hourInfo.average > 0 ? `<span class="bar-count">${String(hour).padStart(2, '0')}:00</span>` : ''}
        <div class="bar-fill" style="height: ${height}px; ${fishUrl ? `background-image: url('${fishUrl}');` : ''}"></div>
      <div class="tooltip">
        Gemiddeld ${hourInfo.average.toFixed()} vissen gespot om ${String(hour).padStart(2, '0')}:00, de ${hourInfo.topFish} was de meest gevonden vis dit uur.
      </div>
    `;

    fragment.appendChild(col);
  });

  barsEl.appendChild(fragment);
}

// Alles starten
loadData()
    .then(events => {
        hourData = countPerHour(events);
        render(hourData);
    })
    .catch(err => {
        console.error('Kon data niet laden:', err);
    });