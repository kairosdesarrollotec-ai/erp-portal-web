import type { ReturnAlertItem, ReturnAlerts, ReturnLateness } from './returns-types';
import {
  immobilizationAlertText,
  immobilizationAlertTitle,
  warrantyAlertText,
  warrantyAlertTitle,
} from './return-alerts';
import { latenessLabel } from './return-lateness';
import styles from './ReturnAlerts.module.css';

/**
 * DEV-07/DEV-08 - banners de alerta de UN expediente (campo `alerts` de GET /returns/{id}).
 * Solo alertan: la liberacion de garantia y el cobro por paralizacion siguen siendo acciones manuales
 * del flujo (close-financial / charge-immobilization).
 */
export function ReturnAlertBanners({
  alerts,
  lateness,
}: {
  alerts: ReturnAlerts | null | undefined;
  lateness?: ReturnLateness | null;
}) {
  const lateText = latenessLabel(lateness);
  if (!lateText && (!alerts || (!alerts.warrantyRelease && !alerts.immobilization))) return null;
  return (
    <div aria-label="Alertas del expediente">
      {lateText && (
        <div role="status" data-testid="lateness-banner" className={`${styles.banner} ${styles.banner_warning}`}>
          <span>
            <span className={styles.bannerTitle}>{lateText}</span>
            <span className={styles.bannerMeta}>Informativo: no genera cobro.</span>
          </span>
        </div>
      )}
      {alerts?.warrantyRelease && (
        <div
          role="alert"
          data-testid="alert-warranty"
          className={`${styles.banner} ${alerts.warrantyRelease.level === 'OVERDUE' ? styles.banner_error : styles.banner_warning}`}
        >
          <span>
            <span className={styles.bannerTitle}>{warrantyAlertTitle(alerts.warrantyRelease)}</span>
            <span className={styles.bannerMeta}>{warrantyAlertText(alerts.warrantyRelease)}</span>
          </span>
        </div>
      )}
      {alerts?.immobilization && (
        <div role="alert" data-testid="alert-immobilization" className={`${styles.banner} ${styles.banner_warning}`}>
          <span>
            <span className={styles.bannerTitle}>{immobilizationAlertTitle()}</span>
            <span className={styles.bannerMeta}>{immobilizationAlertText(alerts.immobilization)}</span>
          </span>
        </div>
      )}
    </div>
  );
}

interface InboxProps {
  alerts: ReturnAlertItem[];
  onOpen: (item: ReturnAlertItem) => void;
}

/** DEV-01 - banners de la bandeja (GET /returns/alerts): una alerta por expediente y tipo, con acceso al expediente. */
export function ReturnAlertsInbox({ alerts, onOpen }: InboxProps) {
  if (alerts.length === 0) return null;
  return (
    <section aria-label="Alertas de devolución" className={styles.section}>
      {alerts.map((item) => {
        const who = [item.vehiclePlate, item.customerName].filter(Boolean).join(' · ') || 'Devolución';
        const isWarranty = item.type === 'WARRANTY_RELEASE' && item.warrantyRelease;
        const isImmobilization = item.type === 'IMMOBILIZATION' && item.immobilization;
        if (!isWarranty && !isImmobilization) return null;
        const tone = isWarranty && item.warrantyRelease?.level === 'OVERDUE' ? styles.banner_error : styles.banner_warning;
        return (
          <div key={`${item.type}-${item.returnId}`} role="alert" className={`${styles.banner} ${tone}`}>
            <span>
              <span className={styles.bannerTitle}>
                {isWarranty && item.warrantyRelease ? warrantyAlertTitle(item.warrantyRelease) : immobilizationAlertTitle()} — {who}
              </span>
              <span className={styles.bannerMeta}>
                {isWarranty && item.warrantyRelease
                  ? warrantyAlertText(item.warrantyRelease)
                  : item.immobilization
                    ? immobilizationAlertText(item.immobilization)
                    : ''}
              </span>
            </span>
            <button type="button" className={styles.bannerAction} onClick={() => onOpen(item)}>
              Abrir expediente
            </button>
          </div>
        );
      })}
    </section>
  );
}
