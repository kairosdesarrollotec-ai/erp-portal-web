import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { createInquiry, closeInquiry, InquiryCommandError } from './inquiries-client';
import { useWorkContextForInquiries } from './useWorkContextForInquiries';
import type { DisplayMode, InquiryChannel } from './inquiry-status';

export type NewInquiryScreenState = 'READY' | 'SAVING' | 'RECOVERABLE_ERROR';
export type AutosaveStatus = 'idle' | 'saving' | 'saved';
export type Nationality = 'PERUANO' | 'EXTRANJERO';

export interface NewInquiryFormData {
  channel: InquiryChannel;
  displayMode: DisplayMode;
  customerName: string;
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
  customerName: '',
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
 * CON-02 - Nueva Consulta. Estados READY, SAVING, RECOVERABLE_ERROR
 * (version simplificada del contrato punto 9: DIRTY/VALIDATING/SUCCESS se
 * reducen al indicador de autoguardado, ver `autosave` abajo).
 *
 * Simplificacion documentada: el contrato UX pide "guarda borrador en
 * servidor, autoguardado" (punto 7/14), pero el backend de HU-26 no
 * expone un endpoint de borrador - solo `POST /inquiries`, que crea la
 * Consulta ya en REGISTRADA. El indicador "Guardando…"/"Guardado" se
 * simula localmente (debounce en el formulario) y el guardado real en
 * servidor ocurre recien al pulsar "Continuar".
 */
export function useNewInquiry() {
  const { context } = useWorkContextForInquiries();
  const navigate = useNavigate();
  const [form, setForm] = useState<NewInquiryFormData>(INITIAL_FORM);
  const [state, setState] = useState<NewInquiryScreenState>('READY');
  const [autosave, setAutosave] = useState<AutosaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setAutosave('saving');
    const timer = setTimeout(() => setAutosave('saved'), 600);
    return () => clearTimeout(timer);
  }, [form]);

  function updateForm(patch: Partial<NewInquiryFormData>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function submit() {
    if (!context) return;
    setState('SAVING');
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      const created = await createInquiry(idToken, {
        channel: form.channel,
        touristUse: form.touristUse ?? false,
      });
      navigate(`/consultas/${created.id}/vehiculos`, {
        state: {
          ...context,
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
   */
  async function closeWithoutTouristUse() {
    if (!context) return;
    setState('SAVING');
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      const created = await createInquiry(idToken, { channel: form.channel, touristUse: false });
      await closeInquiry(idToken, created.id, created.version, 'SIN_USO_TURISTICO', 'El cliente no confirma uso turístico.');
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
    updateForm,
    submit,
    closeWithoutTouristUse,
  };
}
