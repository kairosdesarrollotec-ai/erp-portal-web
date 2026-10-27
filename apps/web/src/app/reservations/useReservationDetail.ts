import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import {
  cancelReservation,
  changeReservationVehicle,
  confirmReservation,
  confirmSaleRefundTransfer,
  describeReservationError,
  flagVehicleSale,
  resolveVehicleSale,
  getReservation,
  registerDocuments,
  registerPayment,
  registerReservationReminder,
  requestReservationAirportService,
  ReservationCommandError,
  ReservationSummary,
  VEHICLE_NOT_AVAILABLE_MESSAGE,
} from './reservations-client';
import { useWorkContextForReservations } from './useWorkContextForReservations';
import type { ReservationPaymentBody } from '../shared/payment-proof';

/** RES-04/RES-05 - estados del detalle (contrato RES-04 punto 9). */
export type ReservationDetailState = 'LOADING' | 'READY' | 'RECOVERABLE_ERROR' | 'SYNC_CONFLICT';

export function useReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const { context, loading: contextLoading } = useWorkContextForReservations();
  const [state, setState] = useState<ReservationDetailState>('LOADING');
  const [reservation, setReservation] = useState<ReservationSummary | null>(null);
  const [savingRequirement, setSavingRequirement] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [vehicleUnavailable, setVehicleUnavailable] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id || !context) return;
    setState('LOADING');
    setVehicleUnavailable(null);
    setActionError(null);
    setVehicleUnavailable(null);
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
    refresh = false,
  ): Promise<ReservationSummary | null> {
    if (!reservation) return null;
    setSavingRequirement(requirementKey);
    setActionError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesion no disponible.');
      const idToken = await user.getIdToken();
      let updated = await action(idToken);
      if (refresh && context) {
        // Las respuestas de comandos no traen saleResolution/startDatePassed: se refresca el detalle.
        // Si el refresh falla se devuelve la respuesta del comando (el comando ya tuvo éxito).
        try {
          updated = await getReservation(idToken, reservation.id, context.companyId, context.branchId);
        } catch {
          // intencional: refresh fallido no oculta el éxito del comando
        }
      }
      setReservation(updated);
      return updated;
    } catch (error) {
      if (error instanceof ReservationCommandError && error.isVersionConflict) {
        // Solo un conflicto de version (412) significa "la reserva cambio": se recarga.
        setState('SYNC_CONFLICT');
      } else if (error instanceof ReservationCommandError && error.isVehicleUnavailable) {
        // 409 VEHICLE_NOT_AVAILABLE: no es un conflicto de sincronizacion, es un aviso de negocio.
        setVehicleUnavailable(error.problem?.detail?.trim() || VEHICLE_NOT_AVAILABLE_MESSAGE);
      } else if (error instanceof ReservationCommandError) {
        setActionError(describeReservationError(error));
      } else {
        setActionError(error instanceof Error ? error.message : 'No se pudo completar la operacion.');
      }
    } finally {
      setSavingRequirement(null);
    }
    return null;
  }

  const uploadPaymentVoucher = (payment?: ReservationPaymentBody) =>
    reservation &&
    context &&
    runCommand('PAYMENT_VALIDATION', (idToken) =>
      registerPayment(idToken, reservation.id, context.companyId, context.branchId, reservation.version, payment),
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
    reservation && context
      ? runCommand('CANCEL', (idToken) =>
          cancelReservation(idToken, reservation.id, context.companyId, context.branchId, reservation.version, reason, note),
        )
      : Promise.resolve(null);

  /** RES-07: registrar la venta (Gerencia/Administración). */
  const flagSale = (opts: { alternativeVehicleId?: string; note?: string }) =>
    reservation && context
      ? runCommand(
          'FLAG_SALE',
          (idToken) =>
            flagVehicleSale(idToken, reservation.id, context.companyId, context.branchId, reservation.version, opts),
          true,
        )
      : Promise.resolve(null);

  /** RES-07: resolver la venta (aceptar alternativa o rechazar con reembolso). */
  const resolveSale = (decision: 'ACCEPT_ALTERNATIVE' | 'REJECT', opts: { alternativeVehicleId?: string; note?: string }) =>
    reservation && context
      ? runCommand(
          'RESOLVE_SALE',
          (idToken) =>
            resolveVehicleSale(idToken, reservation.id, context.companyId, context.branchId, reservation.version, decision, opts),
          true,
        )
      : Promise.resolve(null);

  /** RES-06: cambia el vehículo del borrador y refresca el detalle (la respuesta no trae todos los campos). */
  const changeVehicle = (vehicleId: string) =>
    reservation && context
      ? runCommand(
          'CHANGE_VEHICLE',
          (idToken) =>
            changeReservationVehicle(idToken, reservation.id, context.companyId, context.branchId, reservation.version, vehicleId),
          true,
        )
      : Promise.resolve(null);

  /** C4: confirmar transferencia de reembolso tras venta del vehículo rechazada. */
  const confirmRefundTransfer = (transferVoucher: string, transferredAt?: string) =>
    reservation && context
      ? runCommand(
          'CONFIRM_REFUND_TRANSFER',
          (idToken) =>
            confirmSaleRefundTransfer(
              idToken,
              reservation.id,
              context.companyId,
              context.branchId,
              reservation.version,
              transferVoucher,
              transferredAt,
            ),
          true,
        )
      : Promise.resolve(null);

  /** C3: registrar recordatorio 3 horas antes. */
  const registerReminder = (
    channel: 'WHATSAPP' | 'EMAIL',
    reminderType: 'HOURS_3_BEFORE',
    status: 'SENT' | 'FAILED',
    failureReason?: string,
  ) =>
    reservation && context
      ? runCommand(
          'REGISTER_REMINDER',
          (idToken) =>
            registerReservationReminder(
              idToken,
              reservation.id,
              context.companyId,
              context.branchId,
              reservation.version,
              channel,
              reminderType,
              status,
              failureReason,
            ),
          true,
        )
      : Promise.resolve(null);

  /** C1: solicitar servicio de aeropuerto en reserva. */
  const requestAirportService = (
    scheduledAt: string,
    location: string,
    additionalAmount: string,
    notes?: string,
  ) =>
    reservation && context
      ? runCommand(
          'REQUEST_AIRPORT_SERVICE',
          (idToken) =>
            requestReservationAirportService(
              idToken,
              reservation.id,
              context.companyId,
              context.branchId,
              reservation.version,
              scheduledAt,
              location,
              additionalAmount,
              notes,
            ),
          true,
        )
      : Promise.resolve(null);

  return {
    state,
    changeVehicle,
    flagSale,
    resolveSale,
    confirmRefundTransfer,
    registerReminder,
    requestAirportService,
    reservation,
    context,
    savingRequirement,
    actionError,
    vehicleUnavailable,
    uploadPaymentVoucher,
    uploadDocuments,
    confirm,
    cancel,
    reload,
  };
}
