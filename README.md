# # Visdeurbel — Datavisualisaties

Overdrachts­documentatie voor Studio MOAN. Dit is de broncode van de scrollytelling-website die de Visdeurbel-data visualiseert: van vistrek-pieken tot bezoekersherkomst. Gebouwd door vier studenten CMD (Hogeschool van Amsterdam) als meesterproef, juni 2026.

---

## Snelstart

**Vereisten:** [Node.js](https://nodejs.org/) v18 of hoger.

```bash
# installeer dependencies
npm install

# start de ontwikkelserver (http://localhost:5173)
npm run dev

# maak een productiebuild
npm run build

# bekijk de productiebuild lokaal
npm run preview
```

---

## Projectstructuur

```
vis/
├── public/
│   ├── json/
│   │   ├── vis-data.json        # maanddata (gegenereerd door Python)
│   │   └── vis-data-week.json   # weekdata  (gegenereerd door Python)
│   ├── images/                  # visfotos (PNG)
│   └── styles/                  # alle CSS-bestanden
├── src/
│   ├── App.jsx                  # routering (/, /julius, /mitchell)
│   ├── main.jsx                 # React entrypoint
│   ├── pages/
│   │   └── Home.jsx             # hoofdpagina: samenstelling van alle visualisaties
│   ├── components/
│   │   ├── carousel/            # vis-carrousel (Julius)
│   │   ├── clock/               # 24-uursklok (Julius)
│   │   ├── footer/              # gedeelde footer
│   │   ├── header/              # gedeelde header
│   │   ├── mitchell-components/ # scrollytelling-hoofdstukken (Mitchell)
│   │   ├── timeline/            # scrollende tijdlijn-tabel (Nienke)
│   │   └── world-map/           # roterende wereldbol (Joost)
│   ├── hooks/
│   │   └── useStylesheet.js     # laad CSS dynamisch per pagina
│   └── scripts/
│       └── mitchell.js          # gedeelde scrollytelling-motor
├── json/
│   ├── build_visdata.py         # Python-aggregatie: NDJSON → vis-data.json
│   └── csv_to_json.py           # hulpscript voor CSV-invoer
├── STYLEGUIDE.md                # kleur-, typografie- en spacingtokens
├── DESIGN-RATIONALE.md          # waarom-uitleg achter de ontwerpkeuzes
└── contributions.md             # wie wat heeft gebouwd (uitgebreid)
```

---

## Datapijplijn

De ruwe event-log van de Visdeurbel is ~288 MB NDJSON — te groot voor de browser. Een Python-script aggregeert dit vooraf naar compacte JSON-bestanden (~40 KB) die de frontend direct kan inladen.

### Data bijwerken

1. Zet het nieuwe NDJSON-bestand in de `json/`-map.
2. Pas het pad bovenin `json/build_visdata.py` aan naar jouw bestand.
3. Voer het script uit:

```bash
cd json
python build_visdata.py
```

4. Kopieer de gegenereerde bestanden naar `public/json/`:

```bash
cp vis-data.json ../public/json/vis-data.json
cp vis-data-week.json ../public/json/vis-data-week.json
```

5. Herstart de dev-server of maak opnieuw een build.

Het script leest velden als `event_name`, `country`, `city`, `created_at` en `referrer_query` en schrijft geaggregeerde tellingen per land, vissoort, taal en uur van de dag. De visualisaties lezen de lengte van de data-arrays automatisch uit, dus zowel week- als maanddata werken zonder code te wijzigen.

---

## Visualisaties

### Vis-carrousel — `components/carousel/`

Een Embla Carousel die de meest geziene vissoorten toont. Klik op een vis voor een dialog met statistieken: aantal meldingen, aandeel van het totaal en rang. Gebouwd door **Julius**.

Relevante bestanden:
- [EmblaCarousel.jsx](src/components/carousel/EmblaCarousel.jsx) — carrousel-wrapper
- [FishSlide.jsx](src/components/carousel/FishSlide.jsx) — individuele vis-slide
- [dialog.jsx](src/components/carousel/dialog.jsx) — statistieken-popup
- [CarouselControls.jsx](src/components/carousel/CarouselControls.jsx) — vorige/volgende-knoppen

### 24-uursklok — `components/clock/`

Een analoge klok met 24 wijzers, één per uur. Wijzerlengte geeft drukte aan; klik een uur aan voor een uitsplitsing in zes blokken van 10 minuten. Volledig toetsenbord- en schermlezer-toegankelijk via ARIA-labels en een verborgen datatable. Gebouwd door **Julius**.

Relevant bestand: [Clock.jsx](src/components/clock/Clock.jsx)

### Scrollende tijdlijn — `components/timeline/`

Een toegankelijke HTML-`<table>` met één rij per uur. Terwijl je scrollt, animeren de balken in beeld en zwemt een vis langs om het drukste uur aan te geven. Gebouwd door **Nienke**.

Relevante bestanden:
- [day-scroll.jsx](src/components/timeline/day-scroll.jsx)

### Wereldbol — `components/world-map/`

Een roterende D3-globe met drie modi: Bezoeken, Vissoort en Tijdstip. Klik op een land voor een uitklapkaart met statistieken. Volledig toetsenbordnavigeerbaar. Gebouwd door **Joost**.

Relevante bestanden:
- [GlobeMap.jsx](src/components/world-map/GlobeMap.jsx) — hoofd-component
- [useJoostData.js](src/components/world-map/useJoostData.js) — data-hook
- [CountryList.jsx](src/components/world-map/CountryList.jsx) — landen-lijst naast de globe

### Scrollytelling-hoofdstukken — `components/mitchell-components/`

Vijf hoofdstukken die op volgorde onthuld worden terwijl je scrollt:

| Component | Wat het toont |
|---|---|
| [DataCarousel.jsx](src/components/mitchell-components/DataCarousel.jsx) | Acht feitelijke statistieken als slides |
| [Aquarium.jsx](src/components/mitchell-components/Aquarium.jsx) | Levend aquarium: vissen proportioneel aan echte meldingen |
| [RadarChapter.jsx](src/components/mitchell-components/RadarChapter.jsx) | Sonar-radar per vissoort met tijdschuifregelaar |
| [LanguagesChapter.jsx](src/components/mitchell-components/LanguagesChapter.jsx) | Drijvende begroetingen per bezoekers­taal |
| [NetChapter.jsx](src/components/mitchell-components/NetChapter.jsx) | Bubbelgrafiek: aantal/gewicht/biomassa per soort |

Gebouwd door **Mitchell**. De Maand/Week-schakelaar ([DataSwitch.jsx](src/components/mitchell-components/DataSwitch.jsx)) wisselt alle hoofdstukken tegelijk van dataset.

---

## Design systeem

Alle kleur-, typografie- en spacing-tokens staan in [`public/styles/visdeurbel-tokens.css`](public/styles/visdeurbel-tokens.css). Gebruik altijd de token-namen (bijv. `--color-primary`, `--space-4`) en nooit hardcoded waarden — zo blijft de styling consistent.

De volledige uitleg staat in [STYLEGUIDE.md](STYLEGUIDE.md). Korte samenvatting:

- **Fonts:** Bricolage Grotesque ExtraBold (koppen) en PT Sans (broodtekst)
- **Primaire kleur:** donkergroen `#01463c`
- **Accent:** paars `#c0a8ff`, teal `#1eacb0`
- **Achtergrond:** off-white `#fdf7ef`
- **Breekpunt:** 768px (daaronder alles gestapeld, kleinere tekst)
- **Dark mode:** activeer via `data-theme="dark"` op `<html>`

---

## Bouwen voor productie

```bash
npm run build
```

Dit genereert een `dist/`-map met alle statische bestanden. Die map kan rechtstreeks gehost worden op elke statische hostingdienst (Netlify, Vercel, GitHub Pages, een eigen server).

**Let op:** de JSON-databestanden in `public/json/` worden meegenomen in de build. Zorg dat je de meest recente versie hebt gegenereerd vóór je bouwt.

---

## Afhankelijkheden

| Pakket | Versie | Gebruik |
|---|---|---|
| React | ^18.3 | UI-framework |
| React Router DOM | ^6.28 | Paginanavigatie |
| D3 | ^7.9 | Alle datavisualisaties |
| Embla Carousel | ^8.6 | Vis-carrousel en feitenslideshows |
| Topojson-client | ^3.1 | Wereldkaart-geodata |
| GSAP | ^3.15 | Animaties (scrollytelling) |
| Vite | ^6.0 | Bundler en dev-server |

---

## Team

| Naam | Onderdeel |
|---|---|
| Julius | Vis-carrousel, 24-uursklok, footer, navigatie |
| Mitchell | Scrollytelling-motor, Aquarium, RadarChapter, LanguagesChapter, NetChapter, DataCarousel |
| Nienke | Scrollende tijdlijn-tabel |
| Joost | Roterende wereldbol, datapijplijn wereldkaart |

Opdrachtgever: **Studio MOAN**, Utrecht — contact via Cyd Stumpel.
Begeleider: **Jad Joubran** (toegankelijkheid), **Vasilis van Gemert** (design).

---

## Meer documentatie

- [STYLEGUIDE.md](STYLEGUIDE.md) — volledige design-token-referentie
- [DESIGN-RATIONALE.md](DESIGN-RATIONALE.md) — waarom-uitleg achter elke keuze
- [contributions.md](contributions.md) — uitgebreide week-voor-week beschrijving per teamlid
