# Evidencia de implementación PR #68 — Módulo Incidencias Web

**PR:** #68 — `feature/incidents-module-web`
**Fecha:** 2026-10-06
**Revisado:** 2026-10-07

---

## Archivos de prueba

| Archivo | Tipo | Estados cubiertos |
|---------|------|-------------------|
| `IncidentsListScreen.test.tsx` | Vitest + Testing Library + MSW | LOADING, EMPTY, READY, filtros, Resolver directo |
| `IncidentDetailScreen.test.tsx` | Vitest + Testing Library + MSW | LOADING, READY, SAVING, NOT_FOUND, RECOVERABLE_ERROR |
| `RegisterIncidentDialog.test.tsx` | Vitest + Testing Library | Formulario, validación, submit |
| `ReasonDialog.test.tsx` | Vitest + Testing Library | Validación min/max, submit |
| `IncidentBadges.test.tsx` | Vitest + Testing Library | SeverityBadge × 3, StatusBadge × 3 |
| `incident-domain.test.ts` | Vitest | canResolveDirect, rentalLabel, shortUserId |
| `incident-permissions.test.ts` | Vitest | canIncidentAction × roles × acciones |
| `incidents.e2e.ts` | Playwright | Flujo crítico INC-01 → INC-02 → acción → cierre |

---

## Verificaciones de accesibilidad

- `@axe-core/react` integrado en tests de IncidentsListScreen e IncidentDetailScreen
- `aria-label="Listado de incidencias"` en `<table>` (PR #68 fix)
- `IncidentDialog` usa `Dialog.Title` con `id={titleId}` y `aria-labelledby` (Radix)
- `SeverityBadge` y `IncidentStatusBadge` usan `aria-hidden="true"` en iconos

---

## Cambios aplicados en revisión

1. **IncidentDialog.tsx** — Reemplazado con `@radix-ui/react-dialog` (P1)
2. **IncidentDialog.module.css** — Separado overlay (backdrop) de card (positioned fixed)
3. **useIncidentDetail.ts** — Convertido a `useQuery` + `queryClient.setQueryData` (P1)
4. **incident-domain.ts** — Comentario línea 51 actualizado a fuente real (P2)
5. **incident-permissions.ts** — Comentario JSDoc actualizado a fuente real (P2)
6. **IncidentsListScreen.tsx** — Comentario + `aria-label` en tabla (P2)
7. **IncidentDetailScreen.tsx** — Comentario JSDoc actualizado a fuente real (P2)
8. **IncidentBadges.tsx** — Comentario JSDoc actualizado a fuente real (P2)

---

## CI Reference

Pipeline: `erp-portal-web` / job `web`
Branch: `feature/incidents-module-web`
Resultado esperado: PASS tras los fixes del PR #68
