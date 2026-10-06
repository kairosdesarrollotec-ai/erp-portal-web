import { useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { createRole, deactivateRole, renameRole, RoleCommandError, type AdminRole } from './roles-client';
import type { AdminWorkContext } from './useWorkContextForAdmin';

/**
 * ADM-02 - gestion de roles dinamicos: crear, renombrar en linea (If-Match con
 * `version`) y desactivar. `reloadRoles` refresca la lista (y con ella la
 * matriz); ante un VERSION_CONFLICT se recarga siempre para mostrar la
 * version vigente.
 */
export function useRoleManagement(
  context: AdminWorkContext | null,
  reloadRoles: () => Promise<void>,
) {
  const [busy, setBusy] = useState(false);
  /** Error del formulario "Crear rol" (nombre invalido/duplicado), mostrado junto al campo. */
  const [createError, setCreateError] = useState<string | null>(null);
  /** Error del renombrado en linea, por rol. */
  const [renameError, setRenameError] = useState<{ roleId: string; message: string } | null>(null);
  /** Error general de acciones sobre la lista (desactivar, conflictos). */
  const [roleError, setRoleError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function withToken<T>(fn: (idToken: string) => Promise<T>): Promise<T> {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error('Sesion no disponible.');
    return fn(await user.getIdToken());
  }

  function clearMessages() {
    setCreateError(null);
    setRenameError(null);
    setRoleError(null);
    setNotice(null);
  }

  async function refreshAfterConflict() {
    try {
      await reloadRoles();
    } catch {
      // La lista queda como estaba; el aviso ya explica el conflicto.
    }
  }

  async function create(name: string): Promise<boolean> {
    if (!context) return false;
    clearMessages();
    setBusy(true);
    try {
      const role = await withToken((t) => createRole(t, context.companyId, context.branchId, name.trim()));
      await reloadRoles();
      setNotice(`Rol «${role.name}» creado sin permisos. Asígnale permisos en la matriz.`);
      return true;
    } catch (error) {
      setCreateError(error instanceof RoleCommandError ? error.message : 'No se pudo crear el rol.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function rename(role: AdminRole, name: string): Promise<boolean> {
    if (!context) return false;
    clearMessages();
    setBusy(true);
    try {
      await withToken((t) => renameRole(t, context.companyId, context.branchId, role, name.trim()));
      await reloadRoles();
      setNotice(`Rol renombrado a «${name.trim()}».`);
      return true;
    } catch (error) {
      const message = error instanceof RoleCommandError ? error.message : 'No se pudo renombrar el rol.';
      setRenameError({ roleId: role.id, message });
      if (error instanceof RoleCommandError && error.code === 'VERSION_CONFLICT') await refreshAfterConflict();
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(role: AdminRole): Promise<boolean> {
    if (!context) return false;
    clearMessages();
    setBusy(true);
    try {
      await withToken((t) => deactivateRole(t, context.companyId, context.branchId, role));
      await reloadRoles();
      setNotice(`Rol «${role.name}» desactivado.`);
      return true;
    } catch (error) {
      setRoleError(error instanceof RoleCommandError ? error.message : 'No se pudo desactivar el rol.');
      if (error instanceof RoleCommandError && error.code === 'VERSION_CONFLICT') await refreshAfterConflict();
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, createError, renameError, roleError, notice, create, rename, deactivate, clearMessages };
}
