import { RentalCommandError } from './rentals-client';

/** Codigos de dominio de rentals.yaml (ALQ), traducidos a lenguaje de negocio. */
const DOMAIN_MESSAGES: Record<string, string> = {
  DEPOSIT_NOT_APPLICABLE_WITH_COMPANY_DRIVER: 'Con conductor de la empresa no se cobra garantía.',
  NATURAL_PERSON_OWN_DRIVER_NOT_ALLOWED:
    'Una persona natural no puede tener un conductor propio distinto del titular: conduce quien alquila o se pide conductor de la empresa.',
  ADDENDUM_DOCUMENT_REQUIRED: 'Indica la referencia de la adenda firmada por el conductor autorizado.',
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
