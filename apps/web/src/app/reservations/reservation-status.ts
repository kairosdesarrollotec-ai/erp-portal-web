export type ReservationStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PENDING_SALE_RESOLUTION'
  | 'CONVERTED'
  | 'CANCELLED';

export type ChannelMode = 'PRESENCIAL' | 'VIRTUAL';

/** PANTALLAS-V3-B-RESERVA.md RES-01 - badges de la bandeja. */
export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  DRAFT: 'Borrador / No confirmada',
  CONFIRMED: 'Confirmada',
  PENDING_SALE_RESOLUTION: 'Pendiente de resolver',
  CONVERTED: 'Convertida',
  CANCELLED: 'Cancelada',
};
