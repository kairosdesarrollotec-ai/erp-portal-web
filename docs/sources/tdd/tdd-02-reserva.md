# TDD — 02 Reserva

# Technical Design Document — Reserva

**Código:** TDD-KAIROS-MVP-002 / RES **Versión:** 2.2 — 03 sep 2026: resuelto el hallazgo P0-03 (tratamiento financiero de la garantía, ya implementable), precisado el mecanismo de no-show (decisión humana, no job automático) **Estado:** Completo en contenido, pendiente de revisión formal **Entradas:** `BDD-RES-001` (v1.9), `SDD-RES-001` (v2.2) **Dominio:** Reserva **Propietario técnico:** **Eder Ramos (Tech Lead)**, confirmado 02 sep 2026 — corregido 03 sep 2026, este documento seguía sin reflejarlo **Revisores:** Arquitectura, Backend, Frontend, Datos, Seguridad, QA **Fecha:** 31 de agosto de 2026

> ⚠️ **Corrección importante respecto al documento consolidado v1.0:** las secciones de Reserva describían un estado `PENDING_PAYMENT` con "bloqueo provisional creado (RES-P06.1)" y un estado `EXPIRED` para cuando ese bloqueo vencía sin pago. **Esa propuesta (**`RES-P06.1`**) se agregó al BDD el 27 de agosto por la mañana y se retiró esa misma tarde** — Fiorella confirmó explícitamente que no existe ningún bloqueo previo al pago: el vehículo permanece disponible para cualquier otro cliente hasta que pago y documentos/contrato estén **ambos** completos, momento en el que se bloquea de forma atómica. El 31 de agosto esto se reafirmó al cerrar OQ-RES-105 (sin flexibilidad de fecha, regla tajante). Este documento corrige el modelo de estados, la tabla física, la transacción y el contrato HTTP para reflejar el bloqueo atómico único — no el bloqueo provisional del documento consolidado anterior.

> Depende de `TDD-KAIROS-TRANSVERSAL.md` para stack técnico, estructura de repositorio, convenciones de dominio, seguridad técnica, infraestructura, CI/CD, runbooks, DoD y criterios de aprobación.

---

## 1. Control y autoridad

Ver `TDD-KAIROS-TRANSVERSAL.md`, secciones 1.2-1.3.

### 1.1 Documentos relacionados

| Documento | Relación |
| --- | --- |
| `BDD-RES-001` (v1.9) | Fuente funcional autoritativa |
| `SDD-RES-001` | Fuente arquitectónica |
| `TDD-KAIROS-TRANSVERSAL.md` | Base técnica común — tabla `vehicle_commitments` (sección 7.4) |
| `TDD-CON-001` | Módulo del que Reserva recibe la conversión |
| `TDD-ALQ-001` | Módulo hacia el que Reserva se convierte |
| `Ejemplo-TDD-Reserva-Vehiculo-KAIROS.md` | Plantilla de referencia — este documento se aparta deliberadamente de su modelo de `ReservationVersion`/`ReservationChange` (reprogramación), porque BR-RES-003 confirma que esa operación no existe en VeloxRent |

---

## 2. Objetivo técnico y alcance

Implementar creación, confirmación (bloqueo atómico), cancelación por cambio solicitado, resolución de venta de vehículo reservado y conversión a alquiler, garantizando:

- cero doble confirmación del mismo vehículo e intervalo;
- **el bloqueo del vehículo ocurre en un único paso, solo cuando pago y documentos están ambos completos — nunca antes**;
- transiciones únicamente mediante comandos;
- idempotencia de escrituras críticas;
- ausencia deliberada de cualquier operación de "reprogramar" (BR-RES-003).

### 2.1 Incluido

- Backend y frontend del flujo Reserva.
- Persistencia de reservas, aceptaciones remotas y resoluciones de venta.
- Integración interna con Customers, Inquiries, Fleet, Payments y Evidence.
- OpenAPI de operaciones críticas.
- Eventos de dominio/integración.

### 2.2 Fuera de alcance

- Cualquier forma de bloqueo previo al pago+documentos completos (descartado, ver nota de corrección arriba).
- Reprogramación como operación de dominio (BR-RES-003).
- Firma digital legal de la aceptación remota.

---

## 3. Decisiones técnicas específicas

Ninguna decisión técnica propia más allá de las transversales — Reserva usa el mismo stack (`TDD-KAIROS-TRANSVERSAL.md`, sección 3).

---

## 4. Requisitos trazados

| BDD | SDD | Realización TDD |
| --- | --- | --- |
| REQ-RES-001 (confirmar, bloqueo atómico) | UC-RES-002 | `ConfirmReservationHandler` |
| REQ-RES-002 (cancelar por cambio) | UC-RES-003 | `CancelReservationHandler` |
| REQ-RES-003 (resolver venta) | UC-RES-004 | `ResolveSaleHandler` |
| REQ-RES-004 (convertir) | UC-RES-005 | `ConvertReservationHandler` |
| BR-RES-009/DR-RES-001 (no solapamiento) | Fleet/DB | `vehicle_commitments` exclusion |
| NFR-KAI-001 | Fleet/DB | Prueba concurrente obligatoria |

---

## 5-6. Arquitectura y estructura

Reserva usa la arquitectura de ejecución y estructura de repositorio transversales, bajo `apps/api/src/modules/reservations/`.

---

## 7. Modelo de dominio

### 7.1 Agregado Reservation

| Elemento | Responsabilidad |
| --- | --- |
| Reservation | Autoriza transiciones; conserva el resultado vigente. **No conserva versiones históricas de condiciones** — no hay reprogramación que versionar |
| ReservationAcceptance | Evidencia de aceptación remota (solo modalidad virtual, BR-RES-006) |
| ReservationResolution | Registra la decisión del cliente ante venta del vehículo (BR-RES-007) |

### 7.2 Value objects

- `ReservationId`, `CustomerId`, `VehicleId` (ver convenciones transversales).
- `DateTimeRange` `[start, end)`.
- `Money(amount, currency)` — monto de reserva como parámetro versionado (BR-RES-001), no constante de código.
- `ChannelMode`: `PRESENCIAL | VIRTUAL`.
- `ReservationStatus`.

### 7.3 Invariantes

1. `startAt < endAt`.
2. **No existe operación de "reprogramar"** — cualquier cambio de fecha, hora o vehículo se resuelve como cancelación de la reserva vigente, nunca como edición (BR-RES-003, confirmado 27 y 31 ago). A diferencia del ejemplo de referencia (que sí modela `ReservationChange` como reprogramación con penalidad), este dominio deliberadamente **no expone ningún comando de edición de fecha/vehículo**.
3. La reserva nunca pasa por notaría, bajo ninguna circunstancia (BR-RES-004).
4. Modalidad remota exige `ReservationAcceptance` validada antes de confirmar (BR-RES-006).
5. **El vehículo no se bloquea hasta que pago y documentos/contrato estén ambos completos** (BR-RES-009, corregido 27 ago) — no existe un estado intermedio de "apartado" ni un `vehicle_commitment` creado antes de ese punto.
6. La única compensación posible ante una reserva perdida por no-show o cambio solicitado es informal y **fuera del agregado Reservation** (kilometraje adicional en un alquiler posterior, a discreción de Gerencia) — no se modela como parte de este dominio.

---

## 8. Máquina de estados

### 8.1 Estados

> ⚠️ Corregido 31 ago: se elimina `PENDING_PAYMENT` como estado con bloqueo, y se elimina `EXPIRED` (no hay bloqueo que expire). Se simplifica a 5 estados reales.

| Estado | Significado | Terminal |
| --- | --- | --- |
| `DRAFT` | Captura iniciada desde Consulta; datos de pago/documentos pueden estar parcialmente completos, **sin ningún efecto sobre la disponibilidad del vehículo** | No |
| `CONFIRMED` | Pago validado y documentos/contrato completos **a la vez** — el vehículo queda bloqueado en esta misma transición (bloqueo atómico) | No |
| `PENDING_SALE_RESOLUTION` | Vehículo vendido, esperando decisión del cliente (BR-RES-007) | No |
| `CONVERTED` | Originó un alquiler | Sí |
| `CANCELLED` | Cancelada (incluye todo cambio de fecha/hora/vehículo, BR-RES-003; y no-show, ver EX-RES-004 del BDD — transición disparada por decisión de Gerencia, no por job automático, ver `SDD-RES-001` sección 27.1, precisado 03 sep 2026) | Sí |

### 8.2 Transiciones

| Desde | Comando | Hacia | Guards | Side effects |
| --- | --- | --- | --- | --- |
| — | create | `DRAFT` | Viene de una `Inquiry` convertida (BR-CON-001) | Auditoría |
| `DRAFT` | confirm | `CONFIRMED` | Pago del monto vigente validado (BR-RES-001) **y** documentos/contrato completos, **ambos en la misma verificación** — si falta cualquiera de los dos, el comando se rechaza y el vehículo sigue disponible | Evento `ReservaConfirmada`; crea `vehicle_commitment` directamente en `CONSOLIDATED` |
| `DRAFT` | cancel | `CANCELLED` | Cliente decide no continuar antes de completar ambos requisitos | Sin efecto sobre disponibilidad — nunca hubo bloqueo |
| `CONFIRMED` | cancel | `CANCELLED` | Cualquier solicitud de cambio de fecha/hora/vehículo (BR-RES-003), o no-show del cliente **(acción explícita de un usuario con rol Gerencia tras agotar el protocolo de contacto — no un cron/job, precisado 03 sep 2026)** | Monto de reserva perdido; libera `vehicle_commitment` |
| `CONFIRMED` | flag-sale | `PENDING_SALE_RESOLUTION` | Gerencia notifica venta (BR-RES-007) | — |
| `PENDING_SALE_RESOLUTION` | resolve-sale | `CANCELLED` / `CONFIRMED` | Cliente rechaza → cancela con reembolso; acepta → reserva reformulada sobre alternativa | Evento `ReservaCancelada` / `ReservaReformulada` |
| `CONFIRMED` | convert | `CONVERTED` | Revalidación de cliente, documentos, pago y vehículo | Crea `Rental`; **el monto de reserva se traslada íntegro a la garantía del alquiler (resuelto 03 sep 2026, cierra hallazgo P0-03 — ver **`SDD-RES-001`** sección Consistencia de UC-RES-005 y **`BDD-RES-001`** BR-RES-002)** |

### 8.3 Implementación

No se expone `PATCH status` ni ningún comando `reschedule`/`update`. Cada transición es un método del agregado `Reservation` invocado por un command handler dedicado. La persistencia usa optimistic locking mediante `version`.

---

## 9. Modelo físico PostgreSQL

> Reutiliza las tablas transversales de `TDD-KAIROS-TRANSVERSAL.md` sección 7 (`idempotency_keys`, `outbox_events`, `audit_events`, `vehicle_commitments`).

### 9.1 Tipos

```
CREATE TYPE reservation_status AS ENUM (
  'DRAFT','CONFIRMED','PENDING_SALE_RESOLUTION','CONVERTED','CANCELLED'
);
```

> ⚠️ Corregido 31 ago: se retiran `PENDING_PAYMENT` y `EXPIRED` del enum del documento consolidado — no corresponden al modelo confirmado.

### 9.2 Tabla reservations

```sql
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  operating_company_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  inquiry_id uuid NOT NULL REFERENCES inquiries(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  status reservation_status NOT NULL DEFAULT 'DRAFT',
  channel_mode varchar(10) NOT NULL,  -- 'PRESENCIAL' | 'VIRTUAL'
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  required_payment_amount numeric(12,2) NOT NULL,   -- derivado de política versionada, BR-RES-001
  currency char(3) NOT NULL,
  payment_policy_version integer NOT NULL,
  payment_validated_at timestamptz NULL,
  documents_completed_at timestamptz NULL,
  confirmed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT reservation_period_valid CHECK (start_at < end_at),
  CONSTRAINT reservation_amount_positive CHECK (required_payment_amount >= 0),
  CONSTRAINT reservation_confirmed_needs_both CHECK (
    status != 'CONFIRMED' OR (payment_validated_at IS NOT NULL AND documents_completed_at IS NOT NULL)
  )
);
```

`payment_validated_at` y `documents_completed_at` reemplazan a `hold_expires_at` del documento consolidado — ya no hay un plazo de bloqueo que vencer, sino dos marcas de tiempo que deben estar **ambas** presentes antes de que `status` pueda ser `CONFIRMED`. El constraint `reservation_confirmed_needs_both` es la implementación física directa de BR-RES-009.

### 9.3 Aceptaciones y resoluciones

```sql
CREATE TABLE reservation_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  evidence_id uuid NOT NULL REFERENCES evidence(id),   -- video 360°
  terms_version varchar(50) NOT NULL,
  accepted_by_customer_id uuid NOT NULL REFERENCES customers(id),
  accepted_at timestamptz NULL,
  recorded_by uuid NOT NULL
  -- validado en aplicación: solo existe fila si reservations.channel_mode = 'VIRTUAL'
);

CREATE TABLE reservation_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  reason varchar(30) NOT NULL DEFAULT 'VEHICLE_SOLD',
  customer_decision varchar(20) NOT NULL,  -- 'ACCEPTED' | 'REJECTED'
  alternative_vehicle_id uuid NULL REFERENCES vehicles(id),
  refund_id uuid NULL REFERENCES payments(id),
  resolved_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservation_resolution_decision CHECK (customer_decision IN ('ACCEPTED','REJECTED'))
);
```

A diferencia del ejemplo de referencia, **no existe **`reservation_versions`** ni **`reservation_changes` — BR-RES-003 elimina esa necesidad de diseño; cualquier cambio se registra directamente como una nueva fila en `audit_events` con `action = 'RESERVATION_CANCELLED_FOR_CHANGE'`.

### 9.4 Índices

```
CREATE INDEX reservations_company_status_idx
  ON reservations (operating_company_id, status, created_at DESC);
CREATE INDEX reservations_customer_idx
  ON reservations (customer_id, created_at DESC);
```

---

## 10. Transacciones y concurrencia

### 10.1 Confirmar reserva (bloqueo atómico) — corregida 31 ago

```
BEGIN
  validar actor y scope
  cargar reservation FOR UPDATE, verificar versión
  verificar pago validado por el monto vigente (payment_validated_at)
  verificar documentos/contrato completos (documents_completed_at)
  IF falta cualquiera de los dos:
    ROLLBACK, devolver 422 con el requisito faltante — el vehículo permanece disponible
  ELSE:
    IF channel_mode = 'VIRTUAL': verificar reservation_acceptances con accepted_at IS NOT NULL
    insertar vehicle_commitment directamente en estado CONSOLIDATED (tabla transversal, sección 7.4 de TDD-KAIROS-TRANSVERSAL.md)
    -- la exclusión de rango (EXCLUDE USING gist) determina el ganador si hay conflicto concurrente
    IF conflicto de exclusión:
      ROLLBACK, devolver 409 VEHICLE_NOT_AVAILABLE
    ELSE:
      transicionar reservation → CONFIRMED
      insertar audit_event
      insertar outbox_event ReservaConfirmada
COMMIT
```

Esta transacción reemplaza a la del documento consolidado ("crear reserva con bloqueo provisional" + "confirmar" como dos pasos separados) — ahora es **una sola transacción con un único resultado posible**: confirmada con bloqueo consolidado, o rechazada sin ningún efecto sobre `vehicle_commitments`.

### 10.2 Cancelar por cambio solicitado (BR-RES-003)

```
BEGIN
  cargar reservation FOR UPDATE
  transicionar reservation → CANCELLED
  IF existe vehicle_commitment vinculado (solo si estaba CONFIRMED):
    actualizar vehicle_commitment.status → RELEASED
  insertar audit_event (action = RESERVATION_CANCELLED_FOR_CHANGE, reason = motivo del cliente)
  insertar outbox_event ReservaCancelada
COMMIT
```

No existe una transacción de "editar reserva" — cualquier intento de cambio de fecha, hora o vehículo ejecuta esta misma transacción de cancelación, nunca un `UPDATE` sobre `start_at`/`end_at`/`vehicle_id`.

### 10.3 Deadlocks

Orden de adquisición: `Reservation` → `Vehicle Commitment`. Reintentar transacciones abortadas por serialización máximo dos veces con jitter; después responder conflicto recuperable.

### 10.4 Optimistic locking

Todo comando mutable exige `If-Match: "<version>"`. Versión distinta devuelve `412 RESERVATION_VERSION_CONFLICT`.

---

## 11. Contrato HTTP

> Convenciones generales viven en `TDD-KAIROS-TRANSVERSAL.md`.

### 11.1 Crear reserva (borrador)

```
POST /api/v1/reservations
Idempotency-Key: 018f...
```

```json
{
  "inquiryId": "uuid",
  "customerId": "uuid",
  "vehicleId": "uuid",
  "branchId": "uuid",
  "startAt": "2026-09-01T14:00:00-05:00",
  "endAt": "2026-09-03T14:00:00-05:00",
  "channelMode": "VIRTUAL"
}
```

Respuesta `201`:

```json
{
  "id": "uuid",
  "status": "DRAFT",
  "version": 1,
  "requiredPayment": {"amount": "300.00", "currency": "PEN"},
  "missingRequirements": ["PAYMENT_VALIDATION", "DOCUMENTS_COMPLETE", "REMOTE_ACCEPTANCE"]
}
```

> ⚠️ Corregido 31 ago: ya no existe `holdExpiresAt` en la respuesta — no hay bloqueo que expire en este paso.

### 11.2 Registrar pago

```
POST /api/v1/reservations/{id}/commands/register-payment
Idempotency-Key: 018f...
If-Match: "1"
```

Solo marca `payment_validated_at` — **no crea ningún **`vehicle_commitment`.

### 11.3 Registrar documentos/contrato

```
POST /api/v1/reservations/{id}/commands/register-documents
Idempotency-Key: 018f...
If-Match: "1"
```

Solo marca `documents_completed_at` — **no crea ningún **`vehicle_commitment`.

### 11.4 Confirmar (bloqueo atómico)

```
POST /api/v1/reservations/{id}/commands/confirm
Idempotency-Key: 018f...
If-Match: "1"
```

Respuesta `200` si ambos requisitos están completos:

```json
{
  "id": "uuid",
  "status": "CONFIRMED",
  "version": 2,
  "vehicleCommitmentId": "uuid"
}
```

Error si falta un requisito:

```json
{
  "type": "https://erp.kairos.pe/problems/business-rule",
  "title": "No se puede confirmar la reserva",
  "status": 422,
  "code": "REQUIREMENTS_INCOMPLETE",
  "detail": "Falta completar: documentos/contrato",
  "correlationId": "uuid",
  "missingRequirements": ["DOCUMENTS_COMPLETE"]
}
```

Error si el vehículo ya no está disponible (conflicto de concurrencia):

```json
{
  "type": "https://erp.kairos.pe/problems/business-rule",
  "title": "El vehículo ya no está disponible",
  "status": 409,
  "code": "VEHICLE_NOT_AVAILABLE",
  "correlationId": "uuid"
}
```

### 11.5 Cancelar por cambio solicitado

```
POST /api/v1/reservations/{id}/commands/cancel
Idempotency-Key: 018f...
If-Match: "2"
```

```json
{
  "reason": "CUSTOMER_REQUESTED_CHANGE",
  "note": "Cliente solicita cambiar la fecha de recojo"
}
```

No existe `PATCH /reservations/{id}` ni comando `reschedule` — deliberadamente, por BR-RES-003.

### 11.6 Convertir a alquiler

```
POST /api/v1/reservations/{id}/commands/convert
Idempotency-Key: 018f...
If-Match: "3"
```

Respuesta `201` con el `rentalId` nuevo — ✅ **resuelto 03 sep 2026 (cierra hallazgo P0-03):** el tratamiento financiero del monto de reserva ya no es `PENDIENTE_NEGOCIO` — José y Fiorella confirmaron por separado que se traslada íntegro a la garantía del alquiler. `ConvertReservationHandler` puede implementarlo como comportamiento definitivo. BR-RES-002 (BDD) ya refleja esta confirmación — ver SDD-RES-001 para el detalle.

---

## 12. Servicios de aplicación

| Handler | Comando | Responsabilidad |
| --- | --- | --- |
| `CreateReservationHandler` | create | Crear `Reservation` en `DRAFT` |
| `RegisterPaymentHandler` | register-payment | Marcar `payment_validated_at`, sin efecto en disponibilidad |
| `RegisterDocumentsHandler` | register-documents | Marcar `documents_completed_at`, sin efecto en disponibilidad |
| `ConfirmReservationHandler` | confirm | Verificar ambos requisitos, crear `vehicle_commitment` y confirmar, todo en una transacción (sección 10.1) |
| `CancelReservationHandler` | cancel | Cancelar y liberar `vehicle_commitment` si existía |
| `ResolveSaleHandler` | resolve-sale | Registrar decisión del cliente ante venta |
| `ConvertReservationHandler` | convert | Crear `Rental`, transicionar a `CONVERTED` |

---

## 13. Puertos internos

| Puerto | Dirección | Uso |
| --- | --- | --- |
| `FleetCommitmentPort` | Reservations → Fleet | Solicitar el `vehicle_commitment` atómico al confirmar |
| `PaymentVerificationPort` | Reservations → Payments | Validar el monto pagado contra la política vigente |
| `AcceptanceValidationPort` | Reservations → Evidence | Verificar evidencia y aceptación remota completas |

---

### Bug 3 — Documentos de reserva vía GCS (2026-10-03)

**Nuevos puertos de aplicación:**
```typescript
// ReservationDocumentStoragePort
interface ReservationDocumentStoragePort {
  generateUploadUrl(reservationId: string, fileName: string): Promise<{ uploadUrl: string; objectPath: string }>;
}

// ReservationDocumentRepositoryPort
interface ReservationDocumentRepositoryPort {
  save(doc: ReservationDocument): Promise<ReservationDocument>;
  listByReservationId(reservationId: string): Promise<ReservationDocument[]>;
}
```

**Nuevos endpoints (ReservationDocumentsController):**
- `POST /reservations/:id/documents/upload-url` → `GenerateReservationDocumentUploadUrlHandler`
- `POST /reservations/:id/documents` → `SaveReservationDocumentHandler`
- `GET /reservations/:id/documents` → `ListReservationDocumentsHandler`

**DDL (migración forward-safe):**
```sql
CREATE TABLE reservation_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  object_url TEXT NOT NULL,
  document_type VARCHAR(50) NOT NULL DEFAULT 'DOCUMENT',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Prefijo GCS:** `reservation-documents/{reservationId}/`
**Validación:** `objectUrl` debe comenzar con `https://storage.googleapis.com/{GCS_BUCKET_NAME}/reservation-documents/`.
**Estrategia de test:** integración contra bucket GCS con credenciales de test; stub en unit tests.

---

## 14. Eventos

| Evento | Productor | Consumidores | Payload mínimo |
| --- | --- | --- | --- |
| `ReservaConfirmada.v1` | Reservations | Fleet, Payments, Notifications, Audit, Reporting | `reservationId`, `vehicleCommitmentId` |
| `ReservaCancelada.v1` | Reservations | Fleet, Payments, Notifications | `reservationId`, `reason` |
| `ReservaReformulada.v1` | Reservations | Notifications, Reporting | `reservationId`, `alternativeVehicleId` |
| `ReservaConvertida.v1` | Reservations | Rentals, Audit, Reporting | `reservationId`, `rentalId` |

---

## 15. Idempotencia

Ver algoritmo transversal. Aplica especialmente a `confirm` — un reintento del mismo `Idempotency-Key` nunca debe crear un segundo `vehicle_commitment`.

---

## 16. Autenticación y autorización

| Claim | Uso en Reserva |
| --- | --- |
| `permissions` | `reservation:create`, `payment:register`, `reservation:cancel`, `refund:process` |
| `companyScope` | Filtra qué reservas puede leer/gestionar el actor |

---

## 17. Auditoría

`confirm`, `cancel`, `resolve-sale` y `convert` generan `audit_events` obligatorios (comandos financieros o que afectan disponibilidad).

---

## 18. Frontend

Feature `apps/web/src/features/reservations/` — modalidad → vehículo/video 360° → datos → aceptación de políticas → pago → documentos → **botón "Confirmar" habilitado solo cuando ambos requisitos están completos** (refuerzo de UX para el bloqueo atómico, evita que el personal piense que hay un paso intermedio de "apartar").

---

## 19. Evidencia remota

Reutiliza el patrón de carga directa (ADR-KAI-005) para el video 360° — ver `TDD-KAIROS-TRANSVERSAL.md` para los controles generales de carga.

---

## 20. NFR y presupuesto técnico

| ID | Objetivo | Táctica |
| --- | --- | --- |
| NFR-RES-001 | 0 dobles confirmaciones del mismo vehículo/intervalo | Exclusión transaccional en `vehicle_commitments` (sección 10.1) |

---

## 21. Observabilidad

Señal específica: "confirmaciones rechazadas por requisito incompleto" — distingue de "conflictos de disponibilidad" para separar fricción de UX de concurrencia real.

---

## 22. Manejo de fallos

| Fallo | Comportamiento |
| --- | --- |
| Payments no responde al confirmar | No se marca `payment_validated_at`; el comando `confirm` sigue rechazando por requisito incompleto |
| Fleet/DB no disponible al confirmar | Rollback completo, ningún estado parcial — nunca queda un pago validado sin bloqueo, ni un bloqueo sin confirmación |

---

## 23. Migraciones

`reservations` reemplaza los campos `hold_expires_at`/estado `PENDING_PAYMENT`/`EXPIRED` del esquema anterior por `payment_validated_at`/`documents_completed_at` — si existiera algún dato de una versión previa del esquema, la migración debe mapear cualquier fila `PENDING_PAYMENT` a `DRAFT` y cualquier `EXPIRED` a `CANCELLED` con `reason = 'LEGACY_HOLD_MODEL'`.

---

## 24. Testing

### 24.1 Casos obligatorios

- Confirmación exitosa presencial y remota (con ambos requisitos completos en cualquier orden: pago primero o documentos primero).
- Intento de confirmar con solo uno de los dos requisitos completo (`REQUIREMENTS_INCOMPLETE`).
- Conflicto de disponibilidad: dos usuarios completando ambos requisitos del mismo vehículo/intervalo casi simultáneamente (`VEHICLE_NOT_AVAILABLE`).
- Cliente solicita cambiar fecha/hora/vehículo antes o después de confirmar (cancelación con pérdida del monto, no reprogramación) — caso reforzado con el caso real del 31 ago (vehículo Chevrolet, no-show).
- Vehículo reservado se vende: cliente acepta alternativa vs. cliente rechaza.
- Conversión a alquiler en la fecha pactada.

---

## 25. Matriz de validaciones

| Campo/regla | Capa | Código | Test |
| --- | --- | --- | --- |
| `startAt < endAt` | API + dominio + DB | `INVALID_PERIOD` | TEST-RES-UNIT-001 |
| Ambos requisitos completos para confirmar | Application/DB (`reservation_confirmed_needs_both`) | `REQUIREMENTS_INCOMPLETE` | TEST-RES-UNIT-002 |
| No-solapamiento del vehículo | DB/dominio (`vehicle_commitments`) | `VEHICLE_NOT_AVAILABLE` | TEST-RES-INT-001, CONC-001 |
| Monto de reserva vigente | Application | `INVALID_DEPOSIT_AMOUNT` | TEST-RES-E2E-001 |
| Aceptación remota completa (solo `VIRTUAL`) | Application | `ACCEPTANCE_INCOMPLETE` | TEST-RES-E2E-002 |
| Ningún comando de reprogramación existe | Presentation (no expuesto) | — | Revisión de contrato OpenAPI |
| ETag vigente | Presentation/repository | `RESERVATION_VERSION_CONFLICT` | Contract |
| Scope empresarial | Authorization/repository | `FORBIDDEN_SCOPE` | TEST-RES-SEC-001 |
| Idempotency hash | Application/DB | `IDEMPOTENCY_KEY_REUSED` | TEST-RES-IDEM-001 |

---

## 26. Trazabilidad completa

| BDD requisito/regla | SDD caso/componente | TDD artefacto | API/evento | Test |
| --- | --- | --- | --- | --- |
| RES-P09/BR-RES-001 | UC-RES-002 / Reservations-Payments | `RegisterPaymentHandler` | register-payment | — |
| RES-P10/BR-RES-009 (corregido 31 ago) | UC-RES-002 / Reservations-Fleet | `ConfirmReservationHandler`, `vehicle_commitments` exclusion | confirm / `ReservaConfirmada` | TEST-RES-INT-001, CONC-001, TEST-RES-UNIT-002 |
| RES-P04/P08 / BR-RES-006 | UC-RES-002 / Evidence-Reservations | `reservation_acceptances` | — / evidencia validada | TEST-RES-E2E-002 |
| Excepción / BR-RES-003 (confirmado 31 ago, OQ-RES-105) | UC-RES-003 / Reservations-Payments | `CancelReservationHandler` | cancel / `ReservaCancelada` | TEST-RES-UNIT-004 |
| RES-P13-16 / BR-RES-007 | UC-RES-004 / Reservations-Payments | `reservation_resolutions` | resolve-sale | — |
| BR-RES-002 | UC-RES-005 / Reservations-Rentals | `ConvertReservationHandler` | convert / `ReservaConvertida` | Contract/E2E |

> 📌 Esta tabla también vive consolidada en `TDD-KAIROS-TRACEABILITY.md`.

---

## 27. Decisiones abiertas

Sin decisiones técnicas propias pendientes — OQ-RES-101 (duración del bloqueo provisional) queda **sin objeto**: al no existir bloqueo previo a la confirmación, no hay una duración que definir. Se retira de la lista de decisiones técnicas abiertas (estaba en el documento consolidado, ligada a `RES-P06.1`).

---

## 28. Definition of Done y criterios de aprobación

Ver `TDD-KAIROS-TRANSVERSAL.md`, secciones 13 y 15.

---

## 29. Checklist de calidad 9-10

| Dimensión | Sección | Estado |
| --- | --- | --- |
| Modelo de dominio | 7 | Cumple, corregido 31 ago |
| Máquina de estados | 8 | Cumple, corregido 31 ago (5 estados, no 7) |
| Modelo físico | 9 | Cumple, corregido 31 ago (sin `hold_expires_at`) |
| Transacciones/concurrencia | 10 | Cumple, corregido 31 ago (una sola transacción de confirmación) |
| Contrato HTTP | 11 | Cumple, corregido 31 ago (sin `holdExpiresAt`) |
| Eventos/idempotencia | 14-15 | Cumple |
| Testing | 24-25 | Cumple, con caso nuevo de "requisito incompleto" |
| Trazabilidad | 26 | Cumple BDD→SDD→TDD |
| Dependencia del documento transversal | Secciones 1, 5-6, 16-23 | Cumple |

**Evaluación:** completo en contenido para el alcance de Reserva, con la corrección estructural del 31 de agosto ya aplicada de punta a punta (modelo, transacción, contrato HTTP, trazabilidad). Pendiente de firmas formales.
