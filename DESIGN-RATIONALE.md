# Design Rationale — Visdeurbel Datavisualisaties


---

## 1. Debriefing

### De Visdeurbel buiten het seizoen

Ieder voorjaar zwemmen duizenden vissen dwars door de grachten en singels van Utrecht naar de Kromme Rijn, op zoek naar een plek om zich voort te planten. **Visdeurbel.nl** laat mensen live meekijken bij de sluis en vissen helpen door op een digitale bel te drukken: de sluiswachter ziet de melding en kan de vis doorlaten. Wat begon als speels experiment groeide razendsnel uit tot een publieksfavoriet met **miljoenen bezoekers** van over de hele wereld.

Dit jaar is bij elke druk op de deurbel data verzameld. Aan het einde van het Visdeurbel-seizoen (dat loopt van maart tot en met 1 juli) willen we met die verzamelde data een data-**VIS**ualisatie maken.

### De opdracht in het kort

- **Verschillende datavisualisaties** van de verworven data, **bij voorkeur als one-pager**.
- De pagina wordt **geïntegreerd in de bestaande website**.
- De website moet **volledig toegankelijk** zijn — **WCAG A compliance**.
- De site wordt **vanuit de hele wereld** bezocht: let dus op **performance**.
- De website moet **volledig responsive** zijn.

### Opdrachtgever

In de praktijk was **Studio MOAN** (Utrecht) onze opdrachtgever, met **Cyd Stumpel** als contactpersoon die de opdracht uitzette en gedurende het hele traject feedback gaf.

### Design challenge

> Hoe kunnen we met de verzamelde data van de Visdeurbel een zo leuk en goed mogelijk beeld geven van de staat van de Utrechtse wateren en hoe de Visdeurbel dit jaar is gebruikt?

---

## 2. Probleemdefinitie

Uit de debriefing en de design challenge destilleren we vijf kernproblemen die het ontwerp moest oplossen:

1. **De data is te groot, het publiek wereldwijd.** De ruwe event-log is **~288 MB NDJSON** — onmogelijk client-side in te laden of te aggregeren zonder dat de pagina vastloopt. Tegelijk wordt de site vanuit de hele wereld bezocht, dus **performance** is een harde eis: het moet ook op een matige verbinding snel laden.

2. **Eén pagina moet drie doelgroepen tegelijk bedienen.** De trouwe kijker wil nagenieten, de gemeente wil populariteit aantonen, de ecoloog wil iets over de vissen leren. Dezelfde one-pager moet alle drie de perspectieven raken zonder rommelig te worden.

3. **Ruwe cijfers vertellen geen verhaal.** De challenge vraagt om een "zo leuk en goed mogelijk beeld" van de staat van de Utrechtse wateren én van het gebruik van de Visdeurbel. Tellingen per land of per uur zijn correct maar saai; elke datadimensie (tijd, plaats, soort, taal) moet aan een visuele vorm gekoppeld worden die het *intuïtief* maakt.

4. **Toegankelijkheid, responsiviteit en integratie zijn randvoorwaarden, geen sluitstuk.** De site moet **WCAG A** halen, **volledig responsive** zijn en **in de bestaande website passen**. Een interactieve, animatie-rijke datavisualisatie sluit schermlezer- en toetsenbordgebruikers juist snel buiten als je er niet vanaf het begin op ontwerpt.

5. **Samenhang vs. zelfstandig werk.** Vier mensen bouwden elk een eigen visualisatie, vaak eerst als losse prototype-pagina. Het risico: een verzameling losse grafieken in plaats van één doorlopend verhaal.

**Ontwerpdoel:** een snelle, responsieve, WCAG A-toegankelijke one-pager die in de bestaande Visdeurbel-site past, waarin elke visualisatie het verhaal van de data dient voor kijker, gemeente én ecoloog — en waarin de techniek nooit belangrijker wordt dan dat verhaal.

---

## 3. De oplossing

_(Nog te schrijven.)_

---

## 4. Uitleg van de code

### 4.1 Architectuur in vogelvlucht

De site is een **React + Vite**-app. [App.jsx](src/App.jsx) regelt de routering; [Home.jsx](src/pages/Home.jsx) stelt de homepage samen door alle visualisatie-componenten in volgorde te plaatsen, met `SectionWave`-overgangen ertussen. CSS wordt per pagina dynamisch ingeladen via de `useStylesheet`-hook ([useStylesheet.js](src/hooks/useStylesheet.js)), zodat elke pagina alleen de stylesheets laadt die hij nodig heeft.

Een terugkerend principe in alle visualisaties: **React bezit de paginastructuur en de state; D3 bezit de SVG/canvas.** De regel is dat precies één van de twee een gegeven DOM-attribuut bezit. Dat voorkomt de klassieke conflicten (zoals de `viewBox`-strijd en stale closures) die ontstaan als beide hetzelfde aanraken.

### 4.2 De datapijplijn

Antwoord op probleem #1. Een Python-script ([build_visdata.py](json/build_visdata.py)) streamt de 288 MB NDJSON **regel voor regel** en aggregeert alleen wat de visualisaties nodig hebben (`event_name`, `country`, `city`, `created_at`, `referrer_query`) naar compacte JSON van ~40 KB. Hetzelfde script produceert zowel een week- als een maanddataset; de frontend leest de array-lengtes automatisch uit, dus de Maand/Week-schakelaar werkt zonder codewijziging.

```
288 MB NDJSON  ──build_visdata.py──▶  vis-data.json (~40 KB)
                                      vis-data-week.json (~40 KB)
```

### 4.3 De scrollytelling-motor

[mitchell.js](src/scripts/mitchell.js) is de orchestrator achter de vijf middelste hoofdstukken. De kern is één `IntersectionObserver` met een `chapterInit`-map die per section-id de juiste tekenfunctie aanwijst:

```js
const chapterInit = {
  'ch-aquarium':  initAquarium,
  'ch-radar':     initRadar,
  'ch-languages': initLanguages,
  'ch-net':       initNet,
  // ...
};
```

Elk hoofdstuk tekent zichzelf **precies één keer** — de eerste keer dat het 8% in beeld is (`threshold: 0.08`) — en krijgt dan `data-inited`, zodat het niet bij elke scroll opnieuw tekent. Dat scheelt rekenkracht en houdt het scrollen vloeiend.

De **Maand/Week-schakelaar** werkt door eerst alles af te breken: `clearChapters()` annuleert elke bijgehouden `requestAnimationFrame`-loop, haalt `data-inited` van elke sectie en verwijdert achtergebleven `<svg>`/`<canvas>`-knopen. Daarna is opnieuw `observe()`-en genoeg om elk zichtbaar hoofdstuk tegen de nieuwe dataset te laten hertekenen. Een centrale `lifecycle`-bookkeeping (`cleanups`, `rafs`) zorgt dat bij navigeren of in React StrictMode alles netjes wordt opgeruimd.

### 4.4 De wereldbol — data-hook + D3

[useJoostData.js](src/components/world-map/useJoostData.js) is een custom hook die al het databeheer voor de globe afhandelt. Bij mount haalt hij de topologie én de event-data **parallel** op met `Promise.all`, aggregeert per land en bepaalt het maximum voor de kleurschaal:

```js
const [topoData, rawEvents] = await Promise.all([
  d3.json(TOPO_URL),
  loadData('maand'),
]);
const cd = aggregate(rawEvents);
const mx = Math.max(...Object.values(cd).map(c => c.events), 1);
```

De `+1`-fallback in `Math.max(..., 1)` voorkomt deling door nul als er geen data is. De globe zelf wordt met `d3.geoOrthographic()` getekend; D3 muteert de SVG via refs, terwijl React de omringende UI (knoppen, landenlijst) beheert.

### 4.5 De klok — gemiddelde per uur

[Clock.jsx](src/components/clock/Clock.jsx) berekent in `buildHourProfile()` per uur het **gemiddelde** aantal meldingen (niet de som), zodat uren eerlijk vergeleken worden ook als er niet evenveel dagen zijn:

```js
const averages = tally.sum.map((sum, hour) =>
  tally.days[hour] ? sum / tally.days[hour] : 0,
);
const highest = Math.max(...averages, 1); // drukste uur = langste wijzer
```

`busyness` (0–1) bepaalt de wijzerlengte, `share` het aandeel van de dag. Voor de uitsplitsing in blokken van 10 minuten bouwt `buildFishPool()` een pool waarin vaker geziene soorten vaker voorkomen — decoratief, want de data koppelt geen soort aan een exacte minuut.

### 4.6 De tijdlijn — semantiek eerst

[day-scroll.jsx](src/components/timeline/day-scroll.jsx) bewijst dat toegankelijkheid en design samengaan. De data staat in een echte `<table>` met een `visually-hidden` `<caption>` en `<thead>` voor schermlezers, terwijl de visuele presentatie (balken, zwemmende vis, gracht-decor) los daarvan met CSS gebeurt:

```jsx
<caption className="visually-hidden">Overzicht van vissen per uur van de dag</caption>
<thead className="visually-hidden">
  <tr><th scope="col">Tijd</th><th scope="col">Hoeveelheid vissen</th>...</tr>
</thead>
```

Het decoratieve gracht-laagje (`sticky-container` met sluiswachter, fiets, zak) is volledig `aria-hidden="true"`, zodat schermlezers alleen de echte data horen.

### 4.7 De carrousel — kleine, samengestelde hooks

[EmblaCarousel.jsx](src/components/carousel/EmblaCarousel.jsx) is opgebouwd uit drie kleine, single-purpose hooks die de logica leesbaar houden:

- `useCarouselNav(emblaApi)` — houdt bij of links/rechts scrollen kan en (de)activeert de pijlknoppen.
- `useFishStats()` — laadt de meldingen per soort uit `vis-data.json` en berekent aantal, aandeel en ranglijstpositie.
- `useFishChecklist()` — beheert welke vissen aangevinkt zijn via een `Set`.

Klikken op een vis opent een toegankelijke `Dialog` (`aria-label`, sluitknop) met de statistieken voor die soort. De dialog werkt bewust ook zonder data — dan toont hij alleen naam en omschrijving.

### 4.8 Belangrijkste libraries en waarom

| Pakket | Waarom |
|---|---|
| **React 18** | Componentstructuur en state-beheer. |
| **D3 7** | Alle datavisualisaties (geo-projecties, schalen, `pack`, `lineRadial`). |
| **Embla Carousel** | Lichtgewicht, toegankelijke carrousel. |
| **GSAP** | Betrouwbare, performante scroll-animaties (Barry de vis, golfovergangen). |
| **topojson-client** | Omzetten van TopoJSON-wereldatlas naar GeoJSON voor de globe. |
| **Vite** | Snelle dev-server en eenvoudige statische productiebuild (`dist/`). |
| **Python (offline)** | Zware data-aggregatie hoort niet in de browser (§4.2). |

---

## 5. Conclusie

De verantwoording laat zich samenvatten in één principe: **het verhaal van de data dienen, niet de techniek showen.** De debriefing vroeg om een toegankelijke (WCAG A), responsive, performante one-pager die in de bestaande Visdeurbel-site past en kijker, gemeente én ecoloog bedient; de probleemdefinitie legde vijf obstakels bloot (te grote data + wereldwijd publiek, drie doelgroepen op één pagina, kale cijfers, toegankelijkheid/responsiviteit/integratie, en gebrek aan samenhang). De code maakt dit waar met een schone scheiding tussen React, D3 en een offline datapijplijn.

---

*Implementatiedetails per onderdeel: [README.md](README.md). Visuele tokens: [STYLEGUIDE.md](STYLEGUIDE.md). Week-voor-week ontwikkelgeschiedenis: [contributions.md](contributions.md).*
