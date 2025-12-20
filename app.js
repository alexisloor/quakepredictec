// ====== TABS Y VISTAS ======
const tabs = document.querySelectorAll('.tab');
const views = {
  mapa: document.getElementById('view-mapa'),
  datos: document.getElementById('view-datos'),
  alertas: document.getElementById('view-alertas'),
};

let newAlertsCount = 0;
const alertBadge = document.getElementById('alertBadge');

function updateAlertBadge() {
  if (!alertBadge) return;
  if (newAlertsCount > 0) {
    alertBadge.textContent = newAlertsCount;
    alertBadge.style.display = 'inline-flex';
  } else {
    alertBadge.style.display = 'none';
  }
}

tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  Object.values(views).forEach(v => v.hidden = true);
  const key = t.dataset.tab;
  views[key].hidden = false;

  // Si entra a Alertas, se consideran leídas
  if (key === 'alertas') {
    newAlertsCount = 0;
    updateAlertBadge();
  }
}));

// ====== SERIES SIMULADAS (solo decorativo por ahora) ======
const days = 24;
function rand(min, max) { return Math.random() * (max - min) + min }
const sismos = Array.from({ length: days }, (_, i) =>
  Math.max(0, Math.round(rand(0, 6) + Math.sin(i / 2) * 2))
);
const lluviaSerie = Array.from({ length: days }, (_, i) =>
  Math.max(0, Math.round(rand(0, 30) + Math.sin(i / 3 + 1) * 12))
);

// ====== TABLA DE DATOS ======
const regiones = ['Costa', 'Sierra', 'Oriente', 'Insular'];

function makeRecord(i) {
  const d = new Date(Date.now() - (i * 86400000));  // i días atrás
  const fecha = d.toISOString().slice(0, 10);       // YYYY-MM-DD
  const region = regiones[i % regiones.length];
  const sismos = Math.max(0, Math.round(rand(0, 5) + (region === 'Costa' ? 1 : 0)));
  const lluvia = Math.round(rand(0, 150));
  const presion = Math.round(1000 + rand(-18, 18));
  const riesgo = +(10 + rand(-3, 6)).toFixed(1);
  return { fecha, region, sismos, lluvia, presion, riesgo };
}

const records = Array.from({ length: 120 }, (_, i) => makeRecord(i));
let sortBy = 'fecha';
let sortDir = 'desc';
const PAGE = 12;
let page = 1;

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

renderTable();

// ====== MODO CLARO/OSCURO ======
const root = document.documentElement;
const btnTheme = document.getElementById('btnTheme');

(function initTheme() {
  const saved = localStorage.getItem('theme'); // 'light' | 'dark' | null
  let initial;

  if (saved === 'light' || saved === 'dark') {
    initial = saved;
  } else {
    // si el sistema prefiere claro, usamos light; si no, dark por defecto
    if (window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: light)').matches) {
      initial = 'light';
    } else {
      initial = 'dark';
    }
  }

  root.dataset.theme = initial; // siempre 'light' o 'dark'
  if (btnTheme) {
    btnTheme.textContent =
      initial === 'light' ? '🌙 Modo oscuro' : '🌞 Modo claro';
  }
})();

if (btnTheme) {
  btnTheme.addEventListener('click', () => {
    const current = root.dataset.theme === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';

    root.dataset.theme = next;
    localStorage.setItem('theme', next);

    btnTheme.textContent =
      next === 'light' ? '🌙 Modo oscuro' : '🌞 Modo claro';
  });
}



// ====== FUNCIONES DE COLOR (MAGNITUD) ======
// 0–4 verde, 4.1–6 amarillo, >6 rojo (tipo escala Richter / semáforo)
function colorMagnitude(m) {
  if (m >= 6.1) return '#dc2626';   // rojo
  if (m >= 4.1) return '#eab308';   // amarillo
  return '#22c55e';                 // verde
}
function fmtPct(x){ return (x<=1? (x*100).toFixed(1) : x.toFixed(1))+'%'; }

// ====== MAPA Y PREDICCIONES ======
let mapEC = null;
let predLayer = null;

// Coordenadas reales aprox. por región
const coordenadasPorRegion = {
  "Pichincha (Quito)":      { lat: -0.1807, lon: -78.4678 },
  "Guayas (Guayaquil)":     { lat: -2.1700, lon: -79.9224 },
  "Manabí (Manta)":         { lat: -0.9623, lon: -80.7120 },
  "Esmeraldas":             { lat: 0.9592,  lon: -79.6530 },
  "El Oro (Machala)":       { lat: -3.2581, lon: -79.9552 },
  "Los Ríos (Babahoyo)":    { lat: -1.8022, lon: -79.5352 },
  "Azuay (Cuenca)":         { lat: -2.9006, lon: -79.0045 },
  "Tungurahua (Ambato)":    { lat: -1.2491, lon: -78.6167 },
  "Santo Domingo":          { lat: -0.2530, lon: -79.1750 },
  "Santa Elena":            { lat: -2.2260, lon: -80.8580 },
  "Loja":                   { lat: -3.9931, lon: -79.2042 }
};

// Predicciones iniciales
const predicciones = [
  {
    ...coordenadasPorRegion["Guayas (Guayaquil)"],
    region: 'Guayas (Guayaquil)',
    prob: 0.37,
    when: 'próximos 5-10 días',
    magnitud: 6.1,
    temp7d: 27.3,
    msg: 'Se han detectado patrones de sismicidad y anomalías de presión.'
  },
  {
    ...coordenadasPorRegion["Pichincha (Quito)"],
    region: 'Pichincha (Quito)',
    prob: 0.54,
    when: 'próximos 3-7 días',
    magnitud: 6.3,
    temp7d: 18.9,
    msg: 'Se han detectado patrones de sismicidad y anomalías de precipitación.'
  }
];

// helper para añadir una predicción al mapa
function addPrediccionToMap(p) {
  if (!mapEC) return;
  if (!predLayer) {
    predLayer = L.layerGroup().addTo(mapEC);
  }
  const m = L.circleMarker([p.lat, p.lon], {
    radius: 7,
    weight: 1,
    color: '#111827',
    fillColor: colorMagnitude(p.magnitud),  // color por magnitud
    fillOpacity: 0.85
  });
  const html = `
    <div style="max-width:260px">
      <b>QuakePredictEC informa</b><br>
      Zona: <b>${p.region}</b><br>
      Prob. de sismo: <b>${fmtPct(p.prob)}</b><br>
      Magnitud estimada: <b>${p.magnitud}</b><br>
      🌡️ Temp. promedio últimos 7 días: <b>${p.temp7d.toFixed(1)} °C</b><br>
      Ventana temporal: ${p.when}<br><br>
      <i>${p.msg}</i>
    </div>`;
  m.bindPopup(html);
  p.marker = m;
  predLayer.addLayer(m);
}

function initMapaEC() {
  if (mapEC) {
    mapEC.invalidateSize();
    return;
  }

  mapEC = L.map('map-ec', {
    zoomControl: true,
    preferCanvas: true
  }).setView([-1.8, -78.2], 6);

  // Base 
  



L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  opacity: 0.90 ,
  attribution: '&copy; OpenStreetMap'
}).addTo(mapEC);
L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 18,
    opacity: 0.50 ,
    attribution: 'Esri, USGS | Physical Map'
  }
).addTo(mapEC);

L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 18,
    opacity: 0.75 ,
    attribution: 'Esri, USGS, NOAA'
  }
).addTo(mapEC);




/*L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 20,
      attribution: 'Tiles &copy; Esri — Source: Esri, DeLorme, NAVTEQ'
    }
  ).addTo(mapEC);

/*L.tileLayer(
  'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  {
    maxZoom: 17,
    attribution: '© OpenTopoMap'
  }
).addTo(mapEC);*/



  // placeholder para polígonos futuros
  const ecRiskPolygons = {
    "type":"FeatureCollection",
    "features":[]
  };

  L.geoJSON(ecRiskPolygons, {
    style: () => ({
      color: '#1f2937',
      weight: 1,
      fillColor: '#111827',
      fillOpacity: 0.0
    })
  }).addTo(mapEC);

  predLayer = L.layerGroup().addTo(mapEC);
  predicciones.forEach(p => addPrediccionToMap(p));

  // Leyenda por magnitud (escala Richter)
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'info legend');

    let html = '<div style="font-weight:700;margin-bottom:6px">Magnitud (escala Richter)</div>';

    const items = [
      { label: '0.0 – 4.0', color: colorMagnitude(3.5) }, // verde
      { label: '4.1 – 6.0', color: colorMagnitude(5.0) }, // amarillo
      { label: '6.1 o más', color: colorMagnitude(6.5) }  // rojo
    ];

    items.forEach(it => {
      html += `
        <div style="display:flex;align-items:center;gap:6px;margin:2px 0">
          <span style="display:inline-block;width:16px;height:12px;background:${it.color}"></span>
          <span>${it.label}</span>
        </div>`;
    });

    div.innerHTML = html;
    return div;
  };
  legend.addTo(mapEC);
}

// Inicializar mapa al entrar a la pestaña
const tabMapa = document.querySelector('[data-tab="mapa"]');
if (tabMapa) {
  tabMapa.addEventListener('click', () => setTimeout(initMapaEC, 0));
}
if (!document.getElementById('view-mapa')?.hidden) {
  setTimeout(initMapaEC, 0);
}

// ====== ALERTAS ======
const alertsEl = document.getElementById('alerts');
const btnSimularAlerta = document.getElementById('btnSimularAlerta');

// alertas iniciales basadas en predicciones con magnitud > 6
const alertsData = predicciones
  .filter(p => p.magnitud > 6)
  .map(p => ({
    region: p.region,
    texto: `Riesgo alto — magnitud ${p.magnitud}`
  }));

function renderAlerts() {
  if (!alertsEl) return;
  alertsEl.classList.add('alert-list');
  alertsEl.innerHTML = alertsData.map(a => `
    <li class="alert-item" data-region="${a.region}">
      <strong>${a.region}</strong> — ${a.texto}
    </li>
  `).join('');
}

renderAlerts();

// provincias para simulación
const provinciasSimulacion = Object.keys(coordenadasPorRegion);

// Simular nueva alerta (puntito SIEMPRE; alerta visible solo si magnitud > 6)
if (btnSimularAlerta) {
  btnSimularAlerta.addEventListener('click', () => {
    // magnitud entre 2.0 y 7.5 (para que salgan también < 4)
    const magnitud = +(2 + Math.random() * 5.5).toFixed(1);

    const regionRandom = provinciasSimulacion[
      Math.floor(Math.random() * provinciasSimulacion.length)
    ];
    const coords = coordenadasPorRegion[regionRandom] || { lat: -1.8, lon: -78.2 };
    const temp7d = +(13 + Math.random() * 15).toFixed(1);
    const prob = +(0.30 + Math.random() * 0.55).toFixed(2);
    const whenOptions = [
      'próximos 3–6 días',
      'próximos 5–10 días',
      'próximos días',
      'próximos 7–12 días'
    ];
    const whenRandom = whenOptions[
      Math.floor(Math.random() * whenOptions.length)
    ];
    const msgOptions = [
      'Variaciones de presión y anomalías detectadas.',
      'Patrones climáticos asociados a actividad sísmica.',
      'Incremento en humedad y presión atmosférica.',
      'Actividad reciente relacionada a lluvias intensas.'
    ];
    const msgRandom = msgOptions[
      Math.floor(Math.random() * msgOptions.length)
    ];

    // cuántas predicciones ya hay en esa región (para separar puntitos)
    const existentes = predicciones.filter(p => p.region === regionRandom).length;
    const baseLat = coords.lat;
    const baseLon = coords.lon;
    let lat = baseLat;
    let lon = baseLon;

    if (existentes > 0) {
      const radio = 0.05;                        // ~5 km
      const angulo = existentes * (Math.PI / 6); // 30° por alerta
      lat = baseLat + radio * Math.cos(angulo);
      lon = baseLon + radio * Math.sin(angulo);
    }

    const nuevaPred = {
      lat,
      lon,
      region: regionRandom,
      prob,
      when: whenRandom,
      magnitud,
      temp7d,
      msg: msgRandom
    };

    predicciones.push(nuevaPred);
    if (mapEC) {
      addPrediccionToMap(nuevaPred);
    }

    // Solo entra a la lista de alertas si magnitud > 6
    if (magnitud > 6) {
      alertsData.push({
        region: regionRandom,
        texto: `Nueva alerta — magnitud ${magnitud}`
      });
      renderAlerts();
      newAlertsCount++;
      updateAlertBadge();

      simulateEmailSend(regionRandom, magnitud);

    } else {
      console.log(`Predicción registrada en mapa con magnitud ${magnitud}, sin activar alerta.`);
    }
  });
}

// click en alerta -> ir al mapa y abrir popup
document.addEventListener('click', (e) => {
  const alerta = e.target.closest('#alerts li');
  if (!alerta) return;

  const region = alerta.dataset.region;

  tabs.forEach(tab => tab.classList.remove('active'));
  const mapaTab = document.querySelector('.tab[data-tab="mapa"]');
  if (mapaTab) mapaTab.classList.add('active');
  Object.values(views).forEach(v => v.hidden = true);
  views.mapa.hidden = false;

  setTimeout(() => {
    if (!mapEC) {
      initMapaEC();
    } else {
      mapEC.invalidateSize();
    }

    const pred = predicciones.find(p => p.region === region);
    if (pred && pred.marker && mapEC) {
      mapEC.setView([pred.lat, pred.lon], 9, { animate: true });
      pred.marker.openPopup();
    }
  }, 300);
});

// ====== BLOQUEO DE DESCARGA SIN LOGIN ======
const btnCSV = document.getElementById('btnCSV');
const msgLoginCSV = document.getElementById('msgLoginCSV');

if (btnCSV) {
  const isLoggedIn = localStorage.getItem('qp_logged_in') === 'true';

  if (!isLoggedIn) {
    btnCSV.disabled = true;
    btnCSV.style.opacity = '0.5';
    btnCSV.style.cursor = 'not-allowed';
    if (msgLoginCSV) msgLoginCSV.style.display = 'block';
  }

  btnCSV.addEventListener('click', () => {
    if (!isLoggedIn) {
      alert('Debes iniciar sesión para descargar los reportes.');
      return;
    }

    const rows = [['fecha', 'region', '#sismos_M4+', 'lluvia_mm', 'presion_hPa', 'indice_riesgo']];
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      rows.push([
        d,
        regiones[i % 4],
        Math.round(rand(0, 5)),
        Math.round(rand(0, 150)),
        Math.round(1000 + rand(-12, 12)),
        (10 + rand(-3, 6)).toFixed(1) + '%'
      ]);
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'quakepredictec_demo.csv';
    a.click();
  });
}

// ====== CONTROL DE SESIÓN + USUARIO ======
document.addEventListener("DOMContentLoaded", () => {

  const btnLogin   = document.getElementById("btnLogin");
  const btnLogout  = document.getElementById("btnLogout");
  const userLabel  = document.getElementById("userLabel");

  const isLoggedIn = localStorage.getItem("qp_logged_in") === "true";
  const userEmail  = localStorage.getItem("qp_user_email");

  if (isLoggedIn) {
    // Mostrar solo LOGOUT y el usuario
    if (btnLogin)  btnLogin.style.display  = "none";
    if (btnLogout) btnLogout.style.display = "inline-block";

    if (userLabel) {
      userLabel.style.display = "inline-block";
      userLabel.textContent = "👤 " + (userEmail || "Usuario");
    }

  } else {
    //  Mostrar solo LOGIN
    if (btnLogin)  btnLogin.style.display  = "inline-block";
    if (btnLogout) btnLogout.style.display = "none";

    if (userLabel) userLabel.style.display = "none";
  }

  // 👉 Ir al login
  if (btnLogin) {
    btnLogin.addEventListener("click", () => {
      window.location.href = "login.html";
    });
  }

  // 👉 Cerrar sesión
  if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    //  Quitar sesión
    localStorage.removeItem("qp_logged_in");
    localStorage.removeItem("qp_user_email");

    // Ocultar botón de cerrar sesión
    if (btnLogout) btnLogout.style.display = "none";
    // Mostrar botón de iniciar sesión
    if (btnLogin) btnLogin.style.display = "inline-block";

    //  Ocultar usuario
    if (userLabel) userLabel.style.display = "none";

    // Bloquear otra vez el botón de descarga
    const btnCSV = document.getElementById('btnCSV');
    const msgLoginCSV = document.getElementById('msgLoginCSV');

    if (btnCSV) {
      btnCSV.disabled = true;
      btnCSV.style.opacity = '0.5';
      btnCSV.style.cursor = 'not-allowed';
    }

    if (msgLoginCSV) {
      msgLoginCSV.style.display = "block";
    }
  });
}
});
// ====== CONTROL DE SESIÓN (LOGIN / LOGOUT) DEFINITIVO ======
const btnLogin  = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const userLabel = document.getElementById("userLabel");

function updateSessionUI() {
  const logged = localStorage.getItem("qp_logged_in") === "true";
  const userData = JSON.parse(localStorage.getItem("qp_user"));

  if (logged && userData) {
    if (btnLogin)  btnLogin.style.display  = "none";
    if (btnLogout) btnLogout.style.display = "inline-block";

    if (userLabel) {
      userLabel.style.display = "inline-block";
      userLabel.textContent = "@" + userData.usuario;
    }

    //  Activar descarga
    const btnCSV = document.getElementById('btnCSV');
    const msgLoginCSV = document.getElementById('msgLoginCSV');

    if (btnCSV) {
      btnCSV.disabled = false;
      btnCSV.style.opacity = '1';
      btnCSV.style.cursor = 'pointer';
    }

    if (msgLoginCSV) msgLoginCSV.style.display = "none";

  } else {
    if (btnLogin)  btnLogin.style.display  = "inline-block";
    if (btnLogout) btnLogout.style.display = "none";

    if (userLabel) {
      userLabel.style.display = "none";
      userLabel.textContent = "";
    }
  }
}

// 👉 Ir al login
if (btnLogin) {
  btnLogin.addEventListener("click", () => {
    window.location.href = "login.html";
  });
}

// 👉 Cerrar sesión (SIN CERRAR LA APP)
if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    localStorage.setItem("qp_logged_in", "false");

    //  Bloquear descarga
    const btnCSV = document.getElementById('btnCSV');
    const msgLoginCSV = document.getElementById('msgLoginCSV');

    if (btnCSV) {
      btnCSV.disabled = true;
      btnCSV.style.opacity = '0.5';
      btnCSV.style.cursor = 'not-allowed';
    }

    if (msgLoginCSV) msgLoginCSV.style.display = "block";

    updateSessionUI();
  });
}

// Ejecutar al cargar la app
updateSessionUI();





// ====== SISTEMA DE SUSCRIPCIÓN A ALERTAS ======
const btnSubscribe = document.getElementById("btnSubscribe");
const subMsg = document.getElementById("subMsg");

if (btnSubscribe) {
  btnSubscribe.addEventListener("click", () => {

    const isLoggedIn = localStorage.getItem("qp_logged_in") === "true";

    if (!isLoggedIn) {
      alert("⚠ Debes iniciar sesión para poder suscribirte a alertas.");
      return;
    }

    const selectedCities = Array.from(
      document.querySelectorAll("#cityCheckboxes input:checked")
    ).map(c => c.value);

    if (selectedCities.length === 0) {
      alert("⚠ Selecciona al menos una ciudad.");
      return;
    }

    // Guardar ciudades suscritas
    localStorage.setItem("qp_sub_cities", JSON.stringify(selectedCities));

    //  Mostrar mensajito de confirmación
    if (subMsg) {
      subMsg.style.display = "block";
      setTimeout(() => subMsg.style.display = "none", 3500);
    }
  });
}


// ====== SIMULACIÓN DE ENVÍO DE ALERTA POR CORREO ======
function simulateEmailSend(region, magnitud) {

  const isLoggedIn = localStorage.getItem("qp_logged_in") === "true";
  if (!isLoggedIn) return;

  const userData = JSON.parse(localStorage.getItem("qp_user"));
  const subs = JSON.parse(localStorage.getItem("qp_sub_cities")) || [];

  const cleanRegion = region.split("(")[0].trim();

  //  Verifica si el usuario está suscrito a esa ciudad
  if (!userData || !subs.includes(cleanRegion)) return;

  // SIMULACIÓN REAL DEL CORREO (por consola)
  console.log(`
📧 ================================
📧 SIMULACIÓN DE CORREO ENVIADO
📧 ================================

Para: ${userData.correo}
Usuario: ${userData.usuario}

📍 Ciudad: ${cleanRegion}
📊 Magnitud estimada: ${magnitud}

Mensaje:
Se ha detectado una nueva alerta sísmica en tu zona.

Gracias por usar QuakePredictEC.
----------------------------------
  `);

  //  Mensaje visual en la app (opcional)
  alert(`📧 Alerta enviada al correo de ${userData.usuario}\nCiudad: ${cleanRegion}\nMagnitud: ${magnitud}`);
}

// CERRAR SESION
document.getElementById("btnLogout").addEventListener("click", () => {
  localStorage.removeItem("qp_access_token");
  localStorage.removeItem("qp_user_email");
});
