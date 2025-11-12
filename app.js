// Tabs
const tabs = document.querySelectorAll('.tab');
const views = {
  mapa: document.getElementById('view-mapa'),
  datos: document.getElementById('view-datos'),
  alertas: document.getElementById('view-alertas'),
};
tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    Object.values(views).forEach(v => v.hidden = true);
    const key = t.dataset.tab; views[key].hidden = false;
}));

// Simulated series
const days = 24;
function rand(min, max) { return Math.random() * (max - min) + min }
const sismos = Array.from({ length: days }, (_, i) => Math.max(0, Math.round(rand(0, 6) + Math.sin(i / 2) * 2)));
const lluvia = Array.from({ length: days }, (_, i) => Math.max(0, Math.round(rand(0, 30) + Math.sin(i / 3 + 1) * 12)));

// ====== Datos (dinámico): dataset + filtros + orden + paginación ======
const regiones = ['Costa', 'Sierra', 'Oriente', 'Insular']; // reutilizamos
function makeRecord(i) {
  const d = new Date(Date.now() - (i * 86400000));         // i días hacia atrás
  const fecha = d.toISOString().slice(0, 10);               // YYYY-MM-DD
  const region = regiones[i % regiones.length];
  const sismos = Math.max(0, Math.round(rand(0, 5) + (region === 'Costa' ? 1 : 0)));
  const lluvia = Math.round(rand(0, 150));
  const presion = Math.round(1000 + rand(-18, 18));
  const riesgo = +(10 + rand(-3, 6)).toFixed(1);            // %
  return { fecha, region, sismos, lluvia, presion, riesgo };
}

// Dataset sintético (120 días)
const records = Array.from({ length: 120 }, (_, i) => makeRecord(i));

let sortBy = 'fecha';
let sortDir = 'desc';
const PAGE = 12;
let page = 1;

// Helpers de filtros
function applyFilters() {
  const q = document.getElementById('fSearch')?.value.trim().toLowerCase() || '';
  const reg = document.getElementById('fRegion')?.value || 'all';
  const minRain = +document.getElementById('fMinRain')?.value || 0;
  const maxRain = +document.getElementById('fMaxRain')?.value || Infinity;
  const dStart = document.getElementById('fStart')?.value || '';
  const dEnd   = document.getElementById('fEnd')?.value || '';

  return records.filter(r => {
    const okRegion = reg === 'all' || r.region === reg;
    const okSearch = !q || (r.region.toLowerCase().includes(q) || r.fecha.includes(q));
    const okRain   = r.lluvia >= minRain && r.lluvia <= maxRain;
    const okDate   = (!dStart || r.fecha >= dStart) && (!dEnd || r.fecha <= dEnd);
    return okRegion && okSearch && okRain && okDate;
  });
}

function sortData(arr) {
  return arr.sort((a, b) => {
    const A = a[sortBy], B = b[sortBy];
    const cmp = (A > B) ? 1 : (A < B) ? -1 : 0;
    return (sortDir === 'asc') ? cmp : -cmp;
  });
}

function renderTable() {
    const filtered = sortData(applyFilters());
    const total = filtered.length;
    const start = (page - 1) * PAGE;
    const slice = filtered.slice(start, start + PAGE);

    document.getElementById('rows').innerHTML = slice.map(r => `
        <tr>
        <td style="padding:8px;border-bottom:1px solid #1f2937">${r.fecha}</td>
        <td style="padding:8px;border-bottom:1px solid #1f2937">${r.region}</td>
        <td style="padding:8px;border-bottom:1px solid #1f2937">${r.sismos}</td>
        <td style="padding:8px;border-bottom:1px solid #1f2937">${r.lluvia}</td>
        <td style="padding:8px;border-bottom:1px solid #1f2937">${r.presion}</td>
        <td style="padding:8px;border-bottom:1px solid #1f2937">${r.riesgo}%</td>
        </tr>
    `).join('');

    const countEl = document.getElementById('count');
    if (countEl) countEl.textContent = total
        ? `${start + 1}-${Math.min(start + PAGE, total)} de ${total}`
        : `0 de 0`;

    const prev = document.getElementById('btnPrev');
    const next = document.getElementById('btnNext');
    if (prev) prev.disabled = page === 1;
    if (next) next.disabled = start + PAGE >= total;
    }

    ['fSearch','fRegion','fMinRain','fMaxRain','fStart','fEnd'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { page = 1; renderTable(); });
    });

    const prevBtn = document.getElementById('btnPrev');
    const nextBtn = document.getElementById('btnNext');
    if (prevBtn) prevBtn.addEventListener('click', () => { if (page > 1) { page--; renderTable(); } });
    if (nextBtn) nextBtn.addEventListener('click', () => { page++; renderTable(); });

    document.querySelectorAll('[data-sort]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (sortBy === key) sortDir = (sortDir === 'asc') ? 'desc' : 'asc';
        else { sortBy = key; sortDir = 'asc'; }
        page = 1; renderTable();
    });
});

// Primer pintado
renderTable();

// Alerts
const alertsEl = document.getElementById('alerts');

function renderAlerts() {
    // asegúrate de aplicar la clase a la lista
    alertsEl.classList.add('alert-list');

    alertsEl.innerHTML = `
        <li class="alert-item">
        <strong>Pichincha (Quito)</strong> — Riesgo alto — magnitud 6.3.
        </li>
        <li class="alert-item">
        <strong>Guayas (Guayaquil)</strong> — Riesgo alto — magnitud 6.1.
        </li>
    `;
}
renderAlerts();


// === Permitir que al hacer clic en una alerta se abra el mapa ===
document.addEventListener('click', (e) => {
    const alerta = e.target.closest('#alerts li');
    if (alerta) {
        // Quita la clase 'active' de todas las pestañas
        tabs.forEach(tab => tab.classList.remove('active'));

        // Activa la pestaña "Mapa de Riesgo"
        const mapaTab = document.querySelector('.tab[data-tab="mapa"]');
        mapaTab.classList.add('active');

        // Oculta todas las vistas
        Object.values(views).forEach(v => v.hidden = true);

        // Muestra solo el mapa
        views.mapa.hidden = false;
    }
});

// ===  Modo claro / oscuro con persistencia ===
const root = document.documentElement;
const btnTheme = document.getElementById('btnTheme');

(function initTheme() {
  const saved = localStorage.getItem('theme'); // 'light' | 'dark' | null
  if (saved) {
    root.dataset.theme = saved;
    if (btnTheme) btnTheme.textContent = saved === 'light' ? '🌞 Modo claro' : '🌙 Modo oscuro';
  } else {
    // primera vez: respeta la preferencia del sistema
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      root.dataset.theme = 'light';
      if (btnTheme) btnTheme.textContent = '🌞 Modo claro';
    }
  }
})();

if (btnTheme) {
  btnTheme.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    localStorage.setItem('theme', next);
    btnTheme.textContent = next === 'light' ? '🌞 Modo claro' : '🌙 Modo oscuro';
  });
}

// CSV
document.getElementById('btnCSV').addEventListener('click', () => {
    const rows = [['fecha', 'region', '#sismos_M4+', 'lluvia_mm', 'presion_hPa', 'indice_riesgo']];
    for (let i = 0; i < 12; i++) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        rows.push([d, regiones[i % 4], Math.round(rand(0, 5)), Math.round(rand(0, 150)), Math.round(1000 + rand(-12, 12)), (10 + rand(-3, 6)).toFixed(1) + '%']);
    }
    const csv = rows.map(r => r.join(',')).join('\\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'quakepredictec_demo_sin_modelo.csv';
    a.click();
});

// Definir colores de riesgo
function colorRisk(v) {
  const x = (v <= 1) ? v : v/100;
  return x > 0.8 ? '#b10026' :
         x > 0.6 ? '#e31a1c' :
         x > 0.4 ? '#fc4e2a' :
         x > 0.2 ? '#fd8d3c' :
                   '#feb24c';
}
function fmtPct(x){ return (x<=1? (x*100).toFixed(1) : x.toFixed(1))+'%'; }

// --- mapa ---
let mapEC = null;
function initMapaEC() {
  if (mapEC) { mapEC.invalidateSize(); return; } // por si viene de tabs ocultos

  mapEC = L.map('map-ec', {
    zoomControl: true,
    preferCanvas: true
  }).setView([-1.8, -78.2], 6); // centro aprox. Ecuador

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap'
  }).addTo(mapEC);

  // --- EJEMPLO 1: coropleta de riesgo (polígonos GeoJSON) ---
  // Estructura: cada feature tiene properties.risk en 0..1 o 0..100
  // Sustituir 'ecRiskPolygons' por GeoJSON real (provincias, cantones o grilla).
  const ecRiskPolygons = {
    "type":"FeatureCollection",
    "features":[
      // Ejemplo mínimo con 2 polígonos; reemplaza con geometrías reales
      // usar provincias/cantones de Ecuador en GeoJSON y añadirles 'risk'
    ]
  };

  function stylePol(feature) {
    const r = feature.properties.risk ?? 0;
    return {
      color: '#1f2937',
      weight: 1,
      fillColor: colorRisk(r),
      fillOpacity: 0.6
    };
  }

  const polLayer = L.geoJSON(ecRiskPolygons, {
    style: stylePol,
    onEachFeature: (feat, layer) => {
      const { name = 'Zona', risk = 0 } = feat.properties || {};
      layer.bindPopup(`<b>${name}</b><br>Riesgo estimado: <b>${fmtPct(risk)}</b>`);
      layer.on('mouseover', () => layer.setStyle({ weight: 2 }));
      layer.on('mouseout',  () => layer.setStyle({ weight: 1 }));
    }
  }).addTo(mapEC);

  // EJEMPLO 2: puntos de predicción con popup
  // Esta información se obtendrá del modelo real
  const predicciones = [
    {
      lat: -2.17, lon: -79.92, region: 'Guayas (Guayaquil)',
      prob: 0.37, when: 'próximos 5-10 días', magnitud: 6.1,
      msg: 'Se han detectado patrones de sismicidad y anomalías de presión.'
    },
    {
      lat: -0.18, lon: -78.48, region: 'Pichincha (Quito)',
      prob: 0.54, when: 'próximos 3-7 días', magnitud: 6.3,
      msg: 'Se han detectado patrones de sismicidad y anomalías de precipitación.'
    }
  ];

  const predLayer = L.layerGroup(
    predicciones.map(p => {
      const m = L.circleMarker([p.lat, p.lon], {
        radius: 7, weight: 1, color: '#111827',
        fillColor: colorRisk(p.prob), fillOpacity: 0.85
      });
      const html = `
        <div style="max-width:260px">
          <b>QuakePredictEC informa</b><br>
          Zona: <b>${p.region}</b><br>
          Prob. de sismo: <b>${fmtPct(p.prob)}</b><br>
          Magnitud estimada: <b>${p.magnitud}</b><br>
          Ventana temporal: ${p.when}<br><br>
          <i>${p.msg}</i>
        </div>`;
      m.bindPopup(html);
      return m;
    })
  ).addTo(mapEC);

  // --- leyenda ---
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'info legend');
    div.style.background = '#0b1220';
    div.style.padding = '8px 10px';
    div.style.border = '1px solid #1f2937';
    div.style.borderRadius = '8px';
    const grades = [0, 0.2, 0.4, 0.6, 0.8];
    let html = '<div style="font-weight:700;margin-bottom:6px">Riesgo sísmico</div>';
    for (let i = 0; i < grades.length; i++) {
      const from = grades[i], to = grades[i + 1];
      html +=
        `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
           <span style="display:inline-block;width:16px;height:12px;background:${colorRisk(from+0.01)}"></span>
           <span>${fmtPct(from*100)}${to!==undefined ? '–'+fmtPct(to*100) : '+'}</span>
         </div>`;
    }
    div.innerHTML = html;
    return div;
  };
  legend.addTo(mapEC);
}

// Inicializa cuando se muestre la pestaña "mapa"
const tabMapa = document.querySelector('[data-tab="mapa"]');
if (tabMapa) {
  tabMapa.addEventListener('click', () => setTimeout(initMapaEC, 0));
}
// Por si el mapa es la vista inicial visible:
if (!document.getElementById('view-mapa')?.hidden) {
  setTimeout(initMapaEC, 0);
}
