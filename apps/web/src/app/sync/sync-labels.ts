import type { SyncConflict } from './sync-client';

const FIELD_LABELS: Record<string, string> = {
  technicalMinutes: 'Minutos técnicos',
  documentaryMinutes: 'Minutos documentarios',
  notes: 'Notas',
  exceptionReason: 'Motivo de excepción',
  fivDone: 'FIV completado',
  fckeDone: 'FCKE completado',
};

function humanize(text: string): string {
  const spaced = text.replace(/_/g, ' ').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Etiqueta de negocio del dato en conflicto (también la usa el Centro de sincronización TR-08). */
export function conflictSubject(conflict: SyncConflict): string {
  if (conflict.kind === 'EVIDENCE') {
    const [zone, slot] = conflict.key.split('#');
    return `Toma ${humanize(zone ?? conflict.key)}${slot ? ` n.º ${slot}` : ''}`;
  }
  return FIELD_LABELS[conflict.key] ?? conflict.key;
}
