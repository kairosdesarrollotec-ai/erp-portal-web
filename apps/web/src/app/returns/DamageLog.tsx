import { CustomerRiskBadge } from './CustomerRiskBadge';
import { formatPen, humanizeZoneCode } from './return-financial';
import { SEVERITY_LABELS } from './return-status';
import type { ImmobilizationChargeResponse, ReturnDamageResponse } from './returns-client';
import styles from './ReturnForms.module.css';

interface Props {
  damages: readonly ReturnDamageResponse[];
  charges: readonly ImmobilizationChargeResponse[];
  /** Nombres del tarifario por codigo de paño (si no se pasa, se humaniza el codigo). */
  zoneNames?: Record<string, string>;
}

function damageLabel(d: ReturnDamageResponse, zoneNames?: Record<string, string>): string {
  if (d.origin === 'AESTHETIC') return (d.damagedZone && (zoneNames?.[d.damagedZone] ?? humanizeZoneCode(d.damagedZone))) || 'Paño';
  return d.description?.trim() || 'Daño técnico (informe Motrix)';
}

/** Resumen de danos y cargos de paralizacion del expediente (DEV-06..DEV-10); vienen del servidor. */
export function DamageLog({ damages, charges, zoneNames }: Props) {
  if (damages.length === 0 && charges.length === 0) return null;
  return (
    <section className={styles.reviewSection} aria-label="Daños y cargos registrados">
      <p className={styles.reviewSectionTitle}>Registrado en este expediente</p>
      <ul className={styles.evidenceList} style={{ maxHeight: 'none' }}>
        {damages.map((d) => (
          <li key={d.id} className={styles.evidenceListItem}>
            <span>
              {d.origin === 'AESTHETIC' ? 'Daño estético' : 'Daño técnico'} · {SEVERITY_LABELS[d.severity]} ·{' '}
              {damageLabel(d, zoneNames)}
              {d.externalReportReference ? ` (informe ${d.externalReportReference})` : ''}
              {d.customerRiskStatus ? (
                <>
                  {' '}
                  <CustomerRiskBadge status={d.customerRiskStatus} />
                </>
              ) : null}
            </span>
            <span>{d.estimatedAmount != null ? formatPen(d.estimatedAmount) : 'Monto pendiente'}</span>
          </li>
        ))}
        {charges.map((c) => (
          <li key={c.id} className={styles.evidenceListItem}>
            <span>
              Paralización · {c.daysCharged} día(s) × {formatPen(c.dailyRate)}
            </span>
            <span>{formatPen(c.totalAmount)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
