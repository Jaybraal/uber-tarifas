const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export class TripTracker {
  constructor({ minAccuracy = 30, maxSpeedKmh = 130 } = {}) {
    this.minAccuracy = minAccuracy;
    this.maxSpeedKmh = maxSpeedKmh;
    this.reset();
  }

  reset() {
    this.totalKm = 0;
    this.totalMinutos = 0;
    this.lastPoint = null;
  }

  addPoint(point) {
    if (point.accuracy != null && point.accuracy > this.minAccuracy) {
      return;
    }

    if (!this.lastPoint) {
      this.lastPoint = point;
      return;
    }

    const deltaKm = haversineKm(this.lastPoint, point);
    const deltaHoras = (point.timestamp - this.lastPoint.timestamp) / 3_600_000;

    if (deltaHoras <= 0) {
      return;
    }

    const speedKmh = deltaKm / deltaHoras;
    if (speedKmh > this.maxSpeedKmh) {
      return;
    }

    this.totalKm += deltaKm;
    this.totalMinutos += deltaHoras * 60;
    this.lastPoint = point;
  }
}
