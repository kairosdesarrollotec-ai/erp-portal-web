import type { RentalDocumentType, RentalRequiredDocument, RentalResponse, ValidateDocumentsPayload } from './rentals-client';

/**
 * BR-CON-004 (22-oct): documentos requeridos segun la nacionalidad. La fuente de verdad es `rental.requiredDocuments`;
 * este respaldo solo cubre respuestas antiguas sin el campo y replica la tabla del back.
 */
const PERUVIAN: RentalRequiredDocument[] = [
  { code: 'DNI', label: 'DNI', kind: 'DOCUMENT', field: 'identityDocumentValid' },
  { code: 'LICENCIA_CONDUCIR', label: 'Licencia de conducir vigente', kind: 'DOCUMENT', field: 'driverLicenseValid' },
  { code: 'RECIBO_AGUA_LUZ', label: 'Recibo de agua o luz', kind: 'DOCUMENT', field: 'addressOrStayProofValid' },
];
const FOREIGN: RentalRequiredDocument[] = [
  { code: 'PASAPORTE', label: 'Pasaporte', kind: 'DOCUMENT', field: 'passportValid' },
  { code: 'CARNE_EXTRANJERIA', label: 'Carné de extranjería (CE)', kind: 'DOCUMENT', field: 'foreignerCardValid' },
  { code: 'LICENCIA_CONDUCIR', label: 'Licencia de conducir vigente', kind: 'DOCUMENT', field: 'driverLicenseValid' },
  { code: 'CONSTANCIA_HOSPEDAJE', label: 'Constancia de hospedaje', kind: 'DOCUMENT', field: 'addressOrStayProofValid' },
  { code: 'FECHA_INGRESO', label: 'Fecha de ingreso al país', kind: 'DATA', field: null },
];

/** Orden de pantalla: licencia, identidad, comprobante; los datos (DATA) al final. */
const ORDER = ['LICENCIA_CONDUCIR', 'DNI', 'PASAPORTE', 'CARNE_EXTRANJERIA', 'RECIBO_AGUA_LUZ', 'CONSTANCIA_HOSPEDAJE', 'FECHA_INGRESO'];

export function stage1RequiredDocuments(
  rental: Pick<RentalResponse, 'requiredDocuments' | 'customerNationality' | 'customerDocNumber'>,
): RentalRequiredDocument[] {
  const list =
    rental.requiredDocuments && rental.requiredDocuments.length > 0
      ? rental.requiredDocuments
      : (rental.customerNationality ?? inferNationality(rental.customerDocNumber)) === 'EXTRANJERO'
        ? FOREIGN
        : PERUVIAN;
  const rank = (code: string) => {
    const i = ORDER.indexOf(code);
    return i === -1 ? ORDER.length : i;
  };
  return [...list].sort((a, b) => rank(a.code) - rank(b.code));
}

/** DNI (8 digitos) y RUC (11) = peruano; cualquier otro formato = extranjero (el back es la autoridad). */
function inferNationality(docNumber: string | undefined | null): 'PERUANO' | 'EXTRANJERO' {
  const d = (docNumber ?? '').trim();
  return d === '' || /^\d{8}$/.test(d) || /^\d{11}$/.test(d) ? 'PERUANO' : 'EXTRANJERO';
}

/** Tipo de archivo que se sube para cada documento requerido. */
export function uploadTypeFor(code: string): RentalDocumentType {
  if (code === 'LICENCIA_CONDUCIR') return 'LICENSE';
  if (code === 'RECIBO_AGUA_LUZ' || code === 'CONSTANCIA_HOSPEDAJE') return 'PROOF_OF_ADDRESS';
  return 'ID_DOCUMENT';
}

/** Cuerpo de validate-documents: un booleano por campo exigido, true solo si el archivo se subio en esta sesion. */
export function buildValidatePayload(
  docs: RentalRequiredDocument[],
  uploaded: ReadonlySet<string>,
  notes: string,
): ValidateDocumentsPayload {
  const payload: ValidateDocumentsPayload = {};
  for (const doc of docs) {
    if (doc.kind !== 'DOCUMENT' || !doc.field) continue;
    (payload as Record<string, boolean>)[doc.field] = uploaded.has(doc.code);
  }
  if (notes.trim()) payload.notes = notes.trim();
  return payload;
}

/** Todos los documentos-archivo exigidos estan subidos (los DATA no se suben: los valida el back contra el cliente). */
export function allDocumentsUploaded(docs: RentalRequiredDocument[], uploaded: ReadonlySet<string>): boolean {
  const identityAlternatives = docs.filter((d) => IDENTITY_EITHER.includes(d.code));
  const identityOk = identityAlternatives.length === 0 || identityAlternatives.some((d) => uploaded.has(d.code));
  return identityOk && docs.filter((d) => d.kind === 'DOCUMENT' && !IDENTITY_EITHER.includes(d.code)).every((d) => uploaded.has(d.code));
}

/** CR-08 (29-oct): el extranjero presenta pasaporte O carné de extranjería (basta uno). */
export const IDENTITY_EITHER: readonly string[] = ['PASAPORTE', 'CARNE_EXTRANJERIA'];
