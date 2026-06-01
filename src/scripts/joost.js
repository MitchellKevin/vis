import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const DATA_URLS = {
  maand: '/json/event-maand.json',
  week:  '/json/event-week.json',
};

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

const FISH_COLORS = {
  'Baars':'#2196F3','Brasem':'#FF9800','Karper':'#9C27B0',
  'Snoekbaars':'#F44336','Paling':'#795548','unknown':'#9E9E9E',
};
const OS_COLORS = {
  'Windows':'#0078D4','macOS':'#999999','iOS':'#A2AAAD',
  'Android':'#3DDC84','Linux':'#E95420','Chrome OS':'#FBBC04','Overig':'#B0BEC5',
};
const BROWSER_COLORS = {
  'Chrome':'#4285F4','Safari':'#006CFF','Edge':'#0078D4',
  'Firefox':'#FF7139','Samsung':'#1428A0','Opera':'#FF1B2D','Overig':'#B0BEC5',
};
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
const UTRECHT = [5.1214, 52.0908];
const W = 370, H = 340, R = 145;

function normalizeOS(raw) {
  const s = (raw || '').toLowerCase();
  if (s.includes('windows'))   return 'Windows';
  if (s.includes('mac'))       return 'macOS';
  if (s.includes('ios'))       return 'iOS';
  if (s.includes('android'))   return 'Android';
  if (s.includes('linux'))     return 'Linux';
  if (s.includes('chrome os')) return 'Chrome OS';
  return 'Overig';
}

function normalizeBrowser(raw) {
  const s = (raw || '').toLowerCase();
  if (s.includes('edge'))            return 'Edge';
  if (s.includes('chrome'))         return 'Chrome';
  if (s.includes('firefox'))        return 'Firefox';
  if (s.includes('safari') && !s.includes('chrome')) return 'Safari';
  if (s.includes('ios'))            return 'Safari';
  if (s.includes('samsung'))        return 'Samsung';
  if (s.includes('opera'))          return 'Opera';
  return 'Overig';
}

function aggregate(events) {
  const map = {};
  events.forEach(ev => {
    const code  = ev.country; if (!code) return;
    const numId = ALPHA2_TO_NUMERIC[code]; if (!numId) return;
    if (!map[numId]) map[numId] = {
      numId, code, name: COUNTRY_NAMES[code] || code,
      events: 0, uploaded: 0, dismissed: 0,
      cities: {}, fish: {}, hours: [],
      mobile: 0, desktop: 0, os: {}, browser: {},
    };
    const c = map[numId];
    c.events++;
    if (ev.event_name === 'uploadedFish')       c.uploaded++;
    if (ev.event_name === 'dismissedUploading') c.dismissed++;
    if (ev.city) c.cities[ev.city] = (c.cities[ev.city] || 0) + 1;
    const dev = (ev.device || '').toLowerCase();
    if (dev === 'mobile' || dev === 'tablet') c.mobile++;
    else if (dev === 'laptop' || dev === 'desktop') c.desktop++;
    const fishMatch = (ev.referrer_query || '').match(/fish=([^&]+)/);
    if (fishMatch) { const f = decodeURIComponent(fishMatch[1]); c.fish[f] = (c.fish[f] || 0) + 1; }
    if (ev.created_at) { const h = parseInt(ev.created_at.slice(11, 13), 10); if (!isNaN(h)) c.hours.push(h); }
    if (ev.os) { const os = normalizeOS(ev.os); c.os[os] = (c.os[os] || 0) + 1; }
    if (ev.browser) { const br = normalizeBrowser(ev.browser); c.browser[br] = (c.browser[br] || 0) + 1; }
  });

  const UNKNOWN_VALS = ['unknown', 'Unknown', 'onbekend', 'Onbekend', 'Overig'];
  const firstKnown = (obj) => {
    const sorted = Object.entries(obj).sort((a,b) => b[1]-a[1]);
    return (sorted.find(([k]) => !UNKNOWN_VALS.includes(k)) || sorted[0])?.[0] || null;
  };

  Object.values(map).forEach(c => {
    c.topCities  = Object.entries(c.cities).sort((a,b) => b[1]-a[1]).slice(0,3).map(([city]) => city).join(', ');
    c.topFish    = firstKnown(c.fish);
    c.topOS      = firstKnown(c.os);
    c.topBrowser = firstKnown(c.browser);
    c.avgHour    = c.hours.length ? Math.round(c.hours.reduce((a,b) => a+b,0) / c.hours.length) : null;
  });
  return map;
}

export function initJoost() {
  // ── State ─────────────────────────────────────────
  let currentPeriod = 'maand';
  let countryData   = {};
  let allEvents     = [];
  let maxEvents     = 1;
  let currentMode   = 'choropleth';
  let topoFeatures  = [];
  let autoRotate    = true;
  let rotateTimer   = null;
  let rafId         = null;
  let destroyed     = false;

  // ── DOM ───────────────────────────────────────────
  const tooltip        = document.getElementById('tooltip');
  const svgEl          = document.getElementById('map-svg');
  const countriesG     = d3.select('#countries-g');
  const overlaysG      = d3.select('#overlays-g');
  const graticuleG     = d3.select('#graticule-g');
  const loadingOverlay = document.getElementById('loading-overlay');

  // ── Projection ────────────────────────────────────
  const projection = d3.geoOrthographic()
    .scale(R).translate([W / 2, H / 2]).clipAngle(90).rotate([0, -20, 0]);
  const pathGen  = d3.geoPath(projection);
  const graticule = d3.geoGraticule()();
  const colorScale = d3.scaleSequentialLog(d3.interpolate('#C8E6D0', '#1B4332'));

  const C = {
    land:'#d4ede9', landHover:'#b0d9d4', water:'#c2e8f5', waterDeep:'#7abcd8',
    green:'#1eacb0', greenDark:'#01463c', coral:'#ff80b9',
    stroke:'rgba(1,70,60,0.2)', graticule:'rgba(1,70,60,0.07)',
  };

  // ── Drag ──────────────────────────────────────────
  let isDragging = false, dragStart = null, rotateStart = null;

  function stopAutoRotate() {
    autoRotate = false;
    clearTimeout(rotateTimer);
    rotateTimer = setTimeout(() => { autoRotate = true; }, 4000);
  }

  d3.select(svgEl)
    .on('mousedown', function(event) {
      isDragging = true; dragStart = [event.clientX, event.clientY];
      rotateStart = projection.rotate().slice(); stopAutoRotate(); event.preventDefault();
    })
    .on('mousemove', function(event) {
      if (!isDragging) return;
      const dx = event.clientX - dragStart[0], dy = event.clientY - dragStart[1];
      projection.rotate([rotateStart[0] + dx * 0.3, rotateStart[1] - dy * 0.3, rotateStart[2]]);
      redraw();
    })
    .on('mouseup',   () => { isDragging = false; })
    .on('mouseleave', () => { isDragging = false; })
    .on('touchstart', function(event) {
      const t = event.touches[0]; isDragging = true;
      dragStart = [t.clientX, t.clientY]; rotateStart = projection.rotate().slice(); stopAutoRotate();
    }, { passive: true })
    .on('touchmove', function(event) {
      if (!isDragging) return;
      const t = event.touches[0], dx = t.clientX - dragStart[0], dy = t.clientY - dragStart[1];
      projection.rotate([rotateStart[0] + dx * 0.35, rotateStart[1] - dy * 0.35, rotateStart[2]]);
      redraw();
    }, { passive: true })
    .on('touchend', () => { isDragging = false; })
    .on('wheel', function(event) {
      event.preventDefault(); stopAutoRotate();
      const delta = event.deltaY > 0 ? -20 : 20;
      projection.scale(Math.max(150, Math.min(800, projection.scale() + delta)));
      redraw();
    }, { passive: false });

  document.getElementById('zoom-reset')?.addEventListener('click', () => {
    stopAutoRotate(); projection.scale(R).rotate([0, -20, 0]); redraw(); autoRotate = true;
  });

  // ── Redraw ────────────────────────────────────────
  function redraw() {
    d3.select('#globe-sphere').attr('d', pathGen({ type: 'Sphere' }));
    graticuleG.select('path').attr('d', pathGen(graticule));
    countriesG.selectAll('path').attr('d', pathGen);
    d3.select('#globe-shine').attr('d', pathGen({ type: 'Sphere' }));
    d3.select('#globe-outline').attr('d', pathGen({ type: 'Sphere' }));
    overlaysG.selectAll('.overlay-group').each(function() {
      const g = d3.select(this), lon = +g.attr('data-lon'), lat = +g.attr('data-lat');
      const visible = isVisible(lon, lat);
      if (g.classed('flow-line')) {
        g.attr('opacity', visible ? 0.55 : 0);
        g.attr('d', pathGen({ type: 'LineString', coordinates: [[lon, lat], UTRECHT] }));
        return;
      }
      const coords = projection([lon, lat]);
      g.attr('opacity', visible ? 1 : 0);
      if (coords) g.attr('transform', `translate(${coords[0]},${coords[1]})`);
    });
  }

  function isVisible(lon, lat) {
    const r = projection.rotate();
    const rot = [-r[0] * Math.PI / 180, -r[1] * Math.PI / 180];
    const pt  = [lon * Math.PI / 180, lat * Math.PI / 180];
    const dot = Math.sin(rot[1]) * Math.sin(pt[1])
              + Math.cos(rot[1]) * Math.cos(pt[1]) * Math.cos(pt[0] - rot[0]);
    return dot > 0;
  }

  // ── Rotation loop ─────────────────────────────────
  function startRotationLoop() {
    let last = null;
    function frame(ts) {
      if (destroyed) return;
      if (autoRotate && !isDragging) {
        if (last !== null) {
          const r = projection.rotate();
          projection.rotate([r[0] + (ts - last) * 0.012, r[1], r[2]]);
          redraw();
        }
      }
      last = ts;
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  // ── Data ──────────────────────────────────────────
  async function loadData() {
    const res = await fetch(DATA_URLS[currentPeriod]);
    const text = await res.text();
    return text.trim().split('\n').map(l => JSON.parse(l));
  }

  // ── Tooltip ───────────────────────────────────────
  function tooltipRows(c) {
    const n   = v => Number(v).toLocaleString('nl-NL');
    const pct = (a, b) => b > 0 ? ` (${Math.round(a/b*100)}%)` : '';
    const row = (label, val, color='') =>
      `<div class="tt-row">${color ? `<span class="tt-dot" style="background:${color}"></span>` : ''}<span class="tt-label">${label}</span><span class="tt-val">${val}</span></div>`;
    const base = row('Bezoeken', n(c.events));

    if (['choropleth','bubble','flows'].includes(currentMode))
      return base + row('🐟 Gespot', n(c.uploaded) + pct(c.uploaded, c.events), C.green)
                  + row('👋 Gesloten', n(c.dismissed) + pct(c.dismissed, c.events), C.coral)
                  + row('Steden', c.topCities || '—');
    if (['uploadrate','pies'].includes(currentMode)) {
      const upPct = c.events > 0 ? Math.round(c.uploaded / c.events * 100) : 0;
      const disPct = c.events > 0 ? Math.round(c.dismissed / c.events * 100) : 0;
      return base + row('🐟 Gespot', `${n(c.uploaded)} — ${upPct}%`, C.green)
                  + row('👋 Gesloten', `${n(c.dismissed)} — ${disPct}%`, C.coral);
    }
    if (currentMode === 'device') {
      const other = c.events - c.mobile - c.desktop;
      return base + row('💻 Desktop/laptop', n(c.desktop) + pct(c.desktop, c.events), '#F5A623')
                  + row('📱 Mobiel/tablet', n(c.mobile) + pct(c.mobile, c.events), '#7B4FBF')
                  + (other > 0 ? row('❓ Overig', n(other) + pct(other, c.events), C.green) : '');
    }
    if (currentMode === 'fish') {
      const entries = Object.entries(c.fish).sort((a,b) => b[1]-a[1]).slice(0,5);
      if (!entries.length) return base + row('Vis', 'Geen data');
      return base + entries.map(([name, count]) =>
        row(`🐟 ${name}`, n(count) + pct(count, c.uploaded || c.events), FISH_COLORS[name] || '#607D8B')).join('');
    }
    if (currentMode === 'time') {
      const buckets = { nacht:0, ochtend:0, middag:0, avond:0 };
      (c.hours || []).forEach(h => {
        if (h < 6) buckets.nacht++;
        else if (h < 12) buckets.ochtend++;
        else if (h < 18) buckets.middag++;
        else buckets.avond++;
      });
      const avgH = c.avgHour;
      const avgLabel = avgH === null ? '—' : avgH < 6 ? `${avgH}:00 — Nacht 🌙` : avgH < 12 ? `${avgH}:00 — Ochtend 🌅` : avgH < 18 ? `${avgH}:00 — Middag ☀️` : `${avgH}:00 — Avond 🌆`;
      return base + row('⏰ Gem. tijdstip', avgLabel)
        + row('🌙 Nacht (0–6u)', n(buckets.nacht) + pct(buckets.nacht, c.events), '#5C35A8')
        + row('🌅 Ochtend (6–12u)', n(buckets.ochtend) + pct(buckets.ochtend, c.events), '#F5C842')
        + row('☀️ Middag (12–18u)', n(buckets.middag) + pct(buckets.middag, c.events), '#E8896A')
        + row('🌆 Avond (18–24u)', n(buckets.avond) + pct(buckets.avond, c.events), '#3A7D44');
    }
    if (currentMode === 'os') {
      const entries = Object.entries(c.os || {}).sort((a,b) => b[1]-a[1]);
      if (!entries.length) return base + row('OS', 'Geen data');
      return base + entries.map(([name, count]) => row(name, n(count) + pct(count, c.events), OS_COLORS[name] || '#B0BEC5')).join('');
    }
    if (currentMode === 'browser') {
      const entries = Object.entries(c.browser || {}).sort((a,b) => b[1]-a[1]);
      if (!entries.length) return base + row('Browser', 'Geen data');
      return base + entries.map(([name, count]) => row(name, n(count) + pct(count, c.events), BROWSER_COLORS[name] || '#B0BEC5')).join('');
    }
    return base;
  }

  function showTooltip(c, event) {
    document.getElementById('tt-name').innerHTML = `${flag(c.code)} ${c.name}`;
    document.getElementById('tt-body').innerHTML = tooltipRows(c);
    const rect = svgEl.getBoundingClientRect();
    const px = event.clientX - rect.left, py = event.clientY - rect.top;
    tooltip.style.left = Math.min(px + 14, rect.width - 230) + 'px';
    tooltip.style.top  = Math.max(py - 10, 0) + 'px';
    tooltip.classList.add('visible');
  }
  function hideTooltip() { tooltip.classList.remove('visible'); }

  // ── Stats ─────────────────────────────────────────
  function updateStats() {
    document.getElementById('v-total').textContent     = allEvents.length.toLocaleString('nl-NL');
    document.getElementById('v-countries').textContent = Object.keys(countryData).length.toLocaleString('nl-NL');
    document.getElementById('v-upload').textContent    = allEvents.filter(e => e.event_name === 'uploadedFish').length.toLocaleString('nl-NL');
    document.getElementById('v-dismiss').textContent   = allEvents.filter(e => e.event_name === 'dismissedUploading').length.toLocaleString('nl-NL');
    setTimeout(() => document.querySelectorAll('.stat-card').forEach((el, i) =>
      setTimeout(() => el.classList.add('loaded'), i * 150)), 300);
  }

  // ── Country list ──────────────────────────────────
  function buildCountryList() {
    const list = document.getElementById('country-list');
    list.innerHTML = '';
    const sorted = Object.values(countryData).sort((a,b) => b.events - a.events).slice(0, 20);
    const top = sorted[0]?.events || 1;
    sorted.forEach(c => {
      const upPct = ((c.uploaded / top) * 100).toFixed(1);
      const disPct = ((c.dismissed / top) * 100).toFixed(1);
      const upR = c.events > 0 ? Math.round(c.uploaded / c.events * 100) : 0;
      const disR = c.events > 0 ? Math.round(c.dismissed / c.events * 100) : 0;
      const coords = CENTROIDS[c.code];
      const row = document.createElement('div');
      row.className = 'country-row';
      if (coords) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
          stopAutoRotate();
          const [lon, lat] = coords, start = projection.rotate(), end = [-lon, -lat, 0];
          const interp = d3.interpolate(start, end), dur = 800, t0 = performance.now();
          function stepFn(ts) {
            const t = Math.min(1, (ts - t0) / dur), ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
            projection.rotate(interp(ease)); redraw(); if (t < 1) requestAnimationFrame(stepFn);
          }
          requestAnimationFrame(stepFn);
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
        <div class="country-count">${c.events.toLocaleString('nl-NL')}</div>`;
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
      const el = document.createElement('div');
      el.className = 'event-item';
      el.style.animationDelay = (i * 25) + 'ms';
      const fish = ev.referrer_query?.match(/fish=([^&]+)/)?.[1] || '';
      const detail = [ev.city, ev.country, ev.created_at?.slice(11,16),
                      isUp && fish ? decodeURIComponent(fish) : ''].filter(Boolean).join(' · ');
      el.innerHTML = `
        <div class="event-icon ${isUp ? 'upload' : 'dismiss'}">${isUp ? '🐟' : '👋'}</div>
        <div class="event-meta">
          <div class="event-type ${isUp ? 'upload' : 'dismiss'}">${isUp ? 'Vis gespot' : 'Gesloten'}</div>
          <div class="event-detail">${detail}</div>
        </div>`;
      feed.appendChild(el);
    });
  }

  function setLegend(html) {
    const el = document.getElementById('map-legend');
    if (!html) { el.style.display = 'none'; return; }
    el.style.display = 'block'; el.innerHTML = html;
  }

  function overlayGroup(lon, lat, c) {
    const [cx, cy] = projection([lon, lat]) || [W/2, H/2];
    return overlaysG.append('g')
      .attr('class', 'overlay-group').attr('data-lon', lon).attr('data-lat', lat)
      .attr('transform', `translate(${cx},${cy})`).attr('opacity', isVisible(lon, lat) ? 1 : 0)
      .on('mouseover', ev => { stopAutoRotate(); showTooltip(c, ev); })
      .on('mouseleave', hideTooltip);
  }

  function getCountryFill(d) {
    const c = countryData[d.id];
    if (currentMode === 'choropleth') { if (!c) return C.land; colorScale.domain([1, maxEvents]); return colorScale(c.events); }
    if (currentMode === 'uploadrate') { if (!c || c.events === 0) return C.land; return d3.scaleSequential(d3.interpolateRdYlGn).domain([0,1])(c.uploaded/c.events); }
    if (currentMode === 'fish')       { if (!c || !c.topFish) return C.land; return FISH_COLORS[c.topFish] || '#607D8B'; }
    if (currentMode === 'time')       { if (!c || c.avgHour === null) return C.land; const h = c.avgHour; return h < 6 ? '#5C35A8' : h < 12 ? '#F5C842' : h < 18 ? '#E8896A' : '#3A7D44'; }
    if (currentMode === 'os')         { if (!c || !c.topOS) return C.land; return OS_COLORS[c.topOS] || '#B0BEC5'; }
    if (currentMode === 'browser')    { if (!c || !c.topBrowser) return C.land; return BROWSER_COLORS[c.topBrowser] || '#B0BEC5'; }
    return C.land;
  }

  function renderChoropleth() {
    colorScale.domain([1, maxEvents]);
    countriesG.selectAll('path').attr('fill', d => { const c = countryData[d.id]; return c ? colorScale(c.events) : C.land; });
    overlaysG.selectAll('*').remove();
    setLegend(`<div class="map-legend-title">Bezoeken</div><div class="map-legend-gradient" style="background:linear-gradient(to right,#C8E6D0,#1B4332)"></div><div class="map-legend-gradient-labels"><span>Weinig</span><span>Veel</span></div>`);
  }
  function renderBubble() {
    countriesG.selectAll('path').attr('fill', C.land); overlaysG.selectAll('*').remove();
    const rScale = d3.scaleSqrt([0, maxEvents], [0, 22]);
    setLegend(`<div class="map-legend-title">Bellen = bezoeken</div><div class="map-legend-row"><div class="map-legend-swatch" style="background:#3A7D44;border-radius:50%"></div>Groter = meer</div>`);
    Object.values(countryData).forEach(c => {
      const coords = CENTROIDS[c.code]; if (!coords) return;
      const [lon, lat] = coords, r = rScale(c.events);
      const g = overlayGroup(lon, lat, c);
      g.append('circle').attr('r', r * 2).attr('fill', C.green).attr('fill-opacity', 0.08);
      g.append('circle').attr('r', r).attr('fill', C.green).attr('fill-opacity', 0.25).attr('stroke', C.green).attr('stroke-width', 1.5);
      if (r > 6) g.append('text').attr('y', 4).attr('text-anchor', 'middle').attr('fill', C.greenDark)
        .attr('font-size', Math.max(8, Math.min(12, r * 0.55)) + 'px').attr('font-family', 'DM Sans, sans-serif')
        .attr('font-weight', '600').attr('pointer-events', 'none').text(c.events.toLocaleString('nl-NL'));
    });
  }
  function renderUploadRate() {
    const rateScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([0, 1]);
    countriesG.selectAll('path').attr('fill', d => { const c = countryData[d.id]; if (!c || c.events===0) return C.land; return rateScale(c.uploaded/c.events); });
    overlaysG.selectAll('*').remove();
    setLegend(`<div class="map-legend-title">Upload ratio</div><div class="map-legend-gradient" style="background:linear-gradient(to right,#d73027,#ffffbf,#1a9850)"></div><div class="map-legend-gradient-labels"><span>Gesloten</span><span>Gespot</span></div>`);
  }
  function renderPies() {
    countriesG.selectAll('path').attr('fill', C.land); overlaysG.selectAll('*').remove();
    const rScale = d3.scaleSqrt([0, maxEvents], [0, 18]), arc = d3.arc().innerRadius(0);
    setLegend(`<div class="map-legend-title">Taarten</div><div class="map-legend-row"><div class="map-legend-swatch" style="background:#3A7D44"></div>Gespot</div><div class="map-legend-row"><div class="map-legend-swatch" style="background:#E8896A"></div>Gesloten</div>`);
    Object.values(countryData).forEach(c => {
      const coords = CENTROIDS[c.code]; if (!coords) return;
      const [lon, lat] = coords, r = Math.max(6, rScale(c.events)); arc.outerRadius(r);
      const total = c.uploaded + c.dismissed; if (!total) return;
      const tau = 2 * Math.PI, startA = -Math.PI / 2, midA = startA + (c.uploaded / total) * tau;
      const g = overlayGroup(lon, lat, c);
      if (c.uploaded > 0) g.append('path').datum({ startAngle: startA, endAngle: midA }).attr('d', arc).attr('fill', C.green).attr('fill-opacity', 0.9);
      if (c.dismissed > 0) g.append('path').datum({ startAngle: midA, endAngle: startA + tau }).attr('d', arc).attr('fill', C.coral).attr('fill-opacity', 0.9);
    });
  }
  function renderFlows() {
    countriesG.selectAll('path').attr('fill', C.land); overlaysG.selectAll('*').remove();
    const wScale = d3.scaleSqrt([0, maxEvents], [0.5, 4]);
    setLegend(`<div class="map-legend-title">Lijnen naar Utrecht</div><div class="map-legend-row"><div class="map-legend-swatch" style="background:#3A7D44;height:3px;border-radius:2px"></div>Dikker = meer</div>`);
    Object.values(countryData).forEach(c => {
      const coords = CENTROIDS[c.code]; if (!coords) return;
      const [lon, lat] = coords;
      if (Math.abs(lon - UTRECHT[0]) < 2 && Math.abs(lat - UTRECHT[1]) < 2) return;
      const line = { type:'LineString', coordinates:[[lon,lat],UTRECHT] };
      if (!isVisible(lon,lat) && !isVisible(UTRECHT[0],UTRECHT[1])) return;
      overlaysG.append('path').attr('class','overlay-group flow-line').attr('data-lon',lon).attr('data-lat',lat)
        .attr('d', pathGen(line)).attr('fill','none').attr('stroke',C.green).attr('stroke-width',wScale(c.events))
        .attr('stroke-opacity',0.55).attr('stroke-linecap','round')
        .on('mouseover', ev => { stopAutoRotate(); showTooltip(c, ev); }).on('mouseleave', hideTooltip);
      const [cx2, cy2] = projection([lon, lat]) || [0, 0];
      overlaysG.append('circle').attr('class','overlay-group').attr('data-lon',lon).attr('data-lat',lat)
        .attr('cx',cx2).attr('cy',cy2).attr('r',3).attr('fill',C.green).attr('fill-opacity',0.8).attr('pointer-events','none');
    });
    const [ux,uy] = projection(UTRECHT) || [0,0];
    overlaysG.append('circle').attr('cx',ux).attr('cy',uy).attr('r',5).attr('fill',C.coral).attr('stroke',C.greenDark).attr('stroke-width',1.5).attr('pointer-events','none');
    overlaysG.append('text').attr('x',ux).attr('y',uy-8).attr('text-anchor','middle').attr('fill',C.greenDark).attr('font-size','9px').attr('font-weight','700').attr('font-family','DM Sans,sans-serif').attr('pointer-events','none').text('Utrecht');
  }
  function renderDevice() {
    countriesG.selectAll('path').attr('fill', C.land); overlaysG.selectAll('*').remove();
    const rScale = d3.scaleSqrt([0, maxEvents], [0, 18]), arc = d3.arc().innerRadius(0);
    setLegend(`<div class="map-legend-title">Apparaat</div><div class="map-legend-row"><div class="map-legend-swatch" style="background:#F5A623"></div>Desktop/laptop</div><div class="map-legend-row"><div class="map-legend-swatch" style="background:#7B4FBF"></div>Mobiel/tablet</div>`);
    Object.values(countryData).forEach(c => {
      const coords = CENTROIDS[c.code]; if (!coords) return;
      const [lon, lat] = coords, r = Math.max(6, rScale(c.events)); arc.outerRadius(r);
      const total = c.events; if (!total) return;
      const mobile=c.mobile||0, desktop=c.desktop||0, other=total-mobile-desktop;
      const tau=2*Math.PI, s=-Math.PI/2, m1=s+(desktop/total)*tau, m2=m1+(mobile/total)*tau;
      const g = overlayGroup(lon, lat, c);
      if (desktop>0) g.append('path').datum({startAngle:s,endAngle:m1}).attr('d',arc).attr('fill','#F5A623').attr('fill-opacity',0.88);
      if (mobile>0)  g.append('path').datum({startAngle:m1,endAngle:m2}).attr('d',arc).attr('fill','#7B4FBF').attr('fill-opacity',0.88);
      if (other>0)   g.append('path').datum({startAngle:m2,endAngle:s+tau}).attr('d',arc).attr('fill','#3A7D44').attr('fill-opacity',0.88);
    });
  }
  function renderFish() {
    countriesG.selectAll('path').attr('fill', d => { const c=countryData[d.id]; if(!c||!c.topFish) return C.land; return FISH_COLORS[c.topFish]||'#607D8B'; });
    overlaysG.selectAll('*').remove();
    const legendItems = Object.entries(FISH_COLORS).map(([k,v]) => `<div class="map-legend-row"><div class="map-legend-swatch" style="background:${v}"></div>${k}</div>`).join('');
    setLegend(`<div class="map-legend-title">Meest geziene vis</div>${legendItems}`);
  }
  function renderTime() {
    const hourColor = h => h===null?C.land:h<6?'#5C35A8':h<12?'#F5C842':h<18?'#E8896A':'#3A7D44';
    countriesG.selectAll('path').attr('fill', d => { const c=countryData[d.id]; return c?hourColor(c.avgHour):C.land; });
    overlaysG.selectAll('*').remove();
    setLegend(`<div class="map-legend-title">Actief tijdstip</div><div class="map-legend-row"><div class="map-legend-swatch" style="background:#5C35A8"></div>Nacht (0–6u)</div><div class="map-legend-row"><div class="map-legend-swatch" style="background:#F5C842"></div>Ochtend (6–12u)</div><div class="map-legend-row"><div class="map-legend-swatch" style="background:#E8896A"></div>Middag (12–18u)</div><div class="map-legend-row"><div class="map-legend-swatch" style="background:#3A7D44"></div>Avond (18–24u)</div>`);
  }
  function renderOS() {
    countriesG.selectAll('path').attr('fill', d => { const c=countryData[d.id]; if(!c||!c.topOS) return C.land; return OS_COLORS[c.topOS]||'#B0BEC5'; });
    overlaysG.selectAll('*').remove();
    const legendItems = Object.entries(OS_COLORS).map(([k,v]) => `<div class="map-legend-row"><div class="map-legend-swatch" style="background:${v}"></div>${k}</div>`).join('');
    setLegend(`<div class="map-legend-title">Meest gebruikt OS</div>${legendItems}`);
  }
  function renderBrowser() {
    countriesG.selectAll('path').attr('fill', d => { const c=countryData[d.id]; if(!c||!c.topBrowser) return C.land; return BROWSER_COLORS[c.topBrowser]||'#B0BEC5'; });
    overlaysG.selectAll('*').remove();
    const legendItems = Object.entries(BROWSER_COLORS).map(([k,v]) => `<div class="map-legend-row"><div class="map-legend-swatch" style="background:${v}"></div>${k}</div>`).join('');
    setLegend(`<div class="map-legend-title">Meest gebruikt browser</div>${legendItems}`);
  }
  function render() {
    const modes = { choropleth:renderChoropleth, bubble:renderBubble, uploadrate:renderUploadRate, pies:renderPies, flows:renderFlows, device:renderDevice, fish:renderFish, time:renderTime, os:renderOS, browser:renderBrowser };
    (modes[currentMode] || renderChoropleth)(); redraw();
  }

  // ── Tabs ──────────────────────────────────────────
  document.querySelectorAll('.map-tab[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.map-tab[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); currentMode = btn.dataset.mode; render();
    });
  });

  // ── Period switcher ───────────────────────────────
  async function switchPeriod(period) {
    if (period === currentPeriod) return;
    currentPeriod = period;
    document.querySelectorAll('.period-btn').forEach(b => b.classList.toggle('active', b.dataset.period === period));
    const loadingEl = document.getElementById('period-loading');
    loadingEl.textContent = 'Laden…'; loadingEl.classList.add('visible');
    d3.select(svgEl).style('opacity', 0.5);
    try {
      const rawEvents = await loadData();
      allEvents = rawEvents; countryData = aggregate(rawEvents);
      maxEvents = Math.max(...Object.values(countryData).map(c => c.events), 1);
      updateStats(); buildCountryList(); buildEventFeed(); render();
    } catch (err) {
      console.error('Fout bij laden periode:', err);
      loadingEl.textContent = 'Fout bij laden';
    } finally {
      d3.select(svgEl).style('opacity', 1);
      loadingEl.classList.remove('visible'); loadingEl.textContent = '';
    }
  }

  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPeriod(btn.dataset.period));
  });

  // ── Init ──────────────────────────────────────────
  async function init() {
    try {
      const [topoData, rawEvents] = await Promise.all([d3.json(TOPO_URL), loadData()]);
      allEvents = rawEvents; countryData = aggregate(rawEvents);
      maxEvents = Math.max(...Object.values(countryData).map(c => c.events), 1);
      topoFeatures = topojson.feature(topoData, topoData.objects.countries).features;

      const svg = d3.select(svgEl).attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%');
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
        </filter>`);

      svg.insert('path', '#graticule-g').attr('id', 'globe-sphere')
        .attr('d', pathGen({ type: 'Sphere' })).attr('fill', 'url(#oceanGrad)').attr('filter', 'url(#globeShadow)');
      graticuleG.append('path').attr('d', pathGen(graticule)).attr('fill', 'none').attr('stroke', C.graticule).attr('stroke-width', 0.5);
      countriesG.selectAll('path').data(topoFeatures).join('path')
        .attr('class', 'map-country').attr('d', pathGen).attr('stroke', C.stroke).attr('stroke-width', 0.5).attr('fill', C.land)
        .on('mouseover', function(event, d) {
          const c = countryData[d.id];
          if (c) { stopAutoRotate(); showTooltip(c, event); }
          try { d3.select(this).attr('fill', d3.color(d3.select(this).attr('fill') || C.land).darker(0.5).toString()); } catch(e) {}
        })
        .on('mouseleave', function(event, d) { hideTooltip(); d3.select(this).attr('fill', d => getCountryFill(d)); });

      svg.append('path').attr('id', 'globe-shine').attr('d', pathGen({ type: 'Sphere' })).attr('fill', 'url(#globeShine)').attr('pointer-events', 'none');
      svg.append('path').attr('id', 'globe-outline').attr('d', pathGen({ type: 'Sphere' })).attr('fill', 'none').attr('stroke', 'rgba(27,67,50,0.2)').attr('stroke-width', 1).attr('pointer-events', 'none');

      updateStats(); buildCountryList(); buildEventFeed(); render(); startRotationLoop();
      loadingOverlay.classList.add('hidden');
    } catch (err) {
      console.error('Fout bij laden data:', err);
      const loadingText = document.querySelector('.loading-text');
      if (loadingText) loadingText.textContent = 'Fout bij laden — zie console.';
    }
  }

  init();

  return () => {
    destroyed = true;
    if (rafId) cancelAnimationFrame(rafId);
    clearTimeout(rotateTimer);
  };
}
