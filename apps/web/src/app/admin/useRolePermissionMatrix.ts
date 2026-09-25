import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import {
  getRolePermissionMatrix,
  PermissionCommandError,
  RolePermissionEntry,
  RolePermissionMatrix,
} from './permissions-client';
import { useWorkContextForAdmin } from './useWorkContextForAdmin';
import { saveRolePermissionMatrix } from './permissions-client';

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

export type RolePermissionMatrixState = 'LOADING' | 'READY' | 'RECOVERABLE_ERROR';

export function useRolePermissionMatrix() {
  const { context, loading: contextLoading } = useWorkContextForAdmin();
  const [state, setState] = useState<RolePermissionMatrixState>('LOADING');
  const [matrix, setMatrix] = useState<RolePermissionMatrix | null>(null);
  const [pendingEntries, setPendingEntries] = useState<RolePermissionEntry[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
      const result = await getRolePermissionMatrix(idToken, context.companyId, context.branchId);
      setMatrix(result);
      setPendingEntries(result.entries);
      setState('READY');
    } catch {
      setState('RECOVERABLE_ERROR');
    }
  }, [context]);

  useEffect(() => {
    if (!contextLoading && context) {
      void reload();
    } else if (!contextLoading && !context) {
      setState('RECOVERABLE_ERROR');
    }
  }, [context, contextLoading, reload]);

  const dirty = useMemo(() => {
    if (!matrix || !pendingEntries) return false;
    if (matrix.entries.length !== pendingEntries.length) return true;
    return pendingEntries.some((entry) => {
      const original = matrix.entries.find(
        (e) => e.role === entry.role && e.module === entry.module && e.action === entry.action,
      );
      return !original || original.allowed !== entry.allowed;
    });
  }, [matrix, pendingEntries]);

  const conflicts = useMemo(() => {
    const set = new Set<string>();
    if (!pendingEntries) return set;
    const allowedByRole = new Map<string, Set<string>>();
    for (const entry of pendingEntries) {
      if (!entry.allowed) continue;
      const key = actionKey(entry.module, entry.action);
      const roleSet = allowedByRole.get(entry.role) ?? new Set<string>();
      roleSet.add(key);
      allowedByRole.set(entry.role, roleSet);
    }
    for (const [role, allowedActions] of allowedByRole) {
      for (const [first, second] of INCOMPATIBLE_ACTION_PAIRS) {
        if (allowedActions.has(first) && allowedActions.has(second)) {
          set.add(`${role}:${first}`);
          set.add(`${role}:${second}`);
        }
      }
    }
    return set;
  }, [pendingEntries]);

  function toggle(role: string, module: string, action: string): void {
    setPendingEntries((prev) => {
      if (!prev) return prev;
      return prev.map((entry) =>
        entry.role === role && entry.module === module && entry.action === action
          ? { ...entry, allowed: !entry.allowed }
          : entry,
      );
    });
  }

  async function save(): Promise<boolean> {
    if (!context || !pendingEntries) return false;
    setSaving(true);
    setSaveError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesion no disponible.');
      const idToken = await user.getIdToken();
      await saveRolePermissionMatrix(idToken, context.companyId, context.branchId, pendingEntries);
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
    if (matrix) setPendingEntries(matrix.entries);
    setSaveError(null);
  }

  return { state, matrix, pendingEntries, context, dirty, conflicts, saving, saveError, toggle, save, discard, reload };
}
