import { describe, it, expect } from 'vitest';
import { distanceInMeters, geofenceVerdict } from './geofence';

const centro = { latitude: -12.0464, longitude: -77.0428 };

describe('geofence', () => {
  it('distancia cero en el mismo punto y ~111 m por 0.001 grados de latitud', () => {
    expect(distanceInMeters(centro, centro)).toBe(0);
    const d = distanceInMeters(centro, { latitude: centro.latitude + 0.001, longitude: centro.longitude });
    expect(d).toBeGreaterThan(105);
    expect(d).toBeLessThan(117);
  });

  it('dentro / fuera segun el radio', () => {
    const fence = { configured: true, ...centro, radiusMeters: 200 };
    expect(geofenceVerdict(fence, centro)).toMatchObject({ kind: 'INSIDE' });
    expect(geofenceVerdict(fence, { latitude: centro.latitude + 0.01, longitude: centro.longitude })).toMatchObject({ kind: 'OUTSIDE' });
  });

  it('sin geocerca configurada no hay veredicto de distancia; sin ubicacion tampoco', () => {
    expect(geofenceVerdict({ configured: false }, centro)).toEqual({ kind: 'NO_GEOFENCE' });
    expect(geofenceVerdict({ configured: true, ...centro, radiusMeters: 50 }, null)).toBeNull();
  });
});
