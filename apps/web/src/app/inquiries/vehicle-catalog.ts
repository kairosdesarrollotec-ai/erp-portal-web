/**
 * CON-03 - catálogo de vehículos MOCK/estático.
 *
 * Limitación conocida y documentada: TDD-CON-001.md establece que
 * `FleetAvailabilityPort` es responsabilidad del módulo Fleet, que todavía
 * no existe como servicio real. Este catálogo fijo permite completar el
 * flujo de cotización (`POST /inquiries/{id}/commands/quote`) sin depender
 * de Fleet. Cuando Fleet exista, este archivo se reemplaza por una llamada
 * real (p.ej. `GET /fleet/available`) sin tocar `InquiryVehiclesScreen.tsx`
 * ni `useInquiryVehicles.ts` - solo la fuente de `VEHICLE_CATALOG`.
 */
export interface CatalogVehicle {
  id: string;
  model: string;
  photoUrl: string;
  dailyRate: number;
  currency: string;
}

export const VEHICLE_CATALOG: CatalogVehicle[] = [
  {
    id: 'f1a2b3c4-d5e6-4789-8a0b-c1d2e3f40001',
    model: 'Toyota Hilux 4x4',
    photoUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=480&q=60',
    dailyRate: 220,
    currency: 'PEN',
  },
  {
    id: 'f1a2b3c4-d5e6-4789-8a0b-c1d2e3f40002',
    model: 'Hyundai Tucson',
    photoUrl: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=480&q=60',
    dailyRate: 180,
    currency: 'PEN',
  },
  {
    id: 'f1a2b3c4-d5e6-4789-8a0b-c1d2e3f40003',
    model: 'Kia Rio',
    photoUrl: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=480&q=60',
    dailyRate: 120,
    currency: 'PEN',
  },
];

/** Tarifa fija (rate card) - misma lógica simple que aplica el backend. */
export function estimateQuoteTotal(dailyRate: number, estimatedDays: number): number {
  return Math.round(dailyRate * Math.max(estimatedDays, 1) * 100) / 100;
}
