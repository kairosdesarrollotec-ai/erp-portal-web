import { RentalCommandError } from './rentals-client';
import { requiredDocumentLabel } from '../inquiries/inquiry-status';

/** Codigos de dominio de rentals.yaml (ALQ), traducidos a lenguaje de negocio. */
const DOMAIN_MESSAGES: Record<string, string> = {
  INQUIRY_REQUIRED: 'Todo alquiler nace de una Consulta: registra la consulta del cliente y conviértela desde su detalle.',
  INQUIRY_CONVERSION_REQUIRED:
    'El alquiler no se puede crear directamente: usa "Convertir a Alquiler" desde el detalle de la Consulta.',
  RESERVATION_START_NOT_REACHED:
    'Todavía no llegó la fecha pactada de la reserva. Solo se puede continuar con el alquiler el día pactado (hora de Lima).',
  RESERVATION_START_DATE_PASSED:
    'La fecha pactada de la reserva ya pasó. Aplica el protocolo de no-show en el detalle de la reserva.',
  INVALID_DEPOSIT_AMOUNT: 'El monto de la garantía no es válido para este vehículo. Revisa el monto mínimo e inténtalo de nuevo.',
  RESERVATION_EXCEEDS_GUARANTEE:
    'El monto de la reserva no puede superar la garantía del vehículo. No existe saldo a favor.',
  DEPOSIT_NOT_APPLICABLE_WITH_COMPANY_DRIVER: 'Con conductor de la empresa no se cobra garantía.',
  NATURAL_PERSON_OWN_DRIVER_NOT_ALLOWED:
    'Una persona natural no puede tener un conductor propio distinto del titular: conduce quien alquila o se pide conductor de la empresa.',
  ADDENDUM_DOCUMENT_REQUIRED: 'Indica la referencia de la adenda firmada por el conductor autorizado.',
  COMPANION_NOT_APPLICABLE_FOR_LEGAL_HOLDER:
    'El acompañante autorizado aplica a persona natural. Para persona jurídica registra al conductor autorizado con su adenda.',
  COMPANION_REASON_REQUIRED: 'Indica el motivo por el que el titular no puede firmar.',
  COMPANION_CUSTOMER_NOT_FOUND: 'No encontramos al acompañante en tu empresa. Búscalo o regístralo primero.',
  LICENSE_VERIFICATION_REQUIRED: 'Confirma que verificaste la licencia vigente del acompañante y del conductor.',
  COMPANION_DRIVER_MUST_DIFFER: 'El acompañante firma como responsable y no conduce: elige a otra persona como conductor.',
  COMPANION_PASSENGER_CAPACITY_EXCEEDED:
    'Este vehículo ya tiene el máximo de acompañantes permitido por su capacidad de pasajeros. No se puede registrar a otro acompañante.',
  HOLDER_TYPE_REQUIRED: 'Indica si el titular es persona natural o jurídica.',
  HOLDER_TYPE_MISMATCH: 'El tipo de titular indicado no coincide con el del cliente del alquiler.',
  RENTAL_DRIVER_ALREADY_REGISTERED: 'Este alquiler ya tiene un conductor autorizado registrado.',
  RENTAL_DRIVER_REGISTRATION_CLOSED: 'Ya no se puede registrar conductor: el alquiler pasó de la etapa de entrega.',
  DRIVER_CUSTOMER_NOT_FOUND: 'No encontramos al cliente-conductor en tu empresa. Búscalo o regístralo primero.',
  DOCUMENTS_INCOMPLETE: 'Faltan documentos requeridos según la nacionalidad del cliente. Sube y confirma todos antes de continuar.',
  INVALID_RENTAL_STATE_TRANSITION: 'El alquiler ya no está en una etapa que permita esta acción. Recarga el expediente.',
  EXTENSION_NOT_PENDING: 'La ampliación ya no está pendiente (fue resuelta por otra persona). Recarga el alquiler.',
  VEHICLE_UNAVAILABLE_FOR_EXTENSION:
    'El vehículo tiene otro compromiso (reserva o alquiler) que impide autorizar la ampliación. Puedes rechazarla.',
  EXTENSION_ADVANCE_NOTICE_REQUIRED: 'La ampliación debe solicitarse con al menos 12 horas de anticipación al vencimiento actual.',
  EXTENSION_MAX_DURATION_EXCEEDED:
    'La ampliación no puede exceder 3 días consecutivos (1 día si es por horas) sin firmar un nuevo contrato.',
  INVALID_CANCEL_REASON: 'Elige un motivo de cancelación válido. Con «Otro motivo» escribe una nota de al menos 10 caracteres.',
  PAYMENT_PROOF_REQUIRED: 'Falta el comprobante del cobro de la garantía: método de pago, nombre de quien paga y voucher adjunto.',
  EXTERNAL_AGENT_VERIFICATION_REQUIRED:
    'El pago lo hizo un tercero (agente externo): confirma que verificaste su identidad antes de continuar.',
  PAYMENT_VOUCHER_NOT_FOUND: 'El voucher indicado no existe en este alquiler. Súbelo de nuevo e inténtalo otra vez.',
  NOTARY_EVALUATION_REQUIRED: 'Primero hay que evaluar la notaría de este alquiler.',
  NOTARY_EXCEPTION_NOT_APPLICABLE:
    'Esta evaluación notarial no admite aprobación de excepción por Gerencia (solo tercera vía elegible o revisión manual).',
  NOTARY_EXCEPTION_REQUIRES_APPROVAL: 'La excepción notarial requiere la aprobación de Gerencia antes de continuar.',
  COMPANY_DRIVER_RATE_INVALID: 'La tarifa diaria debe ser un monto mayor que 0 con un máximo de 2 decimales.',
  COMPANY_DRIVER_RATE_REQUIRED:
    'Falta digitar la tarifa diaria del conductor de la empresa. Es obligatoria para terminar el alquiler: digítala en «Garantía y contrato» y vuelve a intentar.',
  COMPANY_DRIVER_RATE_CLOSED:
    'La tarifa diaria del conductor ya no se puede cambiar: solo se edita hasta completar la entrega (el alquiler ya terminó su proceso o está cerrado o cancelado).',
  ALCOHOL_TEST_PHOTO_REQUIRED:
    'Falta la foto de la prueba del alcoholímetro. Con resultado desfavorable o si se negó, la foto es obligatoria (sin hora). Adjúntala y vuelve a intentar.',
  PASSENGER_CAPACITY_REQUIRED:
    'La capacidad de pasajeros del vehículo es obligatoria: indica un número entero de 1 a 60 (edítala en Flota).',
  COMPANY_DRIVER_RATE_NOT_APPLICABLE:
    'La tarifa diaria solo se digita en un alquiler con conductor de la empresa y con el contrato ya formalizado.',
  CONTRACT_VARIANT_DRIVER_CONFLICT:
    'La variante del contrato es inconsistente: la opción de conductor de la empresa no coincide. Recarga la pantalla e inténtalo de nuevo.',
};

/** Mensaje de negocio para un error de comando de alquiler; si no hay traduccion usa el detalle o el fallback. */
export function describeRentalError(
  error: unknown,
  fallback: string,
  context?: { passengerCapacity?: number | null },
): string {
  if (error instanceof RentalCommandError) {
    const code = error.problem?.code;
    // DEC-ALQ-CAPWARN-003: con la capacidad conocida el mensaje indica el maximo concreto.
    if (code === 'COMPANION_PASSENGER_CAPACITY_EXCEEDED' && context?.passengerCapacity != null) {
      return `Este vehículo admite como máximo ${context.passengerCapacity} acompañante(s) (su capacidad de pasajeros) y ya se alcanzó ese número. No se puede registrar a otro acompañante.`;
    }
    if (code === 'DOCUMENTS_INCOMPLETE' && Array.isArray(error.problem?.missingDocuments)) {
      const missing = (error.problem?.missingDocuments as string[]).map((c) => requiredDocumentLabel(c)).join(', ');
      return `Faltan documentos requeridos: ${missing}. Súbelos y vuelve a intentar.`;
    }
    if (code && DOMAIN_MESSAGES[code]) return DOMAIN_MESSAGES[code];
    return error.message || fallback;
  }
  return fallback;
}
