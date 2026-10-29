import { describe, it, expect } from 'vitest';
import { validateNewInquiryForm, hasInquiryFormErrors } from './inquiries-validation';
import type { NewInquiryFormData } from './useNewInquiry';

function buildForm(overrides: Partial<NewInquiryFormData> = {}): NewInquiryFormData {
  return {
    channel: 'WHATSAPP',
    displayMode: 'PRESENCIAL',
    customerId: 'cust-1',
    customerName: 'Maria Quispe',
    documentType: 'DNI',
    document: '12345678',
    nationality: 'PERUANO',
    destination: 'Ayacucho',
    travelDate: '2099-01-01',
    travelers: 2,
    travelDays: 3,
    touristUse: true,
    isDirtRoad: false,
    plan: 'NORMAL',
    ...overrides,
  };
}

describe('validateNewInquiryForm (finding "sin validacion funcional")', () => {
  it('no reporta errores para un formulario completo', () => {
    const errors = validateNewInquiryForm(buildForm());
    expect(hasInquiryFormErrors(errors)).toBe(false);
  });

  it('exige un cliente vinculado, destino y fecha', () => {
    const errors = validateNewInquiryForm(
      buildForm({ customerId: null, destination: '', travelDate: '' }),
    );
    expect(errors.customerId).toBeTruthy();
    expect(errors.destination).toBeTruthy();
    expect(errors.travelDate).toBeTruthy();
  });

  it('no exige cliente cuando ya hay uno vinculado (buscado o recien creado)', () => {
    const errors = validateNewInquiryForm(buildForm({ customerId: 'cust-1' }));
    expect(errors.customerId).toBeUndefined();
  });

  it('ya no exige documento de hospedaje (se piden los documentos por nacionalidad al alquilar)', () => {
    const extranjero = validateNewInquiryForm(buildForm({ nationality: 'EXTRANJERO' }));
    expect(hasInquiryFormErrors(extranjero)).toBe(false);
  });

  it('rechaza una fecha de viaje pasada', () => {
    const errors = validateNewInquiryForm(buildForm({ travelDate: '2020-01-01' }));
    expect(errors.travelDate).toMatch(/pasada/);
  });
});

describe('CR-09: días y personas mínimos', () => {
  it.each([0, -1, 1.5])('rechaza %s días estimados', (days) => {
    expect(validateNewInquiryForm(buildForm({ travelDays: days })).travelDays).toBeTruthy();
  });
  it('rechaza 0 personas', () => {
    expect(validateNewInquiryForm(buildForm({ travelers: 0 })).travelers).toBeTruthy();
  });
  it('acepta 1 día y 1 persona', () => {
    expect(hasInquiryFormErrors(validateNewInquiryForm(buildForm({ travelDays: 1, travelers: 1 })))).toBe(false);
  });
});

describe('Cliente ROJO (respuesta 29-oct #3)', () => {
  it('bloquea registrar la consulta de un cliente ROJO', () => {
    expect(validateNewInquiryForm(buildForm({ customerRiskStatus: 'ROJO' })).customerId).toMatch(/ROJO/);
  });
  it('un cliente AMBAR sí puede consultar', () => {
    expect(hasInquiryFormErrors(validateNewInquiryForm(buildForm({ customerRiskStatus: 'AMBAR' })))).toBe(false);
  });
});
