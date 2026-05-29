# Documentatie — Mitchell's Visdeurbel-visualisaties

Een scrollytelling-pagina die de webanalytics van **de Visdeurbel** (visdeurbel.nl) tot
leven brengt: dertien hoofdstukken die elk een andere kant van de data laten zien, plus
een sticky **Maand / Week**-schakelaar. Dit document beschrijft de componenten, de
belangrijkste code, de struggles tijdens het maken en wat ik ervan geleerd heb.

---

## 1. Overzicht & architectuur

De ruwe data is **NDJSON** (één JSON-object per regel) met events zoals `uploadedFish`
("de bel ging") en `dismissedUploading` ("weggeklikt"), plus velden als `country`,
`browser`, `device`, `language`, `screen` en `created_at`. Het maandbestand is **288 MB** —
veel te groot om in de browser te laden. Daarom is de pijplijn opgesplitst:

```
event-maand.json (288 MB)  ─┐
                            ├─►  build_visdata.py  ─►  vis-data.json      (~40 KB)
event-week.json   (44 MB)  ─┘        (Python)         vis-data-week.json (~36 KB)
                                                              │
                                            fetch('/json/…') │
                                                              ▼
        Mitchell.jsx  ──(rendert secties + roept)──►  mitchell.js  ──(D3/Canvas)──►  SVG/Canvas
        (React-markup)                                 (initMitchell)
```

- **Python aggregeert** de zware bestanden vooraf tot compacte JSON met alleen de cijfers
  die de grafieken nodig hebben.
- **`Mitchell.jsx`** rendert de statische markup (de hoofdstuk-secties) en roept één keer
  `initMitchell()` aan.
- **`mitchell.js`** bevat per hoofdstuk een teken-functie (D3 of Canvas). Een
  `IntersectionObserver` tekent elk hoofdstuk pas wanneer je er naartoe scrollt.
- **Styling** volgt `STYLEGUIDE.md`: lettertypes **Bricolage Grotesque** + **PT Sans**,
  het tokenpalet uit `visdeurbel-tokens.css`, geen letter-spacing, geen puur zwart/wit,
  en afwisselend lichte (crème) en donkere (groen) secties.

**Bestanden**

| Bestand | Rol |
|---|---|
| `json/build_visdata.py` | Aggregeert een eventbestand → vis-data JSON |
| `public/json/vis-data.json` | Maanddata (standaard) |
| `public/json/vis-data-week.json` | Weekdata |
| `public/json/world-110m.json` | Wereldgeometrie (TopoJSON) voor kaart & globe |
| `src/pages/Mitchell.jsx` | React-pagina met alle secties + de schakelaar |
| `src/scripts/mitchell.js` | Alle teken-logica (D3/Canvas) |
| `src/styles/mitchell.css` | Component- & hoofdstukstijlen (tokens) |
| `src/styles/mitchell-week1.css` | Pagina-thema: achtergrond-ritme per sectie |

---

## 2. De datapijplijn — `build_visdata.py`

Eén streaming-pass leest het bestand regel voor regel (nooit alles in het geheugen) en
telt alles wat de hoofdstukken nodig hebben. Hetzelfde script maakt zowel de maand- als de
weekdata:

```bash
python3 json/build_visdata.py json/event-maand.json vis-data.json
python3 json/build_visdata.py json/event-week.json  vis-data-week.json
```

Kern van de aggregatie (vereenvoudigd):

```python
for line in f:                                  # regel voor regel = lage geheugendruk
    d = json.loads(line)
    if d.get("hostname") != "visdeurbel.nl":    # ruis van andere hosts eruit
        continue
    country[d.get("country", "")] += 1
    ev[d.get("event_name", "")] += 1            # uploadedFish vs dismissedUploading
    lang[(d.get("language") or "").split("-")[0]] += 1   # 'en-US' -> 'en'
    if d.get("event_name") == "uploadedFish":
        dt = datetime.strptime(d["created_at"], "%Y-%m-%d %H:%M:%S")
        pond[dt.weekday()*1440 + dt.hour*60 + dt.minute] += 1   # minuut-van-de-week
        per_day_hour[(dt.strftime("%Y-%m-%d"), dt.hour)] += 1
```

De output bevat o.a. `geo` (landen), `funnel` (wel/niet bellen), `tech`
(device/browser/os), `sessions` (belroepen per bezoek), `languages`, `pondWeek`
(10.080 minuten), `screens` + `orientation`, en de tijdreeksen `weekHours`/`daily`.

> **Waarom vooraf aggregeren?** 288 MB door de browser proberen te parsen is onmogelijk;
> 40 KB is instant. De grafieken hebben toch alleen de *getallen* nodig, niet de losse
> events.

---

## 3. De scrollytelling-motor

Elk hoofdstuk registreert zijn teken-functie onder zijn `id`. Een `IntersectionObserver`
roept die functie aan zodra het hoofdstuk in beeld komt — zo wordt er nooit onnodig
getekend en blijft de pagina licht:

```js
const chapterInit = {};                          // { 'ch-ring': fn, 'ch-world': fn, ... }

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');        // CSS reveal-animatie van de tekst
    if (!entry.target.dataset.inited) {           // maar één keer tekenen
      entry.target.dataset.inited = '1';
      chapterInit[entry.target.id]?.(entry.target);
    }
  });
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
```

Gedeelde helpers: een `showTooltip()`/`hideTooltip()` voor de zwevende tooltip, een
`reduceMotion`-check (`prefers-reduced-motion`) zodat animaties uitgaan voor wie dat
instelt, en een `rafs`-set + `cleanups`-array om alle `requestAnimationFrame`-loops en
observers netjes te kunnen stoppen.

---

## 4. De hoofdstukken

### 4.1 Ringkalender (`ch-ring`)
Cirkel van uur-stippen over de hele periode; helderheid = aantal belroepen dat uur.
*Data: `weekHours` (dagen × 24).*

### 4.2 24-uurs getij (`ch-tide`)
Een ronde 24-uurs wijzerplaat waarvan het "waterpeil" stijgt en daalt; hoogtij rond 18u.
De silhouet-vorm wordt met `d3.lineRadial` getekend:

```js
const lineGen = d3.lineRadial()
  .angle((d, i) => (i / 24) * 2 * Math.PI)                  // 0u bovenaan, met de klok mee
  .radius(d => baseR + (d / maxH) * (maxR - baseR))          // waarde -> straal
  .curve(d3.curveCardinalClosed.tension(0.5));               // vloeiende gesloten lus

// lineRadial tekent rond (0,0) -> daarom in een naar het midden verschoven groep:
const tide = svg.append('g').attr('transform', `translate(${cx},${cy})`)
  .append('path').attr('fill', 'url(#tideGrad)').attr('stroke', C.purple);
```

> Zie [§6](#6-struggles--oplossingen): die `translate` was precies de bug waardoor de
> getij-vorm eerst in de hoek belandde.

### 4.3 Weekend vs doordeweeks (`ch-weekday`)
Twee 24-uurs curves over elkaar — doordeweeks (paars) vs weekend (roze gestippeld),
gemiddeld per dag. Berekend uit `pondWeek` zonder extra datapass:

```js
for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) {
  let s = 0; for (let m = 0; m < 60; m++) s += week[d*1440 + h*60 + m] || 0;
  (d < 5 ? wd : we)[h] += s;                 // ma–vr vs za–zo
}
for (let h = 0; h < 24; h++) { wd[h] /= 5; we[h] /= 2; }   // eerlijk: gemiddelde per dag
```

### 4.4 Piekdagen-rivier (`ch-peaks`)
Dagelijkse area-chart over de maand met de drukste dag geannoteerd; een clip-rechthoek
groeit van links naar rechts als reveal. *Data: `daily` + `weekDayLabels`.*

### 4.5 Wereldkaart (`ch-world`)
Natural-Earth-kaart waar elk land oplicht en bogen naar Utrecht stromen. Om de **join**
tussen mijn alpha-2 landcodes (`US`, `PL`) en de numerieke ISO-id's van de TopoJSON te
vermijden, teken ik het land alleen als achtergrond en plaats ik de stippen via een eigen
centroïdtabel:

```js
const projection = d3.geoNaturalEarth1().fitExtent([[m,m],[W-m,H-m]], {type:'Sphere'});
const pts = Object.entries(COUNTRY_GEO)              // { US:[-98,39,'Verenigde Staten'], ... }
  .map(([code, g]) => ({ code, name:g[2], count: counts[code]||0, lnglat:[g[0],g[1]] }))
  .filter(p => p.count > 0);
// straal ∝ √belroepen, kleur in tiers (teal → paars → roze)
```

### 4.6 Koor van talen (`ch-languages`)
Drijvende begroetingen ("Hallo", "Cześć", "你好"), grootte = aantal bezoekers, met een
`forceSimulation` die ze samenschoolt en zacht laat dobberen:

```js
const sim = d3.forceSimulation(list)
  .force('x', d3.forceX(cx).strength(0.04))
  .force('y', d3.forceY(cy).strength(0.06))
  .force('collide', d3.forceCollide(d => d.rad).strength(0.9))
  .on('tick', () => node.attr('transform', d => `translate(${d.x},${d.y})`));

sim.on('end', () => {                       // na het settelen: rustig dobberen
  const bob = () => { list.forEach(d => {
    d.x = d.bx + Math.sin(t*0.5 + d.ph)*5; d.y = d.by + Math.cos(t*0.45 + d.ph)*5; });
    node.attr('transform', d => `translate(${d.x},${d.y})`); raf(bob); };
  raf(bob);
});
```
*Dezelfde force-techniek gebruikt de Apparaten-school (§4.10) en het Schermen-aquarium (§4.11).*

### 4.7 Draaiende globe (`ch-globe`)
Een orthografische bol die meedraait met een "wereldklok"; elk land licht op wanneer het
daar lokaal avond wordt, zodat de avondpiek de planeet rondreist:

```js
function render() {
  const S = (12 - gh) * 15;                       // sub-zonne-lengtegraad
  projection.rotate([-S, -8]);                     // draai de bol met de klok mee
  landPath.attr('d', path(land));
  dots.attr('opacity', p => d3.geoDistance(p.ll, [S, 8]) < Math.PI/2 ? 1 : 0) // achterkant verbergen
      .each(function (p) {
        const localH = ((gh + p.ll[0] / 15) % 24 + 24) % 24;   // lokale tijd uit lengtegraad
        const act = hourly[Math.floor(localH)] / maxHourly;     // avond = hoge activiteit
        d3.select(this).select('.gd-glow').attr('opacity', 0.08 + act * 0.4);
      });
}
```

### 4.8 Belstroom (`ch-funnel`)
Toont dat ~19% écht aanbelt en ~81% wegklikt: twee linten waarlangs deeltjes stromen.
De deeltjes lopen over het pad met `getPointAtLength`, en de bel "rinkelt" bij aankomst:

```js
const upLen = upNode.getTotalLength();
upParts.forEach(d => {
  d.p += d.sp;
  if (d.p >= 1) { d.p = 0; pulse(); }              // aankomst -> belpuls
  const pt = upNode.getPointAtLength(d.p * upLen); // positie langs het SVG-pad
  d._x = pt.x; d._y = pt.y;
});
```

### 4.9 De fanatici (`ch-fanatics`)
Histogram van belroepen-per-bezoek (√-schaal voor de lange staart). De kop-cijfers tonen
de ongelijkheid; het aandeel van de drukste 1% wordt al in Python berekend:

```python
def top_share(pct):                        # grootste pct% van de bezoeken
    j = max(1, round(pct/100 * n))
    return sum(ring_counts[n-j:]) / total_rings   # -> aandeel van álle belroepen
```
Resultaat: de recordhouder belde **157×**, en de drukste **1%** is goed voor **~20%** van alles.

### 4.10 Apparaten-school (`ch-shoal`)
Samenscholende bubbels per browser (Chrome, Safari, Instagram, …), gekleurd per familie.
*Data: `tech.browser` + `tech.device`.* (force-simulatie, zie §4.6.)

### 4.11 Schermen-aquarium (`ch-screens`)
Elke schermresolutie als doorschijnend venster met de échte beeldverhouding (`w/h`),
staand = teal, liggend = paars. *66% kijkt staand (telefoon).* (force-simulatie.)

### 4.12 Radar (`ch-radar`)
Ronddraaiende sonar die vissoorten laat opflitsen. De vis-silhouetten komen uit een
SVG-sprite (zie §6) en gebruiken `<use href="#fish-…">`.

### 4.13 Levende sluis (`ch-pond`)
Finale: een **week in 60 seconden** als rimpelingen op een vijver (Canvas, niet SVG, voor
de vele deeltjes). Een prefix-som geeft de live teller, en per frame worden de net
verstreken minuten "afgespeeld":

```js
const prefix = new Array(MIN + 1).fill(0);
for (let i = 0; i < MIN; i++) prefix[i + 1] = prefix[i] + week[i];   // cumulatief totaal

function frame(t) {
  const curMin = Math.floor(((t - startT) % DURATION) / DURATION * MIN);
  for (let m = lastMin + 1; m <= curMin; m++) if (week[m] > 0) spawn(week[m]);
  ripples = ripples.filter(rp => rp.a > 0.02 && rp.r < rp.max);       // dode rimpels weg
  for (const rp of ripples) { rp.r += rp.sp; rp.a *= 0.965; ctx.arc(rp.x, rp.y, rp.r, 0, 7); }
}
```

---

## 5. De Maand/Week-schakelaar

Een sticky pill (rechtsonder) wisselt de dataset. De hoofdstukken tekenen normaal één keer,
dus om te wisselen moet ik ze **opruimen en opnieuw laten tekenen**:

```js
async function setPeriod(period) {
  if (period === currentPeriod) return;
  currentPeriod = period;
  clearChapters();                                  // stop animaties + leeg de stages
  await loadData(period === 'week'                  // laad de andere JSON
      ? '/json/vis-data-week.json' : '/json/vis-data.json');
  observeChapters();                                // her-observeren -> observer vuurt opnieuw
}

function clearChapters() {
  cleanups.forEach(fn => { try { fn(); } catch {} });   // rAF-loops & per-hoofdstuk observers
  cleanups.length = 0;
  rafs.forEach(id => cancelAnimationFrame(id)); rafs.clear();
  $$('.chapter').forEach(c => { delete c.dataset.inited; });   // weer "ongetekend"
  STAGES.forEach(sel => $(sel)?.querySelectorAll('svg, canvas, .pond-clock, .pond-counter')
    .forEach(n => n.remove()));                      // oude tekening weg (anders dubbel)
}
```

**De truc:** een `IntersectionObserver` stuurt een nieuwe melding voor elk element dat je
opnieuw `observe()`t. Door `disconnect()` + opnieuw `observe()` te doen, vuurt hij meteen
weer voor de zichtbare hoofdstukken — die hertekenen zich met de nieuwe data, en de rest
volgt zodra je ernaartoe scrollt. Alle 13 hoofdstukken passen zich automatisch aan (7/9 vs
31 dagen, andere landen-, taal- en schermtellingen) omdat ze de lengte van de arrays lezen.

---

## 6. Struggles & oplossingen

| Struggle | Wat er misging | Oplossing |
|---|---|---|
| **288 MB in de browser** | Het maandbestand parsen in JS is onmogelijk/traag | Vooraf aggregeren met Python tot ~40 KB JSON |
| **`npm run dev` startte niet** | `node_modules` was van een **Windows**-machine gekopieerd → de macOS-binaries van `esbuild`/`rollup` ontbraken (*"Cannot find module @rollup/rollup-darwin-arm64"*), en `.bin/vite` was niet uitvoerbaar | De juiste darwin-arm64 binaries bijgeplaatst; nette fix is `rm -rf node_modules package-lock.json && npm install` op de Mac |
| **Getij stond in de hoek** | `d3.lineRadial` tekent rond oorsprong **(0,0)**; ik was vergeten te centreren | Het pad in een `<g transform="translate(cx,cy)">` gezet |
| **Wereldkaart-join** | Mijn landcodes (`US`) matchen niet met de numerieke ISO-id's van de TopoJSON | Eigen centroïdtabel `COUNTRY_GEO`; het land alleen als achtergrond tekenen (geen join nodig) |
| **Europa werd één blob** | Grote, dicht op elkaar liggende stippen + botsende labels | Kleinere stippen/gloed + labels vervangen door een "top-5 bellers"-bijschrift |
| **Radar-vissen onzichtbaar** | `<use href="#fish-…">` verwees naar symbolen die niet in de DOM stonden | Een verborgen SVG-sprite met `<symbol>`-vissen toegevoegd in `Mitchell.jsx` |
| **Wisselen van dataset** | Hoofdstukken tekenen maar één keer; zomaar opnieuw laden gaf dubbele SVG's en doorlopende animaties | `clearChapters()` stopt animaties/observers, leegt de stages en reset `data-inited`; daarna her-observeren |
| **Animaties bleven draaien** | rAF-loops en per-hoofdstuk observers lekten bij hertekenen | Alles in `rafs`/`cleanups` bijhouden en centraal opruimen |

---

## 7. Wat ik ervan geleerd heb

- **Scheid dataverwerking van visualisatie.** Zware aggregatie hoort in een build-stap
  (Python), niet in de browser. De frontend krijgt alleen de kant-en-klare getallen.
- **`node_modules` is platform-specifiek.** Je kopieert het niet tussen Windows en Mac; je
  draait `npm install` per machine. Nu snap ik ook waarvoor die map dient: het is geen code
  van mij, maar de bibliotheken (d3, react, vite, esbuild…) waar het project op draait.
- **D3 radiale generators tekenen rond (0,0).** Centreren doe je zelf met een `transform` —
  een kleine vergetelheid met een groot zichtbaar effect.
- **Vermijd fragiele joins.** In plaats van landcodes aan vreemde ID's te koppelen, hield ik
  mijn eigen tabel aan; minder afhankelijkheden, minder bugs.
- **Animaties hebben een levenscyclus.** Wat je start (`requestAnimationFrame`,
  `IntersectionObserver`, `forceSimulation`) moet je ook kunnen stoppen — anders lekt het bij
  hertekenen.
- **`IntersectionObserver` is ideaal voor scrollytelling**, én herbruikbaar: opnieuw
  `observe()`n triggert meteen een nieuwe meting, wat hertekenen simpel maakt.
- **Laat de visualisatie de data volgen, niet andersom.** Door overal de array-lengtes te
  lezen (7/9/31 dagen) werkt dezelfde code voor zowel week- als maanddata.
- **Een styleguide volgen versnelt juist.** Vaste tokens en lettertypes betekenen minder
  twijfel en een consistente look over dertien heel verschillende hoofdstukken.
