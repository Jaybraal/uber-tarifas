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
});

test('la tarifa base arranca distinto segun la categoria: moto 10, taxi 50, van 75', () => {
  assert.equal(presetPara('mototaxi').tarifaBase, 10);
  assert.equal(presetPara('taxi').tarifaBase, 50);
  assert.equal(presetPara('van').tarifaBase, 75);
});

test('la tarifa minima es igual a la tarifa base (sin piso extra por encima)', () => {
  assert.equal(presetPara('mototaxi').tarifaMinima, 10);
  assert.equal(presetPara('taxi').tarifaMinima, 50);
  assert.equal(presetPara('van').tarifaMinima, 75);
});

test('el costo por km y por minuto es mas bajo, para que el precio suba mas despacio', () => {
  assert.equal(presetPara('mototaxi').costoPorKm, 10);
  assert.equal(presetPara('mototaxi').costoPorMinuto, 1.5);
  assert.equal(presetPara('taxi').costoPorKm, 18);
  assert.equal(presetPara('taxi').costoPorMinuto, 3);
  assert.equal(presetPara('van').costoPorKm, 30);
  assert.equal(presetPara('van').costoPorMinuto, 5);
});

test('presetPara cae a taxi si el id no existe (config vieja sin categoria)', () => {
  assert.equal(presetPara('bicicleta').id, 'taxi');
  assert.equal(presetPara(undefined).id, 'taxi');
});
