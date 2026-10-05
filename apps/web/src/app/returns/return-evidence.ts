/**
 * DEV-04 / TR-08 - constantes de evidencia de retorno. Mismos minimos que el
 * checklist de entrega (ALQ-09): 35 fotos + 3 videos (PANTALLAS-V3-B-DEVOLUCION.md
 * DEV-04). Las 5 zonas son las mismas de la entrega para poder comparar en DEV-05.
 */
export const REQUIRED_PHOTOS = 35;
export const REQUIRED_VIDEOS = 3;
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024; // mismo limite que Alquiler/Flota (SDD-00 16.5)
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // maximo del contrato returns.yaml (contentLength)

export interface ReturnZone {
  value: string;
  label: string;
}

export const RETURN_ZONES: readonly ReturnZone[] = [
  { value: 'FRONTAL', label: 'Frontal' },
  { value: 'LATERAL_IZQUIERDO', label: 'Lateral izquierdo' },
  { value: 'LATERAL_DERECHO', label: 'Lateral derecho' },
  { value: 'POSTERIOR', label: 'Posterior' },
  { value: 'INTERIOR', label: 'Interior' },
];

export function zoneLabel(value: string): string {
  return RETURN_ZONES.find((z) => z.value === value)?.label ?? value;
}

export const PHOTO_TYPES = ['image/jpeg', 'image/webp'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm'];
