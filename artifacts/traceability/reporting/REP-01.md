# Trazabilidad Frontend — Módulo Reporting (REP-01)

**Slice:** Reportes — dashboard KPIs operativos y financieros con exportación CSV  
**Branch:** `feature/phase-6-payments-reporting-search`  
**Fecha:** 2026-10-11

---

## Cadena de trazabilidad

```
BDD → SDD → TDD → UX-ID → PROTO-ID → OpenAPI → código → pruebas → evidencia
```

### Fuentes documentales

| Tipo | ID | Archivo |
|---|---|---|
| BDD | BDD-REP-001 | `docs/sources/bdd/bdd-09-reportes.md` |
| SDD | SDD-REP-001 | `docs/sources/sdd/sdd-09-reportes.md` |
| TDD | TDD-REP-001 | `docs/sources/tdd/tdd-09-reportes.md` |
| OpenAPI | OPENAPI-REPORTING-V0.1.0 | `packages/contracts/openapi/reporting.yaml` v0.1.0 |

### Baselines visuales aprobados

| PROTO-ID | UX-ID | Estado | Viewport | Archivo |
|---|---|---|---|---|
| PROTO-REP-01-DASHBOARD-OPERATIVO-DESKTOP | REP-01 | APPROVED | desktop | `docs/prototypes/approved/stitch_veloxrent_prototipo_b/reportes_dashboard_operativo_veloxrent/` |
| PROTO-REP-01-DASHBOARD-FINANCIERO-DESKTOP | REP-01 | APPROVED | desktop | `docs/prototypes/approved/stitch_veloxrent_prototipo_b/reportes_dashboard_financiero_veloxrent/code.html` |

---

## Pantalla implementada

### REP-01 — Dashboard de Reportes

| Ítem | Valor |
|---|---|
| UX-ID | REP-01 |
| Componente | `apps/web/src/app/reporting/ReportsDashboardScreen.tsx` |
| Ruta | `/reportes` |
| Permisos requeridos | `REPORT.READ_OPERATIONAL`, `REPORT.READ_FINANCIAL` |

**Tabs:**
- **Operativo**: KPIs de operaciones (alquileres activos, reservas, devoluciones pendientes, incidentes abiertos, utilización de flota)
- **Financiero**: KPIs financieros (ingresos del período, garantías en custodia, retenciones, tasa de devolución)

**Funcionalidades:**
- Selector de rango de fechas (dateFrom / dateTo)
- Tarjetas KPI con valor principal y descripción
- Exportación CSV por módulo
- Validación BR-REP-005: rango máximo 90 días
- Estados: LOADING, READY, EMPTY, ERROR

---

## Código implementado

| Tipo | Ruta |
|---|---|
| Pantalla | `apps/web/src/app/reporting/ReportsDashboardScreen.tsx` |
| Estilos | `apps/web/src/app/reporting/ReportsDashboardScreen.module.css` |
| Hooks | `apps/web/src/app/reporting/hooks/useReporting.ts` |
| Cliente API generado | `apps/web/src/api/reporting.generated.ts` |
| Cliente API wrapper | `apps/web/src/api/reporting-api-client.ts` |
| Router | `apps/web/src/app/router/router.tsx` (ruta `/reportes`) |
| Módulo nav | `apps/web/src/app/modules/module-definitions.tsx` (entrada reportes habilitada) |

---

## Pruebas

| Tipo | Ruta | Estado |
|---|---|---|
| Componente REP-01 (Vitest + Testing Library) | `apps/web/src/app/reporting/ReportsDashboardScreen.test.tsx` | ✅ 8/8 passing |

### Estados cubiertos — ReportsDashboardScreen

| Estado | Test | Estado |
|---|---|---|
| Tab "Operativo" activo por defecto | aria-selected="true" | ✅ |
| LOADING | Indicador de carga cuando hook reporta isPending | ✅ |
| READY | Tarjetas KPI con valores del hook | ✅ |
| Cambio de tab | Clic "Financiero" conmuta panel activo | ✅ |
| Validación rango >90 días (BR-REP-005) | Muestra alert de rango excedido | ✅ |
| Exportar CSV | Clic botón llama a mutate del hook | ✅ |
| Permisos insuficientes | Muestra "Acceso restringido" | ✅ |
| Sesión vencida / sin usuario | context null → sin crash | ✅ |

---

## Evidencia

- Prototipos aprobados: PROTO-REP-01-DASHBOARD-OPERATIVO-DESKTOP (pre-existente) y PROTO-REP-01-DASHBOARD-FINANCIERO-DESKTOP (creado 2026-10-11, aprobado por PRODUCTO)
- Contrato OpenAPI consumido desde cliente generado
- TypeScript: 0 errores
- Lint: 0 errores

---

## Riesgos y pendientes

| Item | Estado |
|---|---|
| Tests de componente (useReporting hook, estados) | Pendiente |
| Vista cross-company PLATFORM_ADMIN (OQ-REP-001) | Excluido del MVP |
| Ingresos exactos por Rental (OQ-REP-002) | Proxy via RentalDeposit documentado como limitación |
