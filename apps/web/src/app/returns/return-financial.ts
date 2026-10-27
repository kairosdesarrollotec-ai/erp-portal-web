import type { ImmobilizationChargeResponse, ReturnDamageResponse } from './returns-client';

/** Formato de moneda del modulo (S/ 1,000.00). */
export function formatPen(amount: number): string {
  return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Nombre legible de un codigo de pano cuando el tarifario no esta cargado (PUERTA_CONDUCTOR -> Puerta conductor). */
export function humanizeZoneCode(code: string): string {
  const text = code.toLowerCase().replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Suma de danos con monto + cargos de paralizacion del expediente (la fuente
 * de verdad es ReturnResponse.damages / immobilizationCharges). Un dano
 * tecnico sin monto aun cuenta como incidencia abierta: no suma.
 */
export function totalCharges(
  damages: readonly ReturnDamageResponse[],
  charges: readonly ImmobilizationChargeResponse[],
): number {
  const damagesTotal = damages.reduce((acc, d) => acc + (d.estimatedAmount ?? 0), 0);
  const chargesTotal = charges.reduce((acc, c) => acc + c.totalAmount, 0);
  return round2(damagesTotal + chargesTotal);
}

export function hasGraveDamage(damages: readonly ReturnDamageResponse[]): boolean {
  return damages.some((d) => d.severity === 'GRAVE');
}

/** Danos tecnicos registrados sin monto del informe: siguen abiertos (DR-DEV-001). */
export function damagesWithoutAmount(damages: readonly ReturnDamageResponse[]): ReturnDamageResponse[] {
  return damages.filter((d) => d.estimatedAmount === null || d.estimatedAmount === undefined);
}

export const FUEL_MISSING_LINES: Record<string, number> = {
  FULL: 0,
  THREE_QUARTERS: 1,
  HALF: 2,
  ONE_QUARTER: 3,
  EMPTY: 4,
};

export function calculateFuelPenalty(
  fuelLevel?: string | null,
  ratePerLine: number = 50.00,
): number {
  if (!fuelLevel) return 0;
  const lines = FUEL_MISSING_LINES[fuelLevel] ?? 0;
  return round2(lines * ratePerLine);
}

