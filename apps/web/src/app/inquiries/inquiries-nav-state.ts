import type { DisplayMode, InquiryChannel } from './inquiry-status';

/**
 * Contexto de trabajo (igual forma que `ReservationsWorkContext` en
 * reservations/useWorkContextForReservations.ts).
 */
export interface InquiriesWorkContext {
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
}

/**
 * Datos que viajan entre CON-02 -> CON-03 -> CON-04 via `location.state`
 * del router. Limitacion conocida y documentada: el backend de HU-26 solo
 * persiste `channel` y `touristUse` (contrato de `POST /inquiries`) - el
 * resto de datos capturados en CON-02 (cliente, destino, fecha, personas,
 * modalidad de exhibicion) no tiene todavia un campo server-side donde
 * guardarse, asi que se heredan de pantalla a pantalla por navegacion en
 * vez de volver a pedirse (punto 15 del contrato UX), pero se pierden si
 * el usuario recarga la pagina directamente en CON-03/CON-04. Cuando el
 * backend exponga estos campos, esta interfaz se reemplaza por datos
 * leidos de `GET /inquiries/{id}`.
 */
export interface InquiryNavState extends InquiriesWorkContext {
  customerName: string;
  destination: string;
  travelDate: string;
  travelers: number;
  travelDays: number;
  displayMode: DisplayMode;
  channel: InquiryChannel;
  touristUse: boolean;
  version: number;
  isDirtRoad?: boolean;
  plan?: 'NORMAL' | 'PLUS' | 'LIBRE';
}
