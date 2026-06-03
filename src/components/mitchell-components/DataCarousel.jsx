import { useEffect, useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { COUNTRY_GEO } from '../../scripts/mitchell/constants.js';

// Leuke-feiten carousel — leest de Visdeurbel-data en zet die om in losse
// kaartjes met grote koppen, paarse highlights en een korte toelichting (?).
const nl = (n) => Number(n || 0).toLocaleString('nl-NL');
const hl = (x) => <strong className="fact__hl">{x}</strong>;

function buildFacts(d) {
  const countryName = (code) => (COUNTRY_GEO[code] && COUNTRY_GEO[code][2]) || code;

  const countries = Object.entries(d.geo?.countries || {})
    .map(([k, v]) => [k, typeof v === 'object' ? v.n : v])
    .sort((a, b) => b[1] - a[1]);
  const geoTotal = d.geo?.total || countries.reduce((s, [, v]) => s + v, 0) || 1;

  const species = Object.entries(d.species || {}).sort((a, b) => b[1] - a[1]);

  const byHour = new Array(24).fill(0);
  (d.weekHours || []).forEach((v, i) => { byHour[i % 24] += v; });
  const busyHour = byHour.indexOf(Math.max(...byHour));
  const quietHour = byHour.indexOf(Math.min(...byHour));

  const dev = d.tech?.device || {};
  const devTotal = Object.values(dev).reduce((a, b) => a + b, 0) || 1;
  const mobilePct = Math.round(((dev.mobile || 0) / devTotal) * 100);

  const s = d.sessions || {};
  const langs = d.languages || [];

  return [
    {
      emoji: '🌍',
      body: <>In één maand ging de Visdeurbel {hl(`${nl(geoTotal)}×`)} — vanuit maar liefst {hl(`${countries.length} landen`)}.</>,
      note: `Bel-oproepen in de periode ${d.period?.label || ''}.`,
    },
    {
      emoji: '🔔',
      body: <>{hl(nl(s.ringers))} mensen drukten samen {hl(`${nl(s.totalRings)}×`)} op de knop om een vis door de sluis te helpen.</>,
      note: 'Unieke bezoekers die minstens één keer aanbelden.',
    },
    {
      emoji: '🏆',
      body: <>De fanatiekste beller ging maar liefst {hl(`${nl(s.maxRings)}×`)} voor de bel.</>,
      note: `Gemiddeld belt iemand ${nl(s.avgPerRinger)}× aan.`,
    },
    {
      emoji: '🇺🇸',
      body: <>{hl(countryName(countries[0]?.[0]))} kijkt het vaakst mee ({hl(`${Math.round((countries[0]?.[1] / geoTotal) * 100)}%`)}), met {hl(countryName(countries[1]?.[0]))} op de hielen.</>,
      note: 'Eén Utrechtse sluis, een wereldwijd publiek.',
    },
    {
      emoji: '🐟',
      body: <>De {hl(species[0]?.[0])} is de meest gespotte vis ({hl(`${nl(species[0]?.[1])}×`)}), gevolgd door de {hl(species[1]?.[0])}.</>,
      note: 'Op basis van de doorgestuurde vis-foto’s.',
    },
    {
      emoji: '⏰',
      body: <>Rond {hl(`${busyHour}:00 uur`)} gaat de bel het vaakst — om {hl(`${quietHour}:00`)} slaapt zelfs de sluiswachter.</>,
      note: 'Alle belmomenten opgeteld per uur van de dag.',
    },
    {
      emoji: '🗣️',
      body: <>De sluis spreekt {hl(`${langs.length} talen`)} tegelijk — naast Nederlands vooral Engels, Pools en Duits.</>,
      note: 'Taal-instelling van de browsers die meekeken.',
    },
    {
      emoji: '📱',
      body: <>{hl(`${mobilePct}%`)} van de bellers kijkt mee vanaf de telefoon.</>,
      note: 'De rest kijkt op laptop, tablet of desktop.',
    },
  ];
}

export default function DataCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'center', loop: false });
  const [facts, setFacts] = useState([]);
  const [selected, setSelected] = useState(0);
  const [showNote, setShowNote] = useState(false);
  const [nav, setNav] = useState({ prev: false, next: true });

  useEffect(() => {
    let alive = true;
    fetch('/json/vis-data.json')
      .then((r) => r.json())
      .then((d) => { if (alive) setFacts(buildFacts(d)); })
      .catch(() => { /* data niet beschikbaar — carousel blijft leeg */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!emblaApi || !facts.length) return;
    const onSelect = () => {
      const snap = emblaApi.selectedScrollSnap();
      setSelected(snap);
      setNav({ prev: emblaApi.canScrollPrev(), next: emblaApi.canScrollNext() });
      setShowNote(false);
    };
    emblaApi.on('select', onSelect).on('reInit', onSelect);
    onSelect();
    return () => { emblaApi.off('select', onSelect).off('reInit', onSelect); };
  }, [emblaApi, facts]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  if (!facts.length) return null;

  return (
    <section className="fact-carousel" aria-label="De Visdeurbel in cijfers">
      <div className="fact-carousel__head">
        <p className="fact-carousel__eyebrow">Wist je dat?</p>
        <h2 className="fact-carousel__title">De Visdeurbel in cijfers</h2>
      </div>

      <div className="fact-carousel__viewport" ref={emblaRef}>
        <div className="fact-carousel__container">
          {facts.map((f, i) => (
            <div className="fact-slide" key={i} aria-hidden={i !== selected}>
              <span className="fact-slide__emoji" aria-hidden="true">{f.emoji}</span>
              <p className="fact-slide__text">{f.body}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="fact-carousel__note" data-open={showNote} role="status" aria-live="polite">
        {showNote ? facts[selected]?.note : ''}
      </p>

      <div className="fact-carousel__controls">
        <div className="fact-carousel__arrows">
          <button className="fact-arrow" onClick={scrollPrev} disabled={!nav.prev} aria-label="Vorige feit">←</button>
          <button className="fact-arrow" onClick={scrollNext} disabled={!nav.next} aria-label="Volgende feit">→</button>
        </div>
        <div className="fact-carousel__line" role="presentation" />
        <button
          className="fact-help"
          onClick={() => setShowNote((v) => !v)}
          aria-pressed={showNote}
          aria-label="Toelichting bij dit feit"
        >?</button>
      </div>
    </section>
  );
}
