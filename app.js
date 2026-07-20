import { calcularPrecio, costoOperativoPorKm, gananciaReal as calcularGananciaReal } from './src/pricing.js';
import { TripTracker } from './src/distance.js';
import { guardarViaje, resumenDeHoy, borrarViajes } from './src/tripStore.js';
import { buscarSugerencias, reverseGeocode, routeDistance } from './src/geocode.js';

const CONFIG_KEY = 'uber-tarifas:config';
const $ = (id) => document.getElementById(id);

function cargarConfig() {
  const raw = localStorage.getItem(CONFIG_KEY);
  return raw
    ? JSON.parse(raw)
    : {
        tarifaBase: null,
        costoPorKm: null,
        costoPorMinuto: 0,
        tarifaMinima: 0,
        comisionPct: 0,
        precioPorGalon: 338.1,
        rendimientoKmPorGalon: 68,
        otrosGastosPorKm: 0,
      };
}

function guardarConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

let config = cargarConfig();
let ultimoResultado = null;

function pintarConfigEnFormulario() {
  $('cfg-base').value = config.tarifaBase ?? '';
  $('cfg-km').value = config.costoPorKm ?? '';
  $('cfg-min').value = config.costoPorMinuto ?? '';
  $('cfg-minima').value = config.tarifaMinima ?? '';
  $('cfg-comision').value = config.comisionPct ?? '';
  $('cfg-precio-combustible').value = config.precioPorGalon ?? 302.5;
  $('cfg-rendimiento').value = config.rendimientoKmPorGalon ?? '';
  $('cfg-otros-gastos').value = config.otrosGastosPorKm ?? '';

  const opcionCoincide = Array.from($('cfg-combustible').options).some(
    (o) => o.value !== 'custom' && parseFloat(o.value) === config.precioPorGalon,
  );
  $('cfg-combustible').value = opcionCoincide ? String(config.precioPorGalon) : 'custom';
}

$('cfg-combustible').addEventListener('change', () => {
  const v = $('cfg-combustible').value;
  if (v !== 'custom') {
    $('cfg-precio-combustible').value = v;
  }
});

function formatoRD(n) {
  return `RD$${n.toFixed(2)}`;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function tarifaConfigurada() {
  return typeof config.tarifaBase === 'number' && typeof config.costoPorKm === 'number';
}

// --- Config panel ---
$('btn-config').addEventListener('click', () => {
  $('panel-config').classList.toggle('hidden');
});

pintarConfigEnFormulario();

$('btn-guardar-config').addEventListener('click', () => {
  const tarifaBase = parseFloat($('cfg-base').value);
  const costoPorKm = parseFloat($('cfg-km').value);
  const costoPorMinuto = parseFloat($('cfg-min').value) || 0;
  const tarifaMinima = parseFloat($('cfg-minima').value) || 0;
  const comisionPct = parseFloat($('cfg-comision').value) || 0;
  const precioPorGalon = parseFloat($('cfg-precio-combustible').value) || 0;
  const rendimientoRaw = parseFloat($('cfg-rendimiento').value);
  const rendimientoKmPorGalon = Number.isNaN(rendimientoRaw) || rendimientoRaw <= 0 ? null : rendimientoRaw;
  const otrosGastosPorKm = parseFloat($('cfg-otros-gastos').value) || 0;

  const msg = $('config-msg');
  if (Number.isNaN(tarifaBase) || Number.isNaN(costoPorKm)) {
    msg.textContent = 'Tarifa base y costo por km son obligatorios.';
    msg.className = 'msg error';
    return;
  }

  config = {
    tarifaBase,
    costoPorKm,
    costoPorMinuto,
    tarifaMinima,
    comisionPct,
    precioPorGalon,
    rendimientoKmPorGalon,
    otrosGastosPorKm,
  };
  guardarConfig(config);
  msg.textContent = 'Tarifa guardada.';
  msg.className = 'msg ok';
});

// --- Tabs ---
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
    tab.classList.add('active');
    document.querySelector(`.tab-panel[data-panel="${tab.dataset.tab}"]`).classList.remove('hidden');
    if (tab.dataset.tab === 'ruta' && mapaRuta) {
      setTimeout(() => mapaRuta.invalidateSize(), 50);
    }
  });
});

// --- Resultado ---
function mostrarResultado({ km, minutos }) {
  if (!tarifaConfigurada()) {
    alert('Primero configurá tu tarifa (⚙️ arriba a la derecha).');
    $('panel-config').classList.remove('hidden');
    return null;
  }

  const r = calcularPrecio({
    km,
    minutos,
    tarifaBase: config.tarifaBase,
    costoPorKm: config.costoPorKm,
    costoPorMinuto: config.costoPorMinuto,
    tarifaMinima: config.tarifaMinima,
    comisionPct: config.comisionPct,
  });

  $('r-km').textContent = `${km.toFixed(2)} km`;
  $('r-min').textContent = `${minutos.toFixed(1)} min`;
  $('r-precio').textContent = formatoRD(r.precio);
  $('r-comision').textContent = formatoRD(r.comision);
  $('r-neto').textContent = formatoRD(r.neto);

  let gastoOperativo = null;
  let real = null;
  if (typeof config.rendimientoKmPorGalon === 'number' && config.rendimientoKmPorGalon > 0) {
    const gastoPorKm = costoOperativoPorKm({
      precioPorGalon: config.precioPorGalon,
      rendimientoKmPorGalon: config.rendimientoKmPorGalon,
      otrosGastosPorKm: config.otrosGastosPorKm,
    });
    gastoOperativo = round2(gastoPorKm * km);
    real = calcularGananciaReal({ neto: r.neto, km, gastoOperativoPorKm: gastoPorKm });
    $('r-gasto').textContent = formatoRD(gastoOperativo);
    $('r-real').textContent = formatoRD(real);
    $('r-gasto-row').classList.remove('hidden');
    $('r-real-row').classList.remove('hidden');
  } else {
    $('r-gasto-row').classList.add('hidden');
    $('r-real-row').classList.add('hidden');
  }

  $('panel-resultado').classList.remove('hidden');

  ultimoResultado = {
    km,
    minutos,
    ...r,
    gastoOperativo,
    gananciaReal: real,
    fecha: new Date().toISOString(),
  };
  return ultimoResultado;
}

$('btn-guardar-viaje').addEventListener('click', () => {
  if (!ultimoResultado) return;
  guardarViaje(localStorage, ultimoResultado);
  ultimoResultado = null;
  $('panel-resultado').classList.add('hidden');
  pintarResumen();
});

// --- Modo manual ---
$('btn-manual-calcular').addEventListener('click', () => {
  const km = parseFloat($('manual-km').value);
  const minutos = parseFloat($('manual-min').value) || 0;
  const msg = $('manual-msg');
  if (Number.isNaN(km) || km < 0) {
    msg.textContent = 'Ingresá una distancia válida.';
    msg.className = 'msg error';
    return;
  }
  msg.textContent = '';
  mostrarResultado({ km, minutos });
});

// --- Modo origen/destino ---
let origenSeleccionado = null;
let destinoSeleccionado = null;
let mapaRuta = null;
let capaRuta = null;

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function etiquetaCorta(displayName) {
  return displayName.split(',').slice(0, 2).join(',');
}

function renderSugerencias(listId, resultados, inputEl, onSeleccionar) {
  const ul = $(listId);
  if (!resultados.length) {
    ul.classList.add('hidden');
    ul.innerHTML = '';
    return;
  }
  ul.innerHTML = resultados.map((r, i) => `<li data-i="${i}">${r.displayName}</li>`).join('');
  ul.classList.remove('hidden');
  ul.querySelectorAll('li').forEach((li) => {
    li.addEventListener('click', () => {
      const r = resultados[Number(li.dataset.i)];
      inputEl.value = etiquetaCorta(r.displayName);
      onSeleccionar(r);
      ul.classList.add('hidden');
      ul.innerHTML = '';
    });
  });
}

function attachAutocomplete(inputId, listId, onSeleccionar) {
  const input = $(inputId);
  const buscar = debounce(async () => {
    const q = input.value.trim();
    if (q.length < 3) {
      $(listId).classList.add('hidden');
      return;
    }
    try {
      const resultados = await buscarSugerencias(q);
      renderSugerencias(listId, resultados, input, onSeleccionar);
    } catch {
      // silencioso: se reintenta con el siguiente tipeo
    }
  }, 450);

  input.addEventListener('input', () => {
    onSeleccionar(null); // el texto cambió: invalida la seleccion anterior
    buscar();
  });
}

attachAutocomplete('ruta-origen', 'sug-origen', (sel) => {
  origenSeleccionado = sel;
});
attachAutocomplete('ruta-destino', 'sug-destino', (sel) => {
  destinoSeleccionado = sel;
});

$('btn-usar-ubicacion').addEventListener('click', () => {
  if (!navigator.geolocation) {
    $('ruta-msg').textContent = 'Este navegador no soporta GPS.';
    $('ruta-msg').className = 'msg error';
    return;
  }
  const btn = $('btn-usar-ubicacion');
  btn.disabled = true;
  btn.textContent = '…';

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      try {
        const r = await reverseGeocode({ lat, lon });
        $('ruta-origen').value = etiquetaCorta(r.displayName);
        origenSeleccionado = r;
      } catch {
        $('ruta-origen').value = 'Mi ubicación actual (GPS)';
        origenSeleccionado = { lat, lon, displayName: 'Mi ubicación actual' };
      }
      $('sug-origen').classList.add('hidden');
      btn.disabled = false;
      btn.textContent = '📍';
    },
    (err) => {
      $('ruta-msg').textContent = `No pude acceder al GPS: ${err.message}`;
      $('ruta-msg').className = 'msg error';
      btn.disabled = false;
      btn.textContent = '📍';
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
});

function mostrarMapa(origen, destino, geometry) {
  const el = $('mapa-ruta');
  el.classList.remove('hidden');

  if (!mapaRuta) {
    mapaRuta = L.map('mapa-ruta');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapaRuta);
  }
  if (capaRuta) {
    mapaRuta.removeLayer(capaRuta);
  }

  const puntos = geometry
    ? geometry.map(([lon, lat]) => [lat, lon])
    : [[origen.lat, origen.lon], [destino.lat, destino.lon]];

  capaRuta = L.featureGroup([
    L.marker([origen.lat, origen.lon]).bindPopup('Origen'),
    L.marker([destino.lat, destino.lon]).bindPopup('Destino'),
    L.polyline(puntos, { color: '#1fd15a', weight: 4 }),
  ]).addTo(mapaRuta);

  setTimeout(() => {
    mapaRuta.invalidateSize();
    mapaRuta.fitBounds(capaRuta.getBounds(), { padding: [24, 24] });
  }, 50);
}

$('btn-ruta-calcular').addEventListener('click', async () => {
  const msg = $('ruta-msg');

  if (!origenSeleccionado || !destinoSeleccionado) {
    msg.textContent = 'Elegí el origen y el destino de la lista de sugerencias (o usá 📍 para tu ubicación actual).';
    msg.className = 'msg error';
    return;
  }

  msg.textContent = 'Calculando ruta...';
  msg.className = 'msg';

  try {
    const { km, minutos, geometry } = await routeDistance(origenSeleccionado, destinoSeleccionado);
    msg.textContent = `${km.toFixed(1)} km, ${Math.round(minutos)} min de recorrido`;
    msg.className = 'msg ok';
    mostrarMapa(origenSeleccionado, destinoSeleccionado, geometry);
    mostrarResultado({ km, minutos });
  } catch (err) {
    msg.textContent = err.message || 'No se pudo calcular la ruta.';
    msg.className = 'msg error';
  }
});

// --- Modo GPS en vivo ---
const tracker = new TripTracker();
let watchId = null;
let liveInterval = null;
let inicioViaje = null;

function refrescarLive() {
  const km = tracker.totalKm;
  const minutos = (Date.now() - inicioViaje) / 60000;
  $('gps-km').textContent = km.toFixed(2);
  $('gps-min').textContent = minutos.toFixed(1);
  if (tarifaConfigurada()) {
    const r = calcularPrecio({
      km,
      minutos,
      tarifaBase: config.tarifaBase,
      costoPorKm: config.costoPorKm,
      costoPorMinuto: config.costoPorMinuto,
      tarifaMinima: config.tarifaMinima,
      comisionPct: config.comisionPct,
    });
    $('gps-precio').textContent = formatoRD(r.precio);
  }
}

$('btn-gps-start').addEventListener('click', () => {
  if (!navigator.geolocation) {
    $('gps-msg').textContent = 'Este navegador no soporta GPS.';
    $('gps-msg').className = 'msg error';
    return;
  }
  if (!tarifaConfigurada()) {
    alert('Primero configurá tu tarifa (⚙️ arriba a la derecha).');
    $('panel-config').classList.remove('hidden');
    return;
  }

  tracker.reset();
  inicioViaje = Date.now();
  $('gps-msg').textContent = 'Rastreando viaje...';
  $('gps-msg').className = 'msg ok';
  $('btn-gps-start').classList.add('hidden');
  $('btn-gps-stop').classList.remove('hidden');
  $('panel-resultado').classList.add('hidden');

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      tracker.addPoint({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      });
    },
    (err) => {
      $('gps-msg').textContent = `Error de GPS: ${err.message}`;
      $('gps-msg').className = 'msg error';
    },
    { enableHighAccuracy: true, maximumAge: 0 },
  );
  liveInterval = setInterval(refrescarLive, 1000);
});

$('btn-gps-stop').addEventListener('click', () => {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  if (liveInterval != null) clearInterval(liveInterval);
  watchId = null;
  liveInterval = null;

  $('btn-gps-start').classList.remove('hidden');
  $('btn-gps-stop').classList.add('hidden');
  $('gps-msg').textContent = 'Viaje finalizado.';
  $('gps-msg').className = 'msg ok';

  const km = tracker.totalKm;
  const minutos = (Date.now() - inicioViaje) / 60000;
  mostrarResultado({ km, minutos });
});

// --- Resumen de hoy ---
function pintarResumen() {
  const r = resumenDeHoy(JSON.parse(localStorage.getItem('uber-tarifas:viajes') || '[]'));
  $('resumen-hoy').innerHTML = `
    <div><strong>${r.cantidadViajes}</strong><small>viajes</small></div>
    <div><strong>${r.km.toFixed(1)} km</strong><small>recorridos</small></div>
    <div><strong>${formatoRD(r.neto)}</strong><small>ganancia neta (sin gastos)</small></div>
    <div><strong>${formatoRD(r.gananciaReal)}</strong><small>ganancia real (con combustible)</small></div>
  `;
}

$('btn-borrar-historial').addEventListener('click', () => {
  if (confirm('¿Borrar todo el historial de viajes de este celular?')) {
    borrarViajes(localStorage);
    pintarResumen();
  }
});

pintarResumen();

// --- PWA: registrar service worker ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
