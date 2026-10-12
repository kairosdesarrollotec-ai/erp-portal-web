/**
 * Dominio de Pagos y Garantías (PAG-01/PAG-02).
 * Fuente: BDD-PAG-001, SDD-PAG-001, payments.yaml v0.1.0.
 */

export type DepositStatus = 'HELD' | 'RETURNED' | 'RETAINED' | 'PARTIALLY_RETAINED';
export type AdjustmentType = 'DISCOUNT' | 'FULL_RETENTION' | 'RELEASE' | 'IMMOBILIZATION_CHARGE';

export const DEPOSIT_STATUSES: readonly DepositStatus[] = [
  'HELD',
  'RETURNED',
  'RETAINED',
  'PARTIALLY_RETAINED',
];

export const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  HELD: 'En custodia',
  RETURNED: 'Devuelta',
  RETAINED: 'Retenida',
  PARTIALLY_RETAINED: 'Parcialmente retenida',
};

export const ADJUSTMENT_TYPE_LABELS: Record<AdjustmentType, string> = {
  DISCOUNT: 'Descuento por daño estético',
  FULL_RETENTION: 'Retención total',
  RELEASE: 'Liberación de fondos',
  IMMOBILIZATION_CHARGE: 'Cargo por inmovilización',
};

export const ADJUSTMENT_TYPES: readonly AdjustmentType[] = [
  'DISCOUNT',
  'FULL_RETENTION',
  'RELEASE',
  'IMMOBILIZATION_CHARGE',
];

/** Estados terminales: no admiten más ajustes ni comandos. BR-PAG fuente: payments.yaml v0.1.0. */
export function isTerminalStatus(status: DepositStatus): boolean {
  return status === 'RETURNED' || status === 'RETAINED';
}

/** Formato de moneda local (S/ para Perú). */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
