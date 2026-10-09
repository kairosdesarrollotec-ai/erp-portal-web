import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import type { HrScope } from './hr-client';
import { describeHrError, isStaleHrError } from './hr-errors';
import type { HrWorkContext } from './useWorkContextForHr';

export type CommandResult<T> = { ok: true; value: T } | { ok: false; stale: boolean; message: string };

/**
 * Ejecuta un comando de Personal con token + contexto de sede y centraliza estado de
 * guardado, error en lenguaje de negocio y aviso. Un 409 recarga la pantalla.
 */
export function useHrCommand(source: { context: HrWorkContext | null; reload: () => Promise<void> }) {
  const { context, reload } = source;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(action: (idToken: string, scope: HrScope) => Promise<T>, fallback: string): Promise<CommandResult<T>> => {
      if (!context) return { ok: false, stale: false, message: fallback };
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
        const stale = isStaleHrError(err);
        const message = describeHrError(err, fallback);
        setError(message);
        if (stale) void reload();
        return { ok: false, stale, message };
      } finally {
        setSaving(false);
      }
    },
    [context, reload],
  );

  return { run, saving, error, notice, setNotice, setError, clearError: () => setError(null) };
}

/** Avisa al cerrar la pestana si hay texto sin registrar. */
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
