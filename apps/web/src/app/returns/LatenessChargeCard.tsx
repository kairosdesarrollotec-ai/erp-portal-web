import type { ReturnLatenessCharge } from './returns-types';
import { LATENESS_TIER_LABELS, formatChargeAmount, hasLatenessCharge } from './return-lateness';
import styles from './ReturnAlerts.module.css';

/**
 * DEC-DEV-LATE-CHARGE-001 (Hoja de Politicas VR-GA-PA-VS.04) - tarjeta INFORMATIVA con el cargo
 * sugerido por retraso. No cobra ni bloquea: el cobro es manual (ajustes de garantia / cargo).
 */
export function LatenessChargeCard({ charge }: { charge: ReturnLatenessCharge | null | undefined }) {
  if (!hasLatenessCharge(charge)) return null;
  const timeCharge = formatChargeAmount(charge.suggestedTimeCharge, charge.currency);
  const penalty = formatChargeAmount(charge.suggestedGuaranteePenalty, charge.currency);
  const verified = charge.noticeAndPrepaymentVerified;
  const showPenalty = charge.tier !== 'NONE' && verified !== true;
  return (
    <section aria-label="Cargo sugerido por retraso" data-testid="lateness-charge-card">
      {charge.severeBreach && (
        <div role="alert" data-testid="severe-breach-banner" className={`${styles.banner} ${styles.banner_error}`}>
          <span>
            <span className={styles.bannerTitle}>
              Retraso mayor a {charge.severeBreachThresholdHours} h — incumplimiento grave: Gerencia decide (retener garantía /
              resolver contrato)
            </span>
          </span>
        </div>
      )}
      {charge.tier !== 'NONE' && (
        <div role="status" className={`${styles.banner} ${styles.banner_warning}`}>
          <span>
            <span className={styles.bannerTitle}>Cargo sugerido por retraso — {LATENESS_TIER_LABELS[charge.tier]}</span>
            <span className={styles.bannerMeta} data-testid="late-time-charge">
              Cargo por tiempo adicional: {charge.timeChargePercent}% de la tarifa diaria
              {timeCharge ? ` = ${timeCharge}` : charge.dailyRate == null ? ' (sin tarifa diaria registrada)' : ''}
            </span>
            {showPenalty && (
              <span className={styles.bannerMeta} data-testid="late-guarantee-penalty">
                Penalidad sobre la garantía (si no avisó/pagó antes): {charge.guaranteePenaltyPercent}% de la garantía
                {penalty ? ` = ${penalty}` : charge.guaranteeAmount == null ? ' (sin garantía)' : ''}
              </span>
            )}
            {verified === true && (
              <span className={styles.bannerMeta} data-testid="late-covered">
                La ampliación autorizada ya cubre este tiempo: no cobrar dos veces.
              </span>
            )}
            {verified === null && (
              <span className={styles.bannerMeta} data-testid="late-confirm">
                El operador debe confirmar si avisó y pagó por adelantado.
              </span>
            )}
            <span className={styles.bannerMeta}>Informativo: el cobro es manual.</span>
          </span>
        </div>
      )}
    </section>
  );
}
