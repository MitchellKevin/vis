//  URLs 
export const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export const DATA_URLS = {
  maand: '/json/event-maand.json',
  week:  '/json/event-week.json',
};

//  Globe geometry 
export const PAD = 60;
export const W   = 370 + PAD * 2;
export const H   = 340 + PAD * 2;
export const R   = 145;   // default globe radius

export const UTRECHT = [5.1214, 52.0908];

//  Map mode definitions 
export const MAP_MODES = [
  { key: 'choropleth_flows', label: 'Bezoeken+Lijnen' },
  { key: 'fish',             label: 'Vis soort'       },
  { key: 'time',             label: 'Tijdstip'        },
];

//  Design colours (all from visdeurbel-tokens.css brand palette) 
export const C = {
  land:      '#c8ebe6',  // tint of --color-green-dark (light)
  landHover: '#a8d9d4',  // tint of --color-teal (mid)
  water:     '#c0e8f5',  // tint of --color-teal (blue-ish)
  waterDeep: '#1eacb0',  // --color-teal
  green:     '#1eacb0',  // --color-teal
  greenDark: '#01463c',  // --color-green-dark
  coral:     '#ff80b9',  // --color-pink
  stroke:    'rgba(1,70,60,0.2)',   // --color-green-dark @ 20%
  graticule: 'rgba(1,70,60,0.07)', // --color-green-dark @ 7%
};

// Fish species  all from brand palette
export const FISH_COLORS = {
  Baars:      '#1eacb0',  // --color-teal
  Brasem:     '#f0af00',  // --color-gold
  Karper:     '#9b74ff',  // --color-purple-bell
  Snoekbaars: '#ff80b9',  // --color-pink
  Paling:     '#01463c',  // --color-green-dark
  unknown:    '#c0a8ff',  // --color-purple
};


//  Lookup tables 
export const UNKNOWN_VALS = ['unknown', 'Unknown', 'onbekend', 'Onbekend', 'Overig'];

export const ALPHA2_TO_NUMERIC = {
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

export const COUNTRY_NAMES = {
  US:'Verenigde Staten', CA:'Canada',           GB:'Verenigd Koninkrijk', DE:'Duitsland',
  FR:'Frankrijk',        NL:'Nederland',         AU:'Australië',           JP:'Japan',
  CN:'China',            IN:'India',             BR:'Brazilië',            MX:'Mexico',
  IT:'Italië',           ES:'Spanje',            KR:'Zuid-Korea',          RU:'Rusland',
  SE:'Zweden',           NO:'Noorwegen',         DK:'Denemarken',          FI:'Finland',
  BE:'België',           CH:'Zwitserland',       AT:'Oostenrijk',          PL:'Polen',
  CZ:'Tsjechië',         PT:'Portugal',          GR:'Griekenland',         HU:'Hongarije',
  ZA:'Zuid-Afrika',      NG:'Nigeria',           EG:'Egypte',              AR:'Argentinië',
  CL:'Chili',            CO:'Colombia',          PE:'Peru',                VE:'Venezuela',
  ID:'Indonesië',        MY:'Maleisië',          SG:'Singapore',           TH:'Thailand',
  PH:'Filipijnen',       VN:'Vietnam',           PK:'Pakistan',            BD:'Bangladesh',
  TR:'Turkije',          IR:'Iran',              IQ:'Irak',                SA:'Saoedi-Arabië',
  IL:'Israël',           AE:'VAE',               TW:'Taiwan',              HK:'Hongkong',
  NZ:'Nieuw-Zeeland',
};

export const CENTROIDS = {
  US:[-96,38],  CA:[-96,57],  GB:[-3,54],   DE:[10,51],   FR:[2,46],    NL:[5.3,52.3],
  AU:[134,-25], JP:[138,36],  CN:[105,35],  IN:[78,22],   BR:[-55,-10], MX:[-102,24],
  IT:[12,42],   ES:[-4,40],   KR:[128,37],  RU:[100,60],  SE:[18,62],   NO:[15,65],
  DK:[10,56],   FI:[26,64],   BE:[4.5,50.5],CH:[8.2,46.8],AT:[14,47],  PL:[20,52],
  CZ:[15.5,49.8],PT:[-8,39.5],GR:[22,39],  HU:[19,47],   ZA:[25,-29],  NG:[8,10],
  EG:[30,27],   AR:[-65,-34], CL:[-71,-33], CO:[-74,4],   PE:[-76,-10], ID:[118,-2],
  MY:[110,4],   SG:[104,1.4], TH:[101,15],  PH:[122,13],  VN:[106,16],  PK:[70,30],
  BD:[90,24],   TR:[35,39],   SA:[45,25],   AE:[54,24],   TW:[121,24],  NZ:[172,-41],
  IL:[35,31],   IR:[53,33],   IQ:[44,33],   VE:[-65,8],
};