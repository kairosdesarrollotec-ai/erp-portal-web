/**
 * Zona horaria de negocio America/Lima (DEC-TZ-LIMA-001).
 *
 * Lima es UTC-5 todo el año (sin horario de verano), por eso el desfase es una constante.
 * Reglas:
 *  - una fecha sin hora (`YYYY-MM-DD`) que se ENVIA al backend significa 00:00 de Lima;
 *  - una hora local sin offset (`YYYY-MM-DDTHH:mm[:ss]`) que se ENVIA se interpreta como hora de Lima;
 *  - todo instante ISO UTC que se MUESTRA se convierte a hora de Lima (no a la del navegador);
 *  - una fecha sin hora que se MUESTRA no se desplaza: es el dia calendario de Lima tal cual.
 */
export const LIMA_TIME_ZONE = 'America/Lima';
const LIMA_OFFSET = '-05:00';
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

const pad = (n: number) => String(n).padStart(2, '0');

export function isDateOnly(value: string): boolean {
  return DATE_ONLY_RE.test(value);
}

/** True si el texto trae offset explicito (`Z` o `+hh:mm`). */
function hasOffset(value: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
}

function parseInstant(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Partes de calendario de un instante vistas desde Lima. */
function limaParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const shifted = new Date(date.getTime() - LIMA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

// --- Enviar al backend -------------------------------------------------------------

/** `YYYY-MM-DD` (dia de Lima) -> instante UTC ISO de las 00:00 de Lima. `null` si no es una fecha valida. */
export function limaDateToInstant(date: string): string | null {
  if (!isDateOnly(date)) return null;
  const parsed = new Date(`${date}T00:00:00.000${LIMA_OFFSET}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Hora de Lima sin offset (`YYYY-MM-DDTHH:mm[:ss]`, p. ej. el valor de un `datetime-local`) -> instante UTC ISO.
 * Si ya trae offset explicito se respeta. `null` si no se puede interpretar.
 */
export function limaDateTimeToInstant(value: string): string | null {
  if (!value) return null;
  if (hasOffset(value)) return parseInstant(value)?.toISOString() ?? null;
  const match = LOCAL_DATE_TIME_RE.exec(value);
  if (!match) return null;
  const [, day, hh, mm, ss] = match;
  const parsed = new Date(`${day}T${hh}:${mm}:${ss ?? '00'}.000${LIMA_OFFSET}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Fecha (`YYYY-MM-DD`) + hora (`HH:mm`) de Lima -> instante UTC ISO. */
export function limaDateAndTimeToInstant(date: string, time: string): string | null {
  return limaDateTimeToInstant(`${date}T${time}`);
}

/** Suma `days` dias calendario a una fecha `YYYY-MM-DD` (sin zona horaria de por medio). */
export function addDaysToDateOnly(date: string, days: number): string | null {
  const match = DATE_ONLY_RE.exec(date);
  if (!match) return null;
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) + days * DAY_MS;
  const d = new Date(utc);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// --- Hoy / entradas ----------------------------------------------------------------

/** Dia de hoy en Lima (`YYYY-MM-DD`). Entre las 19:00 y las 23:59 de Lima el dia UTC ya es el siguiente: no usar toISOString. */
export function limaToday(now: Date = new Date()): string {
  const p = limaParts(now);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Instante -> `YYYY-MM-DD` del dia de Lima (fecha sin hora pasa tal cual). `''` si no es valido. */
export function toLimaDateOnly(value: string | null | undefined): string {
  if (!value) return '';
  if (isDateOnly(value)) return value;
  const date = parseInstant(value);
  if (!date) return '';
  const p = limaParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Instante -> `YYYY-MM-DDTHH:mm` en hora de Lima (valor para `<input type="datetime-local">`). `''` si no es valido. */
export function toLimaInputValue(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : parseInstant(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  const p = limaParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Valor de `datetime-local` del instante actual en Lima. */
export function limaNowInputValue(now: Date = new Date()): string {
  return toLimaInputValue(now);
}

// --- Mostrar -----------------------------------------------------------------------

const DASH = '—';

function dmy(parts: { year: number; month: number; day: number }): string {
  return `${parts.day}/${parts.month}/${parts.year}`;
}

/** `d/m/aaaa` (dia de Lima). Acepta fecha sin hora (no se desplaza) o instante ISO. */
export function formatLimaDate(value: string | null | undefined): string {
  if (!value) return DASH;
  const only = DATE_ONLY_RE.exec(value);
  if (only) return dmy({ year: Number(only[1]), month: Number(only[2]), day: Number(only[3]) });
  const date = parseInstant(value);
  return date ? dmy(limaParts(date)) : DASH;
}

/** `dd/mm` (dia de Lima). `''` si no es valido (para textos compuestos). */
export function formatLimaDayMonth(value: string | null | undefined): string {
  if (!value) return '';
  const only = DATE_ONLY_RE.exec(value);
  if (only) return `${only[3]}/${only[2]}`;
  const date = parseInstant(value);
  if (!date) return '';
  const p = limaParts(date);
  return `${pad(p.day)}/${pad(p.month)}`;
}

/** `HH:mm` (24 h) en hora de Lima. */
export function formatLimaTime(value: string | null | undefined): string {
  const date = parseInstant(value);
  if (!date) return DASH;
  const p = limaParts(date);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** `d/m/aaaa HH:mm` en hora de Lima. */
export function formatLimaDateTime(value: string | null | undefined): string {
  const date = parseInstant(value);
  if (!date) return DASH;
  const p = limaParts(date);
  return `${dmy(p)} ${pad(p.hour)}:${pad(p.minute)}`;
}

/** Ultimo milisegundo del dia de Lima `YYYY-MM-DD` (para filtros "hasta" inclusivos) -> instante UTC ISO. */
export function limaEndOfDayInstant(date: string): string | null {
  const next = addDaysToDateOnly(date, 1);
  const start = next ? limaDateToInstant(next) : null;
  return start ? new Date(new Date(start).getTime() - 1).toISOString() : null;
}
