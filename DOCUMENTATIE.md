# Visdeurbel — Vangstdata 2026: Projectdocumentatie

> Datavisualisatie van de vangstdata van de Visdeurbel in Utrecht.  
> Twaalf interactieve hoofdstukken die de vistrek door de Weerdsluis in beeld brengen.

---

## Inhoudsopgave

1. [Projectoverzicht](#1-projectoverzicht)
2. [Bestandsstructuur](#2-bestandsstructuur)
3. [Datapipeline](#3-datapipeline)
4. [HTML — `index copy.html`](#4-html--index-copyhtml)
5. [CSS — `styles/style.css`](#5-css--stylesStylecss)
6. [JavaScript — `scripts/main.js`](#6-javascript--scriptsmainjs)
7. [Actieve en inactieve hoofdstukken](#7-actieve-en-inactieve-hoofdstukken)
8. [Opstarten (lokaal)](#8-opstarten-lokaal)

---

## 1. Projectoverzicht

De website toont vangstdata van de Visdeurbel: een camera bij de Weerdsluis in Utrecht die automatisch fisupload-meldingen bijhoudt wanneer bezoekers op de digitale bel drukken. De ruwe event-log wordt verwerkt tot een compacte JSON, die de website asynchroon inlaadt voordat de visualisaties opstarten.

**Gebruikte technologieën**

| Technologie | Doel |
|---|---|
| D3.js v7 | SVG-visualisaties (ring, radar, net, sluis, klok) |
| Canvas API | Aquarium-animatie (flocking) en stromingsvisualisatie |
| IntersectionObserver | Lazy-init van hoofdstukken bij scrollen |
| `fetch` + async/await | Asynchroon laden van `vis-data.json` |
| Python 3 (fpdf2) | Codeuitleg PDF genereren |
| `python3 -m http.server` | Lokale ontwikkelserver (verplicht vanwege `fetch`) |

---

## 2. Bestandsstructuur

```
vis/
├── index copy.html          # Actieve pagina (alleen hoofdstukken 0, 6, 8, 9, 11, 12, 13)
├── index.html               # Originele pagina (alle 14 hoofdstukken, inline CSS)
├── DOCUMENTATIE.md          # Dit bestand
│
├── scripts/
│   └── main.js              # Alle visualisatielogica (~1822 regels)
│
├── styles/
│   └── style.css            # Alle styling (~1174 regels)
│
└── json/
    ├── vis-data.json        # Verwerkte data (gegenereerd door csv_to_json.py)
    ├── event-maand.json     # Ruwe JSONL-eventlog — 31 dagen (267.259 regels)
    ├── event-week.json      # Ruwe JSONL-eventlog — 9 dagen (eerder gebruikt)
    ├── website_event-maand.csv
    ├── website_event-week.csv
    └── csv_to_json.py       # Verwerkingsscript: JSONL → vis-data.json
```

---

## 3. Datapipeline

### Bronbestand: `json/event-maand.json`

- **Formaat:** JSONL (één JSON-object per regel)
- **Periode:** 18 april 2026 – 18 mei 2026 (31 dagen)
- **Omvang:** ~267.259 regels, ~275 MB
- **Relevante events:** `uploadedFish` — gebruiker heeft een foto geüpload met `fish=<soort>` in de `referrer_query`

### Verwerkingsscript: `json/csv_to_json.py`

Het Python-script leest `event-maand.json` en genereert `vis-data.json` met de volgende structuur:

```json
{
  "period": {
    "start": "2026-04-18",
    "end": "2026-05-18",
    "label": "18 apr – 18 mei 2026"
  },
  "totalUploads": 49739,
  "species": {
    "Alver": 3508,
    "Paling": 3265,
    "Baars": 2759,
    ...
  },
  "daily": {
    "107": 45,
    "108": 20,
    ...
  },
  "weekDays": ["2026-04-18", ..., "2026-05-18"],
  "weekDayLabels": ["18 apr", ..., "18 mei"],
  "weekHours": [0, 0, 3, 12, ..., 446, ...]
}
```

| Veld | Beschrijving |
|---|---|
| `species` | Aantal uploads per vissoort |
| `daily` | Dagelijks totaal, geïndexeerd op dag-van-het-jaar (bijv. 107 = 17 april) |
| `weekDayLabels` | Array van 31 leesbare daginscripties voor de ringkalender |
| `weekHours` | Array van 744 waarden (31 × 24 uur), het aantal beldrukken per uur |

**Piekdag:** 17 mei 2026 met 7.878 uploads.

### Uitvoerbestand: `json/vis-data.json`

Dit compacte bestand (~4,5 KB) is wat de website via `fetch` inlaadt. Het is bewust klein gehouden zodat laadtijd minimaal is.

---

## 4. HTML — `index copy.html`

`index copy.html` is de actieve versie van de pagina. Het laadt externe CSS en JavaScript als losse bestanden (i.t.t. `index.html` dat alles inline heeft).

### Vereiste externe resources

```html
<link rel="stylesheet" href="styles/style.css" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces...&family=DM+Mono..." />
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-sankey@0.12"></script>
<script src="scripts/main.js"></script>
```

> **Belangrijk:** `main.js` gebruikt `fetch('json/vis-data.json')`. Dit werkt **niet** via het `file://`-protocol. De pagina moet via een HTTP-server worden geopend.

### SVG Symbolenbibliotheek

De HTML bevat een verborgen `<svg>` met herbruikbare `<symbol>`-definities voor alle visvormen:

| Symbol-ID | Beschrijving | Gebruikt door |
|---|---|---|
| `#fish-round` | Ronde vis (brasem-type) | Blankvoorn, Brasem, Kolblei, Ruisvoorn |
| `#fish-baars` | Baars met rugvin | Baars, Winde |
| `#fish-pred` | Langwerpige roofvis | Snoek, Snoekbaars |
| `#fish-long` | Aal-achtige langwerpige vis | Paling, Meerval |
| `#fish-tiny` | Klein visje | Alver |
| `#fish-etch-*` | Gravure-stijl varianten | Gebruikt in het Journaal (h12) |

### Actieve secties in de HTML

De volgende secties zijn actief (niet in HTML-commentaar):

- `#ch-dive` — Introductie / duikanimatie
- `#ch-aquarium` — Canvas aquarium
- `#ch-ring` — Ringkalender
- `#ch-radar` — Visradar
- `#ch-net` — Bubble-pakdiagram
- `#ch-journal` — Logboek
- `#ch-outro` — Afsluiting

De volgende secties staan in HTML-commentaar (`<!-- ... -->`):

- `#ch-bell`, `#ch-race`, `#ch-sluis`, `#ch-clock`, `#ch-strata`, `#ch-flow`, `#ch-habitat`

---

## 5. CSS — `styles/style.css`

De stylesheet gebruikt CSS Custom Properties (design tokens) en is georganiseerd per hoofdstuk.

### Design tokens (`--variabele`)

```css
--bg-deep:    #051321   /* diepste waterachtergrond */
--bg-mid:     #08203a
--bg-shallow: #0d2e4f
--foam:       #7ec8e3   /* primaire tekstkleur (lichtblauw) */
--sun:        #f4c560   /* accentkleur (goud) */
--coral:      #ff7849
--reed:       #5a8a3f
--paper:      #efe6d2   /* achtergrond journaal */
--ink:        #1a1a14   /* tekstkleur op papier */
--serif:      'Fraunces', Georgia, serif
--mono:       'DM Mono', 'JetBrains Mono', monospace
--easing:     cubic-bezier(0.16, 1, 0.3, 1)
```

### Opvallende CSS-technieken

- **`.reveal`** — elementen starten onzichtbaar (`opacity: 0; transform: translateY(28px)`), worden zichtbaar zodra de parent `.visible` krijgt via `IntersectionObserver`
- **`.atmosphere`** — `position: fixed` achtergrondlaag met caustics-animatie en bubbelstroom
- **`.chapter`** — `min-height: 100vh`, sticky scroll-gedrag voor `#ch-dive`
- **`@media (prefers-reduced-motion)`** — schakelt alle animaties uit

---

## 6. JavaScript — `scripts/main.js`

Het script is ~1822 regels en verdeeld in duidelijk afgebakende secties.

### 6.1 Datastructuur

```js
const visData = [
  { naam: 'Blankvoorn', count: 0, color: '#7ec8e3', weight: 0.3,
    shape: 'round', diepte: 'mid', habitat: 'open' },
  // ... 11 andere soorten
];
let TOTAL = 0;
```

Alle counts starten op `0` en worden gevuld door `boot()`. Hierdoor gedraagt het script zich correct zelfs als `vis-data.json` niet laadt (fallback naar gegenereerde data).

**Extra globals voor de ringkalender:**

```js
let weekHours     = [];   // 744 waarden (31 × 24 uur)
let weekDayLabels = [];   // 31 leesbare labels
let periodLabel   = '';   // bijv. "18 APR – 18 MEI 2026"
```

### 6.2 Hulpfuncties

| Functie | Beschrijving |
|---|---|
| `mulberry32(seed)` | Reproduceerbare pseudo-random number generator |
| `generateMonthly(total)` | Verdeelt een totaal over 9 maanden op basis van een paaipiek in apr/mei |
| `$(selector)` | Alias voor `document.querySelector` |
| `$$(selector)` | Alias voor `document.querySelectorAll` als Array |
| `fmt(n)` | Formateert een getal met Nederlandse notatie (punt als duizendtalscheiding) |
| `fishUse(...)` | Genereert SVG `<use>`-markup voor een vis |
| `showTooltip(html, x, y)` | Toont de globale floating tooltip |
| `hideTooltip(delay?)` | Verbergt de tooltip, optioneel met vertraging |

### 6.3 Boot-functie

De `boot()` functie is de centrale startprocedure. Ze wordt aangeroepen zodra het script geladen is.

```
boot()
  │
  ├── fetch('json/vis-data.json')
  │     ├── Vul visData[].count met echte aantallen
  │     ├── Herbereken TOTAL
  │     ├── Genereer maandverdelingen (generateMonthly)
  │     ├── Vul dailyTotals[] met echte dagcijfers
  │     └── Vul weekHours[], weekDayLabels[], periodLabel
  │
  ├── (fallback bij fout: genereer data op basis van 0-counts)
  │
  ├── Sorteer visData op count (hoog → laag)
  ├── Zet statische teksten in DOM (if element bestaat)
  ├── Start IntersectionObserver voor alle .chapter-elementen
  ├── Bouw zijdelingse hoofdstuknavigatie
  └── Start achtergrond-bubbelanimatie
```

### 6.4 Hoofdstukarchitectuur

Elk hoofdstuk wordt geregistreerd als een functie in `chapterInit{}`:

```js
chapterInit['ch-aquarium'] = (el) => { /* ... */ };
```

De `IntersectionObserver` (`sectionObserver`) roept deze functie eenmalig aan zodra het section-element voor 8% zichtbaar is in de viewport. Daarna wordt `data-inited="1"` gezet zodat het niet opnieuw initialiseert.

---

## 7. Actieve en inactieve hoofdstukken

### Actieve hoofdstukken

| ID | Titel | Techniek |
|---|---|---|
| `ch-dive` | De duik | Sticky scroll + CSS transforms |
| `ch-aquarium` | Kijkglas | Canvas, flocking-algoritme |
| `ch-ring` | Ringkalender | D3 SVG, polaire coördinaten |
| `ch-radar` | Sonar | D3 SVG, roterende sweep |
| `ch-net` | Het net | D3 force-pack, bubbel-diagram |
| `ch-journal` | Journaal | HTML-kaarten, uitklapbaar |
| `ch-outro` | Afsluiting | Statisch |

### Inactieve hoofdstukken (JS in `/* ... */`)

De volgende `chapterInit`-functies zijn ingepakt in blokcommentaar en worden dus **niet** uitgevoerd:

| ID | Titel | Reden van inactiviteit |
|---|---|---|
| `ch-bell` | De bel | Tijdelijk uitgeschakeld |
| `ch-race` | Zwemrace | Tijdelijk uitgeschakeld |
| `ch-sluis` | Sluis-doorgang | Tijdelijk uitgeschakeld |
| `ch-clock` | Seizoensklok | Tijdelijk uitgeschakeld |
| `ch-strata` | Dieptelagen | Tijdelijk uitgeschakeld |
| `ch-flow` | Stroming | Tijdelijk uitgeschakeld |
| `ch-habitat` | Onderwaterhuis | Tijdelijk uitgeschakeld |

> De HTML van deze secties staat ook in commentaar in `index copy.html`. Beide moeten tegelijk worden geactiveerd om een hoofdstuk te herintroduceren.

### Ringkalender — `ch-ring` in detail

De ringkalender toont een polaire heatmap van uurdata over 31 dagen.

- **Slots:** `DAYS × 24` = 744 stippen
- **Hoek per stip:** `(i / SLOTS) × 2π − π/2`
- **Straal per stip:** schaalt lineair met het aantal beldrukken dat uur (`innerR + 14 + norm × (outerR − innerR − 20)`)
- **Kleurschema:**
  - > 65% van piek → goud (`#f4c560`)
  - 25–65% → blauw (`#7ec8e3`)
  - < 25% → donkerblauw (`#4a9ab8`)
- **Middentekst:** toont `TOTAL` (belroepen) en `periodLabel` (van `vis-data.json`)
- **Dag/nacht:** grijze boog op de binnenring voor uren 21:00–05:00

---

## 8. Opstarten (lokaal)

Omdat de website `fetch()` gebruikt, **moet** het via HTTP worden geserveerd.

```bash
# Vanuit de project-root
cd /pad/naar/vis/vis
python3 -m http.server 7823
```

Open daarna: `http://localhost:7823/index%20copy.html`

### Data opnieuw genereren

Als `event-maand.json` is bijgewerkt:

```bash
cd json
python3 csv_to_json.py
```

Dit overschrijft `vis-data.json` met nieuwe aantallen, dagcijfers en uurdata. De website laadt automatisch de nieuwe data bij de volgende refresh.

---

*Documentatie bijgewerkt: 21 mei 2026*
