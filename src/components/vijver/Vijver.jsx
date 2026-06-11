import { useEffect, useState } from "react";
import { fish } from "../carousel/fish";
import Dialog from "../carousel/dialog";

// Aantal vissen in de vijver. Ze worden over de soorten verdeeld naar rato
// van hun aandeel in de meldingen.
const POND_FISH = 30;

// Verdeel de vissen over de soorten op basis van de echte meldingen-data:
// vaak gemelde soorten krijgen meer exemplaren, elke voorkomende soort minstens
// één. Elk exemplaar krijgt eigen positie/snelheid/grootte om te zwemmen.
function buildPool(species, fishByName) {
  const entries = Object.entries(species).filter(([name]) => fishByName[name]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (!total) return [];

  const pool = [];
  entries.forEach(([name, count]) => {
    const amount = Math.max(1, Math.round((count / total) * POND_FISH));
    for (let i = 0; i < amount; i++) {
      const scale = 0.6 + Math.random() * 0.5; // grotere vis = dichterbij
      const duration = 16 + Math.random() * 10; // 16–26s om over te zwemmen
      pool.push({
        key: `${name}-${i}`,
        fish: fishByName[name],
        top: 6 + Math.random() * 76, // 6–82% verticaal
        left: Math.random() * 92, // statische x (bij reduced-motion)
        scale,
        duration,
        delay: -Math.random() * duration, // meteen verspreid
        dir: Math.random() < 0.5 ? "right" : "left",
        z: Math.round(scale * 100),
      });
    }
  });
  return pool;
}

export default function Vijver() {
  const [data, setData] = useState(null);
  const [activeFish, setActiveFish] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/json/vis-data.json")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const species = json.species ?? {};
        const fishByName = Object.fromEntries(fish.map((f) => [f.name, f]));

        // Stats per soort voor in de pop-up (aantal, aandeel, rang).
        const total = Object.values(species).reduce((s, n) => s + n, 0);
        const ranked = Object.entries(species).sort((a, b) => b[1] - a[1]);
        const byName = {};
        ranked.forEach(([name, count], i) => {
          byName[name] = {
            count,
            share: total ? count / total : 0,
            rank: i + 1,
          };
        });

        setData({
          period: json.period,
          total,
          speciesCount: ranked.length,
          byName,
          pool: buildPool(species, fishByName),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const activeStat = data?.byName[activeFish?.name] ?? null;

  return (
    <section className="vijver" aria-labelledby="vijver-title">
      <header className="vijver__head">
        <h1 id="vijver-title">Wie stond er voor de visdeurbel?</h1>
        {data && (
          <p className="vijver__sub">
            {data.period?.label} · {data.total.toLocaleString("nl-NL")}{" "}
            meldingen. Elke vis in de vijver staat voor een soort die zich
            meldde — hoe vaker gemeld, hoe meer exemplaren. Tik op een vis voor
            de cijfers.
          </p>
        )}
      </header>

      {/* De vijver */}
      <div className="vijver__pool">
        <div className="vijver__water" aria-hidden="true" />
        <ul className="vijver__fishes" aria-label="Vissen in de vijver">
          {(data?.pool ?? []).map((f) => (
            <li
              key={f.key}
              className={`vijver__fish vijver__fish--${f.dir}`}
              style={{
                "--top": `${f.top}%`,
                "--left": `${f.left}%`,
                "--scale": f.scale,
                "--dur": `${f.duration}s`,
                "--delay": `${f.delay}s`,
                zIndex: f.z,
              }}
            >
              <button
                className="vijver__fish-btn"
                onClick={() => setActiveFish(f.fish)}
                aria-label={`Meer over de ${f.fish.name}`}
              >
                <img
                  className="vijver__fish-img"
                  src={f.fish.img}
                  alt=""
                  draggable="false"
                />
              </button>
            </li>
          ))}
        </ul>
        {!data && <p className="vijver__loading">Vissen worden geladen…</p>}
      </div>

      {/* Detail-dialog: echte foto (valt terug op de PNG) + cijfers */}
      {activeFish && (
        <Dialog
          onClose={() => setActiveFish(null)}
          labelledBy="fish-dialog-title"
        >
          <div className="fish-dialog__content">
            <button
              className="fish-dialog__close"
              onClick={() => setActiveFish(null)}
              aria-label="Sluiten"
            >
              &times;
            </button>
            <img
              className="fish-dialog__img"
              src={activeFish.photo ?? activeFish.img}
              alt={activeFish.name}
            />
            <h2 id="fish-dialog-title">{activeFish.name}</h2>
            <p className="fish-dialog__lead">{activeFish.info}</p>

            {activeStat && (
              <>
                <dl className="fish-dialog__stats">
                  <div className="fish-dialog__stat">
                    <dt>Meldingen</dt>
                    <dd>{activeStat.count.toLocaleString("nl-NL")}</dd>
                  </div>
                  <div className="fish-dialog__stat">
                    <dt>Aandeel</dt>
                    <dd>{(activeStat.share * 100).toFixed(1)}%</dd>
                  </div>
                  <div className="fish-dialog__stat">
                    <dt>Positie</dt>
                    <dd>
                      #{activeStat.rank} van {data.speciesCount}
                    </dd>
                  </div>
                </dl>
                {data.period && (
                  <p className="fish-dialog__period">
                    Periode: {data.period.label}
                  </p>
                )}
              </>
            )}
          </div>
        </Dialog>
      )}
    </section>
  );
}
