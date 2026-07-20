import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm, TripTracker } from './distance.js';

test('haversineKm calcula distancia conocida entre dos coordenadas', () => {
  // Santo Domingo (Zona Colonial) -> Aeropuerto Las Americas, ~20km aprox
  const a = { lat: 18.4735, lon: -69.8823 };
  const b = { lat: 18.4297, lon: -69.6689 };
  const km = haversineKm(a, b);
  assert.ok(km > 20 && km < 24, `esperaba ~20-24km, dio ${km}`);
});

test('haversineKm entre el mismo punto es 0', () => {
  const p = { lat: 18.5, lon: -69.9 };
  assert.equal(haversineKm(p, p), 0);
});

test('TripTracker empieza en 0 km y 0 minutos', () => {
  const t = new TripTracker();
  assert.equal(t.totalKm, 0);
  assert.equal(t.totalMinutos, 0);
});

test('TripTracker acumula distancia entre puntos validos', () => {
  const t = new TripTracker();
  t.addPoint({ lat: 18.4735, lon: -69.8823, accuracy: 10, timestamp: 0 });
  // ~1.1km al norte, 60s despues -> velocidad razonable
  t.addPoint({ lat: 18.4835, lon: -69.8823, accuracy: 10, timestamp: 60_000 });
  assert.ok(t.totalKm > 1 && t.totalKm < 1.2, `dio ${t.totalKm}`);
  assert.equal(t.totalMinutos, 1);
});

test('TripTracker ignora puntos con baja precision de GPS', () => {
  const t = new TripTracker({ minAccuracy: 30 });
  t.addPoint({ lat: 18.4735, lon: -69.8823, accuracy: 10, timestamp: 0 });
  t.addPoint({ lat: 18.4835, lon: -69.8823, accuracy: 100, timestamp: 60_000 });
  assert.equal(t.totalKm, 0);
});

test('TripTracker ignora saltos de velocidad imposible (glitch de GPS)', () => {
  const t = new TripTracker({ maxSpeedKmh: 130 });
  t.addPoint({ lat: 18.4735, lon: -69.8823, accuracy: 10, timestamp: 0 });
  // 50km en 1 segundo = imposible
  t.addPoint({ lat: 18.9235, lon: -69.8823, accuracy: 10, timestamp: 1_000 });
  assert.equal(t.totalKm, 0);
});

test('TripTracker.reset vuelve todo a 0', () => {
  const t = new TripTracker();
  t.addPoint({ lat: 18.4735, lon: -69.8823, accuracy: 10, timestamp: 0 });
  t.addPoint({ lat: 18.4835, lon: -69.8823, accuracy: 10, timestamp: 60_000 });
  t.reset();
  assert.equal(t.totalKm, 0);
  assert.equal(t.totalMinutos, 0);
});
