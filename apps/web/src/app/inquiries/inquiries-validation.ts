import type { NewInquiryFormData } from './useNewInquiry';
import { limaToday } from '../shared/lima-time';

/**
 * Hallazgo de revision PR#11 ("Sin validacion funcional" y "Tamaño/
 * responsabilidad"): antes CON-02 dejaba continuar con nombre, documento,
 * destino o fecha vacios - la unica condicion para habilitar "Continuar"
 * era `form.touristUse !== null`. Se extrae la validacion a su propio
 * modulo (separado de useNewInquiry.ts/NewInquiryScreen.tsx) para que sea
 * testeable de forma aislada y no siga creciendo la responsabilidad de un
 * solo archivo.
 *
 * Alcance: solo valida lo que la propia pantalla exige capturar (contrato
 * CON-02 punto 6) - no valida contra el backend, que en este corte de
 * HU-26 no persiste estos campos (ver comentario en inquiries-client.ts).
 */
export interface InquiryFormErrors {
  /**
   * Rediseño CON-02: ya no hay campos manuales de nombre/documento - la
   * identidad viene siempre de un Customer vinculado (buscado o creado via
   * el modal). Sin `customerId` no hay como registrar la consulta.
   */
  customerId?: string;
  destination?: string;
  travelDate?: string;
}

function todayISODate(): string {
  return limaToday();
}

export function validateNewInquiryForm(form: NewInquiryFormData): InquiryFormErrors {
  const errors: InquiryFormErrors = {};

  if (!form.customerId) {
    errors.customerId = 'Busca y selecciona un cliente registrado, o registra uno nuevo, antes de continuar.';
  }
  if (form.destination.trim().length === 0) {
    errors.destination = 'Ingresa el destino del viaje.';
  }
  if (form.travelDate.trim().length === 0) {
    errors.travelDate = 'Selecciona la fecha del viaje.';
  } else if (form.travelDate < todayISODate()) {
    errors.travelDate = 'La fecha del viaje no puede ser una fecha pasada.';
  }

  return errors;
}

export function hasInquiryFormErrors(errors: InquiryFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
