# TDD — 01 Consulta

> **Estado vigente:** APROBADO como versión base por instrucción explícita del usuario el 18 oct 2026. Este estado reemplaza cualquier indicación histórica pendiente de revisión; cambios posteriores se gestionan como mejoras documentadas.

# Technical Design Document — Consulta

**Código:** TDD-KAIROS-MVP-002 / CON **Versión:** 2.0 — dividido a partir de `TDD-KAIROS-Consolidado-Detallado.md` (v1.0) **Estado:** Completo en contenido, pendiente de revisión formal **Entradas:** `BDD-CON-001`, `SDD-CON-001` **Dominio:** Consulta **Propietario técnico:** Tech Lead — pendiente de asignar **Revisores:** Arquitectura, Backend, Frontend, QA **Fecha:** 31 de agosto de 2026

> Depende de `TDD-KAIROS-TRANSVERSAL.md` para stack técnico, estructura de repositorio, convenciones de dominio, seguridad técnica, infraestructura, CI/CD, runbooks, DoD y criterios de aprobación — no se repiten aquí.

---

## 1. Control y autoridad

Ver `TDD-KAIROS-TRANSVERSAL.md`, secciones 1.2-1.3 (jerarquía documental y convenciones, idénticas para los 6 procesos).

### 1.1 Documentos relacionados

| Documento | Relación |
| --- | --- |
| `BDD-CON-001` | Fuente funcional autoritativa |
| `SDD-CON-001` | Fuente arquitectónica |
| `TDD-KAIROS-TRANSVERSAL.md` | Base técnica común |
| `TDD-RES-001`, `TDD-ALQ-001` | Módulos hacia los que Consulta deriva |

---

## 2. Objetivo técnico y alcance

Implementar el registro, calificación y derivación de Consulta, garantizando que ningún comando de este módulo bloquee o comprometa un vehículo — esa autoridad vive exclusivamente en Fleet, consultada de solo lectura.

### 2.1 Incluido

- Registro de contacto por canal.
- Calificación de uso turístico y procedencia.
- Cotización (snapshot versionado del tarifario).
- Derivación a Reserva/Alquiler o cierre con motivo.

### 2.2 Fuera de alcance

- Cualquier persistencia de bloqueo o compromiso de vehículo (eso vive en `TDD-RES-001`/`TDD-ALQ-001`).
- Procesamiento de pago.

---

## 3. Decisiones técnicas específicas

Consulta no requiere decisiones técnicas propias más allá de las transversales (`TDD-KAIROS-TRANSVERSAL.md`, sección 3) — es el módulo con menor complejidad de concurrencia y consistencia de los 6.

---

## 4. Requisitos trazados

| BDD | SDD | Realización TDD |
| --- | --- | --- |
| CON-P01-06 / BR-CON-001/003 | UC-CON-001 | `RegisterInquiryHandler` |
| CON-P07 / BR-CON-005 | UC-CON-002 | `QuoteHandler` |
| CON-P09 / BR-CON-002 | UC-CON-003 | `CloseOrConvertHandler` |

---

## 5-6. Arquitectura y estructura

Consulta usa la arquitectura de ejecución y la estructura de repositorio transversales (`TDD-KAIROS-TRANSVERSAL.md`, secciones 5-6), bajo `apps/api/src/modules/inquiries/` y `apps/web/src/features/inquiries/`.

---

## 7. Modelo de dominio

### 7.1 Agregado Inquiry

| Elemento | Responsabilidad |
| --- | --- |
| Inquiry | Autoriza el ciclo de vida de la consulta hasta conversión o cierre |
| Interaction | Registro append-only de cada contacto (nunca se edita, solo se agrega) |
| Quotation | Snapshot versionado del tarifario en el momento de cotizar |

### 7.2 Value objects

- `InquiryId`, `CustomerId`, `VehicleId` (ver convenciones transversales, `TDD-KAIROS-TRANSVERSAL.md` sección 7.1).
- `ChannelMode`: `PRESENCIAL | VIRTUAL`.

### 7.3 Invariantes

1. Toda consulta se registra con canal y responsable, incluso si no se convierte (BR-CON-001).
2. Una consulta puede convertirse en Reserva o en Alquiler directo, nunca en ambos (BR-CON-002).
3. Todo cliente, incluso el recurrente, pasa por Consulta antes de Reserva o Alquiler (BR-CON-003) — validado en `UC-CON-001`.

---

## 8. Máquina de estados

### 8.1 Estados

| Estado | Significado | Terminal |
| --- | --- | --- |
| `REGISTRADA` | Contacto capturado | No |
| `COTIZADA` | Vehículo y tarifa mostrados | No |
| `CONVERTIDA` | Derivó a Reserva o Alquiler | Sí |
| `CERRADA_SIN_CONVERSION` | Cliente no continúa | Sí |

### 8.2 Transiciones

| Desde | Comando | Hacia | Guards |
| --- | --- | --- | --- |
| — | register | `REGISTRADA` | Canal y responsable válidos |
| `REGISTRADA` | quote | `COTIZADA` | Vehículo elegible según destino/ruta (BR-CON-005) |
| `COTIZADA` | convert-to-reservation / convert-to-rental | `CONVERTIDA` | Cliente decide continuar |
| `COTIZADA` | close | `CERRADA_SIN_CONVERSION` | Motivo registrado (BR-CON-002) |

### 8.3 Implementación

No se expone `PATCH status`. Cada transición es un método del agregado `Inquiry` invocado por un command handler dedicado.

---

## 9. Modelo físico PostgreSQL

> Reutiliza las tablas transversales de `TDD-KAIROS-TRANSVERSAL.md` sección 7 (`idempotency_keys`, `outbox_events`, `audit_events`).

### 9.1 Tipos

```
CREATE TYPE inquiry_status AS ENUM ('REGISTRADA','COTIZADA','CONVERTIDA','CERRADA_SIN_CONVERSION');
```

### 9.2 Tablas

```sql
CREATE TABLE inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  operating_company_id uuid NOT NULL,
  customer_id uuid NULL REFERENCES customers(id),  -- puede ser prospecto sin cliente formal
  channel varchar(30) NOT NULL,
  status inquiry_status NOT NULL DEFAULT 'REGISTRADA',
  closed_reason varchar(500) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT inquiry_close_reason CHECK (
    status != 'CERRADA_SIN_CONVERSION' OR closed_reason IS NOT NULL
  )
);

CREATE TABLE interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES inquiries(id),
  channel varchar(30) NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  outcome varchar(100) NULL,
  note varchar(1000) NULL
  -- append-only: sin UPDATE ni DELETE a nivel de aplicación
);

CREATE TABLE quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES inquiries(id),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  rate_card_version_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency char(3) NOT NULL,
  valid_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 9.3 Índices

```
CREATE INDEX inquiries_status_idx
  ON inquiries (operating_company_id, status, created_at DESC);
```

---

## 10. Transacciones y concurrencia

Consulta no requiere transacciones con concurrencia crítica — ningún comando reserva un recurso exclusivo. La única disciplina relevante es que `quote` nunca modifica `vehicle_commitments` (esa tabla es propiedad de Reserva/Alquiler, ver `TDD-KAIROS-TRANSVERSAL.md` sección 7.4).

### 10.1 Optimistic locking

Todo comando mutable sobre `inquiries` exige `If-Match: "<version>"`. Si la versión difiere, devuelve `412 INQUIRY_VERSION_CONFLICT`.

---

## 11. Contrato HTTP

> Convenciones generales (base `/api/v1`, HTTPS/JSON, `Idempotency-Key`, `If-Match`, errores RFC 9457) viven en `TDD-KAIROS-TRANSVERSAL.md` (referenciadas por todos los TDD de proceso) — no se repiten.

### 11.1 Registrar consulta

```
POST /api/v1/inquiries
Idempotency-Key: 018f...
```

```json
{
  "channel": "WHATSAPP",
  "customerId": "uuid (opcional)",
  "touristUse": true
}
```

### 11.2 Cotizar

```
POST /api/v1/inquiries/{id}/commands/quote
Idempotency-Key: 018f...
If-Match: "1"
```

```json
{
  "vehicleId": "uuid",
  "destination": "Vilcashuamán",
  "estimatedDays": 3
}
```

### 11.3 Derivar o cerrar

```
POST /api/v1/inquiries/{id}/commands/close
Idempotency-Key: 018f...
If-Match: "2"
```

```json
{
  "reason": "CLIENTE_NO_CONTINUA",
  "note": "Precio no se ajustó al presupuesto"
}
```

---

## 12. Servicios de aplicación

| Handler | Comando | Responsabilidad |
| --- | --- | --- |
| `RegisterInquiryHandler` | register | Crear `Inquiry` en `REGISTRADA` |
| `QuoteHandler` | quote | Consultar elegibilidad en Fleet (solo lectura), crear `Quotation` |
| `CloseOrConvertHandler` | close / convert-to-\* | Cerrar con motivo, o derivar a Reservations/Rentals |

---

## 13. Puertos internos

| Puerto | Dirección | Uso |
| --- | --- | --- |
| `FleetAvailabilityPort` | Inquiries → Fleet | Consultar elegibilidad del vehículo por destino/ruta (solo lectura, sin bloqueo) |
| `CustomerLookupPort` | Inquiries → Customers | Reconocer a un cliente recurrente, si ya existe |

---

## 14. Eventos

| Evento | Productor | Consumidores | Payload mínimo |
| --- | --- | --- | --- |
| `ConsultaConvertida.v1` | Inquiries | Reservations/Rentals, Reporting | `inquiryId`, `destination` |
| `ConsultaCerrada.v1` | Inquiries | Reporting | `inquiryId`, `reason` |

---

## 15. Idempotencia

Ver algoritmo transversal (`TDD-KAIROS-TRANSVERSAL.md`, sección 7.3, tabla `idempotency_keys`). Aplica a `register`, `quote` y `close`.

---

## 16. Autenticación y autorización

| Claim | Uso en Consulta |
| --- | --- |
| `sub` | Actor que registra el contacto |
| `companyScope` | Empresa/sede — filtra qué inquiries puede leer/crear |
| `permissions` | `inquiry:create`, `inquiry:read`, `inquiry:update` |

---

## 17. Auditoría

`close` y `convert-to-*` generan `audit_events` — el resto de comandos de Consulta son de bajo riesgo y no requieren auditoría obligatoria (a diferencia de Reserva/Alquiler/Devolución).

---

## 18. Frontend

Feature `apps/web/src/features/inquiries/` — formulario por pasos (canal → uso/procedencia → destino → vehículo mostrado → decisión), con guardado de borrador local.

---

## 19. NFR y presupuesto técnico

Consulta no tiene NFR propios más allá de los transversales (`TDD-KAIROS-TRANSVERSAL.md`, sección relacionada en `SDD-CON-001` sección 19) — es el proceso de menor exigencia de consistencia.

---

## 20. Observabilidad

Sin señales propias más allá de las transversales.

---

## 21. Manejo de fallos

Sin particularidades — Consulta no ejecuta comandos financieros ni de disponibilidad bloqueante, así que no tiene modos de fallo críticos propios.

---

## 22. Migraciones

Tabla `inquiries`/`interactions`/`quotations` se crea en la primera migración del dominio, sin dependencia de otros módulos de proceso.

---

## 23. Testing

### 23.1 Casos obligatorios

- Cliente rechaza el uso turístico (cierre inmediato).
- Cliente extranjero recibiendo el set de requisitos correcto.
- Modalidad virtual: envío de evidencia en vez de exhibición presencial.
- Cliente recurrente intentando saltarse Consulta (debe bloquearse).

---

## 24. Matriz de validaciones

| Campo/regla | Capa | Código | Test |
| --- | --- | --- | --- |
| Todo cliente pasa por Consulta primero | Application | `INQUIRY_REQUIRED` | TEST-CON-E2E-001 |
| Motivo obligatorio al cerrar sin conversión | DB (`inquiry_close_reason`) | `CLOSE_REASON_REQUIRED` | TEST-CON-UNIT-001 |
| ETag vigente | Presentation/repository | `INQUIRY_VERSION_CONFLICT` | Contract |
| Scope empresarial | Authorization/repository | `FORBIDDEN_SCOPE` | TEST-CON-SEC-001 |

---

## 25. Trazabilidad completa

| BDD requisito/regla | SDD caso/componente | TDD artefacto | API/evento | Test |
| --- | --- | --- | --- | --- |
| CON-P01-06 / BR-CON-001/003 | UC-CON-001 / Inquiries | `RegisterInquiryHandler` | register | TEST-CON-E2E-001 |
| CON-P07 / BR-CON-005 | UC-CON-002 / Inquiries-Fleet | `QuoteHandler` | quote | — |
| CON-P09 / BR-CON-002 | UC-CON-003 / Inquiries | `CloseOrConvertHandler` | close / convert-to-\* | — |

> 📌 Esta tabla también vive consolidada en `TDD-KAIROS-TRACEABILITY.md`.

---

## 26. Decisiones abiertas

Sin decisiones técnicas propias de Consulta — ver `TDD-KAIROS-TRANSVERSAL.md`, sección 14.

---

## 27. Definition of Done y criterios de aprobación

Ver `TDD-KAIROS-TRANSVERSAL.md`, secciones 13 y 15 (idénticos para los 6 procesos).

---

## 28. Checklist de calidad 9-10

| Dimensión | Sección | Estado |
| --- | --- | --- |
| Modelo de dominio | 7 | Cumple |
| Máquina de estados | 8 | Cumple |
| Modelo físico | 9 | Cumple |
| Contrato HTTP | 11 | Cumple |
| Eventos | 14 | Cumple |
| Testing | 23-24 | Cumple |
| Trazabilidad | 25 | Cumple BDD→SDD→TDD |
| Dependencia del documento transversal | Secciones 1, 5-6, 15-22 | Cumple |

**Evaluación:** completo en contenido para el alcance de Consulta. Pendiente de firmas formales — ver `TDD-KAIROS-TRANSVERSAL.md`, sección 15.1.
