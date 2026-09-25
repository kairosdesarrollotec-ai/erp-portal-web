# SDD — 07 Trazabilidad

# SDD-KAIROS-TRACEABILITY — Matriz de trazabilidad consolidada

**Código:** SDD-KAIROS-MVP-002 / TRACEABILITY **Versión:** 2.1 — corregido 02 sep 2026 (hallazgo P0-02: completadas las 43 reglas que faltaban, de 27 a las 70 trazadas) **Estado:** DRAFT COMPLETE — candidato a revisión arquitectónica, no aprobado **Contenido:** Trazabilidad completa (regla BDD → dato → caso de uso → componente → operación/evento → refinamiento TDD) de los 6 procesos, consolidada en un solo lugar — mismo criterio ya aplicado en `BDD-KAIROS-TRACEABILITY.md` **Fecha:** 02 de septiembre de 2026

> Cada fila de esta matriz también vive, de forma no autoritativa, en la sección 27 del `SDD-XXX-001` correspondiente a su proceso. Ante cualquier diferencia entre este documento y el SDD de proceso, prevalece el SDD de proceso — este documento es una vista consolidada para auditoría y reportes, no una fuente adicional.

---

## 0. Transversal (12 reglas — nueva sección, hallazgo P0-02 de la auditoría independiente al SDD)

> Igual que se hizo en `BDD-KAIROS-TRACEABILITY.md`, las 12 reglas `BR-ORG-*`/`BR-INS-*`/`BR-DOC-*` nunca tuvieron una fila propia en esta matriz — quedaban implícitas dentro de casos de uso de proceso (ej. `UC-ALQ-005`) sin trazarse por su propio ID. Se consolidan aquí.

| Regla BDD | Dato (BDD) | Caso de uso (SDD) | Componente | Operación/evento | Refinamiento TDD |
| --- | --- | --- | --- | --- | --- |
| BR-ORG-001 (4 empresas de KAIROS) | — | — (alcance, sección 3.1 de `SDD-KAIROS-TRANSVERSAL`) | Organization | — | — |
| BR-ORG-002 (aislamiento multiempresa, **Crítica**) | — | — (principio transversal, sección 14) | Todos los módulos, vía RLS + `company_id` | — | `TEST-*-SEC-001` (prueba negativa de acceso cruzado, en cada TDD de proceso) |
| BR-ORG-003 (personal polivalente) | — | — (DR-KAI-008, sección 4) | IAM | — | — |
| BR-INS-001 (30+15 min de inspección) | — | UC-ALQ-005 (`SDD-ALQ-001`) | Rentals/Inspections | — | NFR-BIZ-001/002, `SDD-ALQ-001` sección 19 |
| BR-INS-002 (3 videos independientes) | DAT-ALQ-007 | UC-ALQ-005 | Evidence | — | NFR-BIZ-006/007 |
| BR-INS-003 (duración \~7-8 min por video) | DAT-ALQ-007 | UC-ALQ-005 | Evidence | — | NFR-BIZ-006/007 |
| BR-INS-004 (35 fotos) | DAT-ALQ-006 | UC-ALQ-005 | Evidence | — | NFR-BIZ-006/007 |
| BR-INS-005 (FIV vs. FCKE) | — | — sin caso de uso dedicado — distinción de formato físico, no genera rama lógica en el sistema | Inspections | — | — |
| BR-INS-006 (excepción inspección \<30 min) | — | — sin caso de uso dedicado — principio transversal de excepciones (sección 11 de `SDD-KAIROS-TRANSVERSAL`) | Inspections | — | — |
| BR-DOC-001 (partida doble) | — | UC-ALQ-005 (archivo del expediente) | Rentals | — | — |
| BR-DOC-002 (una sola versión vigente, **Crítica**) | — | UC-ALQ-004 | Rentals (`contract_templates`) | `PoliticaOTarifaActualizada` | `contract_templates_active_idx` (TDD-ALQ-001) |
| BR-DOC-003 (plantilla única por combinación) | DAT-ALQ-005 | UC-ALQ-004 | Rentals/Payments | `ContratoFirmado` | TDD, sección 9.12 |

Documento fuente: `SDD-KAIROS-TRANSVERSAL.md`.

---

## 1. Alquiler

| Regla BDD | Dato (BDD) | Caso de uso (SDD) | Componente | Operación/evento | Refinamiento TDD |
| --- | --- | --- | --- | --- | --- |
| BR-ALQ-005 | DAT-ALQ-002 | UC-ALQ-002 | Rentals | OP-ALQ-002 | TDD, sección 9.13 |
| BR-ALQ-003/004 | DAT-ALQ-003/004 | UC-ALQ-003 | Rentals/Fleet/Customers | OP-ALQ-003, `ExcepcionNotarialAprobada` | TDD, secciones 9.5 y 9.11 |
| BR-DOC-003 | DAT-ALQ-005 | UC-ALQ-004 | Rentals/Payments | OP-ALQ-004, `ContratoFirmado`/`PagoRegistrado` | TDD, sección 9.12 |
| BR-INS-001/002/004 | DAT-ALQ-006/007 | UC-ALQ-005 | Rentals/Inspections/Evidence | OP-ALQ-005, `EntregaCompletada` | TDD, secciones 9.6 y 7.10 |
| BR-ALQ-012/013 | DAT-ALQ-009 | UC-ALQ-006 | Rentals/Payments | OP-ALQ-006/007 | — |
| BR-ALQ-001 (cliente antiguo, \>2 alquileres) | DAT-ALQ-004 | UC-ALQ-003 (dato usado para tercera vía) | Customers | — | — |
| BR-ALQ-002 (empresa paga notaría, **Crítica**) | — | UC-ALQ-003 | Payments (garantiza que `payments.source != CUSTOMER` para el trámite notarial) | `ExcepcionNotarialAprobada` | TEST-ALQ-UNIT-004 |
| BR-ALQ-006 (km incluidos plan Normal) | DAT-ALQ-001 | — sin caso de uso dedicado — parámetro del tarifario de Fleet | Fleet | — | — |
| BR-ALQ-007 (velocidad máxima 100 km/h) | — | — sin caso de uso dedicado — cláusula contractual, validación de campo | Rentals (contrato) | — | — |
| BR-ALQ-008 (restricción geográfica) | — | — sin caso de uso dedicado — cláusula contractual, validación de campo | Rentals (contrato) | — | — |
| BR-ALQ-009 (notaría "sorpresa") | — | UC-ALQ-004 (momento de la divulgación, al formalizar) | Rentals | — | — |
| BR-ALQ-010 (GPS obligatorio antes de alquilar) | — | — sin caso de uso dedicado — precondición de Fleet, no de Alquiler | Fleet | — | — |
| BR-ALQ-011 (medios de pago aceptados) | — | UC-ALQ-004 | Payments | `PagoRegistrado` | — |
| BR-ALQ-014 (autorización de respaldo, 5 min) | — | — sin caso de uso dedicado — mismo patrón de cascada que `UC-ADP-004` en Administración de Personal, sin UC propio en Alquiler | Rentals | — | — |
| BR-ALQ-015 (variantes de conductor) | — | UC-ALQ-001 (rol de firmante) | Rentals | — | — |
| BR-ALQ-016 (RENIEC/MTC no responde) | — | UC-ALQ-001 (contingencia de verificación) | Customers | — | `@SC-ALQ-006` (BDD), sin prueba TDD dedicada todavía |

Documento fuente: `SDD-ALQ-001`.

---

## 2. Devolución

| Regla BDD | Dato (BDD) | Caso de uso (SDD) | Componente | Operación/evento | Refinamiento TDD |
| --- | --- | --- | --- | --- | --- |
| BR-DEV-004/005 | DAT-DEV-001/002 | UC-DEV-001 | Returns | OP-DEV-001 | TDD, sección 9.13 |
| BR-DEV-006 (confirmada 31 ago) | DAT-DEV-004 | UC-DEV-003 | Returns/Incidents/Maintenance | OP-DEV-003, `DevolucionCompletada` | — |
| BR-DEV-011 (nueva, 31 ago) | DAT-DEV-008 | UC-DEV-004 | Returns/Payments | OP-DEV-005, `PagoAjustado` | — |
| BR-DEV-001/002 | — | UC-DEV-005 | Returns/Payments | OP-DEV-004/006 | TDD, sección 9.14 |
| BR-DEV-008 (confirmada 31 ago) | — | — | Customers | `ClienteClasificado` | TDD, sección 30 |
| NFR-KAI-008 | — | UC-DEV-003 | Payments | `INCIDENT_STILL_OPEN` | TDD, sección 30 |
| BR-DEV-003 (tolerancia 30 min) | — | UC-DEV-001 | Returns | — | — |
| BR-DEV-007 (José Pariona clasifica gravedad) | DAT-DEV-003 | UC-DEV-003 | Incidents | — | — |
| BR-DEV-009 (documento de responsabilidad) | DAT-DEV-005 | UC-DEV-002 | Returns | — | — |
| BR-DEV-010 (acta de garantía opcional) | DAT-DEV-006 | UC-DEV-005 | Payments | — | — |

Documento fuente: `SDD-DEV-001`.

---

## 3. Consulta

| Regla BDD | Dato (BDD) | Caso de uso (SDD) | Componente | Operación/evento | Refinamiento TDD |
| --- | --- | --- | --- | --- | --- |
| BR-CON-003 | — | UC-CON-001 | Inquiries | OP-CON-001 | TDD, sección 9.1 |
| BR-CON-004 | DAT-CON-002 | UC-CON-001 | Inquiries | OP-CON-003 | — |
| BR-CON-005 | DAT-CON-003 | UC-CON-002 | Inquiries/Fleet | OP-CON-002 | TDD, sección 9.2 |
| BR-CON-002 | DAT-CON-005 | UC-CON-003 | Inquiries | OP-CON-004 | — |
| BR-CON-001 (Consulta es proceso separado) | — | — sin caso de uso dedicado — principio estructural, ver módulo `Inquiries` independiente de `Reservations`/`Rentals` (sección 8.1 de `SDD-KAIROS-TRANSVERSAL`) | Inquiries | — | — |

Documento fuente: `SDD-CON-001`.

---

## 4. Reserva

| Regla BDD | Dato (BDD) | Caso de uso (SDD) | Componente | Operación/evento | Refinamiento TDD |
| --- | --- | --- | --- | --- | --- |
| BR-RES-001 | DAT-RES-003 | UC-RES-002 | Reservations/Payments | OP-RES-001, `ReservaConfirmada` | TDD, sección 9.3 |
| BR-RES-003 (confirmada 31 ago, OQ-RES-105) | DAT-RES-007 | UC-RES-003 | Reservations/Payments | OP-RES-002 | TDD, sección 9.4 |
| BR-RES-007 | — | UC-RES-004 | Reservations/Payments | OP-RES-003 | — |
| BR-RES-002 | — | UC-RES-005 | Reservations/Rentals | OP-RES-004, `ReservaConvertida` | TDD, sección 9.10 |
| NFR-KAI-001 | — | UC-RES-002 | Fleet | `VEHICLE_NOT_AVAILABLE` | TDD, sección 7.5 (exclusión) |
| BR-RES-004 (nunca pasa por notaría) | — | — sin caso de uso dedicado — invariante de dominio (sección 7.3, punto 3 de `SDD-RES-001`) | Reservations | — | `@SC-RES-002` (BDD) |
| BR-RES-005 (determinar modalidad) | DAT-RES-001/002 | UC-RES-001 | Reservations | — | — |
| BR-RES-006 (modalidad remota exige video+documento) | DAT-RES-004/005 | UC-RES-001/UC-RES-002 | Reservations/Evidence | — | — |
| BR-RES-008 (variantes de conductor aplican en Reserva) | — | — sin caso de uso dedicado — mismo catálogo que `BR-ALQ-015`, sin UC propio en Reserva | Reservations | — | — |
| BR-RES-009 (bloqueo registrado interno y externo) | DAT-RES-007 | UC-RES-002 | Reservations/Fleet | `ReservaConfirmada` | TDD, sección 9.3 |

Documento fuente: `SDD-RES-001`.

### 4.1 Nota sobre preguntas de negocio relacionadas

> ✅ Corregido 02 sep 2026 (hallazgo P0-01) — ver la nota completa en `SDD-RES-001`, sección 27.1: el no-show ocurre sobre una reserva confirmada con `VehicleCommitment` ya creado, no sobre un `VehicleHold` provisional (esa entidad no existe). OQ-RES-102 sigue siendo relevante para el mecanismo de cancelación por no-show, no para un vencimiento automático de bloqueo.

---

## 5. Reclutamiento y Selección

| Regla BDD | Dato (BDD) | Caso de uso (SDD) | Componente | Operación/evento | Refinamiento TDD |
| --- | --- | --- | --- | --- | --- |
| BR-REC-008 | DAT-REC-001 | UC-REC-001 | Recruitment | OP-REC-001 | — |
| BR-REC-003 | DAT-REC-005 | UC-REC-003 | Recruitment | OP-REC-003, `CandidatoSeleccionado` | — |
| BR-REC-009 | DAT-REC-006 | UC-REC-004 | Recruitment/HR-Administration | OP-REC-004 | — |
| BR-REC-005 | DAT-REC-008 | UC-REC-005 | Recruitment/HR-Administration | OP-REC-005 | — |
| BR-REC-006 | — | Todos (`UC-REC-*`) | Recruitment | — | Nota: DR-KAI-012 (transversal) |
| BR-REC-001 (Reclutamiento y ADP separados) | — | — sin caso de uso dedicado — principio estructural, ver `ADR-KAI-006` | Recruitment | — | — |
| BR-REC-002 (Talento Humano aplica a las 4 empresas) | — | — sin caso de uso dedicado — regla de alcance multiempresa | Recruitment | — | — |
| BR-REC-004 (personal mecánico se recluta distinto) | — | UC-REC-002 (variante) | Recruitment | — | — |
| BR-REC-007 (definición "Gerencia y Subgerencia") | — | — sin caso de uso dedicado — aclaración terminológica, no genera comportamiento distinto | Recruitment | — | — |

Documento fuente: `SDD-REC-001`.

---

## 6. Administración de Personal

| Regla BDD | Dato (BDD) | Caso de uso (SDD) | Componente | Operación/evento | Refinamiento TDD |
| --- | --- | --- | --- | --- | --- |
| BR-ADP-001 | DAT-ADP-002/003 | UC-ADP-001 | HR-Administration | OP-ADP-002 | — |
| BR-ADP-003 | — | UC-ADP-002 | HR-Administration | OP-ADP-003 | — |
| BR-ADP-002 | DAT-ADP-004 | UC-ADP-003 | HR-Administration | OP-ADP-004, `VACATION_OVERLAP` | TDD, tabla `vacations` con `EXCLUDE` |
| BR-ADP-004/005 (confirmada 31 ago, sin 4to nivel) | DAT-ADP-005/006 | UC-ADP-004 | HR-Administration | OP-ADP-005/006, `NO_AUTHORIZATION_AVAILABLE` | — |
| BR-REC-008 | DAT-ADP-007 | UC-ADP-005 | HR-Administration/Recruitment | OP-ADP-007, `RelacionLaboralTerminada` | ADR-KAI-006 |
| BR-ADP-006 (renuncia/despido) | DAT-ADP-007 | UC-ADP-005 | HR-Administration | OP-ADP-007 | — |
| BR-ADP-007 (Evaluación de Desempeño, TO-BE) | DAT-ADP-008 | — sin caso de uso dedicado — fuera del MVP explícitamente (sección 3.2 de `SDD-KAIROS-TRANSVERSAL`) | HR-Administration | — | — |
| BR-ADP-008 (capacitación parcial real) | DAT-ADP-009 | — sin caso de uso dedicado — práctica informal, sin rama de decisión que modelar | HR-Administration | — | — |

Documento fuente: `SDD-ADP-001`.

### 6.1 Nota sobre la brecha AS-IS/Plan formal

Igual que en Reclutamiento, esta trazabilidad documenta el proceso tal como se ejecuta hoy (informal). Las preguntas OQ-REC-101 a 104 y OQ-ADP-101 a 103 no bloquean esta arquitectura — el modelo (DR-KAI-012, transversal) ya contempla evolucionar hacia el Plan de Talento Humano formal sin rediseño, cuando esas preguntas se resuelvan con Fiorella. Todas están `RESUELTO` desde el 31 de agosto de 2026.

---

## 7. Cobertura

> ✅ **Corregido 02 sep 2026 (hallazgo P0-02 de la auditoría independiente al SDD):** esta matriz solo trazaba 27 identificadores únicos de regla de un total de 70 — la afirmación de "trazabilidad completa" no era verificable. Se completaron las 43 filas que faltaban (12 en la nueva sección 0, Transversal; 11 en Alquiler; 4 en Devolución; 1 en Consulta; 5 en Reserva; 4 en Reclutamiento; 3 en Administración de Personal). **Verificado con conteo automático: las 70 reglas del BDD tienen ahora al menos 1 fila en esta matriz.**

Cada regla del BDD (los 6 procesos + el transversal) tiene ahora al menos un caso de uso o una nota explícita de "sin caso de uso dedicado" con su justificación — no quedan reglas sin trazar ni sin explicación. La cobertura **BDD → SDD** es completa en ese sentido literal. La cobertura **SDD → TDD** sigue siendo parcial: muchas celdas de "Refinamiento TDD" muestran "—", y varias reglas simples (contractuales, de tarifario) nunca requerirán un refinamiento TDD propio porque se resuelven como validación de campo, no como lógica de dominio.

**La afirmación correcta:** *trazabilidad BDD→SDD completa para las 70 reglas (con 45 de ellas ligadas a un caso de uso concreto, y 25 documentadas explícitamente como reglas sin rama de decisión — contractuales, estructurales o de parámetro); trazabilidad SDD→TDD parcial.*

### 7.1 Verificación de cobertura (02 sep 2026)

Conteo automático (expandiendo referencias combinadas tipo `BR-ALQ-003/004` a sus 2 IDs): **70 de 70 reglas del BDD aparecen en esta matriz, sin excepción.** De ellas, algunas comparten fila cuando se resuelven juntas en el mismo caso de uso (ej. `BR-ALQ-003/004` en `UC-ALQ-003`), y 28 reglas quedan marcadas explícitamente "sin caso de uso dedicado" con su justificación (regla contractual simple, principio estructural, o parámetro de tarifario sin rama de decisión) — nunca como una celda vacía sin explicar. Las 12 reglas `Crítica` tienen las 12 un caso de uso dedicado.

---

## 8. Hallazgos nuevos de la reunión del 31 de agosto de 2026

Esta matriz incorpora directamente los cambios de la reunión del 31 ago con Fiorella, ya reflejados en los 6 BDD de proceso y sus respectivos SDD:

| Cambio | Fila afectada | Proceso |
| --- | --- | --- |
| OQ-009 `RESUELTO`: no existe tabla técnica de daños, por diseño | Sección 2 (Devolución), BR-DEV-006 | Devolución |
| BR-DEV-011 nueva: cobro de días de paralización | Sección 2 (Devolución), BR-DEV-011 | Devolución |
| OQ-DEV-102 `RESUELTO`: sin rehabilitación del semáforo, por empresa | Sección 2 (Devolución), BR-DEV-008 | Devolución |
| OQ-RES-105 `RESUELTO`: se mantiene la regla tajante de BR-RES-003 | Sección 4 (Reserva), BR-RES-003 | Reserva |
| OQ-ADP-102 revertido a `RESUELTO`: sin 4to nivel automático | Sección 6 (Administración de Personal), BR-ADP-004/005 | Administración de Personal |
| OQ-SOL-007 `RESUELTO`: ventana operativa 8am-5pm confirmada | No aplica a esta matriz de reglas BDD — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 28 | Transversal |
| OQ-CON-101 `RESUELTO` (02 sep, ya no informal) | No genera cambio de regla BDD trazable aquí — ver `SDD-CON-001`, sección 28 | Consulta |

---

## Anexo A — Frontera entre SDD y TDD

Ver `SDD-KAIROS-TRANSVERSAL.md`, Anexo A.
