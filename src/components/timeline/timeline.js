export const HOURS = 24;

export const SCALE = 30;

export async function loadData() {
  const response = await fetch(
    '/json/event-maand.json'
  );

  const text = await response.text();

  return text
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));
}

export function countPerHour(events) {
  const hours = Array.from(
    { length: HOURS },
    () => ({
      total: 0,
      days: new Set(),
      fishCounts: new Map(),
      average: 0,
      topFish: null
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
      event.created_at.split(' ');

    const hour = parseInt(
      time.slice(0, 2),
      10
    );

    hours[hour].total++;

    hours[hour].days.add(date);

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
      (hours[hour].fishCounts.get(fish) || 0) + 1
    );
  });

  hours.forEach(hour => {
    const dayCount =
      hour.days.size || 1;

    hour.average =
      hour.total / dayCount;

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