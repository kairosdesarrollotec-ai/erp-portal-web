# Trazabilidad PR #68 — Módulo Incidencias Web (INC-01, INC-02)

**PR:** #68 — `feature/incidents-module-web`
**Fecha:** 2026-10-06
**Autor:** RHuamanRamos

---

## Cadena de trazabilidad

| Eslabón | ID / Referencia | Estado |
|---------|-----------------|--------|
| BDD | incidents.yaml v0.1.0 (BR-INC-001..BR-INC-008) | CURRENT |
| SDD | sdd-soporte-incidencias.md | CURRENT |
| TDD | tdd-soporte-incidencias.md | CURRENT |
| UX-ID | INC-01 (Bandeja de Incidencias) | CURRENT |
| UX-ID | INC-02 (Detalle de Incidencia / RIO) | CURRENT |
| UX/UI | v3.1 §5.8 | CURRENT |
| PROTO-ID | PROTO-INC-01-BANDEJA (prototype-manifest.yaml) | APPROVED |
| PROTO-ID | PROTO-INC-02-DETALLE (prototype-manifest.yaml) | APPROVED |
| OpenAPI | incidents.yaml (packages/contracts/openapi/) | CURRENT |
| Cliente generado | src/api/incidents.generated.ts | Generado desde OpenAPI |
| Código | src/app/incidents/ | Implementado |
| Pruebas | src/app/incidents/*.test.tsx | Ver PR #68 |
| Evidencia | artifacts/evidence/incidents/PR68-evidence.md | Presente |

---

## Pantallas implementadas

### INC-01 — Bandeja de Incidencias (`IncidentsListScreen`)

**Archivo:** `apps/web/src/app/incidents/IncidentsListScreen.tsx`

Cubre:
- Estado LOADING (skeleton)
- Estado EMPTY (sin incidencias / sin coincidencias con filtros)
- Estado READY — tabla desktop / tarjetas mobile (CSS)
- Filtros por tipo, severidad y estado
- Acción primaria "Registrar incidencia" (RegisterIncidentDialog)
- Acción "Abrir" por fila (navega a INC-02)
- Acción "Resolver" directo solo para LEVE + ABIERTA (ReasonDialog + If-Match)
- Scope por alquiler/devolución via query params (`?rentalId`, `?returnId`)
- Paginación keyset (loadMore)
- Aislamiento de sede: defensa en profundidad local + backend

**Roles con acceso:** FRONT_OFFICE, CAMPO, GERENCIA, FINANZAS, AUDITORIA, ADMINISTRACION
**Fuente:** UX/UI v3.1 §5.8 INC-01 + incidents.yaml v0.1.0

### INC-02 — Detalle de Incidencia / RIO (`IncidentDetailScreen`)

**Archivo:** `apps/web/src/app/incidents/IncidentDetailScreen.tsx`

Cubre:
- Estado LOADING
- Estado READY — campos del incidente + timeline de acciones
- Estado SAVING (botones deshabilitados durante mutaciones)
- Estado RECOVERABLE_ERROR
- Estado NOT_FOUND
- Historial append-only (solo "Agregar acción")
- "Cerrar incidencia" deshabilitado hasta tener resumen
- "Derivar a vía legal" (ReasonDialog)
- Timeline colapsable en mobile
- Optimistic update via TanStack Query `setQueryData`
- Manejo de conflictos If-Match (409/428 → recarga + aviso)

**Roles con acceso:** FRONT_OFFICE, GERENCIA
**Fuente:** UX/UI v3.1 §5.8 INC-02 + incidents.yaml v0.1.0

---

## Componentes compartidos

| Componente | Descripción |
|-----------|-------------|
| `IncidentDialog` | Modal accesible via @radix-ui/react-dialog (foco atrapado, Escape, aria-modal) |
| `IncidentBadges` | SeverityBadge + IncidentStatusBadge (colores de UX/UI v3.1 §5.8 INC-01) |
| `RegisterIncidentDialog` | Formulario de registro (INC-01) |
| `ReasonDialog` | Diálogo de texto libre (resolver directo, derivar a legal) |
| `useIncidentsList` | Hook de lista con filtros, keyset pagination, replaceIncident |
| `useIncidentDetail` | Hook de detalle con TanStack Query + comandos If-Match |
| `incident-permissions` | Política de roles frontend (espejo de seguridad; auth real en backend) |
| `incident-domain` | Tipos, labels y predicados de dominio |
| `incidents-client` | Cliente generado desde incidents.yaml OpenAPI |
| `incident-errors` | Mapeo de errores HTTP a mensajes de usuario |

---

## Dependencias de PR

- **Requiere PR #57 mergeado** (incidents backend): contrato OpenAPI + endpoints disponibles.

---

## Cambios aplicados durante revisión (PR #68)

| Hallazgo | Acción |
|----------|--------|
| P1: IncidentDialog usaba focus-trap manual | Reemplazado con @radix-ui/react-dialog |
| P1: useIncidentDetail usaba useState/useEffect | Convertido a useQuery + setQueryData |
| P2: Referencias a PANTALLAS-V2-B-SOPORTE.md | Actualizadas a UX/UI v3.1 §5.8 + incidents.yaml v0.1.0 |
| P2: `<table>` sin aria-label | Agregado `aria-label="Listado de incidencias"` |
