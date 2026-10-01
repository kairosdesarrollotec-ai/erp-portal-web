# Trazabilidad — FLO-02 Detalle de Vehículo (Frontend)

**Fecha:** 2026-10-01  
**UX-ID:** FLO-02  
**Rama:** `feature/flota-clientes-admin-disponible`

---

## 1. Cadena de trazabilidad

| Eslabón | Referencia | Estado |
|---------|-----------|--------|
| **BDD** | `docs/sources/bdd/bdd-fleet.md` v1.0 (BR-FLT-001..009) | approved |
| **SDD** | `docs/sources/sdd/sdd-fleet.md` v1.0 | approved |
| **TDD** | `docs/sources/tdd/tdd-fleet.md` v1.0 | approved |
| **UX-ID** | FLO-02 | Registrado |
| **PROTO-ID (READY)** | `PROTO-FLO-02-DETALLE-MANTENIMIENTO-VEHICULO` — screen_state: READY, desktop 1440x1024 | APPROVED |
| **OpenAPI** | `packages/contracts/openapi/fleet.yaml` v0.2.0 | Contrato vigente |
| **Código** | `src/app/fleet/VehicleDetailScreen.tsx`, `useVehicleDetail.ts` | Implementado |
| **Pruebas** | `VehicleDetailScreen.test.tsx` (9 tests) | Unitarios passing |
| **Evidencia** | Pendiente de registro en `artifacts/evidence/` | — |

---

## 2. Archivos del módulo (frontend)

| Archivo | Propósito |
|---------|-----------|
| `src/app/fleet/VehicleDetailScreen.tsx` | Pantalla detalle de vehículo |
| `src/app/fleet/VehicleDetailScreen.test.tsx` | Tests de componente (9 tests) |
| `src/app/fleet/VehicleDetailScreen.module.css` | Estilos CSS Modules |
| `src/app/fleet/useVehicleDetail.ts` | Hook de estado (TanStack Query v5) |

---

## 3. Prototipos verificados

| PROTO-ID | Estado visual | Viewport | Verificación |
|----------|--------------|----------|-------------|
| `PROTO-FLO-02-DETALLE-MANTENIMIENTO-VEHICULO` | READY | desktop 1440x1024 | Estructura coincide |

---

## 4. Guardas de permisos

- `useRolePermissions` importado: botón "Editar vehículo" condicionado a `can('FLEET', 'WRITE')`.
- Select de cambio de estado `disabled` cuando `!canWrite`.
- Roles con WRITE: GERENCIA, ADMINISTRACION, CAMPO, PLATFORM_ADMIN.
- Backend sigue siendo el enforcement real.

---

## 5. Cobertura pendiente

- No existe prototipo mobile para FLO-02.
- Test de permiso: verificar que botón editar NO se renderiza y select queda disabled cuando `can('FLEET', 'WRITE')` es false.
