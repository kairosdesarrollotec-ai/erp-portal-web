import { fireEvent } from '@testing-library/react';
import type { IncidentDetail, IncidentResponse } from './incidents-client';

/** Fixtures compartidos por las pruebas del modulo Incidencias (no se importa desde codigo de produccion). */
export const baseContext = {
  companyId: 'c1',
  companyName: 'VeloxRent',
  branchId: 'b1',
  branchName: 'Sede Central',
};

export function makeIncident(overrides: Partial<IncidentResponse> = {}): IncidentResponse {
  return {
    id: 'inc-1',
    companyId: 'c1',
    branchId: 'b1',
    rentalId: 'rent-0001-aaaa',
    rentalCode: 'ALQ-1187',
    returnId: null,
    type: 'KEY_LOSS',
    severity: 'LEVE',
    status: 'ABIERTA',
    description: 'El cliente perdió la llave de repuesto.',
    suggestion: null,
    reportedAt: '2026-10-05T10:00:00Z',
    responsibleUserId: 'user-0001-bbbb',
    resolutionSummary: null,
    resolvedAt: null,
    version: 3,
    createdAt: '2026-10-05T10:00:00Z',
    updatedAt: '2026-10-05T10:00:00Z',
    ...overrides,
  };
}

export function makeDetail(overrides: Partial<IncidentDetail> = {}): IncidentDetail {
  return {
    ...makeIncident(),
    actions: [
      {
        id: 'act-1',
        kind: 'REPORTED',
        description: 'El cliente perdió la llave de repuesto.',
        authorUserId: 'user-0001-bbbb',
        createdAt: '2026-10-05T10:00:00Z',
      },
      {
        id: 'act-2',
        kind: 'ACTION',
        description: 'Se llamó al cliente para que busque la llave.',
        authorUserId: 'user-0001-bbbb',
        createdAt: '2026-10-05T11:00:00Z',
      },
    ],
    ...overrides,
  };
}

/**
 * Sustituto minimo de @testing-library/user-event (no es dependencia del repo):
 * click / escribir (reemplaza el valor) / elegir opcion, con la misma forma de uso.
 */
export function setupUser() {
  return {
    click: async (element: Element) => {
      fireEvent.click(element);
    },
    type: async (element: Element, text: string) => {
      fireEvent.change(element, { target: { value: text } });
    },
    selectOptions: async (element: Element, value: string) => {
      fireEvent.change(element, { target: { value } });
    },
  };
}
