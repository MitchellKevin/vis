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
    // Voor elk uur bewaren we alleen het aantal vissen
    const hours = Array.from({ length: 24 }, () => ({
        fish: 0
    }));

    events.forEach(event => {
        // Haal het uur uit de datum/tijd
        const hour = parseInt(event.created_at.split(' ')[1].split(':')[0]);

        // Tel alleen vissen mee
        if (event.event_name === 'uploadedFish') {
            hours[hour].fish++;
        }
    });

    return hours;
}

// Maak de grafiek zichtbaar in de HTML
function render(hourData) {
    const barsEl = document.getElementById('bars');
    const maxFish = Math.max(...hourData.map(hour => hour.fish), 1);

    // Eerst alles leegmaken
    barsEl.innerHTML = '';

    hourData.forEach((hourInfo, hour) => {
        // Bereken de hoogte van de staaf
        const height = Math.round((hourInfo.fish / maxFish) * 240);

        // Maak een nieuw element voor deze kolom
        const col = document.createElement('div');
        col.className = 'bar-col';

        // Zet de HTML in de kolom
        col.innerHTML = `
            ${hourInfo.fish > 0 ? `<span class="bar-count">${String(hour).padStart(2, '0')}:00</span>` : ''}
            <div class="bar-fill" style="height: ${height}px;"></div>
            <div class="tooltip">
                ${String(hour).padStart(2, '0')}:00, 
                ${hourInfo.fish} vis${hourInfo.fish !== 1 ? 'sen' : ''}
            </div>
        `;

        // Voeg de kolom toe aan de grafiek
        barsEl.appendChild(col);
    });
}

// Alles starten
loadData()
    .then(events => {
        const hourData = countPerHour(events);
        render(hourData);
    })
    .catch(err => {
        console.error('Kon data niet laden:', err);
    });