import { useEffect, useState } from "react";
import { fish } from "../carousel/fish";

/* ── Vaste instellingen voor de klok ───────────────────────────────────────── */

const CLOCK_CENTER = 220; // het midden van de klok-tekening (x én y)
const HUB_RADIUS = 72; // de donkere cirkel in het midden
const HAND_MAX_LENGTH = 128; // de langste wijzer (het drukste uur) in pixels

const COLOR_QUIET = [30, 172, 176];
const COLOR_BUSY = [240, 175, 0];

const MODES = [
  { id: "all", label: "Alles" },
  { id: "week", label: "Doordeweeks" },
  { id: "weekend", label: "Weekend" },
];

// In de filtermodi tekenen we het ándere ritme als stippellijn mee.
const GHOST_OF = { week: "weekend", weekend: "week" };
const GHOST_LABEL = { week: "weekend", weekend: "doordeweeks" };

// Welke weekdagen horen bij elke modus? In pondWeek is 0 = maandag … 6 = zondag.
const MODE_DAYS = {
  all: [0, 1, 2, 3, 4, 5, 6],
  week: [0, 1, 2, 3, 4],
  weekend: [5, 6],
};

// De afbeelding opzoeken die bij een vissoort hoort (uit de carousel-lijst).
const fishByName = Object.fromEntries(fish.map((f) => [f.name, f]));

/* ── Vaste instellingen voor de tijdlijn ───────────────────────────────────── */

const TIMELINE_WIDTH = 1040; // breedte van de tekening
const TIMELINE_HEIGHT = 400; // hoogte van de tekening
const TIMELINE_AXIS_Y = 340; // hoogte waarop de tijd-as ligt

/* ── Kleine hulpfuncties ───────────────────────────────────────────────────── */

// Telt alle getallen in een lijst bij elkaar op.
function sumOf(list) {
  let sum = 0;
  for (const number of list) sum += number;
  return sum;
}

function colorForBusyness(busyness) {
  const red = Math.round(
    COLOR_QUIET[0] + (COLOR_BUSY[0] - COLOR_QUIET[0]) * busyness,
  );
  const green = Math.round(
    COLOR_QUIET[1] + (COLOR_BUSY[1] - COLOR_QUIET[1]) * busyness,
  );
  const blue = Math.round(
    COLOR_QUIET[2] + (COLOR_BUSY[2] - COLOR_QUIET[2]) * busyness,
  );
  return `rgb(${red} ${green} ${blue})`;
}

// Rekent een uur (0–24) en een afstand vanaf het midden om naar een x/y-punt
// op de klok. Uur 0 staat bovenaan en de uren lopen met de klok mee.
// Het uur mag een kommagetal zijn (voor de "nu"-wijzer).
function pointOnClock(hour, distance) {
  const angle = (hour / 24) * 2 * Math.PI - Math.PI / 2;
  return {
    x: CLOCK_CENTER + distance * Math.cos(angle),
    y: CLOCK_CENTER + distance * Math.sin(angle),
  };
}

// Hoe ver de punt van een wijzer van het midden af staat (busyness is 0–1).
function handTipDistance(busyness) {
  return HUB_RADIUS + 8 + busyness * HAND_MAX_LENGTH;
}

// Een minuut (0–60) omrekenen naar een x-positie op de tijdlijn.
function minuteToX(minute) {
  return 50 + (minute / 60) * (TIMELINE_WIDTH - 100);
}

// Een uur als tekst, bijvoorbeeld 7 → "07:00".
function hourAsText(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

// Een uur en een minuut als tekst, bijvoorbeeld (17, 5) → "17:05".
// Minuut 60 rolt netjes door naar het volgende uur, dus (17, 60) → "18:00".
function timeAsText(hour, minute) {
  const wholeHour = (hour + Math.floor(minute / 60)) % 24;
  const restMinute = minute % 60;
  return `${String(wholeHour).padStart(2, "0")}:${String(restMinute).padStart(2, "0")}`;
}

/* ── De data klaarzetten ───────────────────────────────────────────────────── */

// Een leeg telformulier: per uur een optelsom en het aantal getelde dagen.
function emptyProfile() {
  return { sum: new Array(24).fill(0), days: new Array(24).fill(0) };
}

// Maakt voor elke modus (alles / doordeweeks / weekend) een lijst van 24 uren.
// Per uur berekenen we het gemiddelde aantal meldingen. Alle modi delen
// dezelfde schaal, zodat je de wijzerlengtes eerlijk kunt vergelijken.
function buildHourProfiles(weekHours, weekDays) {
  if (!Array.isArray(weekHours) || weekHours.length === 0) return null;
  if (!Array.isArray(weekDays) || weekDays.length === 0) return null;

  // Tel meldingen per uur op, apart voor week- en weekenddagen.
  const tally = {
    all: emptyProfile(),
    week: emptyProfile(),
    weekend: emptyProfile(),
  };

  for (let i = 0; i < weekHours.length; i++) {
    const count = weekHours[i];
    const dayIndex = Math.floor(i / 24);
    const hour = i % 24;
    const date = weekDays[dayIndex];
    if (!date) continue;

    const weekday = new Date(`${date}T00:00:00`).getDay();
    const isWeekend = weekday === 0 || weekday === 6;

    tally.all.sum[hour] += count;
    tally.all.days[hour] += 1;
    const bucket = isWeekend ? tally.weekend : tally.week;
    bucket.sum[hour] += count;
    bucket.days[hour] += 1;
  }

  // Van optelsom naar gemiddelde per uur.
  function averagePerHour(profile) {
    return profile.sum.map((sum, hour) =>
      profile.days[hour] ? sum / profile.days[hour] : 0,
    );
  }
  const perMode = {
    all: averagePerHour(tally.all),
    week: averagePerHour(tally.week),
    weekend: averagePerHour(tally.weekend),
  };

  // Het drukste uur over alle modi bepaalt de schaal (= langste wijzer).
  const highest = Math.max(
    ...perMode.all,
    ...perMode.week,
    ...perMode.weekend,
    1,
  );

  // Per uur: gemiddelde, drukte (0–1) en dagaandeel bewaren.
  function makeHourList(averages) {
    const total = sumOf(averages);
    return averages.map((value, hour) => ({
      hour,
      value,
      busyness: value / highest,
      share: total ? value / total : 0,
    }));
  }

  return {
    all: makeHourList(perMode.all),
    week: makeHourList(perMode.week),
    weekend: makeHourList(perMode.weekend),
    dayTotals: {
      week: sumOf(perMode.week),
      weekend: sumOf(perMode.weekend),
    },
  };
}

// Zoekt het drukste uur in een urenlijst.
function busiestHourOf(hours) {
  let busiest = hours[0];
  for (const hour of hours) {
    if (hour.value > busiest.value) busiest = hour;
  }
  return busiest;
}

// Zoekt het rustigste uur in een urenlijst.
function quietestHourOf(hours) {
  let quietest = hours[0];
  for (const hour of hours) {
    if (hour.value < quietest.value) quietest = hour;
  }
  return quietest;
}

// Maakt een rijtje vissen om over de tijdlijn te verdelen. Soorten die vaker
// gezien zijn, komen vaker in het rijtje voor (decoratief: de data koppelt
// geen soort aan een exacte minuut).
function buildFishPool(species) {
  if (!species) return fish;

  const total = sumOf(Object.values(species));
  const ranked = Object.entries(species).sort((a, b) => b[1] - a[1]);

  const pool = [];
  for (const [name, count] of ranked) {
    const fishImage = fishByName[name];
    if (!fishImage) continue;
    // Hoe vaker gezien, hoe vaker in het rijtje (en minimaal één keer).
    const copies = Math.max(1, Math.round((count / total) * 24));
    for (let i = 0; i < copies; i++) pool.push(fishImage);
  }
  return pool.length > 0 ? pool : fish;
}

// Voor één uur: hoe vaak ging de bel in elk blok van 10 minuten? Opgeteld over
// de hele periode, alleen de dagen die bij de gekozen modus horen.
function countRingsPerBlock(pondWeek, hour, mode) {
  const perBlock = [0, 0, 0, 0, 0, 0]; // 6 blokken: 0–10, 10–20, … 50–60 min
  for (let minute = 0; minute < 60; minute++) {
    let sum = 0;
    for (const day of MODE_DAYS[mode]) {
      sum += pondWeek[day * 1440 + hour * 60 + minute];
    }
    perBlock[Math.floor(minute / 10)] += sum;
  }
  return perBlock;
}

export default function Clock() {
  const [profiles, setProfiles] = useState(null);
  const [period, setPeriod] = useState(null);
  const [pondWeek, setPondWeek] = useState(null);
  const [species, setSpecies] = useState(null);

  const [mode, setMode] = useState("all");
  const [hoveredHour, setHoveredHour] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [hoveredBlock, setHoveredBlock] = useState(null);

  // Eén keer de data ophalen zodra de klok op de pagina komt.
  useEffect(() => {
    let cancelled = false;
    fetch("/json/vis-data.json")
      .then((response) => response.json())
      .then((json) => {
        if (cancelled) return;
        setProfiles(buildHourProfiles(json.weekHours, json.weekDays));
        setPeriod(json.period ?? null);
        setPondWeek(json.pondWeek ?? null);
        setSpecies(json.species ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Alles uitrekenen wat de tekening nodig heeft ────────────────────────── */

  const hours = profiles ? profiles[mode] : null;
  const ghostHours =
    profiles && GHOST_OF[mode] ? profiles[GHOST_OF[mode]] : null;

  const busiest = hours ? busiestHourOf(hours) : null;
  const quietest = hours ? quietestHourOf(hours) : null;

  // In de naaf tonen we standaard het drukste uur; hover/focus overschrijft dat.
  const activeHour = (hoveredHour != null && hours?.[hoveredHour]) || busiest;

  // Hoeveel drukker is het weekend dan doordeweeks (in procenten)?
  const weekendBusier = profiles
    ? Math.round(
        (profiles.dayTotals.weekend / profiles.dayTotals.week - 1) * 100,
      )
    : 0;

  // De stippellijn van het andere ritme, als één doorlopende vorm.
  let ghostPath = null;
  if (ghostHours) {
    const pieces = ghostHours.map((hour, i) => {
      const point = pointOnClock(hour.hour, handTipDistance(hour.busyness));
      return `${i === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    });
    ghostPath = pieces.join(" ") + " Z";
  }

  // Voor de tijdlijn: per blok van 10 minuten het aantal belletjes in het uur.
  const blocks =
    selectedHour != null && pondWeek
      ? countRingsPerBlock(pondWeek, selectedHour, mode)
      : null;
  const blockMax = blocks ? Math.max(...blocks, 1) : 1;
  const blockTotal = blocks ? sumOf(blocks) : 0;

  // Het rijtje vissen dat over de tijdlijn verdeeld wordt.
  const fishPool = buildFishPool(species);

  /* ── De tekening ─────────────────────────────────────────────────────────── */

  return (
    <section className="clock" aria-labelledby="clock-title">
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

      {/* Schakelaar: alles / doordeweeks / weekend */}
      {hours && (
        <div
          className="clock__modes"
          role="group"
          aria-label="Kies welke dagen je bekijkt"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`clock__mode${
                mode === m.id ? " clock__mode--active" : ""
              }`}
              aria-pressed={mode === m.id}
              onClick={() => {
                setMode(m.id);
                setHoveredHour(null);
                setHoveredBlock(null);
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      <div className="clock__layout">
        <div className="clock__face-wrap">
          {!hours && <p className="clock__loading">Ritme wordt geladen…</p>}

          {/* ── De klok (zolang er geen uur is aangeklikt) ──────────────────── */}
          {hours && selectedHour == null && (
            <svg
              className="clock__face"
              viewBox="0 0 440 440"
              role="img"
              aria-label={`Dagritme van de visdeurbel (${
                MODES.find((m) => m.id === mode).label
              }). Drukst om ${hourAsText(busiest.hour)} met gemiddeld ${Math.round(
                busiest.value,
              )} meldingen per uur, rustigst om ${hourAsText(quietest.hour)}.`}
            >
              {/* Stippellijn van het andere ritme (alleen in de filtermodi) */}
              {ghostPath && <path className="clock__ghost" d={ghostPath} />}

              {/* De 24 wijzers, één per uur */}
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

              {/* De naaf met de cijfers van het actieve uur */}
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

          {/* Legenda voor de stippellijn */}
          {ghostHours && selectedHour == null && (
            <p className="clock__ghost-legend">
              <span className="clock__ghost-swatch" aria-hidden="true" />
              Stippellijn = ritme in het {GHOST_LABEL[mode]} ter vergelijking.
            </p>
          )}

          {/* ── De tijdlijn van het aangeklikte uur ─────────────────────────── */}
          {selectedHour != null && blocks && (
            <div className="clock__timeline">
              <button
                type="button"
                className="clock__back"
                onClick={() => {
                  setSelectedHour(null);
                  setHoveredBlock(null);
                }}
              >
                ← Terug naar de klok
              </button>

              <h3 className="clock__timeline-title">
                Tussen {hourAsText(selectedHour)} en{" "}
                {hourAsText((selectedHour + 1) % 24)}
              </h3>
              <p className="clock__timeline-sub">
                Elke vis staat voor een blok van 10 minuten waarin de bel ging (
                {MODES.find((m) => m.id === mode).label.toLowerCase()},{" "}
                {period?.label ?? "de hele periode"}). Hoe groter de vis, hoe
                vaker — in dit uur in totaal <strong>{blockTotal}×</strong>.
              </p>

              {blockTotal === 0 ? (
                <p className="clock__timeline-spot">
                  In dit uur is de bel niet één keer gebruikt. Sssst, de vissen
                  slapen.
                </p>
              ) : (
                <>
                  <svg
                    className="clock__timeline-svg"
                    viewBox={`0 0 ${TIMELINE_WIDTH} ${TIMELINE_HEIGHT}`}
                    role="img"
                    aria-label={`Tijdlijn van ${hourAsText(
                      selectedHour,
                    )} tot ${hourAsText(
                      (selectedHour + 1) % 24,
                    )}: per 10 minuten hoe vaak de bel ging.`}
                  >
                    {/* De tijd-as: een lijn met een streepje en tijd per 10 min */}
                    <line
                      className="clock__timeline-axis"
                      x1={minuteToX(0)}
                      y1={TIMELINE_AXIS_Y}
                      x2={minuteToX(60)}
                      y2={TIMELINE_AXIS_Y}
                    />
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
                          {minute === 60
                            ? hourAsText((selectedHour + 1) % 24)
                            : timeAsText(selectedHour, minute)}
                        </text>
                      </g>
                    ))}

                    {/* Per blok van 10 minuten één vis aan een lijntje. */}
                    {blocks.map((count, block) => {
                      if (count === 0) return null;

                      const fishImage = fishPool[block % fishPool.length];
                      const size = 44 + (count / blockMax) * 46; // 44–90px
                      const x = minuteToX(block * 10 + 5);
                      const y = TIMELINE_AXIS_Y - 150;

                      return (
                        <g key={block}>
                          {/* Het lijntje van de vis naar zijn blok op de as */}
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
                            aria-label={`${timeAsText(
                              selectedHour,
                              block * 10,
                            )} tot ${timeAsText(
                              selectedHour,
                              block * 10 + 10,
                            )}: ${count} meldingen (${fishImage.name})`}
                            onMouseEnter={() => setHoveredBlock(block)}
                            onMouseLeave={() => setHoveredBlock(null)}
                            onFocus={() => setHoveredBlock(block)}
                            onBlur={() => setHoveredBlock(null)}
                            style={{ "--i": block }}
                          >
                            <title>{`${timeAsText(selectedHour, block * 10)}–${timeAsText(selectedHour, block * 10 + 10)} · ${count}× gebeld · ${fishImage.name}`}</title>
                          </image>
                        </g>
                      );
                    })}
                  </svg>

                  <p className="clock__timeline-spot">
                    {hoveredBlock != null ? (
                      <>
                        Tussen{" "}
                        <strong>
                          {timeAsText(selectedHour, hoveredBlock * 10)}
                        </strong>{" "}
                        en{" "}
                        <strong>
                          {timeAsText(selectedHour, hoveredBlock * 10 + 10)}
                        </strong>{" "}
                        ging de bel <strong>{blocks[hoveredBlock]}×</strong> —
                        hier zwemt een{" "}
                        {fishPool[hoveredBlock % fishPool.length].name}.
                      </>
                    ) : (
                      "Beweeg over een vis voor het tijdvak."
                    )}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Tekstuele duiding + toegankelijke datatabel ─────────────────────── */}
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
            <p className="clock__insight">
              In het weekend gaat de bel ruim <strong>{weekendBusier}%</strong>{" "}
              vaker dan doordeweeks.
            </p>
            <table className="clock__sr-only">
              <caption>
                Gemiddeld aantal meldingen per uur van de dag (
                {MODES.find((m) => m.id === mode).label})
              </caption>
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
