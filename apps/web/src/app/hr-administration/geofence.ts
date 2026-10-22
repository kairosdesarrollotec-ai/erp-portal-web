/** Distancia en metros entre dos coordenadas (haversine). Solo para el indicador en pantalla: el veredicto oficial lo da el servidor. */
export function distanceInMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface GeofenceCircle {
  configured: boolean;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number | null;
}

export type GeofenceVerdict = { kind: 'NO_GEOFENCE' } | { kind: 'INSIDE' | 'OUTSIDE'; distanceMeters: number; radiusMeters: number };

/** Indicador dentro / fuera de la geocerca para la ubicacion actual (orientativo). */
export function geofenceVerdict(geofence: GeofenceCircle | undefined, here: { latitude: number; longitude: number } | null): GeofenceVerdict | null {
  if (!geofence?.configured || geofence.latitude == null || geofence.longitude == null || geofence.radiusMeters == null) return { kind: 'NO_GEOFENCE' };
  if (!here) return null;
  const distanceMeters = Math.round(distanceInMeters({ latitude: geofence.latitude, longitude: geofence.longitude }, here));
  return { kind: distanceMeters <= geofence.radiusMeters ? 'INSIDE' : 'OUTSIDE', distanceMeters, radiusMeters: geofence.radiusMeters };
}

export function mapLink(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
