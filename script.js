/* ─── DATA ───────────────────────────────────────────────────── */

const DAYS   = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const MONTHS = ['Jan','Feb','Mrt','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];

// All 12 species from visdeurbel.nl
const SPECIES = [
  { name:'Karper',    emoji:'🐟', count:3241 },
  { name:'Snoekbaars',emoji:'🐠', count:2847 },
  { name:'Blankvoorn',emoji:'🐡', count:2103 },
  { name:'Baars',     emoji:'🐟', count:1654 },
  { name:'Brasem',    emoji:'🐠', count:1320 },
  { name:'Snoek',     emoji:'🐟', count:1041 },
  { name:'Winde',     emoji:'🐡', count:876  },
  { name:'Paling',    emoji:'🐟', count:621  },
  { name:'Ruisvoorn', emoji:'🐠', count:498  },
  { name:'Kolblei',   emoji:'🐟', count:445  },
  { name:'Alver',     emoji:'🐡', count:312  },
  { name:'Meerval',   emoji:'🐟', count:187  },
];

const migrationData = {
  beltjes:    [120, 95,  210, 680, 920, 540, 430, 460, 810, 730, 310, 140],
  doorgangen: [108, 84,  190, 624, 852, 491, 390, 415, 748, 672, 282, 126],
};

// Average minutes until first fish sighting, per hour (0–23)
const wachttijdUur = [
  42, 48, 52, 55, 44, 28, 18, 11, 9, 10, 13, 15,
  14, 13, 12, 11, 9,  7,  6,  8, 12, 18, 26, 35,
];

// Top cities watching the stream
const CITIES = [
  { name:'Utrecht',     count:4821 },
  { name:'Amsterdam',   count:3102 },
  { name:'Rotterdam',   count:2543 },
  { name:'Den Haag',    count:1876 },
  { name:'Leiden',      count:1243 },
  { name:'Gouda',       count:987  },
  { name:'Arnhem',      count:823  },
  { name:'Nijmegen',    count:756  },
  { name:'Groningen',   count:612  },
  { name:'Breda',       count:489  },
];

// Countries
const countriesData = {
  labels: ['🇳🇱 Nederland','🇧🇪 België','🇩🇪 Duitsland','🇬🇧 Groot-Brittannië','🌍 Overig'],
  values: [78, 8, 6, 3, 5],
};


/* ─── HELPERS ────────────────────────────────────────────────── */

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function interpolateColor(t) {
  const stops = [[4,22,36],[13,61,92],[26,123,160],[79,195,247],[0,229,255]];
  const sc = t * (stops.length - 1);
  const i  = Math.min(Math.floor(sc), stops.length - 2);
  const f  = sc - i;
  const [r1,g1,b1] = stops[i];
  const [r2,g2,b2] = stops[i+1];
  return `rgb(${Math.round(r1+f*(r2-r1))},${Math.round(g1+f*(g2-g1))},${Math.round(b1+f*(b2-b1))})`;
}

const TOOLTIP_DEFAULTS = {
  backgroundColor: '#061e30',
  borderColor: 'rgba(0,229,255,.25)',
  borderWidth: 1,
  titleColor: '#cce8f4',
  bodyColor: '#5fa8c0',
  padding: 12,
};

/* ─── 1. HEADER FISH CANVAS ──────────────────────────────────── */

function initFishCanvas() {
  const canvas = document.getElementById('fishCanvas');
  const ctx    = canvas.getContext('2d');
  const rng    = seeded(7);

  function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener('resize', resize);

  const fishes = Array.from({ length: 22 }, (_, i) => ({
    x:        rng() * canvas.width,
    y:        30 + rng() * (canvas.height - 80),
    speed:    0.3 + rng() * 0.9,
    size:     i < 14 ? 7 + rng() * 10 : 16 + rng() * 14,
    alpha:    0.2 + rng() * 0.55,
    wiggle:   rng() * Math.PI * 2,
    wAmp:     1.5 + rng() * 3,
    wSpd:     0.018 + rng() * 0.025,
    dir:      rng() > 0.3 ? 1 : -1,
    color:    rng() > 0.5 ? '#4fc3f7' : '#64ffda',
  }));

  const particles = Array.from({ length: 40 }, () => ({
    x: rng() * 1200, y: rng() * 300,
    r: 0.8 + rng() * 1.5, alpha: 0.05 + rng() * 0.15, speed: 0.08 + rng() * 0.15,
  }));

  function drawFish(x, y, size, alpha, dir, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur  = 8;
    if (dir === -1) { ctx.translate(x, y); ctx.scale(-1,1); ctx.translate(-x,-y); }
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, y, size, size*.42, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x-size*.9,y); ctx.lineTo(x-size*1.7,y-size*.55); ctx.lineTo(x-size*1.7,y+size*.55); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x-size*.1,y-size*.42); ctx.quadraticCurveTo(x+size*.2,y-size*.85,x+size*.5,y-size*.42); ctx.closePath(); ctx.globalAlpha=alpha*.7; ctx.fill();
    ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.globalAlpha=alpha;
    ctx.beginPath(); ctx.arc(x+size*.5,y-size*.08,size*.13,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#001a2e';
    ctx.beginPath(); ctx.arc(x+size*.52,y-size*.08,size*.06,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  (function animate() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      p.x += p.speed;
      if (p.x > canvas.width+5) p.x = -5;
      ctx.save(); ctx.globalAlpha=p.alpha; ctx.fillStyle='#4fc3f7';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.restore();
    });
    fishes.forEach(f => {
      f.wiggle += f.wSpd; f.x += f.speed * f.dir;
      if (f.dir===1  && f.x > canvas.width+40)  { f.x=-40; f.y=30+Math.random()*(canvas.height-80); }
      if (f.dir===-1 && f.x < -40)               { f.x=canvas.width+40; f.y=30+Math.random()*(canvas.height-80); }
      drawFish(f.x, f.y+Math.sin(f.wiggle)*f.wAmp, f.size, f.alpha, f.dir, f.color);
    });
    requestAnimationFrame(animate);
  })();
}

/* ─── 2. BUBBLES ─────────────────────────────────────────────── */

function spawnBubbles() {
  const container = document.getElementById('bubbles');
  [4,6,8,10,14,5,7,12,9,6,11,5,8,7,10,13,6,9].forEach((size, i) => {
    const b = document.createElement('div');
    b.className = 'bubble';
    b.style.cssText = `width:${size}px;height:${size}px;left:${3+Math.random()*94}%;animation-duration:${8+Math.random()*14}s;animation-delay:${Math.random()*12}s;--drift:${(Math.random()-.5)*60}px`;
    container.appendChild(b);
  });
}

/* ─── 3. COUNTERS ────────────────────────────────────────────── */

function animateCounters() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const start  = performance.now();
    (function tick(now) {
      const p = Math.min((now-start)/2000,1);
      el.textContent = Math.round((1-Math.pow(1-p,4))*target).toLocaleString('nl-NL');
      if (p<1) requestAnimationFrame(tick);
    })(start);
  });
}

/* ─── 4. RANKING ─────────────────────────────────────────────── */

function buildRanking() {
  const list   = document.getElementById('rankingList');
  const maxVal = SPECIES[0].count;

  SPECIES.forEach(({ name, emoji, count }, i) => {
    const pct   = (count / maxVal * 100).toFixed(1);
    const delay = (i * 0.06).toFixed(2);
    const posClass = i===0 ? 'gold' : i===1 ? 'silver' : i===2 ? 'bronze' : '';

    const el = document.createElement('div');
    el.className = 'rank-item';
    el.innerHTML = `
      <span class="rank-pos ${posClass}">${i+1}</span>
      <span class="rank-emoji">${emoji}</span>
      <span class="rank-name">${name}</span>
      <div class="rank-track"><div class="rank-fill" style="--w:${pct}%;--delay:${delay}s"></div></div>
      <span class="rank-count">${count.toLocaleString('nl-NL')}</span>
    `;
    list.appendChild(el);
  });
}

/* ─── 5. HEATMAP (7 rows × 24 cols) ─────────────────────────── */

function buildHeatmap() {
  const rng  = seeded(42);
  const data = DAYS.map((_, d) => {
    const weekend = d >= 5;
    return Array.from({ length: 24 }, (_, h) => {
      let v = 0;
      if      (h>=6  && h<=9)  v = 55 + rng()*40;
      else if (h>=10 && h<=16) v = 35 + rng()*30;
      else if (h>=17 && h<=20) v = 65 + rng()*35;
      else                      v =  2 + rng()*12;
      if (weekend) v *= 1.4;
      return Math.round(v);
    });
  });

  const maxVal = Math.max(...data.flat());
  const grid   = document.getElementById('heatmapGrid');
  const yEl    = document.getElementById('heatmapY');
  const xEl    = document.getElementById('heatmapX');

  // Grid: row-major (day = row, hour = col)
  data.forEach((dayVals, d) => {
    dayVals.forEach((val, h) => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.style.backgroundColor = interpolateColor(val / maxVal);
      cell.dataset.tip = `${DAYS[d]} ${String(h).padStart(2,'0')}:00 — ${val}×`;
      grid.appendChild(cell);
    });
  });

  // Y-labels (day names)
  DAYS.forEach(d => {
    const el = document.createElement('div');
    el.textContent = d;
    yEl.appendChild(el);
  });

  // X-labels (hours, every 3)
  for (let h = 0; h < 24; h++) {
    const el = document.createElement('div');
    el.textContent = h % 3 === 0 ? `${String(h).padStart(2,'0')}` : '';
    xEl.appendChild(el);
  }
}

/* ─── 6. MIGRATIE CHART ──────────────────────────────────────── */

function buildMigrationChart() {
  new Chart(document.getElementById('migrationChart'), {
    type: 'line',
    data: {
      labels: MONTHS,
      datasets: [
        {
          label: '🔔 Beltjes gerinkeld',
          data: migrationData.beltjes,
          borderColor: '#00e5ff',
          backgroundColor: 'rgba(0,229,255,.10)',
          borderWidth: 2.5, fill: true, tension: .45,
          pointBackgroundColor: '#00e5ff', pointRadius: 4, pointHoverRadius: 8,
        },
        {
          label: '🐟 Vissen doorgelaten',
          data: migrationData.doorgangen,
          borderColor: '#64ffda',
          backgroundColor: 'rgba(100,255,218,.06)',
          borderWidth: 2, borderDash: [6,4], fill: true, tension: .45,
          pointBackgroundColor: '#64ffda', pointRadius: 3, pointHoverRadius: 7,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: { labels: { color:'#5fa8c0', font:{size:12}, boxWidth:14, padding:16 } },
        tooltip: TOOLTIP_DEFAULTS,
      },
      scales: {
        x: { ticks:{color:'#5fa8c0',font:{size:11}}, grid:{color:'rgba(0,229,255,.05)'} },
        y: { ticks:{color:'#5fa8c0',font:{size:11}}, grid:{color:'rgba(0,229,255,.05)'},
             title:{display:true,text:'Aantal',color:'#5fa8c0',font:{size:11}} },
      },
    },
  });
}

/* ─── 8. WACHTTIJD PER UUR (mini bar chart) ─────────────────── */

function buildWachttijdBars() {
  const bars = document.getElementById('wtBars');
  const xEl  = document.getElementById('wtX');
  const yEl  = document.getElementById('wtY');
  const maxVal = Math.max(...wachttijdUur);
  const chartH = 80;

  wachttijdUur.forEach((val, h) => {
    const barH     = Math.round((val / maxVal) * chartH);
    const delay    = (h * 0.025).toFixed(3);
    const col      = document.createElement('div');
    col.className  = 'wt-col';
    col.dataset.tip = `${String(h).padStart(2,'0')}:00 — gem. ${val} min`;
    col.innerHTML = `<div class="wt-bar" style="height:${barH}px;--h:${barH}px;--d:${delay}s"></div>`;
    bars.appendChild(col);
  });

  // X-labels every 3 hours
  for (let h = 0; h < 24; h++) {
    const span = document.createElement('span');
    span.textContent = h % 3 === 0 ? String(h).padStart(2,'0') : '';
    xEl.appendChild(span);
  }

  // Y-labels: 0, half, max
  ['0', Math.round(maxVal/2)+'m', maxVal+'m'].reverse().forEach(t => {
    const d = document.createElement('div');
    d.textContent = t;
    yEl.appendChild(d);
  });
}

/* ─── 9b. CITY RANKING ───────────────────────────────────────── */

function buildCityRanking() {
  const list   = document.getElementById('cityRanking');
  const maxVal = CITIES[0].count;

  CITIES.forEach(({ name, count }, i) => {
    const pct      = (count / maxVal * 100).toFixed(1);
    const delay    = (i * 0.07).toFixed(2);
    const posClass = i===0 ? 'gold' : i===1 ? 'silver' : i===2 ? 'bronze' : '';

    const el = document.createElement('div');
    el.className = 'city-item';
    el.innerHTML = `
      <span class="city-rank ${posClass}">${i+1}</span>
      <span class="city-pin">📍</span>
      <div class="city-info">
        <span class="city-name">${name}</span>
        <div class="city-track"><div class="city-fill" style="--w:${pct}%;--delay:${delay}s"></div></div>
      </div>
      <span class="city-count">${count.toLocaleString('nl-NL')}</span>
    `;
    list.appendChild(el);
  });
}

/* ─── 9c. COUNTRIES DONUT ────────────────────────────────────── */

function buildCountriesChart() {
  new Chart(document.getElementById('countriesChart'), {
    type: 'doughnut',
    data: {
      labels: countriesData.labels,
      datasets: [{
        data: countriesData.values,
        backgroundColor: ['#00e5ff','#64ffda','#ffab40','#ce93d8','#5fa8c0'],
        borderColor: '#061e30',
        borderWidth: 3,
        hoverOffset: 12,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position:'right', labels:{color:'#5fa8c0',font:{size:11},boxWidth:12,padding:12} },
        tooltip: {
          ...TOOLTIP_DEFAULTS,
          callbacks: { label: c => ` ${c.parsed}% van alle kijkers` },
        },
      },
    },
  });
}

/* ─── 9. SOORTEN DONUT ───────────────────────────────────────── */

function buildSpeciesChart() {
  new Chart(document.getElementById('speciesChart'), {
    type: 'doughnut',
    data: {
      labels: SPECIES.map(s => s.name),
      datasets: [{
        data: SPECIES.map(s => s.count),
        backgroundColor: [
          '#00e5ff','#4fc3f7','#64ffda','#1a7ba0','#0d5c8a','#26a69a',
          '#00838f','#006978','#004d6e','#00363a','#1de9b6','#80deea',
        ],
        borderColor: '#061e30',
        borderWidth: 3,
        hoverOffset: 12,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { position:'right', labels:{color:'#5fa8c0',font:{size:12},boxWidth:14,padding:14} },
        tooltip: {
          ...TOOLTIP_DEFAULTS,
          callbacks: { label: c => ` ${c.parsed.toLocaleString('nl-NL')} waarnemingen` },
        },
      },
    },
  });
}


/* ─── INIT ───────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  spawnBubbles();
  initFishCanvas();
  animateCounters();
  buildRanking();
  buildHeatmap();
  buildWachttijdBars();
  buildMigrationChart();
  buildCityRanking();
  buildCountriesChart();
  buildSpeciesChart();
});
