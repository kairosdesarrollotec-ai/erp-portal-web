import { ROLE_PRESETS } from './role-presets';

export const SINGLE_ASSIGNMENT = {
  companyId: 'company-001',
  companyName: 'VeloxRent Lima',
  branchId: 'branch-001',
  branchName: 'Sede Miraflores',
  role: ROLE_PRESETS.FRONT_OFFICE.role,
};

export const MULTI_ASSIGNMENTS = [
  SINGLE_ASSIGNMENT,
  { companyId: 'company-001', companyName: 'VeloxRent Lima', branchId: 'branch-002', branchName: 'Sede San Isidro', role: ROLE_PRESETS.FRONT_OFFICE.role },
];

export const RESERVATION_FIXTURE = {
  id: 'res-e2e-001',
  status: 'DRAFT',
  channelMode: 'PRESENCIAL',
  version: 1,
  customer: { id: 'cust-001', name: 'Carlos López' },
  vehicle: { id: 'veh-001', plate: 'ABC-123', label: 'Toyota Corolla 2022' },
  startAt: '2026-10-01T09:00:00Z',
  endAt: '2026-10-01T11:00:00Z',
  requiredPayment: { amount: '350.00', currency: 'PEN' },
  requirements: { paymentValidatedAt: null, documentsCompletedAt: null },
  missingRequirements: ['payment', 'documents'],
  confirmedAt: null,
  createdAt: '2026-09-25T00:00:00Z',
};

export const INQUIRY_FIXTURE = {
  id: 'inq-e2e-001',
  status: 'OPEN',
  channel: 'PRESENCIAL',
  version: 1,
  companyId: 'company-001',
  branchId: 'branch-001',
  customerId: 'cust-002',
  touristUse: false,
  createdAt: '2026-09-25T00:00:00Z',
};

export const CUSTOMER_FIXTURE = {
  id: 'cust-002',
  organizationId: 'org-001',
  operatingCompanyId: 'company-001',
  fullName: 'María García',
  documentType: 'DNI',
  documentNumber: '12345678',
  nationality: 'PERUANO',
  email: 'maria.garcia@example.com',
  phone: '999999999',
  createdAt: '2026-09-20T00:00:00Z',
  updatedAt: '2026-09-20T00:00:00Z',
};

export const RENTAL_FIXTURE = {
  id: 'rent-e2e-001',
  status: 'DRAFT',
  customerName: 'Carlos López',
  customerDocNumber: '12345678',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Hilux',
  vehiclePlate: 'ABC-123',
  planCode: 'NORMAL',
  startAt: '2026-10-01T09:00:00Z',
  expectedEndAt: '2026-10-05T09:00:00Z',
  alcoholTestResult: null,
  notaryEvaluation: null,
  contract: null,
  deposit: null,
  version: 1,
};

export function makeEvidenceFixture(
  rentalId = RENTAL_FIXTURE.id,
  photos = 35,
  videos = 3,
): object[] {
  const items: object[] = [];
  for (let i = 0; i < photos; i++) {
    items.push({
      id: `evidence-photo-${i}`,
      rentalId,
      type: 'PHOTO',
      zone: 'FRONTAL',
      objectUrl: `https://storage.test/evidence-photo-${i}.jpg`,
      uploadedBy: 'fake-uid-e2e',
      uploadedAt: '2026-10-01T09:00:00Z',
    });
  }
  for (let i = 0; i < videos; i++) {
    items.push({
      id: `evidence-video-${i}`,
      rentalId,
      type: 'VIDEO',
      zone: 'FRONTAL',
      objectUrl: `https://storage.test/evidence-video-${i}.mp4`,
      uploadedBy: 'fake-uid-e2e',
      uploadedAt: '2026-10-01T09:00:00Z',
    });
  }
  return items;
}

export const VEHICLE_FIXTURE = {
  id: 'veh-e2e-001',
  organizationId: 'org-001',
  operatingCompanyId: 'company-001',
  branchId: 'branch-001',
  plate: 'ABC-123',
  brand: 'Toyota',
  model: 'Hilux',
  year: 2023,
  status: 'AVAILABLE',
  dailyRate: 150,
  category: 'CAMIONETA',
  transmission: 'AUTOMATICA',
  fuelType: 'DIESEL',
  seatCount: 5,
  hasAirConditioning: true,
  createdAt: '2026-09-20T00:00:00Z',
  updatedAt: '2026-09-20T00:00:00Z',
};
