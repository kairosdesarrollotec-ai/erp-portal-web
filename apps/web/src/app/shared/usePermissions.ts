import { create } from 'zustand';
import { getFirebaseAuth } from '../providers/firebase';
import { getMyPermissions, type EffectivePermission, type PermissionModule } from './my-permissions-client';
import { useWorkSession } from './useWorkSession';

/**
 * Autorizacion por PERMISOS (no por rol) - roles dinamicos, ADM-02.
 *
 * Fuente unica: GET /me/permissions para el contexto empresa/sede vigente.
 * La seguridad real vive en el backend; esto es mejora de UX (no mostrar
 * acciones que el back va a rechazar con 403).
 *
 * Reglas:
 *  - mientras carga (o antes de cargar) NO se concede nada;
 *  - un error de carga deniega todo (deny-by-default);
 *  - al cambiar de empresa/sede se vacia y se vuelve a cargar.
 */
export type PermissionsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PermissionsContext {
  companyId: string;
  branchId: string;
}

export function permissionKey(module: PermissionModule | string, action: string): string {
  return `${module}.${action}`;
}

/** Funcion pura: ¿el conjunto de permisos concedidos incluye module.action? */
export function can(
  granted: ReadonlySet<string> | readonly EffectivePermission[],
  module: PermissionModule | string,
  action: string,
): boolean {
  const key = permissionKey(module, action);
  if (granted instanceof Set) return granted.has(key);
  return (granted as readonly EffectivePermission[]).some((p) => permissionKey(p.module, p.action) === key);
}

interface PermissionsState {
  status: PermissionsStatus;
  contextKey: string | null;
  granted: ReadonlySet<string>;
  matrixVersion: number | null;
  /**
   * Carga los permisos del contexto. Si ya estan cargados (o cargando) para
   * ese mismo contexto no repite la llamada, salvo `force`.
   */
  load: (context: PermissionsContext, options?: { force?: boolean }) => Promise<void>;
  reset: () => void;
}

const EMPTY: ReadonlySet<string> = new Set<string>();
let requestSeq = 0;

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  status: 'idle',
  contextKey: null,
  granted: EMPTY,
  matrixVersion: null,

  async load(context, options) {
    const key = `${context.companyId}:${context.branchId}`;
    const current = get();
    if (!options?.force && current.contextKey === key && (current.status === 'loading' || current.status === 'ready')) {
      return;
    }

    const seq = ++requestSeq;
    set({ status: 'loading', contextKey: key, granted: EMPTY, matrixVersion: null });

    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesion no disponible.');
      const idToken = await user.getIdToken();
      const result = await getMyPermissions(idToken, context.companyId, context.branchId);
      if (seq !== requestSeq) return; // llego tarde: el contexto cambio mientras tanto
      set({
        status: 'ready',
        granted: new Set(result.permissions.map((p) => permissionKey(p.module, p.action))),
        matrixVersion: result.matrixVersion,
      });
      // El nombre visible del rol viene de la API (header, tablero).
      if (result.role) useWorkSession.getState().setRole(result.role);
    } catch {
      if (seq !== requestSeq) return;
      set({ status: 'error', granted: EMPTY, matrixVersion: null });
    }
  },

  reset() {
    requestSeq++;
    set({ status: 'idle', contextKey: null, granted: EMPTY, matrixVersion: null });
  },
}));

export function usePermissions() {
  const status = usePermissionsStore((s) => s.status);
  const granted = usePermissionsStore((s) => s.granted);
  const matrixVersion = usePermissionsStore((s) => s.matrixVersion);

  return {
    status,
    matrixVersion,
    /** true solo cuando los permisos ya se cargaron correctamente. */
    ready: status === 'ready',
    can: (module: PermissionModule | string, action: string): boolean =>
      status === 'ready' && can(granted, module, action),
  };
}
