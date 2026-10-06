import { CUSTOMER_RISK_LABELS } from './return-status';
import type { CustomerRiskStatus } from './returns-client';
import styles from './ReturnForms.module.css';

const SYMBOLS: Record<CustomerRiskStatus, string> = { NORMAL: '●', AMBAR: '▲', ROJO: '■' };

/** Badge del semaforo del cliente: texto + simbolo + color (nunca solo color). */
export function CustomerRiskBadge({ status }: { status: CustomerRiskStatus }) {
  return (
    <span className={`${styles.riskBadge} ${styles[`riskBadge_${status}`]}`}>
      <span aria-hidden="true">{SYMBOLS[status]}</span>
      Semáforo del cliente: {CUSTOMER_RISK_LABELS[status]}
    </span>
  );
}
