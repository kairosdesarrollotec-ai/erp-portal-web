# Trazabilidad — PR #69 (feat(roles): usePermissions y gestión de roles dinámicos)

**PR:** https://github.com/kairosdesarrollotec-ai/erp-portal-web/pull/69  
**Rama:** feature/dynamic-roles-web → main  
**UX-ID:** ADM-02  
**Última actualización:** 2026-10-07

---

## Cadena de trazabilidad

```
BDD-KAIROS-MVP-002-TRANSVERSAL
  └─ SDD-KAIROS-MVP-002-TRANSVERSAL
       └─ TDD-KAIROS-MVP-002-TRANSVERSAL
            └─ UX/UI v3.1 (ADM-02)
                 ├─ PROTO-ADM-02-ROLES-Y-PERMISOS       (APPROVED, desktop 1440×1024)
                 └─ PROTO-ADM-02-CONFLICTO-SOD          (APPROVED, desktop 1440×1024)
                      └─ OpenAPI admin.yaml v0.2.1
                           (feature/dynamic-roles-api — PR #58, pendiente de merge)
                           ├─ apps/web/src/app/shared/usePermissions.ts
                           ├─ apps/web/src/app/admin/RolePermissionMatrixScreen.tsx
                           └─ apps/web/src/app/admin/RoleManagementPanel.tsx
                                ├─ apps/web/src/app/shared/usePermissions.test.ts
                                ├─ apps/web/src/app/shared/legacy-role-policy.test.ts
                                ├─ apps/web/src/app/shared/useRolePermissions.test.ts
                                ├─ apps/web/src/app/admin/RolePermissionMatrixScreen.test.tsx
                                ├─ apps/web/src/app/admin/RoleManagementPanel.test.tsx
                                └─ e2e/roles.spec.ts
                                     └─ artifacts/evidence/admin/PR69-evidence.md
```

---

## Fuentes documentales

| Capa | Fuente | Estado |
|------|--------|--------|
| BDD | BDD-KAIROS-MVP-002-TRANSVERSAL | Vigente |
| SDD | SDD-KAIROS-MVP-002-TRANSVERSAL | Vigente |
| TDD | TDD-KAIROS-MVP-002-TRANSVERSAL | Vigente |
| UX/UI | v3.1 — ADM-02 | Vigente |
| Prototipo (READY) | PROTO-ADM-02-ROLES-Y-PERMISOS (APPROVED, desktop 1440×1024) | APPROVED |
| Prototipo (CONFLICT) | PROTO-ADM-02-CONFLICTO-SOD (APPROVED, desktop 1440×1024) | APPROVED |
| OpenAPI | admin.yaml v0.2.1 | En feature/dynamic-roles-api (PR #58) |

---

## Archivos implementados

| Archivo | Rol |
|---------|-----|
| `apps/web/src/app/shared/usePermissions.ts` | Hook de permisos dinámicos del usuario |
| `apps/web/src/app/admin/RolePermissionMatrixScreen.tsx` | Pantalla ADM-02 — Roles y permisos |
| `apps/web/src/app/admin/RoleManagementPanel.tsx` | Panel de gestión de roles (crear/renombrar/desactivar) |
| `apps/web/src/app/admin/permissions-client.ts` | Cliente de permisos |
| `apps/web/src/app/admin/roles-client.ts` | Cliente de roles |
| `apps/web/src/app/admin/useRoleManagement.ts` | Hook de gestión de roles |
| `apps/web/src/app/admin/useRolePermissionMatrix.ts` | Hook de matriz de permisos |

---

## Pruebas

| Archivo | Tipo | Cobertura |
|---------|------|-----------|
| `apps/web/src/app/shared/usePermissions.test.ts` | Unitario | 9 casos — usePermissions |
| `apps/web/src/app/shared/legacy-role-policy.test.ts` | Unitario | Política de roles legados |
| `apps/web/src/app/shared/useRolePermissions.test.ts` | Unitario | useRolePermissions |
| `apps/web/src/app/admin/RolePermissionMatrixScreen.test.tsx` | Componente | Matriz de permisos + gestión de roles |
| `apps/web/src/app/admin/RoleManagementPanel.test.tsx` | Componente + Axe | Panel de roles — accesibilidad |
| `e2e/roles.spec.ts` | E2E Playwright | Flujo completo ADM-02 |

---

## Nota de dependencia

> **admin.yaml v0.2.1 reside en `feature/dynamic-roles-api` (PR #58 backend).**
> Este PR (#69) debe mergearse DESPUÉS de PR #58.
> El cliente generado (`apps/web/src/app/admin/permissions-client.ts`, `roles-client.ts`)
> depende del contrato que PR #58 introduce.

---

## Desviaciones aprobadas

Ninguna.

---

## Riesgos y pendientes

1. **Dependencia de PR #58**: el merge de este PR está bloqueado hasta que `feature/dynamic-roles-api` sea mergeado y `admin.yaml v0.2.1` esté en `main`.
2. **PROTO-ADM-02-ROLE-MANAGEMENT-PANEL**: no existe prototipo dedicado aprobado para el panel de gestión de roles. Registrado en `prototype-manifest.yaml` como `PENDING_APPROVAL`. El panel aparece dentro de `PROTO-ADM-02-ROLES-Y-PERMISOS`, pero sin estado dedicado.
3. **Guard proactivo `/admin/permisos`**: el backend valida `ADMIN.MANAGE_PERMISSIONS` y retorna 403. La UI maneja el error. Guard proactivo en router pendiente de TR-10.
