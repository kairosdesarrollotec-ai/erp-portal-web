import type { components } from '../../api/hr-administration.generated';
import { limaDateAndTimeToInstant, limaToday } from '../shared/lima-time';

export type EmployeeStatus = components['schemas']['EmployeeStatus'];
export type TerminationReason = components['schemas']['TerminationReason'];
export type AttendanceStatus = components['schemas']['AttendanceStatus'];
export type LeaveType = components['schemas']['LeaveType'];
export type LeaveStatus = components['schemas']['LeaveStatus'];
export type VacationStatus = components['schemas']['VacationStatus'];
export type FieldTripStatus = components['schemas']['FieldTripStatus'];

export const EMPLOYEE_STATUS_LABEL: Record<EmployeeStatus, string> = {
  PERIODO_PRUEBA: 'Periodo de prueba',
  PLANILLA: 'Planilla',
  TERMINADO: 'Terminado',
};

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENTE: 'Presente',
  TARDANZA: 'Tardanza',
  FALTA_JUSTIFICADA: 'Falta justificada',
  FALTA_INJUSTIFICADA: 'Falta injustificada',
  PERMISO: 'Permiso',
};

/** Estados que el calendario de ADP-02 permite registrar a mano. */
export const MANUAL_ATTENDANCE_OPTIONS: readonly AttendanceStatus[] = ['PRESENTE', 'TARDANZA', 'PERMISO'];

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  PERMISO_HORAS: 'Permiso por horas',
  SALIDA_ANTES_DE_HORA: 'Salida antes de hora',
  LICENCIA_MEDICA: 'Licencia médica',
  PERSONAL: 'Asunto personal',
};

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  SOLICITADO: 'Solicitado',
  AUTORIZADO: 'Autorizado',
  DENEGADO: 'Denegado',
};

export const VACATION_STATUS_LABEL: Record<VacationStatus, string> = {
  SOLICITADA: 'Solicitada',
  PROGRAMADA: 'Programada',
  REPROGRAMADA: 'Reprogramada',
  CANCELADA: 'Cancelada',
  COMPLETADA: 'Completada',
};

/** Vacaciones que ocupan el cupo del area (BR-ADP-002). */
export const ACTIVE_VACATION_STATUSES: readonly VacationStatus[] = ['SOLICITADA', 'PROGRAMADA', 'REPROGRAMADA'];

export const FIELD_TRIP_STATUS_LABEL: Record<FieldTripStatus, string> = {
  PENDIENTE_NIVEL_1: 'Esperando nivel 1',
  PENDIENTE_NIVEL_2: 'Esperando nivel 2',
  PENDIENTE_NIVEL_3: 'Esperando nivel 3',
  AUTORIZADA: 'Autorizada',
  NO_AUTORIZADA: 'Sin autorización',
  CERRADA_NORMAL: 'Cerrada',
  OBSERVADA: 'Cerrada con persona observada',
};

export const TERMINATION_REASON_LABEL: Record<TerminationReason, string> = {
  RENUNCIA: 'Renuncia',
  DESPIDO: 'Despido',
};

/** Cascada BR-ADP-004: exactamente 3 niveles (no existe un cuarto). */
/** La cascada es generica: nunca se nombra a una persona, la autorizacion la decide el permiso (BR-ADP-004). */
export const CASCADE_LEVEL_LABEL: Record<1 | 2 | 3, string> = { 1: 'Nivel 1 de 3', 2: 'Nivel 2 de 3', 3: 'Nivel 3 de 3' };
export const CASCADE_TIMEOUT_SECONDS = 300;

export const ORDINAL_FEM = ['', '1ª', '2ª', '3ª', '4ª'];
export function ordinal(n: number): string {
  return n >= 1 && n <= 4 ? ORDINAL_FEM[n] : `${n}ª`;
}

/** "S/ 45.00" */
export function formatSoles(amount: number): string {
  return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD en hora local. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** YYYY-MM en hora local. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} de ${y}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

/** Fecha de hoy (YYYY-MM-DD) en hora de Lima, la misma que usa el servidor para cerrar el mes. */
export { limaToday };

/** BR-ADP-001: los descuentos se aplican al cerrar el mes, no antes. Se puede aplicar desde el ultimo dia del mes (hora de Lima). */
export function isMonthClosing(month: string, now: Date = new Date()): boolean {
  const lastDay = `${month}-${pad(daysInMonth(month))}`;
  return limaToday(now) >= lastDay;
}

/** Ultimo dia del mes, listo para mostrar (dd/mm/aaaa). */
export function monthEndLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${pad(daysInMonth(month))}/${pad(m)}/${y}`;
}

/** Combina fecha YYYY-MM-DD y hora HH:mm (ambas de Lima, DEC-TZ-LIMA-001) en un instante ISO. */
export function localToIso(date: string, time: string): string {
  return limaDateAndTimeToInstant(date, time) ?? new Date(`${date}T${time}:00`).toISOString();
}

// --- Asistencia -------------------------------------------------------------------

/** Numero de la falta del mes que se esta por registrar (las del mes ya registradas + 1). */
export function absenceNumberInMonth(records: readonly { status: AttendanceStatus; date: string }[], date: string): number {
  const month = date.slice(0, 7);
  const previous = records.filter(
    (r) => r.date.slice(0, 7) === month && r.date < date && (r.status === 'FALTA_INJUSTIFICADA' || r.status === 'FALTA_JUSTIFICADA'),
  ).length;
  return previous + 1;
}

// --- Vacaciones (BR-ADP-002) ------------------------------------------------------

export interface DateRange {
  startDate: string;
  endDate: string;
}

/** Primera vacacion activa de OTRA persona del area que se superpone con el rango pedido. */
export function findVacationConflict<T extends DateRange & { employeeId: string; status: VacationStatus; requestedAt: string }>(
  existing: readonly T[],
  employeeId: string,
  range: DateRange,
): T | null {
  const conflicts = existing
    .filter(
      (v) =>
        v.employeeId !== employeeId &&
        ACTIVE_VACATION_STATUSES.includes(v.status) &&
        v.startDate <= range.endDate &&
        v.endDate >= range.startDate,
    )
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
  return conflicts[0] ?? null;
}

/** Anios que toca el rango, para consultar el calendario del area. */
export function yearsOfRange(range: DateRange): number[] {
  const from = Number(range.startDate.slice(0, 4));
  const to = Number(range.endDate.slice(0, 4));
  const years: number[] = [];
  for (let y = from; y <= to; y += 1) years.push(y);
  return years;
}

// --- Salidas a campo (BR-ADP-004 / BR-ADP-005) ------------------------------------

export function pendingLevel(status: FieldTripStatus): 1 | 2 | 3 | null {
  if (status === 'PENDIENTE_NIVEL_1') return 1;
  if (status === 'PENDIENTE_NIVEL_2') return 2;
  if (status === 'PENDIENTE_NIVEL_3') return 3;
  return null;
}

export function levelTimeoutAt(
  trip: { level1TimeoutAt?: string | null; level2TimeoutAt?: string | null; level3TimeoutAt?: string | null },
  level: 1 | 2 | 3,
): string | null {
  const value = level === 1 ? trip.level1TimeoutAt : level === 2 ? trip.level2TimeoutAt : trip.level3TimeoutAt;
  return value ?? null;
}

export function remainingSeconds(timeoutAt: string, nowMs: number): number {
  return Math.max(0, Math.ceil((new Date(timeoutAt).getTime() - nowMs) / 1000));
}

/** "04:12" */
export function formatCountdown(totalSeconds: number): string {
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
}

export interface ReturnPreview {
  isLate: boolean;
  lateMinutes: number;
  /** Numero de incumplimiento que seria esta tardanza (previas + 1). 0 si llega a tiempo. */
  lateNumber: number;
  willBeObserved: boolean;
}

/** Vista previa de BR-ADP-005 (1ª a 3ª advertencia, 4ª observado); la decision final la toma el servidor. */
export function previewReturn(previousLateCount: number, estimatedReturn: string, actualReturn: string): ReturnPreview {
  const diff = new Date(actualReturn).getTime() - new Date(estimatedReturn).getTime();
  const lateMinutes = Math.max(0, Math.floor(diff / 60_000));
  if (lateMinutes === 0) return { isLate: false, lateMinutes: 0, lateNumber: 0, willBeObserved: false };
  const lateNumber = previousLateCount + 1;
  return { isLate: true, lateMinutes, lateNumber, willBeObserved: lateNumber >= 4 };
}

// --- Termino de la relacion laboral (BR-ADP-006) ----------------------------------

/** Dias de aviso entre la fecha de aviso y el ultimo dia trabajado (0 si no hay aviso). */
export function noticeDaysBetween(noticeDate: string, lastDay: string): number {
  if (!noticeDate || !lastDay) return 0;
  const diff = (new Date(`${lastDay}T00:00:00`).getTime() - new Date(`${noticeDate}T00:00:00`).getTime()) / 86_400_000;
  return Math.max(0, Math.round(diff));
}

/** El contrato no tiene catalogo de areas: un area nueva recibe un id estable derivado de su nombre. */
export function areaIdFromName(name: string): string {
  return name
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
