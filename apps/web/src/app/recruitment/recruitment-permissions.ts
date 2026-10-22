import { can, usePermissions } from '../shared/usePermissions';

/**
 * Permisos de Reclutamiento y Selección por PERMISO (modulo RECRUITMENT del
 * catalogo de ADM-02), no por rol. Fuente: recruitment.yaml v0.1.0 y
 * PANTALLAS-V2-B-RECLUTAMIENTO (REC-01..08):
 *  - REC-01/02: VIEW_VACANCY, CREATE_VACANCY, PUBLISH_VACANCY.
 *  - REC-03/04: REGISTER_CANDIDATE (alta y mover de etapa), VIEW_CANDIDATE,
 *    VIEW_CANDIDATE_SENSITIVE_DATA (datos personales y pretension salarial).
 *  - REC-05: MANAGE_INTERVIEW.
 *  - REC-06: DECIDE_CANDIDATE (exclusivo Gerencia/RR.HH., BR-REC-003).
 *  - REC-07: MANAGE_ONBOARDING. REC-08: EVALUATE_PROBATION.
 * - recruitment.yaml 0.4.0: DECIDE_NO_ADVANCE («No avanza» tras la entrevista) y TERMINATE_PROBATION (término por prueba
 *   negativa): ambas solo Gerencia General (Respuestas de negocio #12 y #13).
 * - recruitment.yaml 0.6.0: CANCEL_VACANCY (cancelar vacante con motivo; v0: Gerencia y RR.HH.).
 * Mientras los permisos cargan (o si fallan) no se muestra ninguna accion.
 */
export type RecruitmentAction =
  | 'VIEW_VACANCY'
  | 'CREATE_VACANCY'
  | 'PUBLISH_VACANCY'
  | 'REGISTER_CANDIDATE'
  | 'VIEW_CANDIDATE'
  | 'VIEW_CANDIDATE_SENSITIVE_DATA'
  | 'MANAGE_INTERVIEW'
  | 'DECIDE_CANDIDATE'
  | 'MANAGE_ONBOARDING'
  | 'EVALUATE_PROBATION'
  | 'DECIDE_NO_ADVANCE'
  | 'TERMINATE_PROBATION'
  | 'CANCEL_VACANCY';

/** Funcion pura sobre un conjunto de permisos concedidos. */
export function canRecruitmentAction(granted: ReadonlySet<string>, action: RecruitmentAction): boolean {
  return can(granted, 'RECRUITMENT', action);
}

export function useRecruitmentPermissions() {
  const { can: canPermission } = usePermissions();
  return { can: (action: RecruitmentAction) => canPermission('RECRUITMENT', action) };
}
