import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import {
  cancelReservation,
  confirmReservation,
  getReservation,
  registerDocuments,
  registerPayment,
  ReservationCommandError,
  ReservationSummary,
} from './reservations-client';
import { useWorkContextForReservations } from './useWorkContextForReservations';

/** RES-04/RES-05 - estados del detalle (contrato RES-04 punto 9). */
export type ReservationDetailState = 'LOADING' | 'READY' | 'RECOVERABLE_ERROR' | 'SYNC_CONFLICT';

export function useReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const { context, loading: contextLoading } = useWorkContextForReservations();
  const [state, setState] = useState<ReservationDetailState>('LOADING');
  const [reservation, setReservation] = useState<ReservationSummary | null>(null);
  const [savingRequirement, setSavingRequirement] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id || !context) return;
    setState('LOADING');
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        setState('RECOVERABLE_ERROR');
        return;
      }
      const idToken = await user.getIdToken();
      const result = await getReservation(idToken, id, context.companyId, context.branchId);
      setReservation(result);
      setState('READY');
    } catch {
      setState('RECOVERABLE_ERROR');
    }
  }, [id, context]);

  useEffect(() => {
    if (!contextLoading && context) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
  }, [context, contextLoading, reload]);

  async function runCommand(
    requirementKey: string,
    action: (idToken: string) => Promise<ReservationSummary>,
  ) {
    if (!reservation) return;
    setSavingRequirement(requirementKey);
    setActionError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesion no disponible.');
      const idToken = await user.getIdToken();
      const updated = await action(idToken);
      setReservation(updated);
    } catch (error) {
      if (error instanceof ReservationCommandError && error.status === 409) {
        setState('SYNC_CONFLICT');
      } else {
        setActionError(error instanceof Error ? error.message : 'No se pudo completar la operacion.');
      }
    } finally {
      setSavingRequirement(null);
    }
  }

  const uploadPaymentVoucher = () =>
    reservation &&
    context &&
    runCommand('PAYMENT_VALIDATION', (idToken) =>
      registerPayment(idToken, reservation.id, context.companyId, context.branchId, reservation.version),
    );

  const uploadDocuments = () =>
    reservation &&
    context &&
    runCommand('DOCUMENTS_COMPLETE', (idToken) =>
      registerDocuments(idToken, reservation.id, context.companyId, context.branchId, reservation.version),
    );

  const confirm = () =>
    reservation &&
    context &&
    runCommand('CONFIRM', (idToken) =>
      confirmReservation(idToken, reservation.id, context.companyId, context.branchId, reservation.version),
    );

  const cancel = (reason: 'CUSTOMER_REQUESTED_CHANGE' | 'NO_SHOW', note?: string) =>
    reservation &&
    context &&
    runCommand('CANCEL', (idToken) =>
      cancelReservation(idToken, reservation.id, context.companyId, context.branchId, reservation.version, reason, note),
    );

  return {
    state,
    reservation,
    context,
    savingRequirement,
    actionError,
    uploadPaymentVoucher,
    uploadDocuments,
    confirm,
    cancel,
    reload,
  };
}
