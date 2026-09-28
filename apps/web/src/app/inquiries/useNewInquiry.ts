import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { createInquiry, closeInquiry, InquiryCommandError } from './inquiries-client';
import { useWorkContextForInquiries } from './useWorkContextForInquiries';
import { validateNewInquiryForm, hasInquiryFormErrors, type InquiryFormErrors } from './inquiries-validation';
import { listCustomers, createCustomer, type Customer, CustomerCommandError } from '../customers/customers-client';
import type { CustomerFormData } from '../customers/useCustomersList';
import type { DisplayMode, InquiryChannel } from './inquiry-status';

export type NewInquiryScreenState = 'READY' | 'SAVING' | 'RECOVERABLE_ERROR';
export type AutosaveStatus = 'idle' | 'saving' | 'saved';
export type Nationality = 'PERUANO' | 'EXTRANJERO';

export interface NewInquiryFormData {
  channel: InquiryChannel;
  displayMode: DisplayMode;
  customerId?: string | null;
  customerName: string;
  documentType: string;
  document: string;
  nationality: Nationality;
  hospedajeDocument: string;
  destination: string;
  travelDate: string;
  travelers: number;
  travelDays: number;
  touristUse: boolean | null;
}

const INITIAL_FORM: NewInquiryFormData = {
  channel: 'WHATSAPP',
  displayMode: 'PRESENCIAL',
  customerId: null,
  customerName: '',
  documentType: 'DNI',
  document: '',
  nationality: 'PERUANO',
  hospedajeDocument: '',
  destination: '',
  travelDate: '',
  travelers: 1,
  travelDays: 1,
  touristUse: null,
};

/**
 * Hallazgo de revision PR#11 (Criticos #1 y #2, "los datos capturados no
 * se envian" / "autoguardado falso"): el backend de este corte de HU-26
 * (TDD-CON-001.md 11.1) SOLO persiste `channel` y `touristUse` en
 * `POST /inquiries` - no existe un endpoint de borrador server-side. Antes
 * el indicador "Guardando…"/"Guardado" se simulaba con un `setTimeout` de
 * 600ms que no guardaba nada en ningun lado (ni servidor ni local) - una
 * recarga de pagina perdia todo lo capturado (nombre, documento,
 * nacionalidad, destino, fecha, personas, dias) sin ningun aviso.
 *
 * Ahora el borrador se guarda de verdad en `sessionStorage` (debounce de
 * 400ms) y se restaura al montar la pantalla - "Guardado" ya no es una
 * mentira, es "guardado en este dispositivo" (ver el texto exacto en
 * NewInquiryScreen.tsx). Esto no sustituye el guardado en servidor que
 * pide el contrato UX (punto 7/14 de PANTALLAS-V3-B-CONSULTA.md) - sigue
 * siendo una limitacion documentada mientras el backend no exponga un
 * endpoint de borrador - pero cierra el hueco real de perdida silenciosa
 * de datos ante un refresh accidental.
 */
const DRAFT_SESSION_KEY = 'kairos.consultas.nueva.borrador';
const AUTOSAVE_DEBOUNCE_MS = 400;

function loadStoredDraft(): NewInquiryFormData | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_SESSION_KEY);
    if (!raw) return null;
    return { ...INITIAL_FORM, ...(JSON.parse(raw) as Partial<NewInquiryFormData>) };
  } catch {
    return null;
  }
}

function storeDraft(form: NewInquiryFormData) {
  try {
    sessionStorage.setItem(DRAFT_SESSION_KEY, JSON.stringify(form));
  } catch {
    // sessionStorage puede no estar disponible (privado/bloqueado) - no bloquea la pantalla
  }
}

function clearStoredDraft() {
  try {
    sessionStorage.removeItem(DRAFT_SESSION_KEY);
  } catch {
    // ignorar
  }
}

export function useNewInquiry() {
  const { context } = useWorkContextForInquiries();
  const navigate = useNavigate();
  const [form, setForm] = useState<NewInquiryFormData>(() => loadStoredDraft() ?? INITIAL_FORM);
  const [state, setState] = useState<NewInquiryScreenState>('READY');
  const [autosave, setAutosave] = useState<AutosaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<InquiryFormErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const isFirstRender = useRef(true);

  // Integración Módulo de Clientes (PR 4)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Debounced search for customers
  useEffect(() => {
    const q = customerSearchQuery.trim();
    if (q.length < 2 || !context) {
      setCustomerSearchResults([]);
      setSearchingCustomers(false);
      return;
    }

    setSearchingCustomers(true);
    const timer = setTimeout(async () => {
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) return;
        const idToken = await user.getIdToken();
        const res = await listCustomers(idToken, {
          companyId: context.companyId,
          branchId: context.branchId,
          search: q,
          limit: 5,
        });
        setCustomerSearchResults(res.items);
      } catch {
        setCustomerSearchResults([]);
      } finally {
        setSearchingCustomers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearchQuery, context]);

  const selectCustomer = useCallback((customer: Customer) => {
    setForm((prev) => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.fullName,
      documentType: customer.documentType,
      document: customer.documentNumber,
      nationality: (customer.nationality as Nationality) || 'PERUANO',
    }));
    setCustomerSearchQuery('');
    setCustomerSearchResults([]);
  }, []);

  const clearSelectedCustomer = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      customerId: null,
    }));
  }, []);

  const openNewCustomerModal = useCallback(() => {
    setIsNewCustomerModalOpen(true);
    setModalError(null);
  }, []);

  const closeNewCustomerModal = useCallback(() => {
    setIsNewCustomerModalOpen(false);
    setModalError(null);
  }, []);

  const handleCreateCustomer = useCallback(
    async (data: CustomerFormData): Promise<boolean> => {
      if (!context) return false;
      setModalLoading(true);
      setModalError(null);
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) throw new Error('Sesión no disponible.');
        const idToken = await user.getIdToken();
        const created = await createCustomer(idToken, {
          ...data,
          companyId: context.companyId,
          branchId: context.branchId,
        });
        selectCustomer(created);
        setIsNewCustomerModalOpen(false);
        return true;
      } catch (err) {
        setModalError(err instanceof CustomerCommandError ? err.message : 'No se pudo registrar el cliente.');
        return false;
      } finally {
        setModalLoading(false);
      }
    },
    [context, selectCustomer],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setAutosave('saving');
    const timer = setTimeout(() => {
      storeDraft(form);
      setAutosave('saved');
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [form]);

  function updateForm(patch: Partial<NewInquiryFormData>) {
    setForm((prev) => ({ ...prev, ...patch }));
    if (submitAttempted) {
      setFieldErrors(validateNewInquiryForm({ ...form, ...patch }));
    }
  }

  async function submit() {
    setSubmitAttempted(true);
    const errors = validateNewInquiryForm(form);
    setFieldErrors(errors);
    if (hasInquiryFormErrors(errors)) {
      setError('Revisa los campos marcados antes de continuar.');
      return;
    }
    if (!context) return;
    setState('SAVING');
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();

      const inquiryPayload: {
        companyId: string;
        branchId: string;
        channel: InquiryChannel;
        customerId?: string;
        touristUse: boolean;
        prospect?: {
          fullName: string;
          documentType: string;
          documentNumber: string;
          nationality: Nationality;
        };
        destination: string;
        estimatedDays: number;
        travelStartDate?: string;
        partySize?: number;
      } = {
        companyId: context.companyId,
        branchId: context.branchId,
        channel: form.channel,
        touristUse: form.touristUse ?? false,
        destination: form.destination.trim(),
        estimatedDays: form.travelDays,
        travelStartDate: form.travelDate || undefined,
        partySize: form.travelers,
      };

      if (form.customerId) {
        inquiryPayload.customerId = form.customerId;
      } else {
        inquiryPayload.prospect = {
          fullName: form.customerName.trim(),
          documentType: form.documentType,
          documentNumber: form.document.trim(),
          nationality: form.nationality,
        };
      }

      const created = await createInquiry(idToken, inquiryPayload);
      clearStoredDraft();
      navigate(`/consultas/${created.id}/vehiculos`, {
        state: {
          ...context,
          customerId: form.customerId ?? undefined,
          customerName: form.customerName,
          destination: form.destination,
          travelDate: form.travelDate,
          travelers: form.travelers,
          travelDays: form.travelDays,
          displayMode: form.displayMode,
          channel: form.channel,
          touristUse: created.touristUse,
          version: created.version,
        },
      });
    } catch (err) {
      setState('READY');
      setError(err instanceof InquiryCommandError ? err.message : 'No se pudo registrar la consulta.');
    }
  }

  /**
   * BR-CON-004/TDD-CON-001 - caso obligatorio: el cliente rechaza el uso
   * turistico -> cierre inmediato, sin pasar por CON-03. Se crea la
   * Consulta (para dejar registro auditable) y se cierra en el mismo paso.
   * No se exige la validacion completa del formulario aqui: es una salida
   * temprana, no el camino que llega a CON-03.
   */
  /**
   * Actualizado junto con submit() (ver comentario de createInquiry en
   * inquiries-client.ts): el backend exige el mismo snapshot minimo
   * (nombre del prospecto, nacionalidad, destino, dias) incluso para el
   * cierre inmediato por rechazo de uso turistico - no es un atajo que
   * pueda saltarse la validacion. Se reutiliza `validateNewInquiryForm`
   * para no duplicar las reglas ni dejar pasar un `destination` vacio que
   * el backend rechazaria con 400.
   */
  async function closeWithoutTouristUse() {
    if (!context) return;
    setSubmitAttempted(true);
    const errors = validateNewInquiryForm(form);
    setFieldErrors(errors);
    if (hasInquiryFormErrors(errors)) {
      setError('Revisa los campos marcados antes de continuar.');
      return;
    }
    setState('SAVING');
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();

      const closePayload: {
        companyId: string;
        branchId: string;
        channel: InquiryChannel;
        customerId?: string;
        touristUse: boolean;
        prospect?: {
          fullName: string;
          documentType: string;
          documentNumber: string;
          nationality: Nationality;
        };
        destination: string;
        estimatedDays: number;
        travelStartDate?: string;
        partySize?: number;
      } = {
        companyId: context.companyId,
        branchId: context.branchId,
        channel: form.channel,
        touristUse: false,
        destination: form.destination.trim(),
        estimatedDays: form.travelDays,
        travelStartDate: form.travelDate || undefined,
        partySize: form.travelers,
      };

      if (form.customerId) {
        closePayload.customerId = form.customerId;
      } else {
        closePayload.prospect = {
          fullName: form.customerName.trim(),
          documentType: form.documentType,
          documentNumber: form.document.trim(),
          nationality: form.nationality,
        };
      }

      const created = await createInquiry(idToken, closePayload);
      await closeInquiry(idToken, created.id, created.version, 'SIN_USO_TURISTICO', 'El cliente no confirma uso turístico.');
      clearStoredDraft();
      navigate('/consultas', { state: context });
    } catch (err) {
      setState('READY');
      setError(err instanceof InquiryCommandError ? err.message : 'No se pudo cerrar la consulta.');
    }
  }

  return {
    context,
    form,
    state,
    autosave,
    error,
    fieldErrors,
    updateForm,
    submit,
    closeWithoutTouristUse,
    customerSearchQuery,
    setCustomerSearchQuery,
    customerSearchResults,
    searchingCustomers,
    selectCustomer,
    clearSelectedCustomer,
    isNewCustomerModalOpen,
    modalLoading,
    modalError,
    openNewCustomerModal,
    closeNewCustomerModal,
    handleCreateCustomer,
  };
}
