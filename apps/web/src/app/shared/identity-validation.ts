/**
 * Validaciones de identidad compartidas (CR-10 / R-7, hallazgos 29-oct):
 * DNI 8 dígitos, RUC 11 dígitos, CE/pasaporte alfanumérico 6-12, teléfono numérico.
 */
export function validateDocumentNumber(documentType: string, rawNumber: string): string | null {
  const type = documentType.trim().toUpperCase();
  const number = rawNumber.trim();
  if (!number) return 'El número de documento es obligatorio.';
  if (type === 'DNI') return /^\d{8}$/.test(number) ? null : 'El DNI debe tener exactamente 8 dígitos.';
  if (type === 'RUC') return /^\d{11}$/.test(number) ? null : 'El RUC debe tener exactamente 11 dígitos.';
  if (type === 'CE' || type === 'PASAPORTE') {
    return /^[A-Za-z0-9]{6,12}$/.test(number)
      ? null
      : `El ${type === 'CE' ? 'carné de extranjería' : 'pasaporte'} debe ser alfanumérico de 6 a 12 caracteres.`;
  }
  return null;
}

/** Teléfono opcional: solo dígitos (con +, espacios, guiones o paréntesis) y entre 6 y 15 dígitos. */
export function validatePhone(rawPhone: string): string | null {
  const phone = rawPhone.trim();
  if (!phone) return null;
  if (!/^[+\d][\d\s()-]*$/.test(phone)) return 'El teléfono solo puede contener números.';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 15 ? null : 'El teléfono debe tener entre 6 y 15 dígitos.';
}

export const MIN_PERSON_NAME_LENGTH = 3;
export function validatePersonName(rawName: string): string | null {
  return rawName.trim().length >= MIN_PERSON_NAME_LENGTH
    ? null
    : `El nombre debe tener al menos ${MIN_PERSON_NAME_LENGTH} caracteres.`;
}

/** R-6 (29-oct): solo se aceptan enlaces absolutos http(s). */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
