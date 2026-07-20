import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarSugerencias, reverseGeocode, routeDistance } from './geocode.js';

function fakeFetchJson(payload, ok = true) {
  return async () => ({
    ok,
    json: async () => payload,
  });
}

test('buscarSugerencias devuelve varias opciones para que el usuario elija', async () => {
  const fetchFn = fakeFetchJson([
    { lat: '18.4735', lon: '-69.8823', display_name: 'Ágora Mall, Santo Domingo' },
    { lat: '18.4700', lon: '-69.9000', display_name: 'Ágora Mall (parada de bus), Santo Domingo' },
  ]);
  const r = await buscarSugerencias('Agora Mall', { fetchFn });
  assert.equal(r.length, 2);
  assert.equal(r[0].lat, 18.4735);
  assert.equal(r[0].lon, -69.8823);
  assert.equal(r[0].displayName, 'Ágora Mall, Santo Domingo');
});

test('buscarSugerencias devuelve lista vacia si no hay coincidencias (no lanza error)', async () => {
  const fetchFn = fakeFetchJson([]);
  const r = await buscarSugerencias('direccion inexistente xyz', { fetchFn });
  assert.deepEqual(r, []);
});

test('reverseGeocode convierte coordenadas GPS en una direccion legible', async () => {
  const fetchFn = fakeFetchJson({ display_name: 'Ensanche Piantini, Santo Domingo' });
  const r = await reverseGeocode({ lat: 18.48, lon: -69.93 }, { fetchFn });
  assert.equal(r.lat, 18.48);
  assert.equal(r.lon, -69.93);
  assert.equal(r.displayName, 'Ensanche Piantini, Santo Domingo');
});

test('reverseGeocode lanza error si Nominatim no encuentra nada', async () => {
  const fetchFn = fakeFetchJson({ error: 'Unable to geocode' });
  await assert.rejects(() => reverseGeocode({ lat: 0, lon: 0 }, { fetchFn }));
});

test('routeDistance devuelve km y minutos de la primera ruta', async () => {
  const fetchFn = fakeFetchJson({
    routes: [{ distance: 20500, duration: 1800 }],
  });
  const r = await routeDistance({ lat: 18.4735, lon: -69.8823 }, { lat: 18.4297, lon: -69.6689 }, { fetchFn });
  assert.equal(r.km, 20.5);
  assert.equal(r.minutos, 30);
});

test('routeDistance incluye la geometria de la ruta cuando esta presente (para el mapa)', async () => {
  const coords = [[-69.8823, 18.4735], [-69.68, 18.43], [-69.6689, 18.4297]];
  const fetchFn = fakeFetchJson({
    routes: [{ distance: 20500, duration: 1800, geometry: { coordinates: coords } }],
  });
  const r = await routeDistance({ lat: 18.4735, lon: -69.8823 }, { lat: 18.4297, lon: -69.6689 }, { fetchFn });
  assert.deepEqual(r.geometry, coords);
});

test('routeDistance.geometry es null cuando el servidor no la devuelve', async () => {
  const fetchFn = fakeFetchJson({ routes: [{ distance: 20500, duration: 1800 }] });
  const r = await routeDistance({ lat: 18.4735, lon: -69.8823 }, { lat: 18.4297, lon: -69.6689 }, { fetchFn });
  assert.equal(r.geometry, null);
});

test('routeDistance lanza error si no hay rutas', async () => {
  const fetchFn = fakeFetchJson({ routes: [] });
  await assert.rejects(() =>
    routeDistance({ lat: 18.4735, lon: -69.8823 }, { lat: 18.4297, lon: -69.6689 }, { fetchFn }),
  );
});
