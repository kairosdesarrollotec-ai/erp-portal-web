import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import {
  getReservationDepositPolicy,
  ParameterCommandError,
  ReservationDepositPolicy,
  updateReservationDepositPolicy,
} from './parameters-client';
import { useWorkContextForAdmin } from './useWorkContextForAdmin';

/** ADM-03 - estados READY/LOADING/DIRTY/SAVING (contrato punto 9). */
export type ReservationDepositPolicyState = 'LOADING' | 'READY' | 'RECOVERABLE_ERROR';

export function useReservationDepositPolicy() {
  const { context, loading: contextLoading } = useWorkContextForAdmin();
  const [state, setState] = useState<ReservationDepositPolicyState>('LOADING');
  const [policy, setPolicy] = useState<ReservationDepositPolicy | null>(null);
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
      const result = await getReservationDepositPolicy(idToken, context.companyId, context.branchId);
      setPolicy(result);
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

  async function save(amount: string, currency: string): Promise<boolean> {
    if (!context) return false;
    setSaving(true);
    setSaveError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesion no disponible.');
      const idToken = await user.getIdToken();
      await updateReservationDepositPolicy(idToken, context.companyId, context.branchId, amount, currency);
      await reload();
      return true;
    } catch (error) {
      setSaveError(error instanceof ParameterCommandError ? error.message : 'No se pudo guardar el cambio.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { state, policy, context, saving, saveError, save, reload };
}
