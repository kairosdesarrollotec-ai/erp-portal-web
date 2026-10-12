import { type DepositStatus, DEPOSIT_STATUS_LABELS } from './payment-domain';
import styles from './DepositBadges.module.css';

/**
 * Badges de estado de garantía (PAG-01/PAG-02).
 * Colores según prototipo aprobado PROTO-PAG-01-BANDEJA-GARANTIAS-DESKTOP:
 *   HELD:               fondo #FFF3E0 texto #E65100 borde #FFCC80 (naranja/custodia)
 *   RETURNED:           fondo #E8F5E9 texto #1B5E20 borde #A5D6A7 (verde/devuelta)
 *   RETAINED:           fondo #FCE4EC texto #880E4F borde #F48FB1 (rosa/retenida)
 *   PARTIALLY_RETAINED: fondo #FFF8E1 texto #F57F17 borde #FFE082 (amarillo/parcial)
 * Distinguibles sin depender solo del color (texto descriptivo).
 */
export function DepositStatusBadge({ status }: { status: DepositStatus }) {
  return (
    <span className={`${styles.badge} ${styles[`status_${status}`]}`} data-status={status}>
      {DEPOSIT_STATUS_LABELS[status]}
    </span>
  );
}
