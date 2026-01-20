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

// 1. FUNCIÓN PARA CARGAR DATOS REALES (CON FIX ANTI-DUPLICADOS)
async function cargarTablaReal() {
  const tableBody = document.getElementById('rows');

  // Limpiamos la tabla antes de cargar
  if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">🔄 Cargando datos en tiempo real...</td></tr>';

  try {
    // Petición al backend 
    const response = await fetch('https://quakepredictec-backend.onrender.com/riesgo-sismico');
    const datosCrudos = await response.json();

    const unicosMap = new Map();
    datosCrudos.forEach(item => {
      if (!unicosMap.has(item.canton)) {
        unicosMap.set(item.canton, item);
      }
    });
    // Convertimos de vuelta a array limpio
    const data = Array.from(unicosMap.values());
    // 2. Fecha por defecto (solo por si el backend no manda fecha en una predicción nueva)
    const fechaDefault = new Date().toISOString().slice(0, 10);

    records = data.map(item => {
      // TRUCO: Si el backend trae fecha (viene de BD), usamos esa. Si no, usamos hoy.
      let fechaMostrada = fechaDefault;
      if (item.fecha) {
        fechaMostrada = item.fecha.slice(0, 10);
      }
      return {
        fecha: fechaMostrada,
        region: item.canton, // La clave del backend es 'canton'
        probabilidad: (item.probabilidad * 100).toFixed(2),
        nivel: item.nivel_riesgo,
        color: item.color
      };
    });

    // 3. Renderizamos la tabla
    renderTable();

  } catch (error) {
    console.error("Error cargando tabla:", error);
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#dc3545; padding:20px;">❌ Error conectando con el servidor. Intenta recargar la página.</td></tr>';
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

  rowsContainer.innerHTML = slice.map(r => `
    <tr>
      <td class="td-muted" style="padding:12px;">
        ${r.fecha}
      </td>

      <td class="td-strong" style="padding:12px;">
        ${r.region}
      </td>

      <td style="padding:12px;">
        <div style="display:flex; align-items:center; gap:8px">
          <div class="progress-track">
            <div style="width:${r.probabilidad}%; height:100%; background:${r.color}"></div>
          </div>
          <span>${r.probabilidad}%</span>
        </div>
      </td>

      <td style="padding:12px;">
        <span style="
          background: color-mix(in oklab, ${r.color}, transparent 88%);
          color:${r.color};
          padding:2px 8px;
          border-radius:4px;
          font-size:0.85em;
          font-weight:bold;
          border:1px solid ${r.color}">
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
function fmtPct(x) { return (x <= 1 ? (x * 100).toFixed(1) : x.toFixed(1)) + '%'; }

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
      ⚠️ Nivel de Probabilidad: <b style="color:${p.color}">${p.nivel_riesgo}</b><br>
      📊 Probabilidad estimada: <b>${probPct}</b><br>
      <br>
      <small style="color:#666">
        Análisis basado en patrones climáticos de los últimos 30 días.
      </small>
    </div>`;

  m.bindPopup(html);
  p._marker = m;
  predLayer.addLayer(m);
}
// --- NUEVA LÓGICA DE CONEXIÓN AL BACKEND (CORREGIDA) ---
async function cargarPrediccionesReales() {
  console.log("Conectando con el modelo de predicción sísmica...");
  setMapLoading(true, "Cargando predicciones…");

  try {
    // Llamada al endpoint de producción
    const response = await fetch('https://quakepredictec-backend.onrender.com/riesgo-sismico');

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const datosCrudos = await response.json();

    const unicosMap = new Map();
    datosCrudos.forEach(item => {
      // Usamos el nombre del cantón como clave única
      if (!unicosMap.has(item.canton)) {
        unicosMap.set(item.canton, item);
      }
    });
    // Convertimos el mapa limpio de vuelta a un array
    const datosReales = Array.from(unicosMap.values());

    // Ahora trabajamos con 'datosReales' (que ya está limpio)
    highProbAlerts = datosReales
      .filter(p => typeof p.probabilidad === "number" && p.probabilidad >= ALERT_THRESHOLD)
      .sort((a, b) => b.probabilidad - a.probabilidad);

    // badge = cantidad de alertas (Ahora mostrará el número correcto)
    newAlertsCount = highProbAlerts.length;
    updateAlertBadge();

    // render en la pestaña de alertas
    renderHighProbAlerts();
    console.log("Datos recibidos (Limpios):", datosReales);

    // Limpiamos capas anteriores si hubiera
    if (predLayer) predLayer.clearLayers();

    // Dibujamos cada predicción real en el mapa
    datosReales.forEach(prediccion => {
      addPrediccionToMap(prediccion);
    });

  } catch (error) {
    console.error("Error conectando al Backend:", error);
    // Puedes dejar el alert o quitarlo para no interrumpir al usuario en producción
    // alert("No se pudo conectar con el sistema de predicción.");
  } finally {
    setMapLoading(false);
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
    opacity: 0.90,
    attribution: '&copy; OpenStreetMap'
  }).addTo(mapEC);
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 18,
      opacity: 0.50,
      attribution: 'Esri, USGS | Physical Map'
    }
  ).addTo(mapEC);

  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 18,
      opacity: 0.75,
      attribution: 'Esri, USGS, NOAA'
    }
  ).addTo(mapEC);

  const ecRiskPolygons = {
    "type": "FeatureCollection",
    "features": []
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

    let html = '<div style="font-weight:700;margin-bottom:6px">Nivel de probabilidad estimada</div>';

    const items = [
      { label: 'Menor a 40%', color: colorMagnitude(3.5) }, // verde
      { label: 'Entre 40%-70%', color: colorMagnitude(5.0) }, // amarillo
      { label: 'Mayor a 70%', color: colorMagnitude(6.5) }  // rojo
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


const btnLogin = document.getElementById("btnLogin");
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
  if (btnLogin) btnLogin.style.display = logged ? "none" : "inline-block";
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
      const data = sortData(applyFilters());
      if (!data.length) {
      alert("No hay datos para descargar con los filtros actuales.");
      return;
    }
      const rows = [
        ["fecha", "ubicacion", "probabilidad_estimada_%", "nivel_probabilidad"]
      ];

      data.forEach(r => {
        rows.push([r.fecha, r.region, r.probabilidad, r.nivel]);
      });

      const csv = rows
        .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "quakepredictec_reportes.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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

// ====== ZOOM POR PROVINCIA (FILTRO MAPA) ======
const boundsPorProvincia = {
  "Azuay": [[-3.70, -79.20], [-2.40, -78.20]],
  "Bolívar": [[-2.10, -79.30], [-1.20, -78.70]],
  "Cañar": [[-2.90, -79.40], [-2.10, -78.60]],
  "Carchi": [[0.50, -78.40], [1.10, -77.60]],
  "Chimborazo": [[-2.10, -79.10], [-1.30, -78.30]],
  "Cotopaxi": [[-1.30, -78.90], [-0.50, -78.20]],
  "El Oro": [[-3.90, -80.10], [-3.00, -79.40]],
  "Esmeraldas": [[0.40, -80.20], [1.30, -78.70]],
  "Galápagos": [[-1.80, -92.10], [0.80, -89.20]],
  "Guayas": [[-2.90, -80.20], [-1.20, -79.10]],
  "Imbabura": [[0.00, -78.60], [0.70, -77.80]],
  "Loja": [[-5.10, -80.00], [-3.50, -78.70]],
  "Los Ríos": [[-2.10, -79.90], [-0.90, -79.10]],
  "Manabí": [[-1.90, -80.80], [0.10, -79.70]],
  "Morona Santiago": [[-3.70, -78.30], [-1.50, -76.60]],
  "Napo": [[-1.20, -78.00], [0.50, -76.60]],
  "Orellana": [[-1.40, -77.60], [0.70, -75.80]],
  "Pastaza": [[-2.60, -78.20], [-0.90, -76.30]],
  "Pichincha": [[-0.70, -79.10], [0.40, -77.80]],
  "Santa Elena": [[-2.50, -80.90], [-1.90, -80.30]],
  "Santo Domingo de los Tsáchilas": [[-0.70, -79.60], [-0.10, -78.90]],
  "Sucumbíos": [[-0.40, -77.60], [0.70, -75.80]],
  "Tungurahua": [[-1.60, -78.90], [-1.00, -78.20]],
  "Zamora Chinchipe": [[-4.90, -79.20], [-3.00, -77.30]],
};

// Ecuador completo (para "Todas")
const ECUADOR_BOUNDS = [[-5.1, -81.2], [1.6, -75.0]];

function zoomAProvincia(nombre) {
  if (!mapEC) return;

  if (nombre === "all") {
    mapEC.fitBounds(ECUADOR_BOUNDS, { padding: [20, 20] });
    return;
  }

  const b = boundsPorProvincia[nombre];
  if (!b) return;

  mapEC.fitBounds(b, { padding: [20, 20] });
}

// Listener del filtro Provincia (Mapa)
document.addEventListener("DOMContentLoaded", () => {
  const selProv = document.getElementById("fProvincia");
  if (selProv) {
    selProv.addEventListener("change", () => {
      // Si el mapa aún no está inicializado, lo inicializa
      if (!mapEC) initMapaEC();

      // Espera un tick para que Leaflet tenga tamaño correcto
      setTimeout(() => {
        mapEC.invalidateSize();
        zoomAProvincia(selProv.value);
      }, 50);
    });
  }
});

// ====== LOADING OVERLAY MAPA ======
function setMapLoading(isLoading, msg) {
  const overlay = document.getElementById("mapLoading");
  if (!overlay) return;

  if (isLoading) {
    overlay.style.display = "flex";
    if (msg) {
      const title = overlay.querySelector(".map-loading-card div:nth-child(2)");
      if (title) title.textContent = msg;
    }
  } else {
    overlay.style.display = "none";
  }
}

// ====== ALERTAS POR ALTA PROBABILIDAD ======
const alertsEl = document.getElementById('alerts');

// umbral: 70% = 0.70
const ALERT_THRESHOLD = 0.70;

// aquí guardamos las predicciones “altas”
let highProbAlerts = [];

// Renderiza la lista en la pestaña Alertas
function renderHighProbAlerts() {
  if (!alertsEl) return;

  if (!highProbAlerts.length) {
    alertsEl.innerHTML = `
      <li class="alert-item">
        No hay predicciones con probabilidad alta (≥ 70%) en este momento.
      </li>`;
    return;
  }

  alertsEl.classList.add('alert-list');
  alertsEl.innerHTML = highProbAlerts.map(p => {
    const probPct = (p.probabilidad * 100).toFixed(1) + '%';
    return `
       <li class="alert-item"
        data-lat="${p.lat}"
        data-lon="${p.lon}"
        data-canton="${p.canton}"
        style="border-left:6px solid ${p.color}; cursor:pointer;">
      <strong>${p.canton}</strong><br>
      <span style="color:var(--muted);font-size:12px">
        Nivel de probabilidad: <b style="color:${p.color}">${p.nivel_riesgo}</b> — ${probPct}
      </span>
    </li>
  `;
  }).join('');
}
// Click en una alerta -> ir al mapa y enfocar el punto
document.addEventListener("click", (e) => {
  const item = e.target.closest("#alerts .alert-item");
  if (!item) return;

  const lat = parseFloat(item.dataset.lat);
  const lon = parseFloat(item.dataset.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return;

  // 1) activar pestaña mapa
  tabs.forEach(x => x.classList.remove('active'));
  const tabMapa = document.querySelector('.tab[data-tab="mapa"]');
  if (tabMapa) tabMapa.classList.add('active');

  // 2) mostrar vista mapa y ocultar las otras
  Object.values(views).forEach(v => v.hidden = true);
  views.mapa.hidden = false;

  // 3) asegurar mapa inicializado
  setTimeout(() => {
    if (!mapEC) initMapaEC();
    mapEC.invalidateSize();

    // 4) zoom y centrar
    mapEC.setView([lat, lon], 9, { animate: true });

    // 5) abrir popup del marcador correcto (si existe)
    const canton = item.dataset.canton;
    const pred = highProbAlerts.find(p => p.canton === canton && p._marker);
    if (pred?._marker) {
      pred._marker.openPopup();
    }
  }, 200);
});

