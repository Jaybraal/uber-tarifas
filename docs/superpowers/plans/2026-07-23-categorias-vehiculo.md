# Categorías de vehículo + WhatsApp + fix piso GPS — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** agregar selector de categoría de vehículo (Mototaxi/Taxi/Van) que autocompleta tarifa y costo operativo, un botón de compartir cotización por WhatsApp, y corregir que el modo GPS en vivo arranque mostrando la tarifa mínima como piso en vez de crecer desde la tarifa base.

**Architecture:** sin cambios de arquitectura. Dos módulos puros nuevos en `src/` (mismo patrón que `pricing.js`/`distance.js`, con `*.test.js` corrido por `node --test`), wiring de glue code en `app.js`/`index.html`/`style.css`/`sw.js`. Ver diseño completo en `docs/superpowers/specs/2026-07-23-categorias-vehiculo-design.md`.

**Tech Stack:** HTML/CSS/JS vanilla, ES modules, `node --test` + `node:assert/strict`.

## Global Constraints

- No agregar dependencias externas nuevas por CDN (la PWA debe seguir funcionando offline vía `sw.js`).
- Todo campo de tarifa/vehículo que aplique un preset de categoría sigue siendo editable después — nunca queda bloqueado.
- No fabricar cifras como si fueran datos reales: los presets son puntos de partida, mismo principio que el resto de la app.
- Toda función pura nueva en `src/` lleva su `*.test.js` corrido con `node --test src/*.test.js`.
- Español en todo el copy, mismo tono directo ya usado en el resto de la app.
- No tocar el plan viejo (`docs/superpowers/plans/2026-07-21-multi-conductor.md`, rebrand/activación) ni la lógica de cálculo existente en `pricing.js` más allá del punto exacto que pide el fix de GPS (Task 5).

---

## Estructura de archivos

- Crear: `src/categorias.js` + `src/categorias.test.js` — datos de las 3 categorías y `presetPara(id)`.
- Crear: `src/whatsapp.js` + `src/whatsapp.test.js` — mensaje de cotización para compartir.
- Modificar: `index.html` — dos contenedores del selector de categoría, botón de WhatsApp.
- Modificar: `app.js` — import de los módulos nuevos, `categoria` en defaults/guardado, render+wiring del selector, handler de WhatsApp, fix del piso en GPS en vivo.
- Modificar: `style.css` — `.cat-tabs`/`.cat-tab`/`.cat-icon`, `.btn-whatsapp`.
- Modificar: `sw.js` — agregar los 2 archivos nuevos al app shell, bump de versión de cache.

---

### Task 1: Módulo puro de categorías (`src/categorias.js`)

**Files:**
- Create: `src/categorias.js`
- Test: `src/categorias.test.js`

**Interfaces:**
- Produces: `CATEGORIAS: Array<{id, label, icono, tarifaBase, costoPorKm, costoPorMinuto, tarifaMinima, precioPorGalon, rendimientoKmPorGalon, otrosGastosPorKm}>`, `presetPara(id: string) => objeto de CATEGORIAS (cae a la de id 'taxi' si no matchea)`. Task 3 importa ambos desde `./categorias.js`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/categorias.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIAS, presetPara } from './categorias.js';

test('CATEGORIAS tiene las 3 categorias esperadas, en orden', () => {
  assert.deepEqual(CATEGORIAS.map((c) => c.id), ['mototaxi', 'taxi', 'van']);
});

test('cada categoria trae todos los campos de tarifa y vehiculo', () => {
  const campos = [
    'id', 'label', 'icono', 'tarifaBase', 'costoPorKm', 'costoPorMinuto',
    'tarifaMinima', 'precioPorGalon', 'rendimientoKmPorGalon', 'otrosGastosPorKm',
  ];
  for (const c of CATEGORIAS) {
    for (const campo of campos) {
      assert.ok(campo in c, `falta ${campo} en ${c.id}`);
    }
  }
});

test('presetPara devuelve la categoria pedida por id', () => {
  assert.equal(presetPara('mototaxi').id, 'mototaxi');
  assert.equal(presetPara('van').id, 'van');
  assert.equal(presetPara('taxi').tarifaBase, 50);
});

test('presetPara cae a taxi si el id no existe (config vieja sin categoria)', () => {
  assert.equal(presetPara('bicicleta').id, 'taxi');
  assert.equal(presetPara(undefined).id, 'taxi');
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `cd /Users/branel/Desktop/uber-tarifas && node --test src/categorias.test.js`
Expected: FAIL — `Cannot find module './categorias.js'`.

- [ ] **Step 3: Implementación mínima**

Crear `src/categorias.js`:

```js
export const CATEGORIAS = [
  {
    id: 'mototaxi',
    label: 'Mototaxi / Delivery',
    icono: '🏍️',
    tarifaBase: 10,
    costoPorKm: 25,
    costoPorMinuto: 3,
    tarifaMinima: 10,
    precioPorGalon: 302.5, // Gasolina Regular
    rendimientoKmPorGalon: 144, // ~38 km/l
    otrosGastosPorKm: 1.5,
  },
  {
    id: 'taxi',
    label: 'Taxi / Sedán',
    icono: '🚗',
    tarifaBase: 50,
    costoPorKm: 35,
    costoPorMinuto: 5,
    tarifaMinima: 50,
    precioPorGalon: 338.1, // Gasolina Premium
    rendimientoKmPorGalon: 68, // ~18 km/l
    otrosGastosPorKm: 4,
  },
  {
    id: 'van',
    label: 'Van / Grupos',
    icono: '🚐',
    tarifaBase: 75,
    costoPorKm: 65,
    costoPorMinuto: 10,
    tarifaMinima: 75,
    precioPorGalon: 254.8, // Gasoil Regular
    rendimientoKmPorGalon: 30, // ~8 km/l
    otrosGastosPorKm: 9,
  },
];

export function presetPara(id) {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS.find((c) => c.id === 'taxi');
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `node --test src/categorias.test.js`
Expected: `# pass 4`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/categorias.js src/categorias.test.js
git commit -m "Agregar modulo puro de categorias de vehiculo (mototaxi/taxi/van)"
```

---

### Task 2: Módulo puro de mensaje de WhatsApp (`src/whatsapp.js`)

**Files:**
- Create: `src/whatsapp.js`
- Test: `src/whatsapp.test.js`

**Interfaces:**
- Produces: `mensajeCotizacion({ origen: string|null, destino: string|null, categoriaLabel: string, monto: number }) => string`. Task 4 lo importa desde `./whatsapp.js`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/whatsapp.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mensajeCotizacion } from './whatsapp.js';

test('arma el mensaje con origen y destino cuando estan presentes', () => {
  const m = mensajeCotizacion({
    origen: 'Ágora Mall',
    destino: 'Aeropuerto Las Américas',
    categoriaLabel: 'Taxi / Sedán',
    monto: 350.5,
  });
  assert.equal(
    m,
    '¡Hola! La tarifa estimada para tu viaje (Ágora Mall a Aeropuerto Las Américas) en Taxi / Sedán es de RD$350.50. ¿Confirmamos?',
  );
});

test('omite el tramo si falta origen o destino (modo GPS o manual)', () => {
  const m = mensajeCotizacion({ origen: null, destino: null, categoriaLabel: 'Mototaxi / Delivery', monto: 120 });
  assert.equal(m, '¡Hola! La tarifa estimada para tu viaje en Mototaxi / Delivery es de RD$120.00. ¿Confirmamos?');
});

test('omite el tramo si solo uno de los dos esta presente', () => {
  const m = mensajeCotizacion({ origen: 'Ágora Mall', destino: null, categoriaLabel: 'Van / Grupos', monto: 500 });
  assert.equal(m, '¡Hola! La tarifa estimada para tu viaje en Van / Grupos es de RD$500.00. ¿Confirmamos?');
});

test('redondea el monto a 2 decimales', () => {
  const m = mensajeCotizacion({ origen: null, destino: null, categoriaLabel: 'Taxi / Sedán', monto: 99.999 });
  assert.equal(m, '¡Hola! La tarifa estimada para tu viaje en Taxi / Sedán es de RD$100.00. ¿Confirmamos?');
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `node --test src/whatsapp.test.js`
Expected: FAIL — `Cannot find module './whatsapp.js'`.

- [ ] **Step 3: Implementación mínima**

Crear `src/whatsapp.js`:

```js
export function mensajeCotizacion({ origen, destino, categoriaLabel, monto }) {
  const tramo = origen && destino ? ` (${origen} a ${destino})` : '';
  return `¡Hola! La tarifa estimada para tu viaje${tramo} en ${categoriaLabel} es de RD$${monto.toFixed(2)}. ¿Confirmamos?`;
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `node --test src/whatsapp.test.js`
Expected: `# pass 4`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/whatsapp.js src/whatsapp.test.js
git commit -m "Agregar modulo puro de mensaje de cotizacion para WhatsApp"
```

---

### Task 3: Selector de categoría en la UI (config + conmutador rápido)

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `style.css`
- Modify: `sw.js`

**Interfaces:**
- Consumes: `CATEGORIAS`, `presetPara` de `./src/categorias.js` (Task 1).
- Produces: `config.categoria: string` persistido en `localStorage`; funciones `seleccionarCategoria(id)`, `pintarSelectorCategoria(containerId)`, `pintarActivoCategoria()` en `app.js` (usadas también por Task 4 indirectamente vía `config.categoria`).

- [ ] **Step 1: Agregar los dos contenedores del selector en `index.html`**

Buscar:

```html
        moto), que reemplace estos datos por los de su propio vehículo.
      </p>
      <div class="grid-2">
        <label>Marca y modelo (opcional)
```

Reemplazar por:

```html
        moto), que reemplace estos datos por los de su propio vehículo.
      </p>
      <div id="cat-tabs-config" class="cat-tabs" role="tablist"></div>
      <div class="grid-2">
        <label>Marca y modelo (opcional)
```

Buscar:

```html
      </div>
    </section>

    <nav class="tabs" role="tablist">
      <button class="tab active" data-tab="ruta" role="tab">Origen → Destino</button>
```

Reemplazar por:

```html
      </div>
    </section>

    <div id="cat-tabs-quick" class="cat-tabs" role="tablist"></div>
    <nav class="tabs" role="tablist">
      <button class="tab active" data-tab="ruta" role="tab">Origen → Destino</button>
```

- [ ] **Step 2: Agregar estilos `.cat-tabs`/`.cat-tab`/`.cat-icon` en `style.css`**

Agregar al final del archivo:

```css
.cat-tabs {
  display: flex;
  gap: 6px;
  background: var(--card);
  border: 1px solid var(--border);
  padding: 5px;
  border-radius: 16px;
  margin-bottom: 14px;
}

.cat-tab {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--muted);
  border-radius: 12px;
  padding: 10px 4px;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  white-space: normal;
  line-height: 1.25;
  transition: background-color 0.15s, color 0.15s, box-shadow 0.15s;
}

.cat-tab .cat-icon {
  font-size: 1.3rem;
  line-height: 1;
}

.cat-tab.active {
  background: var(--accent);
  color: var(--accent-ink);
  box-shadow: 0 6px 16px var(--accent-glow);
}
```

- [ ] **Step 3: Importar el módulo nuevo en `app.js`**

Buscar la línea 1 de `app.js`:

```js
import { calcularPrecio, costoOperativoPorKm, costoFijoPorKm, gananciaReal as calcularGananciaReal } from './src/pricing.js';
import { TripTracker } from './src/distance.js';
import { guardarViaje, resumenDeHoy, borrarViajes } from './src/tripStore.js';
import { buscarSugerencias, reverseGeocode, routeDistance } from './src/geocode.js';
```

Reemplazar por (se agrega una línea):

```js
import { calcularPrecio, costoOperativoPorKm, costoFijoPorKm, gananciaReal as calcularGananciaReal } from './src/pricing.js';
import { TripTracker } from './src/distance.js';
import { guardarViaje, resumenDeHoy, borrarViajes } from './src/tripStore.js';
import { buscarSugerencias, reverseGeocode, routeDistance } from './src/geocode.js';
import { CATEGORIAS, presetPara } from './src/categorias.js';
```

- [ ] **Step 4: Agregar `categoria` a los defaults de `cargarConfig()`**

Buscar:

```js
        vehiculo: 'Honda Fit Hybrid',
        placa: '',
        tarifaBase: 60,
```

Reemplazar por:

```js
        categoria: 'taxi',
        vehiculo: 'Honda Fit Hybrid',
        placa: '',
        tarifaBase: 60,
```

- [ ] **Step 5: Agregar las funciones de render/selección del selector**

Buscar:

```js
$('cfg-combustible').addEventListener('change', () => {
  const v = $('cfg-combustible').value;
  if (v !== 'custom') {
    $('cfg-precio-combustible').value = v;
  }
});

function formatoRD(n) {
```

Reemplazar por:

```js
$('cfg-combustible').addEventListener('change', () => {
  const v = $('cfg-combustible').value;
  if (v !== 'custom') {
    $('cfg-precio-combustible').value = v;
  }
});

function pintarSelectorCategoria(containerId) {
  const cont = $(containerId);
  cont.innerHTML = CATEGORIAS.map(
    (c) => `<button class="cat-tab" data-cat="${c.id}" type="button" role="tab"><span class="cat-icon">${c.icono}</span>${c.label}</button>`,
  ).join('');
  cont.querySelectorAll('.cat-tab').forEach((btn) => {
    btn.addEventListener('click', () => seleccionarCategoria(btn.dataset.cat));
  });
}

function pintarActivoCategoria() {
  document.querySelectorAll('.cat-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cat === config.categoria);
  });
}

function seleccionarCategoria(id) {
  const preset = presetPara(id);
  config = {
    ...config,
    categoria: preset.id,
    tarifaBase: preset.tarifaBase,
    costoPorKm: preset.costoPorKm,
    costoPorMinuto: preset.costoPorMinuto,
    tarifaMinima: preset.tarifaMinima,
    precioPorGalon: preset.precioPorGalon,
    rendimientoKmPorGalon: preset.rendimientoKmPorGalon,
    otrosGastosPorKm: preset.otrosGastosPorKm,
  };
  guardarConfig(config);
  pintarConfigEnFormulario();
  pintarActivoCategoria();
  if (resultadoBase) {
    calcularYPintarResultado();
  }
}

function formatoRD(n) {
```

**Nota:** `seleccionarCategoria` referencia `resultadoBase` y `calcularYPintarResultado`, declarados más abajo en el archivo (línea ~159 en adelante) — es seguro porque solo se ejecutan al hacer click en un botón, ya con todo el módulo cargado (las declaraciones `function`/`let` de nivel de módulo ya corrieron antes de que el usuario pueda hacer click).

- [ ] **Step 6: Pintar los selectores al cargar la app**

Buscar:

```js
// --- Config panel ---
$('btn-config').addEventListener('click', () => {
  $('panel-config').classList.toggle('hidden');
});

pintarConfigEnFormulario();
```

Reemplazar por:

```js
// --- Config panel ---
$('btn-config').addEventListener('click', () => {
  $('panel-config').classList.toggle('hidden');
});

pintarConfigEnFormulario();
pintarSelectorCategoria('cat-tabs-config');
pintarSelectorCategoria('cat-tabs-quick');
pintarActivoCategoria();
```

- [ ] **Step 7: Preservar `categoria` al guardar la tarifa a mano**

Buscar:

```js
  config = {
    vehiculo,
    placa,
    tarifaBase,
```

Reemplazar por:

```js
  config = {
    categoria: config.categoria,
    vehiculo,
    placa,
    tarifaBase,
```

(Sin este paso, guardar la tarifa manualmente desde "Tu tarifa" borraría `categoria` del objeto guardado, porque ese handler reconstruye `config` entero desde los campos del formulario, que no incluye un campo de categoría.)

- [ ] **Step 8: Agregar los archivos nuevos al app shell del service worker**

En `sw.js`, buscar:

```js
  './src/pricing.js',
  './src/distance.js',
  './src/tripStore.js',
  './src/geocode.js',
```

Reemplazar por:

```js
  './src/pricing.js',
  './src/distance.js',
  './src/tripStore.js',
  './src/geocode.js',
  './src/categorias.js',
  './src/whatsapp.js',
```

Buscar la línea 1 de `sw.js`:

```js
const CACHE = 'uber-tarifas-v1';
```

Reemplazar por:

```js
const CACHE = 'uber-tarifas-v2';
```

- [ ] **Step 9: Correr la suite completa de tests**

Run: `node --test src/*.test.js`
Expected: `# pass 48` (40 existentes + 4 de `categorias.test.js` + 4 de `whatsapp.test.js`, este último creado en Task 2), `# fail 0`.

- [ ] **Step 10: Verificación manual en navegador**

```bash
cd /Users/branel/Desktop/uber-tarifas && python3 -m http.server 8000
```

Abrir `http://localhost:8000/index.html`, click en ⚙️:
- Debe verse la fila de 3 botones (🏍️ Mototaxi/Delivery, 🚗 Taxi/Sedán, 🚐 Van/Grupos) antes de "Marca y modelo", con "Taxi / Sedán" marcado activo por default.
- Click en "🏍️ Mototaxi/Delivery": los campos "Tarifa base", "Costo por km", "Costo por minuto", "Tarifa mínima", "Combustible", "Precio (RD$/galón)", "Rendimiento" y "Mantenimiento y gomas por km" deben repintarse con los valores de esa categoría (50/25/3/60/Gasolina Regular/302.50/144/1.50).
- Cerrar el panel de config (click en ⚙️ de nuevo) y verificar que la misma fila de botones aparece arriba de las pestañas Origen→Destino/GPS/Manual, con "Mototaxi/Delivery" ya marcado activo (sincronizado).
- Recargar la página: la categoría elegida debe seguir activa (persistida en localStorage).

- [ ] **Step 11: Commit**

```bash
git add index.html app.js style.css sw.js
git commit -m "Agregar selector de categoria de vehiculo (mototaxi/taxi/van) con preset de tarifa"
```

---

### Task 4: Botón de compartir cotización por WhatsApp

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `style.css`

**Interfaces:**
- Consumes: `mensajeCotizacion` de `./src/whatsapp.js` (Task 2), `presetPara` de `./src/categorias.js` (Task 1), `config.categoria` (Task 3), `ultimoResultado` (ya existente en `app.js`).

- [ ] **Step 1: Agregar el botón en `index.html`**

Buscar:

```html
      <button id="btn-guardar-viaje" class="btn-primary">Guardar viaje</button>
      <button id="btn-descartar-viaje" class="btn-link btn-descartar">Descartar</button>
```

Reemplazar por:

```html
      <button id="btn-guardar-viaje" class="btn-primary">Guardar viaje</button>
      <button id="btn-whatsapp" class="btn-whatsapp" type="button">Compartir por WhatsApp</button>
      <button id="btn-descartar-viaje" class="btn-link btn-descartar">Descartar</button>
```

- [ ] **Step 2: Agregar el estilo `.btn-whatsapp` en `style.css`**

Agregar al final del archivo (después de los estilos de `.cat-tabs`/`.cat-tab` de Task 3):

```css
.btn-whatsapp {
  width: 100%;
  border: none;
  border-radius: 16px;
  padding: 15px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  background: #25d366;
  color: #04160d;
  box-shadow: 0 8px 24px rgba(37, 211, 102, 0.35);
  margin-bottom: 10px;
  transition: transform 0.12s ease;
}

.btn-whatsapp:active {
  transform: scale(0.98);
}
```

- [ ] **Step 3: Importar `mensajeCotizacion` en `app.js`**

Buscar:

```js
import { CATEGORIAS, presetPara } from './src/categorias.js';
```

Reemplazar por:

```js
import { CATEGORIAS, presetPara } from './src/categorias.js';
import { mensajeCotizacion } from './src/whatsapp.js';
```

- [ ] **Step 4: Agregar el handler del botón**

Buscar:

```js
$('btn-guardar-viaje').addEventListener('click', () => {
  if (!ultimoResultado) return;
  guardarViaje(localStorage, ultimoResultado);
  ultimoResultado = null;
  resultadoBase = null;
  resetearBotonDescartar();
  $('panel-resultado').classList.add('hidden');
  pintarResumen();
});
```

Reemplazar por:

```js
$('btn-guardar-viaje').addEventListener('click', () => {
  if (!ultimoResultado) return;
  guardarViaje(localStorage, ultimoResultado);
  ultimoResultado = null;
  resultadoBase = null;
  resetearBotonDescartar();
  $('panel-resultado').classList.add('hidden');
  pintarResumen();
});

$('btn-whatsapp').addEventListener('click', () => {
  if (!ultimoResultado) return;
  const categoriaLabel = presetPara(config.categoria).label;
  const origen = $('ruta-origen').value.trim() || null;
  const destino = $('ruta-destino').value.trim() || null;
  const mensaje = mensajeCotizacion({ origen, destino, categoriaLabel, monto: ultimoResultado.precio });
  window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
});
```

- [ ] **Step 5: Correr la suite completa (no debería cambiar nada, es solo glue code sin tests propios)**

Run: `node --test src/*.test.js`
Expected: `# pass 48`, `# fail 0`.

- [ ] **Step 6: Verificación manual en navegador**

Con el server del Task 3 corriendo, ir a la pestaña "Origen → Destino", poner un origen y destino válidos (o usar 📍), calcular precio, y en el panel de Resultado click en "Compartir por WhatsApp":
- Debe abrirse una pestaña nueva a `web.whatsapp.com` o `wa.me` con el texto precargado, incluyendo origen, destino, la categoría activa y el monto calculado.
- Repetir cotizando por "Km manual" (sin origen/destino): el mensaje generado no debe tener el paréntesis del tramo.

- [ ] **Step 7: Commit**

```bash
git add index.html app.js style.css
git commit -m "Agregar boton de compartir cotizacion por WhatsApp"
```

---

### Task 5: Fix — GPS en vivo no debe arrancar en la tarifa mínima

**Files:**
- Modify: `app.js:505-522` (función `refrescarLive`)

**Interfaces:** Ninguna nueva — usa `calcularPrecio` ya existente de `./src/pricing.js`, apoyándose en que su parámetro `tarifaMinima` ya tiene default `0` (cubierto por los tests existentes de `pricing.test.js`, no requiere test nuevo).

- [ ] **Step 1: Quitar el piso de tarifa mínima del cálculo en vivo**

Buscar:

```js
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
```

Reemplazar por:

```js
function refrescarLive() {
  const km = tracker.totalKm;
  const minutos = (Date.now() - inicioViaje) / 60000;
  $('gps-km').textContent = km.toFixed(2);
  $('gps-min').textContent = minutos.toFixed(1);
  if (tarifaConfigurada()) {
    // Sin tarifaMinima a proposito: el contador en vivo debe crecer desde la
    // tarifa base junto con el km/tiempo real, no saltar de una vez al piso
    // minimo apenas arranca el viaje (con km=0 estaria por debajo del minimo
    // y calcularPrecio aplicaria el piso). El minimo real se sigue cobrando
    // al finalizar el viaje: calcularYPintarResultado() si pasa config.tarifaMinima.
    const r = calcularPrecio({
      km,
      minutos,
      tarifaBase: config.tarifaBase,
      costoPorKm: config.costoPorKm,
      costoPorMinuto: config.costoPorMinuto,
      comisionPct: config.comisionPct,
    });
    $('gps-precio').textContent = formatoRD(r.precio);
  }
}
```

- [ ] **Step 2: Correr la suite completa (no debería cambiar nada, `pricing.test.js` ya cubre el default de `tarifaMinima`)**

Run: `node --test src/*.test.js`
Expected: `# pass 48`, `# fail 0`.

- [ ] **Step 3: Verificación manual en navegador**

Con el server corriendo, ir a "GPS en vivo", click "Iniciar viaje" (aceptar el permiso de ubicación del navegador si lo pide):
- El contador "estimado" debe arrancar mostrando la **tarifa base** de la categoría activa (ej. RD$100.00 para Taxi/Sedán), no la tarifa mínima (RD$150.00).
- Click "Finalizar viaje" casi de inmediato (recorrido ~0 km): el resultado final SÍ debe aplicar la tarifa mínima configurada (ej. RD$150.00), confirmando que el cobro real no cambió, solo el contador en vivo.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "Fix: GPS en vivo ya no arranca mostrando la tarifa minima como piso"
```

---

### Task 6: Verificación final

**Files:** Ninguno (solo verificación).

- [ ] **Step 1: Suite completa en verde**

Run: `node --test src/*.test.js`
Expected: `# pass 48`, `# fail 0`.

- [ ] **Step 2: `git status` limpio**

Run: `git status --short`
Expected: sin salida (todo commiteado).

- [ ] **Step 3: `git log` muestra las 5 tareas de código + el diseño**

Run: `git log --oneline -7`
Expected: 5 commits de este plan (Tasks 1-5) + el commit del design doc, arriba de `97e73ec` (fix de congelar minutos, sesión anterior).

- [ ] **Step 4: Repaso visual completo en navegador**

Con el server corriendo (`python3 -m http.server 8000` desde el repo), y con caché deshabilitada / service worker desregistrado para evitar falsos negativos (ver nota de caché documentada en la memoria del proyecto):
- Las 3 categorías repintan correctamente sus 8 campos asociados.
- El conmutador rápido y el selector dentro de config quedan sincronizados entre sí y persisten tras recargar.
- Guardar la tarifa a mano desde "Tu tarifa" no borra la categoría activa.
- El botón de WhatsApp arma el mensaje esperado en los 3 modos de cotización (con y sin origen/destino).
- El contador de GPS en vivo arranca en la tarifa base, no en la mínima; el resultado final sí aplica la mínima.
