# TDD — 03 Alquiler

# Technical Design Document — Alquiler

**Código:** TDD-KAIROS-MVP-002 / ALQ **Versión:** 2.1 — dividido a partir de `TDD-KAIROS-Consolidado-Detallado.md` (v1.0), actualizado 02 sep 2026 (evidencia: 35 fotos + video de 3 a 16 min) **Estado:** Completo en contenido, pendiente de revisión formal **Entradas:** `BDD-ALQ-001`, `SDD-ALQ-001` **Dominio:** Alquiler **Propietario técnico:** Tech Lead — pendiente de asignar **Revisores:** Arquitectura, Backend, Frontend, Datos, Seguridad, QA **Fecha:** 31 de agosto de 2026

> Depende de `TDD-KAIROS-TRANSVERSAL.md` para stack técnico, estructura de repositorio, convenciones de dominio, seguridad técnica, infraestructura, CI/CD, runbooks, DoD y criterios de aprobación.

---

## 1. Control y autoridad

Ver `TDD-KAIROS-TRANSVERSAL.md`, secciones 1.2-1.3.

### 1.1 Documentos relacionados

| Documento | Relación |
| --- | --- |
| `BDD-ALQ-001` | Fuente funcional autoritativa |
| `SDD-ALQ-001` | Fuente arquitectónica |
| `TDD-KAIROS-TRANSVERSAL.md` | Base técnica común — tabla `vehicle_commitments` (sección 7.4) |
| `TDD-RES-001` | Módulo del que Alquiler recibe la conversión |
| `TDD-DEV-001` | Módulo hacia el que Alquiler cierra |

---

## 2. Objetivo técnico y alcance

Implementar validación de cliente, alcolímetro, evaluación notarial, formalización de contrato/garantía, entrega con evidencia obligatoria, y ampliaciones.

### 2.1 Incluido

- Backend y frontend del flujo Alquiler.
- Persistencia de alquileres, evaluación notarial, contrato, ampliaciones y garantía.
- Integración interna con Customers, Fleet, Payments, Inspections, Evidence.
- OpenAPI de operaciones críticas.

### 2.2 Fuera de alcance

- Firma digital legal (firma con huella hasta aprobación Legal).
- Evaluación notarial automatizada al 100% — casos `MANUAL_REVIEW` requieren aprobación humana.

---

## 3. Decisiones técnicas específicas

Ninguna decisión técnica propia más allá de las transversales.

---

## 4. Requisitos trazados

| BDD | SDD | Realización TDD |
| --- | --- | --- |
| ALQ-P01-03 / BR-CON-004 | UC-ALQ-001 | `ValidateDocumentsHandler` |
| ALQ-P04 / BR-ALQ-005 | UC-ALQ-002 | `RegisterAlcoholTestHandler` |
| ALQ-P08 / BR-ALQ-003/004 | UC-ALQ-003 | `EvaluateNotaryHandler` |
| ALQ-P05-06 / BR-DOC-002/003 | UC-ALQ-004 | `FormalizeContractHandler` |
| ALQ-P07,09-11 / BR-INS-001/002/003/004 | UC-ALQ-005 | `CompleteDeliveryHandler` |
| ALQ-P12-15 / BR-ALQ-012/013 | UC-ALQ-006 | `RequestExtensionHandler`/`AuthorizeExtensionHandler` |

---

## 5-6. Arquitectura y estructura

Alquiler usa la arquitectura de ejecución y estructura de repositorio transversales, bajo `apps/api/src/modules/rentals/`.

---

## 7. Modelo de dominio

### 7.1 Agregado Rental

| Elemento | Responsabilidad |
| --- | --- |
| Rental | Autoriza transiciones del alquiler; conserva el resultado notarial vigente |
| RentalParty | Identifica firmante, conductor y responsable cuando son personas distintas (BR-ALQ-015) |
| Contract | Snapshot inmutable de la plantilla firmada (BR-DOC-002/003) |
| NotaryEvaluation | Resultado de la política notarial versionada (BR-ALQ-003/004) |
| Extension | Propuesta y resolución de una ampliación (BR-ALQ-012/013) |
| Deposit | Garantía asociada al alquiler, con sus ajustes |

### 7.2 Value objects

- `RentalId`, `CustomerId`, `VehicleId` (ver convenciones transversales).
- `Money(amount, currency)`.
- `NotaryResult`: `MANDATORY | DOUBLE_DEPOSIT | THIRD_PATH_ELIGIBLE | MANUAL_REVIEW`.
- `AlcoholTestResult`: `FAVORABLE | DESFAVORABLE | RECHAZADO` — rechazar la prueba se trata como `DESFAVORABLE` (BR-ALQ-005).

### 7.3 Invariantes

1. No se entrega el vehículo sin checklist de salida completo (35 fotos + 3 videos, BR-INS-003/004).
2. No se confirma la entrega con resultado de alcolímetro desfavorable (BR-ALQ-005).
3. Un vehículo de la lista prohibida (Hilux, Colorado, Verna, Yaris) siempre resuelve `MANDATORY` — ninguna combinación de cliente/biométrico lo puede evitar (BR-ALQ-003).
4. El trámite notarial nunca genera un `payment` con `source = CUSTOMER` (BR-ALQ-002) — es un costo interno de VeloxRent.
5. Una ampliación no puede exceder 3 días consecutivos (1 si es por horas) sin nuevo contrato (BR-ALQ-012).
6. Estados terminales (`CLOSED`) no reciben nuevos comandos salvo operación administrativa auditada.

---

## 8. Máquina de estados

### 8.1 Estados

| Estado | Significado | Terminal |
| --- | --- | --- |
| `DRAFT` | Captura iniciada, cliente y vehículo identificados | No |
| `VALIDATION` | Documentos y alcolímetro en verificación | No |
| `NOTARY_EVALUATION` | Resultado notarial siendo determinado | No |
| `CONTRACTING` | Contrato y garantía en formalización | No |
| `PENDING_DELIVERY` | Contrato firmado, checklist de salida pendiente | No |
| `ACTIVE` | Vehículo entregado, alquiler en curso | No |
| `EXTENSION_PENDING` | Ampliación solicitada, esperando autorización | No |
| `RETURN_IN_PROGRESS` | Devolución iniciada (ver `TDD-DEV-001`) | No |
| `CLOSED` | Expediente archivado | Sí |
| `CANCELLED` | Cancelado antes de la entrega (documentos o alcolímetro desfavorable) | Sí |

### 8.2 Transiciones

| Desde | Comando | Hacia | Guards | Side effects |
| --- | --- | --- | --- | --- |
| — | create | `DRAFT` | Actor, cliente, vehículo válidos | Auditoría |
| `DRAFT` | validate-documents | `VALIDATION` | Documentos completos según nacionalidad (BR-CON-004) | — |
| `VALIDATION` | register-alcohol-test | `NOTARY_EVALUATION` / `CANCELLED` | Favorable → continúa; desfavorable → cancela (BR-ALQ-005) | Auditoría |
| `NOTARY_EVALUATION` | evaluate-notary | `CONTRACTING` | Resultado determinado por política versionada (BR-ALQ-003/004) | Evento `ExcepcionNotarialAprobada` si aplica excepción |
| `CONTRACTING` | formalize-contract | `PENDING_DELIVERY` | Plantilla vigente, garantía registrada (BR-DOC-003) | Eventos `ContratoFirmado`, `PagoRegistrado` |
| `PENDING_DELIVERY` | complete-delivery | `ACTIVE` | Checklist completo (35 fotos + 3 videos) | Evento `EntregaCompletada` |
| `ACTIVE` | request-extension | `EXTENSION_PENDING` | Aviso con 12h de anticipación (BR-ALQ-012) | — |
| `EXTENSION_PENDING` | authorize-extension | `ACTIVE` | Disponibilidad confirmada | — |
| `EXTENSION_PENDING` | reject-extension | `ACTIVE` | — | Si el cliente no cumple y retiene el vehículo → falta grave (BR-ALQ-013) |
| `ACTIVE` | start-return | `RETURN_IN_PROGRESS` | — | Crea el agregado `Return` (`TDD-DEV-001`) |
| `RETURN_IN_PROGRESS` | close | `CLOSED` | Return en estado `CERRADA` | — |

### 8.3 Implementación

No se expone `PATCH status`. Cada transición es un método del agregado `Rental`, con optimistic locking mediante `version`.

---

## 9. Modelo físico PostgreSQL

> Reutiliza las tablas transversales de `TDD-KAIROS-TRANSVERSAL.md` sección 7.

### 9.1 Tipos

```
CREATE TYPE rental_status AS ENUM (
  'DRAFT','VALIDATION','NOTARY_EVALUATION','CONTRACTING',
  'PENDING_DELIVERY','ACTIVE','EXTENSION_PENDING',
  'RETURN_IN_PROGRESS','CLOSED','CANCELLED'
);
CREATE TYPE alcohol_test_result AS ENUM ('FAVORABLE','DESFAVORABLE','RECHAZADO');
CREATE TYPE notary_result AS ENUM ('MANDATORY','DOUBLE_DEPOSIT','THIRD_PATH_ELIGIBLE','MANUAL_REVIEW');
```

### 9.2 Tabla rentals

```sql
CREATE TABLE rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  operating_company_id uuid NOT NULL REFERENCES companies(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  inquiry_id uuid NULL REFERENCES inquiries(id),
  reservation_id uuid NULL REFERENCES reservations(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  plan_code varchar(30) NOT NULL,
  status rental_status NOT NULL DEFAULT 'DRAFT',
  start_at timestamptz NULL,
  expected_end_at timestamptz NULL,
  alcohol_test_result alcohol_test_result NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT rental_period_valid CHECK (
    expected_end_at IS NULL OR start_at IS NULL OR start_at < expected_end_at
  )
);

CREATE TABLE rental_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid NOT NULL REFERENCES rentals(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  role varchar(20) NOT NULL,  -- 'SIGNER' | 'DRIVER' | 'RESPONSIBLE'
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rental_party_role CHECK (role IN ('SIGNER','DRIVER','RESPONSIBLE'))
);
```

### 9.3 Notaría y contrato

```sql
CREATE TABLE notary_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid NOT NULL REFERENCES rentals(id),
  policy_version integer NOT NULL,
  result notary_result NOT NULL,
  reason varchar(500) NOT NULL,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid NULL,
  justification varchar(500) NULL,
  CONSTRAINT notary_exception_needs_approval CHECK (
    result != 'THIRD_PATH_ELIGIBLE' OR approved_by IS NOT NULL
  )
);

CREATE TABLE contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid NOT NULL REFERENCES rentals(id),
  template_version_id uuid NOT NULL REFERENCES contract_templates(id),
  document_id uuid NOT NULL REFERENCES evidence(id),
  status varchar(20) NOT NULL DEFAULT 'PENDING',
  signed_at timestamptz NULL,
  CONSTRAINT contract_status CHECK (status IN ('PENDING','SIGNED','VOID'))
);

CREATE TABLE contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  type varchar(30) NOT NULL,
  version integer NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz NULL,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT contract_template_unique_active UNIQUE (company_id, type, version)
);
```

`contract_template_unique_active` es la implementación física de **BR-DOC-002** (una sola versión vigente por documento contractual).

### 9.4 Ampliaciones y garantía

```sql
CREATE TABLE extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid NOT NULL REFERENCES rentals(id),
  requested_end_at timestamptz NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'PENDING',
  payment_id uuid NULL REFERENCES payments(id),
  addendum_document_id uuid NULL REFERENCES evidence(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  CONSTRAINT extension_status CHECK (status IN ('PENDING','AUTHORIZED','REJECTED','BREACH')),
  CONSTRAINT extension_max_days CHECK (
    requested_end_at - now() <= interval '3 days'
  )
);

CREATE TABLE deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid NOT NULL REFERENCES rentals(id),
  original_amount numeric(12,2) NOT NULL,
  currency char(3) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'HELD',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deposit_status CHECK (status IN ('HELD','RETURNED','RETAINED','PARTIALLY_RETAINED'))
);

CREATE TABLE deposit_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id uuid NOT NULL REFERENCES deposits(id),
  type varchar(20) NOT NULL,   -- 'DISCOUNT' | 'FULL_RETENTION' | 'RELEASE' | 'IMMOBILIZATION_CHARGE'
  amount numeric(12,2) NOT NULL,
  reason varchar(500) NOT NULL,
  authorized_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

> ⚠️ Actualizado 31 ago: se agrega `'IMMOBILIZATION_CHARGE'` como tipo de ajuste — es el registro físico del cargo por días de paralización de BR-DEV-011 (ver `TDD-DEV-001`, sección 9.3, `ImmobilizationCharge`), que se resuelve sobre este mismo `deposit` de Alquiler. Los importes originales son inmutables — todo ajuste se registra como una fila nueva, nunca como un `UPDATE` sobre `original_amount`.

### 9.5 Índices

```
CREATE INDEX rentals_company_status_idx
  ON rentals (operating_company_id, status, created_at DESC);
CREATE INDEX rentals_customer_idx
  ON rentals (customer_id, created_at DESC);
CREATE INDEX contract_templates_active_idx
  ON contract_templates (company_id, type)
  WHERE status = 'ACTIVE';
```

### 9.6 Retención y borrado

- Rentals y auditoría: no soft-delete operativo.
- Evidencia (35 fotos + 3 videos por expediente): lifecycle por categoría, política Legal pendiente.
- Ajustes de garantía: nunca se eliminan, solo se anexan.

---

## 10. Transacciones y concurrencia

### 10.1 Formalizar contrato y garantía (UC-ALQ-004)

```
BEGIN
  validar actor y scope
  cargar rental FOR UPDATE y verificar versión
  obtener plantilla vigente de contract_templates (status = ACTIVE)
  insertar contract PENDING
  insertar deposit HELD
  transicionar rental → CONTRACTING → PENDING_DELIVERY (tras firma)
  insertar audit_event
  insertar outbox_event ContratoFirmado, PagoRegistrado
COMMIT
```

### 10.2 Completar entrega (UC-ALQ-005)

1. Validar `Idempotency-Key`.
2. Abrir transacción.
3. Cargar `rental` `FOR UPDATE`, verificar versión.
4. Verificar checklist completo: 35 fotos + 3 videos validados en `evidence` (BR-INS-003/004).
5. Verificar `notary_evaluations` resuelto (no `NULL`).
6. Transicionar `rental` → `ACTIVE`.
7. Cambiar `vehicle_commitments.status` de `ACTIVE` a `CONSOLIDATED`.
8. Insertar auditoría y outbox (`EntregaCompletada`).
9. Commit.
10. Guardar respuesta idempotente.

### 10.3 Deadlocks

Orden de adquisición: `Rental` → `Return` (si existe) → `Deposit` → `Vehicle Commitment`. Reintentar transacciones abortadas por serialización máximo dos veces con jitter.

### 10.4 Optimistic locking

Todo comando mutable sobre `rentals` exige `If-Match: "<version>"`. Si la versión difiere, devuelve `412 RENTAL_VERSION_CONFLICT`.

---

## 11. Contrato HTTP

### 11.1 Evaluar notaría

```
POST /api/v1/rentals/{id}/notary-evaluations/commands/evaluate
Idempotency-Key: 018f...
If-Match: "2"
```

```json
{
  "result": "THIRD_PATH_ELIGIBLE",
  "policyVersion": 4,
  "missingRequirements": [],
  "requiresApproval": true,
  "approverRole": "notary:approve"
}
```

### 11.2 Aprobar excepción notarial

```
POST /api/v1/rentals/{id}/notary-evaluations/{evaluationId}/commands/approve-exception
Idempotency-Key: 018f...
```

```json
{
  "approvedBy": "uuid (permiso notary:approve — hoy solo Fiorella/José)",
  "justification": "Cliente con 3 alquileres previos, biométrico OK, vehículo de menor valor relativo"
}
```

### 11.3 Formalizar contrato

```
POST /api/v1/rentals/{id}/commands/formalize-contract
Idempotency-Key: 018f...
If-Match: "3"
```

```json
{
  "templateVersionId": "uuid",
  "depositAmount": {"amount": "1000.00", "currency": "PEN"}
}
```

### 11.4 Completar entrega

```
POST /api/v1/rentals/{id}/commands/complete-delivery
Idempotency-Key: 018f...
If-Match: "4"
```

Error relevante si falta evidencia:

```json
{
  "type": "https://erp.kairos.pe/problems/business-rule",
  "title": "No se puede completar la entrega",
  "status": 422,
  "code": "MISSING_REQUIRED_EVIDENCE",
  "detail": "Falta el video de instrucciones al cliente",
  "correlationId": "uuid",
  "violations": [{"field": "evidence", "rule": "BR-INS-003"}]
}
```

---

## 12. Servicios de aplicación

| Handler | Comando |
| --- | --- |
| `ValidateDocumentsHandler` | validate-documents |
| `RegisterAlcoholTestHandler` | register-alcohol-test |
| `EvaluateNotaryHandler` | evaluate-notary / approve-exception |
| `FormalizeContractHandler` | formalize-contract |
| `CompleteDeliveryHandler` | complete-delivery |
| `RequestExtensionHandler` / `AuthorizeExtensionHandler` | request-extension / authorize-extension |

---

## 13. Puertos internos

| Puerto | Dirección | Uso |
| --- | --- | --- |
| `CustomerEligibilityPort` | Rentals → Customers | Validar documentos y elegibilidad |
| `FleetRestrictionPort` | Rentals → Fleet | Consultar restricción notarial del vehículo |
| `PaymentRegistrationPort` | Rentals → Payments | Registrar pago y garantía |
| `InspectionPort` | Rentals → Inspections/Evidence | Ejecutar checklist de entrega |

---

### Bug 4 — Documentos de alquiler vía GCS (2026-10-03)

**Nuevos puertos de aplicación:**
```typescript
interface RentalDocumentStoragePort {
  generateUploadUrl(rentalId: string, fileName: string): Promise<{ uploadUrl: string; objectPath: string }>;
}
interface RentalDocumentRepositoryPort {
  save(doc: RentalDocument): Promise<RentalDocument>;
  listByRentalId(rentalId: string): Promise<RentalDocument[]>;
}
```

**Nuevos endpoints (RentalDocumentsController):**
- `POST /rentals/:id/documents/upload-url` → `GenerateRentalDocumentUploadUrlHandler`
- `POST /rentals/:id/documents` → `SaveRentalDocumentHandler`
- `GET /rentals/:id/documents` → `ListRentalDocumentsHandler`

**DDL:**
```sql
CREATE TABLE rental_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id UUID NOT NULL REFERENCES rentals(id),
  object_url TEXT NOT NULL,
  document_type VARCHAR(50) NOT NULL DEFAULT 'DOCUMENT',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Prefijo GCS:** `rental-documents/{rentalId}/`

### Bug 7 — signatureData en rental_contracts (2026-10-03)

**DDL (migración forward-safe):**
```sql
ALTER TABLE rental_contracts ADD COLUMN IF NOT EXISTS signature_data TEXT NULL;
```

**Cambios en comando:**
- `FormalizeContractCommand` gana campo `signatureData?: string`.
- Handler persiste en `rental_contracts.signature_data`.
- `RentalResponse` (y su DTO) no expone `signatureData` al frontend por defecto — solo se almacena internamente.

**Frontend:** `SignaturePad` en `apps/web/src/app/shared/SignaturePad.tsx` (canvas con touch/mouse support); `signatureData` (base64 PNG) enviado a `formalize-contract` vía `rentals.yaml` OpenAPI.

**Nota legal:** validez jurídica formal pendiente de revisión Legal (PROP-012).

### Bug 8 — depositMinimum en vehicles / vehicleDepositMinimum en rentals (2026-10-03)

**DDL (migración forward-safe):**
```sql
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS deposit_minimum DECIMAL(12,2) NULL;
```

**Prisma:** `depositMinimum Decimal? @db.Decimal(12,2)` en el modelo `Vehicle`.

**Propagación:**
- `rental-persistence.mapper.ts` → `vehicleDepositMinimum: row.vehicle.depositMinimum != null ? Number(row.vehicle.depositMinimum) : null`
- `RentalRecord.vehicleDepositMinimum: number | null`
- `RentalResponse.vehicleDepositMinimum: number | null`
- `rentals.yaml` OpenAPI: campo `vehicleDepositMinimum` en `RentalResponse` (nullable, no en `required`).
- `rentals.generated.ts`: `vehicleDepositMinimum?: number | null`
- `rentals-client.ts`: `vehicleDepositMinimum: number | null`

**Validación frontend:** `Stage3ContractScreen.tsx` — bloquea formalización si `paymentAmountNum < depositMinimum`.

**Tests relacionados:** `SC-FLT-011`, `SC-FLT-012`, `SC-ALQ-DEP-01`, `SC-ALQ-DEP-02`.

---

## 14. Eventos

| Evento | Productor | Consumidores |
| --- | --- | --- |
| `ExcepcionNotarialAprobada.v1` | Rentals | Audit, Reporting |
| `ContratoFirmado.v1` | Rentals | Notifications, Audit, Reporting |
| `PagoRegistrado.v1` | Payments | Rentals, Audit |
| `EntregaCompletada.v1` | Rentals | Notifications, Audit, Reporting |

---

## 15. Idempotencia

Ver algoritmo transversal. Aplica a los 6 comandos críticos de este módulo.

---

## 16. Autenticación y autorización

| Permiso | Uso |
| --- | --- |
| `rental:validate`, `rental:create`, `rental:deliver` | Ciclo principal |
| `notary:request`, `notary:approve` | Evaluación y excepción notarial — hoy solo Fiorella/José |
| `inspection:execute` | Checklist de entrega |

---

## 17. Auditoría

`evaluate-notary` (con excepción), `formalize-contract`, `complete-delivery` y `authorize-extension` generan `audit_events` obligatorios.

---

## 18. Frontend

Feature `apps/web/src/features/rentals/` — verificación de documentos → alcolímetro → resultado de notaría → contrato y pago → checklist de entrega (con carga de evidencia) → confirmación → ampliación opcional.

---

## 19. Evidencia remota

Reutiliza el patrón de carga directa (ADR-KAI-005) para las 35 fotos + 3 videos del checklist de entrega.

---

## 20. NFR y presupuesto técnico

| ID | Objetivo | Táctica |
| --- | --- | --- |
| NFR-BIZ-001/002 | 30 min técnico + 15 min documentario | Checklist digital con temporizador visible |
| NFR-BIZ-006/007 | 35 fotos + 3 videos de 3 a 16 min cada uno | Validación de conteo en el worker de evidencia |

---

## 21. Observabilidad

Señal específica: "evidencias rechazadas" (relacionada con THR-006, personal que marca checklist sin revisar).

---

## 22. Manejo de fallos

| Fallo | Comportamiento |
| --- | --- |
| RENIEC/MTC no responde | Expediente queda pendiente de validación, no bloquea todo el proceso |
| Storage no responde durante checklist | Mantener evidencia pendiente; no completar la entrega |

---

## 23. Migraciones

`rentals`, `notary_evaluations`, `contracts`, `contract_templates`, `extensions`, `deposits`, `deposit_adjustments` se crean en la primera migración del dominio Alquiler.

---

## 24. Testing

### 24.1 Casos obligatorios

- Contratación con notaría obligatoria (Hilux/Colorado/Verna/Yaris).
- Contratación por tercera vía (cliente antiguo + biométrico + vehículo de menor costo).
- Alcolímetro desfavorable en la entrega.
- Entrega bloqueada por evidencia incompleta (menos de 35 fotos o video fuera del rango de 3 a 16 min).
- Incumplimiento de los 4 requisitos de ampliación (falta grave, cliente rojo).

---

## 25. Matriz de validaciones

| Campo/regla | Capa | Código | Test |
| --- | --- | --- | --- |
| Documento válido según nacionalidad | API + dominio | `INVALID_DOCUMENT` | TEST-ALQ-UNIT-001 |
| Alcolímetro favorable para continuar | Dominio | `ALCOHOL_TEST_FAILED` | TEST-ALQ-E2E-001 |
| Vehículo prohibido → `MANDATORY` sin excepción | Dominio | `NOTARY_MANDATORY_VEHICLE` | TEST-ALQ-UNIT-002 |
| Tercera vía requiere aprobador con permiso | Application/Authorization | `FORBIDDEN` | TEST-ALQ-SEC-001 |
| Plantilla de contrato vigente (una sola activa) | DB (`contract_templates_active_idx`) | `TEMPLATE_NOT_ACTIVE` | TEST-ALQ-INT-001 |
| Checklist completo (35 fotos + 3 videos) | Application | `MISSING_REQUIRED_EVIDENCE` | TEST-ALQ-E2E-002 |
| Ampliación ≤ 3 días consecutivos | DB (`extension_max_days`) + dominio | `EXTENSION_LIMIT_REACHED` | TEST-ALQ-UNIT-003 |
| ETag vigente | Presentation/repository | `RENTAL_VERSION_CONFLICT` | Contract |
| Scope empresarial | Authorization/repository | `FORBIDDEN_SCOPE` | TEST-ALQ-SEC-002 |
| Idempotency hash | Application/DB | `IDEMPOTENCY_KEY_REUSED` | TEST-ALQ-IDEM-001 |

---

## 26. Trazabilidad completa

| BDD requisito/regla | SDD caso/componente | TDD artefacto | API/evento | Test |
| --- | --- | --- | --- | --- |
| ALQ-P01-03 / BR-CON-004 | UC-ALQ-001 / Customers | `ValidateDocumentsHandler` | validate-documents | TEST-ALQ-UNIT-001 |
| ALQ-P04 / BR-ALQ-005 | UC-ALQ-002 / Rentals | `RegisterAlcoholTestHandler` | register-alcohol-test | TEST-ALQ-E2E-001 |
| ALQ-P08 / BR-ALQ-003/004 | UC-ALQ-003 / Rentals-Fleet-Customers | `EvaluateNotaryHandler`, tabla `notary_evaluations` | evaluate / `ExcepcionNotarialAprobada` | TEST-ALQ-UNIT-002, TEST-ALQ-SEC-001 |
| ALQ-P05-06 / BR-DOC-002/003 | UC-ALQ-004 / Rentals-Payments | `FormalizeContractHandler`, `contract_templates_active_idx` | formalize-contract / `ContratoFirmado`, `PagoRegistrado` | TEST-ALQ-INT-001 |
| ALQ-P07,09-11 / BR-INS-001/002/003/004 | UC-ALQ-005 / Rentals-Inspections-Evidence | `CompleteDeliveryHandler` | complete-delivery / `EntregaCompletada` | TEST-ALQ-E2E-002 |
| ALQ-P12-15 / BR-ALQ-012/013 | UC-ALQ-006 / Rentals-Payments | `RequestExtensionHandler`, `extension_max_days` | request-extension / authorize-extension | TEST-ALQ-UNIT-003 |
| NFR-KAI-001 | Fleet | `vehicle_commitments` exclusion | — | CONC-001 (transversal) |
| BR-DOC-002 | — | `contract_templates_active_idx` | — | TEST-ALQ-INT-001 |
| BR-ALQ-002 | Payments | `payments.source != CUSTOMER` para tipo notarial | — | TEST-ALQ-UNIT-004 |

> 📌 Esta tabla también vive consolidada en `TDD-KAIROS-TRACEABILITY.md`.

---

## 27. Decisiones abiertas

Sin decisiones técnicas propias de Alquiler — ver `TDD-KAIROS-TRANSVERSAL.md`, sección 14.

---

## 28. Definition of Done y criterios de aprobación

Ver `TDD-KAIROS-TRANSVERSAL.md`, secciones 13 y 15.

---

## 29. Checklist de calidad 9-10

| Dimensión | Sección | Estado |
| --- | --- | --- |
| Modelo de dominio | 7 | Cumple |
| Máquina de estados | 8 | Cumple |
| Modelo físico | 9 | Cumple, incorpora `IMMOBILIZATION_CHARGE` (31 ago) |
| Transacciones/concurrencia | 10 | Cumple |
| Contrato HTTP | 11 | Cumple |
| Eventos/idempotencia | 14-15 | Cumple |
| Testing | 24-25 | Cumple |
| Trazabilidad | 26 | Cumple BDD→SDD→TDD |
| Dependencia del documento transversal | Secciones 1, 5-6, 16-23 | Cumple |

**Evaluación:** completo en contenido para el alcance de Alquiler. Pendiente de firmas formales.
