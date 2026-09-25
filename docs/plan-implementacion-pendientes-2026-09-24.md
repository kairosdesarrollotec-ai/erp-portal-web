# Plan de implementación — pendientes frontend KAIROS/VeloxRent (24 sep 2026)

Consolida todo lo pendiente en `erp-portal-web` detectado en la sesión del 23-24 sep. Orden = orden de ejecución recomendado (cada bloque desbloquea al siguiente).

Documento equivalente para el backend: `erp-api-local/docs/plan-implementacion-pendientes-2026-09-24.md`.

---

## Bloque 1 — Cerrar PR#4 frontend (HU-21, activación de cuenta) ✅ CERRADO

- Hallazgo ALTO (retry saltaba `requiresPasswordChange`): corregido en `useActivation.ts`, commit `3bcab02`.
- Hallazgo MEDIO (CI incompleto): `ci.yml` ampliado con lint no-correctivo (eslint), pruebas de accesibilidad automatizadas (jest-axe) y SCA informativo (`npm audit`), commit `114d522`.
- PR#15 (recreado tras un merge prematuro de PR#4) mergeado a `main`.

**Estado:** `main` tiene CI completo (lint + build + tests + axe + audit).

---

## Bloque 2 — Cadena de merges HU-22 → HU-26 — EN PROGRESO

Cadena real de commits dependientes (confirmada con `git merge-base`):

```
main → HU-22_desafio-mfa (PR#7) → HU-23_seleccion-empresa-sede-web
     → HU-24_tablero-por-rol-web → HU-27_reserva-bandeja-confirmacion-web
     → HU-26_consulta-bandeja-cotizacion-web  (incluye ADM-01..05, TR-07 y
         el fix de TR-06/outbox)
```

- [x] **HU-22 (PR#7)** — retargeteado a `main`, mergeado con conflictos resueltos (ver commit `c4ea87e`: CI, `useLogin.ts`, `LoginScreen.tsx/test.tsx`, `setup.ts`, `package-lock.json`) y 2 hallazgos nuevos de lint corregidos (`MfaChallengeModal.tsx`, `useMediaQuery.ts`).
- [ ] **HU-23 (`HU-23_seleccion-empresa-sede-web`)** — retargetear a `main`, resolver conflictos, verificar CI, mergear.
- [ ] **HU-24 (`HU-24_tablero-por-rol-web`)** — idem.
- [ ] **HU-27 (`HU-27_reserva-bandeja-confirmacion-web`)** — idem.
- [ ] **HU-26 (`HU-26_consulta-bandeja-cotizacion-web`)** — idem. Incluye Admin (ADM-01..05) y TR-07 (notificaciones) mezclados — no separar en PRs propios (cherry-picks fallan por conflictos reales). Documentar el alcance real en un comentario del PR.

**Pendiente de documentación (no bloquea el merge):** publicar en GitHub los comentarios preparados en PR#7 backend y PR#11 frontend aclarando que incluyen Admin + TR-07.

**Resultado esperado:** `main` queda con Consulta, Reserva, Tablero, Selección empresa/sede, Desafío MFA, Administración y Notificaciones (TR-07).

---

## Bloque 3 — Construir HU-25 (menú de navegación, 12 módulos)

Base aprobada: prototipo `PROTO-TR-11-MENU-MODULOS` + `-MOVIL` (aprobado provisionalmente por Producto el 23-sep), contrato en `PANTALLAS-V3-B-TRANSVERSAL.md`.

1. Retomar `HU-25_menu-navegacion-modulos` (PR#12), rebasada sobre el `main` ya actualizado del Bloque 2.
2. Grid 4×3 desktop / lista móvil, deny-by-default por rol usando el contexto de trabajo (`companyId`/`branchId`/rol) ya resuelto por `useDashboard`.
3. Tests + build limpio, CI verde.
4. Mergear a `main`.

**Nota:** HU-25 es solo frontend — no requiere endpoint nuevo en backend.

---

## Bloque 4 — Un PR por HU de ahora en adelante

Una vez que HU-22→HU-26 esté en `main` (Bloque 2 completo), aplicar la regla real de "un PR por HU" para todo lo nuevo — ya no hay excusa de dependencias encadenadas.

---

## Bloque 5 — Backlog funcional pendiente (frontend, post-merge)

1. **TR-04, TR-08, TR-09, TR-10** ("Transversal restante", HU-38) — sin empezar. Revisar contratos en `PANTALLAS-V2-B-TRANSVERSAL.md` / `PANTALLAS-V3-B-TRANSVERSAL.md`.
2. **ADM-02 (parte frontend)** — una vez el backend extienda el enforcement de roles más allá de Admin (ver plan backend), reflejar los cambios de permisos/UI que correspondan en Reservas/Consultas/Tablero/Notificaciones.
3. **TR-07 (parte frontend)** — una vez el backend tenga el envío externo real, ajustar la UI de notificaciones si el contrato cambia (estados de entrega, reintentos visibles, etc.).

---

## Resumen de orden de ejecución

| # | Bloque | Estado | Depende de | Bloquea a |
|---|--------|--------|-----------|-----------|
| 1 | Cerrar PR#4 (CI + descripción) | ✅ Cerrado | — | Bloque 2 |
| 2 | Merge cadena HU-22→HU-26 a main | 🔄 En progreso (HU-22 listo) | Bloque 1 | Bloques 3, 4, 5 |
| 3 | Construir HU-25 | Pendiente | Bloque 2 | — |
| 4 | Un PR por HU de ahora en adelante | Pendiente | Bloque 2 | — |
| 5 | Backlog funcional frontend | Pendiente | Bloque 2 | — |
