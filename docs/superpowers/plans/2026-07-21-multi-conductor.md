# Pivote multi-conductor (marca genérica + tipo de vehículo + activación) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preparar la app (hoy "Tarifas Uber", uso personal de Branel) para poder repartirla a otros conductores — muchos moto-taxis — que le van a pagar por usarla: marca genérica, selector de tipo de vehículo (carro/moto) que ajusta las opciones de combustible, y un gate simple de código de activación.

**Architecture:** Sin cambios de arquitectura. Sigue siendo una PWA vanilla JS sin build tool ni backend, 100% `localStorage` por dispositivo. Se agregan dos módulos puros nuevos en `src/` (mismo patrón que `pricing.js`/`distance.js`, con su `*.test.js` corrido por `node --test`) y se ajusta el glue code de `app.js`/`index.html`/`style.css`/`sw.js` sin tocar la lógica de cálculo de tarifa existente.

**Tech Stack:** HTML/CSS/JS vanilla, ES modules, `node --test` + `node:assert/strict` para tests, Leaflet (sin cambios), PWA con `sw.js` cacheando el app shell.

## Contexto (por qué existe este plan)

Branel usa esta app para cotizar sus propios viajes de Uber. El 20/07/26 confirmó que planea pasarla a otros conductores — sobre todo moto-taxis — que le pagarán por usarla. La arquitectura (localStorage por dispositivo, sin cuentas) ya sirve para eso sin cambios estructurales: cada conductor mete sus propios datos y el cálculo corre en base a eso. Lo que falta es (1) que la marca/copy no asuma que el usuario es Branel con un Honda Fit Hybrid trabajando para Uber, (2) que el tipo de vehículo (carro vs moto) ajuste lo que tiene sentido ajustar, y (3) alguna fricción mínima para que solo la use quien pagó.

## Decisiones asumidas (Branel: revisá esto antes de ejecutar; si algo no te sirve, avisá y se ajusta el plan antes de tocar código)

1. **Nombre nuevo: "TarifasPro"** — tomado de tu propio mockup de referencia del rediseño (`Tarifas<span class="text-uber-green">Pro</span>`). Genérico, no menciona Uber, sirve para carro o moto.
2. **Mecanismo de cobro: código de activación simple, sin backend.** Al abrir la app por primera vez en un celular, pide un código; si coincide con una lista que vos mantenés a mano en el código fuente, desbloquea y no vuelve a preguntar en ese celular. **Esto es solo fricción, no seguridad real** — cualquiera con acceso al código fuente podría ver la lista de códigos válidos. Es apropiado para vender manualmente a un puñado de conductores por WhatsApp (consistente con cómo operás CRM-Auto/STOD: boutique, no SaaS). Si más adelante tenés muchos conductores y necesitás cobros recurrentes automáticos, ahí sí conviene migrar a Stripe Payment Links + validación server-side — no se construye en este plan.
3. **No se toca la fórmula de tarifa** (`calcularPrecio`, `costoOperativoPorKm`, `costoFijoPorKm` de la sesión anterior). Este plan es solo marca + tipo de vehículo + activación.
4. **No se renombran las claves internas de `localStorage`** (`uber-tarifas:config`, `uber-tarifas:viajes`) ni la constante `CACHE` de `sw.js` más allá de un bump de versión — cambiarles el nombre te borraría la tarifa y el historial ya guardados en tu celular real, sin ningún beneficio para el usuario. Es invisible, no hace falta que combine con la marca nueva.

## Fuera de alcance (deliberadamente, no construir sin una sesión aparte)

- **Tarifa plana / por zona para moto-taxis.** Muchos moto-conchos cobran por zona fija, no por km recorrido. Esta app solo sabe cobrar por distancia+tiempo. Meter un segundo modo de cotización es una feature grande que necesita su propio brainstorming — no se improvisa acá.
- **Cobro automático recurrente** (Stripe, suscripciones, etc.) — ver Decisión asumida #2.
- **Cuentas de usuario / sincronización entre dispositivos** — sigue siendo 100% local por celular, a propósito.

## Global Constraints

- No agregar dependencias externas nuevas por CDN (la PWA debe seguir funcionando offline vía `sw.js`).
- Todo campo de configuración nuevo queda editable con un valor de partida — nunca un dato fijo no editable.
- No fabricar cifras reales: si falta un dato (ej. códigos de activación reales, tarifa exacta de un moto-taxi), se deja un placeholder explícitamente marcado como "reemplazar", nunca un número inventado presentado como real.
- Toda función pura nueva en `src/` lleva su `*.test.js` corrido con `node --test src/*.test.js`, mismo patrón que `pricing.test.js`/`distance.test.js`.
- Español en todo el copy, mismo tono directo ya usado en el resto de la app.

---

## Estructura de archivos

- Modificar: `index.html` — título/manifest link, header, copy de "Tu tarifa", nuevo selector de tipo de vehículo, overlay de activación.
- Modificar: `manifest.webmanifest` — nombre/descripción genéricos.
- Modificar: `app.js` — wiring del tipo de vehículo y del gate de activación.
- Modificar: `style.css` — estilos del selector (reutiliza `.grid-2`/`label` existentes, no necesita CSS nuevo) y del overlay de activación (`.activacion-overlay`, `.activacion-card`, `.brand-accent`).
- Modificar: `sw.js` — bump de versión de cache + nuevos archivos en `APP_SHELL`.
- Crear: `src/vehiculo.js` + `src/vehiculo.test.js` — opciones de combustible y rendimiento sugerido según tipo de vehículo.
- Crear: `src/activacion.js` + `src/activacion.test.js` — validación de código de activación.

---

### Task 1: Generalizar marca (nombre, título, copy de "Tu tarifa")

**Files:**
- Modify: `index.html:1-34`
- Modify: `manifest.webmanifest` (completo)
- Modify: `style.css` (agregar regla `.brand-accent`)
- Modify: `sw.js:1` (bump de versión de cache)

**Interfaces:** Ninguna (solo copy/branding, no lógica).

- [ ] **Step 1: Cambiar título, ícono de marca y copy de "Tu tarifa" en `index.html`**

Reemplazar (líneas 1-34 actuales):

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0a0a0a" />
  <title>Tarifas Uber</title>
  <link rel="manifest" href="manifest.webmanifest" />
  <link rel="apple-touch-icon" href="public/icons/icon-192.png" />
  <link rel="icon" href="public/icons/icon-192.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="style.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</head>
<body>
  <div class="app">
    <header class="topbar">
      <h1>Tarifas Uber</h1>
      <button id="btn-config" class="icon-btn" aria-label="Configurar tarifa" title="Configurar tarifa">⚙️</button>
    </header>

    <section id="panel-config" class="card panel-config hidden">
      <h2>Tu tarifa</h2>
      <p class="hint">
        Como cobrás directo al pasajero por WhatsApp (sin pasar por la plataforma de Uber),
        lo que calcules acá es 100% tuyo — dejé la comisión en 0%. Partí de la tarifa oficial
        de Uber Santo Domingo (2018) ajustada por inflación, y le subí un poco más — sobre
        todo al costo por km, no al por minuto — para cubrir gomas, mantenimiento y limpieza,
        que se desgastan con la distancia recorrida, no con el tiempo parado en tráfico.
        <strong>Es un punto de partida, no un precio fijo</strong> — ajustalo a lo que vos
        quieras cobrar. Se guarda solo en este celular.
      </p>
```

con:

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0a0a0a" />
  <title>TarifasPro</title>
  <link rel="manifest" href="manifest.webmanifest" />
  <link rel="apple-touch-icon" href="public/icons/icon-192.png" />
  <link rel="icon" href="public/icons/icon-192.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="style.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</head>
<body>
  <div class="app">
    <header class="topbar">
      <h1>Tarifas<span class="brand-accent">Pro</span></h1>
      <button id="btn-config" class="icon-btn" aria-label="Configurar tarifa" title="Configurar tarifa">⚙️</button>
    </header>

    <section id="panel-config" class="card panel-config hidden">
      <h2>Tu tarifa</h2>
      <p class="hint">
        Esto es lo que le cobrás directo al pasajero — <strong>es un punto de partida, no un
        precio fijo</strong>, ajustalo a lo que vos quieras cobrar. Si trabajás con una
        plataforma que te cobra comisión, ponela abajo; si cobrás directo (por WhatsApp, en
        mano, etc.), dejala en 0%. Se guarda solo en este celular.
      </p>
```

- [ ] **Step 2: Generalizar `manifest.webmanifest`**

Reemplazar el archivo completo por:

```json
{
  "name": "TarifasPro",
  "short_name": "TarifasPro",
  "description": "Calculadora de tarifas para conductores (carro o moto) en base a la distancia recorrida",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "public/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "public/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 3: Agregar la clase `.brand-accent` en `style.css`**

Agregar cerca de las reglas de `.topbar h1` (buscar `.topbar h1` en el archivo):

```css
.brand-accent {
  color: var(--accent);
}
```

- [ ] **Step 4: Bump de versión de cache en `sw.js`**

Cambiar la línea 1 de `sw.js`:

```js
const CACHE = 'uber-tarifas-v1';
```

por:

```js
const CACHE = 'uber-tarifas-v2';
```

(Se deja el nombre base igual a propósito — ver "Decisiones asumidas" — solo se bumpea la versión para que los celulares con la app ya instalada bajen el contenido nuevo.)

- [ ] **Step 5: Verificar que no quedan menciones de "Uber" en copy de usuario**

Run: `grep -n "Uber" index.html manifest.webmanifest`
Expected: sin resultados (0 matches).

- [ ] **Step 6: Correr la suite completa para confirmar que nada se rompió**

Run: `node --test src/*.test.js`
Expected: `# pass 40`, `# fail 0` (este task no toca `src/`, tiene que seguir en 40/40).

- [ ] **Step 7: Commit**

```bash
git add index.html manifest.webmanifest style.css sw.js
git commit -m "Generalizar marca a TarifasPro (deja de asumir Uber/Branel)"
```

---

### Task 2: Módulo puro de tipo de vehículo (`src/vehiculo.js`)

**Files:**
- Create: `src/vehiculo.js`
- Test: `src/vehiculo.test.js`

**Interfaces:**
- Produces: `TIPOS_VEHICULO: string[]`, `opcionesCombustiblePara(tipoVehiculo: string) => Array<{valor: string, etiqueta: string}>`, `rendimientoSugerido(tipoVehiculo: string) => number`. Task 3 los importa desde `./vehiculo.js`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/vehiculo.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opcionesCombustiblePara, rendimientoSugerido, TIPOS_VEHICULO } from './vehiculo.js';

test('TIPOS_VEHICULO incluye carro y moto', () => {
  assert.deepEqual(TIPOS_VEHICULO, ['carro', 'moto']);
});

test('opcionesCombustiblePara carro incluye gasoil', () => {
  const opciones = opcionesCombustiblePara('carro');
  assert.ok(opciones.some((o) => o.etiqueta.includes('Gasoil')));
  assert.equal(opciones.length, 4);
});

test('opcionesCombustiblePara moto no incluye gasoil (las motos no usan diesel)', () => {
  const opciones = opcionesCombustiblePara('moto');
  assert.ok(!opciones.some((o) => o.etiqueta.includes('Gasoil')));
  assert.equal(opciones.length, 2);
});

test('opcionesCombustiblePara usa carro como default si el tipo no se reconoce', () => {
  const opciones = opcionesCombustiblePara('bicicleta');
  assert.equal(opciones.length, 4);
});

test('rendimientoSugerido es mayor para moto que para carro', () => {
  assert.equal(rendimientoSugerido('carro'), 40);
  assert.equal(rendimientoSugerido('moto'), 45);
  assert.ok(rendimientoSugerido('moto') > rendimientoSugerido('carro'));
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `node --test src/vehiculo.test.js`
Expected: FAIL — `Cannot find module './vehiculo.js'` (todavía no existe).

- [ ] **Step 3: Implementación mínima**

Crear `src/vehiculo.js`:

```js
export const TIPOS_VEHICULO = ['carro', 'moto'];

const OPCIONES_COMBUSTIBLE = {
  carro: [
    { valor: '302.50', etiqueta: 'Gasolina Regular — RD$302.50/gal' },
    { valor: '338.10', etiqueta: 'Gasolina Premium — RD$338.10/gal' },
    { valor: '254.80', etiqueta: 'Gasoil Regular — RD$254.80/gal' },
    { valor: '290.10', etiqueta: 'Gasoil Óptimo — RD$290.10/gal' },
  ],
  moto: [
    { valor: '302.50', etiqueta: 'Gasolina Regular — RD$302.50/gal' },
    { valor: '338.10', etiqueta: 'Gasolina Premium — RD$338.10/gal' },
  ],
};

export function opcionesCombustiblePara(tipoVehiculo) {
  return OPCIONES_COMBUSTIBLE[tipoVehiculo] ?? OPCIONES_COMBUSTIBLE.carro;
}

export function rendimientoSugerido(tipoVehiculo) {
  return tipoVehiculo === 'moto' ? 45 : 40;
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `node --test src/vehiculo.test.js`
Expected: `# pass 5`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/vehiculo.js src/vehiculo.test.js
git commit -m "Agregar modulo puro de opciones de combustible/rendimiento por tipo de vehiculo"
```

---

### Task 3: Wiring del selector de tipo de vehículo en la UI

**Files:**
- Modify: `index.html` (dentro de `<section id="panel-config">`, subsección "Tu vehículo")
- Modify: `app.js`
- Modify: `sw.js` (agregar `./src/vehiculo.js` a `APP_SHELL`)

**Interfaces:**
- Consumes: `opcionesCombustiblePara`, `rendimientoSugerido` de `./src/vehiculo.js` (Task 2).
- Produces: `config.tipoVehiculo: 'carro' | 'moto'` persistido en `localStorage` junto al resto de `config`.

- [ ] **Step 1: Agregar el `<select>` de tipo de vehículo en `index.html`**

Buscar el bloque (dentro de la sección "Tu vehículo"):

```html
      <div class="grid-2">
        <label>Marca y modelo (opcional)
          <input type="text" id="cfg-vehiculo" placeholder="Ej. Honda Fit Hybrid" autocomplete="off" />
        </label>
        <label>Placa (opcional)
          <input type="text" id="cfg-placa" placeholder="Ej. A123456" autocomplete="off" />
        </label>
        <label>Combustible
```

y reemplazarlo por:

```html
      <div class="grid-2">
        <label>Tipo de vehículo
          <select id="cfg-tipo-vehiculo">
            <option value="carro">Carro</option>
            <option value="moto">Motocicleta</option>
          </select>
        </label>
        <label>Marca y modelo (opcional)
          <input type="text" id="cfg-vehiculo" placeholder="Ej. Honda Fit Hybrid" autocomplete="off" />
        </label>
        <label>Placa (opcional)
          <input type="text" id="cfg-placa" placeholder="Ej. A123456" autocomplete="off" />
        </label>
        <label>Combustible
```

- [ ] **Step 2: Importar el módulo nuevo en `app.js`**

Cambiar la línea 1 de `app.js`:

```js
import { calcularPrecio, costoOperativoPorKm, costoFijoPorKm, gananciaReal as calcularGananciaReal } from './src/pricing.js';
```

por (agregar una línea nueva justo debajo):

```js
import { calcularPrecio, costoOperativoPorKm, costoFijoPorKm, gananciaReal as calcularGananciaReal } from './src/pricing.js';
import { opcionesCombustiblePara, rendimientoSugerido } from './src/vehiculo.js';
```

- [ ] **Step 3: Agregar `tipoVehiculo` a los defaults de `cargarConfig()`**

Buscar en `app.js`:

```js
        vehiculo: 'Honda Fit Hybrid',
        placa: '',
```

reemplazar por:

```js
        tipoVehiculo: 'carro',
        vehiculo: 'Honda Fit Hybrid',
        placa: '',
```

- [ ] **Step 4: Agregar `pintarOpcionesCombustible` y usarla desde `pintarConfigEnFormulario`**

Buscar:

```js
function pintarConfigEnFormulario() {
  $('cfg-vehiculo').value = config.vehiculo ?? '';
```

reemplazar por:

```js
function pintarOpcionesCombustible(tipoVehiculo) {
  const opciones = opcionesCombustiblePara(tipoVehiculo);
  $('cfg-combustible').innerHTML = opciones
    .map((o) => `<option value="${o.valor}">${o.etiqueta}</option>`)
    .concat('<option value="custom">Otro (precio manual)</option>')
    .join('');
  $('cfg-rendimiento').placeholder = `Ej. ${rendimientoSugerido(tipoVehiculo)}`;
}

function pintarConfigEnFormulario() {
  const tipoVehiculo = config.tipoVehiculo ?? 'carro';
  $('cfg-tipo-vehiculo').value = tipoVehiculo;
  pintarOpcionesCombustible(tipoVehiculo);

  $('cfg-vehiculo').value = config.vehiculo ?? '';
```

(el resto de la función sigue exactamente igual — el bloque de `opcionCoincide` que ya existe más abajo, sin tocar, ahora corre contra las opciones recién pintadas y elige la correcta o cae a `'custom'`.)

- [ ] **Step 5: Repintar combustible cuando el usuario cambia el tipo de vehículo a mano**

Buscar:

```js
$('cfg-combustible').addEventListener('change', () => {
```

y agregar, justo antes de esa línea:

```js
$('cfg-tipo-vehiculo').addEventListener('change', () => {
  const tipoVehiculo = $('cfg-tipo-vehiculo').value;
  pintarOpcionesCombustible(tipoVehiculo);
  $('cfg-precio-combustible').value = $('cfg-combustible').value;
});

```

- [ ] **Step 6: Capturar y guardar `tipoVehiculo` en el handler de guardado**

Buscar:

```js
$('btn-guardar-config').addEventListener('click', () => {
  const vehiculo = $('cfg-vehiculo').value.trim();
```

reemplazar por:

```js
$('btn-guardar-config').addEventListener('click', () => {
  const tipoVehiculo = $('cfg-tipo-vehiculo').value;
  const vehiculo = $('cfg-vehiculo').value.trim();
```

Buscar (unas líneas más abajo, el objeto `config` que se arma al guardar):

```js
  config = {
    vehiculo,
    placa,
```

reemplazar por:

```js
  config = {
    tipoVehiculo,
    vehiculo,
    placa,
```

- [ ] **Step 7: Agregar el archivo nuevo al app shell del service worker**

En `sw.js`, buscar:

```js
  './src/pricing.js',
```

y agregar debajo:

```js
  './src/pricing.js',
  './src/vehiculo.js',
```

- [ ] **Step 8: Correr la suite completa**

Run: `node --test src/*.test.js`
Expected: `# pass 45`, `# fail 0` (40 anteriores + 5 de `vehiculo.test.js`).

- [ ] **Step 9: Verificación manual en navegador**

```bash
cd /Users/branel/Desktop/uber-tarifas && python3 -m http.server 8000
```

Abrir `http://localhost:8000/index.html`, click en ⚙️, cambiar "Tipo de vehículo" a "Motocicleta":
- El dropdown de "Combustible" debe quedar solo con 2 opciones (Gasolina Regular/Premium, sin Gasoil).
- El campo "Rendimiento de tu vehículo" debe mostrar el placeholder "Ej. 45" en vez de "Ej. 40".
- Volver a "Carro": deben reaparecer las 4 opciones y el placeholder debe volver a "Ej. 40".

- [ ] **Step 10: Commit**

```bash
git add index.html app.js sw.js
git commit -m "Agregar selector de tipo de vehiculo que ajusta las opciones de combustible"
```

---

### Task 4: Módulo puro de validación de código de activación (`src/activacion.js`)

**Files:**
- Create: `src/activacion.js`
- Test: `src/activacion.test.js`

**Interfaces:**
- Produces: `CODIGOS_ACTIVOS: string[]`, `validarCodigo(codigoIngresado: string, codigosValidos: string[]) => boolean`. Task 5 los importa desde `./activacion.js`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/activacion.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarCodigo } from './activacion.js';

test('valida un codigo exacto', () => {
  assert.equal(validarCodigo('DEMO2026', ['DEMO2026']), true);
});

test('valida sin importar mayusculas/minusculas ni espacios alrededor', () => {
  assert.equal(validarCodigo('  demo2026  ', ['DEMO2026']), true);
});

test('rechaza un codigo que no esta en la lista', () => {
  assert.equal(validarCodigo('OTRO', ['DEMO2026']), false);
});

test('rechaza valores no-string', () => {
  assert.equal(validarCodigo(null, ['DEMO2026']), false);
  assert.equal(validarCodigo(undefined, ['DEMO2026']), false);
  assert.equal(validarCodigo(123, ['DEMO2026']), false);
});

test('rechaza codigo vacio aunque la lista este vacia', () => {
  assert.equal(validarCodigo('', []), false);
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `node --test src/activacion.test.js`
Expected: FAIL — `Cannot find module './activacion.js'`.

- [ ] **Step 3: Implementación mínima**

Crear `src/activacion.js`:

```js
export const CODIGOS_ACTIVOS = [
  // Codigos que le diste a cada conductor para activar la app. Agrega uno por linea.
  // Este es un codigo de ejemplo: reemplazalo por los reales antes de repartir la app.
  'DEMO2026',
];

export function validarCodigo(codigoIngresado, codigosValidos) {
  if (typeof codigoIngresado !== 'string' || codigoIngresado.trim() === '') {
    return false;
  }
  const normalizado = codigoIngresado.trim().toUpperCase();
  return codigosValidos.some((c) => c.toUpperCase() === normalizado);
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `node --test src/activacion.test.js`
Expected: `# pass 5`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/activacion.js src/activacion.test.js
git commit -m "Agregar modulo puro de validacion de codigo de activacion"
```

---

### Task 5: Overlay de activación en la UI

**Files:**
- Modify: `index.html` (agregar overlay justo después de `<body>`)
- Modify: `app.js`
- Modify: `style.css`
- Modify: `sw.js` (agregar `./src/activacion.js` a `APP_SHELL`)

**Interfaces:**
- Consumes: `validarCodigo`, `CODIGOS_ACTIVOS` de `./src/activacion.js` (Task 4).

- [ ] **Step 1: Agregar el overlay en `index.html`**

Buscar:

```html
<body>
  <div class="app">
```

reemplazar por:

```html
<body>
  <div id="activacion-overlay" class="activacion-overlay hidden">
    <div class="activacion-card">
      <h1>Tarifas<span class="brand-accent">Pro</span></h1>
      <p class="hint">Ingresá el código de activación que te dieron para usar la app.</p>
      <input type="text" id="activacion-input" placeholder="Código de activación" autocomplete="off" />
      <button id="activacion-btn" class="btn-primary">Activar</button>
      <p id="activacion-msg" class="msg"></p>
    </div>
  </div>

  <div class="app">
```

- [ ] **Step 2: Estilos del overlay en `style.css`**

Agregar al final del archivo:

```css
.activacion-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(5, 5, 5, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.activacion-card {
  width: 100%;
  max-width: 360px;
  background: var(--card-solid);
  border: 1px solid var(--border);
  border-radius: 22px;
  padding: 28px 24px;
  text-align: center;
}

.activacion-card h1 {
  margin: 0 0 12px;
  font-size: 1.4rem;
  font-weight: 800;
}

.activacion-card input {
  width: 100%;
  margin: 16px 0 12px;
  text-align: center;
}

.activacion-card .btn-primary {
  margin-bottom: 8px;
}
```

- [ ] **Step 3: Importar el módulo y agregar el gate en `app.js`**

Cambiar la línea de import agregada en el Task 3:

```js
import { opcionesCombustiblePara, rendimientoSugerido } from './src/vehiculo.js';
```

por:

```js
import { opcionesCombustiblePara, rendimientoSugerido } from './src/vehiculo.js';
import { validarCodigo, CODIGOS_ACTIVOS } from './src/activacion.js';
```

Buscar el final del archivo:

```js
// --- PWA: registrar service worker ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
```

y agregar debajo:

```js

// --- Activacion ---
const ACTIVACION_KEY = 'uber-tarifas:activado';

function mostrarActivacionSiHaceFalta() {
  const guardado = localStorage.getItem(ACTIVACION_KEY);
  if (guardado && validarCodigo(guardado, CODIGOS_ACTIVOS)) {
    return;
  }
  $('activacion-overlay').classList.remove('hidden');
}

$('activacion-btn').addEventListener('click', () => {
  const codigo = $('activacion-input').value;
  const msg = $('activacion-msg');
  if (validarCodigo(codigo, CODIGOS_ACTIVOS)) {
    localStorage.setItem(ACTIVACION_KEY, codigo.trim());
    $('activacion-overlay').classList.add('hidden');
  } else {
    msg.textContent = 'Código inválido. Pedile el código correcto a quien te compartió la app.';
    msg.className = 'msg error';
  }
});

mostrarActivacionSiHaceFalta();
```

- [ ] **Step 4: Agregar el archivo nuevo al app shell del service worker**

En `sw.js`, buscar:

```js
  './src/vehiculo.js',
```

y agregar debajo:

```js
  './src/vehiculo.js',
  './src/activacion.js',
```

- [ ] **Step 5: Correr la suite completa**

Run: `node --test src/*.test.js`
Expected: `# pass 50`, `# fail 0` (45 anteriores + 5 de `activacion.test.js`).

- [ ] **Step 6: Verificación manual en navegador**

```bash
cd /Users/branel/Desktop/uber-tarifas && python3 -m http.server 8000
```

En una ventana de incógnito (para tener `localStorage` limpio), abrir `http://localhost:8000/index.html`:
- Debe aparecer el overlay tapando toda la app, pidiendo el código.
- Escribir un código cualquiera que no sea "DEMO2026" y click "Activar" → debe mostrar el mensaje de error, sin desbloquear.
- Escribir "DEMO2026" y click "Activar" → el overlay debe desaparecer y la app debe quedar usable normalmente.
- Recargar la página (`Cmd+R`) → el overlay NO debe volver a aparecer (ya quedó guardado en `localStorage`).

- [ ] **Step 7: Commit**

```bash
git add index.html app.js style.css sw.js
git commit -m "Agregar gate de codigo de activacion antes de usar la app"
```

---

### Task 6: Verificación final

**Files:** Ninguno (solo verificación).

- [ ] **Step 1: Suite completa en verde**

Run: `node --test src/*.test.js`
Expected: `# pass 50`, `# fail 0`.

- [ ] **Step 2: `git status` limpio**

Run: `git status --short`
Expected: sin salida (todo commiteado).

- [ ] **Step 3: `git log` muestra las 5 tareas**

Run: `git log --oneline -6`
Expected: los 5 commits de este plan arriba del commit `85df327` (gastos fijos + espera) de la sesión anterior.

- [ ] **Step 4: Reemplazar el código de activación de ejemplo antes de repartir la app**

En `src/activacion.js`, reemplazar `'DEMO2026'` en `CODIGOS_ACTIVOS` por los códigos reales que le vas a dar a cada conductor (uno compartido para todos, o uno distinto por conductor si querés poder revocar acceso individual más adelante). Volver a correr `node --test src/*.test.js` y commitear ese cambio aparte, como último paso antes de compartir la app.
