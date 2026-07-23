export function mensajeCotizacion({ origen, destino, categoriaLabel, monto }) {
  const tramo = origen && destino ? ` (${origen} a ${destino})` : '';
  return `¡Hola! La tarifa estimada para tu viaje${tramo} en ${categoriaLabel} es de RD$${monto.toFixed(2)}. ¿Confirmamos?`;
}
