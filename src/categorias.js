export const CATEGORIAS = [
  {
    id: 'mototaxi',
    label: 'Mototaxi / Delivery',
    icono: '🏍️',
    tarifaBase: 50,
    costoPorKm: 25,
    costoPorMinuto: 3,
    tarifaMinima: 60,
    precioPorGalon: 302.5, // Gasolina Regular
    rendimientoKmPorGalon: 144, // ~38 km/l
    otrosGastosPorKm: 1.5,
  },
  {
    id: 'taxi',
    label: 'Taxi / Sedán',
    icono: '🚗',
    tarifaBase: 100,
    costoPorKm: 35,
    costoPorMinuto: 5,
    tarifaMinima: 150,
    precioPorGalon: 338.1, // Gasolina Premium
    rendimientoKmPorGalon: 68, // ~18 km/l
    otrosGastosPorKm: 4,
  },
  {
    id: 'van',
    label: 'Van / Grupos',
    icono: '🚐',
    tarifaBase: 250,
    costoPorKm: 65,
    costoPorMinuto: 10,
    tarifaMinima: 300,
    precioPorGalon: 254.8, // Gasoil Regular
    rendimientoKmPorGalon: 30, // ~8 km/l
    otrosGastosPorKm: 9,
  },
];

export function presetPara(id) {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS.find((c) => c.id === 'taxi');
}
