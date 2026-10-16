import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import {
  getRolePermissionMatrix,
  PermissionCommandError,
  saveRolePermissionMatrix,
  type MatrixScope,
  type RolePermissionEntry,
  type RolePermissionMatrix,
} from './permissions-client';
import { listRoles, type AdminRole } from './roles-client';
import { getOrganizationCompanies, type OrganizationCompany } from './admin-users-client';
import { useWorkContextForAdmin } from './useWorkContextForAdmin';
import { isPlatformAdminRole } from '../shared/role-ref';

/**
 * ADM-02 - contrato punto 8: "ciertas combinaciones de permisos
 * incompatibles no se permiten a la vez". Mismo par PROVISIONAL que
 * valida el backend (permission-action-catalog.ts) - se replica aqui
 * solo para dar feedback inmediato en la celda (borde rojo + tooltip),
 * el backend sigue siendo quien realmente lo bloquea al guardar.
 */
const INCOMPATIBLE_ACTION_PAIRS: readonly [string, string][] = [
  ['RESERVATION.REGISTER_PAYMENT', 'RESERVATION.CONFIRM'],
];

function actionKey(module: string, action: string): string {
  return `${module}.${action}`;
}

function cellKey(roleId: string, module: string, action: string): string {
  return `${roleId}|${actionKey(module, action)}`;
}

/** El rol PLATFORM_ADMIN es fijo (no delegable): su fila es de solo lectura. */
export function isReadOnlyRole(role: AdminRole): boolean {
  return isPlatformAdminRole(role);
}

export type RolePermissionMatrixState = 'LOADING' | 'READY' | 'RECOVERABLE_ERROR';

export const ORGANIZATION_SCOPE: MatrixScope = { companyId: null, branchId: null };

/**
 * Una entrada por cada combinacion rol ACTIVO x accion del catalogo (el back
 * exige la matriz completa). Los roles nuevos, que aun no tienen entradas,
 * entran con todo denegado (deny-by-default); las entradas de roles
 * desactivados o fuera del catalogo se descartan.
 */
export function buildFullEntries(
  roles: readonly AdminRole[],
  matrix: RolePermissionMatrix,
): RolePermissionEntry[] {
  const known = new Map<string, boolean>();
  for (const entry of matrix.entries) known.set(cellKey(entry.roleId, entry.module, entry.action), entry.allowed);
  const entries: RolePermissionEntry[] = [];
  for (const role of roles) {
    for (const descriptor of matrix.actionCatalog) {
      entries.push({
        roleId: role.id,
        module: descriptor.module,
        action: descriptor.action,
        allowed: known.get(cellKey(role.id, descriptor.module, descriptor.action)) ?? false,
      });
    }
  }
  return entries;
}

export function useRolePermissionMatrix() {
  const { context, loading: contextLoading } = useWorkContextForAdmin();
  const [state, setState] = useState<RolePermissionMatrixState>('LOADING');
  const [matrix, setMatrix] = useState<RolePermissionMatrix | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  /** Ediciones sin guardar sobre la matriz vigente: cellKey -> allowed. */
  const [edits, setEdits] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<OrganizationCompany[]>([]);
  const [scope, setScope] = useState<MatrixScope>(ORGANIZATION_SCOPE);

  const reloadRoles = useCallback(async () => {
    if (!context) return;
    const user = getFirebaseAuth().currentUser;
    if (!user) return;
    const idToken = await user.getIdToken();
    // Solo roles activos: son las columnas/filas editables de la matriz.
    const result = await listRoles(idToken, context.companyId, context.branchId);
    setRoles(result.filter((role) => role.active));
  }, [context]);

  const reload = useCallback(async () => {
    if (!context) return;
    setState('LOADING');
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        setState('RECOVERABLE_ERROR');
        return;
      }
      const idToken = await user.getIdToken();
      const [result, roleList] = await Promise.all([
        getRolePermissionMatrix(idToken, context.companyId, context.branchId),
        listRoles(idToken, context.companyId, context.branchId),
      ]);
      setMatrix(result);
      setRoles(roleList.filter((role) => role.active));
      setEdits({});
      setState('READY');
    } catch {
      setState('RECOVERABLE_ERROR');
    }
  }, [context]);

  useEffect(() => {
    if (!contextLoading && context) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload();
      void (async () => {
        try {
          const user = getFirebaseAuth().currentUser;
          if (!user) return;
          const idToken = await user.getIdToken();
          setCompanies(await getOrganizationCompanies(idToken, context.companyId, context.branchId));
        } catch {
          // El selector de ambito queda solo con "Toda la organizacion".
        }
      })();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
  }, [context, contextLoading, reload]);

  /** Matriz vigente completa (sin ediciones). */
  const baselineEntries = useMemo(() => (matrix ? buildFullEntries(roles, matrix) : []), [matrix, roles]);

  /** Matriz con las ediciones aplicadas: lo que se muestra y lo que se guarda. */
  const pendingEntries = useMemo(
    () =>
      baselineEntries.map((entry) => {
        const edited = edits[cellKey(entry.roleId, entry.module, entry.action)];
        return edited === undefined ? entry : { ...entry, allowed: edited };
      }),
    [baselineEntries, edits],
  );

  const dirty = Object.keys(edits).length > 0;

  /**
   * Acciones del catalogo que la version vigente aun no contiene (p. ej. FLAG_SALE, RESOLVE_SALE y CHANGE_VEHICLE
   * en una matriz guardada antes de que existieran). El back las deniega hasta que se guarde una version nueva
   * (deny-by-default), asi que la pantalla avisa y permite guardar aunque no haya ediciones.
   */
  const newActions = useMemo(
    () =>
      matrix
        ? matrix.actionCatalog.filter(
            (descriptor) => !matrix.entries.some((e) => e.module === descriptor.module && e.action === descriptor.action),
          )
        : [],
    [matrix],
  );

  const conflicts = useMemo(() => {
    const set = new Set<string>();
    const allowedByRole = new Map<string, Set<string>>();
    for (const entry of pendingEntries) {
      if (!entry.allowed) continue;
      const key = actionKey(entry.module, entry.action);
      const roleSet = allowedByRole.get(entry.roleId) ?? new Set<string>();
      roleSet.add(key);
      allowedByRole.set(entry.roleId, roleSet);
    }
    for (const [roleId, allowedActions] of allowedByRole) {
      for (const [first, second] of INCOMPATIBLE_ACTION_PAIRS) {
        if (allowedActions.has(first) && allowedActions.has(second)) {
          set.add(`${roleId}:${first}`);
          set.add(`${roleId}:${second}`);
        }
      }
    }
    return set;
  }, [pendingEntries]);

  function toggle(roleId: string, module: string, action: string): void {
    const role = roles.find((r) => r.id === roleId);
    if (!role || isReadOnlyRole(role)) return;
    const key = cellKey(roleId, module, action);
    const base = baselineEntries.find((e) => e.roleId === roleId && e.module === module && e.action === action);
    const current = edits[key] ?? base?.allowed ?? false;
    setEdits((prev) => {
      const next = { ...prev };
      // Volver al valor vigente deja de contar como cambio.
      if (!current === (base?.allowed ?? false)) delete next[key];
      else next[key] = !current;
      return next;
    });
  }

  async function save(): Promise<boolean> {
    if (!context || !matrix) return false;
    setSaving(true);
    setSaveError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesion no disponible.');
      const idToken = await user.getIdToken();
      await saveRolePermissionMatrix(idToken, context.companyId, context.branchId, pendingEntries, scope);
      await reload();
      return true;
    } catch (error) {
      setSaveError(error instanceof PermissionCommandError ? error.message : 'No se pudo guardar el cambio.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  function discard(): void {
    setEdits({});
    setSaveError(null);
  }

  return {
    state,
    matrix,
    roles,
    pendingEntries,
    context,
    dirty,
    newActions,
    conflicts,
    saving,
    saveError,
    companies,
    scope,
    setScope,
    toggle,
    save,
    discard,
    reload,
    reloadRoles,
  };
}
