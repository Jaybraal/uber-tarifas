import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPrecio, costoOperativoPorKm, costoFijoPorKm, gananciaReal } from './pricing.js';

test('calcula precio base + costo por km', () => {
  const r = calcularPrecio({
    km: 10,
    minutos: 0,
    tarifaBase: 50,
    costoPorKm: 15,
    costoPorMinuto: 0,
    tarifaMinima: 0,
    comisionPct: 0,
  });
  assert.equal(r.precio, 200); // 50 + 10*15
});

test('suma el costo por minuto', () => {
  const r = calcularPrecio({
    km: 5,
    minutos: 8,
    tarifaBase: 50,
    costoPorKm: 15,
    costoPorMinuto: 3,
    tarifaMinima: 0,
    comisionPct: 0,
  });
  assert.equal(r.precio, 149); // 50 + 5*15 + 8*3
});

test('aplica la tarifa minima cuando el calculo da menos', () => {
  const r = calcularPrecio({
    km: 0.5,
    minutos: 1,
    tarifaBase: 50,
    costoPorKm: 15,
    costoPorMinuto: 3,
    tarifaMinima: 120,
    comisionPct: 0,
  });
  assert.equal(r.precio, 120); // 50+7.5+3=60.5 < 120 -> aplica minima
});

test('calcula comision y ganancia neta', () => {
  const r = calcularPrecio({
    km: 10,
    minutos: 0,
    tarifaBase: 50,
    costoPorKm: 15,
    costoPorMinuto: 0,
    tarifaMinima: 0,
    comisionPct: 25,
  });
  assert.equal(r.precio, 200);
  assert.equal(r.comision, 50);
  assert.equal(r.neto, 150);
});

test('redondea a 2 decimales', () => {
  const r = calcularPrecio({
    km: 3.333,
    minutos: 0,
    tarifaBase: 10,
    costoPorKm: 10.1,
    costoPorMinuto: 0,
    tarifaMinima: 0,
    comisionPct: 0,
  });
  // 10 + 3.333*10.1 = 43.6633 -> 43.66
  assert.equal(r.precio, 43.66);
});

test('lanza error si faltan tarifas requeridas', () => {
  assert.throws(() => calcularPrecio({ km: 5, tarifaBase: undefined, costoPorKm: 10 }));
});

test('lanza error si km es negativo', () => {
  assert.throws(() => calcularPrecio({ km: -1, tarifaBase: 50, costoPorKm: 15 }));
});

test('costoOperativoPorKm calcula el gasto de combustible por km', () => {
  const c = costoOperativoPorKm({ precioPorGalon: 302.5, rendimientoKmPorGalon: 40 });
  assert.equal(c, 7.56); // 302.5 / 40 = 7.5625 -> 7.56
});

test('costoOperativoPorKm suma otros gastos opcionales por km', () => {
  const c = costoOperativoPorKm({ precioPorGalon: 302.5, rendimientoKmPorGalon: 40, otrosGastosPorKm: 2 });
  assert.equal(c, 9.56);
});

test('costoOperativoPorKm lanza error si el rendimiento es 0 o negativo', () => {
  assert.throws(() => costoOperativoPorKm({ precioPorGalon: 302.5, rendimientoKmPorGalon: 0 }));
  assert.throws(() => costoOperativoPorKm({ precioPorGalon: 302.5, rendimientoKmPorGalon: -5 }));
});

test('gananciaReal resta el gasto operativo del neto', () => {
  const g = gananciaReal({ neto: 150, km: 10, gastoOperativoPorKm: 7.56 });
  assert.equal(g, 74.4); // 150 - 75.6
});

test('gananciaReal no baja de negativo si el gasto supera el neto', () => {
  const g = gananciaReal({ neto: 20, km: 10, gastoOperativoPorKm: 7.56 });
  assert.equal(g, -55.6); // 20 - 75.6, se muestra en negativo a proposito: el viaje da perdida
});

test('costoFijoPorKm prorratea seguro + depreciacion + otro gasto entre los km del mes', () => {
  const c = costoFijoPorKm({ seguroPorMes: 5000, depreciacionPorMes: 3000, otroGastoPorMes: 1000, kmPorMes: 1000 });
  assert.equal(c, 9); // (5000+3000+1000)/1000
});

test('costoFijoPorKm da 0 si no hay kmPorMes (sin inventar el dato)', () => {
  assert.equal(costoFijoPorKm({ seguroPorMes: 5000 }), 0);
  assert.equal(costoFijoPorKm({ seguroPorMes: 5000, kmPorMes: 0 }), 0);
});

test('costoFijoPorKm funciona solo con seguro (los demas son opcionales)', () => {
  const c = costoFijoPorKm({ seguroPorMes: 5000, kmPorMes: 2000 });
  assert.equal(c, 2.5);
});

test('costoOperativoPorKm suma tambien los gastos fijos prorrateados por km', () => {
  const c = costoOperativoPorKm({
    precioPorGalon: 302.5,
    rendimientoKmPorGalon: 40,
    otrosGastosPorKm: 2,
    gastosFijosPorKm: 3,
  });
  assert.equal(c, 12.56); // 7.5625 + 2 + 3 -> 12.5625 -> 12.56
});
