import type { ReactNode } from 'react';
import { AppHeader } from '../shared/AppHeader';
import { ReturnAlertBanners } from './ReturnAlertBanners';
import { LatenessChargeCard } from './LatenessChargeCard';
import type { ReturnAlerts, ReturnLateness, ReturnLatenessCharge } from './returns-types';
import styles from './ReturnFlowShell.module.css';

export type ReturnFlowStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_LABELS = ['Recepción', 'Alcoholímetro', 'Checklist', 'Resultado', 'Garantía', 'Cierre'];

export interface ReturnFlowShellProps {
  step: ReturnFlowStep;
  title: string;
  children: ReactNode;
  continueLabel?: string;
  onContinue?: () => void;
  continueDisabled?: boolean;
  continueBusy?: boolean;
  errorMessage?: string | null;
  /** Alertas operativas del expediente (garantia por liberar / inmovilizacion > 24 h): solo informan. */
  alerts?: ReturnAlerts | null;
  /** Retraso informativo (BR-DEV-003): sin cobro. */
  lateness?: ReturnLateness | null;
  /** Cargo sugerido por retraso (DEC-DEV-LATE-CHARGE-001): informativo. */
  latenessCharge?: ReturnLatenessCharge | null;
}

/**
 * Cascaron comun del proceso de Devolucion (DEV-02..DEV-10). El flujo de
 * PANTALLAS-V3-B-DEVOLUCION.md es: Identificacion -> Alcolimetro -> Checklist
 * -> Resultado (hub DEV-05) -> [Dano DEV-06/07/08 solo si aplica] -> Garantia
 * -> Cierre. Indicador de avance fijo de 6 pasos + boton de avance fijo.
 */
export function ReturnFlowShell({
  step,
  title,
  children,
  continueLabel = 'Continuar',
  onContinue,
  continueDisabled,
  continueBusy,
  errorMessage,
  alerts,
  lateness,
  latenessCharge,
}: ReturnFlowShellProps) {
  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle={`Devolución · ${title}`} />

      <ol className={styles.progress} aria-label="Avance del proceso de devolución">
        {STEP_LABELS.map((label, index) => {
          const stepNumber = (index + 1) as ReturnFlowStep;
          const status = stepNumber < step ? 'done' : stepNumber === step ? 'active' : 'pending';
          return (
            <li
              key={label}
              className={`${styles.step} ${styles[`step_${status}`]}`}
              aria-current={status === 'active' ? 'step' : undefined}
            >
              <span className={styles.stepNumber}>{stepNumber}</span>
              <span className={styles.stepLabel}>{label}</span>
            </li>
          );
        })}
      </ol>

      <div className={styles.content}>
        <ReturnAlertBanners alerts={alerts} lateness={lateness} />
        <LatenessChargeCard charge={latenessCharge} />
        {children}
      </div>

      {errorMessage && (
        <p className={styles.errorBar} role="alert">
          {errorMessage}
        </p>
      )}

      {onContinue && (
        <div className={styles.continueBar}>
          <button
            type="button"
            className={styles.continueButton}
            onClick={onContinue}
            disabled={continueDisabled || continueBusy}
          >
            {continueBusy ? 'Guardando…' : continueLabel}
          </button>
        </div>
      )}
    </main>
  );
}
