# TDD — 06 Administración de Personal

> **Estado vigente:** APROBADO como versión base por instrucción explícita del usuario el 18 oct 2026. Este estado reemplaza cualquier indicación histórica pendiente de revisión; cambios posteriores se gestionan como mejoras documentadas.

# Technical Design Document — Administración de Personal

**Código:** TDD-KAIROS-MVP-002 / ADP **Versión:** 2.1 — dividido a partir de `TDD-KAIROS-Consolidado-Detallado.md` (v1.0), corregido 02 sep 2026 (constraint de vacaciones: `area_id`, no `employee_id`) **Estado:** Completo en contenido, pendiente de revisión formal **Entradas:** `BDD-ADP-001` (v1.6), `SDD-ADP-001` **Dominio:** Administración de Personal **Propietario técnico:** Tech Lead — pendiente de asignar **Revisores:** Arquitectura, Backend, Frontend, QA **Fecha:** 31 de agosto de 2026

> El modelo de este documento ya reflejaba correctamente la ausencia de un 4to nivel de autorización automático en el documento consolidado (`field_trip_status` incluye `NO_AUTORIZADA` sin un nivel adicional) — la reunión del 31 de agosto **confirma y cierra formalmente** esa decisión (OQ-ADP-102, revertida de "parcial" a `RESUELTO`), sin requerir cambios en el modelo físico. Se actualiza únicamente el estado documental de la decisión.

> Depende de `TDD-KAIROS-TRANSVERSAL.md` para stack técnico, estructura de repositorio, convenciones de dominio, seguridad técnica, infraestructura, CI/CD, runbooks, DoD y criterios de aprobación.

---

## 1. Control y autoridad

Ver `TDD-KAIROS-TRANSVERSAL.md`, secciones 1.2-1.3.

### 1.1 Documentos relacionados

| Documento | Relación |
| --- | --- |
| `BDD-ADP-001` (v1.6) | Fuente funcional autoritativa |
| `SDD-ADP-001` | Fuente arquitectónica |
| `TDD-KAIROS-TRANSVERSAL.md` | Base técnica común |
| `TDD-REC-001` | Módulo hermano — origen del `Employee`, destino del evento `RelacionLaboralTerminada` |

---

## 2. Objetivo técnico y alcance

Implementar asistencia, permisos, vacaciones (capacidad máxima de 1 persona de vacaciones por área a la vez — corregido 02 sep, ya no son "2 personas clave" designadas), cascada de autorización de salida a campo de exactamente 3 niveles **sin 4to nivel automático**, y clasificación de salida.

### 2.1 Incluido

- Backend y frontend del flujo Administración de Personal.
- Persistencia de empleados, asistencia, permisos, vacaciones y salidas a campo.
- Integración con Recruitment vía el evento `RelacionLaboralTerminada`.

### 2.2 Fuera de alcance

- Cualquier 4to nivel de autorización automatizado — confirmado explícitamente que no se implementa (BR-ADP-004, 31 ago).
- Evaluación de Desempeño y Capacitación formal.

---

## 3. Decisiones técnicas específicas

| ID | Decisión | Estado | Justificación |
| --- | --- | --- | --- |
| TD-ADP-001 | La cascada de `field_trips` termina en `NO_AUTORIZADA` tras el 3er nivel — no existe ningún comando ni rol de sistema que represente un 4to autorizador | `DECIDIDO` (BR-ADP-004, confirmada 31 ago — revierte la resolución parcial del 27 ago) | Evita construir infraestructura (rol, notificación, temporizador) para una escalación que Fiorella decidió explícitamente no automatizar |

---

## 4. Requisitos trazados

| BDD | SDD | Realización TDD |
| --- | --- | --- |
| ADP-P01-04 / BR-ADP-001 | UC-ADP-001 | Cálculo de descuento a fin de mes |
| ADP-P09-10 / BR-ADP-002 | UC-ADP-003 | `vacations` EXCLUDE constraint |
| ADP-P12-14 / BR-ADP-004 (confirmada 31 ago) | UC-ADP-004 | `field_trips` cascada, sin 4to nivel |
| ADP-P15-17 / BR-ADP-006 | UC-ADP-005 | `EmploymentTermination` |

---

## 5-6. Arquitectura y estructura

Administración de Personal usa la arquitectura de ejecución y estructura de repositorio transversales, bajo `apps/api/src/modules/hr-administration/`.

---

## 7. Modelo de dominio

### 7.1 Agregado Employee

| Elemento | Responsabilidad |
| --- | --- |
| Employee | Autoridad sobre el ciclo de vida del colaborador ya contratado |
| Attendance | Registro informal append-only |
| Leave | Solicitud y autorización de permisos |
| Vacation | Programación con verificación de capacidad de área — máximo 1 persona a la vez (BR-ADP-002, corregida 02 sep) |
| FieldTrip | Autorización en cascada de **exactamente 3 niveles, sin 4to nivel** (BR-ADP-004, confirmada 31 ago) |
| EmploymentTermination | Se crea una vez; dispara `RelacionLaboralTerminada` hacia Recruitment |

### 7.2 Invariantes

1. **Corregida 02 sep 2026:** como máximo 1 persona de cualquier área puede estar de vacaciones a la vez — no son "2 personas clave" designadas, es una regla de capacidad que aplica a todo el área (BR-ADP-002). Prioridad por orden de solicitud.
2. Solo Fiorella y José autorizan permisos o salidas antes de hora (BR-ADP-003).
3. **La cascada de autorización de campo tiene exactamente 3 niveles con temporizador de 5 min cada uno. Agotados los 3, el resultado es **`NO_AUTORIZADA`** — no existe un 4to nivel, por decisión explícita confirmada el 31 de agosto (OQ-ADP-102, revierte la resolución parcial del 27 ago). Cualquier resolución posterior es un proceso manual fuera del sistema, sin representación en este dominio.**
4. `EmploymentTermination` es el único disparador válido de una nueva `Vacancy` — ningún otro evento crea una vacante automáticamente (ADR-KAI-006).

---

## 8. Máquina de estados

### 8.1 Estados de Employee (periodo de prueba)

| Estado | Significado | Terminal |
| --- | --- | --- |
| `PERIODO_PRUEBA` | Pago por recibo de honorarios (BR-REC-005) | No |
| `PLANILLA` | Evaluación positiva a los 3 meses, ingresó al 4to mes | No |
| `TERMINADO` | Relación finalizada (renuncia o despido) | Sí |

### 8.2 Transiciones — FieldTrip (cascada, confirmada 31 ago)

| Desde | Comando | Hacia | Guards |
| --- | --- | --- | --- |
| — | request | `PENDIENTE_NIVEL_1` | Solicitud registrada |
| `PENDIENTE_NIVEL_1` | authorize (Fiorella) / timeout-5min | `AUTORIZADA` / `PENDIENTE_NIVEL_2` | — |
| `PENDIENTE_NIVEL_2` | authorize (José) / timeout-5min | `AUTORIZADA` / `PENDIENTE_NIVEL_3` | — |
| `PENDIENTE_NIVEL_3` | authorize (Cecilia) / no-response | `AUTORIZADA` / `NO_AUTORIZADA` | **Estado terminal del comando automatizado — sin 4to nivel (BR-ADP-004, confirmada 31 ago)** |
| `AUTORIZADA` | evaluate-return | `CERRADA_NORMAL` / `OBSERVADA` | 1ra-3ra tardanza → normal con advertencia; 4ta → observada (BR-ADP-005) |

> `NO_AUTORIZADA` es un estado terminal para el comando de autorización — el sistema no ofrece ninguna acción de "escalar más". La UI muestra un mensaje indicando que la resolución posterior es manual (Fiorella o José, típicamente al día siguiente), sin ningún botón que sugiera un siguiente nivel automático.

---

## 9. Modelo físico PostgreSQL

> Reutiliza las tablas transversales de `TDD-KAIROS-TRANSVERSAL.md` sección 7.

### 9.1 Tipos

```
CREATE TYPE employee_status AS ENUM ('PERIODO_PRUEBA','PLANILLA','TERMINADO');
CREATE TYPE field_trip_status AS ENUM (
  'PENDIENTE_NIVEL_1','PENDIENTE_NIVEL_2','PENDIENTE_NIVEL_3',
  'AUTORIZADA','NO_AUTORIZADA','CERRADA_NORMAL','OBSERVADA'
);
```

### 9.2 Tablas

```sql
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operating_company_id uuid NOT NULL,
  candidate_id uuid NULL REFERENCES candidates(id),
  full_name varchar(200) NOT NULL,
  status employee_status NOT NULL DEFAULT 'PERIODO_PRUEBA',
  probation_evaluated_at timestamptz NULL,
  payroll_started_at timestamptz NULL,
  terminated_at timestamptz NULL,
  termination_reason varchar(20) NULL,  -- 'RENUNCIA' | 'DESPIDO'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vacations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  area_id uuid NOT NULL,  -- área del colaborador al momento de la solicitud
  requested_range tstzrange NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'PROGRAMADA',
  requested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  EXCLUDE USING gist (
    area_id WITH =,
    requested_range WITH &&
  ) WHERE (status = 'PROGRAMADA')
);
```

> ⚠️ **Corregido 02 sep 2026 (aclaración de Fiorella):** BR-ADP-002 **no** trata de "2 personas clave" designadas — es una regla de **capacidad del área**: como máximo 1 persona de cualquier área puede estar de vacaciones en un momento dado, sin importar cuántos colaboradores tenga esa área. La constraint anterior excluía por `employee_id` (que solo evita que la misma persona se traslape consigo misma, no evita que 2 personas distintas del área coincidan) — se corrige a excluir por `area_id`. Esto también implementa naturalmente la prioridad "quien solicitó primero": el `EXCLUDE` rechaza la segunda solicitud que intente insertarse sobre un rango ya ocupado, sin importar quién sea, por orden de inserción (`requested_at`).

```sql
CREATE TABLE field_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  status field_trip_status NOT NULL DEFAULT 'PENDIENTE_NIVEL_1',
  authorized_by uuid NULL,
  authorization_level integer NULL,   -- 1=Fiorella, 2=José, 3=Cecilia — NUNCA 4
  requested_at timestamptz NOT NULL DEFAULT now(),
  returned_at timestamptz NULL,
  CONSTRAINT field_trip_level_max_3 CHECK (
    authorization_level IS NULL OR authorization_level BETWEEN 1 AND 3
  )
);
```

> ⚠️ Se agrega el constraint `field_trip_level_max_3` — implementación física explícita de que **nunca puede existir un 4to nivel** en el sistema (BR-ADP-004, confirmada 31 ago). No estaba en el documento consolidado; se agrega ahora para blindar la decisión a nivel de base de datos, no solo de aplicación.

La `EXCLUDE USING gist` en `vacations` es la implementación física de **BR-ADP-002, corregida el 02 sep 2026**: capacidad de 1 persona por área, no "2 personas clave" fijas. Requiere que `employees` tenga un `area_id` — el modelo de áreas todavía necesita que Datos confirme su catálogo completo (queda `SUPUESTO` en ese punto específico, aunque la regla de negocio en sí ya está `CONFIRMADO`).

### 9.3 Vinculación entre módulos

```
-- No hay FK directa entre employment_terminations y vacancies:
-- el enlace es exclusivamente el evento RelacionLaboralTerminada (outbox_events),
-- consistente con ADR-KAI-006 (módulos separados, acoplados solo por evento).
```

---

## 10. Transacciones y concurrencia

### 10.1 Programar vacaciones (UC-ADP-003)

```
BEGIN
  intentar insertar vacation con requested_range
  -- la constraint EXCLUDE rechaza automáticamente el solapamiento
  IF constraint violation:
    devolver 409 VACATION_OVERLAP
  ELSE:
    insertar audit_event
COMMIT
```

### 10.2 Autorización de campo agotada (UC-ADP-004, confirmada 31 ago)

```
BEGIN
  cargar field_trip FOR UPDATE
  verificar status = PENDIENTE_NIVEL_3
  IF timeout de 5 min sin respuesta de Cecilia:
    transicionar field_trip → NO_AUTORIZADA
    -- NO se asigna authorized_by, NO se crea ningún registro de "nivel 4"
    insertar audit_event (action = FIELD_TRIP_NO_AUTHORIZATION)
COMMIT
```

### 10.3 Salida dispara Reclutamiento (UC-ADP-005)

```
BEGIN
  cargar employee FOR UPDATE
  verificar terminated_at IS NULL (EMPLOYMENT_ALREADY_TERMINATED si no)
  actualizar employee → TERMINADO, termination_reason
  insertar audit_event
  insertar outbox_event RelacionLaboralTerminada
COMMIT
-- consumidor en Recruitment, en otra transacción:
BEGIN
  insertar vacancy NECESIDAD_REGISTRADA (source = derivado del motivo)
COMMIT
```

Dos transacciones separadas, nunca una sola — ningún módulo escribe directamente la tabla propietaria de otro.

---

## 11. Contrato HTTP

### 11.1 Programar vacaciones

```
POST /api/v1/employees/{id}/vacations
Idempotency-Key: 018f...
```

```json
{
  "startAt": "2026-09-15T00:00:00-05:00",
  "endAt": "2026-09-22T00:00:00-05:00"
}
```

Error relevante:

```json
{
  "type": "https://erp.kairos.pe/problems/business-rule",
  "title": "No se pueden programar estas vacaciones",
  "status": 409,
  "code": "VACATION_OVERLAP",
  "detail": "La otra persona clave del área ya tiene vacaciones programadas en ese rango",
  "correlationId": "uuid"
}
```

### 11.2 Solicitar salida a campo

```
POST /api/v1/employees/{id}/field-trips
Idempotency-Key: 018f...
```

El cliente consulta `GET /api/v1/field-trips/{id}` mientras la cascada avanza. Al agotarse el 3er nivel:

```json
{
  "id": "uuid",
  "status": "NO_AUTORIZADA",
  "authorizationLevel": null,
  "message": "Nadie autorizó. La decisión de a quién más consultar es manual, fuera del sistema."
}
```

---

## 12. Servicios de aplicación

| Handler | Comando |
| --- | --- |
| `LogAttendanceHandler` | log-attendance |
| `AuthorizeLeaveHandler` | authorize-leave |
| `ScheduleVacationHandler` | schedule-vacation |
| `RequestFieldTripHandler` / `AuthorizeFieldTripHandler` | request / authorize / timeout (job) |
| `TerminateEmploymentHandler` | terminate |

---

## 13. Puertos internos

| Puerto | Dirección | Uso |
| --- | --- | --- |
| `VacancyCreationPort` | HR-Administration → Recruitment | Publicar `RelacionLaboralTerminada`, consumido para crear nueva `Vacancy` |

---

## 14. Eventos

| Evento | Productor | Consumidores |
| --- | --- | --- |
| `RelacionLaboralTerminada.v1` | HR-Administration | Recruitment, Audit |

---

## 15. Idempotencia

Ver algoritmo transversal. Aplica a `schedule-vacation`, `authorize` (cascada) y `terminate`.

---

## 16. Autenticación y autorización

| Permiso | Uso |
| --- | --- |
| `hr:manage` | Asistencia, permisos, vacaciones, salida |
| Autorización de campo | Restringida por `authorization_level` (1=Fiorella, 2=José, 3=Cecilia) — ningún claim habilita un nivel 4 |

---

## 17. Auditoría

`authorize-leave`, `schedule-vacation`, cada transición de `field_trips` (incluida `NO_AUTORIZADA`) y `terminate` generan `audit_events` obligatorios.

---

## 18. Frontend

Feature `apps/web/src/features/hr-administration/` — panel de asistencia → solicitud → cascada de autorización con indicador visual de "3er nivel sin respuesta — sin autorización automática" → cierre/registro → salida dispara nueva vacante en Reclutamiento.

---

## 19-22. NFR, observabilidad, fallos y migraciones

| ID | Objetivo | Táctica |
| --- | --- | --- |
| NFR-BIZ-008 | 5 min antes de escalar (por nivel) | Temporizador de escalamiento (cascada BR-ADP-004) |

Señal de observabilidad específica: "autorizaciones que terminan en `NO_AUTORIZADA`" — indicador de cuántas solicitudes quedan pendientes de resolución manual.

---

## 23. Testing

### 23.1 Casos obligatorios

- Falta injustificada, primera vez (comunicación oral, sin descuento inmediato).
- Autorización de salida a campo escalada hasta Cecilia (3er nivel).
- Ningún nivel de la cascada autoriza (`NO_AUTORIZADA`) — **verificar explícitamente que el sistema no ofrece ni crea un 4to nivel**.
- Dos personas del área solicitan vacaciones en fechas superpuestas — se aprueba a quien solicitó primero (`VACATION_OVERLAP`).
- Renuncia sin previo aviso: se paga la quincena, se dispara Reclutamiento.

---

## 24. Matriz de validaciones

| Campo/regla | Capa | Código | Test |
| --- | --- | --- | --- |
| Capacidad de vacaciones por área (máximo 1 persona a la vez) | DB (`EXCLUDE` por `area_id`) | `VACATION_OVERLAP` | TEST-ADP-INT-001 |
| Cascada de autorización respeta 3 niveles y 5 min, sin 4to | Application (temporizador) + DB (`field_trip_level_max_3`) | `NO_AUTHORIZATION_AVAILABLE` | TEST-ADP-E2E-001 |
| Salida no se registra dos veces | Application/DB | `EMPLOYMENT_ALREADY_TERMINATED` | TEST-ADP-UNIT-002 |
| Evento `RelacionLaboralTerminada` es el único disparador de vacante | Application (revisión de contrato) | — | TEST-ADP-INT-002 |
| Scope empresarial (4 empresas del grupo) | Authorization/repository | `FORBIDDEN_SCOPE` | TEST-REC-SEC-001 |

---

## 25. Trazabilidad completa

| BDD requisito/regla | SDD caso/componente | TDD artefacto | API/evento | Test |
| --- | --- | --- | --- | --- |
| ADP-P01-04 / BR-ADP-001 | UC-ADP-001 / HR-Administration | Cálculo de descuento a fin de mes | — | — |
| ADP-P09-10 / BR-ADP-002 | UC-ADP-003 / HR-Administration | `vacations` EXCLUDE constraint | — | TEST-ADP-INT-001 |
| ADP-P12-14 / BR-ADP-004/005 (confirmada 31 ago) | UC-ADP-004 / HR-Administration | `field_trips` cascada, `field_trip_level_max_3` | — | TEST-ADP-E2E-001 |
| ADP-P15-17 / BR-ADP-006 | UC-ADP-005 / HR-Administration-Recruitment | `EmploymentTermination` | — / `RelacionLaboralTerminada` | TEST-ADP-INT-002 |
| ADR-KAI-006 | Transversal | Sin FK directa entre módulos | `RelacionLaboralTerminada` | TEST-ADP-INT-002 |

> 📌 Esta tabla también vive consolidada en `TDD-KAIROS-TRACEABILITY.md`.

---

## 26. Decisiones abiertas

Sin decisiones técnicas propias pendientes — OQ-ADP-102 se cerró el 31 de agosto (BR-ADP-004 confirmada `DECIDIDO`, TD-ADP-001).

---

## 27. Definition of Done y criterios de aprobación

Ver `TDD-KAIROS-TRANSVERSAL.md`, secciones 13 y 15.

---

## 28. Checklist de calidad 9-10

| Dimensión | Sección | Estado |
| --- | --- | --- |
| Modelo de dominio | 7 | Cumple, con invariante 3 reforzada (31 ago) |
| Máquina de estados | 8 | Cumple |
| Modelo físico | 9 | Cumple, incorpora `field_trip_level_max_3` (31 ago) |
| Transacciones/concurrencia | 10 | Cumple |
| Contrato HTTP | 11 | Cumple |
| Eventos/idempotencia | 14-15 | Cumple |
| Testing | 23-24 | Cumple, con verificación explícita de ausencia de 4to nivel |
| Trazabilidad | 25 | Cumple BDD→SDD→TDD |
| Dependencia del documento transversal | Secciones 1, 5-6, 19-22 | Cumple |

**Evaluación:** completo en contenido para el alcance de Administración de Personal, con la confirmación del 31 de agosto (BR-ADP-004, sin 4to nivel) ya blindada a nivel de constraint de base de datos. Pendiente de firmas formales.
