import { useEffect, useState } from "react";
import { fish } from "../carousel/fish";

// ─────────────────────────────────────────────────────────────────────────────
// MARK: Styling — colors & dimensions of the drawing
// ─────────────────────────────────────────────────────────────────────────────

const CLOCK_CENTER = 220; // center of the clock drawing (x and y)
const HUB_RADIUS = 72; // the dark circle in the center
const HAND_MAX_LENGTH = 128; // the variable hand length; longest = HUB_RADIUS + 8 + 128 = 136 px

const COLOR_QUIET = [192, 168, 255]; // --color-purple (#c0a8ff) — quiet
const COLOR_MID = [255, 128, 185]; //   --color-pink   (#ff80b9) — mid
const COLOR_BUSY = [240, 175, 0]; //    --color-gold   (#f0af00) — busy

const TIMELINE_WIDTH = 1040; // width of the timeline drawing
const TIMELINE_HEIGHT = 400; // height of the timeline drawing
const TIMELINE_AXIS_Y = 340; // y position of the time axis

// Maps busyness (0–1) to a color across three stops: below 0.5 blends from
// quiet to mid, above 0.5 from mid to busy.
function colorForBusyness(busyness) {
  const [from, to, t] =
    busyness < 0.5
      ? [COLOR_QUIET, COLOR_MID, busyness / 0.5]
      : [COLOR_MID, COLOR_BUSY, (busyness - 0.5) / 0.5];
  const channel = (i) => Math.round(from[i] + (to[i] - from[i]) * t);
  return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: Data — counting notifications and preparing them for the drawing
// ─────────────────────────────────────────────────────────────────────────────

// Look up the image that belongs to a fish species (from the carousel list).
const fishByName = Object.fromEntries(fish.map((f) => [f.name, f]));

// Sums all numbers in a list.
const sumOf = (list) => list.reduce((sum, number) => sum + number, 0);

// Empty tally: a running sum and a day count per hour.
function emptyTally() {
  return { sum: new Array(24).fill(0), days: new Array(24).fill(0) };
}

// Builds a list of 24 hours. Per hour we calculate the average number of
// notifications so hand lengths can be compared fairly.
function buildHourProfile(weekHours, weekDays) {
  if (!Array.isArray(weekHours) || weekHours.length === 0) return null;
  if (!Array.isArray(weekDays) || weekDays.length === 0) return null;

  // Accumulate notifications per hour across all days.
  const tally = emptyTally();

  for (let i = 0; i < weekHours.length; i++) {
    const count = weekHours[i];
    const dayIndex = Math.floor(i / 24);
    const hour = i % 24;
    if (!weekDays[dayIndex]) continue;

    tally.sum[hour] += count;
    tally.days[hour] += 1;
  }

  // Convert the running sum to an average per hour.
  const averages = tally.sum.map((sum, hour) =>
    tally.days[hour] ? sum / tally.days[hour] : 0,
  );

  // The busiest hour sets the scale (= longest hand).
  // The ,1 prevents division by zero when all hours are silent.
  const highest = Math.max(...averages, 1);
  const total = sumOf(averages);

  // Per hour: store the average, busyness (0–1), and share of the day.
  return averages.map((value, hour) => ({
    hour,
    value,
    busyness: value / highest,
    share: total ? value / total : 0,
  }));
}

// Builds a pool of fish to distribute across the timeline. Species seen more
// often appear more often in the pool (decorative: the data does not link a
// species to an exact minute).
function buildFishPool(species) {
  if (!species) return fish;

  const total = sumOf(Object.values(species));
  const ranked = Object.entries(species).sort((a, b) => b[1] - a[1]);

  const pool = [];
  for (const [name, count] of ranked) {
    const fishImage = fishByName[name];
    if (!fishImage) continue;
    // The more often seen, the more copies in the pool (at least one).
    const copies = Math.max(1, Math.round((count / total) * 24));
    for (let i = 0; i < copies; i++) pool.push(fishImage);
  }
  return pool.length > 0 ? pool : fish;
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: Clock — math & text for the clock face
// ─────────────────────────────────────────────────────────────────────────────

// Converts an hour (0–24) and a distance from the center to an x/y point on
// the clock. Hour 0 is at the top and hours run clockwise.
// Hour may be a decimal (for a "current time" hand).
function pointOnClock(hour, distance) {
  const angle = (hour / 24) * 2 * Math.PI - Math.PI / 2;
  return {
    x: CLOCK_CENTER + distance * Math.cos(angle),
    y: CLOCK_CENTER + distance * Math.sin(angle),
  };
}

// Distance from center to the tip of a hand (busyness is 0–1).
function handTipDistance(busyness) {
  return HUB_RADIUS + 8 + busyness * HAND_MAX_LENGTH;
}

// Formats an hour as text, e.g. 7 → "07:00". Also used by the timeline.
function hourAsText(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

// Finds the busiest hour in a list of hours.
// controllered de array en kijkt de heletijd welke het grootst is
function busiestHourOf(hours) {
  let busiest = hours[0];
  for (const hour of hours) {
    if (hour.value > busiest.value) busiest = hour;
  }
  return busiest;
}

// Finds the quietest hour in a list of hours.
function quietestHourOf(hours) {
  let quietest = hours[0];
  for (const hour of hours) {
    if (hour.value < quietest.value) quietest = hour;
  }
  return quietest;
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: Timeline — everything for the hour timeline (shown after clicking an hour)
// ─────────────────────────────────────────────────────────────────────────────

// Converts a minute (0–60) to an x position on the timeline.
function minuteToX(minute) {
  return 50 + (minute / 60) * (TIMELINE_WIDTH - 100);
}

// Formats an hour and minute as text, e.g. (17, 5) → "17:05".
// Minute 60 wraps cleanly to the next hour, so (17, 60) → "18:00".
function timeAsText(hour, minute) {
  const wholeHour = (hour + Math.floor(minute / 60)) % 24;
  const restMinute = minute % 60;
  return `${String(wholeHour).padStart(2, "0")}:${String(restMinute).padStart(2, "0")}`;
}

// For one hour: how often did the bell ring in each 10-minute block? Summed
// over the entire period and all days of the week. Returns 6 numbers.
function countRingsPerBlock(pondWeek, hour) {
  const perBlock = [0, 0, 0, 0, 0, 0]; // 6 blocks: 0–10, 10–20, … 50–60 min
  for (let day = 0; day < 7; day++) {
    for (let minute = 0; minute < 60; minute++) {
      const block = Math.floor(minute / 10); // which 10-minute block this minute falls into
      perBlock[block] += pondWeek[day * 1440 + hour * 60 + minute];
    }
  }
  return perBlock;
}

// One fish on the timeline. The more often the bell rang, the larger the fish.
// It hangs on a thread above the 10-minute block it belongs to.
function TimelineFish({
  hour,
  block,
  count,
  max,
  fishImage,
  onHover,
  onLeave,
}) {
  const size = 44 + (count / max) * 46; // 44–90 px
  const x = minuteToX(block * 10 + 5);
  const y = TIMELINE_AXIS_Y - 150;
  const from = timeAsText(hour, block * 10);
  const to = timeAsText(hour, block * 10 + 10);

  return (
    <g>
      {/* Thread connecting the fish to its block on the axis */}
      <line
        className="clock__timeline-thread"
        x1={x}
        y1={y + size / 2 - 4}
        x2={x}
        y2={TIMELINE_AXIS_Y}
      />
      <circle
        className="clock__timeline-dot"
        cx={x}
        cy={TIMELINE_AXIS_Y}
        r={3}
      />
      <image
        className="clock__fish"
        href={fishImage.img}
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
        tabIndex={0}
        aria-label={`${from} tot ${to}: ${count} meldingen (${fishImage.name})`}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onFocus={onHover}
        onBlur={onLeave}
        style={{ "--i": block }}
      >
        <title>{`${from}–${to} · ${count}× gebeld · ${fishImage.name}`}</title>
      </image>
    </g>
  );
}

// Timeline shown after clicking an hour: that single hour broken into six
// 10-minute blocks, each with a fish sized by its busyness.
function HourTimeline({
  hour,
  blocks,
  fishPool,
  periodLabel,
  hoveredBlock,
  setHoveredBlock,
  onBack,
}) {
  const nextHour = (hour + 1) % 24;
  const blockTotal = sumOf(blocks); // total rings in this hour
  const blockMax = Math.max(...blocks, 1); // busiest block = largest fish

  return (
    <div className="clock__timeline">
      <button type="button" className="clock__back" onClick={onBack}>
        ← Terug naar de klok
      </button>

      <h3 className="clock__timeline-title">
        Tussen {hourAsText(hour)} en {hourAsText(nextHour)}
      </h3>
      <p className="clock__timeline-sub">
        Elke vis staat voor een blok van 10 minuten waarin de bel ging (
        {periodLabel}). Hoe groter de vis, hoe vaker — in dit uur in totaal{" "}
        <strong>{blockTotal}×</strong>.
      </p>

      {/* Silent hours: nothing to draw */}
      {blockTotal === 0 && (
        <p className="clock__timeline-spot">
          In dit uur is de bel niet één keer gebruikt. Sssst, de vissen slapen.
        </p>
      )}

      {/* Hours with activity: the axis with tick marks and fish above */}
      {blockTotal > 0 && (
        <>
          <svg
            className="clock__timeline-svg"
            viewBox={`0 0 ${TIMELINE_WIDTH} ${TIMELINE_HEIGHT}`}
            role="img"
            aria-label={`Tijdlijn van ${hourAsText(hour)} tot ${hourAsText(
              nextHour,
            )}: per 10 minuten hoe vaak de bel ging.`}
          >
            {/* Time axis: x = minute via minuteToX(), y = TIMELINE_AXIS_Y (drawn above and below the line). */}
            <line
              className="clock__timeline-axis"
              x1={minuteToX(0)}
              y1={TIMELINE_AXIS_Y}
              x2={minuteToX(60)}
              y2={TIMELINE_AXIS_Y}
            />
            {/* Vertical tick marks on the axis, each centered on TIMELINE_AXIS_Y:
                 x1/x2 = x position of the minute (via minuteToX)
                 y1    = 10 px above the axis (TIMELINE_AXIS_Y - 10)
                 y2    = 10 px below the axis (TIMELINE_AXIS_Y + 10) */}
            {[0, 10, 20, 30, 40, 50, 60].map((minute) => (
              <g key={minute}>
                <line
                  className="clock__timeline-axis"
                  x1={minuteToX(minute)}
                  y1={TIMELINE_AXIS_Y - 10}
                  x2={minuteToX(minute)}
                  y2={TIMELINE_AXIS_Y + 10}
                />
                <text
                  className="clock__tick"
                  x={minuteToX(minute)}
                  y={TIMELINE_AXIS_Y + 32}
                  textAnchor="middle"
                >
                  {timeAsText(hour, minute)}
                </text>
              </g>
            ))}

            {/* One fish per 10-minute block (empty blocks are skipped) */}
            {blocks.map((count, block) =>
              count === 0 ? null : (
                <TimelineFish
                  key={block}
                  hour={hour}
                  block={block}
                  count={count}
                  max={blockMax}
                  fishImage={
                    fishPool[
                      block % fishPool.length
                    ] /* % length: never out of bounds when there are fewer fish than blocks */
                  }
                  onHover={() => setHoveredBlock(block)}
                  onLeave={() => setHoveredBlock(null)}
                />
              ),
            )}
          </svg>

          <p className="clock__timeline-spot">
            {hoveredBlock != null ? (
              <>
                Tussen <strong>{timeAsText(hour, hoveredBlock * 10)}</strong> en{" "}
                <strong>{timeAsText(hour, hoveredBlock * 10 + 10)}</strong> ging
                de bel <strong>{blocks[hoveredBlock]}×</strong> — hier zwemt een{" "}
                {fishPool[hoveredBlock % fishPool.length].name}.
              </>
            ) : (
              "Beweeg over een vis voor het tijdvak."
            )}
          </p>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: Component — the clock itself (data fetching, state and render)
// ─────────────────────────────────────────────────────────────────────────────

export default function Clock() {
  const [hours, setHours] = useState(null);
  const [period, setPeriod] = useState(null);
  const [pondWeek, setPondWeek] = useState(null);
  const [species, setSpecies] = useState(null);

  const [hoveredHour, setHoveredHour] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [hoveredBlock, setHoveredBlock] = useState(null);

  // Fetch data once when the clock mounts.
  useEffect(() => {
    // cancelled prevents setState being called after the component has unmounted
    // (React would otherwise warn about a memory leak).
    let cancelled = false;
    fetch("/json/vis-data.json")
      .then((response) => response.json())
      .then((json) => {
        if (cancelled) return;
        setHours(buildHourProfile(json.weekHours, json.weekDays));
        setPeriod(json.period ?? null);
        setPondWeek(json.pondWeek ?? null);
        setSpecies(json.species ?? null);
      })
      // On a failed fetch the loading text stays visible; no error message needed.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // MARK: Derived values for the drawing

  const busiest = hours ? busiestHourOf(hours) : null;
  const quietest = hours ? quietestHourOf(hours) : null;

  // The hub shows the busiest hour by default; hover/focus overrides it.
  // != null (not !==) so hour 0 (midnight) also counts as a valid hovered hour.
  const activeHour = (hoveredHour != null && hours?.[hoveredHour]) || busiest;

  // For the timeline: how often the bell rang per 10-minute block in the selected hour.
  const blocks =
    selectedHour != null && pondWeek
      ? countRingsPerBlock(pondWeek, selectedHour)
      : null;

  // Pool of fish distributed across the timeline.
  const fishPool = buildFishPool(species);

  // MARK: Render

  return (
    <section className="clock" data-theme="dark" aria-labelledby="clock-title">
      <header className="clock__head">
        <h2 id="clock-title">Het ritme van de bel</h2>
        {hours && (
          <p className="clock__sub">
            Wanneer drukt men op de visdeurbel? Elke wijzer is een uur van de
            dag, gemiddeld over {period?.label ?? "de periode"}. Hoe langer en
            goudener de wijzer, hoe drukker. Beweeg over een uur voor de
            cijfers, of klik erop voor de tijdlijn van dat uur.
          </p>
        )}
      </header>

      <div className="clock__layout">
        <div className="clock__face-wrap">
          {!hours && <p className="clock__loading">Ritme wordt geladen…</p>}

          {/* MARK: Clock face */}
          {hours && selectedHour == null && (
            <svg
              className="clock__face"
              viewBox="0 0 440 440"
              role="img"
              aria-label={`Dagritme van de visdeurbel. Drukst om ${hourAsText(
                busiest.hour,
              )} met gemiddeld ${Math.round(
                busiest.value,
              )} meldingen per uur, rustigst om ${hourAsText(quietest.hour)}.`}
            >
              {/* The 24 hands, one per hour */}
              {hours.map((hour) => {
                const start = pointOnClock(hour.hour, HUB_RADIUS);
                const end = pointOnClock(
                  hour.hour,
                  handTipDistance(hour.busyness),
                );
                const isActive = activeHour?.hour === hour.hour;
                return (
                  <line
                    key={hour.hour}
                    className={`clock__hand${
                      isActive ? " clock__hand--active" : ""
                    }`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={colorForBusyness(hour.busyness)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${hourAsText(hour.hour)} uur: gemiddeld ${Math.round(
                      hour.value,
                    )} meldingen, ${(hour.share * 100).toFixed(
                      1,
                    )} procent van de dag. Klik voor de tijdlijn van dit uur.`}
                    onMouseEnter={() => setHoveredHour(hour.hour)}
                    onMouseLeave={() => setHoveredHour(null)}
                    onFocus={() => setHoveredHour(hour.hour)}
                    onBlur={() => setHoveredHour(null)}
                    onClick={() => pondWeek && setSelectedHour(hour.hour)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        if (pondWeek) setSelectedHour(hour.hour);
                      }
                    }}
                  />
                );
              })}

              {/* Hub with the figures for the active hour */}
              <circle
                className="clock__hub"
                cx={CLOCK_CENTER}
                cy={CLOCK_CENTER}
                r={HUB_RADIUS - 4}
              />
              <text
                className="clock__hub-time"
                x={CLOCK_CENTER}
                y={CLOCK_CENTER - 14}
                textAnchor="middle"
              >
                {hourAsText(activeHour.hour)}
              </text>
              <text
                className="clock__hub-value"
                x={CLOCK_CENTER}
                y={CLOCK_CENTER + 18}
                textAnchor="middle"
              >
                {Math.round(activeHour.value)}
              </text>
              <text
                className="clock__hub-label"
                x={CLOCK_CENTER}
                y={CLOCK_CENTER + 38}
                textAnchor="middle"
              >
                meldingen/uur
              </text>
            </svg>
          )}

          {/* MARK: Timeline (shown after clicking an hour) */}
          {selectedHour != null && blocks && (
            <HourTimeline
              hour={selectedHour}
              blocks={blocks}
              fishPool={fishPool}
              periodLabel={period?.label ?? "de hele periode"}
              hoveredBlock={hoveredBlock}
              setHoveredBlock={setHoveredBlock}
              onBack={() => {
                setSelectedHour(null);
                setHoveredBlock(null);
              }}
            />
          )}
        </div>

        {/* MARK: Insights + table */}
        {hours && (
          <aside className="clock__insights">
            <p className="clock__insight">
              Het wordt het drukst rond{" "}
              <strong>{hourAsText(busiest.hour)}</strong> — dan gaat de bel
              gemiddeld <strong>{Math.round(busiest.value)}×</strong> per uur.
            </p>
            <p className="clock__insight">
              Om <strong>{hourAsText(quietest.hour)}</strong> is het het
              rustigst, met zo'n <strong>{Math.round(quietest.value)}×</strong>{" "}
              per uur.
            </p>
            <table className="clock__sr-only">
              <caption>Gemiddeld aantal meldingen per uur van de dag</caption>
              <thead>
                <tr>
                  <th scope="col">Uur</th>
                  <th scope="col">Gemiddeld aantal meldingen</th>
                </tr>
              </thead>
              <tbody>
                {hours.map((hour) => (
                  <tr key={hour.hour}>
                    <th scope="row">{hourAsText(hour.hour)}</th>
                    <td>{Math.round(hour.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </aside>
        )}
      </div>
    </section>
  );
}
