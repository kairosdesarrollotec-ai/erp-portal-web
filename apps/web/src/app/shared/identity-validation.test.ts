import { describe, it, expect } from 'vitest';
import { validateDocumentNumber, validatePhone, validatePersonName, isHttpUrl } from './identity-validation';

describe('identity-validation (CR-10 / R-7)', () => {
  it.each([['DNI', '12345678', null], ['DNI', '123', 'DNI'], ['DNI', 'ABCDEFGH', 'DNI'], ['RUC', '20123456789', null], ['RUC', '2012', 'RUC'],
    ['CE', 'AB12345', null], ['PASAPORTE', 'P1', 'pasaporte'], ['OTRO', 'x', null]])('%s %s', (t, n, err) => {
    const r = validateDocumentNumber(t, n);
    if (err) expect(r).toMatch(new RegExp(err)); else expect(r).toBeNull();
  });
  it('exige número', () => expect(validateDocumentNumber('DNI', ' ')).toBeTruthy());
  it('teléfono numérico', () => {
    expect(validatePhone('')).toBeNull();
    expect(validatePhone('+51 987 654 321')).toBeNull();
    expect(validatePhone('abc')).toBeTruthy();
    expect(validatePhone('123')).toBeTruthy();
  });
  it('nombre mínimo', () => {
    expect(validatePersonName('X')).toBeTruthy();
    expect(validatePersonName('Ana')).toBeNull();
  });
});

describe('isHttpUrl (R-6)', () => {
  it.each([['https://x.pe/doc.pdf', true], ['http://x.pe', true], ['javascript:alert(1)', false], ['hola', false], ['', false], ['/personal/hola', false]])('%s', (v, ok) => {
    expect(isHttpUrl(v)).toBe(ok);
  });
});
