# Wie deed wat — Visdeurbel

This page brings together every visualization chapter built for the Visdeurbel meesterproef into one continuous scroll: a world map, an aquarium, a radar, a word cloud, a bubble chart, a 24-hour clock and a scrolling timeline table. The assignment itself came from Cyd Stumpel, with Studio MOAN in Utrecht as the actual client giving feedback throughout the project. Each team member worked largely independently on their own module — often as a standalone prototype page first — before everything was wired together onto the shared `Home.jsx`. What follows is a week-by-week account of who built what, drawn from the code itself and from each person's own process documentation.

---

## Joost — Wereldkaart

**Folder:** `components/world-map/`
**Files:** `GlobeMap.jsx`, `useJoostData.js`, `utils.js`, `constants.js`, `mapModes.js`, `MapLegend.jsx`, `MapTooltip.jsx`, `CountryList.jsx`

This is the rotating globe near the bottom of the page, and according to Joost's own logs it's also the module that absorbed the most hours — roughly **60 to 70 hours** across five weeks, by his own estimates.

### Week 1–2 — eerste versie (vanilla HTML/CSS/JS + D3)

The globe started life as a plain HTML/CSS/JS page, not React. Joost built the page shell himself (navbar, hero header, a week/maand period toggle with a loading indicator, a four-card stats bar, and a separate per-country list section), then layered the actual globe on top with `d3.geoOrthographic()`: a radial-gradient ocean sphere with a drop-shadow filter for depth, a faint graticule grid, and the TopoJSON world atlas pulled from a CDN and converted to GeoJSON. Interaction came next — mouse-drag rotation (delta × 0.3 sensitivity), touch support, scroll-to-zoom (originally clamped between 150 and 800), and a `requestAnimationFrame` auto-rotation loop (0.012°/ms) that paused on interaction and resumed after four seconds of idling.

The data side was just as involved: `loadData()` fetched and parsed the raw NDJSON event log, and `aggregate()` grouped every event by country via an alpha-2 → numeric TopoJSON-id lookup table he built by hand, tracking per country not just events/uploads/dismissals but also cities, fish species, active hours, **and**, in this first version, device type, OS and browser (`normalizeOS()`/`normalizeBrowser()` helpers). The very first build actually shipped with **nine** map modes — Bellen, Upload %, Taarten, Lijnen, Apparaat, Vis soort, Tijdstip, OS and Browser — most of which were later cut as the design narrowed toward clarity (the final site keeps only three: Bezoeken+Lijnen, Vis soort and Tijdstip). A floating legend and a "recent events" feed were also part of this first version and were later removed entirely to keep the page calmer.

### Week 3 — React-migratie

Week 3 was a full rewrite from vanilla JS into a React component tree: the imperative `initJoost()` became a set of `useEffect` hooks, while all the D3 logic kept mutating the DOM directly through refs — D3 owns the SVG, React owns everything around it. This is also where the classic D3-in-React bug showed up: event handlers were closing over a stale `proj` variable from the init closure, fixed by having every handler read `projRef.current` instead. The monolithic page was split into the file structure still visible today (`GlobeMap.jsx`, `mapModes.js`, `CountryList.jsx`, `MapTooltip.jsx`, `constants.js`, `utils.js`), plus a `StatsBar.jsx` and a breadcrumb `Nav.jsx` that lived on Joost's own standalone `/joost` route. This week also introduced a flat-map projection toggle (🌍 Bol ↔ 🗺️ Kaart, `d3.geoNaturalEarth1`) with pan-to-drag and zoom-to-cursor — a feature that, as covered below, was entirely removed again in week 4.

### Week 4 — toegankelijkheid, performance & opschoning

This was the heaviest cleanup week. Every file got a full pass of inline comments explaining *why*, not just *what*. `CountryList` got real accessibility: `tabIndex`/`role="button"` on every card, spoken `aria-label`s like *"Nummer 4. Land: Nederland. Aantal vissen gespot: 1.234."*, `aria-expanded`/`aria-controls` on the "Bekijk meer" button, Escape-to-collapse with focus returned to the toggle, and a corrected tab order (top-3 → button → rest) using `tabIndex={-1}` on hidden cards. New `isOnGlobe()`/`clientToSVG()` helpers made sure drag, touch and wheel events only fire when the cursor is actually over the globe circle, not the surrounding panel. The globe itself was resized and repositioned repeatedly (`INIT_R` doubled, then pushed to ×2.4; zoom ceiling raised from 800 to 1600; the SVG `viewBox` moved into JSX entirely after D3's own viewBox writes caused the globe to snap back to centre on every remount) and its starting rotation set to `[-5, -52, 0]` so Europe is front-and-centre on load.

The flat-map projection toggle was removed completely — `switchProjType()`, `panStartRef`, `projType` state, `getFlatMinScale()`, `clampFlatProjection()`, the pan branches in every drag/touch/wheel handler, the `#map-bg` rect, and a long list of now-dead CSS classes (`.proj-btn`, `.proj-toggle`, `.section-heading`, `.map-tab--reset`, plus leftovers from a deleted `EventFeed.jsx` and an external `MapLegendSection.jsx`). Along the way Joost also hunted down and removed code nobody called anymore: a `handleReset()` with no actual reset button, a `loading-overlay` whose `hidden` class was hardcoded and never toggled, and `getCountryFill()` in `utils.js`, orphaned after the old map modes were retired. One of the trickier bugs of the week: removing the flat-map `if/else` wrapper left a stray closing brace behind, which pushed the component's `return` outside the function and broke the Vite build with `'return' outside of function` — fixed by carefully re-indenting and removing the stray `}`.

On the animation side, the flow-arc particle system got a real performance pass: the glow filter was stripped from the long trail paths and kept only on the small particle dot, arc resolution was cut from 80 points down to 12 (an ~85% reduction, visually unnoticeable at globe scale), DOM node refs were cached at setup instead of re-querying every frame, and the Utrecht beacon's logo went from an external SVG `<image>` reference to fully inlined SVG paths so it loads instantly and updates every frame instead of every third. The fish-species legend was also cleaned up — "unknown" was pulled out of `FISH_COLORS` and filtered everywhere via `UNKNOWN_VALS`, so it never shows up as a species. Time spent this week: roughly 11–14 hours.

### Week 5 — integratie & gebruikerstests

In the final week the globe was embedded directly into the shared `Home.jsx` (only the four values the homepage actually needs — `countryData`, `maxEvents`, `topoFeatures`, `loading` — are pulled from `useJoostData`). This triggered the same full-bleed CSS fight Joost had already solved once inside his own page: `<main>` in `index.css` carries a `max-width`, so the globe had to be moved structurally **outside** `<main>` as a sibling between two `<main>` blocks rather than fought with CSS overrides. Joost also ran an informal user test on where the mode-switch tabs should live — top-right felt more like "tabs" to some testers but overlapped the country list on narrower screens, while a bottom-centred placement won out because people preferred to see the globe first and discover the controls afterward. A `extract_worldmap_data.py` script was also written to strip the raw NDJSON down to only the five fields the map actually reads (`event_name`, `country`, `city`, `referrer_query`, `created_at`), roughly halving file size — after which the now-unused device/OS/browser tracking was deleted from `utils.js` entirely.

### Wat Joost leerde

A few things he singled out: D3's geographic projections (`clipAngle`, `rotate([lambda, phi, gamma])`, `Sphere`/`geoGraticule`), that mixing D3 and React only works if exactly one of them owns a given DOM attribute (the `viewBox` fight taught him that the hard way), that stale closures are *the* recurring bug when D3 lives inside React, that `feGaussianBlur` on long SVG paths is one of the most expensive operations you can do per frame, and that DOM order — not visual `order` in flexbox — is what actually drives keyboard tab order.

---

## Mitchell — Datavisualisatie-hoofdstukken

**Folder:** `components/mitchell-components/`, plus the shared `scripts/mitchell.js` and `scripts/mitchell/{state,utils,fishImage,tooltip,constants}.js`
**Files:** `Aquarium.jsx`, `DataCarousel.jsx`, `DataSwitch.jsx`, `FishSprite.jsx`, `LanguagesChapter.jsx`, `NetChapter.jsx`, `RadarChapter.jsx`, `SectionWave.jsx`

Mitchell's module also started as a standalone, vanilla-JS scrollytelling page — `index.html` plus a single ~1822-line `scripts/main.js` — before becoming the React chapters now living in `mitchell-components/`. Across the three weeks he documented, the scope of what he actually *built* was considerably wider than what shipped on the final homepage; a fair amount of it was prototyped, tested, and then deliberately trimmed.

### Datapijplijn

The raw monthly event log is 288 MB of NDJSON — far too large to parse in a browser — so a Python preprocessing step (`build_visdata.py`, later also `csv_to_json.py`) streams it line by line and aggregates everything the chapters need (countries, fish species, sessions, languages, device/browser, an hour-of-week grid) down to a ~40 KB JSON file the frontend can fetch instantly. The same script produces both a monthly and a weekly dataset, which is what powers the Maand/Week switch.

### De scrollytelling-motor

Every chapter registers a draw function under its section id in a `chapterInit{}` map; a single `IntersectionObserver` calls that function exactly once, the first time the section is 8% visible, and marks it `data-inited` so it never redraws on its own. Shared infrastructure — a floating tooltip helper, a `reduceMotion()` check tied to `prefers-reduced-motion`, and a `rafs`/`cleanups` bookkeeping system for stopping every animation frame loop and observer on teardown — lives in `scripts/mitchell.js` and `scripts/mitchell/*`.

### Hoofdstukken die de revue passeerden

Over the three documented weeks Mitchell prototyped a genuinely large set of chapters: a polar ring calendar, a 24-hour "tide" wave drawn with `d3.lineRadial`, a weekday-vs-weekend overlay, a daily "peaks" area chart, a world map with a Europe/world toggle, the floating-greetings language cloud, a spinning globe that lit up countries as it became evening there, a call/dismiss "funnel" with particles flowing along an SVG path, a histogram of the most fanatical visitors, force-simulated "swarms" for device and screen-resolution stats, a sonar-style radar, and a final "living pond" ripple animation replaying an entire week in 60 seconds on canvas. A standalone accessibility menu (animations off, high-contrast mode, both persisted to `localStorage`) sat on his own `Mitchell.jsx` page throughout. In the version that ended up wired into the shared `Home.jsx`, the set was narrowed to the five chapters that made the final cut — **Aquarium**, the **DataCarousel** facts slider, **LanguagesChapter**, **NetChapter** and **RadarChapter** — plus the supporting `DataSwitch`, `FishSprite` and `SectionWave` pieces; the rest stayed as explored-but-not-shipped work, the same kind of narrowing Joost went through with his nine-modes-down-to-three map.

Of what did ship: **Aquarium** recolours a single greyscale fish PNG per species in JavaScript (luminance-preserving tint blended toward white), spawns up to 80 fish proportional to each species' real share of observations, and animates them with centre-pull/wander/friction physics plus filter chips and a click-to-scare ripple effect. **DataCarousel** turns the aggregated stats into eight Embla-Carousel fact slides. **NetChapter** is a D3 `pack` bubble chart switchable between count/weight/biomass. **LanguagesChapter** is the force-simulated floating word cloud of greetings sized by visitor share (an experiment that briefly swapped the greetings for fish names per language in week 3 didn't make it into the final version — the shipped code still uses the original greeting text). **RadarChapter** places each species as a sonar "ping" at a reproducible pseudo-random position, with a time-scrubbing slider that redistributes observations across days/weeks/months using a largest-remainder rounding correction.

### De Maand/Week-schakelaar

Because every chapter only draws once, switching datasets means tearing everything down first: `clearChapters()` cancels every tracked `requestAnimationFrame` loop and observer, clears `data-inited` off every section, and removes any leftover `<svg>`/`<canvas>` nodes from the stage elements — after which simply re-`observe()`-ing the same `IntersectionObserver` is enough to trigger every visible chapter to redraw itself against the newly loaded dataset.

### Tegenslagen & oplossingen

A few of the more memorable ones from his notes: the 288 MB file simply couldn't be parsed client-side, solved by the Python aggregation step; a `node_modules` folder copied over from a Windows machine left the macOS build missing its `@rollup/rollup-darwin-arm64` binary, fixed with a clean `npm install` on the Mac itself; `d3.lineRadial` draws around the origin `(0,0)` by default, so the tide chapter initially rendered in the corner of the SVG until it was wrapped in a translated `<g>`; the world map's country codes (`US`, `PL`) don't match the TopoJSON's numeric ids, sidestepped by keeping his own `COUNTRY_GEO` centroid table instead of trying to join the two; and the radar's fish images were invisible at first because the `<use href="#fish-…">` references pointed at `<symbol>`s that didn't exist anywhere in the DOM yet — fixed by adding the hidden SVG sprite sheet now used as `FishSprite.jsx`.

### Wat Mitchell leerde

Heavy aggregation belongs in a Python build step, not the browser; `node_modules` is platform-specific and should never be copied between machines; D3's radial generators always draw around the origin, so centring is the developer's job; fragile joins between two different ID systems are worth avoiding by just keeping your own lookup table; anything that starts an animation loop or observer needs an equally deliberate way to stop it; and letting every chapter simply read the length of its input arrays meant the exact same code worked for both 9-day and 31-day datasets without any branching.

---

## Nienke — Tijdlijn

**Folder:** `components/timeline/`
**Files:** `day-scroll.jsx`, `timeline.js`

Nienke went into the project with three explicit learning goals: finding more innovative approaches to navigation, forcing herself to explore more design variations before committing to one, and learning to let go of control when working in a group — all three of which show up directly in how the timeline took shape.

### Het ontwerpproces, week voor week

Week 1 opened with the assignment briefing from Cyd Stumpel and an early concept sketching pass — including a hand-built 3D fishhook model in Blender, made because no usable reference existed online — that led to the core idea: fish swimming past, one bar per hour, to represent the data. A workshop with Vasilis on rapid-sketching technique ("forty sketches in a minute") and design-process frameworks (waterfall vs. Scrum vs. Agile) shaped how she approached variation from then on, and she started experimenting with the timeline's CSS, plus an early conversation with Jad about accessibility — tooltips as popovers, `tabindex` so screen-reader users can tab through each hour.

In week 2, courses on React and refreshed JavaScript fundamentals (taught by Jad) gave her the tools to actually build what she'd sketched. Feedback from Sanne pushed two concrete changes: use a small fish icon instead of a fish that visually overflows the chart, and use a real HTML `<table>` instead of styled `<div>`s for semantic correctness. Studio MOAN's feedback that week asked for a clearer visual hierarchy — better use of fish size and bar structure — while keeping the playful Visdeurbel tone and making the data more "foolproof" to read.

Week 3 was the React conversion of the timeline into a genuine, accessible `<table>` (the first version intentionally static, just to learn how the tag behaved), followed by adding scroll-driven animation where the bar chart scales in as it enters view and a fish swims past indicating the most-spotted species that hour. Studio MOAN's response was mixed — they liked the playfulness but felt it read more like "which one is fastest" than a clear hourly read, and asked for less subtlety, more of a "water" feeling, and a possible quarter-turn to the layout.

Week 4 effectively started over: armed with everything learned so far, Nienke rebuilt the visualization from scratch rather than keep patching the earlier version, which also made the resulting code easier for her to actually understand (none of it was leftover scaffolding anymore). Asynchronous feedback from Paul — sent ahead of a week she'd be away at The Web You Want and CSS Day — suggested making the fish swim horizontally instead of appearing to leap out of the water, sizing them closer to their real proportions, giving the text block a solid background instead of a transparent one (and left-aligning it for readability), and swapping a blue accent for the brand's actual teal (`#1EACB0`). All of that feedback was applied directly, and the components were also moved over to the homepage this week.

Week 5 closed out with Studio MOAN's final round of feedback — fixing image and animation bugs, and nudging the overall visual feel from "open sea" toward a Utrecht canal (a "gracht") — alongside finishing up documentation.

### Reflectie op de leerdoelen

Looking back, the one-pager format made a traditional nav bar unnecessary, but Nienke still built in a form of "navigation" — visitors (including screen-reader users) move through the data using the same native controls as any standard HTML table, with the scroll animation adding to the feel without breaking that semantic base. On variation, she leaned hard into Vasilis's advice that you never really stop varying, sketching extensively before and during development and treating the act of building something as a form of research in itself. The group goal — learning to let go — turned out to be the most surprising one: the team initially worked so independently on their own modules that Studio MOAN gave feedback partway through that it felt like four separate projects rather than one. The fix was simple but effective: daily short check-ins on what everyone was working on, after which, in her words, the teamwork improved considerably.

---

## Julius — Carousel, Vijver, Klok & Styleguide

**Folder (carousel):** `components/carousel/`
**Files:** `EmblaCarousel.jsx`, `CarouselControls.jsx`, `FishSlide.jsx`, `dialog.jsx`, `fish.js`

**Folder (vijver):** `components/pond/`
**Files:** `Pond.jsx`

**Folder (klok):** `components/clock/`
**Files:** `Clock.jsx`

**Styleguide:** `STYLEGUIDE.md`, `public/styles/visdeurbel-tokens.css`

`Clock.jsx` is "Het ritme van de bel": a 24-hour analog-style clock where every hour gets its own hand, and hand length encodes how busy that hour is on average — the longest hand marks the busiest hour. Clicking a single hour opens a secondary timeline that splits it into six 10-minute blocks, each represented by a fish whose size grows with how many notifications landed in that block, drawn from a pool of fish images weighted by how often each species was actually reported. Both views read out fully to screen readers through dynamic ARIA labels and a parallel hidden data table.

`EmblaCarousel.jsx` is the scrollable fact-card slider built on Embla Carousel, with custom navigation controls (`CarouselControls.jsx`), fish-themed slides (`FishSlide.jsx`), and a dialog component (`dialog.jsx`) for expanded detail views. `fish.js` holds the fish data powering the slides.

`Pond.jsx` is the living pond animation: a canvas-based ripple simulation that plays back a week of Visdeurbel activity in real time, with each notification triggering a ripple on the water surface.

The styleguide (`STYLEGUIDE.md` + `visdeurbel-tokens.css`) is the shared design source-of-truth for the entire project — extracted from the Figma file, it defines all colour tokens, typography, spacing, and component guidelines that every team member's module follows.


---
