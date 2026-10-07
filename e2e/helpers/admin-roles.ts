import type { Page } from '@playwright/test';

/**
 * Mocks de roles dinamicos y matriz de permisos (contrato:
 * erp-api-local/packages/contracts/openapi/admin.yaml 0.2.0).
 * El servidor simulado es con estado y aplica las reglas del contrato:
 *  - nombre de rol unico sin distinguir mayusculas (409 ROLE_NAME_TAKEN) y 1..60 chars (400 ROLE_NAME_INVALID);
 *  - renombrar/desactivar exigen If-Match con la version entrecomillada (412 VERSION_CONFLICT);
 *  - PLATFORM_ADMIN no se renombra ni se desactiva (403 ROLE_NOT_EDITABLE);
 *  - desactivar un rol con usuarios asignados -> 409 ROLE_HAS_ACTIVE_ASSIGNMENTS;
 *  - un rol nuevo nace sin permisos (no aparece en las entradas de la matriz).
 */
export interface RoleFixture {
  id: string;
  name: string;
  key: string | null;
  isSystem: boolean;
  active: boolean;
  version: number;
  assignmentCount: number;
}

export const PERMISSION_CATALOG = [
  { module: 'RESERVATION', action: 'CREATE', label: 'Reserva: crear' },
  { module: 'RESERVATION', action: 'CONFIRM', label: 'Reserva: confirmar' },
  { module: 'INCIDENT', action: 'VIEW', label: 'Incidencia: ver bandeja y detalle' },
  { module: 'ADMIN', action: 'MANAGE_PERMISSIONS', label: 'Administración: gestionar permisos' },
];

export function defaultRoles(): RoleFixture[] {
  return [
    { id: 'role-front-office', name: 'Front Office', key: 'FRONT_OFFICE', isSystem: true, active: true, version: 1, assignmentCount: 2 },
    { id: 'role-administracion', name: 'Administración', key: 'ADMINISTRACION', isSystem: true, active: true, version: 1, assignmentCount: 1 },
    { id: 'role-platform-admin', name: 'Administrador de Plataforma', key: 'PLATFORM_ADMIN', isSystem: true, active: true, version: 1, assignmentCount: 1 },
  ];
}

export interface InterceptedRoles {
  roles: RoleFixture[];
  /** Comandos de roles recibidos, en orden (create / rename / deactivate). */
  commands: { kind: 'create' | 'rename' | 'deactivate'; id?: string; ifMatch?: string; body: Record<string, unknown> }[];
  /** Matrices guardadas con POST /admin/permissions, en orden. */
  savedMatrices: { scopeCompanyId?: string | null; scopeBranchId?: string | null; entries: { roleId: string; module: string; action: string; allowed: boolean }[] }[];
  /** El proximo renombrado/desactivacion falla con 412 (otro administrador cambio el rol). */
  conflictNext: () => void;
}

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const problem = (code: string, detail: string, status: number) => json({ code, detail }, status);

export async function interceptAdminRoles(
  page: Page,
  options: { roles?: RoleFixture[] } = {},
): Promise<InterceptedRoles> {
  const roles = options.roles ?? defaultRoles();
  let conflict = false;
  // Permisos vigentes por rol; un rol nuevo no tiene entradas (todo denegado).
  const allowedByRole = new Map<string, Set<string>>([
    ['role-front-office', new Set(['RESERVATION.CREATE', 'INCIDENT.VIEW'])],
    ['role-administracion', new Set(['ADMIN.MANAGE_PERMISSIONS'])],
    ['role-platform-admin', new Set(PERMISSION_CATALOG.map((c) => `${c.module}.${c.action}`))],
  ]);
  let matrixVersion = 1;

  const intercepted: InterceptedRoles = {
    roles,
    commands: [],
    savedMatrices: [],
    conflictNext: () => {
      conflict = true;
    },
  };

  const nameTaken = (name: string, exceptId?: string) =>
    roles.some((r) => r.id !== exceptId && r.name.trim().toLowerCase() === name.trim().toLowerCase());
  const validName = (name: unknown): name is string =>
    typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 60;
  const parseVersion = (ifMatch: string | undefined) => Number((ifMatch ?? '').replace(/"/g, ''));

  const matrixBody = () => ({
    version: matrixVersion,
    scope: { companyId: null, branchId: null },
    actionCatalog: PERMISSION_CATALOG,
    // Solo roles que ya tenian entradas guardadas: los roles nuevos no aparecen aqui.
    entries: Array.from(allowedByRole.entries()).flatMap(([roleId, allowed]) =>
      PERMISSION_CATALOG.map((c) => ({
        roleId,
        module: c.module,
        action: c.action,
        allowed: allowed.has(`${c.module}.${c.action}`),
      })),
    ),
  });

  // GET/POST /admin/permissions
  await page.route(/\/admin\/permissions(\?.*)?$/, async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as InterceptedRoles['savedMatrices'][number];
      intercepted.savedMatrices.push(body);
      allowedByRole.clear();
      for (const entry of body.entries) {
        const set = allowedByRole.get(entry.roleId) ?? new Set<string>();
        if (entry.allowed) set.add(`${entry.module}.${entry.action}`);
        allowedByRole.set(entry.roleId, set);
      }
      matrixVersion += 1;
      return route.fulfill(json(matrixBody(), 201));
    }
    return route.fulfill(json(matrixBody()));
  });

  // PATCH /admin/roles/:id (renombrar)
  await page.route(/\/admin\/roles\/[^/?]+(\?.*)?$/, (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    const id = new URL(route.request().url()).pathname.split('/').pop() as string;
    const ifMatch = route.request().headers()['if-match'];
    const body = route.request().postDataJSON() as Record<string, unknown>;
    intercepted.commands.push({ kind: 'rename', id, ifMatch, body });
    const role = roles.find((r) => r.id === id);
    if (!role) return route.fulfill(problem('ROLE_NOT_FOUND', 'No existe', 404));
    if (role.key === 'PLATFORM_ADMIN') return route.fulfill(problem('ROLE_NOT_EDITABLE', 'Rol fijo', 403));
    if (conflict || parseVersion(ifMatch) !== role.version) {
      conflict = false;
      return route.fulfill(problem('VERSION_CONFLICT', 'Version desactualizada', 412));
    }
    if (!validName(body.name)) return route.fulfill(problem('ROLE_NAME_INVALID', 'Nombre invalido', 400));
    if (nameTaken(body.name, id)) return route.fulfill(problem('ROLE_NAME_TAKEN', 'Nombre en uso', 409));
    role.name = body.name.trim();
    role.version += 1;
    return route.fulfill(json(role));
  });

  // POST /admin/roles/:id/deactivate
  await page.route(/\/admin\/roles\/[^/?]+\/deactivate(\?.*)?$/, (route) => {
    const id = new URL(route.request().url()).pathname.split('/').slice(-2)[0];
    const ifMatch = route.request().headers()['if-match'];
    intercepted.commands.push({ kind: 'deactivate', id, ifMatch, body: route.request().postDataJSON() });
    const role = roles.find((r) => r.id === id);
    if (!role) return route.fulfill(problem('ROLE_NOT_FOUND', 'No existe', 404));
    if (role.key === 'PLATFORM_ADMIN') return route.fulfill(problem('ROLE_NOT_EDITABLE', 'Rol fijo', 403));
    if (conflict || parseVersion(ifMatch) !== role.version) {
      conflict = false;
      return route.fulfill(problem('VERSION_CONFLICT', 'Version desactualizada', 412));
    }
    if (role.assignmentCount > 0) {
      return route.fulfill(problem('ROLE_HAS_ACTIVE_ASSIGNMENTS', 'Tiene usuarios', 409));
    }
    role.active = false;
    role.version += 1;
    return route.fulfill(json(role));
  });

  // GET/POST /admin/roles
  await page.route(/\/admin\/roles(\?.*)?$/, (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      intercepted.commands.push({ kind: 'create', body });
      if (!validName(body.name)) return route.fulfill(problem('ROLE_NAME_INVALID', 'Nombre invalido', 400));
      if (nameTaken(body.name)) return route.fulfill(problem('ROLE_NAME_TAKEN', 'Nombre en uso', 409));
      const role: RoleFixture = {
        id: `role-new-${roles.length + 1}`,
        name: body.name.trim(),
        key: null,
        isSystem: false,
        active: true,
        version: 1,
        assignmentCount: 0,
      };
      roles.push(role);
      return route.fulfill(json(role, 201));
    }
    const includeInactive = new URL(route.request().url()).searchParams.get('includeInactive') === 'true';
    return route.fulfill(json({ roles: roles.filter((r) => includeInactive || r.active) }));
  });

  return intercepted;
}
