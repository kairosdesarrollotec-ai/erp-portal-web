import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { closeInquiry, convertInquiryToReservation, getInquiry, InquiryCommandError, InquiryDetail } from './inquiries-client';
import { getCustomer } from '../customers/customers-client';
import { getVehicle } from '../fleet/fleet-client';
import { useWorkContextForInquiries } from './useWorkContextForInquiries';
import type { InquiryNavState } from './inquiries-nav-state';

/** CON-04 - estados LOADING/READY/RECOVERABLE_ERROR/SYNC_CONFLICT (contrato punto 9, simplificado a DIRTY/SAVING via `saving`). */
export type InquiryDetailScreenState = 'LOADING' | 'READY' | 'RECOVERABLE_ERROR' | 'SYNC_CONFLICT';

export function useInquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navState = (location.state as InquiryNavState | null) ?? null;
  const { context, loading: contextLoading } = useWorkContextForInquiries();
  const [state, setState] = useState<InquiryDetailScreenState>('LOADING');
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  /**
   * Bug fix (Consultas): igual causa raiz que useInquiriesList.ts -
   * GET /inquiries/{id} solo trae `customerId`, el nombre se resuelve
   * aparte con `GET /customers/{id}`.
   */
  const [customerName, setCustomerName] = useState<string | null>(null);
  /**
   * Bug fix (Consultas, hallazgo de Russbel): CON-04 mostraba el UUID
   * crudo del vehiculo cotizado ("Vehiculo cotizado: 6d695f5f-...")
   * porque Quotation solo persiste vehicleId (snapshot del tarifario, ver
   * quote.handler.ts) - nunca el nombre. Igual causa raiz que
   * customerName arriba: se resuelve aparte con GET /fleet/vehicles/{id}.
   */
  const [vehicleLabel, setVehicleLabel] = useState<string | null>(null);
  /** Foto del vehiculo cotizado (hallazgo Russbel oct 2026): el panel de
   * resumen solo mostraba el nombre, sin ningun indicio visual - mismo
   * patron `photoUrl` que InquiryVehiclesScreen/useInquiryVehicles.ts. */
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
      const result = await getInquiry(idToken, id, context.companyId, context.branchId);
      setInquiry(result);
      setState('READY');
      if (result.customerId) {
        try {
          const customer = await getCustomer(idToken, result.customerId, context.companyId, context.branchId);
          setCustomerName(customer.fullName);
        } catch {
          setCustomerName(null);
        }
      } else {
        setCustomerName(null);
      }
      const latestQuotation = result.quotations?.[result.quotations.length - 1] ?? null;
      if (latestQuotation) {
        try {
          const vehicle = await getVehicle(idToken, latestQuotation.vehicleId, context.companyId, context.branchId);
          setVehicleLabel(`${vehicle.brand} ${vehicle.model}`.trim());
          setVehiclePhotoUrl(vehicle.photoUrl ?? null);
        } catch {
          setVehicleLabel(null);
          setVehiclePhotoUrl(null);
        }
      } else {
        setVehicleLabel(null);
        setVehiclePhotoUrl(null);
      }
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

  async function closeWithoutConversion(reason: string) {
    if (!inquiry) return;
    setSaving(true);
    setActionError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      const updated = await closeInquiry(idToken, inquiry.id, inquiry.version, context!.companyId, context!.branchId, 'CIERRE_MANUAL', reason);
      setInquiry({ ...inquiry, ...updated });
    } catch (error) {
      // TDD-CON-001.md 10.1: una version distinta a la esperada devuelve
      // 412 INQUIRY_VERSION_CONFLICT (no 409 - ese codigo esta reservado a
      // conflictos de regla de negocio en otros modulos, ver TDD-RES-001.md).
      if (error instanceof InquiryCommandError && (error.status === 412 || error.status === 409)) {
        setState('SYNC_CONFLICT');
      } else {
        setActionError(error instanceof Error ? error.message : 'No se pudo cerrar la consulta.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function convertToReservation(channelMode: 'PRESENCIAL' | 'VIRTUAL', startAt: string) {
    if (!inquiry || !context) return null;
    setSaving(true);
    setActionError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      const result = await convertInquiryToReservation(
        idToken,
        inquiry.id,
        inquiry.version,
        context.companyId,
        context.branchId,
        channelMode,
        startAt,
      );
      setInquiry({ ...inquiry, ...result.inquiry });
      return result.reservation.id;
    } catch (error) {
      if (error instanceof InquiryCommandError && (error.status === 412 || error.status === 409)) {
        setState('SYNC_CONFLICT');
      } else {
        setActionError(error instanceof Error ? error.message : 'No se pudo crear la reserva.');
      }
      return null;
    } finally {
      setSaving(false);
    }
  }

  return {
    id,
    navState,
    context,
    state,
    inquiry,
    customerName,
    vehicleLabel,
    vehiclePhotoUrl,
    saving,
    actionError,
    closeWithoutConversion,
    convertToReservation,
    reload,
  };
}
