# Trazabilidad — Dashboard Web

**Fecha:** 2026-10-07
**Autor:** falcon.donovan@gmail.com

---

## Cadena de trazabilidad

| Eslabón | ID / Referencia | Estado |
|---------|-----------------|--------|
| UX/UI | v3.1 | CURRENT |
| OpenAPI | transversal.yaml (GET /users/me/dashboard) | CURRENT |
| Cliente generado | src/api/transversal.generated.ts | Generado desde OpenAPI |
| Código | src/app/dashboard/DashboardScreen.tsx | Implementado |
| Estado | IMPLEMENTADO | — |

---

## Pantallas implementadas

### DashboardScreen — Vista de inicio post-login

**Archivo:** `apps/web/src/app/dashboard/DashboardScreen.tsx`

Cubre:
- Vista de inicio que se muestra tras autenticación exitosa
- Consume `GET /users/me/dashboard` de `transversal.yaml`
- Composición adaptada al rol del usuario (PLATFORM_ADMIN vs roles de empresa)
- Estado LOADING (skeleton), READY

---

## Notas

- El Dashboard no tiene UX-ID propio registrado en el `prototype-manifest.yaml`. La pantalla implementa la vista de inicio post-login.
- Si se requiere crear o modificar la composición visual del Dashboard, se debe registrar un `PROTO-ID APPROVED` en `prototype-manifest.yaml` antes de implementar (ver regla `frontend-visual-baseline` y código STOP `MISSING_VISUAL_BASELINE`).
- La vista de PLATFORM_ADMIN tiene composición propia; si se modifica, requiere su propio `PROTO-ID`.
