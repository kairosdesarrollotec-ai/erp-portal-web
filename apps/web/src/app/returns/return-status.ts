export type ReturnStatus =
  | 'PROGRAMADA'
  | 'RECEPCION_PROVISIONAL'
  | 'INSPECCION'
  | 'SIN_DANOS'
  | 'CON_DANOS'
  | 'CIERRE_FINANCIERO'
  | 'CERRADA'
  | 'CANCELADA';

export type CustodyHolder = 'CLIENTE' | 'VELOXRENT' | 'TALLER';
export type DamageOrigin = 'AESTHETIC' | 'TECHNICAL';
export type DamageSeverity = 'LEVE' | 'MODERADO' | 'GRAVE';
export type ReturnFuelLevel = 'EMPTY' | 'ONE_QUARTER' | 'HALF' | 'THREE_QUARTERS' | 'FULL';
export type ReturnAlcoholTestResult = 'FAVORABLE' | 'DESFAVORABLE' | 'RECHAZADO';

/**
 * PANTALLAS-V3-B-DEVOLUCION.md DEV-01 - badges de la bandeja:
 * Programada (neutro), Recepcion (info), En evaluacion (acento),
 * Financiero (secundario), Cerrada (exito).
 */
export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  PROGRAMADA: 'Programada',
  RECEPCION_PROVISIONAL: 'Recepción',
  INSPECCION: 'En evaluación',
  SIN_DANOS: 'En evaluación',
  CON_DANOS: 'En evaluación',
  CIERRE_FINANCIERO: 'Financiero',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
};

export const FUEL_LEVEL_LABELS: Record<ReturnFuelLevel, string> = {
  EMPTY: 'Vacío',
  ONE_QUARTER: '1/4',
  HALF: '1/2',
  THREE_QUARTERS: '3/4',
  FULL: 'Lleno',
};

export const ALCOHOL_RESULT_LABELS: Record<ReturnAlcoholTestResult, string> = {
  FAVORABLE: 'Favorable',
  DESFAVORABLE: 'Desfavorable',
  RECHAZADO: 'Rechazado (se negó a la prueba)',
};

/** Semaforo del cliente: el texto siempre acompana al color (no es el unico indicador). */
export const CUSTOMER_RISK_LABELS: Record<'NORMAL' | 'AMBAR' | 'ROJO', string> = {
  NORMAL: 'Sin observación',
  AMBAR: 'Ámbar',
  ROJO: 'Rojo',
};

export const SEVERITY_LABELS: Record<DamageSeverity, string> = {
  LEVE: 'Leve',
  MODERADO: 'Moderado',
  GRAVE: 'Grave',
};

/** Estados que ya no admiten ninguna accion de proceso. */
export function isReturnFinal(status: ReturnStatus): boolean {
  return status === 'CERRADA' || status === 'CANCELADA';
}

/**
 * Pantalla del proceso donde "Continuar" retoma el expediente segun su estado
 * (DEV-01 -> fila; ver MAPA-NAVEGACION-COMPLETO.md seccion 3). PROGRAMADA no
 * tiene expediente de recepcion aun: la recepcion se identifica por alquiler.
 */
export function returnPathForStatus(id: string, rentalId: string, status: ReturnStatus): string {
  switch (status) {
    case 'PROGRAMADA':
      return `/devoluciones/recepcion/${rentalId}`;
    case 'RECEPCION_PROVISIONAL':
      return `/devoluciones/${id}/alcoholimetro`;
    case 'INSPECCION':
      return `/devoluciones/${id}/checklist`;
    case 'SIN_DANOS':
    case 'CON_DANOS':
      return `/devoluciones/${id}/resultado`;
    case 'CIERRE_FINANCIERO':
    case 'CERRADA':
    case 'CANCELADA':
      return `/devoluciones/${id}/cierre`;
  }
}

/** Plazo maximo de liberacion de garantia: 24 h naturales (BR-DEV-001). */
export const GUARANTEE_WINDOW_HOURS = 24;

export function hoursSince(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const ms = now.getTime() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return ms / (1000 * 60 * 60);
}
