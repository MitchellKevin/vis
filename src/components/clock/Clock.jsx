import { useEffect, useState } from "react";
import { fish } from "../carousel/fish";

// ─────────────────────────────────────────────────────────────────────────────
// MARK: Styling — kleuren & maten van de tekening
// ─────────────────────────────────────────────────────────────────────────────

const CLOCK_CENTER = 220; // het midden van de klok-tekening (x én y)
const HUB_RADIUS = 72; // de donkere cirkel in het midden
const HAND_MAX_LENGTH = 128; // de langste wijzer (het drukste uur) in pixels

const COLOR_QUIET = [192, 168, 255]; // --color-purple (#c0a8ff) — rustig
const COLOR_MID = [255, 128, 185]; //   --color-pink   (#ff80b9) — midden
const COLOR_BUSY = [240, 175, 0]; //    --color-gold   (#f0af00) — druk

const TIMELINE_WIDTH = 1040; // breedte van de tijdlijn-tekening
const TIMELINE_HEIGHT = 400; // hoogte van de tijdlijn-tekening
const TIMELINE_AXIS_Y = 340; // hoogte waarop de tijd-as ligt

// Zet drukte (0–1) om naar een kleur over drie stops: tot 0,5 mengt de schaal
// van rustig naar het midden, daarboven van het midden naar druk.
function colorForBusyness(busyness) {
  const [from, to, t] =
    busyness < 0.5
      ? [COLOR_QUIET, COLOR_MID, busyness / 0.5]
      : [COLOR_MID, COLOR_BUSY, (busyness - 0.5) / 0.5];
  const channel = (i) => Math.round(from[i] + (to[i] - from[i]) * t);
  return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: Data — de meldingen tellen en klaarzetten voor de tekening
// ─────────────────────────────────────────────────────────────────────────────

// De afbeelding opzoeken die bij een vissoort hoort (uit de carousel-lijst).
const fishByName = Object.fromEntries(fish.map((f) => [f.name, f]));

// Telt alle getallen in een lijst bij elkaar op.
const sumOf = (list) => list.reduce((sum, number) => sum + number, 0);

// Een leeg telformulier: per uur een optelsom en het aantal getelde dagen.
function emptyTally() {
  return { sum: new Array(24).fill(0), days: new Array(24).fill(0) };
}

// Maakt een lijst van 24 uren. Per uur berekenen we het gemiddelde aantal
// meldingen, zodat je de wijzerlengtes eerlijk kunt vergelijken.
function buildHourProfile(weekHours, weekDays) {
  if (!Array.isArray(weekHours) || weekHours.length === 0) return null;
  if (!Array.isArray(weekDays) || weekDays.length === 0) return null;

  // Tel meldingen per uur op over alle dagen.
  const tally = emptyTally();

  for (let i = 0; i < weekHours.length; i++) {
    const count = weekHours[i];
    const dayIndex = Math.floor(i / 24);
    const hour = i % 24;
    if (!weekDays[dayIndex]) continue;

    tally.sum[hour] += count;
    tally.days[hour] += 1;
  }

  // Van optelsom naar gemiddelde per uur.
  const averages = tally.sum.map((sum, hour) =>
    tally.days[hour] ? sum / tally.days[hour] : 0,
  );

  // Het drukste uur bepaalt de schaal (= langste wijzer).
  const highest = Math.max(...averages, 1);
  const total = sumOf(averages);

  // Per uur: gemiddelde, drukte (0–1) en dagaandeel bewaren.
  return averages.map((value, hour) => ({
    hour,
    value,
    busyness: value / highest,
    share: total ? value / total : 0,
  }));
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

// ─────────────────────────────────────────────────────────────────────────────
// MARK: Klok — wiskunde & tekst voor de wijzerplaat
// ─────────────────────────────────────────────────────────────────────────────

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

// Een uur als tekst, bijvoorbeeld 7 → "07:00". Ook gebruikt door de tijdlijn.
function hourAsText(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
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

// ─────────────────────────────────────────────────────────────────────────────
// MARK: Tijdlijn — alles voor de uur-tijdlijn (verschijnt na een klik op een uur)
// ─────────────────────────────────────────────────────────────────────────────

// Een minuut (0–60) omrekenen naar een x-positie op de tijdlijn.
function minuteToX(minute) {
  return 50 + (minute / 60) * (TIMELINE_WIDTH - 100);
}

// Een uur en een minuut als tekst, bijvoorbeeld (17, 5) → "17:05".
// Minuut 60 rolt netjes door naar het volgende uur, dus (17, 60) → "18:00".
function timeAsText(hour, minute) {
  const wholeHour = (hour + Math.floor(minute / 60)) % 24;
  const restMinute = minute % 60;
  return `${String(wholeHour).padStart(2, "0")}:${String(restMinute).padStart(2, "0")}`;
}

// Voor één uur: hoe vaak ging de bel in elk blok van 10 minuten? Opgeteld over
// de hele periode en over alle dagen van de week. Geeft 6 getallen terug.
function countRingsPerBlock(pondWeek, hour) {
  const perBlock = [0, 0, 0, 0, 0, 0]; // 6 blokken: 0–10, 10–20, … 50–60 min
  for (let day = 0; day < 7; day++) {
    for (let minute = 0; minute < 60; minute++) {
      const block = Math.floor(minute / 10); // bij welke vis hoort deze minuut
      perBlock[block] += pondWeek[day * 1440 + hour * 60 + minute];
    }
  }
  return perBlock;
}

// Eén vis op de tijdlijn. Hoe vaker de bel ging, hoe groter de vis. Hij hangt
// aan een lijntje boven het blok van 10 minuten waar hij bij hoort.
function TimelineFish({
  hour,
  block,
  count,
  max,
  fishImage,
  onHover,
  onLeave,
}) {
  const size = 44 + (count / max) * 46; // 44–90px
  const x = minuteToX(block * 10 + 5);
  const y = TIMELINE_AXIS_Y - 150;
  const from = timeAsText(hour, block * 10);
  const to = timeAsText(hour, block * 10 + 10);

  return (
    <g>
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

// De tijdlijn die verschijnt nadat je op een uur klikt: dat ene uur uitgesplitst
// in zes blokken van 10 minuten, elk met een vis zo groot als zijn drukte.
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
  const blockTotal = sumOf(blocks); // hoe vaak in totaal in dit uur
  const blockMax = Math.max(...blocks, 1); // het drukste blok = de grootste vis

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

      {/* Stille uren: geen vissen om te tekenen */}
      {blockTotal === 0 && (
        <p className="clock__timeline-spot">
          In dit uur is de bel niet één keer gebruikt. Sssst, de vissen slapen.
        </p>
      )}

      {/* Drukke uren: de as met streepjes en de vissen erboven */}
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
            {/* De tijd-as: x = minuut via minuteToX(), y = de hoogte TIMELINE_AXIS_Y (±wat om boven/onder de lijn te tekenen). */}
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
                  {timeAsText(hour, minute)}
                </text>
              </g>
            ))}

            {/* Per blok van 10 minuten één vis (lege blokken slaan we over) */}
            {blocks.map((count, block) =>
              count === 0 ? null : (
                <TimelineFish
                  key={block}
                  hour={hour}
                  block={block}
                  count={count}
                  max={blockMax}
                  fishImage={fishPool[block % fishPool.length]}
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
// MARK: Component — de klok zelf (data ophalen, state en de render)
// ─────────────────────────────────────────────────────────────────────────────

export default function Clock() {
  const [hours, setHours] = useState(null);
  const [period, setPeriod] = useState(null);
  const [pondWeek, setPondWeek] = useState(null);
  const [species, setSpecies] = useState(null);

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
        setHours(buildHourProfile(json.weekHours, json.weekDays));
        setPeriod(json.period ?? null);
        setPondWeek(json.pondWeek ?? null);
        setSpecies(json.species ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // MARK: Berekeningen voor de tekening

  const busiest = hours ? busiestHourOf(hours) : null;
  const quietest = hours ? quietestHourOf(hours) : null;

  // In de naaf tonen we standaard het drukste uur; hover/focus overschrijft dat.
  const activeHour = (hoveredHour != null && hours?.[hoveredHour]) || busiest;

  // Voor de tijdlijn: per blok van 10 minuten het aantal belletjes in het uur.
  const blocks =
    selectedHour != null && pondWeek
      ? countRingsPerBlock(pondWeek, selectedHour)
      : null;

  // Het rijtje vissen dat over de tijdlijn verdeeld wordt.
  const fishPool = buildFishPool(species);

  // MARK: De tekening (render)

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

          {/* MARK: Wijzerplaat (de klok) */}
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

          {/* MARK: Tijdlijn (na klik op een uur) */}
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

        {/* MARK: Duiding + tabel */}
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
