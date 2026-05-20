/* ──────────────────────────────────────────────
   Fish Doorbell — Wereldbol
   main.js  ·  Visdeurbel brand style
   Globe: drag to rotate, scroll to zoom
────────────────────────────────────────────── */

const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const DATA_URLS = {
  maand: '../json/event-maand.json',
  week:  '../json/event-week.json',
};
let currentPeriod = 'maand';

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

const COUNTRY_NAMES = {
  US:'Verenigde Staten',CA:'Canada',GB:'Verenigd Koninkrijk',DE:'Duitsland',
  FR:'Frankrijk',NL:'Nederland',AU:'Australië',JP:'Japan',CN:'China',IN:'India',
  BR:'Brazilië',MX:'Mexico',IT:'Italië',ES:'Spanje',KR:'Zuid-Korea',RU:'Rusland',
  SE:'Zweden',NO:'Noorwegen',DK:'Denemarken',FI:'Finland',BE:'België',
  CH:'Zwitserland',AT:'Oostenrijk',PL:'Polen',CZ:'Tsjechië',PT:'Portugal',
  GR:'Griekenland',HU:'Hongarije',ZA:'Zuid-Afrika',NG:'Nigeria',EG:'Egypte',
  AR:'Argentinië',CL:'Chili',CO:'Colombia',PE:'Peru',VE:'Venezuela',
  ID:'Indonesië',MY:'Maleisië',SG:'Singapore',TH:'Thailand',PH:'Filipijnen',
  VN:'Vietnam',PK:'Pakistan',BD:'Bangladesh',TR:'Turkije',IR:'Iran',IQ:'Irak',
  SA:'Saoedi-Arabië',IL:'Israël',AE:'VAE',TW:'Taiwan',HK:'Hongkong',NZ:'Nieuw-Zeeland',
};

function flag(code) {
  if (!code || code.length !== 2) return '🌍';
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}

// ── State ────────────────────────────────────────
let countryData  = {};
let allEvents    = [];
let maxEvents    = 1;
let currentMode  = 'choropleth';
let topoFeatures = [];
let autoRotate   = true;
let rotateTimer  = null;

// ── DOM ──────────────────────────────────────────
const tooltip        = document.getElementById('tooltip');
const svgEl          = document.getElementById('map-svg');
const countriesG     = d3.select('#countries-g');
const overlaysG      = d3.select('#overlays-g');
const graticuleG     = d3.select('#graticule-g');
const loadingOverlay = document.getElementById('loading-overlay');

// ── Globe size ───────────────────────────────────
const W = 500, H = 460, R = 200;

// ── Projection (Orthographic = globe) ────────────
const projection = d3.geoOrthographic()
  .scale(R)
  .translate([W / 2, H / 2])
  .clipAngle(90)
  .rotate([0, -20, 0]);   // start centred roughly on Europe/Atlantic

const pathGen = d3.geoPath(projection);

// ── Graticule (lat/lon grid lines) ───────────────
const graticule = d3.geoGraticule()();

// ── Colors ───────────────────────────────────────
const C = {
  land:      '#D8EFDF',
  landHover: '#B0D9BC',
  water:     '#A8D5EA',
  waterDeep: '#7ABCD8',
  green:     '#3A7D44',
  greenDark: '#1B4332',
  coral:     '#E8896A',
  stroke:    'rgba(27,67,50,0.2)',
  graticule: 'rgba(27,67,50,0.07)',
};

const colorScale = d3.scaleSequentialLog(d3.interpolate('#C8E6D0', '#1B4332'));

// ── Drag to rotate ───────────────────────────────
let isDragging = false;
let dragStart  = null;
let rotateStart = null;

function stopAutoRotate() {
  autoRotate = false;
  clearTimeout(rotateTimer);
  // Resume after 4s idle
  rotateTimer = setTimeout(() => { autoRotate = true; }, 4000);
}

d3.select(svgEl)
  .on('mousedown', function(event) {
    isDragging  = true;
    dragStart   = [event.clientX, event.clientY];
    rotateStart = projection.rotate().slice();
    stopAutoRotate();
    event.preventDefault();
  })
  .on('mousemove', function(event) {
    if (!isDragging) return;
    const dx = event.clientX - dragStart[0];
    const dy = event.clientY - dragStart[1];
    const sensitivity = 0.3;
    projection.rotate([
      rotateStart[0] + dx * sensitivity,
      rotateStart[1] - dy * sensitivity,
      rotateStart[2],
    ]);
    redraw();
  })
  .on('mouseup',   () => { isDragging = false; })
  .on('mouseleave', () => { isDragging = false; });

// Touch support
d3.select(svgEl)
  .on('touchstart', function(event) {
    const t = event.touches[0];
    isDragging  = true;
    dragStart   = [t.clientX, t.clientY];
    rotateStart = projection.rotate().slice();
    stopAutoRotate();
  }, { passive: true })
  .on('touchmove', function(event) {
    if (!isDragging) return;
    const t  = event.touches[0];
    const dx = t.clientX - dragStart[0];
    const dy = t.clientY - dragStart[1];
    projection.rotate([
      rotateStart[0] + dx * 0.35,
      rotateStart[1] - dy * 0.35,
      rotateStart[2],
    ]);
    redraw();
  }, { passive: true })
  .on('touchend', () => { isDragging = false; });

// ── Scroll to zoom ───────────────────────────────
d3.select(svgEl).on('wheel', function(event) {
  event.preventDefault();
  stopAutoRotate();
  const delta    = event.deltaY > 0 ? -20 : 20;
  const newScale = Math.max(150, Math.min(800, projection.scale() + delta));
  projection.scale(newScale);
  redraw();
}, { passive: false });

// ── Reset button ─────────────────────────────────
document.getElementById('zoom-reset').addEventListener('click', () => {
  stopAutoRotate();
  projection.scale(R).rotate([0, -20, 0]);
  redraw();
  autoRotate = true;
});

// ── Auto-rotate ──────────────────────────────────
function startRotationLoop() {
  let last = null;
  function frame(ts) {
    if (autoRotate && !isDragging) {
      if (last !== null) {
        const dt = ts - last;
        const r  = projection.rotate();
        projection.rotate([r[0] + dt * 0.012, r[1], r[2]]);
        redraw();
      }
    }
    last = ts;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ── Redraw entire globe ──────────────────────────
function redraw() {
  // Ocean sphere
  d3.select('#globe-sphere').attr('d', pathGen({ type: 'Sphere' }));

  // Graticule
  graticuleG.select('path').attr('d', pathGen(graticule));

  // Countries
  countriesG.selectAll('path').attr('d', pathGen);

  // Overlays (bubbles/pies) — reproject from stored [lon,lat]
  overlaysG.selectAll('.overlay-group').each(function() {
    const g      = d3.select(this);
    const lon    = +g.attr('data-lon');
    const lat    = +g.attr('data-lat');
    const coords = projection([lon, lat]);
    // Hide if on back of globe
    const visible = isVisible(lon, lat);
    g.attr('opacity', visible ? 1 : 0);
    if (coords) g.attr('transform', `translate(${coords[0]},${coords[1]})`);
  });
}

function isVisible(lon, lat) {
  const r   = projection.rotate();
  const rot = [-r[0] * Math.PI / 180, -r[1] * Math.PI / 180];
  const pt  = [lon * Math.PI / 180, lat * Math.PI / 180];
  const dot = Math.sin(rot[1]) * Math.sin(pt[1])
            + Math.cos(rot[1]) * Math.cos(pt[1]) * Math.cos(pt[0] - rot[0]);
  return dot > 0;
}

// ── Data ─────────────────────────────────────────
async function loadData() {
  const res  = await fetch(DATA_URLS[currentPeriod]);
  const text = await res.text();
  return text.trim().split('\n').map(l => JSON.parse(l));
}

function aggregate(events) {
  const map = {};
  events.forEach(ev => {
    const code  = ev.country; if (!code) return;
    const numId = ALPHA2_TO_NUMERIC[code]; if (!numId) return;
    if (!map[numId]) map[numId] = {
      numId, code, name: COUNTRY_NAMES[code] || code,
      events: 0, uploaded: 0, dismissed: 0, cities: {},
    };
    const c = map[numId];
    c.events++;
    if (ev.event_name === 'uploadedFish')       c.uploaded++;
    if (ev.event_name === 'dismissedUploading') c.dismissed++;
    if (ev.city) c.cities[ev.city] = (c.cities[ev.city] || 0) + 1;
  });
  Object.values(map).forEach(c => {
    c.topCities = Object.entries(c.cities)
      .sort((a,b) => b[1]-a[1]).slice(0,3).map(([city]) => city).join(', ');
  });
  return map;
}

// ── Tooltip ──────────────────────────────────────
function showTooltip(c, event) {
  document.getElementById('tt-name').textContent   = `${flag(c.code)} ${c.name}`;
  document.getElementById('tt-events').textContent = c.events.toLocaleString('nl-NL');
  document.getElementById('tt-up').textContent     = c.uploaded.toLocaleString('nl-NL');
  document.getElementById('tt-dis').textContent    = c.dismissed.toLocaleString('nl-NL');
  document.getElementById('tt-cities').textContent = c.topCities || '—';
  const rect = svgEl.getBoundingClientRect();
  const px   = event.clientX - rect.left;
  const py   = event.clientY - rect.top;
  tooltip.style.left = Math.min(px + 14, rect.width - 210) + 'px';
  tooltip.style.top  = Math.max(py - 10, 0) + 'px';
  tooltip.classList.add('visible');
}
function hideTooltip() { tooltip.classList.remove('visible'); }

// ── Stats ────────────────────────────────────────
function updateStats() {
  document.getElementById('v-total').textContent     = allEvents.length.toLocaleString('nl-NL');
  document.getElementById('v-countries').textContent = Object.keys(countryData).length.toLocaleString('nl-NL');
  document.getElementById('v-upload').textContent    = allEvents.filter(e => e.event_name === 'uploadedFish').length.toLocaleString('nl-NL');
  document.getElementById('v-dismiss').textContent   = allEvents.filter(e => e.event_name === 'dismissedUploading').length.toLocaleString('nl-NL');
  setTimeout(() => document.querySelectorAll('.stat-card').forEach((el, i) =>
    setTimeout(() => el.classList.add('loaded'), i * 150)), 300);
}

// ── Country list ─────────────────────────────────
const CENTROIDS = {
  US:[-96,38],CA:[-96,57],GB:[-3,54],DE:[10,51],FR:[2,46],NL:[5.3,52.3],
  AU:[134,-25],JP:[138,36],CN:[105,35],IN:[78,22],BR:[-55,-10],MX:[-102,24],
  IT:[12,42],ES:[-4,40],KR:[128,37],RU:[100,60],SE:[18,62],NO:[15,65],
  DK:[10,56],FI:[26,64],BE:[4.5,50.5],CH:[8.2,46.8],AT:[14,47],PL:[20,52],
  CZ:[15.5,49.8],PT:[-8,39.5],GR:[22,39],HU:[19,47],ZA:[25,-29],NG:[8,10],
  EG:[30,27],AR:[-65,-34],CL:[-71,-33],CO:[-74,4],PE:[-76,-10],ID:[118,-2],
  MY:[110,4],SG:[104,1.4],TH:[101,15],PH:[122,13],VN:[106,16],PK:[70,30],
  BD:[90,24],TR:[35,39],SA:[45,25],AE:[54,24],TW:[121,24],NZ:[172,-41],
  IL:[35,31],IR:[53,33],IQ:[44,33],VE:[-65,8],
};

function buildCountryList() {
  const list   = document.getElementById('country-list');
  list.innerHTML = '';
  const sorted = Object.values(countryData).sort((a,b) => b.events - a.events).slice(0, 20);
  const top    = sorted[0]?.events || 1;

  sorted.forEach(c => {
    const upPct  = ((c.uploaded  / top) * 100).toFixed(1);
    const disPct = ((c.dismissed / top) * 100).toFixed(1);
    const upR    = c.events > 0 ? Math.round(c.uploaded  / c.events * 100) : 0;
    const disR   = c.events > 0 ? Math.round(c.dismissed / c.events * 100) : 0;
    const coords = CENTROIDS[c.code];

    const row = document.createElement('div');
    row.className = 'country-row';
    // Click → spin globe to that country
    if (coords) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        stopAutoRotate();
        const [lon, lat] = coords;
        const start = projection.rotate();
        const end   = [-lon, -lat, 0];
        const interp = d3.interpolate(start, end);
        const dur = 800;
        const t0  = performance.now();
        function step(ts) {
          const t = Math.min(1, (ts - t0) / dur);
          const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // easeInOut
          projection.rotate(interp(ease));
          redraw();
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }

    row.innerHTML = `
      <div class="country-flag">${flag(c.code)}</div>
      <div class="country-info">
        <div class="country-name">${c.name}</div>
        <div class="country-bars">
          <div class="bar-row">
            <div class="bar-segment bar-green"  data-w="${upPct}"></div>
            <div class="bar-segment bar-orange" data-w="${disPct}"></div>
          </div>
          <div class="bar-labels">
            <span class="bar-label-green">🐟 ${c.uploaded.toLocaleString('nl-NL')} (${upR}%)</span>
            <span class="bar-label-orange">👋 ${c.dismissed.toLocaleString('nl-NL')} (${disR}%)</span>
          </div>
        </div>
      </div>
      <div class="country-count">${c.events.toLocaleString('nl-NL')}</div>
    `;
    list.appendChild(row);
  });

  requestAnimationFrame(() => {
    list.querySelectorAll('.bar-segment').forEach(b => { b.style.width = b.dataset.w + '%'; });
  });
}

function buildEventFeed() {
  const feed = document.getElementById('event-feed');
  feed.innerHTML = '';
  const recent = [...allEvents]
    .filter(e => e.event_name === 'uploadedFish' || e.event_name === 'dismissedUploading')
    .slice(-50).reverse();

  recent.forEach((ev, i) => {
    const isUp = ev.event_name === 'uploadedFish';
    const el   = document.createElement('div');
    el.className = 'event-item';
    el.style.animationDelay = (i * 25) + 'ms';
    const fish   = ev.referrer_query?.match(/fish=([^&]+)/)?.[1] || '';
    const detail = [ev.city, ev.country, ev.created_at?.slice(11,16),
                    isUp && fish ? decodeURIComponent(fish) : '']
      .filter(Boolean).join(' · ');
    el.innerHTML = `
      <div class="event-icon ${isUp ? 'upload' : 'dismiss'}">${isUp ? '🐟' : '👋'}</div>
      <div class="event-meta">
        <div class="event-type ${isUp ? 'upload' : 'dismiss'}">${isUp ? 'Vis gespot' : 'Gesloten'}</div>
        <div class="event-detail">${detail}</div>
      </div>
    `;
    feed.appendChild(el);
  });
}

// ── Renders ──────────────────────────────────────
function renderChoropleth() {
  colorScale.domain([1, maxEvents]);
  countriesG.selectAll('path')
    .attr('fill', d => { const c = countryData[d.id]; return c ? colorScale(c.events) : C.land; });
  overlaysG.selectAll('*').remove();
}

function renderBubble() {
  countriesG.selectAll('path').attr('fill', C.land);
  overlaysG.selectAll('*').remove();
  const rScale = d3.scaleSqrt([0, maxEvents], [0, 22]);

  Object.values(countryData).forEach(c => {
    const coords = CENTROIDS[c.code]; if (!coords) return;
    const [lon, lat] = coords;
    const [cx, cy]   = projection([lon, lat]) || [0, 0];
    const r          = rScale(c.events);
    const visible    = isVisible(lon, lat);

    const g = overlaysG.append('g')
      .attr('class', 'overlay-group')
      .attr('data-lon', lon).attr('data-lat', lat)
      .attr('transform', `translate(${cx},${cy})`)
      .attr('opacity', visible ? 1 : 0);

    g.append('circle').attr('r', r * 2)
      .attr('fill', C.green).attr('fill-opacity', 0.08);

    g.append('circle').attr('r', r)
      .attr('fill', C.green).attr('fill-opacity', 0.25)
      .attr('stroke', C.green).attr('stroke-width', 1.5)
      .on('mouseover', ev => { stopAutoRotate(); showTooltip(c, ev); })
      .on('mouseleave', hideTooltip);

    if (r > 6) {
      g.append('text').attr('y', 4).attr('text-anchor', 'middle')
        .attr('fill', C.greenDark)
        .attr('font-size', Math.max(8, Math.min(12, r * 0.55)) + 'px')
        .attr('font-family', 'DM Sans, sans-serif').attr('font-weight', '600')
        .attr('pointer-events', 'none')
        .text(c.events.toLocaleString('nl-NL'));
    }
  });
}

function renderEvents() {
  countriesG.selectAll('path').attr('fill', C.land);
  overlaysG.selectAll('*').remove();
  const rScale = d3.scaleSqrt([0, maxEvents], [0, 18]);
  const arc    = d3.arc().innerRadius(0);

  Object.values(countryData).forEach(c => {
    const coords = CENTROIDS[c.code]; if (!coords) return;
    const [lon, lat] = coords;
    const [cx, cy]   = projection([lon, lat]) || [0, 0];
    const r          = Math.max(6, rScale(c.events));
    const visible    = isVisible(lon, lat);
    arc.outerRadius(r);

    const total = c.uploaded + c.dismissed; if (!total) return;
    const tau = 2 * Math.PI, startA = -Math.PI / 2;
    const midA = startA + (c.uploaded / total) * tau;

    const g = overlaysG.append('g')
      .attr('class', 'overlay-group')
      .attr('data-lon', lon).attr('data-lat', lat)
      .attr('transform', `translate(${cx},${cy})`)
      .attr('opacity', visible ? 1 : 0);

    if (c.uploaded > 0) g.append('path')
      .datum({ startAngle: startA, endAngle: midA }).attr('d', arc)
      .attr('fill', C.green).attr('fill-opacity', 0.9)
      .on('mouseover', ev => { stopAutoRotate(); showTooltip(c, ev); })
      .on('mouseleave', hideTooltip);

    if (c.dismissed > 0) g.append('path')
      .datum({ startAngle: midA, endAngle: startA + tau }).attr('d', arc)
      .attr('fill', C.coral).attr('fill-opacity', 0.9)
      .on('mouseover', ev => { stopAutoRotate(); showTooltip(c, ev); })
      .on('mouseleave', hideTooltip);
  });
}

function render() {
  if (currentMode === 'choropleth') renderChoropleth();
  else if (currentMode === 'bubble') renderBubble();
  else renderEvents();
  redraw();
}

// ── Tabs ─────────────────────────────────────────
document.querySelectorAll('.map-tab[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.map-tab[data-mode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    render();
  });
});

// ── Init ─────────────────────────────────────────
async function init() {
  try {
    const [topoData, rawEvents] = await Promise.all([d3.json(TOPO_URL), loadData()]);

    allEvents    = rawEvents;
    countryData  = aggregate(rawEvents);
    maxEvents    = Math.max(...Object.values(countryData).map(c => c.events), 1);
    topoFeatures = topojson.feature(topoData, topoData.objects.countries).features;

    const svg = d3.select(svgEl).attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%');

    // Ocean sphere with subtle radial gradient feel
    svg.insert('defs', ':first-child').html(`
      <radialGradient id="oceanGrad" cx="38%" cy="35%" r="65%">
        <stop offset="0%"   stop-color="#C2E4F5"/>
        <stop offset="100%" stop-color="#6BAED6"/>
      </radialGradient>
      <radialGradient id="globeShine" cx="35%" cy="30%" r="60%">
        <stop offset="0%"   stop-color="white" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </radialGradient>
      <filter id="globeShadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="4" dy="8" stdDeviation="18" flood-color="#1B4332" flood-opacity="0.18"/>
      </filter>
    `);

    // Ocean
    svg.insert('path', '#graticule-g')
      .attr('id', 'globe-sphere')
      .attr('d', pathGen({ type: 'Sphere' }))
      .attr('fill', 'url(#oceanGrad)')
      .attr('filter', 'url(#globeShadow)');

    // Graticule
    graticuleG.append('path')
      .attr('d', pathGen(graticule))
      .attr('fill', 'none')
      .attr('stroke', C.graticule)
      .attr('stroke-width', 0.5);

    // Countries
    countriesG.selectAll('path')
      .data(topoFeatures).join('path')
      .attr('class', 'map-country')
      .attr('d', pathGen)
      .attr('stroke', C.stroke)
      .attr('stroke-width', 0.5)
      .attr('fill', C.land)
      .on('mouseover', function(event, d) {
        const c = countryData[d.id];
        if (c) { stopAutoRotate(); showTooltip(c, event); }
        d3.select(this).attr('fill', d => {
          const cd = countryData[d.id];
          return cd ? C.landHover : C.landHover;
        });
      })
      .on('mouseleave', function(event, d) {
        hideTooltip();
        d3.select(this).attr('fill', d => {
          const c = countryData[d.id];
          if (currentMode === 'choropleth' && c) return colorScale(c.events);
          return C.land;
        });
      });

    // Shine overlay
    svg.append('path')
      .attr('id', 'globe-shine')
      .attr('d', pathGen({ type: 'Sphere' }))
      .attr('fill', 'url(#globeShine)')
      .attr('pointer-events', 'none');

    // Sphere outline
    svg.append('path')
      .attr('id', 'globe-outline')
      .attr('d', pathGen({ type: 'Sphere' }))
      .attr('fill', 'none')
      .attr('stroke', 'rgba(27,67,50,0.2)')
      .attr('stroke-width', 1)
      .attr('pointer-events', 'none');

    updateStats();
    buildCountryList();
    buildEventFeed();
    render();
    startRotationLoop();
    loadingOverlay.classList.add('hidden');

  } catch (err) {
    console.error('Fout bij laden data:', err);
    document.querySelector('.loading-text').textContent = 'Fout bij laden — zie console.';
  }
}

init();

// ── Period switcher ──────────────────────────────
async function switchPeriod(period) {
  if (period === currentPeriod) return;
  currentPeriod = period;

  // Update button states
  document.querySelectorAll('.period-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.period === period);
  });

  // Show loading indicator
  const loadingEl = document.getElementById('period-loading');
  loadingEl.textContent = 'Laden…';
  loadingEl.classList.add('visible');

  // Dim the globe
  d3.select(svgEl).style('opacity', 0.5);

  try {
    const rawEvents = await loadData();
    allEvents   = rawEvents;
    countryData = aggregate(rawEvents);
    maxEvents   = Math.max(...Object.values(countryData).map(c => c.events), 1);

    updateStats();
    buildCountryList();
    buildEventFeed();
    render();
  } catch (err) {
    console.error('Fout bij laden periode:', err);
    loadingEl.textContent = 'Fout bij laden';
  } finally {
    d3.select(svgEl).style('opacity', 1);
    loadingEl.classList.remove('visible');
    loadingEl.textContent = '';
  }
}

document.querySelectorAll('.period-btn').forEach(btn => {
  btn.addEventListener('click', () => switchPeriod(btn.dataset.period));
});