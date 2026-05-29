const timelineContainers = document.querySelectorAll('.timeline-container');

timelineContainers.forEach((container, index) => {
  let scrollOffset = 0;
  const HOURS = 24;
  let hourData = [];

  // Zoek elementen binnen deze specifieke container
  const bars = container.querySelector('.bars');
  const scrollLeft = container.querySelector('.scroll-left');
  const scrollRight = container.querySelector('.scroll-right');

  // Data ophalen uit het JSON-bestand
  async function loadData() {
    const response = await fetch('../json/event-maand.json');
    const text = await response.text();
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
    const barsEl = bars; // gebruik de bars uit de closure
    const timelineContainer = container; // gebruik de container uit de closure
    const scale = 30;
    const maxFish = Math.max(...hourData.map(hour => hour.average), 1);
    const fragment = document.createDocumentFragment();

    // Legenda
    let legend = timelineContainer.querySelector('.legend');
    legend.innerHTML = `
      <img src="../images/snoek.png" alt="">
      <p> = ${scale} vissen</p>
    `;

    barsEl.innerHTML = '';

    hourData.forEach((_, i) => {
      const hour = (i + scrollOffset) % HOURS;
      const hourInfo = hourData[hour];
      const height = Math.round((hourInfo.average / maxFish) * 240);

      const fishCount = Math.ceil(hourInfo.average / scale);
      const fishUrl = hourInfo.topFish
        ? `./images/${encodeURIComponent(hourInfo.topFish.toLowerCase())}.png`
        : '';

      const fishEls = fishCount > 0 && fishUrl
        ? Array.from({ length: fishCount })
          .map(() => `<img src="${fishUrl}" alt="${hourInfo.topFish}">`)
          .join('')
        : '';

      const col = document.createElement('div');
      col.className = 'bar-col';

      col.innerHTML = `
        ${hourInfo.average > 0 ? `<span class="bar-count">${String(hour).padStart(2, '0')}:00</span>` : ''}
        <div class="bar-fill" style="height: ${height}px;">
          ${fishEls}
        </div>
        <div class="tooltip">
          Gemiddeld ${hourInfo.average.toFixed()} vissen gespot om ${String(hour).padStart(2, '0')}:00, de ${hourInfo.topFish ?? 'onbekende'} was de meest gevonden vis dit uur.
        </div>
      `;

      fragment.appendChild(col);
    });

    barsEl.appendChild(fragment);
  }

  // Event listeners
  scrollLeft.addEventListener('click', () => {
    scrollOffset = (scrollOffset - 1 + HOURS) % HOURS;
    render(hourData);
  });

  scrollRight.addEventListener('click', () => {
    scrollOffset = (scrollOffset + 1) % HOURS;
    render(hourData);
  });

  // Alles starten voor deze container
  loadData()
    .then(events => {
      hourData = countPerHour(events);
      render(hourData);
    })
    .catch(err => {
      console.error(`Kon data niet laden voor tijdlijn ${index + 1}:`, err);
    });
});



// MARK: Table toegankelijkheid

