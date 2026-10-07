/** Formatos de fecha para las pantallas REC-05..REC-08 (es-PE). */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-PE');
}

/** Acepta `YYYY-MM-DD` (fecha sin hora, se interpreta local) o un instante ISO. */
export function formatDate(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return date.toLocaleDateString('es-PE');
}
