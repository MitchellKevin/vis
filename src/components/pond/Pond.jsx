import { useEffect, useState } from "react";
import { fish } from "../carousel/fish";
import Dialog from "../carousel/dialog";

const POND_FISH = 30;

function buildPool(species, fishByName) {
  const entries = Object.entries(species).filter(([name]) => fishByName[name]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (!total) return [];

  const pool = [];
  entries.forEach(([name, count]) => {
    const amount = Math.max(1, Math.round((count / total) * POND_FISH));
    for (let i = 0; i < amount; i++) {
      const scale = 0.6 + Math.random() * 0.5;
      const duration = 16 + Math.random() * 10;
      pool.push({
        key: `${name}-${i}`,
        fish: fishByName[name],
        top: 6 + Math.random() * 76,
        left: Math.random() * 92,
        scale,
        duration,
        delay: -Math.random() * duration,
        dir: Math.random() < 0.5 ? "right" : "left",
        z: Math.round(scale * 100),
      });
    }
  });
  return pool;
}

export default function Pond() {
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
    <section className="pond" aria-labelledby="pond-title">
      <header className="pond__head">
        <h1 id="pond-title">Wie stond er voor de visdeurbel?</h1>
        {data && (
          <p className="pond__sub">
            {data.period?.label} · {data.total.toLocaleString("nl-NL")}{" "}
            meldingen. Elke vis in de vijver staat voor een soort die zich
            meldde — hoe vaker gemeld, hoe meer exemplaren. Tik op een vis voor
            de cijfers.
          </p>
        )}
      </header>

      {/* De vijver */}
      <div className="pond__pool">
        <div className="pond__water" aria-hidden="true" />
        <ul className="pond__fishes" aria-label="Vissen in de vijver">
          {(data?.pool ?? []).map((f) => (
            <li
              key={f.key}
              className={`pond__fish pond__fish--${f.dir}`}
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
                className="pond__fish-btn"
                onClick={() => setActiveFish(f.fish)}
                aria-label={`Meer over de ${f.fish.name}`}
              >
                <img
                  className="pond__fish-img"
                  src={f.fish.img}
                  alt=""
                  draggable="false"
                />
              </button>
            </li>
          ))}
        </ul>
        {!data && <p className="pond__loading">Vissen worden geladen…</p>}
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
