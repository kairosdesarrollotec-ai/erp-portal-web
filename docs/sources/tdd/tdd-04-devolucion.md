# TDD — 04 Devolución

# Technical Design Document — Devolución

**Código:** TDD-KAIROS-MVP-002 / DEV **Versión:** 2.1 — dividido a partir de `TDD-KAIROS-Consolidado-Detallado.md` (v1.0), **actualizado 31 ago 2026 y 02 sep 2026** (evidencia: 35 fotos + video \~7-8 min; `OQ-TDD-DEV-001` cerrada — Motrix queda fuera de alcance de release por depender de otra empresa) **Estado:** Completo en contenido, pendiente de revisión formal **Entradas:** `BDD-DEV-001` (v1.6), `SDD-DEV-001` **Dominio:** Devolución **Propietario técnico:** Tech Lead — pendiente de asignar **Revisores:** Arquitectura, Backend, Frontend, Datos, Seguridad, Finanzas, QA **Fecha:** 31 de agosto de 2026

> ⚠️ **Actualización respecto al documento consolidado v1.0:** la columna `damage_assessments.estimated_amount` describía el caso técnico como "NULL si es daño técnico sin tabla (BR-DEV-006, OQ-009 **pendiente**)". El 31 de agosto, Fiorella confirmó que **no existe ni existirá tabla de precio para daño técnico — es una decisión de diseño, no un dato pendiente** (OQ-009 `RESUELTO`). Este documento actualiza el modelo físico para reflejar esa certeza, agrega la tabla `immobilization_charges` (BR-DEV-011, nueva) y confirma la ausencia de rehabilitación del semáforo de riesgo (BR-DEV-008).

> Depende de `TDD-KAIROS-TRANSVERSAL.md` para stack técnico, estructura de repositorio, convenciones de dominio, seguridad técnica, infraestructura, CI/CD, runbooks, DoD y criterios de aprobación.

---

## 1. Control y autoridad

Ver `TDD-KAIROS-TRANSVERSAL.md`, secciones 1.2-1.3.

### 1.1 Documentos relacionados

| Documento | Relación |
| --- | --- |
| `BDD-DEV-001` (v1.6) | Fuente funcional autoritativa |
| `SDD-DEV-001` | Fuente arquitectónica |
| `TDD-KAIROS-TRANSVERSAL.md` | Base técnica común |
| `TDD-ALQ-001` | Módulo del que Devolución recibe el cierre |

---

## 2. Objetivo técnico y alcance

Implementar recepción con custodia preventiva separada de cierre formal, checklist de retorno, evaluación de daño (estético con tarifario fijo / técnico sin tabla, siempre derivado a informe externo), cobro de días de paralización, y resolución de garantía.

### 2.1 Incluido

- Backend y frontend del flujo Devolución.
- Persistencia de devoluciones, incidencias, evaluación de daño y cargos por paralización.
- Integración interna con Rentals, Inspections, Evidence, Payments.
- Registro manual del monto de informe técnico externo (Motrix).

### 2.2 Fuera de alcance

- Cualquier cálculo automático de precio de daño técnico — decisión de diseño confirmada 31 ago, no una funcionalidad diferida.
- Integración productiva con Motrix (sin acceso confirmado — ver `TDD-KAIROS-TRANSVERSAL.md`, sección 2.2).
- Rehabilitación del semáforo de riesgo — no existe, no se implementa ningún comando para ello.

---

## 3. Decisiones técnicas específicas

| ID | Decisión | Estado | Justificación |
| --- | --- | --- | --- |
| TD-DEV-001 | `damage_assessments` nunca calcula un monto técnico internamente — el campo se llena manualmente con el monto del informe de Motrix | `DECIDIDO` (deriva directamente de BR-DEV-006, confirmada 31 ago) | Evita construir una funcionalidad de cálculo que contradice la regla de negocio |
| TD-DEV-002 | `risk_status` del cliente es un campo de solo-avance — ningún endpoint ni job puede escribir un valor "anterior" en la jerarquía `SIN_OBSERVACION → AMBAR → ROJO` | `DECIDIDO` (BR-DEV-008, confirmada 31 ago) | Implementa la ausencia de rehabilitación a nivel de código, no solo de proceso |

---

## 4. Requisitos trazados

| BDD | SDD | Realización TDD |
| --- | --- | --- |
| DEV-P01-03 / BR-DEV-004/005 | UC-DEV-001 | `ReceiveVehicleHandler` |
| DEV-P04 / BR-DEV-009 | UC-DEV-002 | `CompleteReturnChecklistHandler` |
| DEV-P05-09 / BR-DEV-006 (confirmada 31 ago) | UC-DEV-003 | `AssessDamageHandler` |
| BR-DEV-011 (nueva, 31 ago) | UC-DEV-004 | `ChargeImmobilizationHandler` |
| DEV-P10 / BR-DEV-001/002 | UC-DEV-005 | `CloseReturnHandler` |

---

## 5-6. Arquitectura y estructura

Devolución usa la arquitectura de ejecución y estructura de repositorio transversales, bajo `apps/api/src/modules/returns/`.

---

## 7. Modelo de dominio

### 7.1 Agregado Return

| Elemento | Responsabilidad |
| --- | --- |
| Return | Autoriza transiciones de la devolución; separa custodia física de cierre contractual |
| Incident | Daño detectado durante la devolución |
| DamageAssessment | Clasificación de gravedad y monto — **estético: tarifario fijo local; técnico: monto externo de Motrix, nunca calculado** (BR-DEV-006) |
| ImmobilizationCharge | Cargo por días de paralización cuando el cliente se demora más de 24h en responder a un informe de daño técnico (BR-DEV-011, nueva) |

### 7.2 Value objects compartidos

- `ReturnId`, `RentalId`, `CustomerId`, `VehicleId` (ver convenciones transversales).
- `Money(amount, currency)`.
- `AlcoholTestResult`: `FAVORABLE | DESFAVORABLE | RECHAZADO`.
- `RiskStatus`: `SIN_OBSERVACION | AMBAR | ROJO` — **sin transición de retroceso posible** (BR-DEV-008, confirmada 31 ago; ver TD-DEV-002).
- `CustodyStatus`: `CLIENTE | VELOXRENT`.
- `DamageOrigin`: `AESTHETIC | TECHNICAL` — determina si `estimated_amount` viene del tarifario local o de un informe externo.

### 7.3 Invariantes

1. El vehículo puede estar en custodia de VeloxRent (`CustodyStatus.VELOXRENT`) sin que la devolución esté contractualmente cerrada — estado `RECEPCION_PROVISIONAL`.
2. La garantía nunca se libera con una incidencia abierta vinculada (NFR-KAI-008).
3. Un daño grave siempre transiciona el `RiskStatus` del cliente a `ROJO`, incluso si el cliente asume el costo sin objeción (BR-DEV-007).
4. El acta de devolución de garantía es opcional — su ausencia no bloquea el cierre financiero (BR-DEV-010).
5. **Un **`DamageAssessment`** con **`origin = TECHNICAL`** nunca tiene un monto calculado por el sistema** — `estimated_amount` solo se llena por entrada manual del monto que reporta el informe externo de Motrix (BR-DEV-006, confirmada 31 ago).
6. **Un **`ImmobilizationCharge`** solo puede crearse si han transcurrido más de 24h desde **`received_at`** sin que el cliente haya respondido al informe de daño técnico** (BR-DEV-011).
7. `risk_status`** es estrictamente monótono creciente** en la jerarquía `SIN_OBSERVACION → AMBAR → ROJO` — ningún comando puede degradar el valor, ni siquiera con múltiples alquileres posteriores sin incidentes (BR-DEV-008, confirmada 31 ago).

---

## 8. Máquina de estados

### 8.1 Estados de Return

| Estado | Custodia del vehículo | Devolución cerrada | Terminal |
| --- | --- | --- | --- |
| `PROGRAMADA` | Cliente | No | No |
| `RECEPCION_PROVISIONAL` | VeloxRent | No | No |
| `INSPECCION` | VeloxRent | No | No |
| `SIN_DANOS` | VeloxRent | No | No |
| `CON_DANOS` | VeloxRent | No | No |
| `CIERRE_FINANCIERO` | VeloxRent | No | No |
| `CERRADA` | — | Sí | Sí |

### 8.2 Transiciones de Return

| Desde | Comando | Hacia | Guards | Side effects |
| --- | --- | --- | --- | --- |
| — | initiate | `PROGRAMADA` | Recordatorio enviado (BR-DEV-004) | — |
| `PROGRAMADA` | receive-vehicle | `RECEPCION_PROVISIONAL` | Vehículo llega a VeloxRent — custodia cambia sin cerrar el expediente | — |
| `RECEPCION_PROVISIONAL` | register-alcohol-test | `INSPECCION` / permanece en `RECEPCION_PROVISIONAL` | Favorable → continúa; desfavorable → permanece en custodia preventiva, se deriva a Gerencia (BR-DEV-005) | Casi siempre termina en `RiskStatus.ROJO` |
| `INSPECCION` | complete-checklist | `SIN_DANOS` / `CON_DANOS` | Checklist completo (BR-DEV-009) | — |
| `SIN_DANOS` | start-warranty-return | `CIERRE_FINANCIERO` | — | 24h naturales para liberar garantía (BR-DEV-001) |
| `CON_DANOS` | assess-damage | `CIERRE_FINANCIERO` | Gravedad clasificada por José Pariona (BR-DEV-007); si es técnica, monto proviene de informe externo (BR-DEV-006) | Evento `PagoAjustado`; daño grave → `RiskStatus.ROJO` (sin retroceso posible) |
| `CIERRE_FINANCIERO` | charge-immobilization | `CIERRE_FINANCIERO` | Solo si \>24h sin respuesta del cliente a un daño técnico abierto (BR-DEV-011) | Evento `PagoAjustado` adicional |
| `CIERRE_FINANCIERO` | close | `CERRADA` | Sin incidencia abierta vinculada (NFR-KAI-008) | Evento `DevolucionCompletada` |

### 8.3 Implementación

No se expone `PATCH status` ni ningún comando que reduzca `risk_status`. Cada transición es un método del agregado `Return`, con optimistic locking mediante `version`.

---

## 9. Modelo físico PostgreSQL

> Reutiliza las tablas transversales de `TDD-KAIROS-TRANSVERSAL.md` sección 7.

### 9.1 Tipos

```
CREATE TYPE return_status AS ENUM (
  'PROGRAMADA','RECEPCION_PROVISIONAL','INSPECCION',
  'SIN_DANOS','CON_DANOS','CIERRE_FINANCIERO','CERRADA'
);
CREATE TYPE custody_status AS ENUM ('CLIENTE','VELOXRENT');
CREATE TYPE risk_status AS ENUM ('SIN_OBSERVACION','AMBAR','ROJO');
CREATE TYPE damage_origin AS ENUM ('AESTHETIC','TECHNICAL');
```

### 9.2 Devolución e incidencias

```sql
CREATE TABLE returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid NOT NULL REFERENCES rentals(id),
  status return_status NOT NULL DEFAULT 'PROGRAMADA',
  custody custody_status NOT NULL DEFAULT 'CLIENTE',
  scheduled_at timestamptz NOT NULL,
  received_at timestamptz NULL,
  alcohol_test_result alcohol_test_result NULL,
  customer_present boolean NOT NULL DEFAULT true,
  closed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT return_custody_consistency CHECK (
    (status = 'PROGRAMADA' AND custody = 'CLIENTE') OR
    (status != 'PROGRAMADA' AND custody = 'VELOXRENT') OR
    status = 'CERRADA'
  )
);

CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES returns(id),
  type varchar(30) NOT NULL,
  severity varchar(20) NULL,   -- 'LEVE' | 'MODERADO' | 'GRAVE'
  status varchar(20) NOT NULL DEFAULT 'ABIERTA',
  description varchar(1000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT incident_status CHECK (status IN ('ABIERTA','CERRADA','VIA_LEGAL'))
);

CREATE TABLE damage_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id),
  severity varchar(20) NOT NULL,
  origin damage_origin NOT NULL,
  estimated_amount numeric(12,2) NULL,
  external_report_reference varchar(200) NULL,  -- referencia al informe de Motrix, solo si origin = TECHNICAL
  responsibility_percent integer NOT NULL DEFAULT 100,
  assessor_id uuid NOT NULL,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT damage_severity CHECK (severity IN ('LEVE','MODERADO','GRAVE')),
  CONSTRAINT damage_technical_needs_reference CHECK (
    origin != 'TECHNICAL' OR external_report_reference IS NOT NULL
  ),
  CONSTRAINT damage_aesthetic_from_tariff CHECK (
    origin != 'AESTHETIC' OR external_report_reference IS NULL
  )
);
```

> ⚠️ Actualizado 31 ago: se agregan las columnas `origin` y `external_report_reference`, y los constraints `damage_technical_needs_reference`/`damage_aesthetic_from_tariff` — reemplazan el comentario del documento consolidado ("NULL si es daño técnico sin tabla, OQ-009 pendiente") por una regla verificable a nivel de base de datos: **todo daño técnico exige una referencia de informe externo, nunca un cálculo interno**.

### 9.3 Cargo por paralización (nueva, BR-DEV-011)

```sql
CREATE TABLE immobilization_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id),
  return_id uuid NOT NULL REFERENCES returns(id),
  days_charged integer NOT NULL,
  daily_rate numeric(12,2) NOT NULL,   -- tomado del tarifario de alquiler vigente del vehículo
  total_amount numeric(12,2) NOT NULL,
  deposit_adjustment_id uuid NULL REFERENCES deposit_adjustments(id),  -- ver TDD-ALQ-001, sección 9.4
  created_at timestamptz NOT NULL DEFAULT now(),
  authorized_by uuid NOT NULL,
  CONSTRAINT immobilization_days_positive CHECK (days_charged > 0),
  CONSTRAINT immobilization_amount_consistent CHECK (
    total_amount = days_charged * daily_rate
  )
);
```

Esta tabla es la implementación física directa de **BR-DEV-011** (nueva, 31 ago): si el vehículo queda paralizado más de 24h esperando la respuesta del cliente a un daño técnico, se genera un cargo vinculado al `deposit_adjustments` del alquiler de origen (tipo `IMMOBILIZATION_CHARGE`, ver `TDD-ALQ-001` sección 9.4).

### 9.4 Índices

```
CREATE INDEX returns_rental_idx
  ON returns (rental_id);
CREATE INDEX incidents_return_status_idx
  ON incidents (return_id, status)
  WHERE status = 'ABIERTA';
CREATE INDEX immobilization_charges_incident_idx
  ON immobilization_charges (incident_id);
```

### 9.5 Retención y borrado

- Returns, incidents, damage\_assessments, immobilization\_charges y auditoría: no soft-delete operativo.
- Evidencia (35 fotos + 3 videos por expediente): lifecycle por categoría, política Legal pendiente.
- Ajustes de garantía y cargos por paralización: nunca se eliminan, solo se anexan.

---

## 10. Transacciones y concurrencia

### 10.1 Recibir vehículo en devolución (UC-DEV-001)

```
BEGIN
  cargar rental asociado FOR UPDATE
  insertar return PROGRAMADA → RECEPCION_PROVISIONAL
  actualizar custody → VELOXRENT
  registrar alcohol_test_result
  IF desfavorable:
    permanece en RECEPCION_PROVISIONAL
    insertar outbox_event EscaladoAGerencia
  ELSE:
    transicionar return → INSPECCION
  insertar audit_event
COMMIT
```

### 10.2 Evaluar daño técnico y registrar informe externo (UC-DEV-003, actualizada 31 ago)

```
BEGIN
  cargar return FOR UPDATE
  insertar incident ABIERTA
  IF daño estético:
    calcular estimated_amount desde tarifario local (tabla 9.6.1 del BDD-DEV-001)
    insertar damage_assessment (origin = AESTHETIC, estimated_amount, external_report_reference = NULL)
  ELSE (daño técnico):
    validar que se proporcionó external_report_reference — RECHAZAR si no (TECHNICAL_DAMAGE_REQUIRES_EXTERNAL_REPORT)
    insertar damage_assessment (origin = TECHNICAL, estimated_amount = monto informado, external_report_reference)
  IF severity = GRAVE:
    transicionar cliente.risk_status → ROJO (verificar TD-DEV-002: solo hacia adelante)
  insertar audit_event
  insertar outbox_event PagoAjustado
COMMIT
```

### 10.3 Cobrar días de paralización (UC-DEV-004, nueva)

```
-- ejecutado por un job programado, revisando incidents ABIERTA con damage_assessments.origin = TECHNICAL
BEGIN
  cargar incident FOR UPDATE
  verificar received_at + interval '24 hours' < now()
  verificar no existe immobilization_charge previo para este incident
  calcular days_charged = ceil(extract(epoch from (now() - received_at)) / 86400)
  insertar immobilization_charge
  insertar deposit_adjustment (type = IMMOBILIZATION_CHARGE) en el rental de origen
  insertar audit_event
  insertar outbox_event PagoAjustado
COMMIT
```

### 10.4 Cerrar devolución sin daños (UC-DEV-005)

```
BEGIN
  cargar return FOR UPDATE
  verificar NOT EXISTS incidents WHERE return_id = ? AND status = 'ABIERTA'
  transicionar return → CIERRE_FINANCIERO → CERRADA
  insertar deposit_adjustment (RELEASE, 24h naturales, BR-DEV-001)
  insertar audit_event
  insertar outbox_event DevolucionCompletada
COMMIT
```

### 10.5 Deadlocks

Orden de adquisición: `Rental` → `Return` → `Incident` → `Deposit`. Reintentar transacciones abortadas por serialización máximo dos veces con jitter.

### 10.6 Optimistic locking

Todo comando mutable sobre `returns` exige `If-Match: "<version>"`. Si la versión difiere, devuelve `412 RETURN_VERSION_CONFLICT`.

---

## 11. Contrato HTTP

### 11.1 Iniciar devolución

```
POST /api/v1/rentals/{id}/commands/start-return
Idempotency-Key: 018f...
```

```json
{
  "alcoholTestResult": "DESFAVORABLE",
  "customerPresent": true
}
```

Respuesta `200`:

```json
{
  "returnId": "uuid",
  "status": "RECEPCION_PROVISIONAL",
  "custody": "VELOXRENT",
  "closed": false,
  "escalatedTo": "GERENCIA"
}
```

### 11.2 Evaluar daño

```
POST /api/v1/returns/{id}/incidents/{incidentId}/commands/assess-damage
Idempotency-Key: 018f...
If-Match: "3"
```

Daño estético:

```json
{
  "origin": "AESTHETIC",
  "severity": "LEVE",
  "damagedZone": "puerta_lateral_derecha"
}
```

Daño técnico:

```json
{
  "origin": "TECHNICAL",
  "severity": "MODERADO",
  "estimatedAmount": {"amount": "850.00", "currency": "PEN"},
  "externalReportReference": "INFORME-MOTRIX-2026-0847"
}
```

Error si se omite la referencia en un daño técnico:

```json
{
  "type": "https://erp.kairos.pe/problems/business-rule",
  "title": "No se puede registrar el daño técnico",
  "status": 422,
  "code": "TECHNICAL_DAMAGE_REQUIRES_EXTERNAL_REPORT",
  "detail": "Todo daño técnico requiere la referencia del informe de Motrix — no existe cálculo interno (BR-DEV-006)",
  "correlationId": "uuid"
}
```

### 11.3 Cobrar días de paralización

```
POST /api/v1/returns/{id}/incidents/{incidentId}/commands/charge-immobilization
Idempotency-Key: 018f...
```

Error si aún no se cumplen las 24h:

```json
{
  "type": "https://erp.kairos.pe/problems/business-rule",
  "title": "Todavía no corresponde el cargo por paralización",
  "status": 422,
  "code": "IMMOBILIZATION_PERIOD_NOT_ELAPSED",
  "detail": "Han transcurrido menos de 24 horas desde la recepción del vehículo",
  "correlationId": "uuid"
}
```

### 11.4 Cerrar devolución

```
POST /api/v1/returns/{id}/commands/close
Idempotency-Key: 018f...
If-Match: "5"
```

Error relevante:

```json
{
  "type": "https://erp.kairos.pe/problems/business-rule",
  "title": "No se puede cerrar la devolución",
  "status": 422,
  "code": "INCIDENT_STILL_OPEN",
  "detail": "Existe una incidencia abierta vinculada a esta devolución",
  "correlationId": "uuid",
  "violations": [{"field": "incidents", "rule": "NFR-KAI-008"}]
}
```

---

## 12. Servicios de aplicación

| Handler | Comando |
| --- | --- |
| `ReceiveVehicleHandler` | receive-vehicle / register-alcohol-test |
| `CompleteReturnChecklistHandler` | complete-checklist |
| `AssessDamageHandler` | assess-damage |
| `ChargeImmobilizationHandler` (job) | charge-immobilization |
| `CloseReturnHandler` | close |

---

## 13. Puertos internos

| Puerto | Dirección | Uso |
| --- | --- | --- |
| `IncidentClassificationPort` | Returns → Incidents | Clasificar gravedad y origen del daño |
| `MaintenanceReferralPort` | Returns → Maintenance (Motrix, externo) | Registrar la referencia del informe externo — hoy manual, sin API confirmada |
| `PaymentAdjustmentPort` | Returns → Payments | Aplicar descuento, retención o cargo por paralización |
| `RiskClassificationPort` | Returns → Customers | Transicionar `risk_status`, solo hacia adelante |

---

## 14. Eventos

| Evento | Productor | Consumidores |
| --- | --- | --- |
| `DevolucionCompletada.v1` | Returns | Notifications, Audit, Reporting |
| `PagoAjustado.v1` | Payments | Returns, Audit |
| `ClienteClasificado.v1` | Customers | Rentals, Returns, Audit, Reporting |

---

## 15. Idempotencia

Ver algoritmo transversal. Aplica especialmente a `charge-immobilization` — el job programado debe verificar `NOT EXISTS` antes de insertar, para no duplicar el cargo en reejecuciones.

---

## 16. Autenticación y autorización

| Permiso | Uso |
| --- | --- |
| `return:start`, `return:complete` | Ciclo principal |
| `inspection:execute` | Checklist de retorno |
| `incident:assess`, `refund:approve` | Evaluación de daño y garantía |

---

## 17. Auditoría

`register-alcohol-test` (desfavorable), `assess-damage`, `charge-immobilization` y `close` generan `audit_events` obligatorios.

---

## 18. Frontend

Feature `apps/web/src/features/returns/` — recordatorio previo → recepción y alcolímetro → checklist de retorno → panel de resultado de daño **con dos rutas visuales distintas** (estético con monto del tarifario visible / técnico con campo obligatorio de referencia de informe) → resolución de garantía → cierre.

---

## 19. Evidencia remota

Reutiliza el patrón de carga directa (ADR-KAI-005) para el checklist de retorno.

---

## 20. NFR y presupuesto técnico

| ID | Objetivo | Táctica |
| --- | --- | --- |
| NFR-BIZ-003 | Garantía en máximo 24h naturales | Job programado + invariante de dominio |
| NFR-DEV-001 (nueva) | Cargo de paralización se activa automáticamente al superar 24h | Job programado sobre `incidents` técnicos abiertos (sección 10.3) |

---

## 21. Observabilidad

Señal específica nueva: "cargos de paralización aplicados" y "informes técnicos pendientes de referencia externa" (indicador de dependencia bloqueada por falta de integración con Motrix).

---

## 22. Manejo de fallos

| Fallo | Comportamiento |
| --- | --- |
| Sin integración con Motrix disponible | El monto del informe se ingresa manualmente por el administrador — el sistema no bloquea la evaluación de daño técnico por falta de API |
| Job de cargo por paralización falla | Reintento; después cola de excepción — nunca se pierde silenciosamente un cargo pendiente |

---

## 23. Migraciones

`returns`, `incidents`, `damage_assessments` (con las nuevas columnas `origin`/`external_report_reference`), `immobilization_charges` se crean/actualizan en la migración del dominio Devolución. Si existiera una versión previa del esquema sin estas columnas, la migración debe clasificar retroactivamente los `damage_assessments` existentes como `origin = AESTHETIC` si tienen `estimated_amount` consistente con el tarifario, o `TECHNICAL` con `external_report_reference = 'MIGRACION_SIN_REFERENCIA'` en caso contrario, para no violar el nuevo constraint.

---

## 24. Testing

### 24.1 Casos obligatorios

- Devolución sin daños, garantía en 24 horas.
- Alcolímetro desfavorable en la devolución (recepción provisional).
- Daño leve estético con aceptación del cliente (cliente ámbar, monto del tarifario).
- Daño técnico sin referencia externa (`TECHNICAL_DAMAGE_REQUIRES_EXTERNAL_REPORT`).
- Daño técnico con referencia externa registrada correctamente.
- Cliente que no responde en 24h — cargo de días de paralización aplicado, y verificación de que no se duplica en una segunda ejecución del job.
- Daño grave (vehículo inmovilizado, cliente rojo, vía legal si no coopera).
- Intento de degradar `risk_status` (debe ser técnicamente imposible, no solo no ofrecido en la UI).
- Intento de liberar garantía con incidencia abierta (`INCIDENT_STILL_OPEN`).

---

## 25. Matriz de validaciones

| Campo/regla | Capa | Código | Test |
| --- | --- | --- | --- |
| Custodia consistente con estado de Return | DB (`return_custody_consistency`) | — (constraint) | TEST-DEV-INT-001 |
| Daño técnico exige referencia externa | DB (`damage_technical_needs_reference`) | `TECHNICAL_DAMAGE_REQUIRES_EXTERNAL_REPORT` | TEST-DEV-UNIT-002 |
| Daño estético no lleva referencia externa | DB (`damage_aesthetic_from_tariff`) | `INVALID_AESTHETIC_DAMAGE` | TEST-DEV-UNIT-003 |
| Sin incidencia abierta para cerrar devolución | Application/DB | `INCIDENT_STILL_OPEN` | TEST-DEV-E2E-001 |
| Garantía en 24h naturales | Application (job) | — | TEST-DEV-E2E-002 |
| Cargo de paralización solo tras 24h | Application/DB | `IMMOBILIZATION_PERIOD_NOT_ELAPSED` | TEST-DEV-UNIT-004 |
| Cargo de paralización no se duplica | Application (idempotencia del job) | — | TEST-DEV-INT-002 |
| `risk_status` nunca retrocede | Dominio | — (invariante, no expuesta como error de usuario) | TEST-DEV-UNIT-001 |
| Daño grave → cliente rojo sin excepción | Dominio | — | TEST-DEV-UNIT-001 |
| Scope empresarial (multiempresa, semáforo visible al grupo) | Authorization/repository | `FORBIDDEN_SCOPE` | TEST-DEV-SEC-001 |

---

## 26. Trazabilidad completa

| BDD requisito/regla | SDD caso/componente | TDD artefacto | API/evento | Test |
| --- | --- | --- | --- | --- |
| DEV-P01-03 / BR-DEV-004/005 | UC-DEV-001 / Returns | `ReceiveVehicleHandler`, `return_custody_consistency` | start-return | TEST-DEV-INT-001 |
| DEV-P04 / BR-DEV-009 | UC-DEV-002 / Returns-Inspections-Evidence | `CompleteReturnChecklistHandler` | complete-checklist | TEST-DEV-E2E-003 |
| DEV-P05-09 / BR-DEV-006 (confirmada 31 ago) | UC-DEV-003 / Returns-Incidents-Maintenance | `AssessDamageHandler`, `damage_assessments` con `origin`/`external_report_reference` | assess-damage / `PagoAjustado` | TEST-DEV-UNIT-001, TEST-DEV-UNIT-002, TEST-DEV-UNIT-003 |
| BR-DEV-011 (nueva, 31 ago) | UC-DEV-004 / Returns-Payments | `ChargeImmobilizationHandler`, tabla `immobilization_charges` | charge-immobilization / `PagoAjustado` | TEST-DEV-UNIT-004, TEST-DEV-INT-002 |
| DEV-P10 / BR-DEV-001/002 | UC-DEV-005 / Returns-Payments | `CloseReturnHandler` | close / `DevolucionCompletada` | TEST-DEV-E2E-001, TEST-DEV-E2E-002 |
| BR-DEV-008 (confirmada 31 ago) | — | Constraint de solo-avance en `risk_status` | `ClienteClasificado` | TEST-DEV-UNIT-001 |
| NFR-KAI-008 | Payments | `INCIDENT_STILL_OPEN` guard | — | TEST-DEV-E2E-001 |

> 📌 Esta tabla también vive consolidada en `TDD-KAIROS-TRACEABILITY.md`.

---

## 27. Decisiones abiertas

| ID | Decisión | Propietario | Impacto | Estado |
| --- | --- | --- | --- | --- |
| OQ-TDD-DEV-001 | Formato/API exacta de la referencia al informe de Motrix (`external_report_reference`) | Tech Lead/Integraciones | Contrato exacto del campo, hoy texto libre | `PENDIENTE` — **confirmado 02 sep 2026 (Russbel/Fiorella): no se definirá dentro de ningún release por ahora**, porque involucra coordinación con otra empresa del grupo (Motrix), fuera del control directo de este proyecto. Se mantiene `external_report_reference` como texto libre indefinidamente — no es una fecha pendiente, es una decisión de alcance |

---

## 28. Definition of Done y criterios de aprobación

Ver `TDD-KAIROS-TRANSVERSAL.md`, secciones 13 y 15.

---

## 29. Checklist de calidad 9-10

| Dimensión | Sección | Estado |
| --- | --- | --- |
| Modelo de dominio | 7 | Cumple, actualizado 31 ago |
| Máquina de estados | 8 | Cumple |
| Modelo físico | 9 | Cumple, incorpora `origin`/`external_report_reference`/`immobilization_charges` (31 ago) |
| Transacciones/concurrencia | 10 | Cumple, incluye nueva transacción de cargo por paralización |
| Contrato HTTP | 11 | Cumple, incluye nuevo endpoint y error `TECHNICAL_DAMAGE_REQUIRES_EXTERNAL_REPORT` |
| Eventos/idempotencia | 14-15 | Cumple |
| Testing | 24-25 | Cumple, con 4 casos nuevos |
| Trazabilidad | 26 | Cumple BDD→SDD→TDD, incluye BR-DEV-006/008/011 |
| Dependencia del documento transversal | Secciones 1, 5-6, 16-23 | Cumple |

**Evaluación:** completo en contenido para el alcance de Devolución, con las 3 decisiones de negocio del 31 de agosto (BR-DEV-006, BR-DEV-008, BR-DEV-011) ya incorporadas hasta el nivel de constraint de base de datos. Pendiente de firmas formales y del levantamiento técnico con Motrix.
