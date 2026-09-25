# TDD — 07 Trazabilidad

# TDD-KAIROS-TRACEABILITY — Matriz de trazabilidad consolidada

**Código:** TDD-KAIROS-MVP-002 / TRACEABILITY **Versión:** 2.1 — corregido 02 sep 2026 (completadas las 41 reglas que faltaban, de 29 a las 70 trazadas) **Estado:** Completo en contenido, pendiente de revisión formal **Contenido:** Trazabilidad completa (BDD → SDD → TDD → API/evento → Test) de los 6 procesos, consolidada en un solo lugar — mismo criterio ya aplicado en `BDD-KAIROS-TRACEABILITY.md` y `SDD-KAIROS-TRACEABILITY.md` **Fecha:** 02 de septiembre de 2026

> Cada fila de esta matriz también vive, de forma no autoritativa, en la sección de trazabilidad del `TDD-XXX-001` correspondiente a su proceso. Ante cualquier diferencia, prevalece el TDD de proceso.

---

## 0. Transversal (12 reglas — nueva sección, completando la matriz de 29 a 70 reglas)

> Igual que se hizo en `SDD-KAIROS-TRACEABILITY.md` y `BDD-KAIROS-TRACEABILITY.md`, las 12 reglas `BR-ORG-*`/`BR-INS-*`/`BR-DOC-*` no tenían sección propia — 7 quedaban implícitas dentro de artefactos de proceso, 5 no aparecían en absoluto.

| BDD requisito/regla | SDD caso/componente | TDD artefacto | API/evento | Test |
| --- | --- | --- | --- | --- |
| BR-ORG-001 (4 empresas de KAIROS) | — (SDD-KAIROS-TRANSVERSAL, sección 3.1) | — sin artefacto TDD dedicado — dato de configuración de `organizations` | — | — |
| BR-ORG-002 (aislamiento multiempresa, **Crítica**) | — (SDD-KAIROS-TRANSVERSAL, sección 14) | RLS en PostgreSQL + `company_id` obligatorio en cada tabla (TDD-KAIROS-TRANSVERSAL, sección 8.4) | — | `TEST-*-SEC-001` en cada TDD de proceso |
| BR-ORG-003 (personal polivalente) | DR-KAI-008 | — sin artefacto TDD dedicado — permisos por rol, no por persona | — | — |
| BR-INS-001 (30+15 min de inspección) | UC-ALQ-005 | `CompleteDeliveryHandler` (temporizador visible, no bloqueante) | complete-delivery | — |
| BR-INS-002 | UC-ALQ-005 | `CompleteDeliveryHandler` | complete-delivery / `EntregaCompletada` | TEST-ALQ-E2E-002 |
| BR-INS-005 (FIV vs. FCKE) | — sin caso de uso dedicado | — sin artefacto TDD dedicado — distinción de formato físico, no genera rama de código | — | — |
| BR-INS-006 (excepción inspección \<30 min) | — sin caso de uso dedicado | — sin artefacto TDD dedicado — flujo de autorización de excepciones, sin tabla propia | — | — |
| BR-DOC-001 (partida doble) | UC-ALQ-005 | — sin artefacto TDD dedicado — archivo físico + Drive, fuera del sistema | — | — |
| BR-DOC-002 (una sola versión vigente, **Crítica**) | UC-ALQ-004 | `contract_templates_active_idx` | — | TEST-ALQ-INT-001 |
| BR-DOC-003 | UC-ALQ-004 | `FormalizeContractHandler` | formalize-contract / `ContratoFirmado` | TEST-ALQ-INT-001 |

Documento fuente: `TDD-KAIROS-TRANSVERSAL.md`.

---

## 1. Alquiler

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
| BR-ALQ-001 (cliente antiguo, \>2 alquileres) | Customers | — sin artefacto TDD dedicado — dato usado como condición dentro de `EvaluateNotaryHandler` | — | — |
| BR-ALQ-006 (km incluidos plan Normal) | Fleet | — sin artefacto TDD dedicado — parámetro de tarifario | — | — |
| BR-ALQ-007 (velocidad máxima) | Rentals (contrato) | — sin artefacto TDD dedicado — cláusula contractual, validación de campo | — | — |
| BR-ALQ-008 (restricción geográfica) | Rentals (contrato) | — sin artefacto TDD dedicado — cláusula contractual, validación de campo | — | — |
| BR-ALQ-009 (notaría "sorpresa") | Rentals | `FormalizeContractHandler` (momento de divulgación) | formalize-contract | — |
| BR-ALQ-010 (GPS obligatorio) | Fleet | — sin artefacto TDD dedicado — precondición de Fleet, no de Alquiler | — | — |
| BR-ALQ-011 (medios de pago) | Payments | `FormalizeContractHandler` | formalize-contract / `PagoRegistrado` | — |
| BR-ALQ-014 (autorización de respaldo 5 min) | Rentals | — sin artefacto TDD dedicado — mismo patrón de cascada que `field_trips` en Administración de Personal, sin implementar en Alquiler | — | — |
| BR-ALQ-015 (variantes de conductor) | Rentals | `ValidateDocumentsHandler` (rol de firmante) | validate-documents | — |
| BR-ALQ-016 (RENIEC/MTC no responde) | Customers | `ValidateDocumentsHandler` (contingencia) | validate-documents | — |

Documento fuente: `TDD-ALQ-001`.

---

## 2. Devolución

| BDD requisito/regla | SDD caso/componente | TDD artefacto | API/evento | Test |
| --- | --- | --- | --- | --- |
| DEV-P01-03 / BR-DEV-004/005 | UC-DEV-001 / Returns | `ReceiveVehicleHandler`, `return_custody_consistency` | start-return | TEST-DEV-INT-001 |
| DEV-P04 / BR-DEV-009 | UC-DEV-002 / Returns-Inspections-Evidence | `CompleteReturnChecklistHandler` | complete-checklist | TEST-DEV-E2E-003 |
| DEV-P05-09 / BR-DEV-006 (confirmada 31 ago) | UC-DEV-003 / Returns-Incidents-Maintenance | `AssessDamageHandler`, `damage_assessments` con `origin`/`external_report_reference` | assess-damage / `PagoAjustado` | TEST-DEV-UNIT-001/002/003 |
| BR-DEV-011 (nueva, 31 ago) | UC-DEV-004 / Returns-Payments | `ChargeImmobilizationHandler`, tabla `immobilization_charges` | charge-immobilization / `PagoAjustado` | TEST-DEV-UNIT-004, TEST-DEV-INT-002 |
| DEV-P10 / BR-DEV-001/002 | UC-DEV-005 / Returns-Payments | `CloseReturnHandler` | close / `DevolucionCompletada` | TEST-DEV-E2E-001, TEST-DEV-E2E-002 |
| BR-DEV-008 (confirmada 31 ago) | — | Constraint de solo-avance en `risk_status` | `ClienteClasificado` | TEST-DEV-UNIT-001 |
| NFR-KAI-008 | Payments | `INCIDENT_STILL_OPEN` guard | — | TEST-DEV-E2E-001 |
| BR-DEV-003 (tolerancia 30 min) | Returns | — sin artefacto TDD dedicado — regla operativa | — | — |
| BR-DEV-007 (José Pariona clasifica gravedad) | Incidents | `AssessDamageHandler` (campo `severity`) | assess-damage | TEST-DEV-UNIT-001 |
| BR-DEV-010 (acta de garantía opcional) | Payments | `CloseReturnHandler` (documento opcional) | close | — |

Documento fuente: `TDD-DEV-001`.

---

## 3. Consulta

| BDD requisito/regla | SDD caso/componente | TDD artefacto | API/evento | Test |
| --- | --- | --- | --- | --- |
| CON-P01-06 / BR-CON-001/003 | UC-CON-001 / Inquiries | `RegisterInquiryHandler` | register | TEST-CON-E2E-001 |
| CON-P07 / BR-CON-005 | UC-CON-002 / Inquiries-Fleet | `QuoteHandler` | quote | — |
| CON-P09 / BR-CON-002 | UC-CON-003 / Inquiries | `CloseOrConvertHandler` | close / convert-to-\* | — |

Documento fuente: `TDD-CON-001`.

---

## 4. Reserva

| BDD requisito/regla | SDD caso/componente | TDD artefacto | API/evento | Test |
| --- | --- | --- | --- | --- |
| RES-P09/BR-RES-001 | UC-RES-002 / Reservations-Payments | `RegisterPaymentHandler` | register-payment | — |
| RES-P10/BR-RES-009 (corregido 31 ago — bloqueo atómico, sin provisión previa) | UC-RES-002 / Reservations-Fleet | `ConfirmReservationHandler`, `vehicle_commitments` exclusion | confirm / `ReservaConfirmada` | TEST-RES-INT-001, CONC-001, TEST-RES-UNIT-002 |
| RES-P04/P08 / BR-RES-006 | UC-RES-002 / Evidence-Reservations | `reservation_acceptances` | — / evidencia validada | TEST-RES-E2E-002 |
| Excepción / BR-RES-003 (confirmado 31 ago, OQ-RES-105) | UC-RES-003 / Reservations-Payments | `CancelReservationHandler` | cancel / `ReservaCancelada` | TEST-RES-UNIT-004 |
| RES-P13-16 / BR-RES-007 | UC-RES-004 / Reservations-Payments | `reservation_resolutions` | resolve-sale | — |
| BR-RES-002 | UC-RES-005 / Reservations-Rentals | `ConvertReservationHandler` | convert / `ReservaConvertida` | Contract/E2E |
| BR-RES-004 (nunca pasa por notaría) | Reservations | — sin artefacto TDD dedicado — invariante de dominio, ningún endpoint de notaría existe en `reservations` | — | `@SC-RES-002` (BDD) |
| BR-RES-005 (determinar modalidad) | Reservations | `CreateReservationHandler` (campo `channel_mode`) | create | — |
| BR-RES-008 (variantes de conductor en Reserva) | Reservations | — sin artefacto TDD dedicado — mismo catálogo que `BR-ALQ-015`, sin implementar en Reserva | — | — |

Documento fuente: `TDD-RES-001`.

### 4.1 Nota de corrección (31 ago)

El documento consolidado v1.0 trazaba `RES-P06.1` (bloqueo provisional) como un artefacto separado (`CreateReservationHandler` + `vehicle_commitments` en `ACTIVE`, luego confirmación aparte). Esa fila se retira: `RES-P06.1` nunca fue una regla vigente del BDD (se agregó y retiró el mismo día, 27 ago) y el 31 de agosto se reafirmó su ausencia al resolver OQ-RES-105. La fila correcta es la de `RES-P09/RES-P10 → BR-RES-009` de la tabla de arriba, con un único artefacto (`ConfirmReservationHandler`) que valida ambos requisitos y crea el compromiso directamente en `CONSOLIDATED`.

---

## 5. Reclutamiento y Selección

| BDD requisito/regla | SDD caso/componente | TDD artefacto | API/evento | Test |
| --- | --- | --- | --- | --- |
| REC-P01-02 / BR-REC-008 | UC-REC-001 / Recruitment | `RegisterVacancyHandler` | — | — |
| REC-P07-10 / BR-REC-003 | UC-REC-003 / Recruitment | `DecideCandidateHandler` | decide / `CandidatoSeleccionado` | TEST-REC-UNIT-001 |
| REC-P11-13 / BR-REC-005 | UC-REC-004 / Recruitment-HR-Administration | `Employee` creado en `PERIODO_PRUEBA` | — / `PersonalIncorporado` | — |
| REC-P14-15 / BR-REC-005 | UC-REC-005 / Recruitment-HR-Administration | Transición `PERIODO_PRUEBA` → `PLANILLA` | — / `PasoAPlanilla` | — |
| BR-REC-001 (Reclutamiento y ADP separados) | Recruitment | — sin artefacto TDD dedicado — principio estructural, ver `ADR-KAI-006` | — | — |
| BR-REC-002 (Talento Humano en las 4 empresas) | Recruitment | — sin artefacto TDD dedicado — alcance multiempresa | — | — |
| BR-REC-004 (personal mecánico se recluta distinto) | Recruitment | `RegisterCandidateHandler` (variante) | register-candidate | — |
| BR-REC-006 (Plan de Talento Humano, TO-BE) | Recruitment | — sin artefacto TDD dedicado — fuera del MVP, meta Q1 2027 | — | — |
| BR-REC-007 (definición "Gerencia y Subgerencia") | Recruitment | — sin artefacto TDD dedicado — aclaración terminológica | — | — |
| BR-REC-009 (contrato notariado, personal mecánico) | Recruitment | `OnboardEmployeeHandler` (variante) | onboard | — |

Documento fuente: `TDD-REC-001`.

---

## 6. Administración de Personal

| BDD requisito/regla | SDD caso/componente | TDD artefacto | API/evento | Test |
| --- | --- | --- | --- | --- |
| ADP-P01-04 / BR-ADP-001 | UC-ADP-001 / HR-Administration | Cálculo de descuento a fin de mes | — | — |
| ADP-P09-10 / BR-ADP-002 | UC-ADP-003 / HR-Administration | `vacations` EXCLUDE constraint | — | TEST-ADP-INT-001 |
| ADP-P12-14 / BR-ADP-004/005 (confirmada 31 ago, sin 4to nivel) | UC-ADP-004 / HR-Administration | `field_trips` cascada, `field_trip_level_max_3` | — | TEST-ADP-E2E-001 |
| ADP-P15-17 / BR-ADP-006 | UC-ADP-005 / HR-Administration-Recruitment | `EmploymentTermination` | — / `RelacionLaboralTerminada` | TEST-ADP-INT-002 |
| ADR-KAI-006 | Transversal | Sin FK directa entre módulos | `RelacionLaboralTerminada` | TEST-ADP-INT-002 |
| BR-ADP-003 (autorización exclusiva de permisos) | HR-Administration | `AuthorizeLeaveHandler` | authorize-leave | — |
| BR-ADP-007 (Evaluación de Desempeño, TO-BE) | HR-Administration | — sin artefacto TDD dedicado — fuera del MVP explícitamente | — | — |
| BR-ADP-008 (capacitación parcial real) | HR-Administration | — sin artefacto TDD dedicado — práctica informal, sin rama de decisión | — | — |

Documento fuente: `TDD-ADP-001`.

---

## 7. Resumen numérico (corregido — de 29 a las 70 reglas completas)

Conteo automático (expandiendo referencias combinadas tipo `BR-ALQ-003/004`): **70 de 70 reglas del BDD aparecen en esta matriz.** Las reglas sin artefacto TDD propio quedan marcadas explícitamente "sin artefacto TDD dedicado" con su justificación (regla contractual simple, principio estructural, o fuera del MVP) — nunca como celda vacía sin explicar.

| Proceso | Reglas BDD | Con artefacto TDD | Sin artefacto (justificado) |
| --- | --- | --- | --- |
| Transversal | 12 | 7 | 5 |
| Alquiler | 16 | 9 | 7 |
| Devolución | 11 | 9 | 2 |
| Consulta | 3 | 3 | 0 |
| Reserva | 9 | 6 | 3 |
| Reclutamiento y Selección | 9 | 5 | 4 |
| Administración de Personal | 8 | 6 | 2 |
| **Total** | **70** (algunas comparten fila) | — | — |

---

## 8. Hallazgos y correcciones incorporadas el 31 de agosto de 2026

| Cambio | Proceso | Documento fuente afectado |
| --- | --- | --- |
| Se retira el modelo de "bloqueo provisional (RES-P06.1)" — nunca fue una regla vigente; el bloqueo es siempre atómico | Reserva | `TDD-RES-001`: estados, tabla `reservations`, transacción de confirmación, contrato HTTP |
| BR-DEV-006 confirmada: no existe cálculo interno de precio técnico, siempre informe externo de Motrix | Devolución | `TDD-DEV-001`: `damage_assessments` con `origin`/`external_report_reference`, nuevo error `TECHNICAL_DAMAGE_REQUIRES_EXTERNAL_REPORT` |
| BR-DEV-011 nueva: cargo por días de paralización | Devolución | `TDD-DEV-001`: nueva tabla `immobilization_charges`, nuevo handler, nueva transacción, nuevo endpoint |
| BR-DEV-008 confirmada: semáforo de riesgo sin rehabilitación | Devolución | `TDD-DEV-001`: invariante de solo-avance en `risk_status` |
| BR-ADP-004 confirmada: sin 4to nivel de autorización automático | Administración de Personal | `TDD-ADP-001`: constraint `field_trip_level_max_3`, estado `NO_AUTORIZADA` como terminal del comando automatizado |
| OQ-SOL-007 resuelto: ventana operativa 8am-5pm | Transversal | `TDD-KAIROS-TRANSVERSAL.md`: sección 9.3 y OQ-TDD-003 |

---

## Anexo A — Frontera de artefactos

Ver `TDD-KAIROS-TRANSVERSAL.md`, Anexo A, para la lista completa de artefactos que deben vivir fuera de este Markdown (OpenAPI, schemas de eventos, migraciones SQL, Terraform, dashboards, tests, runbooks).
