function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calcularPrecio({
  km,
  minutos = 0,
  tarifaBase,
  costoPorKm,
  costoPorMinuto = 0,
  tarifaMinima = 0,
  comisionPct = 0,
}) {
  if (typeof km !== 'number' || km < 0) {
    throw new Error('km debe ser un numero >= 0');
  }
  if (typeof tarifaBase !== 'number' || typeof costoPorKm !== 'number') {
    throw new Error('tarifaBase y costoPorKm son obligatorios');
  }

  const bruto = tarifaBase + costoPorKm * km + costoPorMinuto * minutos;
  const precio = round2(Math.max(bruto, tarifaMinima));
  const comision = round2(precio * (comisionPct / 100));
  const neto = round2(precio - comision);

  return { precio, comision, neto };
}

export function costoOperativoPorKm({
  precioPorGalon,
  rendimientoKmPorGalon,
  otrosGastosPorKm = 0,
  gastosFijosPorKm = 0,
}) {
  if (typeof rendimientoKmPorGalon !== 'number' || rendimientoKmPorGalon <= 0) {
    throw new Error('rendimientoKmPorGalon debe ser un numero > 0');
  }
  return round2(precioPorGalon / rendimientoKmPorGalon + otrosGastosPorKm + gastosFijosPorKm);
}

export function costoFijoPorKm({ seguroPorMes = 0, depreciacionPorMes = 0, otroGastoPorMes = 0, kmPorMes = 0 }) {
  if (!kmPorMes || kmPorMes <= 0) {
    return 0;
  }
  return round2((seguroPorMes + depreciacionPorMes + otroGastoPorMes) / kmPorMes);
}

export function gananciaReal({ neto, km, gastoOperativoPorKm }) {
  return round2(neto - km * gastoOperativoPorKm);
}
