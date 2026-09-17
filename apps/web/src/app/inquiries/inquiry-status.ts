export type InquiryStatus = 'REGISTRADA' | 'COTIZADA' | 'CONVERTIDA' | 'CERRADA_SIN_CONVERSION';

/**
 * Canal de contacto que recibe `POST /inquiries` (campo `channel`, string
 * libre en el backend de HU-26). No confundir con la "modalidad de
 * exhibicion" de CON-02 (Presencial/Virtual, ver `DisplayMode`) - son dos
 * datos distintos que la especificacion UX menciona por separado.
 */
export type InquiryChannel = 'WHATSAPP' | 'PRESENCIAL' | 'WEB' | 'REDES';

export const INQUIRY_CHANNEL_LABELS: Record<InquiryChannel, string> = {
  WHATSAPP: 'WhatsApp',
  PRESENCIAL: 'Presencial',
  WEB: 'Web',
  REDES: 'Redes sociales',
};

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
