# Trazabilidad — FLO-01 Gestión de Flota Vehicular (Frontend)

**Fecha:** 2026-10-01  
**UX-ID:** FLO-01 (alias informal: FLOTA-01)  
**Rama mergeada:** `feat/fleet-gcs-photo-upload` → `main` (2026-10-01)  
**Actualización:** 2026-10-01 — BDD/SDD/TDD específicos creados (BRECHA-FLOTA-01 cerrada); PROTO-ID APPROVED para FLEET_OPERATOR_LIST registrado (BRECHA-FLOTA-04 cerrada).

---

## 1. Cadena de trazabilidad

| Eslabón | Referencia | Estado |
|---------|-----------|--------|
| **BDD** | `docs/sources/bdd/bdd-fleet.md` v1.0 (BR-FLT-001..009, SC-FLT-001..010) | APROBADO — 2026-10-01 |
| **SDD** | `docs/sources/sdd/sdd-fleet.md` v1.0 | APROBADO — 2026-10-01 |
| **TDD** | `docs/sources/tdd/tdd-fleet.md` v1.0 (TDD-FLT-ADR-001..004) | APROBADO — 2026-10-01 |
| **UX-ID** | FLO-01 | Registrado |
| **PROTO-ID (READY)** | `PROTO-FLO-01-CATALOGO-DISPONIBILIDAD-FLOTA` — screen_state: READY | APPROVED |
| **PROTO-ID (FLEET_OPERATOR_LIST)** | `PROTO-FLO-01-GESTION-FLOTA-OPERADOR` — screen_state: FLEET_OPERATOR_LIST | APPROVED — 2026-10-01 |
| **OpenAPI** | `packages/contracts/openapi/fleet.yaml` v0.2.0 | Contrato vigente |
| **Código** | `src/app/fleet/` (FleetListScreen, useFleetList, NewVehicleModal, fleet-client) | Implementado |
| **Pruebas** | `FleetListScreen.test.tsx`, `fleet-client.test.ts` | 22/22 passing |
| **Evidencia** | `artifacts/evidence/fleet/fleet-gcs-upload-evidence.md` | Registrada |

---

## 2. Archivos del módulo fleet (frontend)

| Archivo | Propósito |
|---------|-----------|
| `src/app/fleet/FleetListScreen.tsx` | Pantalla principal de gestión de flota |
| `src/app/fleet/FleetListScreen.test.tsx` | Tests de componente (10 tests) |
| `src/app/fleet/useFleetList.ts` | Hook de estado (TanStack Query v5) |
| `src/app/fleet/NewVehicleModal.tsx` | Modal de alta/edición (RHF + Zod) |
| `src/app/fleet/fleet-client.ts` | Cliente HTTP generado desde OpenAPI fleet |
| `src/app/fleet/fleet-client.test.ts` | Tests del cliente (11 tests) |
| `src/app/fleet/useWorkContextForFleet.ts` | Resolución de contexto empresa/sede |
| `src/app/fleet/FleetListScreen.module.css` | Estilos CSS Modules |
| `src/app/fleet/NewVehicleModal.module.css` | Estilos CSS Modules modal |

---

## 3. Reglas de negocio cubiertas

| Regla | Test |
|-------|------|
| Listar flota filtrada por empresa y sede | `listVehicles` con `companyId`/`branchId` |
| Registrar vehículo con idempotencia | `createVehicle` con `Idempotency-Key` |
| Foto: MIME jpeg/webp únicamente | `handleFileChange` validación + `resolvePhotoUrl` guard |
| Foto: máximo 12 MB (SDD-00 §16.5) | `handleFileChange` validación tamaño |
| Flujo GCS: session → upload → objectUrl | Test integrado en `FleetListScreen.test.tsx` |
| Cambio de estado desde tabla | `updateVehicleStatus` PATCH |
| Filtro por estado con debounce 400ms | Test debounce en `FleetListScreen.test.tsx` |
| Estado FORBIDDEN en 401/403 | Test en `FleetListScreen.test.tsx` |

---

## 4. Stack utilizado

| Capa | Tecnología |
|------|-----------|
| Server state | TanStack Query v5 (`useQuery` + `useMutation`) |
| Formulario | React Hook Form v7 + `zodResolver` |
| Validación | Zod v3 (`z.string().refine()` para campos numéricos) |
| Cliente HTTP | `fleet-client.ts` (generado desde OpenAPI) |
| Tests | Vitest + Testing Library + MSW v2 (`setupServer` en `fleet-client.test.ts`) |

---

## 5. Brechas y deuda técnica

| ID | Descripción | Severidad |
|----|-------------|-----------|
| BRECHA-FLOTA-01 | ~~No hay BDD/SDD/TDD específico del módulo fleet~~ | **Resuelto 2026-10-01** — bdd-fleet.md, sdd-fleet.md, tdd-fleet.md creados |
| BRECHA-FLOTA-02 | `fleet-client.test.ts` migrado a MSW v2 | **Resuelto 2026-10-01** |
| BRECHA-FLOTA-03 | Test de `updateVehicle` añadido | **Resuelto 2026-10-01** |
| BRECHA-FLOTA-04 | ~~Sin PROTO-ID APPROVED vigente para FLEET_OPERATOR_LIST~~ | **Resuelto 2026-10-01** — PROTO-FLO-01-GESTION-FLOTA-OPERADOR registrado (1440×1024 desktop, APPROVED) |
