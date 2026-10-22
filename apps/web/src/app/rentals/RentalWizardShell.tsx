import type { ReactNode } from 'react';
import { AppHeader } from '../shared/AppHeader';
import styles from './RentalWizardShell.module.css';

export interface RentalWizardShellProps {
  stage: 1 | 2 | 3 | 4 | 5;
  title: string;
  children: ReactNode;
  /** Texto del boton fijo de avance. Por defecto "Continuar". */
  continueLabel?: string;
  onContinue?: () => void;
  continueDisabled?: boolean;
  continueBusy?: boolean;
  errorMessage?: string | null;
  /** Accion secundaria (p. ej. cancelar alquiler, DEC-ALQ-CANCEL-001) junto al boton de avance. */
  cancelControl?: ReactNode;
}

const STAGE_LABELS = ['Cliente y documentos', 'Validaciones', 'Garantía y contrato', 'Checklist', 'Confirmación'];

/**
 * Cascaron comun de las 5 etapas del asistente de Entrega
 * (PANTALLAS-V3-B-ALQUILER.md ENTREGA-01..05): indicador de avance fijo
 * de 5 pasos + boton "Continuar" fijo (desktop: abajo a la derecha;
 * movil: abajo, ancho completo).
 */
export function RentalWizardShell({
  stage,
  title,
  children,
  continueLabel = 'Continuar',
  onContinue,
  continueDisabled,
  continueBusy,
  errorMessage,
  cancelControl,
}: RentalWizardShellProps) {
  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle={`Alquiler · ${title}`} />

      <ol className={styles.progress} aria-label="Avance del asistente de entrega">
        {STAGE_LABELS.map((label, index) => {
          const stepNumber = (index + 1) as 1 | 2 | 3 | 4 | 5;
          const status = stepNumber < stage ? 'done' : stepNumber === stage ? 'active' : 'pending';
          return (
            <li key={label} className={`${styles.step} ${styles[`step_${status}`]}`}>
              <span className={styles.stepNumber}>{stepNumber}</span>
              <span className={styles.stepLabel}>{label}</span>
            </li>
          );
        })}
      </ol>

      <div className={styles.content}>{children}</div>

      {errorMessage && (
        <p className={styles.errorBar} role="alert">
          {errorMessage}
        </p>
      )}

      {cancelControl && <div className={styles.cancelBar}>{cancelControl}</div>}

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
