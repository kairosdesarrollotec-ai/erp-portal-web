import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { closeInquiry, getInquiry, InquiryCommandError, InquiryDetail } from './inquiries-client';
import { getCustomer } from '../customers/customers-client';
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

  return {
    id,
    navState,
    context,
    state,
    inquiry,
    customerName,
    saving,
    actionError,
    closeWithoutConversion,
    reload,
  };
}
