export const CATEGORIAS = [
  {
    id: 'mototaxi',
    label: 'Mototaxi / Delivery',
    icono: '🏍️',
    tarifaBase: 10,
    costoPorKm: 10,
    costoPorMinuto: 1.5,
    tarifaMinima: 10,
    precioPorGalon: 302.5, // Gasolina Regular
    rendimientoKmPorGalon: 144, // ~38 km/l
    otrosGastosPorKm: 1.5,
  },
  {
    id: 'taxi',
    label: 'Taxi / Sedán',
    icono: '🚗',
    tarifaBase: 50,
    costoPorKm: 18,
    costoPorMinuto: 3,
    tarifaMinima: 50,
    precioPorGalon: 338.1, // Gasolina Premium
    rendimientoKmPorGalon: 68, // ~18 km/l
    otrosGastosPorKm: 4,
  },
  {
    id: 'van',
    label: 'Van / Grupos',
    icono: '🚐',
    tarifaBase: 75,
    costoPorKm: 30,
    costoPorMinuto: 5,
    tarifaMinima: 75,
    precioPorGalon: 254.8, // Gasoil Regular
    rendimientoKmPorGalon: 30, // ~8 km/l
    otrosGastosPorKm: 9,
  },
];

export function presetPara(id) {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS.find((c) => c.id === 'taxi');
}
