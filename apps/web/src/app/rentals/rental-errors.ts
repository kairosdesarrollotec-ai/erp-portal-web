import { RentalCommandError } from './rentals-client';

/** Codigos de dominio de rentals.yaml (ALQ), traducidos a lenguaje de negocio. */
const DOMAIN_MESSAGES: Record<string, string> = {
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
    if (code && DOMAIN_MESSAGES[code]) return DOMAIN_MESSAGES[code];
    return error.message || fallback;
  }
  return fallback;
}
