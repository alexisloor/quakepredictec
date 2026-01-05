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
// ====== GESTIÓN DE DATOS (Backend Integration) ======
let records = []; // Aquí guardaremos los datos reales que lleguen del backend
let sortBy = 'probabilidad'; // Ordenar por probabilidad por defecto
let sortDir = 'desc';        // De mayor a menor riesgo
const PAGE = 10;
let page = 1;

// 1. FUNCIÓN PARA CARGAR DATOS REALES
async function cargarTablaReal() {
  const tableBody = document.getElementById('rows');
  if(tableBody) tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">🔄 Cargando datos en tiempo real...</td></tr>';

  try {
    // Petición al backend local
    const response = await fetch('http://127.0.0.1:8000/riesgo-sismico');
    const data = await response.json();

    // Mapeamos los datos para que encajen en nuestra estructura de tabla
    // Como no hay base de datos, la fecha siempre es "HOY"
    const fechaHoy = new Date().toISOString().slice(0, 10);

    records = data.map(item => ({
      fecha: fechaHoy,
      region: item.canton, // Usamos el cantón como ubicación
      probabilidad: (item.probabilidad * 100).toFixed(2), // Convertir 0.45 -> 45.00
      nivel: item.nivel_riesgo,
      color: item.color
    }));

    // Renderizamos la tabla con los datos frescos
    renderTable();

  } catch (error) {
    console.error("Error cargando tabla:", error);
    if(tableBody) tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#dc3545; padding:20px;">❌ Error conectando con el servidor local (uvicorn).</td></tr>';
  }
}

// 2. FILTROS (Simplificados para lo que tenemos hoy)
function applyFilters() {
  const q = document.getElementById('fSearch')?.value.trim().toLowerCase() || '';
  
  // Nota: Los filtros de fecha y lluvia los ignoramos por ahora 
  // porque solo mostramos datos de HOY y sin columnas de clima en la vista simple.
  
  return records.filter(r => {
    // Buscamos por nombre de cantón o fecha
    const okSearch = !q || (r.region.toLowerCase().includes(q) || r.fecha.includes(q));
    return okSearch;
  });
}

// 3. ORDENAMIENTO
function sortData(arr) {
  return arr.sort((a, b) => {
    // Truco: convertimos a número si es probabilidad para ordenar bien matemáticamente
    let A = a[sortBy];
    let B = b[sortBy];

    if (sortBy === 'probabilidad') {
      A = parseFloat(A);
      B = parseFloat(B);
    }

    const cmp = (A > B) ? 1 : (A < B) ? -1 : 0;
    return (sortDir === 'asc') ? cmp : -cmp;
  });
}

// 4. RENDERIZADO (Adaptado a tus 4 columnas)
function renderTable() {
  const filtered = sortData(applyFilters());
  const total = filtered.length;
  const start = (page - 1) * PAGE;
  const slice = filtered.slice(start, start + PAGE);

  const rowsContainer = document.getElementById('rows');
  
  if (!rowsContainer) return;

  if (total === 0) {
    rowsContainer.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px">No se encontraron predicciones</td></tr>';
    return;
  }

  // Generamos el HTML solo con las columnas que pediste
  rowsContainer.innerHTML = slice.map(r => `
    <tr>
      <td style="padding:12px; border-bottom:1px solid #374151; color:#9ca3af">${r.fecha}</td>
      <td style="padding:12px; border-bottom:1px solid #374151; font-weight:bold; color:#f3f4f6">${r.region}</td>
      <td style="padding:12px; border-bottom:1px solid #374151;">
        <div style="display:flex; align-items:center; gap:8px">
          <div style="width:100%; max-width:80px; height:6px; background:#374151; border-radius:3px; overflow:hidden;">
             <div style="width:${r.probabilidad}%; height:100%; background:${r.color}"></div>
          </div>
          <span>${r.probabilidad}%</span>
        </div>
      </td>
      <td style="padding:12px; border-bottom:1px solid #374151;">
        <span style="background:${r.color}20; color:${r.color}; padding:2px 8px; border-radius:4px; font-size:0.85em; font-weight:bold; border:1px solid ${r.color}">
          ${r.nivel}
        </span>
      </td>
    </tr>
  `).join('');

  // Actualizar contador
  const countEl = document.getElementById('count');
  if (countEl) countEl.textContent = total
    ? `${start + 1}-${Math.min(start + PAGE, total)} de ${total}`
    : `0 de 0`;

  // Botones paginación
  const prev = document.getElementById('btnPrev');
  const next = document.getElementById('btnNext');
  if (prev) prev.disabled = page === 1;
  if (next) next.disabled = start + PAGE >= total;
}

// 5. LISTENERS DE LA UI
['fSearch'].forEach(id => {
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
    // Asegúrate que en tu HTML los <th> tengan data-sort="fecha", "region", etc.
    if (sortBy === key) sortDir = (sortDir === 'asc') ? 'desc' : 'asc';
    else { sortBy = key; sortDir = 'asc'; }
    page = 1; renderTable();
  });
});

// --- INICIALIZACIÓN ---
// Llamamos a la función real al cargar la página
document.addEventListener('DOMContentLoaded', cargarTablaReal);

// ====== MODO CLARO/OSCURO ======
const root = document.documentElement;
const btnTheme = document.getElementById('btnTheme');

(function initTheme() {
  const saved = localStorage.getItem('theme'); 
  let initial;

  if (saved === 'light' || saved === 'dark') {
    initial = saved;
  } else {
    if (window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: light)').matches) {
      initial = 'light';
    } else {
      initial = 'dark';
    }
  }
  root.dataset.theme = initial; 
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
function colorMagnitude(m) {
  if (m >= 6.1) return '#dc2626';   // rojo
  if (m >= 4.1) return '#eab308';   // amarillo
  return '#22c55e';                 // verde
}
function fmtPct(x){ return (x<=1? (x*100).toFixed(1) : x.toFixed(1))+'%'; }

// ====== MAPA Y PREDICCIONES ======
let mapEC = null;
let predLayer = null;
// helper para añadir una predicción al mapa
function addPrediccionToMap(p) {
  if (!mapEC) return;
  if (!predLayer) {
    predLayer = L.layerGroup().addTo(mapEC);
  }

  // Usamos el COLOR que ya viene calculado desde el Backend (Python)
  const m = L.circleMarker([p.lat, p.lon], {
    radius: 8,              // Un poco más grande para que se vea bien
    weight: 2,
    color: '#ffffff',       // Borde blanco para resaltar
    fillColor: p.color,     // <--- COLOR REAL DEL MODELO
    fillOpacity: 0.9
  });

  // Convertimos probabilidad (0.85) a porcentaje (85%)
  const probPct = (p.probabilidad * 100).toFixed(1) + '%';

  const html = `
    <div style="max-width:260px; font-family: sans-serif;">
      <b style="color:#111827">📡 QuakePredictEC (En vivo)</b><br>
      <hr style="margin: 5px 0; border: 0; border-top: 1px solid #ddd;">
      📍 Cantón: <b>${p.canton}</b><br>
      ⚠️ Nivel de Riesgo: <b style="color:${p.color}">${p.nivel_riesgo}</b><br>
      📊 Probabilidad: <b>${probPct}</b><br>
      <br>
      <small style="color:#666">
        Análisis basado en patrones climáticos de los últimos 30 días.
      </small>
    </div>`;
  
  m.bindPopup(html);
  predLayer.addLayer(m);
}
// --- NUEVA LÓGICA DE CONEXIÓN AL BACKEND ---
async function cargarPrediccionesReales() {
  console.log("Conectando con el modelo de predicción sísmica (Localhost)...");
  
  try {
    // Llamada al endpoint que creamos en Python
    const response = await fetch('http://127.0.0.1:8000/riesgo-sismico');
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const datosReales = await response.json();
    console.log("Datos recibidos:", datosReales);

    // Limpiamos capas anteriores si hubiera
    if (predLayer) predLayer.clearLayers();

    // Dibujamos cada predicción real en el mapa
    datosReales.forEach(prediccion => {
      addPrediccionToMap(prediccion);
    });

  } catch (error) {
    console.error("Error conectando al Backend:", error);
    alert("No se pudo conectar con el sistema de predicción. Asegúrate de que el backend (uvicorn) esté corriendo.");
  }
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
  cargarPrediccionesReales();

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
      const radio = 0.05;                        
      const angulo = existentes * (Math.PI / 6); 
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


const btnLogin  = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const userLabel = document.getElementById("userLabel");

const btnCSV = document.getElementById("btnCSV");
const msgLoginCSV = document.getElementById("msgLoginCSV");
const subscriptionCard = document.getElementById("subscriptionCard");

function isLoggedIn() {
  return localStorage.getItem("qp_logged_in") === "true";
}

function getUserLabel() {
  const userDataRaw = localStorage.getItem("qp_user");
  if (userDataRaw) {
    try {
      const userData = JSON.parse(userDataRaw);
      if (userData?.usuario) return "@" + userData.usuario;
      if (userData?.email) return "👤 " + userData.email;
    } catch (e) {
    }
  }
  const email = localStorage.getItem("qp_user_email");
  return "👤 " + (email || "Usuario");
}



// ====== FUNCIÓN CENTRAL INICIO DE USUARIO  ======
function updateSessionUI() {
  const logged = isLoggedIn();
  if (btnLogin)  btnLogin.style.display  = logged ? "none" : "inline-block";
  if (btnLogout) btnLogout.style.display = logged ? "inline-block" : "none";

  if (userLabel) {
    if (logged) {
      userLabel.style.display = "inline-block";
      userLabel.textContent = getUserLabel();
    } else {
      userLabel.style.display = "none";
      userLabel.textContent = "";
    }
  }
  // CSV (bloqueo + mensaje)
  if (btnCSV) {
    btnCSV.disabled = !logged;
    btnCSV.style.opacity = logged ? "1" : "0.5";
    btnCSV.style.cursor = logged ? "pointer" : "not-allowed";
  }
  if (msgLoginCSV) {
    msgLoginCSV.style.display = logged ? "none" : "block";
  }
  // Tarjeta suscripción
  if (subscriptionCard) {
    subscriptionCard.style.display = logged ? "block" : "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateSessionUI();

  if (btnLogin) {
    btnLogin.addEventListener("click", () => {
      window.location.href = "login.html";
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("qp_logged_in");
      localStorage.removeItem("qp_user");
      localStorage.removeItem("qp_user_email");
      updateSessionUI();
    });
  }

  if (btnCSV) {
    btnCSV.addEventListener("click", () => {
      if (!isLoggedIn()) {
        alert("Debes iniciar sesión para descargar los reportes.");
        updateSessionUI();
        return;
      }
      const rows = [
        ["fecha", "region", "#sismos_M4+", "lluvia_mm", "presion_hPa", "indice_riesgo"]
      ];

      for (let i = 0; i < 12; i++) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        rows.push([
          d,
          regiones[i % 4],
          Math.round(rand(0, 5)),
          Math.round(rand(0, 150)),
          Math.round(1000 + rand(-12, 12)),
          (10 + rand(-3, 6)).toFixed(1) + "%"
        ]);
      }

      const csv = rows.map(r => r.join(",")).join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = "quakepredictec_demo.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
});

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
    localStorage.setItem("qp_sub_cities", JSON.stringify(selectedCities));
    if (subMsg) {
      subMsg.style.display = "block";
      setTimeout(() => subMsg.style.display = "none", 3500);
    }
  });
}

