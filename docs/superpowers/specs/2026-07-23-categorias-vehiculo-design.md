# Categorías de vehículo (Mototaxi / Taxi / Van) + WhatsApp + fix piso GPS — Diseño

**Goal:** agregar un selector de categoría de vehículo (Mototaxi/Delivery, Taxi/Sedán, Van/Grupos) que autocompleta la tarifa y el costo operativo con valores de partida por categoría, disponible tanto en la sección "Tu vehículo" como en un conmutador rápido en la pantalla de cotización; agregar un botón para compartir la cotización por WhatsApp; y corregir que el modo "GPS en vivo" arranque mostrando la tarifa mínima como piso apenas se inicia el viaje (debe arrancar bajo y crecer con el recorrido real).

**Contexto:** app personal de Branel (`~/Desktop/uber-tarifas`), PWA vanilla JS sin build tool, 100% localStorage por dispositivo, módulos puros testeados con `node --test src/*.test.js` (36 tests en verde a la fecha). Existe un plan viejo sin ejecutar (`docs/superpowers/plans/2026-07-21-multi-conductor.md`) que cubría un selector binario carro/moto + rebrand a "TarifasPro" + gate de activación — **ese plan no se toca ni se ejecuta acá**; este diseño es más específico (3 categorías con preset completo de tarifa) y no incluye rebrand ni activación porque no fueron pedidos.

## Alcance

**Incluye:**
1. Módulo `src/categorias.js`: datos de las 3 categorías + función para buscar una por id.
2. Módulo `src/whatsapp.js`: función pura que arma el mensaje de cotización para compartir.
3. Selector visual de categoría (botones tipo pestaña con ícono), una implementación compartida instanciada en dos lugares: dentro de "Tu vehículo" (panel de config) y arriba de las pestañas Origen→Destino/GPS/Manual (conmutador rápido).
4. Wiring en `app.js`: elegir una categoría aplica y **guarda de inmediato** en `config`/localStorage los campos de tarifa y vehículo asociados a esa categoría (confirmado con el usuario). No toca marca/placa/seguro/depreciación/km-mes — esos son del vehículo físico, no de la categoría.
5. Botón "Compartir por WhatsApp" en el panel de Resultado.
6. Fix: en el modo GPS en vivo, dejar de aplicar `tarifaMinima` como piso mientras el viaje está en curso (solo se sigue aplicando al finalizar el viaje, que es cuando se cobra de verdad).

**Fuera de alcance (no pedido):** rebrand "TarifasPro", gate de código de activación, tarifa por zona fija para moto-taxis, cuentas/sincronización entre dispositivos.

## Datos de categorías (`src/categorias.js`)

Reemplaza los valores de ejemplo del usuario por cifras consistentes con los campos que la app ya tiene (RD$/galón real de las opciones de combustible existentes, km/galón en vez de km/litro). Taxi/Sedán queda igual al Honda Fit Hybrid ya precargado, para no cambiarle nada al usuario actual si elige esa categoría.

| id | label | icono | tarifaBase | costoPorKm | costoPorMinuto | tarifaMinima | precioPorGalon | rendimientoKmPorGalon | otrosGastosPorKm |
|---|---|---|---|---|---|---|---|---|---|
| `mototaxi` | Mototaxi / Delivery | 🏍️ | 10 | 10 | 1.5 | 10 | 302.50 (Gasolina Regular) | 144 | 1.50 |
| `taxi` | Taxi / Sedán | 🚗 | 50 | 18 | 3 | 50 | 338.10 (Gasolina Premium) | 68 | 4.00 |
| `van` | Van / Grupos | 🚐 | 75 | 30 | 5 | 75 | 254.80 (Gasoil Regular) | 30 | 9.00 |

Tarifa base y mínima ajustadas 23/07/26 a pedido del usuario, en dos rondas: primero la base bajó a 10/50/75 (arranca baja y crece con km/minuto); después, como la mínima original (60/150/300) le seguía pareciendo alta, se igualó `tarifaMinima` a la misma `tarifaBase` — sin piso extra por encima del arranque, el precio final es simplemente base+km+minuto (nunca baja de la base, pero tampoco salta a un mínimo mayor). Una tercera ronda bajó también `costoPorKm`/`costoPorMinuto` (moto 25→10 / 3→1.5, taxi 35→18 / 5→3, van 65→30 / 10→5) porque el precio subía demasiado rápido con la distancia/tiempo, en los 3 modos de cotización por igual (todos comparten el mismo `config` y `calcularPrecio`). Todos son puntos de partida editables, mismo principio que el resto de la app (hint text lo aclara).

## Fix adicional: el mapa (Leaflet) no debe tumbar el cálculo del precio

**Bug reportado por el usuario (23/07/26):** al cotizar por "Origen → Destino" en un celular real, apareció el error `"Can't find variable: L"` (Safari) y no se mostró ningún precio, aunque la ruta sí se había calculado bien.

**Root cause (confirmado reproduciendo con Chrome headless + bloqueo del CDN de Leaflet vía CDP):** Leaflet (`L`) se carga desde `unpkg.com` con un `<script>` normal, que el service worker NO cachea a propósito (`sw.js` solo cachea same-origin). Con red inestable, ese script puede no llegar a cargar. `mostrarMapa()` usaba `L` sin ningún guard, y se llamaba ANTES que `mostrarResultado()` en el handler de "Calcular precio" — si `L` no existía, el `ReferenceError` interrumpía el handler completo y nunca se llegaba a mostrar el precio, pese a que `routeDistance()` ya había funcionado.

**Fix:** (1) `mostrarMapa()` ahora hace `if (typeof L === 'undefined') return;` al inicio — sin mapa, sin drama. (2) En el handler, `mostrarResultado()` se llama ANTES de intentar `mostrarMapa()`, y esta última queda envuelta en su propio `try/catch` — el precio siempre se muestra si la ruta se pudo calcular, el mapa es puramente decorativo. Verificado reproduciendo el bug real (bloqueando el CDN de Leaflet por CDP) antes y después del fix.

**Interfaz del módulo:**
- `CATEGORIAS: Array<{id, label, icono, tarifaBase, costoPorKm, costoPorMinuto, tarifaMinima, precioPorGalon, rendimientoKmPorGalon, otrosGastosPorKm}>`
- `presetPara(id: string) => objeto de la tabla` — si `id` no matchea ninguna, devuelve el preset de `taxi` (compatibilidad con configs guardadas antes de este cambio, que no tienen `categoria`).

## WhatsApp (`src/whatsapp.js`)

**Interfaz:** `mensajeCotizacion({ origen, destino, categoriaLabel, monto }) => string`

Formato: `"¡Hola! La tarifa estimada para tu viaje (ORIGEN a DESTINO) en CATEGORIA es de RD$MONTO. ¿Confirmamos?"`. Si `origen` o `destino` vienen vacíos/null (modos GPS o Km manual, donde no hay direcciones), se omite el paréntesis del tramo: `"¡Hola! La tarifa estimada para tu viaje en CATEGORIA es de RD$MONTO. ¿Confirmamos?"`.

En `app.js`, el botón nuevo en el panel de Resultado arma el mensaje con `ultimoResultado.precio`, `presetPara(config.categoria).label`, y `$('ruta-origen').value`/`$('ruta-destino').value` (quedan vacíos si el usuario cotizó por GPS o manual). Abre `https://wa.me/?text=<mensaje codificado>` en una pestaña nueva — no hay número de pasajero guardado en la app, así que se abre el selector de contacto de WhatsApp en vez de mandarlo a un número fijo.

## Selector de categoría (UI)

Botones tipo pestaña (mismo look que `.tabs`/`.tab` que ya existen para Origen→Destino/GPS/Manual, pero con clase propia `.cat-tabs`/`.cat-tab` para no interferir con el listener genérico `querySelectorAll('.tab')` que ya existe). Cada botón: ícono arriba, label corto abajo. Se generan dinámicamente desde `CATEGORIAS`, no hardcodeados en `index.html`, para no duplicar la lista en dos lugares del HTML.

Dos instancias en el DOM (mismos ids de categoría, contenedores distintos):
- Dentro de "Tu vehículo", antes de "Marca y modelo".
- Arriba de `<nav class="tabs">` (Origen→Destino/GPS/Manual), como conmutador rápido.

Una sola función `seleccionarCategoria(id)` en `app.js` maneja ambas: aplica el preset a `config`, llama `guardarConfig(config)`, repinta el formulario de config (`pintarConfigEnFormulario`, ya existente), repinta el estado activo de las dos instancias del selector, y si hay un resultado visible (`resultadoBase` no nulo) recalcula el precio (`calcularYPintarResultado()`) para reflejar la categoría nueva al instante.

`config.categoria` se agrega a los defaults de `cargarConfig()` como `'taxi'` (no cambia nada para el usuario actual, que ya tiene guardado el equivalente al preset de taxi).

## Fix: piso de tarifa mínima en GPS en vivo

**Root cause:** `refrescarLive()` en `app.js` llama a `calcularPrecio()` pasando `tarifaMinima: config.tarifaMinima`. Como `km=0` y `minutos≈0` recién arrancado el viaje, `bruto` (tarifaBase + 0 + ~0) queda por debajo de `tarifaMinima`, y `calcularPrecio` aplica el piso — el contador en vivo salta de una vez al mínimo configurado en vez de arrancar en la tarifa base y crecer con el recorrido.

**Fix:** en `refrescarLive()`, dejar de pasar `tarifaMinima` (el parámetro por default es `0` en `calcularPrecio`, ya cubierto por los tests existentes de `pricing.test.js`) — el contador en vivo muestra el precio real acumulado sin piso. El cálculo final al tocar "Finalizar viaje" (`mostrarResultado`/`calcularYPintarResultado`) sigue aplicando `config.tarifaMinima` sin cambios, así que el cobro real nunca baja del mínimo configurado — solo cambia lo que se muestra mientras el viaje está en curso.

No requiere módulo nuevo ni test nuevo (el default de `tarifaMinima=0` ya está cubierto); se verifica manualmente en navegador iniciando un viaje GPS y confirmando que el precio arranca en la tarifa base de la categoría activa, no en la mínima.

## Testing

- `src/categorias.test.js`: `CATEGORIAS` tiene 3 elementos con los campos esperados; `presetPara('mototaxi'|'taxi'|'van')` devuelve el preset correcto; `presetPara('algo-invalido')` cae a `taxi`.
- `src/whatsapp.test.js`: mensaje con tramo cuando hay origen/destino; mensaje sin tramo cuando faltan; formato de monto con 2 decimales.
- Suite completa (`node --test src/*.test.js`) debe seguir en verde, sumando los tests nuevos a los 36 existentes.
- Verificación manual en navegador (headless CDP, con el truco anti-caché ya documentado para este proyecto): elegir cada categoría y confirmar que combustible/rendimiento/tarifa se repintan correctamente en ambos selectores; iniciar un viaje GPS y confirmar que ya no arranca en la tarifa mínima; generar una cotización por Origen→Destino y confirmar que el botón de WhatsApp arma el mensaje esperado.

## Archivos afectados

- Crear: `src/categorias.js`, `src/categorias.test.js`, `src/whatsapp.js`, `src/whatsapp.test.js`
- Modificar: `index.html` (selector de categoría x2, botón WhatsApp), `app.js` (wiring completo + fix de GPS), `style.css` (`.cat-tabs`/`.cat-tab`, `.btn-whatsapp`), `sw.js` (agregar los 2 archivos nuevos al app shell + bump de versión de cache)
