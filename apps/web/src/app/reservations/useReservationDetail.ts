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

/**
 * Hallazgo de revision (finding #7): traduce el `code`/`missingRequirements`
 * del `problem+json` del backend (TDD-RES-001.md 11.4) a algo que el
 * usuario pueda entender, en vez de un mensaje generico para cualquier
 * error de mutacion. El listado sale de `ReservationSummary['missingRequirements']`.
 */
const REQUIREMENT_LABELS: Record<string, string> = {
  PAYMENT_VALIDATION: 'Pago del monto de reserva',
  DOCUMENTS_COMPLETE: 'Documentos / contrato',
  REMOTE_ACCEPTANCE: 'Aceptación remota (video 360°)',
};

function describeCommandError(error: ReservationCommandError): string {
  if (error.status === 422) {
    const missing = error.problem?.missingRequirements ?? [];
    if (missing.length > 0) {
      const labels = missing.map((key) => REQUIREMENT_LABELS[key] ?? key).join(', ');
      return `Falta completar: ${labels}`;
    }
    return error.problem?.detail ?? 'No se puede completar la operación todavía.';
  }
  if (error.status === 401 || error.status === 403) {
    return 'No tienes permiso para hacer esto, o tu sesión expiró. Vuelve a iniciar sesión.';
  }
  if (error.status >= 500) {
    return 'No pudimos completar la operación por un problema del servidor. Intenta de nuevo.';
  }
  return error.problem?.detail ?? 'No se pudo completar la operación. Intenta de nuevo.';
}

export function useReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const { context, loading: contextLoading } = useWorkContextForReservations();
  const [state, setState] = useState<ReservationDetailState>('LOADING');
  const [reservation, setReservation] = useState<ReservationSummary | null>(null);
  const [savingRequirement, setSavingRequirement] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Hallazgo de revision (finding #6, primera parte): antes solo el boton
  // de la mutacion en curso se deshabilitaba (via `savingRequirement`) -
  // cualquier OTRO boton (pago, documentos, confirmar, cancelar) seguia
  // habilitado mientras esa peticion seguia en vuelo, permitiendo 2
  // mutaciones simultaneas sobre la misma reserva. `isMutating` es un
  // mutex a nivel de reserva: mientras hay CUALQUIER mutacion en curso,
  // TODOS los controles de mutacion se deshabilitan, no solo el que la
  // inicio.
  const isMutating = savingRequirement !== null;

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
      void reload();
    } else if (!contextLoading && !context) {
      setState('RECOVERABLE_ERROR');
    }
  }, [context, contextLoading, reload]);

  async function runCommand(
    requirementKey: string,
    action: (idToken: string) => Promise<ReservationSummary>,
  ): Promise<ReservationSummary | null> {
    // Mutex (finding #6): una mutacion ya en curso bloquea cualquier otra,
    // incluido un doble clic del mismo control (el `disabled` del boton ya
    // cubre el caso feliz, esto es la segunda capa server-side... bueno,
    // client-side, pero a nivel de hook en vez de solo a nivel de boton).
    if (isMutating || !reservation) return null;
    setSavingRequirement(requirementKey);
    setActionError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesion no disponible.');
      const idToken = await user.getIdToken();
      const updated = await action(idToken);
      setReservation(updated);
      return updated;
    } catch (error) {
      if (error instanceof ReservationCommandError) {
        if (error.status === 409) {
          setState('SYNC_CONFLICT');
        } else {
          setActionError(describeCommandError(error));
        }
      } else {
        setActionError(error instanceof Error ? error.message : 'No se pudo completar la operacion.');
      }
      return null;
    } finally {
      setSavingRequirement(null);
    }
  }

  /**
   * Hallazgo de revision (finding #4): el contrato (PANTALLAS-V3-B-RESERVA.md
   * RES-04 punto 7/10) es explicito - "la confirmacion pasa a RES-05
   * automaticamente al completar todos [los requisitos] - no hay boton de
   * 'Confirmar' aparte" / "No aplica - la confirmacion es automatica al
   * completar los requisitos". Antes habia un boton manual "Confirmar
   * reserva" que contradecia ese contrato Y contradecia su propio texto de
   * ayuda ("la reserva se confirma automáticamente..." se mostraba
   * mientras faltaba algo, pero al completarse aparecia un boton en vez de
   * confirmar sola). Ahora, cada vez que un requisito se registra con
   * exito, si ambos quedan completos se dispara `confirm` automaticamente
   * - sin boton manual.
   */
  async function maybeAutoConfirm(updated: ReservationSummary) {
    if (
      !context ||
      updated.status !== 'DRAFT' ||
      !updated.requirements.paymentValidatedAt ||
      !updated.requirements.documentsCompletedAt
    ) {
      return;
    }
    setSavingRequirement('CONFIRM');
    setActionError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesion no disponible.');
      const idToken = await user.getIdToken();
      const confirmed = await confirmReservation(idToken, updated.id, context.companyId, context.branchId, updated.version);
      setReservation(confirmed);
    } catch (error) {
      if (error instanceof ReservationCommandError) {
        if (error.status === 409) {
          setState('SYNC_CONFLICT');
        } else {
          setActionError(describeCommandError(error));
        }
      } else {
        setActionError(error instanceof Error ? error.message : 'No se pudo confirmar la reserva.');
      }
    } finally {
      setSavingRequirement(null);
    }
  }

  const uploadPaymentVoucher = async () => {
    if (!reservation || !context) return;
    const updated = await runCommand('PAYMENT_VALIDATION', (idToken) =>
      registerPayment(idToken, reservation.id, context.companyId, context.branchId, reservation.version),
    );
    if (updated) await maybeAutoConfirm(updated);
  };

  const uploadDocuments = async () => {
    if (!reservation || !context) return;
    const updated = await runCommand('DOCUMENTS_COMPLETE', (idToken) =>
      registerDocuments(idToken, reservation.id, context.companyId, context.branchId, reservation.version),
    );
    if (updated) await maybeAutoConfirm(updated);
  };

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
    isMutating,
    actionError,
    uploadPaymentVoucher,
    uploadDocuments,
    cancel,
    reload,
  };
}
