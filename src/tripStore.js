const STORAGE_KEY = 'uber-tarifas:viajes';

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function obtenerViajes(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function guardarViaje(storage, viaje) {
  const viajes = obtenerViajes(storage);
  viajes.push(viaje);
  storage.setItem(STORAGE_KEY, JSON.stringify(viajes));
  return viajes;
}

export function resumen(viajes) {
  return viajes.reduce(
    (acc, v) => ({
      cantidadViajes: acc.cantidadViajes + 1,
      km: round2(acc.km + v.km),
      minutos: round2(acc.minutos + v.minutos),
      precio: round2(acc.precio + v.precio),
      comision: round2(acc.comision + v.comision),
      neto: round2(acc.neto + v.neto),
      gastoOperativo: round2(acc.gastoOperativo + (v.gastoOperativo ?? 0)),
      gananciaReal: round2(acc.gananciaReal + (v.gananciaReal ?? v.neto)),
    }),
    { cantidadViajes: 0, km: 0, minutos: 0, precio: 0, comision: 0, neto: 0, gastoOperativo: 0, gananciaReal: 0 },
  );
}

export function borrarViajes(storage) {
  storage.setItem(STORAGE_KEY, JSON.stringify([]));
}

export function resumenDeHoy(viajes, ahora = new Date()) {
  const hoy = ahora.toISOString().slice(0, 10);
  const deHoy = viajes.filter((v) => v.fecha.slice(0, 10) === hoy);
  return resumen(deHoy);
}
