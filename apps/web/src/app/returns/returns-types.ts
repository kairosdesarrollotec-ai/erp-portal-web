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
