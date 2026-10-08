import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import type { RecruitmentScope } from './recruitment-client';
import { describeRecruitmentError, isStaleRecruitmentError } from './recruitment-errors';
import type { RecruitmentWorkContext } from './useWorkContextForRecruitment';

export type CommandResult<T> = { ok: true; value: T } | { ok: false; stale: boolean };

/**
 * Ejecuta un comando de Reclutamiento con token + contexto de sede, y centraliza
 * estado de guardado, error en lenguaje de negocio y aviso. Un 409/428 recarga la ficha.
 */
export function useRecruitmentCommand(detail: { context: RecruitmentWorkContext | null; reload: () => Promise<void> }) {
  const { context, reload } = detail;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(
      action: (idToken: string, scope: RecruitmentScope) => Promise<T>,
      fallback: string,
    ): Promise<CommandResult<T>> => {
      if (!context) return { ok: false, stale: false };
      setSaving(true);
      setError(null);
      setNotice(null);
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) throw new Error('sin sesión');
        const idToken = await user.getIdToken();
        const value = await action(idToken, { companyId: context.companyId, branchId: context.branchId });
        return { ok: true, value };
      } catch (err) {
        const stale = isStaleRecruitmentError(err);
        setError(describeRecruitmentError(err, fallback));
        if (stale) void reload();
        return { ok: false, stale };
      } finally {
        setSaving(false);
      }
    },
    [context, reload],
  );

  return { run, saving, error, notice, setNotice, clearError: () => setError(null) };
}

/** Avisa al cerrar la pestaña si hay texto sin registrar. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}
