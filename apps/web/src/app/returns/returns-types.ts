/**
 * Tipos del módulo de Devoluciones.
 * Contrato: packages/contracts/openapi/returns.yaml (erp-api-local).
 */
import type {
  CustodyHolder,
  DamageOrigin,
  DamageSeverity,
  ReturnAlcoholTestResult,
  ReturnFuelLevel,
  ReturnStatus,
} from './return-status';
export type {
  CustodyHolder,
  DamageOrigin,
  DamageSeverity,
  ReturnAlcoholTestResult,
  ReturnFuelLevel,
  ReturnStatus,
};

export type AlcoholEscalationDecision = 'CONTINUE_TO_INSPECTION' | 'KEEP_IN_CUSTODY';

export interface AlcoholEscalation {
  decision: AlcoholEscalationDecision;
  markCustomerRed: boolean;
  notes: string;
  decidedById: string;
  decidedAt: string;
}

export interface ResponsibilityDocumentInput {
  signerName: string;
  signerIsHolder: boolean;
  /** Obligatorio cuando quien firma no es el titular (EX-DEV-001). */
  signerRelationToHolder?: string;
  signatureData: string;
}

/** Lo que el expediente devuelve del documento (ResponsibilityDocumentResponse): nunca incluye signatureData. */
export interface ResponsibilityDocumentSummary {
  signerName: string;
  signerIsHolder: boolean;
  signerRelationToHolder?: string | null;
  signedAt?: string;
}

/** Semaforo del cliente tras evaluar un dano (assess-damage). */
export type CustomerRiskStatus = 'NORMAL' | 'AMBAR' | 'ROJO';

export interface ReturnDamageResponse {
  id: string;
  returnId: string;
  origin: DamageOrigin;
  severity: DamageSeverity;
  damagedZone?: string | null;
  estimatedAmount?: number | null;
  externalReportReference?: string | null;
  description?: string | null;
  customerRiskStatus?: CustomerRiskStatus | null;
  createdAt: string;
  returnVersion?: number;
  returnEtag?: string;
}

export interface ImmobilizationChargeResponse {
  id: string;
  returnId: string;
  damageId?: string | null;
  daysCharged: number;
  dailyRate: number;
  totalAmount: number;
  notes?: string | null;
  createdAt: string;
  returnVersion?: number;
  returnEtag?: string;
}

/** DEV-01 / BR-DEV-004 - recordatorio previo (3 h antes) de envio manual-asistido por WhatsApp. */
export type ReturnReminderStatus = 'PENDING' | 'SENT' | 'FAILED';
export type ReturnReminderResult = 'SENT' | 'FAILED';

export interface ReturnReminder {
  id: string;
  status: ReturnReminderStatus;
  dueAt: string;
  /** Mensaje redactado por el sistema (hora en America/Lima), listo para copiar y enviar. */
  text: string;
  generatedAt: string;
  sentAt: string | null;
  sentBy: string | null;
  note: string | null;
  attempts: number;
  /** Valor para If-Match de register-reminder (version del RECORDATORIO, no del expediente). */
  version: number;
  etag: string;
}

export interface ReturnReminderInboxItem {
  returnId: string;
  rentalId: string;
  returnStatus: ReturnStatus;
  scheduledAt: string;
  vehiclePlate: string | null;
  customerName: string | null;
  customerPhone: string | null;
  reminder: ReturnReminder;
}

export interface RegisterReminderInput {
  result: ReturnReminderResult;
  sentAt?: string;
  /** Obligatoria cuando result = FAILED. */
  note?: string;
}

/** DEV-07/DEV-08 - alertas operativas (solo alertan; reembolso y cobro siguen siendo manuales). */
export type ReturnAlertType = 'WARRANTY_RELEASE' | 'IMMOBILIZATION';

export interface WarrantyReleaseAlert {
  level: 'DUE_SOON' | 'OVERDUE';
  deadlineAt: string;
  /** Negativo si ya vencio. */
  hoursRemaining: number;
}

export interface ImmobilizationAlert {
  since: string;
  hoursElapsed: number;
  pendingDays: number;
  dailyRate: number | null;
  suggestedAmount: number | null;
}

export interface ReturnAlerts {
  warrantyRelease: WarrantyReleaseAlert | null;
  immobilization: ImmobilizationAlert | null;
}

export interface ReturnAlertItem {
  type: ReturnAlertType;
  returnId: string;
  rentalId: string;
  returnStatus: ReturnStatus;
  returnVersion: number;
  vehiclePlate: string | null;
  customerName: string | null;
  receivedAt: string;
  warrantyRelease: WarrantyReleaseAlert | null;
  immobilization: ImmobilizationAlert | null;
}

/** BR-DEV-003 - retraso informativo (tolerancia 30 min sobre scheduledAt). No genera cobro. */
export interface ReturnLateness {
  lateToleranceMinutes: number;
  lateMinutes: number;
  isLate: boolean;
  /** RECEIVED: medido contra receivedAt; NOW: contra el reloj (aun sin recepcion). */
  basis: 'RECEIVED' | 'NOW';
}

export interface ReturnResponse {
  id: string;
  organizationId: string;
  operatingCompanyId: string;
  branchId: string;
  rentalId: string;
  vehicleId: string;
  customerId: string;
  vehiclePlate?: string | null;
  customerName?: string | null;
  status: ReturnStatus;
  custodyHolder: CustodyHolder;
  customerPresent: boolean;
  mileageAtReturn?: number | null;
  fuelLevelAtReturn?: ReturnFuelLevel | null;
  alcoholTestResult?: ReturnAlcoholTestResult | null;
  alcoholTestNotes?: string | null;
  /** Decision de Gerencia ante alcolimetro desfavorable (null si aun no hubo). */
  alcoholEscalation: AlcoholEscalation | null;
  /** Documento de responsabilidad firmado en la inspeccion (null antes de completarla; sin la firma). */
  responsibilityDocument: ResponsibilityDocumentSummary | null;
  scheduledAt: string;
  receivedAt?: string | null;
  inspectedAt?: string | null;
  closedAt?: string | null;
  finalSettlementAmount?: number | null;
  notes?: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
  etag: string;
  /** Recordatorio previo (null mientras no se haya generado). */
  reminder?: ReturnReminder | null;
  /** Alertas operativas calculadas con el reloj; solo en GET /returns/{id} y GET /returns (los comandos la omiten). */
  alerts?: ReturnAlerts;
  /** Retraso informativo; solo en GET /returns y GET /returns/{id}. null si no aplica. */
  lateness?: ReturnLateness | null;
  /** Fuente de verdad de danos y cargos de paralizacion del expediente. */
  damages: ReturnDamageResponse[];
  immobilizationCharges: ImmobilizationChargeResponse[];
}

export type ReturnEvidenceType = 'PHOTO' | 'VIDEO';
export type ReturnEvidenceContentType = 'image/jpeg' | 'image/webp' | 'video/mp4' | 'video/webm';

export interface ReturnEvidenceUploadSession {
  uploadUrl: string;
  objectUrl: string;
  expiresAt: string;
}

export interface ReturnEvidenceResponse {
  id: string;
  returnId: string;
  type: ReturnEvidenceType;
  zone: string;
  objectUrl: string;
  createdAt: string;
}

export interface ListReturnsOptions {
  status?: ReturnStatus;
  limit?: number;
  cursor?: { createdAt: string; id: string };
}

export interface ReceiveProvisionalInput {
  mileageAtReturn: number;
  fuelLevelAtReturn: ReturnFuelLevel;
  customerPresent: boolean;
  notes?: string;
}

export interface CompleteInspectionInput {
  hasDamages: boolean;
  damagesDescription?: string;
  notes?: string;
  /** Obligatorio (BR-DEV-009): sin el, el backend responde 422 MISSING_RESPONSIBILITY_DOCUMENT. */
  responsibilityDocument: ResponsibilityDocumentInput;
}

export interface ResolveAlcoholEscalationInput {
  decision: AlcoholEscalationDecision;
  markCustomerRed: boolean;
  notes: string;
}

export interface AssessDamageInput {
  origin: DamageOrigin;
  severity: DamageSeverity;
  damagedZone?: string;
  estimatedAmount?: number;
  externalReportReference?: string;
  description?: string;
  /** Pregunta "¿El cliente acepta el costo?" - afecta el semaforo del cliente (LEVE/MODERADO). */
  customerAcceptsCost?: boolean;
}

export interface CosmeticTariffItem {
  code: string;
  name: string;
  pricePen: number;
}
