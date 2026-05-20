/* ──────────────────────────────────────────────
   Fish Doorbell — World Map
   main.js
   Expects: json/event-maand.json (newline-delimited JSON)
   Depends on: D3 v7, TopoJSON v3 (loaded in index.html)
────────────────────────────────────────────── */

const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const DATA_URL = '../json/event-maand.json';

// ISO alpha-2  →  TopoJSON numeric id  (expand as needed)
const ALPHA2_TO_NUMERIC = {
  AF:'004',AX:'248',AL:'008',DZ:'012',AS:'016',AD:'020',AO:'024',AI:'660',
  AQ:'010',AG:'028',AR:'032',AM:'051',AW:'533',AU:'036',AT:'040',AZ:'031',
  BS:'044',BH:'048',BD:'050',BB:'052',BY:'112',BE:'056',BZ:'084',BJ:'204',
  BM:'060',BT:'064',BO:'068',BQ:'535',BA:'070',BW:'072',BV:'074',BR:'076',
  IO:'086',BN:'096',BG:'100',BF:'854',BI:'108',CV:'132',KH:'116',CM:'120',
  CA:'124',KY:'136',CF:'140',TD:'148',CL:'152',CN:'156',CX:'162',CC:'166',
  CO:'170',KM:'174',CG:'178',CD:'180',CK:'184',CR:'188',CI:'384',HR:'191',
  CU:'192',CW:'531',CY:'196',CZ:'203',DK:'208',DJ:'262',DM:'212',DO:'214',
  EC:'218',EG:'818',SV:'222',GQ:'226',ER:'232',EE:'233',SZ:'748',ET:'231',
  FK:'238',FO:'234',FJ:'242',FI:'246',FR:'250',GF:'254',PF:'258',TF:'260',
  GA:'266',GM:'270',GE:'268',DE:'276',GH:'288',GI:'292',GR:'300',GL:'304',
  GD:'308',GP:'312',GU:'316',GT:'320',GG:'831',GN:'324',GW:'624',GY:'328',
  HT:'332',HM:'334',VA:'336',HN:'340',HK:'344',HU:'348',IS:'352',IN:'356',
  ID:'360',IR:'364',IQ:'368',IE:'372',IM:'833',IL:'376',IT:'380',JM:'388',
  JP:'392',JE:'832',JO:'400',KZ:'398',KE:'404',KI:'296',KP:'408',KR:'410',
  KW:'414',KG:'417',LA:'418',LV:'428',LB:'422',LS:'426',LR:'430',LY:'434',
  LI:'438',LT:'440',LU:'442',MO:'446',MG:'450',MW:'454',MY:'458',MV:'462',
  ML:'466',MT:'470',MH:'584',MQ:'474',MR:'478',MU:'480',YT:'175',MX:'484',
  FM:'583',MD:'498',MC:'492',MN:'496',ME:'499',MS:'500',MA:'504',MZ:'508',
  MM:'104',NA:'516',NR:'520',NP:'524',NL:'528',NC:'540',NZ:'554',NI:'558',
  NE:'562',NG:'566',NU:'570',NF:'574',MK:'807',MP:'580',NO:'578',OM:'512',
  PK:'586',PW:'585',PS:'275',PA:'591',PG:'598',PY:'600',PE:'604',PH:'608',
  PN:'612',PL:'616',PT:'620',PR:'630',QA:'634',RE:'638',RO:'642',RU:'643',
  RW:'646',BL:'652',SH:'654',KN:'659',LC:'662',MF:'663',PM:'666',VC:'670',
  WS:'882',SM:'674',ST:'678',SA:'682',SN:'686',RS:'688',SC:'690',SL:'694',
  SG:'702',SX:'534',SK:'703',SI:'705',SB:'090',SO:'706',ZA:'710',GS:'239',
  SS:'728',ES:'724',LK:'144',SD:'729',SR:'740',SJ:'744',SE:'752',CH:'756',
  SY:'760',TW:'158',TJ:'762',TZ:'834',TH:'764',TL:'626',TG:'768',TK:'772',
  TO:'776',TT:'780',TN:'788',TR:'792',TM:'795',TC:'796',TV:'798',UG:'800',
  UA:'804',AE:'784',GB:'826',US:'840',UM:'581',UY:'858',UZ:'860',VU:'548',
  VE:'862',VN:'704',VG:'092',VI:'850',WF:'876',EH:'732',YE:'887',ZM:'894',
  ZW:'716',
};

// Country name for display
const COUNTRY_NAMES = {
  US:'United States',CA:'Canada',GB:'United Kingdom',DE:'Germany',FR:'France',
  NL:'Netherlands',AU:'Australia',JP:'Japan',CN:'China',IN:'India',BR:'Brazil',
  MX:'Mexico',IT:'Italy',ES:'Spain',KR:'South Korea',RU:'Russia',SE:'Sweden',
  NO:'Norway',DK:'Denmark',FI:'Finland',BE:'Belgium',CH:'Switzerland',AT:'Austria',
  PL:'Poland',CZ:'Czech Republic',PT:'Portugal',GR:'Greece',HU:'Hungary',
  ZA:'South Africa',NG:'Nigeria',EG:'Egypt',AR:'Argentina',CL:'Chile',CO:'Colombia',
  PE:'Peru',VE:'Venezuela',ID:'Indonesia',MY:'Malaysia',SG:'Singapore',TH:'Thailand',
  PH:'Philippines',VN:'Vietnam',PK:'Pakistan',BD:'Bangladesh',TR:'Turkey',IR:'Iran',
  IQ:'Iraq',SA:'Saudi Arabia',IL:'Israel',AE:'United Arab Emirates',TW:'Taiwan',
  HK:'Hong Kong',NZ:'New Zealand',
};

// Country flag emojis (regional indicator symbols)
function flag(code) {
  if (!code || code.length !== 2) return '🌍';
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}

// Centroid fallback coordinates per alpha-2 for bubble/pie placement
const CENTROIDS = {
  US:[-96,38],CA:[-96,57],GB:[-3,54],DE:[10,51],FR:[2,46],NL:[5.3,52.3],
  AU:[134,-25],JP:[138,36],CN:[105,35],IN:[78,22],BR:[-55,-10],MX:[-102,24],
  IT:[12,42],ES:[-4,40],KR:[128,37],RU:[100,60],SE:[18,62],NO:[15,65],
  DK:[10,56],FI:[26,64],BE:[4.5,50.5],CH:[8.2,46.8],AT:[14,47],PL:[20,52],
  CZ:[15.5,49.8],PT:[-8,39.5],GR:[22,39],HU:[19,47],ZA:[25,-29],NG:[8,10],
  EG:[30,27],AR:[-65,-34],CL:[-71,-33],CO:[-74,4],PE:[-76,-10],ID:[118,-2],
  MY:[110,4],SG:[104,1.4],TH:[101,15],PH:[122,13],VN:[106,16],PK:[70,30],
  BD:[90,24],TR:[35,39],SA:[45,25],AE:[54,24],TW:[121,24],NZ:[172,-41],
  IL:[35,31],IR:[53,33],IQ:[44,33],VE:[-65,8],PL:[20,52],
};

// ── State ──────────────────────────────────────
let countryData = {};   // numericId → { name, code, events, uploaded, dismissed, cities }
let allEvents   = [];
let maxEvents   = 1;
let currentMode = 'choropleth';
let topoFeatures = [];

// ── DOM refs ───────────────────────────────────
const tooltip       = document.getElementById('tooltip');
const countriesG    = d3.select('#countries-g');
const overlaysG     = d3.select('#overlays-g');
const loadingOverlay = document.getElementById('loading-overlay');

// ── Projection ─────────────────────────────────
const projection = d3.geoNaturalEarth1().scale(153).translate([480, 250]);
const pathGen    = d3.geoPath(projection);

// ── Color scale ────────────────────────────────
const colorScale = d3.scaleSequentialLog(d3.interpolate('#1a3a22', '#4ecb71'));

// ── Parse newline-delimited JSON ───────────────
async function loadData() {
  const res  = await fetch(DATA_URL);
  const text = await res.text();
  return text.trim().split('\n').map(line => JSON.parse(line));
}

// ── Aggregate raw events into countryData ──────
function aggregate(events) {
  const map = {};

  events.forEach(ev => {
    const code    = ev.country;
    if (!code) return;
    const numId   = ALPHA2_TO_NUMERIC[code];
    if (!numId) return;

    if (!map[numId]) {
      map[numId] = {
        numId,
        code,
        name:      COUNTRY_NAMES[code] || code,
        events:    0,
        uploaded:  0,
        dismissed: 0,
        cities:    {},
      };
    }

    const c = map[numId];
    c.events++;
    if (ev.event_name === 'uploadedFish')       c.uploaded++;
    if (ev.event_name === 'dismissedUploading') c.dismissed++;
    if (ev.city) c.cities[ev.city] = (c.cities[ev.city] || 0) + 1;
  });

  // Convert cities obj → sorted top-3 string
  Object.values(map).forEach(c => {
    c.topCities = Object.entries(c.cities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([city]) => city)
      .join(', ');
  });

  return map;
}

// ── Tooltip ────────────────────────────────────
function showTooltip(c, px, py) {
  document.getElementById('tt-name').textContent   = c.name;
  document.getElementById('tt-events').textContent = c.events.toLocaleString();
  document.getElementById('tt-up').textContent     = c.uploaded.toLocaleString();
  document.getElementById('tt-dis').textContent    = c.dismissed.toLocaleString();
  document.getElementById('tt-cities').textContent = c.topCities || '—';
  tooltip.style.left = (px + 14) + 'px';
  tooltip.style.top  = (py - 10) + 'px';
  tooltip.classList.add('visible');
}

function hideTooltip() {
  tooltip.classList.remove('visible');
}

// ── Stats bar ──────────────────────────────────
function updateStats() {
  const total     = allEvents.length;
  const countries = Object.keys(countryData).length;
  const uploaded  = allEvents.filter(e => e.event_name === 'uploadedFish').length;
  const dismissed = allEvents.filter(e => e.event_name === 'dismissedUploading').length;

  document.getElementById('v-total').textContent     = total.toLocaleString();
  document.getElementById('v-countries').textContent = countries.toLocaleString();
  document.getElementById('v-upload').textContent    = uploaded.toLocaleString();
  document.getElementById('v-dismiss').textContent   = dismissed.toLocaleString();

  setTimeout(() => {
    document.querySelectorAll('.stat').forEach((el, i) => {
      setTimeout(() => el.classList.add('loaded'), i * 120);
    });
  }, 200);
}

// ── Sidebar country list ───────────────────────
function buildCountryList() {
  const list = document.getElementById('country-list');
  list.innerHTML = '';

  const sorted = Object.values(countryData).sort((a, b) => b.events - a.events).slice(0, 20);
  const top    = sorted[0]?.events || 1;

  sorted.forEach(c => {
    const row = document.createElement('div');
    row.className = 'country-row';
    row.innerHTML = `
      <div class="country-flag">${flag(c.code)}</div>
      <div class="country-info">
        <div class="country-name">${c.name}</div>
        <div class="country-bar-wrap">
          <div class="country-bar" data-pct="${(c.events / top * 100).toFixed(1)}"></div>
        </div>
      </div>
      <div class="country-count">${c.events.toLocaleString()}</div>
    `;
    list.appendChild(row);
  });

  // Animate bars after paint
  requestAnimationFrame(() => {
    list.querySelectorAll('.country-bar').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });
  });
}

// ── Event feed ─────────────────────────────────
function buildEventFeed() {
  const feed   = document.getElementById('event-feed');
  feed.innerHTML = '';

  // Show most recent 40 events
  const recent = [...allEvents]
    .filter(e => e.event_name === 'uploadedFish' || e.event_name === 'dismissedUploading')
    .slice(-40).reverse();

  recent.forEach((ev, i) => {
    const isUp = ev.event_name === 'uploadedFish';
    const el   = document.createElement('div');
    el.className = 'event-item';
    el.style.animationDelay = (i * 30) + 'ms';

    const fish   = ev.referrer_query?.match(/fish=([^&]+)/)?.[1] || '';
    const detail = [
      ev.city,
      ev.country,
      ev.created_at?.slice(11, 16),
      isUp && fish ? fish : '',
    ].filter(Boolean).join(' · ');

    el.innerHTML = `
      <div class="event-icon ${isUp ? 'upload' : 'dismiss'}">${isUp ? '🐟' : '✕'}</div>
      <div class="event-meta">
        <div class="event-type" style="color:${isUp ? 'var(--green)' : 'var(--orange)'}">${ev.event_name}</div>
        <div class="event-detail">${detail}</div>
      </div>
    `;
    feed.appendChild(el);
  });
}

// ── Map renders ────────────────────────────────
function renderChoropleth() {
  colorScale.domain([1, maxEvents]);

  countriesG.selectAll('path')
    .attr('fill', d => {
      const c = countryData[d.id];
      return c ? colorScale(c.events) : '#1a2e20';
    });

  overlaysG.selectAll('*').remove();
}

function renderBubble() {
  countriesG.selectAll('path').attr('fill', '#1a2e20');
  overlaysG.selectAll('*').remove();

  const rScale = d3.scaleSqrt([0, maxEvents], [0, 36]);

  Object.values(countryData).forEach(c => {
    const coords = CENTROIDS[c.code];
    if (!coords) return;
    const [cx, cy] = projection(coords);
    const r        = rScale(c.events);

    // Glow
    overlaysG.append('circle')
      .attr('cx', cx).attr('cy', cy).attr('r', 0)
      .attr('fill', 'url(#glow)')
      .transition().duration(800).attr('r', r * 2.2);

    // Bubble
    overlaysG.append('circle')
      .attr('cx', cx).attr('cy', cy).attr('r', 0)
      .attr('fill', '#4ecb71').attr('fill-opacity', 0.2)
      .attr('stroke', '#4ecb71').attr('stroke-width', 1.2)
      .on('mousemove', ev => showTooltip(c, ev.offsetX, ev.offsetY))
      .on('mouseleave', hideTooltip)
      .transition().duration(600).attr('r', r);

    // Label (only if bubble is large enough)
    if (r > 8) {
      overlaysG.append('text')
        .attr('x', cx).attr('y', cy + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', '#a8f0be')
        .attr('font-size', Math.max(9, Math.min(13, r * 0.55)) + 'px')
        .attr('font-family', 'DM Mono, monospace')
        .attr('pointer-events', 'none')
        .text(c.events.toLocaleString());
    }
  });
}

function renderEvents() {
  countriesG.selectAll('path').attr('fill', '#1a2e20');
  overlaysG.selectAll('*').remove();

  const rScale = d3.scaleSqrt([0, maxEvents], [0, 28]);
  const arc    = d3.arc().innerRadius(0);

  Object.values(countryData).forEach(c => {
    const coords = CENTROIDS[c.code];
    if (!coords) return;
    const [cx, cy] = projection(coords);
    const r        = Math.max(6, rScale(c.events));
    arc.outerRadius(r);

    const total  = c.uploaded + c.dismissed;
    if (!total) return;

    const tau    = 2 * Math.PI;
    const startA = -Math.PI / 2;
    const midA   = startA + (c.uploaded / total) * tau;

    const g = overlaysG.append('g').attr('transform', `translate(${cx},${cy})`);

    if (c.uploaded > 0) {
      g.append('path')
        .datum({ startAngle: startA, endAngle: midA })
        .attr('d', arc)
        .attr('fill', '#4ecb71').attr('fill-opacity', 0.85)
        .on('mousemove', ev => showTooltip(c, ev.offsetX, ev.offsetY))
        .on('mouseleave', hideTooltip);
    }

    if (c.dismissed > 0) {
      g.append('path')
        .datum({ startAngle: midA, endAngle: startA + tau })
        .attr('d', arc)
        .attr('fill', '#e8844a').attr('fill-opacity', 0.85)
        .on('mousemove', ev => showTooltip(c, ev.offsetX, ev.offsetY))
        .on('mouseleave', hideTooltip);
    }

    if (r > 10) {
      g.append('text')
        .attr('y', r + 11)
        .attr('text-anchor', 'middle')
        .attr('fill', '#6a8a72')
        .attr('font-size', '9px')
        .attr('font-family', 'DM Mono, monospace')
        .attr('pointer-events', 'none')
        .text(c.name);
    }
  });
}

function render() {
  if (currentMode === 'choropleth') renderChoropleth();
  else if (currentMode === 'bubble') renderBubble();
  else renderEvents();
}

// ── Tab switcher ───────────────────────────────
document.querySelectorAll('.map-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.map-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    render();
  });
});

// ── Boot ───────────────────────────────────────
async function init() {
  try {
    const [topoData, rawEvents] = await Promise.all([
      d3.json(TOPO_URL),
      loadData(),
    ]);

    allEvents   = rawEvents;
    countryData = aggregate(rawEvents);
    maxEvents   = Math.max(...Object.values(countryData).map(c => c.events), 1);
    topoFeatures = topojson.feature(topoData, topoData.objects.countries).features;

    // Draw base map
    countriesG.selectAll('path')
      .data(topoFeatures).join('path')
      .attr('class', 'map-country')
      .attr('d', pathGen)
      .attr('stroke', 'rgba(80,180,100,0.12)')
      .attr('stroke-width', 0.4)
      .attr('fill', '#1a2e20')
      .on('mousemove', function(event, d) {
        const c = countryData[d.id];
        if (c) showTooltip(c, event.offsetX, event.offsetY);
      })
      .on('mouseleave', hideTooltip);

    updateStats();
    buildCountryList();
    buildEventFeed();
    render();

    loadingOverlay.classList.add('hidden');

  } catch (err) {
    console.error('Failed to load data:', err);
    document.querySelector('.loading-text').textContent = 'Error loading data — check the console.';
  }
}

init();
