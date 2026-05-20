async function loadData() {
    const response = await fetch('../json/event-maand.json');
    const lines = await response.text();

    const events = lines
        .trim()
        .split('\n')
        .map(line => JSON.parse(line));

    return events;
}

function countPerHour(events) {
    const hours = Array(24).fill(0).map(() => ({ total: 0, fish: 0 }));

    events.forEach(e => {
        const hour = parseInt(e.created_at.split(' ')[1].split(':')[0]);
        hours[hour].total++;
        if (e.event_name === 'uploadedFish') {
            hours[hour].fish++;
        }
    });

    return hours;
}

function render(hourData) {
    const maxTotal = Math.max(...hourData.map(h => h.total), 1);
    const barsEl = document.getElementById('bars');
    const xaxisEl = document.getElementById('xaxis');

    barsEl.innerHTML = '';
    xaxisEl.innerHTML = '';

    hourData.forEach((data, hour) => {
        const pct = data.total / maxTotal;
        const barHeight = Math.round(pct * 240);

        const col = document.createElement('div');
        col.className = 'bar-col';

        const fishEmojis = Array(data.fish).fill('🐟').join('');
        const barColor = data.fish > 0 ? '#0F6E56' : '#9FE1CB';

        col.innerHTML = `
            ${data.total > 0 ? `<span class="bar-count">${data.total}</span>` : ''}
            <div class="bar-fill" style="height: ${barHeight}px; background: ${barColor};">
                ${data.fish > 0 ? `<div class="fish-row">${fishEmojis}</div>` : ''}
            </div>
            <div class="tooltip">
                ${String(hour).padStart(2, '0')}:00
                — ${data.total} bezoeker${data.total !== 1 ? 's' : ''}
                ${data.fish > 0 ? `· ${data.fish} vis${data.fish !== 1 ? 'sen' : ''}` : ''}
            </div>
        `;

        barsEl.appendChild(col);

        const label = document.createElement('div');
        label.className = 'x-label';
        label.textContent = hour % 3 === 0 ? String(hour).padStart(2, '0') : '';
        xaxisEl.appendChild(label);
    });
}

loadData()
    .then(events => {
        const hourData = countPerHour(events);
        render(hourData);
    })
    .catch(err => {
        console.error('Kon data niet laden:', err);
    });