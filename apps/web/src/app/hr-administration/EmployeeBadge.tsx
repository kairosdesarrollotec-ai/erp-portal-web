import { EMPLOYEE_STATUS_LABEL, type EmployeeStatus } from './hr-domain';
import styles from './HrFlow.module.css';

const CLASS: Record<EmployeeStatus, string> = {
  PLANILLA: styles.badgePositive,
  PERIODO_PRUEBA: styles.badgeInfo,
  TERMINADO: styles.badgeNeutral,
};

/** La relacion laboral se comunica con texto ademas del color. */
export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return <span className={`${styles.badge} ${CLASS[status]}`}>{EMPLOYEE_STATUS_LABEL[status]}</span>;
}
