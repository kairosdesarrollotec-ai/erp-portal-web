/**
 * CON-03 - utilidades de cotización de vehículos.
 *
 * El catálogo de vehículos disponibles proviene ahora del módulo Fleet
 * real (`fleet-client.ts` / `listVehicles`) - ver `useInquiryVehicles.ts`.
 * Esta función de cálculo de tarifa se mantiene aparte porque es pura y
 * no depende de la fuente del vehículo (mock o Fleet).
 */

/** Tarifa fija (rate card) - misma lógica simple que aplica el backend. */
export function estimateQuoteTotal(dailyRate: number, estimatedDays: number): number {
  return Math.round(dailyRate * Math.max(estimatedDays, 1) * 100) / 100;
}
