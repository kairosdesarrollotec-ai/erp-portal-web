/**
 * JWT con firma falsa pero estructura valida (header.payload.sig).
 * Firebase SDK decodifica el payload para leer `exp` y decidir si
 * refrescar el token; `exp: 9999999999` (año 2286) evita que intente
 * refrescar durante los tests.
 */
export function makeFakeJwt(email = 'agente@veloxrent.pe'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub: 'fake-uid-e2e', email, iat: 1_000_000_000, exp: 9_999_999_999 }),
  ).toString('base64url');
  return `${header}.${payload}.fake-signature`;
}

export const FAKE_ID_TOKEN = makeFakeJwt();

/**
 * Roles dinamicos (ADM-02): el rol viaja como RoleRef `{id, name, key}` y el acceso
 * se decide por permisos (`GET /me/permissions`), no por el rol.
 */
export interface E2eRole {
  id: string;
  name: string;
  /** Codigo estable de los roles de sistema; null en roles creados a mano. */
  key: string | null;
}

const INCIDENT_ALL = ['VIEW', 'CREATE', 'ADD_ACTION', 'RESOLVE', 'CLOSE', 'REFER_LEGAL'].map((a) => `INCIDENT.${a}`);
const ADMIN_ALL = ['MANAGE_USERS', 'VIEW_AUDIT', 'MANAGE_PARAMETERS', 'MANAGE_PERMISSIONS', 'MANAGE_NOTIFICATIONS'].map(
  (a) => `ADMIN.${a}`,
);
const RESERVATION_OPERATIONAL = [
  'READ_LIST', 'READ_DETAIL', 'CREATE', 'REGISTER_PAYMENT', 'REGISTER_DOCUMENTS', 'CONFIRM', 'CANCEL_CUSTOMER_REQUESTED_CHANGE',
].map((a) => `RESERVATION.${a}`);
const INQUIRY_ALL = ['READ', 'REGISTER', 'QUOTE', 'CLOSE', 'CONVERT_TO_RESERVATION', 'CONVERT_TO_RENTAL'].map((a) => `INQUIRY.${a}`);
const RENTAL_OPERATIONAL = [
  'CREATE', 'READ', 'VALIDATE_DOCUMENTS', 'REGISTER_ALCOHOL_TEST', 'EVALUATE_NOTARY', 'FORMALIZE_CONTRACT', 'COMPLETE_DELIVERY', 'UPLOAD_EVIDENCE',
].map((a) => `RENTAL.${a}`);

/**
 * Permisos de FLEET, CUSTOMER y RETURN por subconjunto de acciones.
 * Fuentes: fleet-role.policy.ts, customer-role.policy.ts, return-role-policy.ts (fase 4).
 */
const FLEET_READ_ONLY = ['FLEET.READ'];
const FLEET_MANAGER = ['FLEET.READ', 'FLEET.WRITE', 'FLEET.CROSS_BRANCH'];
const CUSTOMER_READ_ONLY = ['CUSTOMER.READ'];
const CUSTOMER_WRITE = ['CUSTOMER.READ', 'CUSTOMER.WRITE'];
// Acciones operativas de campo (FRONT_OFFICE, CAMPO, ADMINISTRACION, GERENCIA)
const RETURN_FIELD = [
  'RETURN.CREATE', 'RETURN.READ', 'RETURN.RECEIVE_PROVISIONAL',
  'RETURN.REGISTER_ALCOHOL_TEST', 'RETURN.COMPLETE_INSPECTION', 'RETURN.UPLOAD_EVIDENCE',
];
// Acciones administrativas adicionales (ADMINISTRACION, GERENCIA)
const RETURN_ADMIN = [
  ...RETURN_FIELD,
  'RETURN.ASSESS_DAMAGE', 'RETURN.CHARGE_IMMOBILIZATION', 'RETURN.CLOSE_FINANCIAL', 'RETURN.CLOSE',
];
// Todas las acciones de devolucion. Solo GERENCIA tiene, por defecto en la matriz ADM-02, RESOLVE_ALCOHOL_ESCALATION y
// CLASSIFY_DAMAGE_SEVERITY (la gravedad del dano se controla por permiso, decision del 27-oct).
const RETURN_ALL = [...RETURN_ADMIN, 'RETURN.RESOLVE_ALCOHOL_ESCALATION', 'RETURN.CLASSIFY_DAMAGE_SEVERITY'];

/** Roles de sistema con una aproximacion de los permisos que siembra la matriz v0. */
export const ROLE_PRESETS: Record<string, { role: E2eRole; permissions: string[] }> = {
  FRONT_OFFICE: {
    role: { id: 'role-front-office', name: 'Front Office', key: 'FRONT_OFFICE' },
    permissions: [
      ...RESERVATION_OPERATIONAL, ...INQUIRY_ALL, ...RENTAL_OPERATIONAL, ...INCIDENT_ALL,
      // Fase 4: FLEET.READ, CUSTOMER.READ+WRITE, RETURN operacional
      ...FLEET_READ_ONLY, ...CUSTOMER_WRITE, ...RETURN_FIELD,
    ],
  },
  ADMINISTRACION: {
    role: { id: 'role-administracion', name: 'Administración', key: 'ADMINISTRACION' },
    permissions: [
      ...ADMIN_ALL, ...RESERVATION_OPERATIONAL, ...INQUIRY_ALL, 'INCIDENT.VIEW',
      // Fase 4: FLEET READ+WRITE+CROSS_BRANCH, CUSTOMER READ+WRITE, RETURN admin
      ...FLEET_MANAGER, ...CUSTOMER_WRITE, ...RETURN_ADMIN,
    ],
  },
  GERENCIA: {
    role: { id: 'role-gerencia', name: 'Gerencia', key: 'GERENCIA' },
    permissions: [
      ...RESERVATION_OPERATIONAL, 'RESERVATION.CANCEL_NO_SHOW', 'RENTAL.APPROVE_NOTARY_EXCEPTION', ...INCIDENT_ALL,
      // Fase 4: FLEET READ+WRITE+CROSS_BRANCH, CUSTOMER READ+WRITE, todas las acciones de RETURN
      ...FLEET_MANAGER, ...CUSTOMER_WRITE, ...RETURN_ALL,
    ],
  },
  AUDITORIA: {
    role: { id: 'role-auditoria', name: 'Auditoría', key: 'AUDITORIA' },
    permissions: [
      'ADMIN.VIEW_AUDIT', 'INCIDENT.VIEW', 'RESERVATION.READ_LIST', 'RESERVATION.READ_DETAIL', 'INQUIRY.READ',
      // Fase 4: solo lectura en FLEET, CUSTOMER y RETURN
      ...FLEET_READ_ONLY, ...CUSTOMER_READ_ONLY, 'RETURN.READ',
    ],
  },
  RRHH: {
    role: { id: 'role-rrhh', name: 'RR. HH.', key: 'RRHH' },
    permissions: [],
  },
};

/** Rol de sesion de un login e2e: un preset por `key` o un rol personalizado con sus permisos. */
export type E2eRoleOption = string | { name: string; key?: string | null; permissions: string[] };

export function resolveRoleOption(option: E2eRoleOption | undefined): { role: E2eRole; permissions: string[] } {
  if (option === undefined) return ROLE_PRESETS.FRONT_OFFICE;
  if (typeof option === 'string') {
    const preset = ROLE_PRESETS[option];
    if (!preset) throw new Error(`Rol e2e desconocido: ${option}`);
    return preset;
  }
  return {
    role: { id: `role-custom-${option.name.toLowerCase().replace(/\W+/g, '-')}`, name: option.name, key: option.key ?? null },
    permissions: option.permissions,
  };
}
