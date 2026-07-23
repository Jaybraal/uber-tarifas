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
