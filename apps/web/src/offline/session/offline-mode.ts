import { create } from 'zustand';

/**
 * V-27 · SDD-KAIROS-TRANSVERSAL §17.1: sin conexión SOLO funcionan los checklists de entrega (ENTREGA-04) y de
 * recepción de devolución (DEV-04), más el centro de sincronización. Todo lo demás (confirmar, pagos, RENIEC/MTC,
 * disponibilidad, aprobaciones) exige conexión.
 */
interface OfflineModeState {
  active: boolean;
  setActive: (active: boolean) => void;
}

export const useOfflineMode = create<OfflineModeState>((set) => ({
  active: false,
  setActive: (active) => set({ active }),
}));

const OFFLINE_ALLOWED_PATTERNS: RegExp[] = [
  /^\/devoluciones\/[^/]+\/checklist\/?$/,
  /^\/alquileres\/[^/]+\/entrega-04\/?$/,
  /^\/sincronizacion\/?$/,
];

export function isOfflineAllowedPath(pathname: string): boolean {
  return OFFLINE_ALLOWED_PATTERNS.some((pattern) => pattern.test(pathname));
}
