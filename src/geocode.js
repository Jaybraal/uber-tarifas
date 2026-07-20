function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function buscarSugerencias(query, { fetchFn = fetch, limit = 5 } = {}) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=${limit}&countrycodes=do&q=${encodeURIComponent(query)}`;
  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error('No se pudo buscar la direccion');
  }
  const data = await res.json();
  return data.map((d) => ({
    lat: parseFloat(d.lat),
    lon: parseFloat(d.lon),
    displayName: d.display_name,
  }));
}

export async function reverseGeocode({ lat, lon }, { fetchFn = fetch } = {}) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error('No se pudo identificar tu ubicacion');
  }
  const data = await res.json();
  if (!data || data.error || !data.display_name) {
    throw new Error('No se pudo identificar tu ubicacion');
  }
  return { lat, lon, displayName: data.display_name };
}

export async function routeDistance(origen, destino, { fetchFn = fetch } = {}) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origen.lon},${origen.lat};${destino.lon},${destino.lat}?overview=full&geometries=geojson`;
  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error('No se pudo calcular la ruta');
  }
  const data = await res.json();
  if (!data.routes || !data.routes.length) {
    throw new Error('No se encontro una ruta entre esos dos puntos');
  }
  const [ruta] = data.routes;
  return {
    km: round2(ruta.distance / 1000),
    minutos: round2(ruta.duration / 60),
    geometry: ruta.geometry?.coordinates ?? null,
  };
}
