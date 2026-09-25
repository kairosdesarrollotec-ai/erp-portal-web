/**
 * StatusBadge — primitiva del Design System VeloxRent
 * Fuente: veloxrent_erp_design_system/DESIGN.md — Components > Status Badges & Chips
 *
 * Representa estados del ciclo de vida de vehiculos y alquileres.
 * Tipografia: code-operational-sm (Space Grotesk).
 */
import styles from './StatusBadge.module.css';

export type BadgeStatus = 'available' | 'rented' | 'maintenance' | 'grounded';

export interface StatusBadgeProps {
  status: BadgeStatus;
  label: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const classes = [styles.badge, styles[status], className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} role="status">
      {label}
    </span>
  );
}
