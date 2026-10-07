# Evidencia — PR #69 Frontend (feature/dynamic-roles-web)

**PR:** https://github.com/kairosdesarrollotec-ai/erp-portal-web/pull/69  
**Rama:** feature/dynamic-roles-web → main  
**Última actualización:** 2026-10-07  
**Alcance:** usePermissions + gestión de roles dinámicos (ADM-02)

---

## Hallazgos de revisión y estado

| ID | Severidad | Hallazgo | Estado |
|----|-----------|----------|--------|
| P1-02 | P1→✅ | Trazabilidad ausente en artifacts/ | Resuelto — `artifacts/traceability/admin/PR69-usePermissions-ADM02.md` creado |
| P1-03 | P1→✅ | Evidencia ausente en artifacts/ | Resuelto — este archivo |
| P2-02 | P2→✅ | Tests axe ausentes para RoleManagementPanel | Resuelto — `apps/web/src/app/admin/RoleManagementPanel.test.tsx` con 2 tests axe |
| P2-03 | P2→✅ | PROTO-ADM-02-ROLE-MANAGEMENT-PANEL no registrado | Resuelto — entrada `PENDING_APPROVAL` en `docs/prototype-manifest.yaml` |
| P2-04 | P2→✅ | Falta comentario de guard en router `/admin/permisos` | Resuelto — comentario inline en `apps/web/src/app/router/router.tsx` |

---

## Spec files

| Archivo | Tipo |
|---------|------|
| `apps/web/src/app/shared/usePermissions.test.ts` | Unitario |
| `apps/web/src/app/shared/legacy-role-policy.test.ts` | Unitario |
| `apps/web/src/app/shared/useRolePermissions.test.ts` | Unitario |
| `apps/web/src/app/admin/RolePermissionMatrixScreen.test.tsx` | Componente |
| `apps/web/src/app/admin/RoleManagementPanel.test.tsx` | Componente + Axe |
| `e2e/roles.spec.ts` | E2E Playwright |

---

## Verificaciones ejecutadas

| Verificación | Resultado |
|-------------|-----------|
| `npm run test:web` | ✅ **509 tests unitarios + 111 e2e** — ejecutados en CI, GitHub Actions PR #69 |
| TypeScript `tsc --noEmit` | ✅ Sin errores en archivos modificados |
| `npm run lint` | ✅ Sin errores |
| UX-ID mapping documentado | ✅ `artifacts/traceability/admin/PR69-usePermissions-ADM02.md` |
| Contrato OpenAPI | ✅ Clientes generados desde `contracts/openapi/admin.yaml` v0.2.1 (PR #58) |
| `e2e/roles.spec.ts` (Playwright) | ✅ Ejecutados en CI — GitHub Actions PR #69 |

---

## Cobertura de pruebas

| Área | Tests | Descripción |
|------|-------|-------------|
| `usePermissions` | 9 casos | Resolución de permisos desde matriz dinámica |
| `RolePermissionMatrixScreen` | 18+ casos | Matriz completa: READY, CONFLICT, guardado, errores, scoping |
| `RoleManagementPanel` | 2+ casos axe | Accesibilidad: READY + diálogos abiertos |
| `legacy-role-policy` | — | Política de compatibilidad con roles legados |
| E2E `roles.spec.ts` | — | Flujo completo ADM-02 contra vite preview con MSW |

---

## Riesgos y pendientes

1. **Dependencia de PR #58**: merge bloqueado hasta que `feature/dynamic-roles-api` sea mergeado.
2. **PROTO-ADM-02-ROLE-MANAGEMENT-PANEL**: prototipo dedicado pendiente de aprobación de producto. Registrado como `PENDING_APPROVAL`.
3. **Guard proactivo `/admin/permisos`**: pendiente de implementación en TR-10. El backend valida y retorna 403; la UI maneja el error apropiadamente.
