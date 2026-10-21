import { describe, it, expect } from 'vitest';
import { describeRentalError } from './rental-errors';
import { RentalCommandError } from './rentals-client';

describe('describeRentalError', () => {
  it.each([
    ['DEPOSIT_NOT_APPLICABLE_WITH_COMPANY_DRIVER', /no se cobra garantía/],
    ['NATURAL_PERSON_OWN_DRIVER_NOT_ALLOWED', /persona natural no puede tener un conductor propio/],
    ['ADDENDUM_DOCUMENT_REQUIRED', /adenda/],
    ['HOLDER_TYPE_REQUIRED', /titular/],
    ['HOLDER_TYPE_MISMATCH', /no coincide/],
    ['RENTAL_DRIVER_ALREADY_REGISTERED', /ya tiene un conductor/],
    ['RENTAL_DRIVER_REGISTRATION_CLOSED', /Ya no se puede registrar/],
    ['DRIVER_CUSTOMER_NOT_FOUND', /cliente-conductor/],
    ['LICENSE_VERIFICATION_REQUIRED', /licencia vigente/],
    ['COMPANION_DRIVER_MUST_DIFFER', /no conduce/],
    ['COMPANION_PASSENGER_CAPACITY_EXCEEDED', /máximo de acompañantes/],
    ['COMPANY_DRIVER_RATE_REQUIRED', /tarifa diaria del conductor de la empresa.*obligatoria/],
    ['COMPANY_DRIVER_RATE_CLOSED', /ya no se puede cambiar.*hasta completar la entrega/],
    ['ALCOHOL_TEST_PHOTO_REQUIRED', /foto de la prueba del alcoholímetro/],
    ['PASSENGER_CAPACITY_REQUIRED', /capacidad de pasajeros.*de 1 a 60/],
  ])('traduce %s', (code, re) => {
    expect(describeRentalError(new RentalCommandError(422, { code, detail: 'raw' }), 'fb')).toMatch(re);
  });
  it('DEC-ALQ-CAPWARN-003: con la capacidad conocida el mensaje indica el maximo concreto; sin ella usa el generico', () => {
    const err = new RentalCommandError(422, { code: 'COMPANION_PASSENGER_CAPACITY_EXCEEDED', detail: 'raw' });
    expect(describeRentalError(err, 'fb', { passengerCapacity: 4 })).toMatch(/máximo 4 acompañante\(s\)/);
    expect(describeRentalError(err, 'fb', { passengerCapacity: null })).toMatch(/máximo de acompañantes/);
  });
  it('usa el detalle si no hay traduccion y el fallback si no es RentalCommandError', () => {
    expect(describeRentalError(new RentalCommandError(409, { code: 'OTHER', detail: 'detalle' }), 'fb')).toBe('detalle');
    expect(describeRentalError(new Error('x'), 'fb')).toBe('fb');
  });
});
