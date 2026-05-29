import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import gsap from 'gsap';

export function initMitchell() {
  // ── Styleguide tokens (hex mirrors of visdeurbel-tokens.css) ──
  const C = {
    green:    '#01463c',
    greenMid: '#015a4e',
    off:      '#fdf7ef',
    gold:     '#f8e7cd',
    goldDeep: '#f0af00',
    purple:   '#c0a8ff',
    bell:     '#9b74ff',
    teal:     '#1eacb0',
    pink:     '#ff80b9',
  };
  const FONT_DISPLAY = "'Bricolage Grotesque', system-ui, sans-serif";
  const FONT_BODY    = "'PT Sans', system-ui, sans-serif";

  // ── Vissoorten voor de radar (waarnemingen worden uit de data geladen) ──
  const visData = [
    { naam: 'Blankvoorn', count: 0, color: C.teal,   weight: 0.3,  shape: 'round', diepte: 'mid',   habitat: 'open' },
    { naam: 'Brasem',     count: 0, color: '#34b3a0', weight: 1.8,  shape: 'round', diepte: 'bodem', habitat: 'zand' },
    { naam: 'Baars',      count: 0, color: '#4a9ab8', weight: 0.6,  shape: 'baars', diepte: 'mid',   habitat: 'open' },
    { naam: 'Snoekbaars', count: 0, color: '#5b8fd6', weight: 2.4,  shape: 'pred',  diepte: 'mid',   habitat: 'open' },
    { naam: 'Paling',     count: 0, color: '#3a8aa8', weight: 0.5,  shape: 'long',  diepte: 'bodem', habitat: 'steen' },
    { naam: 'Kolblei',    count: 0, color: C.goldDeep,weight: 0.4,  shape: 'round', diepte: 'mid',   habitat: 'zand' },
    { naam: 'Alver',      count: 0, color: '#ffc94d', weight: 0.08, shape: 'tiny',  diepte: 'top',   habitat: 'oppervlak' },
    { naam: 'Ruisvoorn',  count: 0, color: '#5a8a3f', weight: 0.35, shape: 'round', diepte: 'top',   habitat: 'riet' },
    { naam: 'Snoek',      count: 0, color: C.pink,    weight: 3.2,  shape: 'pred',  diepte: 'mid',   habitat: 'riet' },
    { naam: 'Winde',      count: 0, color: '#c8a96e', weight: 0.8,  shape: 'baars', diepte: 'mid',   habitat: 'stroom' },
    { naam: 'Meerval',    count: 0, color: C.bell,    weight: 12.0, shape: 'long',  diepte: 'bodem', habitat: 'steen' },
    { naam: 'Karper',     count: 0, color: '#a07850', weight: 2.5,  shape: 'round', diepte: 'bodem', habitat: 'zand' },
  ];

  let TOTAL = 0;
  const MONTH_FULL = ['Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November'];
  let weekHours = [], weekDayLabels = [], weekDays = [], periodLabel = '';
  const MONTH_SHORT_NL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const MONTH_LONG_NL  = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  let geoData = null, funnelData = null, techData = null, worldTopo = null;
  let dailyData = null, sessionsData = null, pondWeekData = null, languagesData = null;
  let screensData = null, orientationData = null;
  let swimTeardown = null;

  // ── Landcentroïden [lengtegraad, breedtegraad, naam] voor de bel-landen ──
  const COUNTRY_GEO = {
    US: [-98, 39, 'Verenigde Staten'], PL: [19, 52, 'Polen'], DE: [10.4, 51.1, 'Duitsland'],
    NL: [5.3, 52.2, 'Nederland'], GB: [-1.8, 52.8, 'Verenigd Koninkrijk'], CA: [-106, 56, 'Canada'],
    AU: [134, -25, 'Australië'], BE: [4.6, 50.6, 'België'], IN: [79, 22, 'India'],
    AT: [14.1, 47.5, 'Oostenrijk'], CH: [8.2, 46.8, 'Zwitserland'], IT: [12.5, 42.8, 'Italië'],
    IE: [-8, 53.2, 'Ierland'], HK: [114.1, 22.4, 'Hongkong'], SE: [15.5, 62, 'Zweden'],
    BR: [-51, -10, 'Brazilië'], TW: [121, 23.7, 'Taiwan'], FR: [2.5, 46.6, 'Frankrijk'],
    NZ: [172, -41, 'Nieuw-Zeeland'], MY: [102, 4, 'Maleisië'], ES: [-3.7, 40.2, 'Spanje'],
    NO: [9, 61.5, 'Noorwegen'], DK: [9.8, 56, 'Denemarken'], SG: [103.8, 1.35, 'Singapore'],
    IL: [35, 31.4, 'Israël'], CZ: [15.5, 49.8, 'Tsjechië'], JP: [138, 36.5, 'Japan'],
    ZA: [25, -29, 'Zuid-Afrika'], FI: [26, 64, 'Finland'], TR: [35, 39, 'Turkije'],
    LU: [6.1, 49.8, 'Luxemburg'], PT: [-8.2, 39.6, 'Portugal'], GR: [22, 39.5, 'Griekenland'],
    RO: [25, 46, 'Roemenië'], PH: [122, 12, 'Filipijnen'], UA: [31, 49, 'Oekraïne'],
    HU: [19.5, 47.2, 'Hongarije'], MX: [-102, 23.5, 'Mexico'], SK: [19.5, 48.7, 'Slowakije'],
    HR: [16, 45.5, 'Kroatië'], IS: [-18.5, 64.9, 'IJsland'], SI: [14.8, 46.1, 'Slovenië'],
    AE: [54, 24, 'V.A.E.'], VN: [106, 16, 'Vietnam'], JE: [-2.1, 49.2, 'Jersey'],
    TH: [101, 15, 'Thailand'], RU: [95, 61, 'Rusland'], EG: [30, 27, 'Egypte'],
    KR: [127.8, 36.5, 'Zuid-Korea'], CY: [33.2, 35, 'Cyprus'], LT: [24, 55.2, 'Litouwen'],
    CN: [104, 35, 'China'], BG: [25.3, 42.7, 'Bulgarije'], EE: [25.8, 58.8, 'Estland'],
    GI: [-5.35, 36.14, 'Gibraltar'], CO: [-73, 4, 'Colombia'], RS: [21, 44, 'Servië'],
    MT: [14.4, 35.9, 'Malta'], SA: [45, 24, 'Saoedi-Arabië'], LV: [25, 57, 'Letland'],
    ID: [118, -2, 'Indonesië'], MO: [113.55, 22.16, 'Macau'], NP: [84, 28.4, 'Nepal'],
    KE: [38, 0.2, 'Kenia'], AR: [-64, -35, 'Argentinië'], IM: [-4.5, 54.2, 'Isle of Man'],
    QA: [51.2, 25.3, 'Qatar'], PR: [-66.5, 18.2, 'Puerto Rico'], AL: [20, 41, 'Albanië'],
    CL: [-71, -35, 'Chili'], MA: [-6, 32, 'Marokko'], GE: [43.5, 42, 'Georgië'],
    SC: [55.5, -4.6, 'Seychellen'], CR: [-84, 10, 'Costa Rica'], OM: [56, 21, 'Oman'],
    NG: [8, 9.5, 'Nigeria'], PK: [69, 30, 'Pakistan'], LK: [80.7, 7.9, 'Sri Lanka'],
    KZ: [68, 48, 'Kazachstan'], PE: [-75, -9.5, 'Peru'], EC: [-78.5, -1.5, 'Ecuador'],
    TN: [9.5, 34, 'Tunesië'], DZ: [3, 28, 'Algerije'], BD: [90, 24, 'Bangladesh'],
    KW: [47.5, 29.3, 'Koeweit'],
  };
  const UTRECHT = [5.117, 52.09];

  // ── Browserfamilies voor de apparaten-school ──
  const BROWSER_FAMILY = {
    chrome: 'google', crios: 'google', 'chromium-webview': 'google', 'edge-chromium': 'google',
    samsung: 'google', opera: 'google', miui: 'google', yandexbrowser: 'google', silk: 'google',
    ios: 'apple', safari: 'apple', 'ios-webview': 'apple', 'edge-ios': 'apple',
    firefox: 'firefox', fxios: 'firefox',
    instagram: 'social', facebook: 'social',
  };
  const FAMILY = {
    google:  { color: C.teal,     label: 'Chrome-achtig' },
    apple:   { color: C.bell,     label: 'Safari / iOS' },
    firefox: { color: C.goldDeep, label: 'Firefox' },
    social:  { color: C.pink,     label: 'Social in-app' },
    other:   { color: C.greenMid, label: 'Overig' },
  };
  const BROWSER_LABEL = {
    chrome: 'Chrome', crios: 'Chrome iOS', 'chromium-webview': 'Chrome WebView',
    'edge-chromium': 'Edge', samsung: 'Samsung', opera: 'Opera', firefox: 'Firefox',
    fxios: 'Firefox iOS', ios: 'Safari iOS', safari: 'Safari', 'ios-webview': 'iOS WebView',
    instagram: 'Instagram', facebook: 'Facebook', silk: 'Silk', 'edge-ios': 'Edge iOS',
    miui: 'MIUI', yandexbrowser: 'Yandex',
  };

  // ── Begroetingen per taal (primaire subtag) ──
  const GREETINGS = {
    en: ['Hello', 'Engels'], pl: ['Cześć', 'Pools'], de: ['Hallo', 'Duits'], nl: ['Hoi', 'Nederlands'],
    zh: ['你好', 'Chinees'], it: ['Ciao', 'Italiaans'], fr: ['Bonjour', 'Frans'], pt: ['Olá', 'Portugees'],
    es: ['Hola', 'Spaans'], sv: ['Hej', 'Zweeds'], ru: ['Привет', 'Russisch'], he: ['שלום', 'Hebreeuws'],
    cs: ['Ahoj', 'Tsjechisch'], nb: ['Hei', 'Noors'], no: ['Hei', 'Noors'], da: ['Hej', 'Deens'],
    uk: ['Привіт', 'Oekraïens'], fi: ['Hei', 'Fins'], tr: ['Merhaba', 'Turks'], el: ['Γειά', 'Grieks'],
    ja: ['こんにちは', 'Japans'], ko: ['안녕', 'Koreaans'], ar: ['مرحبا', 'Arabisch'], hi: ['नमस्ते', 'Hindi'],
    th: ['สวัสดี', 'Thais'], vi: ['Xin chào', 'Vietnamees'], ro: ['Salut', 'Roemeens'], hu: ['Szia', 'Hongaars'],
    sk: ['Ahoj', 'Slowaaks'], hr: ['Bok', 'Kroatisch'], sl: ['Živjo', 'Sloveens'], bg: ['Здравей', 'Bulgaars'],
    id: ['Halo', 'Indonesisch'], ms: ['Halo', 'Maleis'], lt: ['Labas', 'Litouws'], lv: ['Sveiki', 'Lets'],
    et: ['Tere', 'Ests'], ca: ['Hola', 'Catalaans'], is: ['Halló', 'IJslands'],
  };

  const $  = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));
  const fmt = n => new Intl.NumberFormat('nl-NL').format(Math.round(n));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cleanups = [];
  const rafs = new Set();
  const raf = (fn) => { const id = requestAnimationFrame(fn); rafs.add(id); return id; };

  function mulberry32(seed) {
    return function () {
      let t = seed += 0x6d2b79f5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(20260518);
  function generateMonthly(total) {
    const peak = [0.06, 0.22, 0.28, 0.16, 0.10, 0.06, 0.05, 0.04, 0.03];
    return peak.map(p => Math.round(p * total * (0.92 + rng() * 0.16)));
  }
  function fishSymbolId(shape) { return 'fish-' + shape; }

  // ── Tooltip ────────────────────────────────────────
  const tooltipEl = $('#fishTooltip');
  let tooltipHideTimer = 0;
  function showTooltip(html, x, y) {
    clearTimeout(tooltipHideTimer);
    tooltipEl.innerHTML = html;
    tooltipEl.style.left = x + 'px';
    tooltipEl.style.top  = y + 'px';
    tooltipEl.classList.add('visible');
  }
  function hideTooltip(delay = 0) {
    clearTimeout(tooltipHideTimer);
    if (delay > 0) tooltipHideTimer = setTimeout(() => tooltipEl.classList.remove('visible'), delay);
    else tooltipEl.classList.remove('visible');
  }

  // ── Section observer ───────────────────────────────
  const chapterInit = {};
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      if (!entry.target.dataset.inited) {
        entry.target.dataset.inited = '1';
        const fn = chapterInit[entry.target.id];
        if (fn) fn(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

  // ════════════════════════════════════════════════════
  // Ringkalender
  // ════════════════════════════════════════════════════
  chapterInit['ch-ring'] = () => {
    const W = 680, H = 680, cx = W / 2, cy = H / 2;
    const innerR = 130, outerR = 290;
    const stageSel = d3.select($('#ringStage'));
    const svg = stageSel.append('svg').attr('viewBox', `0 0 ${W} ${H}`);

    // Voor jaar: groepeer dagen per maand zodat we kunnen in- en uitzoomen
    const isYear = currentPeriod === 'jaar' && weekDays && weekDays.length;
    const months = [];
    if (isYear) {
      let cur = null;
      weekDays.forEach((dateStr, i) => {
        const dt = new Date(dateStr);
        if (Number.isNaN(dt.getTime())) return;
        const key = `${dt.getUTCFullYear()}-${dt.getUTCMonth()}`;
        if (!cur || cur.key !== key) {
          cur = {
            key, monthIdx: dt.getUTCMonth(), year: dt.getUTCFullYear(),
            short: MONTH_SHORT_NL[dt.getUTCMonth()], long: MONTH_LONG_NL[dt.getUTCMonth()],
            days: [], total: 0,
          };
          months.push(cur);
        }
        const hours = (weekHours || []).slice(i * 24, (i + 1) * 24);
        const total = hours.reduce((s, v) => s + (v || 0), 0);
        cur.days.push({ dayOfMonth: dt.getUTCDate(), label: weekDayLabels[i] || '', hours, total });
        cur.total += total;
      });
    }

    let view = isYear ? { level: 'year' } : { level: 'flat' };
    draw();

    function draw() {
      svg.selectAll('*').remove();
      svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', innerR + 8)
        .attr('fill', 'none').attr('stroke', 'rgba(1,70,60,0.15)').attr('stroke-dasharray', '2 5');
      if (view.level === 'flat')      drawFlat();
      else if (view.level === 'year') drawYear();
      else if (view.level === 'month') drawMonth(view.monthIndex);
      else if (view.level === 'day')   drawDay(view.monthIndex, view.dayIndex);
    }

    function drawCenter(big, sub, hint, onBack) {
      svg.append('text').attr('x', cx).attr('y', cy - 10).attr('text-anchor', 'middle')
        .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('font-size', big.length > 12 ? 32 : 44)
        .attr('fill', C.green).text(big);
      svg.append('text').attr('x', cx).attr('y', cy + 16).attr('text-anchor', 'middle')
        .attr('font-family', FONT_BODY).attr('font-size', 13).attr('font-weight', 700)
        .attr('fill', C.green).attr('opacity', 0.6).text(sub);
      if (onBack) {
        const g = svg.append('g').attr('cursor', 'pointer').attr('tabindex', 0).attr('role', 'button')
          .on('click', onBack).on('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBack(); } });
        g.append('rect').attr('x', cx - 78).attr('y', cy + 32).attr('width', 156).attr('height', 28)
          .attr('rx', 14).attr('fill', 'rgba(1,70,60,0.08)').attr('stroke', 'rgba(1,70,60,0.18)');
        g.append('text').attr('x', cx).attr('y', cy + 51).attr('text-anchor', 'middle')
          .attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
          .attr('fill', C.green).text(hint);
      } else if (hint) {
        svg.append('text').attr('x', cx).attr('y', cy + 42).attr('text-anchor', 'middle')
          .attr('font-family', FONT_BODY).attr('font-size', 13)
          .attr('fill', C.bell).attr('opacity', 0.95).text(hint);
      }
    }

    // Plat — bestaande weergave voor week/maand
    function drawFlat() {
      const DAYS  = weekDayLabels.length || 9;
      const SLOTS = DAYS * 24;
      const data  = weekHours.length ? weekHours : new Array(SLOTS).fill(0);
      const maxV  = Math.max(...data, 1);

      for (let d = 0; d < DAYS; d++) {
        const aDivider = (d / DAYS) * 2 * Math.PI - Math.PI / 2;
        const aLabel   = ((d + 0.5) / DAYS) * 2 * Math.PI - Math.PI / 2;
        svg.append('line')
          .attr('x1', cx + Math.cos(aDivider) * (innerR - 10)).attr('y1', cy + Math.sin(aDivider) * (innerR - 10))
          .attr('x2', cx + Math.cos(aDivider) * (outerR + 10)).attr('y2', cy + Math.sin(aDivider) * (outerR + 10))
          .attr('stroke', 'rgba(1,70,60,0.18)').attr('stroke-dasharray', '3 4');
        svg.append('text')
          .attr('x', cx + Math.cos(aLabel) * (outerR + 24)).attr('y', cy + Math.sin(aLabel) * (outerR + 24) + 4)
          .attr('text-anchor', 'middle').attr('font-family', FONT_BODY).attr('font-size', 13).attr('font-weight', 700)
          .attr('fill', d >= 1 && d <= 7 ? C.bell : C.green).attr('opacity', 0.9)
          .text(weekDayLabels[d] || '');
        const nightStart = (d * 24 + 21) / SLOTS * 2 * Math.PI - Math.PI / 2;
        const nightEnd   = (d * 24 + 29) / SLOTS * 2 * Math.PI - Math.PI / 2;
        svg.append('path')
          .attr('d', d3.arc().innerRadius(innerR - 8).outerRadius(innerR).startAngle(nightStart).endAngle(nightEnd)())
          .attr('transform', `translate(${cx},${cy})`).attr('fill', 'rgba(1,70,60,0.08)');
      }

      const dots = svg.append('g');
      for (let i = 0; i < SLOTS; i++) {
        const cnt  = data[i] || 0, norm = cnt / maxV;
        const a    = (i / SLOTS) * 2 * Math.PI - Math.PI / 2;
        const r    = innerR + 14 + norm * (outerR - innerR - 20);
        const color = norm > 0.65 ? C.bell : norm > 0.25 ? C.green : 'rgba(1,70,60,0.4)';
        const dot = dots.append('circle')
          .attr('class', 'ring-dot')
          .attr('cx', cx + Math.cos(a) * r).attr('cy', cy + Math.sin(a) * r).attr('r', 0)
          .attr('fill', color).attr('opacity', cnt > 0 ? 0.25 + norm * 0.75 : 0.08)
          .attr('tabindex', cnt > 0 ? 0 : -1);
        dot.transition().delay(reduceMotion ? 0 : i * 2).duration(reduceMotion ? 0 : 250).attr('r', 1.2 + norm * 5.5);
        if (cnt > 0) {
          const label   = weekDayLabels[Math.floor(i / 24)] || '';
          const tooltip = `<strong>${label} ${String(i % 24).padStart(2, '0')}:00</strong>${fmt(cnt)} bel oproepen`;
          dot.on('mouseenter mousemove', (e) => showTooltip(tooltip, e.clientX, e.clientY))
             .on('mouseleave blur', () => hideTooltip())
             .on('focus', () => {
               const bb = dot.node().getBoundingClientRect();
               showTooltip(tooltip, bb.left + bb.width / 2, bb.top);
             });
        }
      }

      drawCenter(fmt(TOTAL), 'bel oproepen', periodLabel || '18 apr – 18 mei 2026', null);
    }

    // Jaar — buitenste ring zijn maanden, dots binnen elke wig zijn dagen
    function drawYear() {
      const N = months.length || 12;
      const maxDay = Math.max(...months.flatMap(m => m.days.map(d => d.total)), 1);
      months.forEach((m, idx) => {
        const aDivider = (idx / N) * 2 * Math.PI - Math.PI / 2;
        const aLabel   = ((idx + 0.5) / N) * 2 * Math.PI - Math.PI / 2;
        svg.append('line')
          .attr('x1', cx + Math.cos(aDivider) * (innerR - 10)).attr('y1', cy + Math.sin(aDivider) * (innerR - 10))
          .attr('x2', cx + Math.cos(aDivider) * (outerR + 10)).attr('y2', cy + Math.sin(aDivider) * (outerR + 10))
          .attr('stroke', 'rgba(1,70,60,0.18)').attr('stroke-dasharray', '3 4');

        const wedge = svg.append('g').attr('cursor', 'pointer').attr('tabindex', 0).attr('role', 'button')
          .attr('aria-label', `Zoom in op ${m.long}`)
          .on('click', () => { view = { level: 'month', monthIndex: idx }; draw(); })
          .on('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); view = { level: 'month', monthIndex: idx }; draw(); } });

        // Onzichtbare hit-arc zodat hele wig klikbaar is
        wedge.append('path')
          .attr('d', d3.arc().innerRadius(innerR - 4).outerRadius(outerR + 18)
            .startAngle(aDivider + Math.PI / 2).endAngle(aDivider + Math.PI / 2 + (2 * Math.PI / N))())
          .attr('transform', `translate(${cx},${cy})`).attr('fill', 'transparent');

        wedge.append('text')
          .attr('x', cx + Math.cos(aLabel) * (outerR + 24)).attr('y', cy + Math.sin(aLabel) * (outerR + 24) + 4)
          .attr('text-anchor', 'middle').attr('font-family', FONT_BODY).attr('font-size', 13).attr('font-weight', 700)
          .attr('fill', C.green).attr('opacity', 0.9).text(m.short);

        const D = m.days.length || 1;
        m.days.forEach((day, di) => {
          const sub = (idx + (di + 0.5) / D) / N;
          const a = sub * 2 * Math.PI - Math.PI / 2;
          const norm = day.total / maxDay;
          const r = innerR + 14 + norm * (outerR - innerR - 20);
          const color = norm > 0.65 ? C.bell : norm > 0.25 ? C.green : 'rgba(1,70,60,0.4)';
          const dot = wedge.append('circle')
            .attr('cx', cx + Math.cos(a) * r).attr('cy', cy + Math.sin(a) * r).attr('r', 0)
            .attr('fill', color).attr('opacity', day.total > 0 ? 0.25 + norm * 0.75 : 0.08);
          dot.transition().delay(reduceMotion ? 0 : (idx * 24 + di * 2)).duration(reduceMotion ? 0 : 220).attr('r', 1.3 + norm * 4);
          if (day.total > 0) {
            const tip = `<strong>${day.dayOfMonth} ${m.short}</strong>${fmt(day.total)} bel oproepen`;
            dot.on('mouseenter mousemove', e => showTooltip(tip, e.clientX, e.clientY))
               .on('mouseleave', () => hideTooltip());
          }
        });
      });

      drawCenter(fmt(TOTAL), 'bel oproepen', 'klik een maand om in te zoomen', null);
    }

    // Maand — wedges per dag, dots per uur (zoals plat, maar voor één maand)
    function drawMonth(mIdx) {
      const month = months[mIdx];
      if (!month) return;
      const days = month.days;
      const N = days.length;
      const SLOTS = N * 24;
      const allHours = days.flatMap(d => d.hours);
      const maxV = Math.max(...allHours, 1);

      for (let d = 0; d < N; d++) {
        const aDivider = (d / N) * 2 * Math.PI - Math.PI / 2;
        const aLabel   = ((d + 0.5) / N) * 2 * Math.PI - Math.PI / 2;
        svg.append('line')
          .attr('x1', cx + Math.cos(aDivider) * (innerR - 10)).attr('y1', cy + Math.sin(aDivider) * (innerR - 10))
          .attr('x2', cx + Math.cos(aDivider) * (outerR + 10)).attr('y2', cy + Math.sin(aDivider) * (outerR + 10))
          .attr('stroke', 'rgba(1,70,60,0.18)').attr('stroke-dasharray', '3 4');

        const wedge = svg.append('g').attr('cursor', 'pointer').attr('tabindex', 0).attr('role', 'button')
          .attr('aria-label', `Zoom in op ${days[d].dayOfMonth} ${month.short}`)
          .on('click', () => { view = { level: 'day', monthIndex: mIdx, dayIndex: d }; draw(); })
          .on('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); view = { level: 'day', monthIndex: mIdx, dayIndex: d }; draw(); } });
        wedge.append('path')
          .attr('d', d3.arc().innerRadius(innerR - 4).outerRadius(outerR + 18)
            .startAngle(aDivider + Math.PI / 2).endAngle(aDivider + Math.PI / 2 + (2 * Math.PI / N))())
          .attr('transform', `translate(${cx},${cy})`).attr('fill', 'transparent');
        wedge.append('text')
          .attr('x', cx + Math.cos(aLabel) * (outerR + 22)).attr('y', cy + Math.sin(aLabel) * (outerR + 22) + 4)
          .attr('text-anchor', 'middle').attr('font-family', FONT_BODY).attr('font-size', N > 20 ? 10 : 12).attr('font-weight', 700)
          .attr('fill', C.green).attr('opacity', 0.85).text(String(days[d].dayOfMonth));

        const nightStart = (d * 24 + 21) / SLOTS * 2 * Math.PI - Math.PI / 2;
        const nightEnd   = (d * 24 + 29) / SLOTS * 2 * Math.PI - Math.PI / 2;
        svg.append('path')
          .attr('d', d3.arc().innerRadius(innerR - 8).outerRadius(innerR).startAngle(nightStart).endAngle(nightEnd)())
          .attr('transform', `translate(${cx},${cy})`).attr('fill', 'rgba(1,70,60,0.08)');
      }

      const dots = svg.append('g').attr('pointer-events', 'none');
      for (let i = 0; i < SLOTS; i++) {
        const cnt = allHours[i] || 0, norm = cnt / maxV;
        const a = (i / SLOTS) * 2 * Math.PI - Math.PI / 2;
        const r = innerR + 14 + norm * (outerR - innerR - 20);
        const color = norm > 0.65 ? C.bell : norm > 0.25 ? C.green : 'rgba(1,70,60,0.4)';
        const dot = dots.append('circle')
          .attr('cx', cx + Math.cos(a) * r).attr('cy', cy + Math.sin(a) * r).attr('r', 0)
          .attr('fill', color).attr('opacity', cnt > 0 ? 0.25 + norm * 0.75 : 0.08);
        dot.transition().delay(reduceMotion ? 0 : i * 1).duration(reduceMotion ? 0 : 200).attr('r', 1.2 + norm * 5);
      }

      drawCenter(`${month.long} ${month.year}`, `${fmt(month.total)} bel oproepen`, '← terug naar jaar', () => {
        view = { level: 'year' }; draw();
      });
    }

    // Dag — 24 uur-wedges met één bal per uur
    function drawDay(mIdx, dIdx) {
      const month = months[mIdx];
      const day = month && month.days[dIdx];
      if (!day) return;
      const hours = day.hours;
      const maxV = Math.max(...hours, 1);
      const N = 24;

      for (let h = 0; h < N; h++) {
        const aDivider = (h / N) * 2 * Math.PI - Math.PI / 2;
        const aLabel   = ((h + 0.5) / N) * 2 * Math.PI - Math.PI / 2;
        svg.append('line')
          .attr('x1', cx + Math.cos(aDivider) * (innerR - 10)).attr('y1', cy + Math.sin(aDivider) * (innerR - 10))
          .attr('x2', cx + Math.cos(aDivider) * (outerR + 10)).attr('y2', cy + Math.sin(aDivider) * (outerR + 10))
          .attr('stroke', 'rgba(1,70,60,0.18)').attr('stroke-dasharray', '3 4');
        const isNight = h >= 21 || h < 5;
        if (isNight) {
          svg.append('path')
            .attr('d', d3.arc().innerRadius(innerR - 8).outerRadius(innerR)
              .startAngle(aDivider + Math.PI / 2).endAngle(aDivider + Math.PI / 2 + 2 * Math.PI / N)())
            .attr('transform', `translate(${cx},${cy})`).attr('fill', 'rgba(1,70,60,0.08)');
        }
        svg.append('text')
          .attr('x', cx + Math.cos(aLabel) * (outerR + 22)).attr('y', cy + Math.sin(aLabel) * (outerR + 22) + 4)
          .attr('text-anchor', 'middle').attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
          .attr('fill', isNight ? C.bell : C.green).attr('opacity', 0.85).text(`${String(h).padStart(2, '0')}u`);

        const cnt = hours[h] || 0, norm = cnt / maxV;
        const r = innerR + 18 + norm * (outerR - innerR - 28);
        const color = norm > 0.65 ? C.bell : norm > 0.25 ? C.green : 'rgba(1,70,60,0.4)';
        const dot = svg.append('circle')
          .attr('cx', cx + Math.cos(aLabel) * r).attr('cy', cy + Math.sin(aLabel) * r).attr('r', 0)
          .attr('fill', color).attr('opacity', cnt > 0 ? 0.3 + norm * 0.7 : 0.1);
        dot.transition().delay(reduceMotion ? 0 : h * 18).duration(reduceMotion ? 0 : 260).attr('r', 4 + norm * 9);
        if (cnt > 0) {
          const tip = `<strong>${day.dayOfMonth} ${month.short} ${String(h).padStart(2, '0')}:00</strong>${fmt(cnt)} bel oproepen`;
          dot.attr('cursor', 'pointer')
            .on('mouseenter mousemove', e => showTooltip(tip, e.clientX, e.clientY))
            .on('mouseleave', () => hideTooltip());
        }
      }

      drawCenter(`${day.dayOfMonth} ${month.long}`, `${fmt(day.total)} bel oproepen`, `← terug naar ${month.short}`, () => {
        view = { level: 'month', monthIndex: mIdx }; draw();
      });
    }
  };

  // ════════════════════════════════════════════════════
  // Wereldkaart — de wereld belt aan
  // ════════════════════════════════════════════════════
  chapterInit['ch-world'] = () => {
    const stage = $('#worldStage');
    if (!worldTopo || !geoData) { stage.innerHTML = '<p class="stage-fallback">Kaart kon niet geladen worden.</p>'; return; }

    const W = 980, H = 540, m = 12;
    const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const sphere = { type: 'Sphere' };
    const projection = d3.geoNaturalEarth1().fitExtent([[m, m], [W - m, H - m]], sphere);
    const path = d3.geoPath(projection);

    svg.append('path').attr('d', path(sphere)).attr('fill', 'rgba(253,247,239,0.03)')
      .attr('stroke', 'rgba(253,247,239,0.12)').attr('stroke-width', 0.8);
    svg.append('path').attr('d', path(d3.geoGraticule10()))
      .attr('fill', 'none').attr('stroke', 'rgba(253,247,239,0.05)').attr('stroke-width', 0.5);

    const countries = topojson.feature(worldTopo, worldTopo.objects.countries).features;
    svg.append('g').selectAll('path').data(countries).join('path')
      .attr('d', path).attr('fill', 'rgba(253,247,239,0.06)')
      .attr('stroke', 'rgba(253,247,239,0.16)').attr('stroke-width', 0.4);

    // bel oproepen per land → punten
    const counts = geoData.countries || {};
    const pts = Object.entries(COUNTRY_GEO)
      .map(([code, g]) => ({ code, name: g[2], count: counts[code] || 0, lnglat: [g[0], g[1]] }))
      .filter(p => p.count > 0)
      .sort((a, b) => b.count - a.count);
    const maxC = d3.max(pts, p => p.count) || 1;
    const rScale = d3.scaleSqrt().domain([0, maxC]).range([2, 18]);
    const colorFor = (v) => { const r = v / maxC; return r > 0.45 ? C.pink : r > 0.12 ? C.bell : C.teal; };

    // bogen van de grootste landen naar Utrecht
    const [ux, uy] = projection(UTRECHT);
    const arcLayer = svg.append('g').attr('class', 'world-arcs');
    pts.slice(0, 12).forEach((p, i) => {
      if (p.code === 'NL') return;
      const [x0, y0] = projection(p.lnglat);
      const mx = (x0 + ux) / 2, my = (y0 + uy) / 2;
      const dx = ux - x0, dy = uy - y0;
      const len = Math.hypot(dx, dy) || 1;
      const lift = Math.min(len * 0.28, 120);
      const cxp = mx - (dy / len) * lift, cyp = my + (dx / len) * lift;
      const arc = arcLayer.append('path')
        .attr('class', 'world-arc')
        .attr('d', `M${x0},${y0} Q${cxp},${cyp} ${ux},${uy}`)
        .attr('fill', 'none').attr('stroke', C.purple).attr('stroke-width', 1.1)
        .attr('opacity', 0).attr('stroke-linecap', 'round');
      arc.transition().delay(reduceMotion ? 0 : 600 + i * 90).duration(700).attr('opacity', 0.5);
    });

    // de punten
    const dotLayer = svg.append('g');
    pts.forEach((p, i) => {
      const [x, y] = projection(p.lnglat);
      const r = rScale(p.count), col = colorFor(p.count);
      const g = dotLayer.append('g')
        .attr('class', 'world-dot').attr('transform', `translate(${x},${y})`)
        .attr('tabindex', 0).attr('role', 'img')
        .attr('aria-label', `${p.name}: ${fmt(p.count)} bel oproepen`);
      g.append('circle').attr('class', 'world-dot-glow').attr('r', 0).attr('fill', col).attr('opacity', 0.15);
      const core = g.append('circle').attr('class', 'world-dot-core').attr('r', 0)
        .attr('fill', col).attr('opacity', 0.92)
        .attr('stroke', 'rgba(253,247,239,0.55)').attr('stroke-width', 0.6);
      g.select('.world-dot-glow').transition().delay(reduceMotion ? 0 : i * 18).duration(500).attr('r', r * 1.9);
      core.transition().delay(reduceMotion ? 0 : i * 18).duration(500).attr('r', r);

      const pct = ((p.count / geoData.total) * 100);
      const pctStr = pct >= 0.1 ? pct.toFixed(1) : '<0,1';
      const tip = `<strong>${p.name}</strong>${fmt(p.count)} bel oproepen · ${pctStr}%`;
      g.on('mouseenter mousemove', (e) => showTooltip(tip, e.clientX, e.clientY))
       .on('mouseleave blur', () => hideTooltip())
       .on('focus', () => { const bb = g.node().getBoundingClientRect(); showTooltip(tip, bb.left + bb.width / 2, bb.top); });
    });

    // Utrecht: de sluis
    const ut = svg.append('g').attr('transform', `translate(${ux},${uy})`);
    [0, 1, 2].forEach(k => ut.append('circle').attr('class', 'world-utrecht-ring')
      .attr('r', 6).attr('fill', 'none').attr('stroke', C.goldDeep).attr('stroke-width', 1.4)
      .style('animation-delay', `${k * 0.9}s`));
    ut.append('circle').attr('r', 4).attr('fill', C.goldDeep);
    ut.append('text').attr('x', 0).attr('y', -14).attr('text-anchor', 'middle')
      .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('font-size', 13)
      .attr('fill', C.goldDeep).text('Utrecht');

    // dynamische kop-cijfers
    const cc = $('#worldCountryCount'); if (cc) cc.textContent = String(Object.keys(geoData.countries).length);
    const top5 = pts.slice(0, 5).map(p => p.name).join(' · ');
    const stat = $('#worldStat');
    if (stat) stat.innerHTML = `Samen goed voor <strong>${fmt(geoData.total)}</strong> bel oproepen.<br><span class="world-top">Grootste bellers: ${top5}</span>`;
  };

  // ════════════════════════════════════════════════════
  // De belstroom — aanbellen of afhaken?
  // ════════════════════════════════════════════════════
  chapterInit['ch-funnel'] = () => {
    const stage = $('#funnelStage');
    const f = funnelData || { uploadedFish: 0, dismissedUploading: 0, total: 0 };
    const total = f.total || 1;
    const upRatio = f.uploadedFish / total;
    const disRatio = f.dismissedUploading / total;

    const W = 820, H = 560;
    const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const defs = svg.append('defs');
    const bellGrad = defs.append('radialGradient').attr('id', 'funnelBell').attr('cx', '38%').attr('cy', '32%');
    bellGrad.append('stop').attr('offset', '0%').attr('stop-color', '#e7dcff');
    bellGrad.append('stop').attr('offset', '55%').attr('stop-color', C.purple);
    bellGrad.append('stop').attr('offset', '100%').attr('stop-color', C.bell);

    const srcX = W / 2, srcY = 70, splitY = 200;
    const trunkW = 56;
    const upEnd  = [560, 458], disEnd = [180, 470];

    // bron
    svg.append('rect').attr('x', srcX - 150).attr('y', srcY - 30).attr('width', 300).attr('height', 56)
      .attr('rx', 28).attr('fill', C.gold).attr('stroke', C.green).attr('stroke-width', 1);
    svg.append('text').attr('x', srcX).attr('y', srcY - 4).attr('text-anchor', 'middle')
      .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('font-size', 22).attr('fill', C.green).text(fmt(total));
    svg.append('text').attr('x', srcX).attr('y', srcY + 16).attr('text-anchor', 'middle')
      .attr('font-family', FONT_BODY).attr('font-size', 12).attr('fill', C.green).attr('opacity', 0.7).text('keer een vis gespot');

    // trunk + twee takken (achtergrondlinten)
    const disPath = `M${srcX},${srcY + 26} C${srcX},${splitY} ${disEnd[0] + 120},${splitY + 20} ${disEnd[0]},${disEnd[1]}`;
    const upPath  = `M${srcX},${srcY + 26} C${srcX},${splitY} ${upEnd[0] - 40},${splitY + 30} ${upEnd[0]},${upEnd[1]}`;
    const disEl = svg.append('path').attr('d', disPath).attr('fill', 'none')
      .attr('stroke', 'rgba(1,70,60,0.18)').attr('stroke-width', Math.max(trunkW * disRatio, 10)).attr('stroke-linecap', 'round');
    const upEl = svg.append('path').attr('d', upPath).attr('fill', 'none')
      .attr('stroke', 'rgba(155,116,255,0.22)').attr('stroke-width', Math.max(trunkW * upRatio, 9)).attr('stroke-linecap', 'round');

    // eindlabels
    svg.append('text').attr('x', disEnd[0]).attr('y', disEnd[1] + 30).attr('text-anchor', 'middle')
      .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('font-size', 19).attr('fill', C.green).attr('opacity', 0.8)
      .text(`${Math.round(disRatio * 100)}%`);
    svg.append('text').attr('x', disEnd[0]).attr('y', disEnd[1] + 50).attr('text-anchor', 'middle')
      .attr('font-family', FONT_BODY).attr('font-size', 12).attr('fill', C.green).attr('opacity', 0.6).text('weggeklikt');

    // bel
    const bell = svg.append('g').attr('class', 'funnel-bell').attr('transform', `translate(${upEnd[0]},${upEnd[1]})`);
    const pulseLayer = bell.append('g');
    bell.append('circle').attr('r', 34).attr('fill', 'url(#funnelBell)').attr('stroke', C.green).attr('stroke-width', 1);
    bell.append('path').attr('d', 'M-10,6 C-10,-6 -5,-12 0,-12 C5,-12 10,-6 10,6 L13,9 L-13,9 Z M-3,11 a3,3 0 0,0 6,0')
      .attr('fill', C.green).attr('transform', 'translate(0,-1) scale(0.9)');
    bell.append('text').attr('x', 0).attr('y', 54).attr('text-anchor', 'middle')
      .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('font-size', 19).attr('fill', C.bell)
      .text(`${(upRatio * 100).toFixed(0)}%`);
    bell.append('text').attr('x', 0).attr('y', 74).attr('text-anchor', 'middle')
      .attr('font-family', FONT_BODY).attr('font-size', 12).attr('fill', C.green).attr('opacity', 0.7).text('aangebeld');

    // legenda-cijfers
    const leg = $('#funnelLegend');
    if (leg) leg.innerHTML = `
      <div class="funnel-leg-item"><span class="dot" style="background:${C.bell}"></span><b>${fmt(f.uploadedFish)}</b> keer écht aangebeld</div>
      <div class="funnel-leg-item"><span class="dot" style="background:rgba(1,70,60,0.35)"></span><b>${fmt(f.dismissedUploading)}</b> keer weggeklikt</div>`;

    if (reduceMotion) return;

    // stromende deeltjes
    const upNode = upEl.node(), disNode = disEl.node();
    const upLen = upNode.getTotalLength(), disLen = disNode.getTotalLength();
    const pLayer = svg.append('g').attr('class', 'funnel-particles');
    const mkParts = (n, seedSpeed) => d3.range(n).map(i => ({ p: i / n, sp: seedSpeed * (0.7 + Math.random() * 0.6) }));
    const upParts = mkParts(7, 0.006), disParts = mkParts(20, 0.006);
    const upSel = pLayer.selectAll('.fp-up').data(upParts).join('circle')
      .attr('class', 'fp-up').attr('r', 3.2).attr('fill', C.bell);
    const disSel = pLayer.selectAll('.fp-dis').data(disParts).join('circle')
      .attr('class', 'fp-dis').attr('r', 2.6).attr('fill', C.greenMid);

    let running = false, rafId = 0, lastPulse = 0;
    function pulse() {
      const now = performance.now();
      if (now - lastPulse < 220) return;
      lastPulse = now;
      const ring = pulseLayer.append('circle').attr('r', 30).attr('fill', 'none')
        .attr('stroke', C.bell).attr('stroke-width', 2).attr('opacity', 0.7);
      ring.transition().duration(900).ease(d3.easeCubicOut).attr('r', 64).attr('opacity', 0).remove();
      bell.transition().duration(120).attr('transform', `translate(${upEnd[0]},${upEnd[1]}) scale(1.08)`)
        .transition().duration(220).attr('transform', `translate(${upEnd[0]},${upEnd[1]}) scale(1)`);
    }
    function step() {
      upParts.forEach(d => {
        d.p += d.sp; if (d.p >= 1) { d.p = 0; pulse(); }
        const pt = upNode.getPointAtLength(d.p * upLen);
        d._x = pt.x; d._y = pt.y;
      });
      disParts.forEach(d => {
        d.p += d.sp; if (d.p >= 1) d.p = 0;
        const pt = disNode.getPointAtLength(d.p * disLen);
        d._x = pt.x; d._y = pt.y; d._o = d.p > 0.78 ? Math.max(0, (1 - d.p) / 0.22) : 0.8;
      });
      upSel.attr('cx', d => d._x).attr('cy', d => d._y);
      disSel.attr('cx', d => d._x).attr('cy', d => d._y).attr('opacity', d => d._o);
      if (running) rafId = raf(step);
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!running) { running = true; step(); } }
      else { running = false; cancelAnimationFrame(rafId); }
    }, { threshold: 0.15 });
    io.observe(stage);
    cleanups.push(() => { running = false; cancelAnimationFrame(rafId); io.disconnect(); });
  };

  // ════════════════════════════════════════════════════
  // Apparaten-school
  // ════════════════════════════════════════════════════
  chapterInit['ch-shoal'] = () => {
    const stage = $('#shoalStage');
    const tech = techData || { browser: {}, device: {}, os: {} };
    const browsers = Object.entries(tech.browser || {}).slice(0, 14)
      .map(([name, count]) => {
        const fam = BROWSER_FAMILY[name] || 'other';
        return { name, label: BROWSER_LABEL[name] || name, count, fam, color: FAMILY[fam].color };
      });
    if (!browsers.length) { stage.innerHTML = '<p class="stage-fallback">Geen apparaatdata.</p>'; return; }

    const browserTotal = d3.sum(browsers, b => b.count);
    const W = 900, H = 540, cx = W / 2, cy = H / 2;
    const maxC = d3.max(browsers, b => b.count);
    const rScale = d3.scaleSqrt().domain([0, maxC]).range([16, 82]);
    browsers.forEach(b => { b.r = rScale(b.count); b.x = cx + (Math.random() - 0.5) * 200; b.y = cy + (Math.random() - 0.5) * 120; });

    const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const node = svg.selectAll('.shoal-bubble').data(browsers).join('g')
      .attr('class', 'shoal-bubble').attr('tabindex', 0).attr('role', 'img')
      .attr('aria-label', d => `${d.label}: ${fmt(d.count)} bellen`);
    node.append('circle').attr('r', d => d.r).attr('fill', d => d.color)
      .attr('opacity', 0.9).attr('stroke', C.off).attr('stroke-width', 1.5);
    node.filter(d => d.r > 26).append('text').attr('text-anchor', 'middle').attr('dy', '-0.15em')
      .attr('font-family', FONT_DISPLAY).attr('font-weight', 800)
      .attr('font-size', d => Math.min(d.r * 0.5, 20)).attr('fill', C.green).attr('pointer-events', 'none')
      .text(d => d.label);
    node.filter(d => d.r > 26).append('text').attr('text-anchor', 'middle').attr('dy', '1.1em')
      .attr('font-family', FONT_BODY).attr('font-size', d => Math.min(d.r * 0.32, 13))
      .attr('fill', C.green).attr('opacity', 0.8).attr('pointer-events', 'none')
      .text(d => `${(d.count / browserTotal * 100).toFixed(0)}%`);

    node.on('mouseenter mousemove', (e, d) => showTooltip(
        `<strong>${d.label}</strong>${fmt(d.count)} bellen · ${(d.count / browserTotal * 100).toFixed(1)}%`, e.clientX, e.clientY))
      .on('mouseleave blur', () => hideTooltip())
      .on('focus', (e, d) => { const bb = e.currentTarget.getBoundingClientRect();
        showTooltip(`<strong>${d.label}</strong>${fmt(d.count)} bellen`, bb.left + bb.width / 2, bb.top); });

    const sim = d3.forceSimulation(browsers)
      .force('x', d3.forceX(cx).strength(0.05))
      .force('y', d3.forceY(cy).strength(0.07))
      .force('charge', d3.forceManyBody().strength(-6))
      .force('collide', d3.forceCollide(d => d.r + 2).strength(0.9))
      .on('tick', () => node.attr('transform', d => `translate(${d.x},${d.y})`));

    if (reduceMotion) {
      sim.stop();
      for (let i = 0; i < 200; i++) sim.tick();
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    } else {
      // zacht dobberen nadat de school is uitgekomen
      sim.on('end', () => {
        browsers.forEach(b => { b.bx = b.x; b.by = b.y; b.ph = Math.random() * Math.PI * 2; });
        const t0 = performance.now();
        const bob = () => {
          const t = (performance.now() - t0) / 1000;
          browsers.forEach(b => {
            b.x = b.bx + Math.sin(t * 0.6 + b.ph) * 4;
            b.y = b.by + Math.cos(t * 0.5 + b.ph) * 4;
          });
          node.attr('transform', d => `translate(${d.x},${d.y})`);
          bobId = raf(bob);
        };
        let bobId = raf(bob);
        cleanups.push(() => cancelAnimationFrame(bobId));
      });
    }
    cleanups.push(() => sim.stop());

    // apparaat-split in de kop + legenda
    const dev = tech.device || {};
    const devTotal = d3.sum(Object.values(dev)) || 1;
    const pctDev = (k) => Math.round((dev[k] || 0) / devTotal * 100);
    const stat = $('#shoalStat');
    if (stat) stat.innerHTML = `<strong>${pctDev('mobile')}%</strong> mobiel · <strong>${pctDev('laptop')}%</strong> laptop · <strong>${pctDev('tablet') + pctDev('desktop')}%</strong> tablet/desktop`;

    const leg = $('#shoalLegend');
    if (leg) {
      const used = [...new Set(browsers.map(b => b.fam))];
      leg.innerHTML = used.map(fam =>
        `<span class="shoal-leg-item"><span class="dot" style="background:${FAMILY[fam].color}"></span>${FAMILY[fam].label}</span>`).join('');
    }
  };

  // ════════════════════════════════════════════════════
  // 24-uurs getij — wanneer op de dag
  // ════════════════════════════════════════════════════
  chapterInit['ch-tide'] = () => {
    const stage = $('#tideStage');
    const hourly = new Array(24).fill(0);
    (weekHours || []).forEach((v, i) => { hourly[i % 24] += v || 0; });
    if (!d3.sum(hourly)) { stage.innerHTML = '<p class="stage-fallback">Geen uurdata.</p>'; return; }
    const maxH = d3.max(hourly), minH = d3.min(hourly);
    const peakHour = hourly.indexOf(maxH), lowHour = hourly.indexOf(minH);

    const W = 600, H = 600, cx = W / 2, cy = H / 2, baseR = 92, maxR = 246;
    const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const grad = svg.append('defs').append('radialGradient').attr('id', 'tideGrad');
    grad.append('stop').attr('offset', '30%').attr('stop-color', C.teal).attr('stop-opacity', 0.12);
    grad.append('stop').attr('offset', '75%').attr('stop-color', C.bell).attr('stop-opacity', 0.32);
    grad.append('stop').attr('offset', '100%').attr('stop-color', C.purple).attr('stop-opacity', 0.5);

    [0.25, 0.5, 0.75, 1].forEach(t => svg.append('circle').attr('cx', cx).attr('cy', cy)
      .attr('r', baseR + t * (maxR - baseR)).attr('fill', 'none')
      .attr('stroke', 'rgba(253,247,239,0.08)').attr('stroke-dasharray', '2 6'));

    const aToXY = (a, r) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
    for (let h = 0; h < 24; h++) {
      const a = (h / 24) * 2 * Math.PI;
      const [x1, y1] = aToXY(a, maxR + 6), [x2, y2] = aToXY(a, maxR + (h % 6 === 0 ? 16 : 11));
      svg.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
        .attr('stroke', 'rgba(253,247,239,0.25)').attr('stroke-width', h % 6 === 0 ? 1.4 : 0.8);
      if (h % 6 === 0) {
        const [lx, ly] = aToXY(a, maxR + 32);
        svg.append('text').attr('x', lx).attr('y', ly + 4).attr('text-anchor', 'middle')
          .attr('font-family', FONT_BODY).attr('font-size', 13).attr('font-weight', 700)
          .attr('fill', C.off).attr('opacity', 0.8).text(`${String(h).padStart(2, '0')}u`);
      }
    }

    const lineGen = d3.lineRadial().angle((d, i) => (i / 24) * 2 * Math.PI)
      .radius(d => baseR + (d / maxH) * (maxR - baseR)).curve(d3.curveCardinalClosed.tension(0.5));
    const tide = svg.append('g').attr('transform', `translate(${cx},${cy})`)
      .append('path').attr('fill', 'url(#tideGrad)')
      .attr('stroke', C.purple).attr('stroke-width', 2).attr('stroke-opacity', 0.85);
    if (reduceMotion) tide.attr('d', lineGen(hourly));
    else {
      const interp = d3.interpolate(hourly.map(() => 0), hourly);
      tide.transition().duration(1200).ease(d3.easeCubicOut).attrTween('d', () => (t) => lineGen(interp(t)));
    }

    const [px, py] = aToXY((peakHour / 24) * 2 * Math.PI, maxR);
    svg.append('circle').attr('cx', px).attr('cy', py).attr('r', 6).attr('fill', C.pink)
      .attr('stroke', C.off).attr('stroke-width', 1).attr('opacity', reduceMotion ? 1 : 0)
      .transition().delay(reduceMotion ? 0 : 900).duration(400).attr('opacity', 1);

    svg.append('text').attr('x', cx).attr('y', cy - 4).attr('text-anchor', 'middle')
      .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('font-size', 46).attr('fill', C.off)
      .text(`${peakHour}u`);
    svg.append('text').attr('x', cx).attr('y', cy + 24).attr('text-anchor', 'middle')
      .attr('font-family', FONT_BODY).attr('font-size', 14).attr('fill', C.purple).text('hoogtij');

    const stat = $('#tideStat');
    if (stat) stat.innerHTML = `Het stilst rond <strong>${String(lowHour).padStart(2, '0')}u</strong>, hoogtij rond <strong>${String(peakHour).padStart(2, '0')}u</strong> — als Nederland thuiskomt van werk en school.`;
  };

  // ════════════════════════════════════════════════════
  // De fanatici — wie belt het vaakst?
  // ════════════════════════════════════════════════════
  chapterInit['ch-fanatics'] = () => {
    const stage = $('#fanaticsStage');
    const s = sessionsData;
    if (!s || !s.hist) { stage.innerHTML = '<p class="stage-fallback">Geen sessiedata.</p>'; return; }
    const hist = s.hist;
    const W = 720, H = 430, mL = 64, mR = 96, mT = 38, mB = 30;
    const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const x = d3.scaleSqrt().domain([0, d3.max(hist, d => d.n)]).range([mL, W - mR]);
    const y = d3.scaleBand().domain(hist.map(d => String(d.r))).range([mT, H - mB]).padding(0.24);
    const col = (i) => d3.interpolateRgb(C.teal, C.pink)(i / (hist.length - 1));

    svg.append('text').attr('x', mL).attr('y', 20).attr('font-family', FONT_BODY).attr('font-size', 13)
      .attr('font-weight', 700).attr('fill', C.off).attr('opacity', 0.7)
      .text('bel oproepen per bezoek — aantal bezoeken (√-schaal)');

    const rows = svg.selectAll('g.fan-row').data(hist).join('g').attr('class', 'fan-row');
    rows.append('rect').attr('x', mL).attr('y', d => y(String(d.r))).attr('height', y.bandwidth()).attr('rx', 5)
      .attr('fill', (d, i) => col(i)).attr('width', 0)
      .transition().delay((d, i) => reduceMotion ? 0 : i * 45).duration(650).ease(d3.easeCubicOut)
      .attr('width', d => Math.max(x(d.n) - mL, 1));
    rows.append('text').attr('x', mL - 10).attr('y', d => y(String(d.r)) + y.bandwidth() / 2 + 4).attr('text-anchor', 'end')
      .attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700).attr('fill', C.off).attr('opacity', 0.8)
      .text(d => `${d.r}×`);
    rows.append('text').attr('x', d => Math.max(x(d.n) - mL, 1) + mL + 7).attr('y', d => y(String(d.r)) + y.bandwidth() / 2 + 4)
      .attr('font-family', FONT_BODY).attr('font-size', 11).attr('fill', C.off).attr('opacity', 0)
      .text(d => fmt(d.n))
      .transition().delay((d, i) => reduceMotion ? 0 : i * 45 + 400).duration(300).attr('opacity', 0.65);

    const ringPct = Math.round(s.ringers / s.totalSessions * 100);
    const top1 = Math.round(s.topShare.p1 * 100);
    const stat = $('#fanaticsStat');
    if (stat) stat.innerHTML = `Eén bezoek belde maar liefst <strong>${fmt(s.maxRings)}</strong> keer. Slechts <strong>${ringPct}%</strong> van de bezoeken belt überhaupt — en de drukste <strong>1%</strong> is samen goed voor <strong>${top1}%</strong> van álle bel oproepen.`;
  };

  // ════════════════════════════════════════════════════
  // Piekdagen — de rivier van een maand
  // ════════════════════════════════════════════════════
  chapterInit['ch-peaks'] = () => {
    const stage = $('#peaksStage');
    if (!dailyData) { stage.innerHTML = '<p class="stage-fallback">Geen dagdata.</p>'; return; }
    const entries = Object.entries(dailyData).sort((a, b) => (+a[0]) - (+b[0]))
      .map(([, v], i) => ({ i, label: weekDayLabels[i] || '', value: +v }));

    const W = 880, H = 420, mL = 54, mR = 24, mT = 28, mB = 46;
    const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const x = d3.scaleLinear().domain([0, entries.length - 1]).range([mL, W - mR]);
    const maxV = d3.max(entries, d => d.value);
    const y = d3.scaleLinear().domain([0, maxV * 1.12]).range([H - mB, mT]);

    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'peaksGrad').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1);
    grad.append('stop').attr('offset', '0%').attr('stop-color', C.bell).attr('stop-opacity', 0.55);
    grad.append('stop').attr('offset', '100%').attr('stop-color', C.teal).attr('stop-opacity', 0.05);
    const clip = defs.append('clipPath').attr('id', 'peaksClip').append('rect')
      .attr('x', 0).attr('y', 0).attr('height', H).attr('width', reduceMotion ? W : 0);

    // y-gridlijnen
    y.ticks(4).forEach(t => {
      svg.append('line').attr('x1', mL).attr('x2', W - mR).attr('y1', y(t)).attr('y2', y(t))
        .attr('stroke', 'rgba(1,70,60,0.12)').attr('stroke-dasharray', '2 5');
      svg.append('text').attr('x', mL - 8).attr('y', y(t) + 4).attr('text-anchor', 'end')
        .attr('font-family', FONT_BODY).attr('font-size', 11).attr('fill', C.green).attr('opacity', 0.5).text(fmt(t));
    });

    const area = d3.area().x(d => x(d.i)).y0(H - mB).y1(d => y(d.value)).curve(d3.curveCatmullRom.alpha(0.6));
    const lineG = d3.line().x(d => x(d.i)).y(d => y(d.value)).curve(d3.curveCatmullRom.alpha(0.6));
    svg.append('path').datum(entries).attr('d', area).attr('fill', 'url(#peaksGrad)').attr('clip-path', 'url(#peaksClip)');
    svg.append('path').datum(entries).attr('d', lineG).attr('fill', 'none')
      .attr('stroke', C.bell).attr('stroke-width', 2.5).attr('clip-path', 'url(#peaksClip)');
    if (!reduceMotion) clip.transition().duration(1500).ease(d3.easeCubicInOut).attr('width', W);

    // X-as labels: bij veel dagen één label per maand, anders elke ~5e dag
    if (entries.length > 14) {
      const seenMonths = new Set();
      entries.forEach(d => {
        const dateStr = weekDays[d.i];
        if (!dateStr) return;
        const dt = new Date(dateStr);
        if (Number.isNaN(dt.getTime())) return;
        const key = `${dt.getUTCFullYear()}-${dt.getUTCMonth()}`;
        if (seenMonths.has(key)) return;
        seenMonths.add(key);
        const xPos = x(d.i);
        svg.append('line').attr('x1', xPos).attr('x2', xPos).attr('y1', H - mB).attr('y2', H - mB + 6)
          .attr('stroke', C.green).attr('opacity', 0.35).attr('stroke-width', 1);
        svg.append('text').attr('x', xPos).attr('y', H - mB + 22).attr('text-anchor', 'middle')
          .attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
          .attr('fill', C.green).attr('opacity', 0.75).text(MONTH_SHORT_NL[dt.getUTCMonth()]);
      });
    } else {
      entries.forEach(d => {
        svg.append('text').attr('x', x(d.i)).attr('y', H - mB + 20).attr('text-anchor', 'middle')
          .attr('font-family', FONT_BODY).attr('font-size', 11).attr('fill', C.green).attr('opacity', 0.6).text(d.label);
      });
    }

    // piekdag
    const peak = entries.reduce((a, b) => b.value > a.value ? b : a, entries[0]);
    svg.append('circle').attr('cx', x(peak.i)).attr('cy', y(peak.value)).attr('r', 5).attr('fill', C.pink)
      .attr('stroke', C.off).attr('stroke-width', 1.5);
    svg.append('text').attr('x', x(peak.i)).attr('y', y(peak.value) - 14).attr('text-anchor', 'middle')
      .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('font-size', 15).attr('fill', C.green)
      .text(`${peak.label} · ${fmt(peak.value)}`);
    svg.append('text').attr('x', x(peak.i)).attr('y', y(peak.value) - 30).attr('text-anchor', 'middle')
      .attr('font-family', FONT_BODY).attr('font-size', 11).attr('fill', C.green).attr('opacity', 0.6).text('piekdag');

    // hover
    const guide = svg.append('line').attr('y1', mT).attr('y2', H - mB)
      .attr('stroke', C.green).attr('stroke-width', 1).attr('opacity', 0);
    const focus = svg.append('circle').attr('r', 4).attr('fill', C.bell).attr('stroke', C.off).attr('stroke-width', 1.5).attr('opacity', 0);
    svg.append('rect').attr('x', mL).attr('y', mT).attr('width', W - mR - mL).attr('height', H - mB - mT)
      .attr('fill', 'transparent').style('cursor', 'crosshair')
      .on('mousemove', (e) => {
        const [mx] = d3.pointer(e, svg.node());
        const i = Math.max(0, Math.min(entries.length - 1, Math.round(x.invert(mx))));
        const d = entries[i];
        guide.attr('x1', x(d.i)).attr('x2', x(d.i)).attr('opacity', 0.3);
        focus.attr('cx', x(d.i)).attr('cy', y(d.value)).attr('opacity', 1);
        showTooltip(`<strong>${d.label}</strong>${fmt(d.value)} bel oproepen`, e.clientX, e.clientY);
      })
      .on('mouseleave', () => { guide.attr('opacity', 0); focus.attr('opacity', 0); hideTooltip(); });

    const stat = $('#peaksStat');
    if (stat) stat.innerHTML = `Op de drukste dag (<strong>${peak.label}</strong>) ging de bel <strong>${fmt(peak.value)}</strong> keer.`;
  };

  // ════════════════════════════════════════════════════
  // Koor van talen — de meertalige zee
  // ════════════════════════════════════════════════════
  chapterInit['ch-languages'] = () => {
    const stage = $('#langStage');
    const list = (languagesData || []).slice(0, 24).map(d => {
      const g = GREETINGS[d.code] || ['Hallo', d.code.toUpperCase()];
      return { code: d.code, n: d.n, greeting: g[0], name: g[1] };
    });
    if (!list.length) { stage.innerHTML = '<p class="stage-fallback">Geen taaldata.</p>'; return; }
    const total = d3.sum(list, d => d.n);
    const maxN = d3.max(list, d => d.n);
    const fs = d3.scaleSqrt().domain([0, maxN]).range([15, 70]);
    const palette = [C.green, C.bell, C.teal, C.pink, C.goldDeep];

    const W = 900, H = 540, cx = W / 2, cy = H / 2;
    list.forEach((d, i) => {
      d.size = fs(d.n);
      d.color = palette[i % palette.length];
      d.rad = Math.max(d.greeting.length * d.size * 0.3, d.size * 0.62) + 6;
      d.x = cx + (Math.random() - 0.5) * 260;
      d.y = cy + (Math.random() - 0.5) * 160;
    });

    const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const node = svg.selectAll('g.lang-word').data(list).join('g').attr('class', 'lang-word')
      .attr('tabindex', 0).attr('role', 'img').attr('aria-label', d => `${d.name}: ${fmt(d.n)} bezoekers`);
    node.append('text').attr('text-anchor', 'middle').attr('dy', '0.34em')
      .attr('font-family', FONT_DISPLAY).attr('font-weight', 800)
      .attr('font-size', d => d.size).attr('fill', d => d.color).text(d => d.greeting);
    node.filter(d => d.size > 30).append('text').attr('text-anchor', 'middle')
      .attr('dy', d => d.size * 0.62 + 12).attr('font-family', FONT_BODY).attr('font-size', 11)
      .attr('fill', C.green).attr('opacity', 0.55).text(d => d.name);

    node.on('mouseenter mousemove', (e, d) => showTooltip(
        `<strong>${d.name}</strong>${fmt(d.n)} bezoekers · ${(d.n / total * 100).toFixed(1)}%`, e.clientX, e.clientY))
      .on('mouseleave blur', () => hideTooltip())
      .on('focus', (e, d) => { const bb = e.currentTarget.getBoundingClientRect(); showTooltip(`<strong>${d.name}</strong>${fmt(d.n)} bezoekers`, bb.left + bb.width / 2, bb.top); });

    const sim = d3.forceSimulation(list)
      .force('x', d3.forceX(cx).strength(0.04))
      .force('y', d3.forceY(cy).strength(0.06))
      .force('charge', d3.forceManyBody().strength(-4))
      .force('collide', d3.forceCollide(d => d.rad).strength(0.9))
      .on('tick', () => node.attr('transform', d => `translate(${d.x},${d.y})`));

    if (reduceMotion) {
      sim.stop(); for (let i = 0; i < 220; i++) sim.tick();
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    } else {
      sim.on('end', () => {
        list.forEach(d => { d.bx = d.x; d.by = d.y; d.ph = Math.random() * Math.PI * 2; });
        const t0 = performance.now();
        const bob = () => {
          const t = (performance.now() - t0) / 1000;
          list.forEach(d => { d.x = d.bx + Math.sin(t * 0.5 + d.ph) * 5; d.y = d.by + Math.cos(t * 0.45 + d.ph) * 5; });
          node.attr('transform', d => `translate(${d.x},${d.y})`);
          bobId = raf(bob);
        };
        let bobId = raf(bob);
        cleanups.push(() => cancelAnimationFrame(bobId));
      });
    }
    cleanups.push(() => sim.stop());

    const stat = $('#langStat');
    if (stat) stat.innerHTML = `In totaal klinken er <strong>${(languagesData || []).length}</strong> verschillende talen rond de sluis.`;
  };

  // ════════════════════════════════════════════════════
  // Draaiende globe — de avond reist om de wereld
  // ════════════════════════════════════════════════════
  chapterInit['ch-globe'] = () => {
    const stage = $('#globeStage');
    if (!worldTopo || !geoData) { stage.innerHTML = '<p class="stage-fallback">Globe kon niet laden.</p>'; return; }
    const hourly = new Array(24).fill(0);
    (weekHours || []).forEach((v, i) => { hourly[i % 24] += v || 0; });
    const maxHourly = d3.max(hourly) || 1;

    const W = 600, H = 600, cx = W / 2, cy = H / 2, R = 248;
    const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const og = svg.append('defs').append('radialGradient').attr('id', 'globeOcean').attr('cx', '40%').attr('cy', '38%');
    og.append('stop').attr('offset', '0%').attr('stop-color', '#0a8a78');
    og.append('stop').attr('offset', '55%').attr('stop-color', C.green);
    og.append('stop').attr('offset', '100%').attr('stop-color', '#01211c');

    const projection = d3.geoOrthographic().scale(R).translate([cx, cy]).clipAngle(90);
    const path = d3.geoPath(projection);
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R).attr('fill', 'url(#globeOcean)')
      .attr('stroke', 'rgba(253,247,239,0.15)').attr('stroke-width', 1);
    const gratPath = svg.append('path').attr('fill', 'none').attr('stroke', 'rgba(253,247,239,0.07)').attr('stroke-width', 0.5);
    const landPath = svg.append('path').attr('fill', 'rgba(253,247,239,0.08)').attr('stroke', 'rgba(253,247,239,0.18)').attr('stroke-width', 0.4);
    const graticule = d3.geoGraticule10();
    const land = topojson.feature(worldTopo, worldTopo.objects.land);

    const counts = geoData.countries || {};
    const pts = Object.entries(COUNTRY_GEO).map(([code, g]) => ({ code, name: g[2], count: counts[code] || 0, ll: [g[0], g[1]] })).filter(p => p.count > 0);
    const maxC = d3.max(pts, p => p.count) || 1;
    const rS = d3.scaleSqrt().domain([0, maxC]).range([1.6, 12]);
    const dots = svg.append('g').selectAll('g.globe-dot').data(pts).join('g').attr('class', 'globe-dot')
      .attr('tabindex', 0).attr('role', 'img').attr('aria-label', p => `${p.name}: ${fmt(p.count)} bel oproepen`);
    dots.append('circle').attr('class', 'gd-glow');
    dots.append('circle').attr('class', 'gd-core').attr('stroke', 'rgba(253,247,239,0.6)').attr('stroke-width', 0.5);
    dots.on('mouseenter mousemove', (e, p) => showTooltip(`<strong>${p.name}</strong>${fmt(p.count)} bel oproepen`, e.clientX, e.clientY))
      .on('mouseleave blur', () => hideTooltip());

    const clockLabel = svg.append('text').attr('x', cx).attr('y', H - 22).attr('text-anchor', 'middle')
      .attr('font-family', FONT_BODY).attr('font-size', 13).attr('font-weight', 700).attr('fill', C.off).attr('opacity', 0.75);

    let gh = 18;
    function render() {
      const S = (12 - gh) * 15;
      projection.rotate([-S, -8]);
      gratPath.attr('d', path(graticule));
      landPath.attr('d', path(land));
      const center = [S, 8];
      dots.attr('transform', p => { const xy = projection(p.ll); return xy ? `translate(${xy[0]},${xy[1]})` : 'translate(-99,-99)'; })
        .attr('opacity', p => d3.geoDistance(p.ll, center) < Math.PI / 2 ? 1 : 0);
      dots.each(function (p) {
        const localH = ((gh + p.ll[0] / 15) % 24 + 24) % 24;
        const act = hourly[Math.floor(localH)] / maxHourly;
        const base = rS(p.count);
        const col = act > 0.6 ? C.pink : act > 0.25 ? C.purple : C.teal;
        const sel = d3.select(this);
        sel.select('.gd-core').attr('r', base).attr('fill', col).attr('opacity', 0.5 + act * 0.5);
        sel.select('.gd-glow').attr('r', base * (1.8 + act * 2.2)).attr('fill', col).attr('opacity', 0.08 + act * 0.4);
      });
      clockLabel.text(`wereldklok ~ ${String(Math.floor(gh) % 24).padStart(2, '0')}:00 — de avond reist mee`);
    }
    render();

    if (reduceMotion) return;
    let raf3 = 0, running = false;
    function tick() { gh = (gh + 0.02) % 24; render(); if (running) raf3 = raf(tick); }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!running) { running = true; tick(); } }
      else { running = false; cancelAnimationFrame(raf3); }
    }, { threshold: 0.2 });
    io.observe(stage);
    cleanups.push(() => { running = false; cancelAnimationFrame(raf3); io.disconnect(); });
  };

  // ════════════════════════════════════════════════════
  // Vijver-replay — een week in 60 seconden
  // ════════════════════════════════════════════════════
  chapterInit['ch-pond'] = () => {
    const stage = $('#pondStage');
    const week = pondWeekData;
    if (!week || !week.length) { stage.innerHTML = '<p class="stage-fallback">Geen tijddata.</p>'; return; }

    const canvas = document.createElement('canvas');
    canvas.className = 'pond-canvas';
    stage.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let Wd = 0, Hd = 0;
    function resize() {
      const r = stage.getBoundingClientRect();
      Wd = r.width; Hd = r.height;
      canvas.width = Wd * dpr; canvas.height = Hd * dpr;
      canvas.style.width = Wd + 'px'; canvas.style.height = Hd + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(stage);

    const clock = document.createElement('div'); clock.className = 'pond-clock'; stage.appendChild(clock);
    const counter = document.createElement('div'); counter.className = 'pond-counter'; stage.appendChild(counter);

    const dayLabels = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
    const MIN = week.length, DURATION = 60000;
    const maxPer = Math.max(...week, 1);
    const prefix = new Array(MIN + 1).fill(0);
    for (let i = 0; i < MIN; i++) prefix[i + 1] = prefix[i] + week[i];

    let ripples = [];
    function spawn(count) {
      const inten = Math.min(count / maxPer, 1);
      const n = Math.min(count, 5);
      const col = inten > 0.6 ? '255,128,185' : inten > 0.25 ? '155,116,255' : '30,172,176';
      for (let k = 0; k < n; k++) {
        ripples.push({ x: Math.random() * Wd, y: Hd * 0.05 + Math.random() * Hd * 0.9, r: 1.5, max: 16 + inten * 34, a: 0.7, col, sp: 0.5 + inten * 0.7 });
      }
    }

    if (reduceMotion) {
      clock.textContent = 'week-overzicht';
      ctx.clearRect(0, 0, Wd, Hd);
      for (let m = 0; m < MIN; m += 3) {
        if (!week[m]) continue;
        const inten = Math.min(week[m] / maxPer, 1);
        ctx.beginPath();
        ctx.arc((m / MIN) * Wd, Hd / 2 + (Math.random() - 0.5) * Hd * 0.5, 1 + inten * 4, 0, 7);
        ctx.fillStyle = `rgba(155,116,255,${0.15 + inten * 0.5})`; ctx.fill();
      }
      counter.textContent = `${fmt(prefix[MIN])} bel oproepen in een week`;
      cleanups.push(() => ro.disconnect());
      return;
    }

    let startT = 0, lastMin = 0, running = false, raf4 = 0;
    function frame(t) {
      if (!startT) startT = t;
      const p = ((t - startT) % DURATION) / DURATION;
      const curMin = Math.floor(p * MIN);
      let lo = lastMin + 1;
      if (curMin < lastMin) lo = 0;
      for (let m = lo; m <= curMin; m++) { if (week[m] > 0) spawn(week[m]); }
      lastMin = curMin;

      ctx.clearRect(0, 0, Wd, Hd);
      ripples = ripples.filter(rp => rp.a > 0.02 && rp.r < rp.max);
      for (const rp of ripples) {
        rp.r += rp.sp * (1 + rp.max / 28); rp.a *= 0.965;
        ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, 7);
        ctx.strokeStyle = `rgba(${rp.col},${rp.a})`; ctx.lineWidth = 1.5; ctx.stroke();
      }
      const dow = Math.min(6, Math.floor(curMin / 1440)), hod = Math.floor((curMin % 1440) / 60), moh = curMin % 60;
      clock.textContent = `${dayLabels[dow]} ${String(hod).padStart(2, '0')}:${String(moh).padStart(2, '0')}`;
      counter.textContent = `${fmt(prefix[curMin])} bel oproepen`;
      if (running) raf4 = raf(frame);
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!running) { running = true; raf4 = raf(frame); } }
      else { running = false; cancelAnimationFrame(raf4); }
    }, { threshold: 0.2 });
    io.observe(stage);
    cleanups.push(() => { running = false; cancelAnimationFrame(raf4); io.disconnect(); ro.disconnect(); });
  };

  // ════════════════════════════════════════════════════
  // Weekend vs doordeweeks — twee getijden
  // ════════════════════════════════════════════════════
  chapterInit['ch-weekday'] = () => {
    const stage = $('#weekdayStage');
    const week = pondWeekData;
    if (!week || week.length < 7 * 1440) { stage.innerHTML = '<p class="stage-fallback">Geen weekdata.</p>'; return; }
    const wd = new Array(24).fill(0), we = new Array(24).fill(0);
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) {
      let s = 0; for (let m = 0; m < 60; m++) s += week[d * 1440 + h * 60 + m] || 0;
      if (d < 5) wd[h] += s; else we[h] += s;
    }
    for (let h = 0; h < 24; h++) { wd[h] /= 5; we[h] /= 2; }
    const maxV = Math.max(d3.max(wd), d3.max(we)) || 1;

    const W = 860, H = 420, mL = 48, mR = 24, mT = 28, mB = 46;
    const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const x = d3.scaleLinear().domain([0, 23]).range([mL, W - mR]);
    const y = d3.scaleLinear().domain([0, maxV * 1.12]).range([H - mB, mT]);
    const clip = svg.append('defs').append('clipPath').attr('id', 'wdClip').append('rect')
      .attr('x', 0).attr('y', 0).attr('height', H).attr('width', reduceMotion ? W : 0);

    y.ticks(4).forEach(t => svg.append('line').attr('x1', mL).attr('x2', W - mR).attr('y1', y(t)).attr('y2', y(t))
      .attr('stroke', 'rgba(1,70,60,0.12)').attr('stroke-dasharray', '2 5'));
    [0, 3, 6, 9, 12, 15, 18, 21].forEach(h => svg.append('text').attr('x', x(h)).attr('y', H - mB + 20)
      .attr('text-anchor', 'middle').attr('font-family', FONT_BODY).attr('font-size', 11)
      .attr('fill', C.green).attr('opacity', 0.55).text(`${h}u`));

    const area = d3.area().x((d, i) => x(i)).y0(H - mB).y1(d => y(d)).curve(d3.curveCatmullRom);
    const lineG = d3.line().x((d, i) => x(i)).y(d => y(d)).curve(d3.curveCatmullRom);
    const draw = (data, color, dash) => {
      svg.append('path').datum(data).attr('d', area).attr('fill', color).attr('opacity', 0.1).attr('clip-path', 'url(#wdClip)');
      svg.append('path').datum(data).attr('d', lineG).attr('fill', 'none').attr('stroke', color)
        .attr('stroke-width', 2.5).attr('stroke-dasharray', dash || 'none').attr('clip-path', 'url(#wdClip)');
    };
    draw(wd, C.bell, null);
    draw(we, C.pink, '6 4');
    if (!reduceMotion) clip.transition().duration(1400).ease(d3.easeCubicInOut).attr('width', W);

    // legenda
    const lg = svg.append('g').attr('transform', `translate(${W - mR - 168},${mT})`);
    lg.append('line').attr('x1', 0).attr('x2', 22).attr('y1', 0).attr('y2', 0).attr('stroke', C.bell).attr('stroke-width', 2.5);
    lg.append('text').attr('x', 28).attr('y', 4).attr('font-family', FONT_BODY).attr('font-size', 12).attr('fill', C.green).text('doordeweeks');
    lg.append('line').attr('x1', 0).attr('x2', 22).attr('y1', 18).attr('y2', 18).attr('stroke', C.pink).attr('stroke-width', 2.5).attr('stroke-dasharray', '6 4');
    lg.append('text').attr('x', 28).attr('y', 22).attr('font-family', FONT_BODY).attr('font-size', 12).attr('fill', C.green).text('weekend');

    const wdPeak = wd.indexOf(d3.max(wd)), wePeak = we.indexOf(d3.max(we));
    const stat = $('#weekdayStat');
    if (stat) stat.innerHTML = `Doordeweeks piekt de bel rond <strong>${wdPeak}u</strong>, in het weekend rond <strong>${wePeak}u</strong>.`;
  };

  // ════════════════════════════════════════════════════
  // Schermen-aquarium — portholes naar de webcam
  // ════════════════════════════════════════════════════
  chapterInit['ch-screens'] = () => {
    const stage = $('#screensStage');
    const list = (screensData || []).map(d => ({ ...d, ar: d.w / d.h, portrait: d.w < d.h }));
    if (!list.length) { stage.innerHTML = '<p class="stage-fallback">Geen schermdata.</p>'; return; }
    const maxN = d3.max(list, d => d.n);
    const sScale = d3.scaleSqrt().domain([0, maxN]).range([0, 1]);
    const W = 900, H = 540, cx = W / 2, cy = H / 2;
    list.forEach(d => {
      const base = 46 + sScale(d.n) * 188;
      d.w2 = base * Math.sqrt(d.ar);
      d.h2 = base / Math.sqrt(d.ar);
      d.diag = Math.hypot(d.w2, d.h2);
      d.x = cx + (Math.random() - 0.5) * 220;
      d.y = cy + (Math.random() - 0.5) * 140;
    });
    list.sort((a, b) => b.n - a.n); // groot achter

    const svg = d3.select(stage).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const g = svg.selectAll('g.screen-win').data(list).join('g').attr('class', 'screen-win')
      .attr('tabindex', 0).attr('role', 'img').attr('aria-label', d => `${d.w}×${d.h}: ${fmt(d.n)} keer`);
    g.append('rect').attr('x', d => -d.w2 / 2).attr('y', d => -d.h2 / 2)
      .attr('width', d => d.w2).attr('height', d => d.h2).attr('rx', 7)
      .attr('fill', d => d.portrait ? 'rgba(30,172,176,0.16)' : 'rgba(155,116,255,0.16)')
      .attr('stroke', d => d.portrait ? C.teal : C.bell).attr('stroke-width', 1.5);
    const big = g.filter(d => d.w2 > 78 && d.h2 > 46);
    big.append('text').attr('text-anchor', 'middle').attr('dy', '-0.1em')
      .attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
      .attr('fill', C.off).attr('opacity', 0.85).text(d => `${d.w}×${d.h}`);
    big.append('text').attr('text-anchor', 'middle').attr('dy', '1.2em')
      .attr('font-family', FONT_BODY).attr('font-size', 10).attr('fill', C.off).attr('opacity', 0.55).text(d => fmt(d.n));

    g.on('mouseenter mousemove', (e, d) => showTooltip(
        `<strong>${d.w}×${d.h}</strong>${fmt(d.n)} keer · ${d.portrait ? 'staand' : 'liggend'}`, e.clientX, e.clientY))
      .on('mouseleave blur', () => hideTooltip())
      .on('focus', (e, d) => { const bb = e.currentTarget.getBoundingClientRect(); showTooltip(`<strong>${d.w}×${d.h}</strong>${fmt(d.n)} keer`, bb.left + bb.width / 2, bb.top); });

    const sim = d3.forceSimulation(list)
      .force('x', d3.forceX(cx).strength(0.05))
      .force('y', d3.forceY(cy).strength(0.06))
      .force('collide', d3.forceCollide(d => d.diag / 2 * 0.6).strength(0.6))
      .on('tick', () => g.attr('transform', d => `translate(${d.x},${d.y})`));
    if (reduceMotion) { sim.stop(); for (let i = 0; i < 200; i++) sim.tick(); g.attr('transform', d => `translate(${d.x},${d.y})`); }
    else {
      sim.on('end', () => {
        list.forEach(d => { d.bx = d.x; d.by = d.y; d.ph = Math.random() * Math.PI * 2; });
        const t0 = performance.now();
        const bob = () => {
          const t = (performance.now() - t0) / 1000;
          list.forEach(d => { d.x = d.bx + Math.sin(t * 0.45 + d.ph) * 4; d.y = d.by + Math.cos(t * 0.4 + d.ph) * 4; });
          g.attr('transform', d => `translate(${d.x},${d.y})`);
          bobId = raf(bob);
        };
        let bobId = raf(bob);
        cleanups.push(() => cancelAnimationFrame(bobId));
      });
    }
    cleanups.push(() => sim.stop());

    const o = orientationData || { portrait: 0, landscape: 0, total: 1 };
    const stat = $('#screensStat');
    if (stat) stat.innerHTML = `<strong>${Math.round(o.portrait / o.total * 100)}%</strong> kijkt staand (telefoon), <strong>${Math.round(o.landscape / o.total * 100)}%</strong> liggend${o.unique ? ` — uit <strong>${fmt(o.unique)}</strong> verschillende schermformaten` : ''}.`;
    const leg = $('#screensLegend');
    if (leg) leg.innerHTML =
      `<span class="shoal-leg-item"><span class="dot" style="background:${C.teal}"></span>staand (telefoon/tablet)</span>` +
      `<span class="shoal-leg-item"><span class="dot" style="background:${C.bell}"></span>liggend (laptop/desktop)</span>`;
  };

  // ════════════════════════════════════════════════════
  // Aquarium — een steekproef van waarnemingen (canvas)
  // ════════════════════════════════════════════════════
  chapterInit['ch-aquarium'] = () => {
    const stage = $('#aquariumStage');
    if (!stage) return;
    stage.querySelectorAll('canvas, .aquarium-counter').forEach(n => n.remove());
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const counter = document.createElement('div');
    counter.className = 'aquarium-counter';
    counter.setAttribute('aria-live', 'polite');
    stage.appendChild(counter);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    function resize() {
      const r = stage.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(stage);

    const total = TOTAL || visData.reduce((s, v) => s + v.count, 0) || 1;
    const tEl = $('#aquariumTotal'); if (tEl) tEl.textContent = fmt(total);

    // Vis-silhouetten naar kleine offscreen-canvassen (goedkoop hertekenen)
    const sprites = {};
    function drawFishPath(c, shape, w, h) {
      c.beginPath();
      if (shape === 'long') {
        c.moveTo(-w * 0.42, 0); c.quadraticCurveTo(-w * 0.5, -h * 0.35, -w * 0.35, -h * 0.35);
        c.quadraticCurveTo(0, -h * 0.42, w * 0.25, -h * 0.28); c.lineTo(w * 0.35, -h * 0.2);
        c.lineTo(w * 0.46, -h * 0.32); c.lineTo(w * 0.5, 0); c.lineTo(w * 0.46, h * 0.32);
        c.lineTo(w * 0.35, h * 0.2); c.lineTo(w * 0.25, h * 0.28);
        c.quadraticCurveTo(0, h * 0.42, -w * 0.35, h * 0.35); c.quadraticCurveTo(-w * 0.5, h * 0.35, -w * 0.42, 0);
      } else if (shape === 'tiny') {
        c.moveTo(-w * 0.36, 0); c.quadraticCurveTo(-w * 0.46, -h * 0.5, -w * 0.18, -h * 0.55);
        c.quadraticCurveTo(w * 0.22, -h * 0.6, w * 0.34, -h * 0.25); c.lineTo(w * 0.46, -h * 0.45);
        c.lineTo(w * 0.42, 0); c.lineTo(w * 0.46, h * 0.45); c.lineTo(w * 0.34, h * 0.25);
        c.quadraticCurveTo(w * 0.22, h * 0.6, -w * 0.18, h * 0.55); c.quadraticCurveTo(-w * 0.46, h * 0.5, -w * 0.36, 0);
      } else if (shape === 'pred') {
        c.moveTo(-w * 0.36, 0); c.quadraticCurveTo(-w * 0.46, -h * 0.5, -w * 0.18, -h * 0.5);
        c.quadraticCurveTo(w * 0.18, -h * 0.55, w * 0.34, -h * 0.3); c.lineTo(w * 0.42, -h * 0.32);
        c.lineTo(w * 0.46, -h * 0.18); c.lineTo(w * 0.5, -h * 0.5); c.lineTo(w * 0.5, h * 0.5);
        c.lineTo(w * 0.46, h * 0.18); c.lineTo(w * 0.42, h * 0.32); c.lineTo(w * 0.34, h * 0.3);
        c.quadraticCurveTo(w * 0.18, h * 0.55, -w * 0.18, h * 0.5); c.quadraticCurveTo(-w * 0.46, h * 0.5, -w * 0.36, 0);
      } else if (shape === 'baars') {
        c.moveTo(-w * 0.36, 0); c.quadraticCurveTo(-w * 0.44, -h * 0.5, -w * 0.2, -h * 0.6);
        c.lineTo(-w * 0.08, -h * 0.75); c.lineTo(0.04, -h * 0.6); c.quadraticCurveTo(w * 0.2, -h * 0.65, w * 0.32, -h * 0.22);
        c.lineTo(w * 0.46, -h * 0.6); c.lineTo(w * 0.5, 0); c.lineTo(w * 0.46, h * 0.6); c.lineTo(w * 0.32, h * 0.22);
        c.quadraticCurveTo(w * 0.2, h * 0.65, 0.04, h * 0.6); c.lineTo(-w * 0.08, h * 0.75); c.lineTo(-w * 0.2, h * 0.6);
        c.quadraticCurveTo(-w * 0.44, h * 0.5, -w * 0.36, 0);
      } else {
        c.moveTo(-w * 0.36, 0); c.quadraticCurveTo(-w * 0.44, -h * 0.5, -w * 0.2, -h * 0.6);
        c.quadraticCurveTo(w * 0.2, -h * 0.7, w * 0.32, -h * 0.2); c.lineTo(w * 0.46, -h * 0.5);
        c.lineTo(w * 0.5, 0); c.lineTo(w * 0.46, h * 0.5); c.lineTo(w * 0.32, h * 0.2);
        c.quadraticCurveTo(w * 0.2, h * 0.7, -w * 0.2, h * 0.6); c.quadraticCurveTo(-w * 0.44, h * 0.5, -w * 0.36, 0);
      }
      c.fill();
    }
    function makeSprite(shape, color) {
      const key = shape + color;
      if (sprites[key]) return sprites[key];
      const w = shape === 'long' ? 64 : shape === 'tiny' ? 32 : 48;
      const h = shape === 'long' ? 14 : shape === 'tiny' ? 12 : 22;
      const c = document.createElement('canvas');
      c.width = w * dpr; c.height = h * dpr;
      const cc = c.getContext('2d');
      cc.setTransform(dpr, 0, 0, dpr, 0, 0);
      cc.fillStyle = color; cc.translate(w / 2, h / 2);
      drawFishPath(cc, shape, w, h);
      sprites[key] = c; return c;
    }

    // ~80 vissen, evenredig per soort
    const sample = [];
    visData.forEach(v => {
      const n = Math.max(1, Math.round((v.count / total) * 80));
      for (let i = 0; i < n; i++) sample.push({
        x: Math.random() * 100, y: Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.2,
        shape: v.shape, color: v.color, naam: v.naam,
        size: v.shape === 'tiny' ? 0.6 : v.shape === 'long' ? 1.2 : 0.9,
        wig: Math.random() * Math.PI * 2, visible: true,
      });
    });

    // filter-chips per soort
    const filtersHost = $('#aquariumFilters');
    if (filtersHost) {
      filtersHost.innerHTML = '';
      visData.forEach(v => {
        const chip = document.createElement('button');
        chip.type = 'button'; chip.className = 'filter-chip'; chip.dataset.naam = v.naam;
        chip.style.setProperty('--chip', v.color); chip.setAttribute('aria-pressed', 'true');
        chip.textContent = v.naam;
        chip.addEventListener('click', () => {
          const muted = chip.classList.toggle('muted');
          chip.setAttribute('aria-pressed', String(!muted));
          sample.forEach(f => { if (f.naam === v.naam) f.visible = !muted; });
        });
        filtersHost.appendChild(chip);
      });
    }

    // klik = laten schrikken + rimpel
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width * 100;
      const py = (e.clientY - rect.top) / rect.height * 100;
      sample.forEach(f => {
        const dx = f.x - px, dy = f.y - py, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 35) { const k = (35 - dist) / 35; f.vx += (dx / Math.max(0.1, dist)) * k * 2.5; f.vy += (dy / Math.max(0.1, dist)) * k * 1.6; }
      });
      const rip = document.createElement('span');
      rip.className = 'aquarium-rip';
      rip.style.left = (e.clientX - rect.left) + 'px';
      rip.style.top = (e.clientY - rect.top) + 'px';
      stage.appendChild(rip);
      setTimeout(() => rip.remove(), 950);
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width * 100;
      const py = (e.clientY - rect.top) / rect.height * 100;
      let closest = null, cd = 4;
      sample.forEach(f => { if (!f.visible) return; const d = Math.hypot(f.x - px, f.y - py); if (d < cd) { cd = d; closest = f; } });
      if (closest) { canvas.style.cursor = 'pointer'; showTooltip(`<strong>${closest.naam}</strong>klik om de vissen te laten schrikken`, e.clientX, e.clientY); }
      else { canvas.style.cursor = 'crosshair'; hideTooltip(); }
    });
    canvas.addEventListener('mouseleave', () => hideTooltip());

    let running = false, rafId = 0, counterRafId = 0;
    function tick() {
      ctx.clearRect(0, 0, W, H);
      const grd = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, Math.max(W, H));
      grd.addColorStop(0, 'rgba(30,172,176,0.10)'); grd.addColorStop(1, 'rgba(30,172,176,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
      sample.forEach(f => {
        f.x += f.vx; f.y += f.vy + Math.sin(f.wig) * 0.04; f.wig += 0.08;
        f.vx += (50 - f.x) * 0.00006; f.vy += (50 - f.y) * 0.00006;
        f.vx += (Math.random() - 0.5) * 0.01; f.vy += (Math.random() - 0.5) * 0.006;
        f.vx *= 0.992; f.vy *= 0.992;
        if (f.x < -5) f.x = 105; if (f.x > 105) f.x = -5;
        if (f.y < -5) f.y = 105; if (f.y > 105) f.y = -5;
        if (!f.visible) return;
        const sprite = makeSprite(f.shape, f.color);
        const px = (f.x / 100) * W, py = (f.y / 100) * H;
        const angle = Math.atan2(f.vy, f.vx);
        const flip = Math.abs(angle) > Math.PI / 2 ? -1 : 1;
        const sw = sprite.width / dpr * f.size, sh = sprite.height / dpr * f.size;
        ctx.save(); ctx.translate(px, py); ctx.rotate(angle * (flip < 0 ? -1 : 1)); ctx.scale(1, flip);
        ctx.globalAlpha = 0.92; ctx.drawImage(sprite, -sw / 2, -sh / 2, sw, sh); ctx.restore();
      });
      if (running) rafId = raf(tick);
    }
    function animateCounter() {
      const start = performance.now(), dur = 3800;
      function step(now) {
        const t = Math.min(1, (now - start) / dur);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        counter.textContent = `${fmt(Math.round(eased * total))} / ${fmt(total)}`;
        if (t < 1) counterRafId = raf(step);
      }
      counterRafId = raf(step);
    }

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!running && !reduceMotion) { running = true; tick(); }
        if (!counter.dataset.animated) {
          counter.dataset.animated = '1';
          if (reduceMotion) counter.textContent = `${fmt(total)} / ${fmt(total)}`; else animateCounter();
        }
        if (reduceMotion) tick();
      } else { running = false; cancelAnimationFrame(rafId); }
    }, { threshold: 0.1 });
    io.observe(stage);
    cleanups.push(() => { running = false; cancelAnimationFrame(rafId); cancelAnimationFrame(counterRafId); io.disconnect(); ro.disconnect(); });
  };

  // ════════════════════════════════════════════════════
  // Het net — als we ze allemaal zouden vangen (circle-pack)
  // ════════════════════════════════════════════════════
  chapterInit['ch-net'] = () => {
    const host = $('#netStage');
    const info = $('#netInfo');
    const W = 900, H = 680;
    const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

    // het net dat van bovenaf zakt
    const netGroup = svg.append('g');
    const meshBot = 380;
    for (let i = 0; i <= 16; i++) {
      const x = (i / 16) * W;
      netGroup.append('path').attr('class', 'net-rope')
        .attr('d', `M ${x} 0 Q ${x + Math.sin(i) * 12} 200, ${x + Math.sin(i + 0.5) * 30} ${meshBot}`);
    }
    for (let j = 0; j <= 8; j++) {
      const y = (j / 8) * meshBot, r = 8 + j * 2;
      netGroup.append('path').attr('class', 'net-rope').attr('d', `M 0 ${y} Q ${W / 2} ${y + r}, ${W} ${y}`);
    }
    netGroup.append('line').attr('x1', 0).attr('y1', 0).attr('x2', W).attr('y2', 0)
      .attr('stroke', 'rgb(253 247 239 / 0.7)').attr('stroke-width', 2);
    netGroup.attr('transform', 'translate(0,-200)')
      .transition().delay(reduceMotion ? 0 : 300).duration(reduceMotion ? 0 : 1400).attr('transform', 'translate(0,0)');

    const bubbleGroup = svg.append('g').attr('transform', 'translate(20, 80)');
    const defs = svg.append('defs');
    let currentStat = 'biomass';

    const statFn = { count: d => d.count, weight: d => d.weight, biomass: d => d.count * d.weight };
    const statLabel = {
      count:   v => `${fmt(v.count)} waarnemingen`,
      weight:  v => `~${v.weight} kg per vis`,
      biomass: v => `${fmt(v.count * v.weight)} kg biomassa (${fmt(v.count)} × ${v.weight} kg)`,
    };
    const explainer = {
      count: 'Verdeeld op aantal waarnemingen.',
      weight: 'Verdeeld op gemiddeld gewicht per vis.',
      biomass: 'Verdeeld op biomassa: aantal × gewicht.',
    };

    function renderPack(stat) {
      const packData = visData.map(v => ({ ...v, value: statFn[stat](v) }));
      const pack = d3.pack().size([W - 40, H - 100]).padding(8);
      const root = d3.hierarchy({ children: packData }).sum(d => d.value);
      const nodes = pack(root).leaves();
      const D = reduceMotion ? 0 : 1;

      const sel = bubbleGroup.selectAll('.net-bubble').data(nodes, d => d.data.naam);
      sel.exit().transition().duration(500 * D).attr('transform', d => `translate(${d.x}, ${d.y}) scale(0)`).remove();

      const enter = sel.enter().append('g')
        .attr('class', 'net-bubble').attr('tabindex', 0).attr('role', 'button')
        .attr('transform', d => `translate(${d.x}, ${d.y - 200}) scale(0)`);

      enter.each(function (d) {
        const g = d3.select(this);
        const gradId = `bubGrad-${d.data.naam.replace(/\W/g, '')}`;
        const grad = defs.append('radialGradient').attr('id', gradId).attr('cx', '35%').attr('cy', '30%');
        grad.append('stop').attr('offset', '0%').attr('stop-color', C.off).attr('stop-opacity', 0.7);
        grad.append('stop').attr('offset', '50%').attr('stop-color', d.data.color).attr('stop-opacity', 0.55);
        grad.append('stop').attr('offset', '100%').attr('stop-color', d.data.color).attr('stop-opacity', 0.85);
        g.append('circle').attr('class', 'bub-main').attr('r', d.r).attr('fill', `url(#${gradId})`)
          .attr('stroke', 'rgb(253 247 239 / 0.3)').attr('stroke-width', 1);
        g.append('circle').attr('class', 'bub-shine').attr('cx', -d.r * 0.3).attr('cy', -d.r * 0.3).attr('r', d.r * 0.25)
          .attr('fill', 'rgb(253 247 239 / 0.45)');
        g.append('g').attr('class', 'bub-fish').style('color', d.data.color);
        g.append('text').attr('class', 'bub-label').attr('text-anchor', 'middle')
          .attr('font-family', FONT_DISPLAY).attr('font-weight', 800).attr('fill', C.off);
      });

      const all = enter.merge(sel);
      all.each(function (d) {
        const g = d3.select(this);
        const fishSize = Math.min(d.r * 1.4, 96);
        g.select('.bub-fish').html(`<use href="#${fishSymbolId(d.data.shape)}" x="${-fishSize / 2}" y="${-fishSize / 4}" width="${fishSize}" height="${fishSize / 2.5}"/>`);
        g.attr('aria-label', `${d.data.naam}: ${statLabel[stat](d.data)}`);
        const setInfo = () => { info.textContent = `${d.data.naam} — ${statLabel[stat](d.data)}.`; };
        g.on('click', setInfo).on('mouseenter', setInfo)
          .on('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setInfo(); } });
        g.select('.bub-main').transition().duration(800 * D).attr('r', d.r);
        g.select('.bub-shine').transition().duration(800 * D).attr('cx', -d.r * 0.3).attr('cy', -d.r * 0.3).attr('r', d.r * 0.25);
        g.select('.bub-label').transition().duration(800 * D)
          .attr('y', d.r * 0.55).attr('font-size', Math.min(d.r * 0.32, 18)).attr('opacity', d.r > 28 ? 0.92 : 0);
      });
      enter.transition().delay((d, i) => (reduceMotion ? 0 : 200 + i * 70)).duration(900 * D).ease(d3.easeCubicOut)
        .attr('transform', d => `translate(${d.x}, ${d.y}) scale(1)`);
      sel.transition().duration(800 * D).ease(d3.easeCubicInOut)
        .attr('transform', d => `translate(${d.x}, ${d.y}) scale(1)`);
    }
    renderPack(currentStat);
    if (info) info.textContent = explainer[currentStat];

    // toggle — onclick i.p.v. addEventListener zodat er bij hertekenen niets opstapelt
    $$('.net-toggle-btn').forEach(btn => {
      const on = btn.dataset.stat === currentStat;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', String(on));
      btn.onclick = () => {
        if (btn.dataset.stat === currentStat) return;
        currentStat = btn.dataset.stat;
        $$('.net-toggle-btn').forEach(b => {
          const a = b.dataset.stat === currentStat;
          b.classList.toggle('active', a);
          b.setAttribute('aria-selected', String(a));
        });
        renderPack(currentStat);
        if (info) info.textContent = explainer[currentStat];
      };
    });
    cleanups.push(() => { $$('.net-toggle-btn').forEach(b => { b.onclick = null; }); });
  };

  // ════════════════════════════════════════════════════
  // Radar — vissoorten onder de sluis
  // ════════════════════════════════════════════════════
  chapterInit['ch-radar'] = () => {
    const W = 620, H = 620, cx = W / 2, cy = H / 2, R = 270;
    const svg = d3.select($('#radarStage')).append('svg').attr('viewBox', `0 0 ${W} ${H}`);

    for (let i = 1; i <= 4; i++) {
      svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R * i / 4)
        .attr('fill', 'none').attr('stroke', 'rgba(253,247,239,0.1)').attr('stroke-dasharray', '2 6');
    }
    [['x1', cx - R, 'y1', cy, 'x2', cx + R, 'y2', cy],
     ['x1', cx, 'y1', cy - R, 'x2', cx, 'y2', cy + R]].forEach(([k1, v1, k2, v2, k3, v3, k4, v4]) => {
      svg.append('line').attr(k1, v1).attr(k2, v2).attr(k3, v3).attr(k4, v4)
        .attr('stroke', 'rgba(253,247,239,0.08)');
    });

    const grad = svg.append('defs').append('linearGradient').attr('id', 'radarSweep')
      .attr('x1', 0).attr('y1', 0).attr('x2', 1).attr('y2', 0);
    grad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(192,168,255,0.0)');
    grad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(192,168,255,0.5)');

    const sweep = svg.append('path')
      .attr('d', `M ${cx} ${cy} L ${cx + R} ${cy} A ${R} ${R} 0 0 0 ${cx + Math.cos(-Math.PI / 4) * R} ${cy + Math.sin(-Math.PI / 4) * R} Z`)
      .attr('fill', 'url(#radarSweep)').attr('opacity', 0.6);
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 5).attr('fill', C.purple);

    // Afstand tot het midden = inverse van waarnemingen: vaakst gezien dicht bij
    // het scherm, zeldzaam aan de rand. Hoeken willekeurig met rejection sampling
    // zodat soorten elkaar niet overlappen.
    const pingSeed = mulberry32(42);
    const counts = visData.map(v => v.count || 0);
    const maxC = Math.max(...counts, 1);
    const positiveCounts = counts.filter(c => c > 0);
    const minC = positiveCounts.length ? Math.min(...positiveCounts) : maxC;
    const innerD = 70, outerD = R - 55;
    const dscale = d3.scaleSqrt().domain([minC, maxC]).range([outerD, innerD]).clamp(true);
    const minGap = 70; // minimale onderlinge afstand in px
    const pings = [];
    visData.forEach(v => {
      const distance = v.count > 0
        ? dscale(v.count) + (pingSeed() - 0.5) * 22
        : outerD + 10;
      let best = null, bestScore = -Infinity;
      for (let t = 0; t < 60; t++) {
        const angle = pingSeed() * Math.PI * 2;
        const px = cx + Math.cos(angle) * distance;
        const py = cy + Math.sin(angle) * distance;
        const nearest = pings.reduce((m, p) => Math.min(m, Math.hypot(p.x - px, p.y - py)), Infinity);
        if (nearest >= minGap) { best = { angle, x: px, y: py }; break; }
        if (nearest > bestScore) { bestScore = nearest; best = { angle, x: px, y: py }; }
      }
      pings.push({ ...v, ...best });
    });

    const detailPanel = $('#radarDetail');
    const pingsGroup = svg.append('g');
    pings.forEach(p => {
      const g = pingsGroup.append('g')
        .attr('class', 'radar-ping').attr('data-naam', p.naam)
        .attr('transform', `translate(${p.x}, ${p.y})`)
        .attr('opacity', 0).attr('tabindex', 0).attr('role', 'button')
        .attr('aria-label', `${p.naam}: ${fmt(p.count)} waarnemingen`);
      g.append('circle').attr('class', 'radar-ping-bg').attr('r', 18).attr('fill', p.color).attr('opacity', 0.18);
      g.append('circle').attr('r', 8).attr('fill', p.color).attr('opacity', 0.6);
      g.append('g').attr('class', 'fish-wiggle').style('color', p.color)
        .html(`<use href="#${fishSymbolId(p.shape)}" x="-22" y="-9" width="44" height="18"/>`);
      // Label rechts van de vis, tenzij het dan de rand raakt; idem voor links
      let labelRight = p.x > cx;
      const labelText = `${p.naam} · ${fmt(p.count)}`;
      const estW = labelText.length * 7 + 26;
      if (labelRight && p.x + estW > W - 6) labelRight = false;
      else if (!labelRight && p.x - estW < 6) labelRight = true;
      g.append('text')
        .attr('x', labelRight ? 26 : -26).attr('y', 4)
        .attr('text-anchor', labelRight ? 'start' : 'end')
        .attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
        .attr('fill', C.off).attr('opacity', 0.85)
        .text(labelText);

      const showDetail = () => {
        pingsGroup.selectAll('.radar-ping').classed('selected', false);
        g.classed('selected', true);
        detailPanel.innerHTML = `<strong>${p.naam}</strong>${fmt(p.count)} waarnemingen<br/>Piek: ${MONTH_FULL[p.monthly.indexOf(Math.max(...p.monthly))]}<br/>Diepte: ${p.diepte}<br/>Gewicht: ~${p.weight} kg`;
        detailPanel.classList.add('visible');
      };
      g.on('click', showDetail);
      g.on('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDetail(); } });
      p.elem = g;
    });

    let angle = -Math.PI / 2, raf2 = 0, running = false;
    const revealed = new Set();
    function tick() {
      angle += reduceMotion ? 0.03 : 0.01;
      sweep.attr('transform', `rotate(${angle * 180 / Math.PI} ${cx} ${cy})`);
      pings.forEach((p, i) => {
        const da = (Math.atan2(p.y - cy, p.x - cx) - angle + Math.PI * 4) % (Math.PI * 2);
        if (!revealed.has(i) && da < 0.18) { revealed.add(i); p.elem.transition().duration(300).attr('opacity', 1); }
      });
      if (running) raf2 = raf(tick);
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { if (!running) { running = true; tick(); } }
      else { running = false; cancelAnimationFrame(raf2); }
    }, { threshold: 0.2 });
    io.observe($('#radarStage'));
    cleanups.push(() => { running = false; cancelAnimationFrame(raf2); io.disconnect(); });
  };

  // ════════════════════════════════════════════════════
  // Hero — duizenden bel oproepen vormen één vis (canvas)
  // ════════════════════════════════════════════════════
  chapterInit['ch-hero'] = (sectionEl) => {
    const stage = $('#heroStage');
    if (!stage) return;
    const overlay = sectionEl.querySelector('.hero-overlay');
    const countEl = $('#heroCount');
    const periodEl = $('#heroPeriod');
    if (periodEl) periodEl.textContent = periodLabel || '';
    const target = TOTAL || 0;

    const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
    const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const easeIn = (t) => t * t * t;
    const heroCol = d3.interpolateRgbBasis([C.teal, C.bell, C.purple, C.pink, C.goldDeep]);

    // Vis-silhouet → puntenwolk (offscreen tekenen, pixels uitlezen)
    function buildFishPoints(n) {
      const FW = 900, FH = 460, fcx = FW / 2, fcy = FH / 2, hw = 360, hh = 150;
      const oc = document.createElement('canvas'); oc.width = FW; oc.height = FH;
      const o = oc.getContext('2d'); o.fillStyle = '#fff';
      o.beginPath(); o.ellipse(fcx + hw * 0.06, fcy, hw * 0.68, hh * 0.82, 0, 0, Math.PI * 2); o.fill();           // romp
      o.beginPath(); o.moveTo(fcx - hw * 0.5, fcy); o.lineTo(fcx - hw, fcy - hh * 0.95); o.lineTo(fcx - hw, fcy + hh * 0.95); o.closePath(); o.fill(); // staart
      o.beginPath(); o.moveTo(fcx - hw * 0.18, fcy - hh * 0.6); o.lineTo(fcx + hw * 0.34, fcy - hh * 0.6); o.lineTo(fcx + hw * 0.02, fcy - hh * 1.12); o.closePath(); o.fill(); // rugvin
      o.beginPath(); o.moveTo(fcx - hw * 0.02, fcy + hh * 0.5); o.lineTo(fcx + hw * 0.3, fcy + hh * 0.5); o.lineTo(fcx + hw * 0.12, fcy + hh * 0.95); o.closePath(); o.fill(); // buikvin
      const img = o.getImageData(0, 0, FW, FH).data;
      const pts = [];
      for (let y = 0; y < FH; y += 2) for (let x = 0; x < FW; x += 2) { if (img[(y * FW + x) * 4 + 3] > 128) pts.push([x, y]); }
      for (let i = pts.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      for (const p of pts) { if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
      const bw = maxX - minX || 1, bxc = (minX + maxX) / 2, byc = (minY + maxY) / 2;
      const take = Math.min(n, pts.length), out = [];
      for (let i = 0; i < take; i++) { const p = pts[i]; out.push({ fx: (p[0] - bxc) / bw, fy: (p[1] - byc) / bw }); }
      return out;
    }

    const N = Math.min(target || 6000, window.innerWidth < 700 ? 4500 : 9000);
    const parts = buildFishPoints(N).map(fp => ({
      fx: fp.fx, fy: fp.fy,
      ca: rng() * Math.PI * 2, cr: 0.28 + rng() * 0.82,
      delay: rng() * 850, dur: 1400 + rng() * 900,
      ea: rng() * Math.PI * 2, er: 0.4 + rng() * 0.95,
      size: 1.3 + rng() * 1.3, ph: rng() * Math.PI * 2,
      col: heroCol(clamp(fp.fx + 0.5, 0, 1)),
    }));

    const canvas = document.createElement('canvas');
    canvas.className = 'hero-canvas';
    stage.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    function resize() {
      const r = stage.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(stage);

    function draw(elapsed) {
      const rct = sectionEl.getBoundingClientRect();
      const s = clamp(-rct.top / (rct.height * 0.85), 0, 1);
      const maxR = Math.hypot(W, H) * 0.62;
      const scale = Math.min(W * 0.66, 760);
      const cx = W / 2, cy = H * 0.5;
      const expEase = easeIn(s);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        const ft = clamp((elapsed - p.delay) / p.dur, 0, 1), ef = easeOut(ft);
        const fhx = cx + p.fx * scale, fhy = cy + p.fy * scale;
        const clx = cx + Math.cos(p.ca) * p.cr * maxR, cly = cy + Math.sin(p.ca) * p.cr * maxR;
        let x = clx + (fhx - clx) * ef, y = cly + (fhy - cly) * ef;
        const wob = (1 - s) * ef;
        x += Math.sin(elapsed * 0.0011 + p.ph) * 3 * wob;
        y += Math.cos(elapsed * 0.0009 + p.ph) * 3 * wob;
        if (s > 0) { x += Math.cos(p.ea) * p.er * maxR * 0.9 * expEase; y += Math.sin(p.ea) * p.er * maxR * 0.55 * expEase + expEase * expEase * H * 0.5; }
        const a = ef * (1 - smoothstep(0.6, 1, s));
        if (a <= 0.01) continue;
        ctx.globalAlpha = a * 0.92;
        ctx.fillStyle = p.col;
        ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const ce = easeOut(clamp(elapsed / 2200, 0, 1));
      if (countEl) countEl.textContent = fmt(Math.round(ce * target));
      if (overlay) { overlay.style.opacity = String(1 - smoothstep(0, 0.55, s)); overlay.style.transform = `translateY(${-s * 40}px)`; }
    }

    if (reduceMotion) {
      draw(99999);
      cleanups.push(() => ro.disconnect());
      return;
    }

    let formStart = 0, running = false, rafId = 0;
    function frame(now) {
      if (!formStart) formStart = now;
      draw(now - formStart);
      if (running) rafId = raf(frame);
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!running) { running = true; rafId = raf(frame); } }
      else { running = false; cancelAnimationFrame(rafId); }
    }, { threshold: 0 });
    io.observe(sectionEl);
    cleanups.push(() => { running = false; cancelAnimationFrame(rafId); io.disconnect(); ro.disconnect(); });
  };

  // ════════════════════════════════════════════════════
  // Dieptewereld — bioluminescente soorten op hun diepte
  // ════════════════════════════════════════════════════
  chapterInit['ch-depth'] = () => {
    const stage = $('#depthStage');
    if (!stage) return;
    const detail = $('#depthDetail');
    const list = visData.filter(v => v.count > 0).map(v => ({ ...v }));
    if (!list.length) { stage.insertAdjacentHTML('afterbegin', '<p class="stage-fallback">Geen soortdata.</p>'); return; }
    const totalC = d3.sum(list, d => d.count);

    const W = 900, H = 620;
    const svg = d3.select(stage).append('svg').attr('class', 'depth-svg').attr('viewBox', `0 0 ${W} ${H}`);
    const defs = svg.append('defs');
    const ray = defs.append('linearGradient').attr('id', 'depthRay').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1);
    ray.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(30,172,176,0.20)');
    ray.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(30,172,176,0)');

    // lichtbundels van boven
    const rays = svg.append('g').attr('class', 'depth-rays');
    [[-0.05, 90], [0.28, 130], [0.58, 80], [0.82, 150]].forEach(([fx, w], i) => {
      const x = fx * W;
      rays.append('polygon')
        .attr('points', `${x},0 ${x + w},0 ${x + w * 2.2},${H} ${x + w * 1.2},${H}`)
        .attr('fill', 'url(#depthRay)')
        .style('animation', `depth-ray-sway ${9 + i * 2}s ease-in-out ${i * 1.4}s infinite`);
    });

    // dieptebanden
    const bands = [
      { key: 'top', label: 'Oppervlak', y: H * 0.22 },
      { key: 'mid', label: 'Midden', y: H * 0.52 },
      { key: 'bodem', label: 'Bodem', y: H * 0.82 },
    ];
    bands.forEach(b => {
      svg.append('line').attr('x1', 74).attr('x2', W - 18).attr('y1', b.y).attr('y2', b.y)
        .attr('stroke', 'rgba(253,247,239,0.10)').attr('stroke-dasharray', '2 7');
      svg.append('text').attr('x', 16).attr('y', b.y + 4).attr('font-family', FONT_BODY)
        .attr('font-size', 12).attr('font-weight', 700).attr('fill', C.off).attr('opacity', 0.45).text(b.label);
    });

    // marine snow
    const snow = d3.range(46).map(() => ({ x: rng() * W, y: rng() * H, r: 0.6 + rng() * 1.6, sp: 7 + rng() * 17, sw: rng() * Math.PI * 2 }));
    const snowSel = svg.append('g').attr('class', 'depth-snow').selectAll('circle').data(snow).join('circle')
      .attr('r', d => d.r).attr('cx', d => d.x).attr('cy', d => d.y).attr('fill', 'rgba(253,247,239,0.5)');

    // soorten per band, horizontaal verdeeld
    const byBand = { top: [], mid: [], bodem: [] };
    list.forEach(v => { (byBand[v.diepte] || byBand.mid).push(v); });
    const maxCount = d3.max(list, d => d.count);
    const wScale = d3.scaleSqrt().domain([0, maxCount]).range([44, 150]);
    const nodes = [];
    bands.forEach(b => {
      const arr = byBand[b.key], n = arr.length || 1;
      arr.forEach((v, i) => {
        const w = wScale(v.count);
        const tx = 120 + ((i + 0.5) / n) * (W - 190);
        nodes.push({ ...v, w, h: w * 0.46, tx, ty: b.y, x: tx + (rng() - 0.5) * 60, y: b.y + (rng() - 0.5) * 50, bandLabel: b.label });
      });
    });

    const fishG = svg.append('g').attr('class', 'depth-fishes');
    const node = fishG.selectAll('g.depth-fish').data(nodes).join('g')
      .attr('class', 'depth-fish').attr('tabindex', 0).attr('role', 'img')
      .attr('aria-label', d => `${d.naam}: ${fmt(d.count)} waarnemingen, diepte ${d.bandLabel}`)
      .style('color', d => d.color);
    node.append('ellipse').attr('class', 'depth-glow').attr('rx', d => d.w * 0.72).attr('ry', d => d.h * 1.4)
      .attr('fill', d => d.color).style('animation-delay', () => `${rng() * 4}s`);
    node.append('use').attr('class', 'depth-fish-body')
      .attr('href', d => '#' + fishSymbolId(d.shape))
      .attr('x', d => -d.w / 2).attr('y', d => -d.h / 2).attr('width', d => d.w).attr('height', d => d.h);
    node.append('text').attr('class', 'depth-label').attr('text-anchor', 'middle')
      .attr('y', d => d.h / 2 + 16).attr('font-family', FONT_BODY).attr('font-size', 12).attr('font-weight', 700)
      .attr('fill', C.off).text(d => d.naam);

    function activate(d) {
      svg.classed('has-focus', true);
      node.classed('active', n => n === d);
      if (detail) {
        detail.innerHTML = `<strong>${d.naam}</strong>${fmt(d.count)} waarnemingen · ${(d.count / totalC * 100).toFixed(1)}%<br/>Diepte: ${d.bandLabel}<br/>Gewicht: ~${d.weight} kg`;
        detail.classList.add('visible');
      }
    }
    function deactivate() { svg.classed('has-focus', false); node.classed('active', false); if (detail) detail.classList.remove('visible'); }
    node.on('mouseenter mousemove', (e, d) => { activate(d); showTooltip(`<strong>${d.naam}</strong>${fmt(d.count)} waarnemingen`, e.clientX, e.clientY); })
      .on('mouseleave', () => { deactivate(); hideTooltip(); })
      .on('focus', (e, d) => { activate(d); const bb = e.currentTarget.getBoundingClientRect(); showTooltip(`<strong>${d.naam}</strong>${fmt(d.count)} waarnemingen`, bb.left + bb.width / 2, bb.top); })
      .on('blur', () => { deactivate(); hideTooltip(); });

    const place = () => node.attr('transform', d => `translate(${d.x},${d.y})`);
    const sim = d3.forceSimulation(nodes)
      .force('x', d3.forceX(d => d.tx).strength(0.18))
      .force('y', d3.forceY(d => d.ty).strength(0.32))
      .force('collide', d3.forceCollide(d => Math.max(d.w * 0.55, 28)).strength(0.85))
      .on('tick', place);

    if (reduceMotion) {
      sim.stop(); for (let i = 0; i < 240; i++) sim.tick(); place();
      cleanups.push(() => sim.stop());
      return;
    }

    let ended = false;
    sim.on('end', () => { ended = true; nodes.forEach(d => { d.bx = d.x; d.by = d.y; d.ph = rng() * Math.PI * 2; }); });
    let running = false, rafD = 0, prev = 0; const t0 = performance.now();
    function loop(now) {
      const dt = Math.min(0.05, (now - (prev || now)) / 1000); prev = now;
      snow.forEach(p => { p.y += p.sp * dt; p.sw += dt; p.x += Math.sin(p.sw) * 0.25; if (p.y > H + 4) { p.y = -4; p.x = rng() * W; } });
      snowSel.attr('cx', p => p.x).attr('cy', p => p.y);
      if (ended) { const t = (now - t0) / 1000; nodes.forEach(d => { d.x = d.bx + Math.sin(t * 0.5 + d.ph) * 5; d.y = d.by + Math.cos(t * 0.42 + d.ph) * 5; }); place(); }
      if (running) rafD = raf(loop);
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!running) { running = true; rafD = raf(loop); } }
      else { running = false; cancelAnimationFrame(rafD); }
    }, { threshold: 0.15 });
    io.observe(stage);
    cleanups.push(() => { running = false; cancelAnimationFrame(rafD); io.disconnect(); sim.stop(); });
  };

  // ── Data laden & (her)tekenen ─────────────────────
  const STAGES = ['#heroStage', '#ringStage', '#worldStage', '#funnelStage', '#shoalStage', '#radarStage',
    '#tideStage', '#peaksStage', '#fanaticsStage', '#langStage', '#globeStage', '#pondStage',
    '#weekdayStage', '#screensStage', '#aquariumStage', '#netStage', '#depthStage'];
  let currentPeriod = 'maand';

  // Bouwt nep-jaardata uit de maand-snapshot — vermenigvuldigt tellers
  // en plakt 365 dagen aan elkaar met een ruwe seizoensgolf.
  function synthesizeYear(live) {
    const SCALE = 12;
    const DAYS = 365;
    const scaleNum = v => (typeof v === 'number' ? Math.round(v * SCALE) : v);
    const scaleObj = obj => {
      if (!obj) return;
      Object.keys(obj).forEach(k => { obj[k] = scaleNum(obj[k]); });
    };

    scaleObj(live.species);
    if (typeof live.totalUploads === 'number') live.totalUploads = scaleNum(live.totalUploads);
    if (typeof live.pondTotal === 'number')    live.pondTotal    = scaleNum(live.pondTotal);

    if (live.funnel) {
      ['uploadedFish', 'dismissedUploading', 'total'].forEach(k => {
        if (typeof live.funnel[k] === 'number') live.funnel[k] = scaleNum(live.funnel[k]);
      });
    }

    if (live.geo) {
      if (typeof live.geo.total === 'number') live.geo.total = scaleNum(live.geo.total);
      if (live.geo.countries && typeof live.geo.countries === 'object') {
        Object.keys(live.geo.countries).forEach(k => {
          const v = live.geo.countries[k];
          if (typeof v === 'number') live.geo.countries[k] = scaleNum(v);
          else if (v && typeof v === 'object' && typeof v.n === 'number') v.n = scaleNum(v.n);
        });
      }
    }

    if (live.tech) ['device', 'browser', 'os'].forEach(cat => scaleObj(live.tech[cat]));

    if (Array.isArray(live.languages)) {
      live.languages.forEach(l => { if (typeof l.n === 'number') l.n = scaleNum(l.n); });
    }
    if (Array.isArray(live.screens)) {
      live.screens.forEach(s => { if (typeof s.n === 'number') s.n = scaleNum(s.n); });
    }
    if (live.orientation) {
      ['portrait', 'landscape', 'square', 'total', 'unique'].forEach(k => {
        if (typeof live.orientation[k] === 'number') live.orientation[k] = scaleNum(live.orientation[k]);
      });
    }
    if (live.sessions) {
      ['totalSessions', 'ringers', 'totalRings'].forEach(k => {
        if (typeof live.sessions[k] === 'number') live.sessions[k] = scaleNum(live.sessions[k]);
      });
      if (Array.isArray(live.sessions.hist)) {
        live.sessions.hist = live.sessions.hist.map(v => scaleNum(v));
      }
    }

    // Rek de uurpatronen uit tot 365 dagen met een zachte seizoensgolf
    const srcHours = live.weekHours || [];
    const srcDays = Math.max(1, Math.floor(srcHours.length / 24));
    const yearHours = new Array(DAYS * 24).fill(0);
    for (let d = 0; d < DAYS; d++) {
      // Piek rond zomerstart, dal rond half december
      const season = 0.65 + 0.55 * Math.sin(((d - 80) / DAYS) * Math.PI * 2);
      const jitter = 0.82 + Math.random() * 0.36;
      const factor = season * jitter;
      for (let h = 0; h < 24; h++) {
        const base = srcHours[(d % srcDays) * 24 + h] || 0;
        yearHours[d * 24 + h] = Math.round(base * factor);
      }
    }
    live.weekHours = yearHours;

    // Daglabels voor een vol jaar — start op 1 jun van vorig jaar
    const startDate = new Date(Date.UTC(2025, 5, 1));
    const dayKeys = [], dayLabels = [];
    for (let i = 0; i < DAYS; i++) {
      const dt = new Date(startDate.getTime() + i * 86400000);
      dayKeys.push(dt.toISOString().slice(0, 10));
      dayLabels.push(`${dt.getUTCDate()} ${MONTH_SHORT_NL[dt.getUTCMonth()]}`);
    }
    live.weekDays = dayKeys;
    live.weekDayLabels = dayLabels;

    // Daily afgeleid van de nieuwe uren — sleutels 1..365
    const daily = {};
    for (let d = 0; d < DAYS; d++) {
      let s = 0;
      for (let h = 0; h < 24; h++) s += yearHours[d * 24 + h];
      daily[d + 1] = s;
    }
    live.daily = daily;

    const endDate = new Date(startDate.getTime() + (DAYS - 1) * 86400000);
    const fmt = dt => `${dt.getUTCDate()} ${MONTH_SHORT_NL[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
    live.period = {
      start: dayKeys[0],
      end: dayKeys[DAYS - 1],
      label: `${fmt(startDate)} – ${fmt(endDate)}`,
    };

    return live;
  }

  async function loadData(url, transform) {
    const live = await fetch(url).then(r => r.json());
    if (transform) transform(live);
    visData.forEach(v => { v.count = 0; });
    Object.entries(live.species || {}).forEach(([naam, count]) => {
      const v = visData.find(d => d.naam === naam);
      if (v) v.count = count;
    });
    weekHours       = live.weekHours     || [];
    weekDayLabels   = live.weekDayLabels || [];
    weekDays        = live.weekDays      || [];
    periodLabel     = live.period?.label || '';
    geoData         = live.geo       || null;
    funnelData      = live.funnel    || null;
    techData        = live.tech      || null;
    dailyData       = live.daily     || null;
    sessionsData    = live.sessions  || null;
    pondWeekData    = live.pondWeek  || null;
    languagesData   = live.languages || null;
    screensData     = live.screens   || null;
    orientationData = live.orientation || null;
    TOTAL = (funnelData && funnelData.uploadedFish) || visData.reduce((s, v) => s + v.count, 0);
    visData.forEach(v => { v.monthly = generateMonthly(v.count); });
    visData.sort((a, b) => b.count - a.count);
  }

  function observeChapters() {
    sectionObserver.disconnect();
    $$('.chapter').forEach(c => sectionObserver.observe(c));
  }

  function clearChapters() {
    cleanups.forEach(fn => { try { fn(); } catch { /* noop */ } });
    cleanups.length = 0;
    rafs.forEach(id => cancelAnimationFrame(id));
    rafs.clear();
    $$('.chapter').forEach(c => { delete c.dataset.inited; });
    STAGES.forEach(sel => {
      const s = $(sel);
      if (s) s.querySelectorAll('svg, canvas, .pond-clock, .pond-counter, .aquarium-counter, .aquarium-rip').forEach(n => n.remove());
    });
    const rd = $('#radarDetail'); if (rd) rd.classList.remove('visible');
    const dd = $('#depthDetail'); if (dd) dd.classList.remove('visible');
  }

  async function setPeriod(period) {
    if (period === currentPeriod) return;
    currentPeriod = period;
    const sw = $('.data-switch'); if (sw) sw.classList.add('is-loading');
    $$('.data-switch__btn').forEach(b => {
      const on = b.dataset.period === period;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    clearChapters();
    const url = period === 'week' ? '/json/vis-data-week.json' : '/json/vis-data.json';
    const transform = period === 'jaar' ? synthesizeYear : null;
    try { await loadData(url, transform); }
    catch (e) { console.warn('dataset niet geladen', e); }
    if (sw) sw.classList.remove('is-loading');
    observeChapters();
  }

  // ════════════════════════════════════════════════════
  // Scroll-vis — een gids die slingerend de pagina af zwemt
  // ════════════════════════════════════════════════════
  function initSwimFish() {
    if (reduceMotion) return () => {};
    document.querySelectorAll('.swim-fish').forEach(n => n.remove()); // de-dupe bij hermount

    const host = document.createElement('div');
    host.className = 'swim-fish';
    host.setAttribute('aria-hidden', 'true');
    host.innerHTML = `
      <div class="swim-fish-rot">
        <svg viewBox="0 0 64 32">
          <defs>
            <linearGradient id="swimFishGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="${C.teal}"/>
              <stop offset="58%" stop-color="${C.bell}"/>
              <stop offset="100%" stop-color="${C.purple}"/>
            </linearGradient>
          </defs>
          <g fill="url(#swimFishGrad)">
            <path class="swim-fish-tail" d="M18 16 L2 5 L6 16 L2 27 Z"/>
            <ellipse cx="36" cy="16" rx="22" ry="10.5"/>
            <path d="M34 7 q7 -8 13 -3 q-5 3 -7 7 Z"/>
          </g>
          <circle cx="48" cy="13" r="2.1" fill="#01211c"/>
        </svg>
      </div>`;
    document.body.appendChild(host);
    const rotEl = host.querySelector('.swim-fish-rot');

    const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

    // Zoek alle grafiek-stages waaromheen de vis kan zwemmen (skipt de hero
    // omdat die zijn eigen grote vis heeft).
    function getStages() {
      return Array.from(document.querySelectorAll('.chapter:not(.chapter--hero)'))
        .map(ch => ch.querySelector('[class$="-stage"]') || ch.querySelector('[class*="-stage "]') || ch)
        .filter(Boolean);
    }

    let curX = window.innerWidth * 0.82, curY = window.innerHeight * 0.55;
    let lastDir = 1, lastTilt = 0;
    let initialized = false;
    let raf2 = 0;
    const t0 = performance.now();

    function tick(now) {
      const tt = (now - t0) / 1000;
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const viewCy = vh / 2;

      // Pak de stage die het dichtst bij het verticale midden zit
      let active = null, activeBox = null, bestDist = Infinity;
      getStages().forEach(s => {
        const r = s.getBoundingClientRect();
        if (r.height < 40 || r.bottom < 0 || r.top > vh) return;
        const sCy = r.top + r.height / 2;
        const d = Math.abs(sCy - viewCy);
        if (d < bestDist) { bestDist = d; active = s; activeBox = r; }
      });

      let targetX, targetY, tx, ty;
      if (active && activeBox) {
        const sCx = activeBox.left + activeBox.width / 2;
        const sCy = activeBox.top + activeBox.height / 2;
        // Ovaal net buiten de stage; idle-drift zorgt voor continue rondgang
        const radX = clamp(activeBox.width  / 2 + 70, 170, vw * 0.45);
        const radY = clamp(activeBox.height / 2 + 50, 130, vh * 0.45);

        // Hoek wordt gestuurd door scroll-positie binnen de chapter +
        // langzame drift, zodat de vis ook in rust blijft rondcirkelen.
        const ch = active.closest('.chapter') || active;
        const chR = ch.getBoundingClientRect();
        const span = chR.height + vh;
        const chT  = clamp((vh - chR.top) / span, 0, 1);
        const angle = chT * Math.PI * 2.6 + tt * 0.35;

        targetX = sCx + Math.cos(angle) * radX;
        targetY = sCy + Math.sin(angle) * radY;
        // Tangent voor tilt en kijkrichting
        tx = -Math.sin(angle) * radX;
        ty =  Math.cos(angle) * radY;
      } else {
        // Geen actieve stage: drijf rustig rechtsonder
        targetX = vw - 90 + Math.sin(tt * 0.6) * 30;
        targetY = vh - 110 + Math.sin(tt * 0.9) * 20;
        tx = Math.cos(tt * 0.6); ty = Math.sin(tt * 0.9);
      }

      // Veilig binnen viewport houden
      targetX = clamp(targetX, 40, vw - 40);
      targetY = clamp(targetY, 60, vh - 60);

      // Vloeiend naar doel toe lerpen — voorkomt schokjes bij stage-wissel
      const k = initialized ? 0.09 : 1;
      curX += (targetX - curX) * k;
      curY += (targetY - curY) * k;
      initialized = true;

      // Tilt + facing — met smoothing zodat het niet flikkert
      const tang = Math.atan2(ty, Math.abs(tx) + 1e-4) * 180 / Math.PI;
      const dir = tx < -0.05 ? -1 : tx > 0.05 ? 1 : lastDir;
      lastDir = dir;
      lastTilt += (clamp(tang, -22, 22) - lastTilt) * 0.18;

      // Idle bob bovenop, voor 'levend' gevoel
      const bobX = Math.sin(tt * 1.3) * 2.6;
      const bobY = Math.sin(tt * 2.1 + 0.4) * 3.2;
      const yaw  = Math.sin(tt * 1.65 + 0.9) * 3.5;

      gsap.set(host,  { x: curX + bobX, y: curY + bobY, xPercent: -50, yPercent: -50, scaleX: dir });
      gsap.set(rotEl, { rotation: lastTilt + yaw });

      raf2 = requestAnimationFrame(tick);
    }
    raf2 = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf2);
      host.remove();
    };
  }

  // ── Boot ──────────────────────────────────────────
  async function boot() {
    try { await loadData('/json/vis-data.json'); }
    catch (e) { console.warn('vis-data.json niet geladen', e); }
    try { worldTopo = await fetch('/json/world-110m.json').then(r => r.json()); }
    catch (e) { console.warn('world-110m.json niet geladen', e); }
    $$('.data-switch__btn').forEach(b => b.addEventListener('click', () => setPeriod(b.dataset.period)));
    observeChapters();
    // Na de awaits aanmaken: overleeft zo de StrictMode mount→unmount→remount
    // (anders ruimt de unmount-cleanup de vis op vóór hij opnieuw gemaakt wordt).
    swimTeardown = initSwimFish();
  }

  boot();

  return () => {
    sectionObserver.disconnect();
    cleanups.forEach(fn => { try { fn(); } catch { /* noop */ } });
    rafs.forEach(id => cancelAnimationFrame(id));
    if (swimTeardown) swimTeardown();
  };
}
