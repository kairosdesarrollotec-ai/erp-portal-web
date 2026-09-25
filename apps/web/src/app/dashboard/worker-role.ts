/**
 * PROVISIONAL (HU-24/TR-06) - espejo del tipo de dominio del backend
 * (apps/api/src/modules/users/domain/worker-role.ts). El modelo
 * definitivo de roles y permisos vive en ADM-02, todavia no construido -
 * este tipo se reemplaza cuando ADM-02 exista.
 */
export type WorkerRole =
  | 'ADMINISTRACION'
  | 'AUDITORIA'
  | 'CAMPO'
  | 'FINANZAS'
  | 'FRONT_OFFICE'
  | 'GERENCIA'
  | 'RRHH';

export const WORKER_ROLE_LABELS: Record<WorkerRole, string> = {
  ADMINISTRACION: 'Administración',
  AUDITORIA: 'Auditoría',
  CAMPO: 'Campo',
  FINANZAS: 'Finanzas',
  FRONT_OFFICE: 'Front Office',
  GERENCIA: 'Gerencia',
  RRHH: 'RR. HH.',
};
