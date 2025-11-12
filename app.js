// Tabs
const tabs = document.querySelectorAll('.tab');
const views = {
    dashboard: document.getElementById('view-dashboard'),
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

// KPIs
function setKPIs() {
    const p = (8 + rand(-2, 3)).toFixed(1);
    document.getElementById('kpiProb').textContent = p + '%';
    document.getElementById('kpiCount').textContent = sismos.reduce((a, b) => a + b, 0);
    document.getElementById('kpiRain').textContent = (lluvia.reduce((a, b) => a + b, 0)) + ' mm';
    document.getElementById('kpiAlerts').textContent = (p > 11.5 ? 2 : 1);
}
setKPIs();

// Line+bar chart
function drawLineChart() {
    const svg = document.getElementById('lineChart');
    const w = 600, h = 220, pad = 30;
    const maxY = Math.max(...sismos, ...lluvia);
    function x(i) { return pad + i * ((w - 2 * pad) / (days - 1)); }
    function y(v) { return h - pad - (v / maxY) * (h - 2 * pad); }
    svg.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const gy = pad + i * ((h - 2 * pad) / 4);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', pad); line.setAttribute('x2', w - pad);
        line.setAttribute('y1', gy); line.setAttribute('y2', gy);
        line.setAttribute('stroke', '#1f2937'); line.setAttribute('stroke-width', 1);
        svg.appendChild(line);
    }
    const bw = (w - 2 * pad) / days * 0.55;
    lluvia.forEach((v, i) => {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x(i) - bw / 2);
        rect.setAttribute('y', y(v));
        rect.setAttribute('width', bw);
        rect.setAttribute('height', (h - pad) - y(v));
        rect.setAttribute('rx', 2);
        rect.setAttribute('fill', '#f59e0b');
        rect.setAttribute('opacity', 0.75);
        svg.appendChild(rect);
    });
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let d = '';
    sismos.forEach((v, i) => { d += (i === 0 ? 'M' : 'L') + x(i) + ' ' + y(v) + ' '; });
    path.setAttribute('d', d.trim());
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#22d3ee');
    path.setAttribute('stroke-width', 2.5);
    path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path);
}
drawLineChart();

// Table
const regiones = ['Costa', 'Sierra', 'Oriente', 'Insular'];
function genRow(i) {
    const fecha = new Date(Date.now() - (i * 86400000)).toISOString().slice(0, 10);
    const reg = regiones[i % regiones.length];
    const count = Math.max(0, Math.round(rand(0, 5) + (reg === 'Costa' ? 1 : 0)));
    const rain = Math.round(rand(0, 150));
    const pres = Math.round(1000 + rand(-18, 18));
    const riesgo = Math.round(rand(5, 24) * 10) / 10 + '%';
    return `<tr>
        <td style='padding:8px;border-bottom:1px solid #1f2937'>${fecha}</td>
        <td style='padding:8px;border-bottom:1px solid #1f2937'>${reg}</td>
        <td style='padding:8px;border-bottom:1px solid #1f2937'>${count}</td>
        <td style='padding:8px;border-bottom:1px solid #1f2937'>${rain}</td>
        <td style='padding:8px;border-bottom:1px solid #1f2937'>${pres}</td>
        <td style='padding:8px;border-bottom:1px solid #1f2937'>${riesgo}</td>
      </tr>`
}
document.getElementById('rows').innerHTML = Array.from({ length: 40 }, (_, i) => genRow(i)).join('');

// Alerts
const alertsEl = document.getElementById('alerts');
function renderAlerts() {
    alertsEl.innerHTML = `
        <li style='margin:8px 0;padding:10px;border:1px solid #1f2937;border-radius:10px;background:#0b1220'>
          <strong>Costa norte</strong> — Riesgo alto en 7 días (umbral > 12%). <span class='badge' style='border-color:#f59e0b;color:#f59e0b'>Lluvia 150mm/7d</span>
        </li>
        <li style='margin:8px 0;padding:10px;border:1px solid #1f2937;border-radius:10px;background:#0b1220'>
          <strong>Sierra centro</strong> — Riesgo moderado. <span class='badge' style='border-color:#22d3ee;color:#22d3ee'>Sismicidad local ↑</span>
        </li>`;
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

// Simulated updates
document.getElementById('btnSimular').addEventListener('click', () => {
    for (let i = 0; i < days; i++) { sismos[i] = Math.max(0, Math.round(rand(0, 6) + Math.sin(i / 2 + rand(-.3, .3)) * 2)); }
    for (let i = 0; i < days; i++) { lluvia[i] = Math.max(0, Math.round(rand(0, 30) + Math.sin(i / 3 + rand(-.2, .2)) * 12)); }
    drawLineChart(); setKPIs(); renderAlerts();
});