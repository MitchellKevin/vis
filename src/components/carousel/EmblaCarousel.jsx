import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { fish } from "./fish";
import FishSlide from "./FishSlide";
import CarouselControls from "./CarouselControls";
import Dialog from "./dialog";

// Houdt bij of de carousel naar links/rechts kan scrollen,
// zodat de pijlknoppen op het juiste moment uitgeschakeld worden.
function useCarouselNav(emblaApi) {
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  useEffect(() => {
    if (!emblaApi) return;
    // Werkt de "kan vorige/volgende" status bij na elke verschuiving.
    const onSelect = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    emblaApi.on("select", onSelect).on("reInit", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect).off("reInit", onSelect);
    };
  }, [emblaApi]);

  // Schuift de carousel één stap terug, resp. vooruit.
  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  return { canScrollPrev, canScrollNext, scrollPrev, scrollNext };
}

// Laadt de meldingen-per-vis uit vis-data.json en berekent per soort
// het aantal, het aandeel en de positie in de ranglijst.
function useFishStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/json/vis-data.json")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const species = data.species ?? {};
        const total = Object.values(species).reduce((sum, n) => sum + n, 0);
        const ranked = Object.entries(species).sort((a, b) => b[1] - a[1]);

        const byName = {};
        ranked.forEach(([name, count], i) => {
          byName[name] = {
            count,
            share: total ? count / total : 0,
            rank: i + 1,
          };
        });

        setStats({ period: data.period, speciesCount: ranked.length, byName });
      })
      .catch(() => {}); // dialog werkt ook zonder data (toont dan alleen naam + tekst)
    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}

// Beheert welke vissen aangevinkt zijn (toggle per id).
function useFishChecklist() {
  const [checked, setChecked] = useState(new Set());

  // Voegt de vis toe aan de aangevinkte set, of haalt hem eruit als hij er al in zat.
  function toggleFish(id) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  // Geeft terug of een vis op dit moment aangevinkt is.
  const isChecked = (id) => checked.has(id);

  return { isChecked, toggleFish };
}

// Hoofdcomponent: rendert alle vis-slides, de navigatieknoppen en de detail-dialog.
export default function EmblaCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
  });
  const { canScrollPrev, canScrollNext, scrollPrev, scrollNext } =
    useCarouselNav(emblaApi);
  const { isChecked, toggleFish } = useFishChecklist();
  const stats = useFishStats();

  // Welke vis er in de dialog getoond wordt (null = dialog dicht).
  const [activeFish, setActiveFish] = useState(null);
  const activeStat = stats?.byName[activeFish?.name] ?? null;

  return (
    <section className="embla">
      <div className="embla__viewport" ref={emblaRef}>
        <div className="embla__container">
          {fish.map((f) => (
            <FishSlide
              key={f.id}
              fish={f}
              isChecked={isChecked(f.id)}
              onToggle={() => toggleFish(f.id)}
              onOpen={() => setActiveFish(f)}
            />
          ))}
        </div>
      </div>

      <CarouselControls
        canScrollPrev={canScrollPrev}
        canScrollNext={canScrollNext}
        onPrev={scrollPrev}
        onNext={scrollNext}
      />

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
              src={activeFish.img}
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
                      #{activeStat.rank} van {stats.speciesCount}
                    </dd>
                  </div>
                </dl>
                {stats.period && (
                  <p className="fish-dialog__period">
                    Periode: {stats.period.label}
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
