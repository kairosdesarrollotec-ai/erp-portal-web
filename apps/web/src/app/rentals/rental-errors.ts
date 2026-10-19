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
  COMPANION_PASSENGER_CAPACITY_EXCEEDED: 'Se superó la cantidad máxima de acompañantes (capacidad de pasajeros del vehículo).',
  HOLDER_TYPE_REQUIRED: 'Indica si el titular es persona natural o jurídica.',
  HOLDER_TYPE_MISMATCH: 'El tipo de titular indicado no coincide con el del cliente del alquiler.',
  RENTAL_DRIVER_ALREADY_REGISTERED: 'Este alquiler ya tiene un conductor autorizado registrado.',
  RENTAL_DRIVER_REGISTRATION_CLOSED: 'Ya no se puede registrar conductor: el alquiler pasó de la etapa de entrega.',
  DRIVER_CUSTOMER_NOT_FOUND: 'No encontramos al cliente-conductor en tu empresa. Búscalo o regístralo primero.',
  CONTRACT_VARIANT_DRIVER_CONFLICT:
    'La variante del contrato es inconsistente: la opción de conductor de la empresa no coincide. Recarga la pantalla e inténtalo de nuevo.',
};

/** Mensaje de negocio para un error de comando de alquiler; si no hay traduccion usa el detalle o el fallback. */
export function describeRentalError(error: unknown, fallback: string): string {
  if (error instanceof RentalCommandError) {
    const code = error.problem?.code;
    if (code && DOMAIN_MESSAGES[code]) return DOMAIN_MESSAGES[code];
    return error.message || fallback;
  }
  return fallback;
}
