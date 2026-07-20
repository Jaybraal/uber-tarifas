import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardarViaje, obtenerViajes, resumen, resumenDeHoy, borrarViajes } from './tripStore.js';

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
  };
}

test('obtenerViajes devuelve [] cuando no hay nada guardado', () => {
  const storage = fakeStorage();
  assert.deepEqual(obtenerViajes(storage), []);
});

test('guardarViaje agrega un viaje y lo persiste', () => {
  const storage = fakeStorage();
  guardarViaje(storage, { fecha: '2026-07-20T10:00:00.000Z', km: 10, minutos: 15, precio: 200, comision: 50, neto: 150 });
  const viajes = obtenerViajes(storage);
  assert.equal(viajes.length, 1);
  assert.equal(viajes[0].precio, 200);
});

test('guardarViaje acumula varios viajes en orden', () => {
  const storage = fakeStorage();
  guardarViaje(storage, { fecha: '2026-07-20T10:00:00.000Z', km: 10, minutos: 15, precio: 200, comision: 50, neto: 150 });
  guardarViaje(storage, { fecha: '2026-07-20T11:00:00.000Z', km: 5, minutos: 8, precio: 100, comision: 25, neto: 75 });
  const viajes = obtenerViajes(storage);
  assert.equal(viajes.length, 2);
});

test('resumen suma km, precio, comision y neto de una lista de viajes', () => {
  const viajes = [
    { fecha: '2026-07-20T10:00:00.000Z', km: 10, minutos: 15, precio: 200, comision: 50, neto: 150 },
    { fecha: '2026-07-20T11:00:00.000Z', km: 5, minutos: 8, precio: 100, comision: 25, neto: 75 },
  ];
  const r = resumen(viajes);
  assert.equal(r.cantidadViajes, 2);
  assert.equal(r.km, 15);
  assert.equal(r.precio, 300);
  assert.equal(r.comision, 75);
  assert.equal(r.neto, 225);
});

test('resumen suma gastoOperativo y gananciaReal cuando estan presentes', () => {
  const viajes = [
    { fecha: '2026-07-20T10:00:00.000Z', km: 10, minutos: 15, precio: 200, comision: 50, neto: 150, gastoOperativo: 75.6, gananciaReal: 74.4 },
    { fecha: '2026-07-20T11:00:00.000Z', km: 5, minutos: 8, precio: 100, comision: 25, neto: 75, gastoOperativo: 37.8, gananciaReal: 37.2 },
  ];
  const r = resumen(viajes);
  assert.equal(r.gastoOperativo, 113.4);
  assert.equal(r.gananciaReal, 111.6);
});

test('resumen usa el neto como gananciaReal cuando un viaje viejo no tiene gasto operativo guardado', () => {
  const viajes = [
    { fecha: '2026-07-20T10:00:00.000Z', km: 10, minutos: 15, precio: 200, comision: 50, neto: 150 },
  ];
  const r = resumen(viajes);
  assert.equal(r.gastoOperativo, 0);
  assert.equal(r.gananciaReal, 150);
});

test('resumen de lista vacia da todo en 0', () => {
  const r = resumen([]);
  assert.equal(r.cantidadViajes, 0);
  assert.equal(r.km, 0);
  assert.equal(r.precio, 0);
});

test('resumenDeHoy solo cuenta los viajes del dia actual', () => {
  const viajes = [
    { fecha: '2026-07-20T10:00:00.000Z', km: 10, minutos: 15, precio: 200, comision: 50, neto: 150 },
    { fecha: '2026-07-19T23:00:00.000Z', km: 999, minutos: 1, precio: 999, comision: 0, neto: 999 },
  ];
  const ahora = new Date('2026-07-20T15:00:00.000Z');
  const r = resumenDeHoy(viajes, ahora);
  assert.equal(r.cantidadViajes, 1);
  assert.equal(r.km, 10);
});

test('borrarViajes deja el historial vacio', () => {
  const storage = fakeStorage();
  guardarViaje(storage, { fecha: '2026-07-20T10:00:00.000Z', km: 10, minutos: 15, precio: 200, comision: 50, neto: 150 });
  borrarViajes(storage);
  assert.deepEqual(obtenerViajes(storage), []);
});
