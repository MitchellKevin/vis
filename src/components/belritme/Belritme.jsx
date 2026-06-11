import { useEffect, useMemo, useState } from "react";
import { fish } from "../carousel/fish";

/* ============================================================================
 * Belritme — Concept B voor de Julius-pagina
 * ----------------------------------------------------------------------------
 * Een radiale 24-uurs klok die laat zien WANNEER er op de visdeurbel wordt
 * gedrukt. Elke "wijzer" is een uur van de dag; hoe langer en goudener, hoe
 * drukker. Middernacht staat bovenaan, het middaguur onderaan — net als een
 * 24-uurs klok. Uit het drukste uur stijgen blubbeltjes op.
 *
 * Je kunt schakelen tussen Alles / Doordeweeks / Weekend. De wijzerlengtes
 * delen één schaal, zodat het echte verschil zichtbaar blijft: het weekend is
 * fors drukker en piekt al 's ochtends, terwijl doordeweeks pas 's avonds.
 * In de filtermodi tekenen we het andere ritme als spook-silhouet ter
 * vergelijking. Een gouden "nu"-wijzer wijst naar het huidige uur.
 *
 * Klik je op een wijzer, dan verandert de klok in een tijdlijn van dat uur:
 * elke vis staat op een minuut waarin de bel ging. Hoe groter de vis, hoe
 * vaker er in die minuut gebeld werd. Beweeg je over een vis, dan zie je het
 * precieze moment, het aantal meldingen en de vissoort.
 *
 * Data: `weekHours` (dagen × 24 uur), `weekDays` (datums), `pondWeek`
 * (meldingen per weekdag × uur × minuut) en `species` uit vis-data.json.
 * ========================================================================== */

const CENTER = 220;
const INNER_R = 72; // straal van de naaf (hub)
const MAX_LEN = 128; // langste wijzer (drukste uur van álle modi) in px

// Twee merkkleuren waartussen we interpoleren op basis van drukte: rustig
// (teal) → druk (goud). Beide komen uit de huisstijl-tokens.
const COOL = [30, 172, 176]; // #1eacb0 teal
const WARM = [240, 175, 0]; // #f0af00 goud

const MODES = [
  { id: "all", label: "Alles" },
  { id: "week", label: "Doordeweeks" },
  { id: "weekend", label: "Weekend" },
];

// In welke modus vergelijken we mee (spook-silhouet)?
const GHOST_OF = { week: "weekend", weekend: "week" };
const GHOST_LABEL = { week: "weekend", weekend: "doordeweeks" };

// Afbeelding opzoeken bij een vissoort (uit de carousel-lijst).
const fishByName = Object.fromEntries(fish.map((f) => [f.name, f]));

// Welke weekdagen horen bij elke modus? In `pondWeek` is 0 = maandag … 6 = zondag.
const MODE_DAYS = {
  all: [0, 1, 2, 3, 4, 5, 6],
  week: [0, 1, 2, 3, 4],
  weekend: [5, 6],
};

// Maten van de tijdlijn die verschijnt na een klik op een wijzer.
const TL_W = 640; // breedte van de tekening
const TL_H = 200; // hoogte van de tekening
const TL_AXIS_Y = 152; // hoogte van de tijd-as
const tlX = (minute) => 36 + (minute / 60) * (TL_W - 72); // minuut → x-positie

function lerpColor(t) {
  const c = COOL.map((cool, i) => Math.round(cool + (WARM[i] - cool) * t));
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

// Punt op de wijzerplaat. Uur 0 bovenaan, met de klok mee. `hour` mag
// fractioneel zijn (voor de "nu"-wijzer).
function polar(hour, radius) {
  const angle = (hour / 24) * 2 * Math.PI - Math.PI / 2;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

const tipRadius = (norm) => INNER_R + 8 + norm * MAX_LEN;

// Bouw drie uurprofielen (alles / doordeweeks / weekend) uit weekHours, met
// de echte weekdag per dag uit weekDays. Alle profielen delen één max, zodat
// de wijzerlengtes onderling vergelijkbaar zijn.
function buildProfiles(weekHours, weekDays) {
  if (!Array.isArray(weekHours) || weekHours.length === 0) return null;
  if (!Array.isArray(weekDays) || weekDays.length === 0) return null;

  const blank = () => ({ sum: new Array(24).fill(0), days: new Array(24).fill(0) });
  const acc = { all: blank(), week: blank(), weekend: blank() };

  weekHours.forEach((v, i) => {
    const day = Math.floor(i / 24);
    const hour = i % 24;
    const iso = weekDays[day];
    if (!iso) return;
    const dow = new Date(`${iso}T00:00:00`).getDay(); // 0 = zo … 6 = za
    const isWeekend = dow === 0 || dow === 6;
    acc.all.sum[hour] += v;
    acc.all.days[hour] += 1;
    const bucket = isWeekend ? acc.weekend : acc.week;
    bucket.sum[hour] += v;
    bucket.days[hour] += 1;
  });

  const avg = (a) => a.sum.map((s, h) => (a.days[h] ? s / a.days[h] : 0));
  const profiles = { all: avg(acc.all), week: avg(acc.week), weekend: avg(acc.weekend) };
  const globalMax = Math.max(...Object.values(profiles).flat(), 1);

  const decorate = (arr) => {
    const total = arr.reduce((a, b) => a + b, 0);
    return arr.map((value, hour) => ({
      hour,
      value,
      norm: value / globalMax, // 0–1 voor lengte & kleur (gedeelde schaal)
      share: total ? value / total : 0, // aandeel binnen deze modus
    }));
  };

  return {
    all: decorate(profiles.all),
    week: decorate(profiles.week),
    weekend: decorate(profiles.weekend),
    dayTotals: {
      all: profiles.all.reduce((a, b) => a + b, 0),
      week: profiles.week.reduce((a, b) => a + b, 0),
      weekend: profiles.weekend.reduce((a, b) => a + b, 0),
    },
  };
}

const peakOf = (arr) => arr.reduce((a, b) => (b.value > a.value ? b : a), arr[0]);
const quietOf = (arr) => arr.reduce((a, b) => (b.value < a.value ? b : a), arr[0]);

export default function Belritme() {
  const [profiles, setProfiles] = useState(null);
  const [period, setPeriod] = useState(null);
  const [pond, setPond] = useState(null); // meldingen per weekdag × uur × minuut
  const [species, setSpecies] = useState(null); // hoe vaak elke vissoort gezien is
  const [mode, setMode] = useState("all");
  const [selected, setSelected] = useState(null); // gekozen uur, of null
  const [clicked, setClicked] = useState(null); // aangeklikt uur → tijdlijn, of null
  const [spot, setSpot] = useState(null); // minuut onder de muis in de tijdlijn
  const [nowHour, setNowHour] = useState(() => {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/json/vis-data.json")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setProfiles(buildProfiles(json.weekHours, json.weekDays));
        setPeriod(json.period ?? null);
        setPond(json.pondWeek ?? null);
        setSpecies(json.species ?? null);

      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Houd de "nu"-wijzer levend zonder te veel te updaten (elke minuut).
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowHour(d.getHours() + d.getMinutes() / 60);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const hours = profiles?.[mode] ?? null;
  const ghost = profiles && GHOST_OF[mode] ? profiles[GHOST_OF[mode]] : null;

  const peak = useMemo(() => (hours ? peakOf(hours) : null), [hours]);
  const quiet = useMemo(() => (hours ? quietOf(hours) : null), [hours]);

  const fmt = (h) => `${String(h).padStart(2, "0")}:00`;

  // Standaard tonen we het piekuur in de naaf; hover/focus overschrijft dat.
  const active = (selected != null && hours?.[selected]) || peak;

  // Rijtje vissen om over de tijdlijn te verdelen: soorten die vaker gezien
  // zijn, komen vaker in het rijtje voor (decoratief, net als op de klok).
  const fishPool = useMemo(() => {
    if (!species) return fish;
    const total = Object.values(species).reduce((a, b) => a + b, 0);
    const pool = Object.entries(species)
      .sort((a, b) => b[1] - a[1])
      .flatMap(([name, count]) => {
        const f = fishByName[name];
        const keer = Math.max(1, Math.round((count / total) * 24));
        return f ? Array(keer).fill(f) : [];
      });
    return pool.length ? pool : fish;
  }, [species]);

  // Voor het aangeklikte uur: hoe vaak ging de bel in elke minuut? Opgeteld
  // over de hele periode, alleen de dagen van de gekozen modus.
  const minutes = useMemo(() => {
    if (clicked == null || !pond) return null;
    return Array.from({ length: 60 }, (_, min) =>
      MODE_DAYS[mode].reduce(
        (sum, day) => sum + pond[day * 1440 + clicked * 60 + min],
        0
      )
    );
  }, [clicked, pond, mode]);

  const minutesMax = minutes ? Math.max(...minutes, 1) : 1;
  const minutesTotal = minutes ? minutes.reduce((a, b) => a + b, 0) : 0;

  // Minuut → tijd als tekst, bv. "17:42".
  const fmtMin = (min) => `${String(clicked).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

  // Weekend vs. doordeweeks (procentueel drukker) — voor de duiding.
  const weekendVsWeek = profiles
    ? Math.round((profiles.dayTotals.weekend / profiles.dayTotals.week - 1) * 100)
    : 0;

  // Modus-specifiek verhaal naast de cijfers.
  const narrative = {
    all: "Over de hele week samengevat: 's nachts vrijwel stil, overdag steeds drukker en een duidelijke avondpiek.",
    week: "Doordeweeks blijft de ochtend stil — pas 's avonds, na werk en school, loopt het storm.",
    weekend: "In het weekend begint de drukte al rond het ontbijt en blijft de bel de hele dag bezig.",
  }[mode];

  const ghostPath =
    ghost &&
    ghost
      .map((h, i) => {
        const p = polar(h.hour, tipRadius(h.norm));
        return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      })
      .join(" ") + (ghost ? " Z" : "");

  return (
    <section className="belritme" aria-labelledby="belritme-title">
      <header className="belritme__head">
        <h2 id="belritme-title">Het ritme van de bel</h2>
        {hours && (
          <p className="belritme__sub">
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
          className="belritme__modes"
          role="group"
          aria-label="Kies welke dagen je bekijkt"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`belritme__mode${
                mode === m.id ? " belritme__mode--active" : ""
              }`}
              aria-pressed={mode === m.id}
              onClick={() => {
                setMode(m.id);
                setSelected(null);
                setSpot(null);
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      <div className="belritme__layout">
        <div className="belritme__clock-wrap">
          {!hours && <p className="belritme__loading">Ritme wordt geladen…</p>}

          {hours && clicked == null && (
            <svg
              className="belritme__clock"
              viewBox="0 0 440 440"
              role="img"
              aria-label={`Dagritme van de visdeurbel (${
                MODES.find((m) => m.id === mode).label
              }). Drukst om ${fmt(peak.hour)} met gemiddeld ${Math.round(
                peak.value
              )} meldingen per uur, rustigst om ${fmt(quiet.hour)}.`}
            >
              {/* Dag/nacht-ring achter de wijzers */}
              <defs>
                <radialGradient id="belritme-night" cx="50%" cy="50%" r="50%">
                  <stop offset="55%" stopColor="rgb(1 70 60 / 0)" />
                  <stop offset="100%" stopColor="rgb(1 70 60 / 0.10)" />
                </radialGradient>
              </defs>
              <circle
                cx={CENTER}
                cy={CENTER}
                r={INNER_R + MAX_LEN + 18}
                fill="url(#belritme-night)"
              />

              {/* Uur-tikjes en labels op 0, 6, 12, 18 */}
              {[0, 6, 12, 18].map((h) => {
                const p = polar(h, INNER_R + MAX_LEN + 30);
                return (
                  <text
                    key={h}
                    className="belritme__tick"
                    x={p.x}
                    y={p.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {fmt(h)}
                  </text>
                );
              })}

              {/* Spook-silhouet van het andere ritme (alleen in filtermodi) */}
              {ghostPath && (
                <path className="belritme__ghost" d={ghostPath} />
              )}

              {/* De 24 wijzers */}
              {hours.map((h) => {
                const start = polar(h.hour, INNER_R);
                const end = polar(h.hour, tipRadius(h.norm));
                const isActive = active?.hour === h.hour;
                return (
                  <line
                    key={h.hour}
                    className={`belritme__hand${
                      isActive ? " belritme__hand--active" : ""
                    }`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={lerpColor(h.norm)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${fmt(h.hour)} uur: gemiddeld ${Math.round(
                      h.value
                    )} meldingen, ${(h.share * 100).toFixed(
                      1
                    )} procent van de dag. Klik voor de tijdlijn van dit uur.`}
                    onMouseEnter={() => setSelected(h.hour)}
                    onMouseLeave={() => setSelected(null)}
                    onFocus={() => setSelected(h.hour)}
                    onBlur={() => setSelected(null)}
                    onClick={() => pond && setClicked(h.hour)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (pond) setClicked(h.hour);
                      }
                    }}
                  />
                );
              })}

              {/* "Nu"-wijzer: dunne gouden naald naar het huidige uur */}
              {(() => {
                const tip = polar(nowHour, INNER_R + MAX_LEN + 6);
                const lbl = polar(nowHour, INNER_R + MAX_LEN + 16);
                return (
                  <g className="belritme__now" aria-hidden="true">
                    <line
                      x1={CENTER}
                      y1={CENTER}
                      x2={tip.x}
                      y2={tip.y}
                      className="belritme__now-hand"
                    />
                    <circle cx={tip.x} cy={tip.y} r={4} className="belritme__now-dot" />
                    <text
                      x={lbl.x}
                      y={lbl.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="belritme__now-label"
                    >
                      nu
                    </text>
                  </g>
                );
              })()}

              {/* Naaf met de cijfers van het actieve uur */}
              <circle
                className="belritme__hub"
                cx={CENTER}
                cy={CENTER}
                r={INNER_R - 4}
              />
              <text
                className="belritme__hub-time"
                x={CENTER}
                y={CENTER - 14}
                textAnchor="middle"
              >
                {fmt(active.hour)}
              </text>
              <text
                className="belritme__hub-value"
                x={CENTER}
                y={CENTER + 18}
                textAnchor="middle"
              >
                {Math.round(active.value)}
              </text>
              <text
                className="belritme__hub-label"
                x={CENTER}
                y={CENTER + 38}
                textAnchor="middle"
              >
                meldingen/uur
              </text>
            </svg>
          )}

          {/* Legenda voor het spook-silhouet */}
          {ghost && clicked == null && (
            <p className="belritme__ghost-legend">
              <span className="belritme__ghost-swatch" aria-hidden="true" />
              Stippellijn = ritme in het {GHOST_LABEL[mode]} ter vergelijking.
            </p>
          )}

          {/* Tijdlijn van het aangeklikte uur: elke vis is een minuut waarin
              de bel ging. Hoe groter de vis, hoe vaker in die minuut. */}
          {clicked != null && minutes && (
            <div className="belritme__timeline">
              <button
                type="button"
                className="belritme__back"
                onClick={() => {
                  setClicked(null);
                  setSpot(null);
                }}
              >
                ← Terug naar de klok
              </button>

              <h3 className="belritme__timeline-title">
                Tussen {fmt(clicked)} en {fmt((clicked + 1) % 24)}
              </h3>
              <p className="belritme__timeline-sub">
                Elke vis is een minuut waarin de bel ging (
                {MODES.find((m) => m.id === mode).label.toLowerCase()},{" "}
                {period?.label ?? "de hele periode"}). Hoe groter de vis, hoe
                vaker — in dit uur in totaal <strong>{minutesTotal}×</strong>.
              </p>

              {minutesTotal === 0 ? (
                <p className="belritme__timeline-spot">
                  In dit uur is de bel niet één keer gebruikt. Sssst, de vissen
                  slapen.
                </p>
              ) : (
                <>
                  <svg
                    className="belritme__timeline-svg"
                    viewBox={`0 0 ${TL_W} ${TL_H}`}
                    role="img"
                    aria-label={`Tijdlijn van ${fmt(clicked)} tot ${fmt(
                      (clicked + 1) % 24
                    )}: per minuut hoe vaak de bel ging.`}
                  >
                    {/* Tijd-as met kwartierstreepjes */}
                    <line
                      className="belritme__timeline-as"
                      x1={tlX(0)}
                      y1={TL_AXIS_Y}
                      x2={tlX(60)}
                      y2={TL_AXIS_Y}
                    />
                    {[0, 15, 30, 45, 60].map((min) => (
                      <g key={min}>
                        <line
                          className="belritme__timeline-as"
                          x1={tlX(min)}
                          y1={TL_AXIS_Y - 5}
                          x2={tlX(min)}
                          y2={TL_AXIS_Y + 5}
                        />
                        <text
                          className="belritme__tick"
                          x={tlX(min)}
                          y={TL_AXIS_Y + 26}
                          textAnchor="middle"
                        >
                          {min === 60 ? fmt((clicked + 1) % 24) : fmtMin(min)}
                        </text>
                      </g>
                    ))}

                    {/* Per minuut één vis op drie "zwemhoogtes" tegen overlap */}
                    {minutes.map((count, min) => {
                      if (!count) return null;
                      const f = fishPool[min % fishPool.length];
                      const size = 16 + (count / minutesMax) * 22;
                      const x = tlX(min + 0.5);
                      const y = TL_AXIS_Y - 28 - (min % 3) * 26;
                      return (
                        <image
                          key={min}
                          className="belritme__fish"
                          href={f.img}
                          x={x - size / 2}
                          y={y - size / 2}
                          width={size}
                          height={size}
                          preserveAspectRatio="xMidYMid meet"
                          tabIndex={0}
                          aria-label={`${fmtMin(min)}: ${count} meldingen (${
                            f.name
                          })`}
                          onMouseEnter={() => setSpot(min)}
                          onMouseLeave={() => setSpot(null)}
                          onFocus={() => setSpot(min)}
                          onBlur={() => setSpot(null)}
                          style={{ "--i": min }}
                        >
                          <title>{`${fmtMin(min)} · ${count}× gebeld · ${
                            f.name
                          }`}</title>
                        </image>
                      );
                    })}
                  </svg>

                  <p className="belritme__timeline-spot">
                    {spot != null ? (
                      <>
                        Om <strong>{fmtMin(spot)}</strong> ging de bel{" "}
                        <strong>{minutes[spot]}×</strong> — hier zwemt een{" "}
                        {fishPool[spot % fishPool.length].name}.
                      </>
                    ) : (
                      "Beweeg over een vis voor het precieze moment."
                    )}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tekstuele duiding + toegankelijke datatabel */}
        {hours && (
          <aside className="belritme__insights">
            <p className="belritme__insight">
              Het wordt het drukst rond <strong>{fmt(peak.hour)}</strong> — dan
              gaat de bel gemiddeld <strong>{Math.round(peak.value)}×</strong>{" "}
              per uur.
            </p>
            <p className="belritme__insight">
              Om <strong>{fmt(quiet.hour)}</strong> is het het rustigst, met
              zo'n <strong>{Math.round(quiet.value)}×</strong> per uur.
            </p>
            <p className="belritme__insight">
              In het weekend gaat de bel ruim <strong>{weekendVsWeek}%</strong>{" "}
              vaker dan doordeweeks.
            </p>
            <p className="belritme__note">{narrative}</p>

            <table className="belritme__sr-only">
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
                {hours.map((h) => (
                  <tr key={h.hour}>
                    <th scope="row">{fmt(h.hour)}</th>
                    <td>{Math.round(h.value)}</td>
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
