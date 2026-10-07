import { type Page } from '@playwright/test';
import { interceptAdminRoles, type InterceptedRoles, type RoleFixture } from './admin-roles';
import { ROLE_PRESETS } from './role-presets';

/** Intercepta endpoints administrativos (usuarios, auditoria, parametros, permisos, plantillas) */
export async function interceptAdmin(page: Page, options: { roles?: RoleFixture[] } = {}): Promise<InterceptedRoles> {
  await page.route(/\/admin\/users(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        users: [
          {
            id: 'assign-001',
            firebaseUid: 'user-001',
            email: 'agente@veloxrent.pe',
            companyId: 'company-001',
            companyName: 'VeloxRent Lima',
            branchId: 'branch-001',
            branchName: 'Sede Miraflores',
            role: ROLE_PRESETS.FRONT_OFFICE.role,
            active: true,
            mfaEnrolled: true,
          },
          {
            id: 'assign-002',
            firebaseUid: 'user-002',
            email: 'admin@veloxrent.pe',
            companyId: 'company-001',
            companyName: 'VeloxRent Lima',
            branchId: 'branch-001',
            branchName: 'Sede Miraflores',
            role: ROLE_PRESETS.ADMINISTRACION.role,
            active: true,
            mfaEnrolled: true,
          },
        ],
      }),
    }),
  );

  await page.route(/\/admin\/companies(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        companies: [
          {
            companyId: 'company-001',
            companyName: 'VeloxRent Lima',
            branches: [{ branchId: 'branch-001', branchName: 'Sede Miraflores' }],
          },
        ],
      }),
    }),
  );

  await page.route(/\/admin\/audit-events(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: [
          {
            id: 'audit-001',
            actorFirebaseUid: 'fake-uid-e2e',
            actorEmail: 'admin@veloxrent.pe',
            entityType: 'Rental',
            entityId: 'rent-001',
            action: 'FORMALIZE_CONTRACT',
            changes: { status: 'PENDING_DELIVERY' },
            createdAt: '2026-10-02T15:30:00Z',
          },
          {
            id: 'audit-002',
            actorFirebaseUid: 'fake-uid-e2e',
            actorEmail: 'admin@veloxrent.pe',
            entityType: 'Vehicle',
            entityId: 'veh-001',
            action: 'UPDATE_STATUS',
            changes: { status: 'AVAILABLE' },
            createdAt: '2026-10-02T14:10:00Z',
          },
        ],
      }),
    }),
  );

  await page.route(/\/admin\/parameters\/reservation-deposit-policy(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        current: {
          version: 2,
          amount: '350.00',
          currency: 'PEN',
          effectiveFrom: '2026-09-15T00:00:00Z',
        },
        history: [
          {
            version: 1,
            amount: '300.00',
            currency: 'PEN',
            effectiveFrom: '2026-01-01T00:00:00Z',
          },
        ],
      }),
    }),
  );

  await page.route(/\/rentals\/contract-templates(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'tpl-001',
          companyId: 'company-001',
          type: 'RENTAL_CONTRACT',
          version: 1,
          status: 'ACTIVE',
          effectiveFrom: '2026-09-01T00:00:00Z',
          effectiveTo: null,
          createdAt: '2026-09-01T00:00:00Z',
        },
      ]),
    }),
  );

  // Roles dinamicos y matriz de permisos: servidor simulado con estado (helpers/admin-roles.ts).
  const rolesApi = await interceptAdminRoles(page, options);

  await page.route(/\/admin\/notification-templates(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        templates: [
          {
            eventType: 'RESERVATION_CONFIRMED',
            label: 'Reserva confirmada',
            current: {
              eventType: 'RESERVATION_CONFIRMED',
              version: 1,
              channels: ['EMAIL', 'SMS'],
              body: 'Estimado/a {cliente}, su reserva {codigo_reserva} ha sido confirmada.',
            },
            history: [],
          },
          {
            eventType: 'RENTAL_DELIVERED',
            label: 'Vehículo entregado',
            current: {
              eventType: 'RENTAL_DELIVERED',
              version: 1,
              channels: ['EMAIL'],
              body: 'Hola {cliente}, se ha registrado la entrega del vehículo con placa {placa}.',
            },
            history: [],
          },
        ],
        allowedVariables: ['cliente', 'codigo_reserva', 'placa', 'fecha_inicio'],
        channels: ['EMAIL', 'PUSH', 'SMS'],
      }),
    }),
  );

  return rolesApi;
}
