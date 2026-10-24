export type InquiryStatus = 'REGISTRADA' | 'COTIZADA' | 'CONVERTIDA' | 'CERRADA_SIN_CONVERSION';

/**
 * Canal de contacto que recibe `POST /inquiries` (campo `channel`, string
 * libre en el backend de HU-26). No confundir con la "modalidad de
 * exhibicion" de CON-02 (Presencial/Virtual, ver `DisplayMode`) - son dos
 * datos distintos que la especificacion UX menciona por separado.
 */
export type InquiryChannel = 'WHATSAPP' | 'LLAMADA' | 'PRESENCIAL' | 'WEB' | 'REDES';

export const INQUIRY_CHANNEL_LABELS: Record<InquiryChannel, string> = {
  WHATSAPP: 'WhatsApp',
  LLAMADA: 'Llamada',
  PRESENCIAL: 'Presencial',
  WEB: 'Web',
  REDES: 'Redes sociales',
};

/** Etiqueta legible del canal (el backend puede devolver null en consultas LEGACY_STUB). */
export function inquiryChannelLabel(channel: string | null | undefined): string {
  if (!channel) return 'Sin canal';
  return (INQUIRY_CHANNEL_LABELS as Record<string, string>)[channel] ?? channel;
}

export type InquiryNationality = 'PERUANO' | 'EXTRANJERO';

/**
 * BR-CON-004 (decision 22-oct): documentos que se exigen segun la nacionalidad. El backend
 * devuelve `requiredDocuments` en la consulta; este mapa solo es el respaldo para CON-02,
 * donde la consulta aun no existe y la nacionalidad sale del cliente vinculado.
 */
export const REQUIRED_DOCUMENT_LABELS: Record<string, string> = {
  DNI: 'DNI',
  PASAPORTE: 'Pasaporte',
  LICENCIA_CONDUCIR: 'Licencia de conducir',
  RECIBO_AGUA_O_LUZ: 'Recibo de agua o luz (comprobante de domicilio)',
  CONSTANCIA_HOSPEDAJE: 'Constancia de hospedaje',
  CARNE_EXTRANJERIA: 'Carné de extranjería (CE)',
  RECIBO_AGUA_LUZ: 'Recibo de agua o luz',
  FECHA_INGRESO: 'Fecha de ingreso al país',
};

export function fallbackRequiredDocuments(nationality: InquiryNationality): string[] {
  return nationality === 'EXTRANJERO'
    ? ['PASAPORTE', 'LICENCIA_CONDUCIR', 'CONSTANCIA_HOSPEDAJE']
    : ['DNI', 'LICENCIA_CONDUCIR', 'RECIBO_AGUA_O_LUZ'];
}

export function requiredDocumentLabel(code: string): string {
  return REQUIRED_DOCUMENT_LABELS[code] ?? code;
}

/** Modalidad de exhibicion (CON-02/CON-03) - solo UI, no viaja al backend. */
export type DisplayMode = 'PRESENCIAL' | 'VIRTUAL';

/** PANTALLAS-V3-B-CONSULTA.md CON-01 - agrupacion de estados para el badge de la bandeja. */
export type InquiryStatusGroup = 'ABIERTA' | 'CONVERTIDA' | 'CERRADA';

export const INQUIRY_STATUS_GROUP: Record<InquiryStatus, InquiryStatusGroup> = {
  REGISTRADA: 'ABIERTA',
  COTIZADA: 'ABIERTA',
  CONVERTIDA: 'CONVERTIDA',
  CERRADA_SIN_CONVERSION: 'CERRADA',
};

export const INQUIRY_STATUS_GROUP_LABELS: Record<InquiryStatusGroup, string> = {
  ABIERTA: 'Abierta',
  CONVERTIDA: 'Convertida',
  CERRADA: 'Cerrada',
};

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  REGISTRADA: 'Registrada',
  COTIZADA: 'Cotizada',
  CONVERTIDA: 'Convertida',
  CERRADA_SIN_CONVERSION: 'Cerrada sin conversión',
};

export const INTERACTION_OUTCOME_LABELS: Record<string, string> = {
  REGISTRADA: 'Consulta registrada',
  COTIZADA: 'Cotizada',
  CONVERTIDA_A_RESERVA: 'Convertida a reserva',
  CONVERTIDA_A_ALQUILER: 'Convertida a alquiler',
  CERRADA_SIN_CONVERSION: 'Cerrada sin conversión',
};

export function interactionOutcomeLabel(outcome: string | null | undefined): string {
  if (!outcome) return 'Interacción';
  return INTERACTION_OUTCOME_LABELS[outcome] ?? outcome;
}

