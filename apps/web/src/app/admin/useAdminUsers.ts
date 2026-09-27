import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import {
  AdminCommandError,
  assignUserToCompany,
  deactivateAssignment,
  listOrganizationUsers,
  OrganizationUserAssignment,
} from './admin-users-client';
import { useWorkContextForAdmin } from './useWorkContextForAdmin';
import type { WorkerRole } from '../dashboard/worker-role';

/** ADM-01 - estados READY/LOADING/EMPTY/RECOVERABLE_ERROR (contrato punto 9). */
export type AdminUsersState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR';

export interface AssignUserFormInput {
  targetEmail: string;
  targetCompanyId: string;
  targetBranchId: string;
  targetRole: WorkerRole;
  initialPassword: string;
}

export function useAdminUsers() {
  const { context, loading: contextLoading } = useWorkContextForAdmin();
  const [state, setState] = useState<AdminUsersState>('LOADING');
  const [users, setUsers] = useState<OrganizationUserAssignment[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
      const results = await listOrganizationUsers(idToken, context.companyId, context.branchId);
      setUsers(results);
      setState(results.length === 0 ? 'EMPTY' : 'READY');
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

  async function assign(input: AssignUserFormInput): Promise<boolean> {
    if (!context) return false;
    setAssigning(true);
    setAssignError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesion no disponible.');
      const idToken = await user.getIdToken();
      await assignUserToCompany(idToken, {
        companyId: context.companyId,
        branchId: context.branchId,
        ...input,
      });
      await reload();
      return true;
    } catch (error) {
      setAssignError(error instanceof AdminCommandError ? error.message : 'No se pudo asignar el usuario.');
      return false;
    } finally {
      setAssigning(false);
    }
  }

  async function deactivate(assignmentId: string) {
    if (!context) return;
    setDeactivatingId(assignmentId);
    setActionError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesion no disponible.');
      const idToken = await user.getIdToken();
      await deactivateAssignment(idToken, assignmentId, context.companyId, context.branchId);
      await reload();
    } catch (error) {
      setActionError(error instanceof AdminCommandError ? error.message : 'No se pudo dar de baja al usuario.');
    } finally {
      setDeactivatingId(null);
    }
  }

  return {
    state,
    users,
    context,
    assigning,
    assignError,
    deactivatingId,
    actionError,
    assign,
    deactivate,
    reload,
  };
}
