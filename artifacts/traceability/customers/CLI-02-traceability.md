# Trazabilidad — CLI-02 Ficha 360 del Cliente (Frontend)

**Fecha:** 2026-10-01  
**UX-ID:** CLI-02  
**Rama:** `feature/flota-clientes-admin-disponible`

---

## 1. Cadena de trazabilidad

| Eslabón | Referencia | Estado |
|---------|-----------|--------|
| **BDD** | `docs/sources/bdd/bdd-clients.md` v1.0 (BR-CLI-001..005) | approved |
| **SDD** | `docs/sources/sdd/sdd-clients.md` v1.0 | approved |
| **TDD** | `docs/sources/tdd/tdd-clients.md` v1.0 | approved |
| **UX-ID** | CLI-02 | Registrado |
| **PROTO-ID (READY)** | `PROTO-CLI-02-FICHA-360-CLIENTE` — screen_state: READY, desktop 1440x1024 | APPROVED |
| **OpenAPI** | `packages/contracts/openapi/customers.yaml` v0.1.0 | Contrato vigente |
| **Código** | `src/app/customers/CustomerDetailScreen.tsx`, `useCustomerDetail.ts` | Implementado |
| **Pruebas** | `CustomerDetailScreen.test.tsx` (11 tests) | Unitarios passing |
| **Evidencia** | Pendiente de registro en `artifacts/evidence/` | — |

---

## 2. Archivos del módulo (frontend)

| Archivo | Propósito |
|---------|-----------|
| `src/app/customers/CustomerDetailScreen.tsx` | Pantalla ficha 360 del cliente |
| `src/app/customers/CustomerDetailScreen.test.tsx` | Tests de componente (11 tests) |
| `src/app/customers/CustomerDetailScreen.module.css` | Estilos CSS Modules |
| `src/app/customers/useCustomerDetail.ts` | Hook de estado (TanStack Query v5) |

---

## 3. Prototipos verificados

| PROTO-ID | Estado visual | Viewport | Verificación |
|----------|--------------|----------|-------------|
| `PROTO-CLI-02-FICHA-360-CLIENTE` | READY | desktop 1440x1024 | Estructura coincide |
| `PROTO-CLI-01-COINCIDENCIA-DNI` | COINCIDENCE | desktop 1440x1024 | Panel de coincidencia en NewCustomerModal |

---

## 4. Guardas de permisos

- `useRolePermissions` importado: botón "Editar datos" condicionado a `can('CUSTOMER', 'WRITE')`.
- Roles con WRITE: GERENCIA, ADMINISTRACION, FRONT_OFFICE, PLATFORM_ADMIN.
- Backend sigue siendo el enforcement real.

---

## 5. Cobertura pendiente

- No existe prototipo mobile para CLI-02.
- Test de permiso: verificar que el botón editar NO se renderiza cuando `can('CUSTOMER', 'WRITE')` es false.
