import type { WorkContextAssignment } from './work-context-client';

const KEY = 'kairos-erp:work-context';

interface RememberedContext {
  companyId: string;
  branchId: string;
}

/** Recuerda la empresa/sede elegida en esta pestaña para que recargar o abrir una URL directa no pierda el contexto. */
export function rememberWorkContext(ctx: RememberedContext): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ companyId: ctx.companyId, branchId: ctx.branchId }));
  } catch {
    // sessionStorage no disponible: se vuelve a pedir la selección.
  }
}

export function forgetWorkContext(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // sin efecto
  }
}

/** Devuelve la asignación recordada solo si el usuario actual sigue teniéndola; si no, null. */
export function recallWorkContext(assignments: WorkContextAssignment[]): WorkContextAssignment | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<RememberedContext>;
    return assignments.find((a) => a.companyId === saved.companyId && a.branchId === saved.branchId) ?? null;
  } catch {
    return null;
  }
}
