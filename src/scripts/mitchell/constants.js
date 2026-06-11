// ============================================================================
// constants.js — vaste data & instellingen die door meerdere charts gedeeld
// worden: kleuren, fonts, maandnamen, de vissoorten, landcoördinaten,
// browserfamilies en begroetingen per taal. Puur data, geen logica.
// ============================================================================

// Stijl-tokens (hex-spiegels van visdeurbel-tokens.css). We spiegelen ze hier
// in JS omdat de charts (canvas/SVG) niet bij de CSS-variabelen kunnen.
export const C = {
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

export const FONT_DISPLAY = "'Bricolage Grotesque', system-ui, sans-serif";
export const FONT_BODY    = "'PT Sans', system-ui, sans-serif";

export const MONTH_FULL     = ['Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November'];
export const MONTH_SHORT_NL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
export const MONTH_LONG_NL  = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

export const UTRECHT = [5.117, 52.09];

// Vissoorten — basis voor radar, aquarium en net. `count` start op 0 en wordt
// uit de geladen data gevuld (dataLoad.js). De overige velden bepalen kleur,
// gewicht (voor biomassa), silhouet-vorm en waar de vis "hoort" te zwemmen.
export const visData = [
  { naam: 'Blankvoorn', count: 0, color: C.teal,   weight: 0.3,  length: 25,  shape: 'round', diepte: 'mid',   habitat: 'open' },
  { naam: 'Brasem',     count: 0, color: '#34b3a0', weight: 1.8,  length: 45,  shape: 'round', diepte: 'bodem', habitat: 'zand' },
  { naam: 'Baars',      count: 0, color: '#4a9ab8', weight: 0.6,  length: 30,  shape: 'baars', diepte: 'mid',   habitat: 'open' },
  { naam: 'Snoekbaars', count: 0, color: '#5b8fd6', weight: 2.4,  length: 65,  shape: 'pred',  diepte: 'mid',   habitat: 'open' },
  { naam: 'Paling',     count: 0, color: '#3a8aa8', weight: 0.5,  length: 65,  shape: 'long',  diepte: 'bodem', habitat: 'steen' },
  { naam: 'Kolblei',    count: 0, color: C.goldDeep,weight: 0.4,  length: 28,  shape: 'round', diepte: 'mid',   habitat: 'zand' },
  { naam: 'Alver',      count: 0, color: '#ffc94d', weight: 0.08, length: 12,  shape: 'tiny',  diepte: 'top',   habitat: 'oppervlak' },
  { naam: 'Ruisvoorn',  count: 0, color: '#5a8a3f', weight: 0.35, length: 26,  shape: 'round', diepte: 'top',   habitat: 'riet' },
  { naam: 'Snoek',      count: 0, color: C.pink,    weight: 3.2,  length: 80,  shape: 'pred',  diepte: 'mid',   habitat: 'riet' },
  { naam: 'Winde',      count: 0, color: '#c8a96e', weight: 0.8,  length: 38,  shape: 'baars', diepte: 'mid',   habitat: 'stroom' },
  { naam: 'Meerval',    count: 0, color: C.bell,    weight: 12.0, length: 120, shape: 'long',  diepte: 'bodem', habitat: 'steen' },
  { naam: 'Karper',     count: 0, color: '#a07850', weight: 2.5,  length: 55,  shape: 'round', diepte: 'bodem', habitat: 'zand' },
];

// Landcentroïden [lengtegraad, breedtegraad, naam] voor de bel-landen
export const COUNTRY_GEO = {
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

// Browserfamilies voor de apparaten-school
export const BROWSER_FAMILY = {
  chrome: 'google', crios: 'google', 'chromium-webview': 'google', 'edge-chromium': 'google',
  samsung: 'google', opera: 'google', miui: 'google', yandexbrowser: 'google', silk: 'google',
  ios: 'apple', safari: 'apple', 'ios-webview': 'apple', 'edge-ios': 'apple',
  firefox: 'firefox', fxios: 'firefox',
  instagram: 'social', facebook: 'social',
};
export const FAMILY = {
  google:  { color: C.teal,     label: 'Chrome-achtig' },
  apple:   { color: C.bell,     label: 'Safari / iOS' },
  firefox: { color: C.goldDeep, label: 'Firefox' },
  social:  { color: C.pink,     label: 'Social in-app' },
  other:   { color: C.greenMid, label: 'Overig' },
};
export const BROWSER_LABEL = {
  chrome: 'Chrome', crios: 'Chrome iOS', 'chromium-webview': 'Chrome WebView',
  'edge-chromium': 'Edge', samsung: 'Samsung', opera: 'Opera', firefox: 'Firefox',
  fxios: 'Firefox iOS', ios: 'Safari iOS', safari: 'Safari', 'ios-webview': 'iOS WebView',
  instagram: 'Instagram', facebook: 'Facebook', silk: 'Silk', 'edge-ios': 'Edge iOS',
  miui: 'MIUI', yandexbrowser: 'Yandex',
};

// Begroetingen per taal (primaire subtag)
export const GREETINGS = {
  en: ['Fish', 'Engels'],          pl: ['Ryba', 'Pools'],          de: ['Fisch', 'Duits'],
  nl: ['Vis', 'Nederlands'],       zh: ['鱼', 'Chinees'],          it: ['Pesce', 'Italiaans'],
  fr: ['Poisson', 'Frans'],        pt: ['Peixe', 'Portugees'],     es: ['Pez', 'Spaans'],
  sv: ['Fisk', 'Zweeds'],          ru: ['Рыба', 'Russisch'],       he: ['דג', 'Hebreeuws'],
  cs: ['Ryba', 'Tsjechisch'],      nb: ['Fisk', 'Noors'],          no: ['Fisk', 'Noors'],
  da: ['Fisk', 'Deens'],           uk: ['Риба', 'Oekraïens'],       fi: ['Kala', 'Fins'],
  tr: ['Balık', 'Turks'],          el: ['Ψάρι', 'Grieks'],          ja: ['魚', 'Japans'],
  ko: ['물고기', 'Koreaans'],       ar: ['سمك', 'Arabisch'],         hi: ['मछली', 'Hindi'],
  th: ['ปลา', 'Thais'],            vi: ['Cá', 'Vietnamees'],       ro: ['Pește', 'Roemeens'],
  hu: ['Hal', 'Hongaars'],         sk: ['Ryba', 'Slowaaks'],       hr: ['Riba', 'Kroatisch'],
  sl: ['Riba', 'Sloveens'],        bg: ['Риба', 'Bulgaars'],        id: ['Ikan', 'Indonesisch'],
  ms: ['Ikan', 'Maleis'],          lt: ['Žuvis', 'Litouws'],       lv: ['Zivs', 'Lets'],
  et: ['Kala', 'Ests'],            ca: ['Peix', 'Catalaans'],      is: ['Fiskur', 'IJslands'],
};
