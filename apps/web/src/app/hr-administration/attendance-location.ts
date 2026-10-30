/**
 * HU-29 (Respuestas de negocio 2026-10-20 #20): la asistencia lleva «ubicación automática». Helper para capturar la
 * geolocalización del navegador SIN bloquear el registro: con permiso, con tiempo máximo corto y devolviendo `null` si
 * el usuario la niega, el navegador no la soporta o se agota el tiempo.
 *
 * hr-administration 0.8.0 ya acepta `latitude` / `longitude` / `accuracy` opcionales en LogAttendanceRequest (422
 * INVALID_ATTENDANCE_RECORD si vienen fuera de rango o solo una coordenada), por eso el envío está ENCENDIDO. Si la persona
 * niega el permiso del navegador, no hay soporte o se agota el tiempo, la asistencia se registra igual, sin ubicación.
 */
export const ATTENDANCE_LOCATION_SENDING_ENABLED = true;

/** Tiempo máximo de espera de la ubicación (ms): corto para no demorar el registro. */
export const ATTENDANCE_LOCATION_TIMEOUT_MS = 4000;

export interface AttendanceLocation {
  latitude: number;
  longitude: number;
  /** Precisión en metros (puede faltar). */
  accuracy?: number;
}

/** Pide la ubicación actual. Nunca lanza ni rechaza: ante cualquier problema devuelve `null`. */
export function captureAttendanceLocation(timeoutMs: number = ATTENDANCE_LOCATION_TIMEOUT_MS): Promise<AttendanceLocation | null> {
  return new Promise((resolve) => {
    const geolocation = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
    if (!geolocation) {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = (value: AttendanceLocation | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      resolve(value);
    };
    // Respaldo por si el navegador nunca responde (algunos ignoran `timeout` mientras muestran el aviso de permiso).
    const guard = setTimeout(() => finish(null), timeoutMs + 500);
    try {
      geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            finish(null);
            return;
          }
          // El API acepta como máximo 8 decimales en lat/lng y 2 en precisión; el navegador devuelve más (HR-ASIST).
          const round = (n: number, d: number) => Number(n.toFixed(d));
          finish({
            latitude: round(latitude, 7),
            longitude: round(longitude, 7),
            ...(Number.isFinite(accuracy) ? { accuracy: round(accuracy, 2) } : {}),
          });
        },
        () => finish(null),
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
      );
    } catch {
      finish(null);
    }
  });
}
