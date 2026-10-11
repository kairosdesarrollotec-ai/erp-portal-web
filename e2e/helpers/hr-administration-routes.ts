import type { Page } from '@playwright/test';

// ---------- fixtures -------------------------------------------------------

export const EMPLOYEE_FIXTURE = {
  id: 'emp-e2e-1',
  companyId: 'company-001',
  branchId: 'branch-001',
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
  createdAt: '2026-01-10T10:00:00Z',
};

export const EMPLOYEE_DETAIL_FIXTURE = {
  ...EMPLOYEE_FIXTURE,
  attendanceSummary: {
    totalPresent: 10,
    totalLate: 1,
    totalJustifiedAbsences: 0,
    totalUnjustifiedAbsences: 1,
    pendingDeductionAmount: 45,
  },
  recentLeaves: [],
  recentVacations: [],
  recentFieldTrips: [],
  termination: null,
};

export const ATTENDANCE_RECORD_FIXTURE = {
  id: 'att-e2e-1',
  employeeId: 'emp-e2e-1',
  employeeName: 'Carlos Pérez',
  date: '2026-10-05',
  status: 'PRESENTE',
  minutesLate: 0,
  deductionAmount: 0,
  isDeductionApplied: false,
  createdAt: '2026-10-05T10:00:00Z',
};

export const ATTENDANCE_SUMMARY_FIXTURE = {
  month: '2026-10',
  companyId: 'company-001',
  totalEmployees: 1,
  totalDeductionsAmount: 45,
  items: [
    {
      employeeId: 'emp-e2e-1',
      employeeName: 'Carlos Pérez',
      areaName: 'Operaciones',
      totalLates: 1,
      totalUnjustified: 1,
      calculatedDeduction: 45,
      isApplied: false,
    },
  ],
};

export const LEAVE_FIXTURE = {
  id: 'leave-e2e-1',
  employeeId: 'emp-e2e-1',
  employeeName: 'Carlos Pérez',
  type: 'PERMISO_HORAS',
  date: '2026-10-10',
  reason: 'Trámite personal',
  status: 'SOLICITADO',
  createdAt: '2026-10-08T10:00:00Z',
};

export const VACATION_FIXTURE = {
  id: 'vac-e2e-1',
  employeeId: 'emp-e2e-1',
  employeeName: 'Carlos Pérez',
  areaId: 'OPERACIONES',
  areaName: 'Operaciones',
  startDate: '2026-11-10',
  endDate: '2026-11-15',
  status: 'PROGRAMADA',
  requestedAt: '2026-09-01T10:00:00Z',
  createdAt: '2026-09-01T10:00:00Z',
};

export const FIELD_TRIP_FIXTURE = {
  id: 'trip-e2e-1',
  employeeId: 'emp-e2e-1',
  employeeName: 'Carlos Pérez',
  destination: 'Taller Central',
  objective: 'Inspección técnica',
  estimatedDeparture: '2026-10-09T14:00:00Z',
  estimatedReturn: '2026-10-09T17:00:00Z',
  status: 'PENDIENTE_NIVEL_1',
  lateMinutes: 0,
  createdAt: '2026-10-09T13:55:00Z',
};

// ---------- interceptor ----------------------------------------------------

export interface InterceptHrOptions {
  employees?: object[];
  employeeDetail?: object;
  attendanceRecords?: object[];
  attendanceSummary?: object;
  leaves?: object[];
  vacations?: object[];
  fieldTrips?: object[];
  fieldTripDetail?: object;
}

export async function interceptHrAdministration(
  page: Page,
  options: InterceptHrOptions = {},
): Promise<void> {
  const employees = options.employees ?? [EMPLOYEE_FIXTURE];
  const employeeDetail = options.employeeDetail ?? EMPLOYEE_DETAIL_FIXTURE;
  const attendanceRecords = options.attendanceRecords ?? [ATTENDANCE_RECORD_FIXTURE];
  const attendanceSummary = options.attendanceSummary ?? ATTENDANCE_SUMMARY_FIXTURE;
  const leaves = options.leaves ?? [LEAVE_FIXTURE];
  const vacations = options.vacations ?? [VACATION_FIXTURE];
  const fieldTrips = options.fieldTrips ?? [FIELD_TRIP_FIXTURE];
  const fieldTripDetail = options.fieldTripDetail ?? FIELD_TRIP_FIXTURE;

  // POST /employees/{id}/terminate
  await page.route(/\/employees\/[^/]+\/terminate$/, (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'term-e2e-1', employeeId: 'emp-e2e-1', reason: 'RENUNCIA', noticeDays: 30, finalSettlementPaid: true, createdAt: '2026-10-11T10:00:00Z' }),
    });
  });

  // POST /employees/{id}/field-trips
  await page.route(/\/employees\/[^/]+\/field-trips$/, (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(fieldTripDetail),
    });
  });

  // POST /employees/{id}/vacations
  await page.route(/\/employees\/[^/]+\/vacations$/, (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(VACATION_FIXTURE),
    });
  });

  // POST /employees/{id}/leaves
  await page.route(/\/employees\/[^/]+\/leaves$/, (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(LEAVE_FIXTURE),
    });
  });

  // POST /employees/{id}/attendance
  await page.route(/\/employees\/[^/]+\/attendance$/, (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(ATTENDANCE_RECORD_FIXTURE),
    });
  });

  // GET /employees/{id}/attendance
  await page.route(/\/employees\/[^/]+\/attendance(\?.*)?$/, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(attendanceRecords),
    });
  });

  // GET /employees/{id}/vacations
  await page.route(/\/employees\/[^/]+\/vacations(\?.*)?$/, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(vacations),
    });
  });

  // GET /employees/{id}/leaves
  await page.route(/\/employees\/[^/]+\/leaves(\?.*)?$/, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(leaves),
    });
  });

  // GET /employees/{id} — detail (before generic list)
  await page.route(/\/employees\/[^?/]+(\?.*)?$/, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(employeeDetail),
    });
  });

  // GET /employees — list (registered last, lowest priority)
  await page.route(/\/employees(\?.*)?$/, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: employees, total: employees.length }),
    });
  });

  // GET /attendance/summary
  await page.route(/\/attendance\/summary(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(attendanceSummary),
    }),
  );

  // POST /attendance/apply-deductions
  await page.route(/\/attendance\/apply-deductions$/, (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ processedCount: 1, totalDeducted: 45 }),
    }),
  );

  // GET /vacations/calendar
  await page.route(/\/vacations\/calendar(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(vacations),
    }),
  );

  // PATCH /leaves/{id}/resolve
  await page.route(/\/leaves\/[^/]+\/resolve$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...LEAVE_FIXTURE, status: 'AUTORIZADO' }),
    }),
  );

  // POST /field-trips/{id}/authorize
  await page.route(/\/field-trips\/[^/]+\/authorize$/, (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ...FIELD_TRIP_FIXTURE, status: 'PENDIENTE_NIVEL_2' }),
    }),
  );

  // POST /field-trips/{id}/advance-timeout
  await page.route(/\/field-trips\/[^/]+\/advance-timeout$/, (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ...FIELD_TRIP_FIXTURE, status: 'PENDIENTE_NIVEL_2' }),
    }),
  );

  // POST /field-trips/{id}/return
  await page.route(/\/field-trips\/[^/]+\/return$/, (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ...FIELD_TRIP_FIXTURE, status: 'COMPLETADA' }),
    }),
  );

  // GET /field-trips/{id} — detail (before list)
  await page.route(/\/field-trips\/[^?/]+(\?.*)?$/, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fieldTripDetail),
    });
  });

  // GET /field-trips — list
  await page.route(/\/field-trips(\?.*)?$/, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fieldTrips),
    });
  });
}
