# Trazabilidad Frontend — Módulo Search (BUS-01)

**Slice:** Búsqueda Global — componente de búsqueda unificada en AppHeader  
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
| BDD | BDD-BUS-001 | `docs/sources/bdd/bdd-10-busqueda-global.md` |
| SDD | SDD-BUS-001 | `docs/sources/sdd/sdd-10-busqueda-global.md` |
| TDD | TDD-BUS-001 | `docs/sources/tdd/tdd-10-busqueda-global.md` |
| OpenAPI | OPENAPI-SEARCH-V0.1.0 | `packages/contracts/openapi/search.yaml` v0.1.0 |

### Baselines visuales aprobados

| PROTO-ID | UX-ID | Estado | Viewport | Archivo |
|---|---|---|---|---|
| PROTO-BUS-01-GLOBAL-SEARCH-DESKTOP | BUS-01 | APPROVED | desktop | `docs/prototypes/approved/stitch_veloxrent_prototipo_b/busqueda_global_veloxrent/` |

---

## Componente implementado

### BUS-01 — GlobalSearch

| Ítem | Valor |
|---|---|
| UX-ID | BUS-01 |
| Componente | `apps/web/src/app/shared/GlobalSearch/GlobalSearch.tsx` |
| Ubicación | Integrado en `AppHeader.tsx` (sección `.right` antes del botón bell) |
| Activación mínima | 2 caracteres (BR-BUS-001) |
| Debounce | 300ms |

**Funcionalidades:**
- Combobox ARIA (role="combobox", aria-expanded, aria-activedescendant)
- Dropdown con grupos por tipo de entidad
- Navegación por teclado: ArrowUp/Down para ítem, Escape para cerrar
- Overlay mobile (pantalla completa en viewport < 768px)
- Resultados máx 5 por grupo (BR-BUS-004)
- TanStack Query (enabled solo cuando q.length >= 2)
- Al seleccionar: navega a la ruta del recurso y cierra el dropdown

---

## Código implementado

| Tipo | Ruta |
|---|---|
| Componente principal | `apps/web/src/app/shared/GlobalSearch/GlobalSearch.tsx` |
| Estilos | `apps/web/src/app/shared/GlobalSearch/GlobalSearch.module.css` |
| Hook | `apps/web/src/app/shared/GlobalSearch/useGlobalSearch.ts` |
| Grupo de resultados | `apps/web/src/app/shared/GlobalSearch/SearchResultGroup.tsx` |
| Ítem de resultado | `apps/web/src/app/shared/GlobalSearch/SearchResultItem.tsx` |
| Cliente dominio | `apps/web/src/app/shared/GlobalSearch/search-client.ts` |
| Cliente API generado | `apps/web/src/api/search.generated.ts` |
| Cliente API wrapper | `apps/web/src/api/search-api-client.ts` |
| AppHeader | `apps/web/src/app/shared/AppHeader.tsx` (GlobalSearch integrado) |

---

## Pruebas

| Tipo | Ruta | Estado |
|---|---|---|
| Vitest — 6 tests (render, query, resultados, keyboard, mobile) | `apps/web/src/app/shared/GlobalSearch/GlobalSearch.test.tsx` | ✅ 6/6 passing |

---

## Evidencia

- Pruebas ejecutadas: `npx vitest run src/app/shared/GlobalSearch/GlobalSearch.test.tsx` → 6/6 passed
- Contrato OpenAPI consumido desde cliente generado
- TypeScript: 0 errores
- Lint: 0 errores

---

## Riesgos y pendientes

| Item | Estado |
|---|---|
| Test E2E Playwright del flujo de búsqueda | Pendiente |
| Revisión visual automatizada (responsive-visual) | Pendiente |
