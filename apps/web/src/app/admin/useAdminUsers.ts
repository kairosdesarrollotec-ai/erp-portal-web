import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import {
  AdminCommandError,
  assignUserToCompany,
  deactivateAssignment,
  getOrganizationCompanies,
  listOrganizationUsers,
  OrganizationCompany,
  OrganizationUserAssignment,
} from './admin-users-client';
import { useWorkContextForAdmin } from './useWorkContextForAdmin';
import type { WorkerRole } from '../dashboard/worker-role';

/** ADM-01 - estados READY/LOADING/EMPTY/RECOVERABLE_ERROR (contrato punto 9). */
export type AdminUsersState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR';

export interface AssignCompanyBranchTarget {
  targetCompanyId: string;
  targetBranchId: string;
}

export interface AssignUserFormInput {
  targetEmail: string;
  targets?: AssignCompanyBranchTarget[];
  targetCompanyId?: string;
  targetBranchId?: string;
  targetRole: WorkerRole;
  /** Omitir cuando el correo ya existe (ver AssignUserInput). */
  initialPassword?: string;
}

export function useAdminUsers() {
  const { context, loading: contextLoading } = useWorkContextForAdmin();
  const [state, setState] = useState<AdminUsersState>('LOADING');
  const [users, setUsers] = useState<OrganizationUserAssignment[]>([]);
  const [companies, setCompanies] = useState<OrganizationCompany[]>([]);
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
      void (async () => {
        try {
          const user = getFirebaseAuth().currentUser;
          if (!user) return;
          const idToken = await user.getIdToken();
          const result = await getOrganizationCompanies(idToken, context.companyId, context.branchId);
          setCompanies(result);
        } catch {
          // El selector de empresa/sede se degrada a la empresa/sede del contexto actual
          // (ver AdminUsersScreen) - no bloquea la bandeja principal si esto falla.
        }
      })();
    } else if (!contextLoading && !context) {
      setState('RECOVERABLE_ERROR');
    }
  }, [context, contextLoading, reload]);

  async function assign(input: AssignUserFormInput): Promise<boolean> {
    if (!context) return false;
    const targets: AssignCompanyBranchTarget[] =
      input.targets && input.targets.length > 0
        ? input.targets
        : input.targetCompanyId && input.targetBranchId
          ? [{ targetCompanyId: input.targetCompanyId, targetBranchId: input.targetBranchId }]
          : [];

    if (targets.length === 0) return false;

    setAssigning(true);
    setAssignError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesion no disponible.');
      const idToken = await user.getIdToken();

      let successCount = 0;
      let firstError: Error | null = null;

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        try {
          await assignUserToCompany(idToken, {
            companyId: context.companyId,
            branchId: context.branchId,
            targetEmail: input.targetEmail,
            targetCompanyId: target.targetCompanyId,
            targetBranchId: target.targetBranchId,
            targetRole: input.targetRole,
            initialPassword: i === 0 ? input.initialPassword : undefined,
          });
          successCount++;
        } catch (err) {
          if (i === 0) {
            throw err;
          }
          if (!firstError) firstError = err as Error;
        }
      }

      if (successCount > 0) {
        await reload();
      }
      if (successCount === 0 && firstError) {
        throw firstError;
      }
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
    companies,
    assigning,
    assignError,
    deactivatingId,
    actionError,
    assign,
    deactivate,
    reload,
  };
}
