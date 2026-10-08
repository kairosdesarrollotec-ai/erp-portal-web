# Trazabilidad — Módulo Autenticación Web (TR-01, TR-02, TR-03)

**Fecha:** 2026-10-07
**Autor:** falcon.donovan@gmail.com

---

## Cadena de trazabilidad

| Eslabón | ID / Referencia | Estado |
|---------|-----------------|--------|
| BDD | BDD-KAIROS-MVP-002-TRANSVERSAL v1.18 | CURRENT |
| SDD | SDD-KAIROS-MVP-002-TRANSVERSAL v3.6 | CURRENT |
| TDD | TDD-KAIROS-MVP-002-TRANSVERSAL v3.4 | CURRENT |
| UX/UI | v3.1 | CURRENT |
| UX-ID | TR-01 (Login) | CURRENT |
| UX-ID | TR-02 (MFA) | CURRENT |
| UX-ID | TR-03 (Activación de cuenta) | CURRENT |
| OpenAPI | transversal.yaml (endpoints /users/me/*) | CURRENT |
| Cliente generado | src/api/transversal.generated.ts | Generado desde OpenAPI |
| Código | src/app/auth/LoginScreen.tsx | Implementado |
| Código | src/app/auth/GuardScreens.tsx | Implementado |
| Código | src/app/auth/activation/ActivationScreen.tsx | Implementado |
| Pruebas | src/app/auth/*.test.tsx | Ver implementación |
| Estado | IMPLEMENTADO — sin reglas inventadas | — |

---

## Pantallas implementadas

### TR-01 — Login (`LoginScreen`)

**Archivo:** `apps/web/src/app/auth/LoginScreen.tsx`

Cubre:
- Autenticación vía Firebase Authentication
- Estados: LOADING (spinner), READY (formulario), error de credenciales (feedback inline)
- Redirección post-login a contexto de trabajo

**Fuente:** UX/UI v3.1 + BDD-KAIROS-MVP-002-TRANSVERSAL v1.18 + transversal.yaml

### TR-02 — MFA (`GuardScreens`)

**Archivo:** `apps/web/src/app/auth/GuardScreens.tsx`

Cubre:
- Verificación de segundo factor vía Firebase
- Guard de rutas autenticadas
- Sesión vencida: redirige a login

**Fuente:** UX/UI v3.1 + BDD-KAIROS-MVP-002-TRANSVERSAL v1.18

### TR-03 — Activación de cuenta (`ActivationScreen`)

**Archivo:** `apps/web/src/app/auth/activation/ActivationScreen.tsx`

Cubre:
- Flujo de primer acceso y establecimiento de contraseña
- Validación vía Zod + React Hook Form

**Fuente:** UX/UI v3.1 + BDD-KAIROS-MVP-002-TRANSVERSAL v1.18 + transversal.yaml

---

## Notas

- Los módulos TR-01, TR-02 y TR-03 no tienen `PROTO-ID` registrado en `prototype-manifest.yaml`. Si se requiere implementar o modificar pantallas visuales de auth, se debe registrar el prototipo antes de proceder (ver regla `frontend-visual-baseline`).
- La seguridad real (Firebase + backend) no depende de lógica de permisos frontend.
