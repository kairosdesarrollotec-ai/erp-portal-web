import { PROCESS_FLOW_STEPS, PROCESS_STATE_LABEL, processFlowPosition, type CandidateProcessState } from './recruitment-domain';
import styles from './RecruitmentFlow.module.css';

interface Props {
  state: CandidateProcessState;
  /** true si ya hay una entrevista con resultado registrado (ubica el Descartado en el flujo). */
  hadInterview?: boolean;
}

/**
 * Seguimiento de solo lectura del flujo BDD-REC §11.6
 * (Necesidad → Publicado → En negociación → Entrevistado → Decidido → Ingresado → Periodo de prueba → Planilla).
 * El estado cambia solo con las acciones del proceso (entrevista, decisión, incorporación, evaluación); aquí no se edita.
 */
export function ProcessStateTracker({ state, hadInterview = false }: Props) {
  const position = processFlowPosition(state, hadInterview);
  const exited = state === 'DESCARTADO' || state === 'TERMINADO';

  return (
    <div>
      <ol className={styles.flow} aria-label="Estado del proceso de selección">
        {PROCESS_FLOW_STEPS.map((step, index) => {
          const current = !exited && index === position;
          const done = index < position || (exited && index <= position);
          const className = [styles.flowStep, done ? styles.flowStepDone : '', current ? styles.flowStepCurrent : '']
            .filter(Boolean)
            .join(' ');
          return (
            <li key={step.key} className={className} aria-current={current ? 'step' : undefined}>
              {step.label}
              <span className={styles.srOnly}>{current ? ' (estado actual)' : done ? ' (completado)' : ' (pendiente)'}</span>
            </li>
          );
        })}
      </ol>
      {exited && (
        <p className={styles.flowExit}>
          <span className={`${styles.badge} ${styles.badgeNegative}`}>{PROCESS_STATE_LABEL[state]}</span>
        </p>
      )}
    </div>
  );
}
