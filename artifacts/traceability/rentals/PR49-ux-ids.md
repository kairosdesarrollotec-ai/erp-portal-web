# Trazabilidad — Módulo Alquiler (PR #49 Frontend)

**PR:** feature/rentals-wizard → main  
**Fecha:** 2026-09-30  
**Alcance:** ALQ-01, ALQ-02, ALQ-03, ALQ-04, ALQ-07, ALQ-08, ALQ-09 (wizard de entrega 5 etapas)

---

## Cadena de trazabilidad

| Capa | Referencia | Estado |
|------|-----------|--------|
| BDD | BDD-KAIROS-MVP-002-ALQ | CURRENT |
| SDD | SDD-KAIROS-MVP-002-ALQ | CURRENT |
| TDD | TDD-KAIROS-MVP-002-ALQ, TDD-KAIROS-TRANSVERSAL | CURRENT |
| UX/UI | PANTALLAS-V3-B-ALQUILER.md (v3.1) | CURRENT |
| OpenAPI | packages/contracts/openapi/rentals.yaml v1.0.0 | CURRENT |
| Código | apps/web/src/app/rentals/ | IMPLEMENTED |
| Pruebas | Stage1DocumentsScreen.test.tsx, RentalsListScreen.test.tsx, rentals-client.test.ts | PARTIAL |
| Evidencia | artifacts/evidence/rentals/PR49-evidence.md | REGISTERED |

---

## Mapa UX-ID → Componente → PROTO-ID

| UX-ID (manifest) | Nombre ENTREGA | Componente | PROTO-IDs aprobados |
|-----------------|----------------|------------|---------------------|
| ALQ-01 | — | RentalsListScreen.tsx | PROTO-ALQ-01-* (mobile + desktop) |
| ALQ-02 | — | NewRentalScreen.tsx | PROTO-ALQ-02-* (mobile) |
| ALQ-03 | ENTREGA-01 | Stage1DocumentsScreen.tsx | PROTO-ALQ-03-* (mobile x3) |
| ALQ-04 | ENTREGA-02 | Stage2ValidationsScreen.tsx | PROTO-ALQ-04-* (mobile x2) |
| ALQ-07 | ENTREGA-03 (excepción) | Stage3ContractScreen.tsx | PROTO-ALQ-07-* (mobile) |
| ALQ-08 | ENTREGA-03 (garantía/contrato) | Stage3ContractScreen.tsx | PROTO-ALQ-08-* (mobile) |
| ALQ-09 | ENTREGA-04 + ENTREGA-05 | Stage4ChecklistScreen.tsx, Stage5ConfirmationScreen.tsx | PROTO-ALQ-09-* (mobile, múltiples estados) |

> **Nota de nomenclatura:** Los nombres `ENTREGA-01..05` corresponden al lenguaje del documento
> `PANTALLAS-V3-B-ALQUILER.md` (etapas del asistente). Los IDs de manifest (`ALQ-03`, `ALQ-04`,
> `ALQ-07`, `ALQ-08`, `ALQ-09`) son los identificadores autoritativos en `prototype-manifest.yaml`.
> Ambas denominaciones son válidas y coexisten en el código como comentarios.

---

## Pendientes de cierre

- P1: Cobertura de pruebas — Stage2..5 sin tests (ver PR #49 Task #13)
- P1: Viewports desktop no cubiertos en prototype-manifest para ALQ-01 y ALQ-02
- P2: Prueba E2E Playwright del flujo completo pendiente (fuera de alcance de este PR)
