import { usePermissions } from '../shared/usePermissions';

/**
 * Permisos de Pagos y Garantías (módulo PAYMENT del catálogo ADM-02).
 * Fuente: payments.yaml v0.1.0 + BDD-PAG-001 BR-PAG-007.
 *
 *  - PAG-01 (bandeja): PAYMENT.READ_LIST
 *  - PAG-02 (detalle): PAYMENT.READ_DETAIL
 *  - Registrar ajuste: PAYMENT.REGISTER_ADJUSTMENT
 *  - Aprobar devolución: PAYMENT.APPROVE_REFUND
 *  - Cerrar expediente: PAYMENT.CLOSE_FINANCIAL
 *
 * Mientras los permisos cargan (o si fallan) no se muestra ninguna acción.
 */
export type PaymentAction =
  | 'READ_LIST'
  | 'READ_DETAIL'
  | 'REGISTER_ADJUSTMENT'
  | 'APPROVE_REFUND'
  | 'CLOSE_FINANCIAL';

export function usePaymentPermissions() {
  const { can: canPermission } = usePermissions();
  return { can: (action: PaymentAction) => canPermission('PAYMENT', action) };
}
