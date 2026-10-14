import { formatPen } from './return-financial';
import { formatLimaDateTime } from '../shared/lima-time';
import type { ImmobilizationAlert, WarrantyReleaseAlert } from './returns-types';

function hoursLabel(hours: number): string {
  const rounded = Math.round(Math.abs(hours) * 10) / 10;
  return `${String(rounded).replace('.', ',')} h`;
}

export function warrantyAlertTitle(alert: WarrantyReleaseAlert): string {
  return alert.level === 'OVERDUE' ? 'Garantía vencida: liberar ya' : 'Garantía por liberar';
}

/** Texto del banner: plazo maximo de 24 h naturales desde la recepcion (BR-DEV-001), en hora de Lima. */
export function warrantyAlertText(alert: WarrantyReleaseAlert): string {
  const deadline = formatLimaDateTime(alert.deadlineAt);
  return alert.hoursRemaining < 0
    ? `El plazo de 24 h venció el ${deadline} (hace ${hoursLabel(alert.hoursRemaining)}). Libera la garantía cuanto antes.`
    : `Vence el ${deadline} (faltan ${hoursLabel(alert.hoursRemaining)}).`;
}

export function immobilizationAlertTitle(): string {
  return 'Inmovilización por más de 24 h sin cobrar';
}

/** El cobro NO es automatico: el texto remite al flujo manual de "cobro por paralizacion". */
export function immobilizationAlertText(alert: ImmobilizationAlert): string {
  const days = `${alert.pendingDays} día${alert.pendingDays === 1 ? '' : 's'}`;
  const suggested =
    alert.suggestedAmount != null ? ` Monto sugerido: ${formatPen(alert.suggestedAmount)} (el cobro es manual).` : ' El cobro es manual.';
  return `Han pasado ${hoursLabel(alert.hoursElapsed)} desde la recepción: ${days} de paralización pendiente${alert.pendingDays === 1 ? '' : 's'} de cobro.${suggested}`;
}
