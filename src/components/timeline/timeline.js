export const HOURS = 24;

export async function loadData() {
  const response = await fetch(
    '/json/event-maand-slim.json'
  );

  const text = await response.text();

  return text
    .trim() // remove extra whitespace
    .split('\n') // split per line (\n = enter)
    .map(line => JSON.parse(line)); // make each line json object
}

export function countPerHour(events) {
  // Create one stats object per hour (24 total), each starting empty
  const hours = Array.from(
    { length: HOURS },
    () => ({
      total: 0, // total fish spotted in this hour (across all days)
      days: new Set(), // unique dates this hour occurred on, used for averaging
      fishCounts: new Map(), // count of how many times each fish type appeared
      average: 0, // calculated later: total / number of days
      topFish: null // calculated later: most frequently spotted fish
    })
  );

  events.forEach(event => {
    if (
      event.event_name !==
      'uploadedFish' 
    ) {
      return;
    }

    const [date, time] =
      event.created_at.split(' '); // for example "2024-05-01 14:32:00" split into seperate date and time

    const hour = parseInt(
      time.slice(0, 2) // first two numbers of timestamp
    );

    hours[hour].total++; // take correct hour and add fish to total

    hours[hour].days.add(date); // add date to hour. Used later to calculate average

    // The fish type is stored inside a query string in referrer_query, e.g. "...&fish=snoek&..."
    // This regex pulls out the value after "fish=" up to the next "&"
    const fish =
      event.referrer_query.match(
        /fish=([^&]+)/
      )?.[1];

    if (
      !fish ||
      fish === 'unknown' ||
      fish === 'onbekend'
    ) {
      return;
    }

    hours[hour].fishCounts.set(
      fish,
      (hours[hour].fishCounts.get(fish) ?? 0) + 1 // add total per fish species
    );
  });

  hours.forEach(hour => {
    const dayCount = hour.days.size || 1; // if no days are recorded, treat it as 1 day for dividing

    hour.average = hour.total / dayCount;

    let mostCommonFish = null;
    let topCount = 0;

    for (const [fish, count] of hour.fishCounts) { // Loop through every entry in the Map. fish receives the fish name, count receives the number of sightings.
      if (count > topCount) { // Check whether the current fish's count is greater than the highest count seen so far.
        topCount = count;
        mostCommonFish = fish;
      }
    }

    hour.topFish = mostCommonFish;
  });

  return hours;
}