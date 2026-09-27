import { describe, it, expect } from 'vitest';
import { validateNewInquiryForm, hasInquiryFormErrors } from './inquiries-validation';
import type { NewInquiryFormData } from './useNewInquiry';

function buildForm(overrides: Partial<NewInquiryFormData> = {}): NewInquiryFormData {
  return {
    channel: 'WHATSAPP',
    displayMode: 'PRESENCIAL',
    customerName: 'Maria Quispe',
    documentType: 'DNI',
    document: '12345678',
    nationality: 'PERUANO',
    hospedajeDocument: '',
    destination: 'Ayacucho',
    travelDate: '2099-01-01',
    travelers: 2,
    travelDays: 3,
    touristUse: true,
    ...overrides,
  };
}

describe('validateNewInquiryForm (finding "sin validacion funcional")', () => {
  it('no reporta errores para un formulario completo', () => {
    const errors = validateNewInquiryForm(buildForm());
    expect(hasInquiryFormErrors(errors)).toBe(false);
  });

  it('exige nombre, documento, destino y fecha', () => {
    const errors = validateNewInquiryForm(
      buildForm({ customerName: '', document: '', destination: '', travelDate: '' }),
    );
    expect(errors.customerName).toBeTruthy();
    expect(errors.document).toBeTruthy();
    expect(errors.destination).toBeTruthy();
    expect(errors.travelDate).toBeTruthy();
  });

  it('exige documento de hospedaje solo si la nacionalidad es Extranjero', () => {
    const peruano = validateNewInquiryForm(buildForm({ nationality: 'PERUANO', hospedajeDocument: '' }));
    expect(peruano.hospedajeDocument).toBeUndefined();

    const extranjero = validateNewInquiryForm(buildForm({ nationality: 'EXTRANJERO', hospedajeDocument: '' }));
    expect(extranjero.hospedajeDocument).toBeTruthy();
  });

  it('rechaza una fecha de viaje pasada', () => {
    const errors = validateNewInquiryForm(buildForm({ travelDate: '2020-01-01' }));
    expect(errors.travelDate).toMatch(/pasada/);
  });
});
