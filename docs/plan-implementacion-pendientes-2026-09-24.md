# Plan de implementación — pendientes frontend KAIROS/VeloxRent (24 sep 2026)

Consolida todo lo pendiente en `erp-portal-web` detectado en la sesión del 23-24 sep. Orden = orden de ejecución recomendado (cada bloque desbloquea al siguiente).

Documento equivalente para el backend: `../erp-monolithic-api/docs/plan-implementacion-pendientes-2026-09-24.md`.

Última actualización: 25-sep-2026.

---

## Bloque 1 — Cerrar PR#4 frontend (HU-21, activación de cuenta) ✅ CERRADO

- Hallazgo ALTO (retry saltaba `requiresPasswordChange`): corregido en `useActivation.ts`, commit `3bcab02`.
- Hallazgo MEDIO (CI incompleto): `ci.yml` ampliado con lint no-correctivo (eslint), pruebas de accesibilidad automatizadas (jest-axe) y SCA informativo (`npm audit`), commit `114d522`.
- PR#15 (recreado tras un merge prematuro de PR#4) mergeado a `main`.

**Estado:** `main` tiene CI completo (lint + build + tests + axe + audit).

---

## Bloque 2 — Cadena de merges HU-22 → HU-26 ✅ CERRADO

Cadena real de commits dependientes mergeada a `main` en la sesión 24-25 sep:

```
main → HU-22_desafio-mfa (PR#7) → HU-23_seleccion-empresa-sede-web (PR#17)
     → HU-24_tablero-por-rol-web (PR#17) → HU-27_reserva-bandeja-confirmacion-web (PR#18)
     → HU-26_consulta-bandeja-cotizacion-web (PR#19)  (incluye ADM-01..05, TR-07 y
         el fix de TR-06/outbox)
```

- [x] **HU-22 (PR#7)** — mergeado con conflictos resueltos.
- [x] **HU-23 + HU-24 (PR#17)** — mergeado, CI verde.
- [x] **HU-27 (PR#18)** — mergeado, CI verde.
- [x] **HU-26 (PR#19)** — mergeado, CI verde. Incluye Admin (ADM-01..05) y TR-07 (notificaciones).

**Adicionalmente mergeados en este periodo:**
- [x] **HU-20 fix móvil (PR#5)** — login layout gap mobile corregido, CI verde.
- [x] **GOV-02 (PR#6)** — `verify:manifest` incorporado al CI; 2 entradas de sha256/bytes corregidas tras merge de HU-20.

**Estado:** `main` tiene Consulta, Reserva, Tablero, Selección empresa/sede, Desafío MFA, Administración, Notificaciones (TR-07), login móvil y manifest verificado en CI.

---

## Bloque 3 — HU-25 (menú de navegación, 12 módulos) ✅ CERRADO

- [x] `ModuleHubScreen.tsx` + `useModuleHub.ts` + `module-definitions.tsx` + CSS Modules implementados.
- [x] Grid 4×3 desktop / 2 col móvil, visibilidad por rol (`ADMINISTRACION`), 8 tarjetas "Próximamente".
- [x] 8 pruebas Vitest — todas verdes.
- [x] Ruta `/modulos` registrada en `router.tsx`.
- [x] `MISSING_SOURCE` registrado en `docs/conflicts/MISSING_TR11_UXUI_CONTRACT.md`; decisión provisional `PROV-TR-11-001` en `decision-log.md`.
- [x] PR#20 mergeado a `main` (25-sep-2026), CI verde.

**Nota:** Prototipo aprobado provisionalmente (PROTO-TR-11-MENU-MODULOS / -MOVIL). Pendiente contrato UX/UI formal (ver conflicto abierto).

---

## Bloque 4 — Dependabot PRs (dependencias) ✅ CERRADO

Los siguientes PRs de Dependabot están abiertos en ambos repos. Requieren análisis antes de mergear porque algunos bumps implican breaking changes:

### Frontend (`erp-portal-web`) — sin PRs Dependabot abiertos

No hay PRs de Dependabot abiertos en el repo frontend a la fecha.

### Backend (`erp-monolithic-api`) — 7 PRs Dependabot abiertos

| PR | Bump | Riesgo |
|----|------|--------|
| #14 | `@nestjs/common` 10.4.22 → 12.0.4 | ⚠️ Major — breaking changes NestJS |
| #13 | `@nestjs/platform-express` 10.4.22 → 12.0.4 | ⚠️ Major — breaking changes NestJS |
| #12 | `@nestjs/config` 3.3.0 → 12.0.0 | ⚠️ Major — breaking changes NestJS |
| #8  | `actions/checkout` 4.2.2 → 7.0.1 | ✅ Mergeado 25-sep |
| #9  | `actions/setup-node` 4.4.0 → 7.0.0 | ✅ Mergeado 25-sep |
| #10 | `class-validator` 0.14.4 → 0.15.1 | ✅ Mergeado 25-sep |
| #11 | `@nestjs/testing` 10.4.22 → 12.0.4 | ❌ Cerrado → issue #17 |
| #12 | `@nestjs/config` 3.3.0 → 12.0.0 | ❌ Cerrado → issue #17 |
| #13 | `@nestjs/platform-express` 10.4.22 → 12.0.4 | ❌ Cerrado → issue #17 |
| #14 | `@nestjs/common` 10.4.22 → 12.0.4 | ❌ Cerrado → issue #17 |

Los PRs NestJS #11–#14 requieren migración coordinada (dual-version en workspace + dependencias ESM-only en Jest). Issue de seguimiento: [erp-monolithic-api#17](https://github.com/kairosdesarrollotec-ai/erp-monolithic-api/issues/17).

---

## Bloque 5 — Un PR por HU de ahora en adelante ✅ ACTIVO

Desde el cierre del Bloque 2, la regla "un PR por HU" aplica a todo lo nuevo.

---

## Bloque 6 — Backlog funcional pendiente (frontend, post-merge)

1. **TR-04, TR-08, TR-09, TR-10** ("Transversal restante", HU-38) — sin empezar. Revisar contratos en `PANTALLAS-V3-B-TRANSVERSAL.md` y confirmar qué parte es solo frontend vs. requiere endpoint.
2. **TR-11 — contrato UX/UI formal** — crear `docs/sources/ux-ui/PANTALLAS-V3-B-TRANSVERSAL.md` con especificación completa de TR-11 (estados, responsive, a11y, permisos). Cierra `MISSING_TR11_UXUI_CONTRACT.md`.
3. **ADM-02 (parte frontend)** — una vez el backend extienda el enforcement de roles más allá de Admin, reflejar los cambios de permisos/UI en Reservas/Consultas/Tablero/Notificaciones.
4. **TR-07 (parte frontend)** — si el contrato de notificaciones cambia cuando el backend implemente el envío externo real, ajustar la UI (estados de entrega, reintentos visibles, etc.).
5. **DashboardScreen → `/modulos`** — agregar navegación desde el tablero al hub de módulos (hoy no hay enlace entrante a `/modulos` desde la UI).

---

## Conflictos abiertos

| Archivo | Descripción | Pendiente de |
|---------|-------------|-------------|
| `docs/conflicts/MISSING_TR11_UXUI_CONTRACT.md` | TR-11 sin contrato UX/UI formal | Creación de `PANTALLAS-V3-B-TRANSVERSAL.md` |

---

## Resumen de orden de ejecución

| # | Bloque | Estado | Depende de | Bloquea a |
|---|--------|--------|-----------|-----------|
| 1 | Cerrar PR#4 (CI + descripción) | ✅ Cerrado | — | — |
| 2 | Merge cadena HU-22→HU-26 a main | ✅ Cerrado | Bloque 1 | — |
| 3 | HU-25 hub de módulos | ✅ Cerrado | Bloque 2 | — |
| 4 | Dependabot PRs (#8–#10 mergeados; #11–#14 cerrados → issue #17) | ✅ Cerrado | — | — |
| 5 | Un PR por HU de ahora en adelante | ✅ Activo | Bloque 2 | — |
| 6 | Backlog funcional frontend | Pendiente | Bloques 2, 3 | — |
