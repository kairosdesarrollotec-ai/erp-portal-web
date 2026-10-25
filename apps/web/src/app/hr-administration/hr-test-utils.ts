import { fireEvent } from '@testing-library/react';
import type {
  AttendanceRecord,
  EmployeeDetail,
  EmployeeResponse,
  FieldTrip,
  LeaveRequest,
  VacationRequest,
} from './hr-client';

/** Fixtures de las pruebas ADP (no se importa desde codigo de produccion). */
export const baseContext = {
  companyId: 'c1',
  companyName: 'VeloxRent',
  branchId: 'b1',
  branchName: 'Sede Central',
};

export function makeEmployee(overrides: Partial<EmployeeResponse> = {}): EmployeeResponse {
  return {
    id: 'emp-1',
    companyId: 'c1',
    branchId: 'b1',
    candidateId: null,
    documentType: 'DNI',
    documentNumber: '45678912',
    fullName: 'Carlos Pérez',
    email: 'carlos@veloxrent.pe',
    phone: '999111222',
    areaId: 'OPERACIONES',
    areaName: 'Operaciones',
    jobTitle: 'Conductor',
    status: 'PLANILLA',
    hireDate: '2026-01-10',
    fieldTripLateCount: 0,
    isFieldTripObserved: false,
    baseSalary: 1500,
    accountLinked: false,
    restrictedFields: [],
    version: 3,
    createdAt: '2026-01-10T10:00:00Z',
    ...overrides,
    // 0.8.0: `areaCode` es alias de `areaId`; si el test cambia el area, el alias la sigue.
    areaCode: overrides.areaCode ?? overrides.areaId ?? 'OPERACIONES',
  };
}

export function makeDetail(overrides: Partial<EmployeeDetail> = {}): EmployeeDetail {
  return {
    ...makeEmployee(),
    attendanceSummary: { totalPresent: 10, totalLate: 1, totalJustifiedAbsences: 0, totalUnjustifiedAbsences: 1, pendingDeductionAmount: 45 },
    recentLeaves: [],
    recentVacations: [],
    recentFieldTrips: [],
    termination: null,
    ...overrides,
    areaCode: overrides.areaCode ?? overrides.areaId ?? 'OPERACIONES',
  } as EmployeeDetail;
}

export function makeRecord(overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    id: 'att-1',
    employeeId: 'emp-1',
    employeeName: 'Carlos Pérez',
    date: '2026-10-05',
    status: 'PRESENTE',
    minutesLate: 0,
    deductionAmount: 0,
    isDeductionApplied: false,
    createdAt: '2026-10-05T10:00:00Z',
    ...overrides,
  };
}

export function makeLeave(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'leave-1',
    employeeId: 'emp-1',
    employeeName: 'Carlos Pérez',
    type: 'PERMISO_HORAS',
    date: '2026-10-10',
    reason: 'Trámite personal',
    status: 'SOLICITADO',
    createdAt: '2026-10-08T10:00:00Z',
    ...overrides,
  };
}

export function makeVacation(overrides: Partial<VacationRequest> = {}): VacationRequest {
  return {
    id: 'vac-1',
    employeeId: 'emp-2',
    employeeName: 'Rosa Díaz',
    areaId: 'OPERACIONES',
    areaName: 'Operaciones',
    startDate: '2026-11-10',
    endDate: '2026-11-15',
    status: 'PROGRAMADA',
    requestedAt: '2026-09-01T10:00:00Z',
    createdAt: '2026-09-01T10:00:00Z',
    ...overrides,
  };
}

export function makeTrip(overrides: Partial<FieldTrip> = {}): FieldTrip {
  return {
    id: 'trip-1',
    employeeId: 'emp-1',
    employeeName: 'Carlos Pérez',
    destination: 'Taller Central',
    objective: 'Inspección técnica',
    estimatedDeparture: '2026-10-09T14:00:00Z',
    estimatedReturn: '2026-10-09T17:00:00Z',
    status: 'PENDIENTE_NIVEL_1',
    lateMinutes: 0,
    createdAt: '2026-10-09T13:55:00Z',
    ...overrides,
  };
}

/** Sustituto minimo de user-event (no es dependencia del repo). */
export function setupUser() {
  return {
    click: async (element: Element) => {
      fireEvent.click(element);
    },
    type: async (element: Element, text: string) => {
      fireEvent.change(element, { target: { value: text } });
    },
  };
}
