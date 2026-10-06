# Trazabilidad — Módulo Devoluciones (PR #65 Frontend)

**PR:** feature/returns-module-web → develop  
**Fecha:** 2026-10-06  
**Alcance:** DEV-01, DEV-02, DEV-03, DEV-04, DEV-05, DEV-06, DEV-07, DEV-08, DEV-09, DEV-10

---

## Cadena de trazabilidad

| Capa | Referencia | Estado |
|------|-----------|--------|
| BDD | BDD-KAIROS-MVP-004-DEV (docs/sources/bdd/BDD-04-devolucion.md) | CURRENT |
| SDD | SDD-KAIROS-MVP-004-DEV (docs/sources/sdd/SDD-04-devolucion.md) | CURRENT |
| TDD | TDD-KAIROS-MVP-004-DEV (docs/sources/tdd/TDD-04-devolucion.md), TDD-KAIROS-TRANSVERSAL | CURRENT |
| UX/UI | PANTALLAS-V3-B-DEVOLUCION.md (v3.1) | CURRENT |
| OpenAPI | packages/contracts/openapi/returns.yaml v1.1.0 | CURRENT |
| Código | apps/web/src/app/returns/ | IMPLEMENTED |
| API client | apps/web/src/api/returns.generated.ts, apps/web/src/api/returns-api-client.ts | IMPLEMENTED |
| Pruebas | returns-client.test.ts, ReturnsListScreen.test.tsx, return-domain.test.ts, useReturnFlow.test.tsx | PARTIAL |
| Evidencia | artifacts/evidence/returns/PR65-evidence.md | REGISTERED |

---

## Mapa UX-ID → Componente → PROTO-ID

| UX-ID | Nombre | Componente(s) principales | PROTO-IDs aprobados |
|-------|--------|--------------------------|---------------------|
| DEV-01 | Bandeja de Devoluciones | ReturnsListScreen.tsx | PROTO-DEV-01-BANDEJA (desktop) |
| DEV-02 | Recepción Provisional | ReceptionScreen.tsx | PROTO-DEV-02-RECEPCION-POR-TERCERO (desktop) |
| DEV-03 | Alcoholímetro de Salida | AlcoholTestScreen.tsx, ReceptionAlcohol.test.tsx | PROTO-DEV-03-DESFAVORABLE, PROTO-DEV-03-RECEPCION-DEV-0456 |
| DEV-04 | Checklist de Recepción (offline) | ChecklistScreen.tsx | PROTO-DEV-04-CHECKLIST-RECEPCION-CONFIRMADO-POR-SERVIDOR-MOVIL, PROTO-DEV-04-CHECKLIST-RECEPCION-CONFIRMADO-POR-SERVIDOR-DESKTOP, PROTO-DEV-04-CHECKLIST-RECEPCION-SIN-CONEXION-MOVIL |
| DEV-05 | Resultado de Inspección | ResultScreen.tsx | **PROTO-DEV-05-RESULTADO-INSPECCION** (PENDING_APPROVAL) — referencia visual: PROTO-ALQ-09-RESULTADO-ZONA-1-EXTERIOR, PROTO-ALQ-10-RESULTADO-TRAS-CHECKLIST. Ver DEC-DEV-05-001. |
| DEV-06 | Evaluación de Daño (severo) | DamageSeverityScreen.tsx, DamageLog.tsx | PROTO-DEV-06-EVALUACION-DE-DANO-DEV-0456, PROTO-DEV-06-MODAL-DANO-GRAVE-LISTA-ROJA-BR-DEV-008 |
| DEV-07 | Daño Estético por Tarifario | CosmeticDamageScreen.tsx | PROTO-DEV-07-DANO-ESTETICO-DEV-0456 |
| DEV-08 | Daño Técnico + Cargo por Paralización | TechnicalDamageScreen.tsx | PROTO-DEV-08-CARGO-POR-PARALIZACION-24H, PROTO-DEV-08-DANO-TECNICO-DEV-0456 |
| DEV-09 | Cierre Financiero de Garantía | GuaranteeScreen.tsx | PROTO-DEV-09-GARANTIA (ver manifest) |
| DEV-10 | Cierre y Archivo del Expediente | ClosureScreen.tsx | PROTO-DEV-10-CIERRE-Y-EXPEDIENTE-DEV-0456 |

---

## Mapa OpenAPI → Función cliente → UX-ID

| Operación OpenAPI (returns.yaml v1.1.0) | Función en returns-client.ts | UX-ID |
|-----------------------------------------|------------------------------|-------|
| GET /returns | listReturns | DEV-01 |
| POST /returns (createReturn) | scheduleReturn | DEV-01 |
| POST /returns/receive-provisional | receiveProvisional | DEV-02 |
| GET /returns/{id} | getReturn | DEV-01..10 |
| POST /returns/{id}/commands/register-alcohol-test | registerReturnAlcoholTest | DEV-03 |
| POST /returns/{id}/commands/resolve-alcohol-escalation | resolveAlcoholEscalation | DEV-03 |
| POST /returns/{id}/commands/complete-inspection | completeInspection | DEV-04/05 |
| GET /returns/cosmetic-tariff | getCosmeticTariff | DEV-07 |
| POST /returns/{id}/commands/assess-damage | assessDamage | DEV-06/07/08 |
| POST /returns/{id}/commands/charge-immobilization | chargeImmobilization | DEV-08 |
| POST /returns/{id}/commands/close-financial | closeFinancial | DEV-09 |
| POST /returns/{id}/commands/close | closeReturn | DEV-10 |
| POST /returns/{id}/evidence/upload-url | requestReturnEvidenceUploadSession | DEV-04/TR-08 |
| POST /returns/{id}/evidence | recordReturnEvidence | DEV-04/TR-08 |
| GET /returns/{id}/evidence | listReturnEvidence | DEV-04/TR-08 |

---

## Estado de pruebas

| Archivo de prueba | Cobertura | Estado |
|-------------------|-----------|--------|
| returns-client.test.ts | Todas las funciones del cliente HTTP (DEV-01..10 + evidencia) | EJECUTADO (ver PR65-evidence.md) |
| ReturnsListScreen.test.tsx | DEV-01 — bandeja, filtros, estados de carga/error/vacío | EJECUTADO |
| return-domain.test.ts | Lógica de dominio y reglas de negocio | EJECUTADO |
| useReturnFlow.test.tsx | Flujo del hook de estado de la devolución | EJECUTADO |
| ChecklistResult.test.tsx | DEV-04 — resultado del checklist | EJECUTADO |
| DamageScreens.test.tsx | DEV-06/07/08 — pantallas de daño | EJECUTADO |
| ReceptionAlcohol.test.tsx | DEV-03 — alcoholímetro | EJECUTADO |
| GuaranteeClosure.test.tsx | DEV-09/10 — garantía y cierre | EJECUTADO |

---

## Pendientes de cierre

- P0-1 (parcialmente resuelto): PROTO-DEV-05-RESULTADO-INSPECCION registrado con PENDING_APPROVAL. Requiere aprobación formal de PRODUCTO.
- P1: Cobertura E2E Playwright del flujo completo DEV-01..10 pendiente.
- P1: Viewports desktop no cubiertos para DEV-02, DEV-05, DEV-06, DEV-07.
