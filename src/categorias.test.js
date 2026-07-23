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
  assert.equal(presetPara('taxi').tarifaBase, 100);
});

test('presetPara cae a taxi si el id no existe (config vieja sin categoria)', () => {
  assert.equal(presetPara('bicicleta').id, 'taxi');
  assert.equal(presetPara(undefined).id, 'taxi');
});
