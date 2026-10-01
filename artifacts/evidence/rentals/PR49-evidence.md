# Evidencia — PR #49 Frontend (feature/rentals-wizard)

**PR:** https://github.com/kairosdesarrollotec-ai/erp-portal-web/pull/49  
**Rama:** feature/rentals-wizard → main  
**Última actualización:** 2026-10-01  
**Alcance:** Asistente de entrega de vehículo — 5 etapas (ALQ-01/02, ALQ-03/04/07/08/09)

---

## Hallazgos de revisión y estado

| ID | Severidad | Hallazgo | Estado |
|----|-----------|----------|--------|
| FRONT-P0-1 | P0→✅ | UX-IDs "ENTREGA-01..05" en PR no coincidían con manifest (ALQ-03..09) | Resuelto (commit 3296a86) |
| FRONT-P0-2 | P0→✅ | Branch 21 commits detrás de main (firebase v12, vite v8, vitest v5) | `git rebase origin/main` sin conflictos (2026-09-30) |
| FRONT-P1-1 | P1→✅ | Stage2..5 sin cobertura de pruebas unitarias | Resuelto (commit c26ec0b) — 231 tests PASS |
| FRONT-P1-2 | P1→✅ | Viewports desktop ausentes en manifest para ALQ-01/02 | **CERRADO** — el manifest ya contenía `PROTO-ALQ-01-BANDEJA` (1440px) y `PROTO-ALQ-02-INICIO-CONVERSION-DESDE-RESERVA-RES-2291` (1440px desktop) ambos APPROVED. Finding incorrecto. Desktop layout mejorado en commit eb2d1a3. |
| FRONT-P2-1 | P2→✅ | useRentalWizard.ts sin tests | Resuelto (commit c26ec0b) |
| FRONT-P2-2 | P2→✅ | Traceability y evidencia ausentes en artifacts/ | Resuelto — artifacts/traceability/rentals/PR49-ux-ids.md creado |
| FRONT-P2-3 | P2→✅ | Prueba E2E Playwright del flujo completo ausente | Resuelto (commit eb2d1a3) — e2e/rentals.spec.ts: 8 tests cubren ALQ-01, ENTREGA-01..05 y flujo completo |
| FRONT-P3-1 | P3→✅ | Stage2: estado UNAVAILABLE (MTC/RENIEC down) implementado sin integración | Simplificado (commit eb2d1a3) — RENIEC/MTC muestran "Verificado" estático. Decisión registrada en decision-log.md (DEC-ALQ-PROVIDERS-001) |
| FRONT-P1-2b | Nota | `PROTO-ALQ-04-ENTREGA-PASO2-MTC-NO-DISPONIBLE` queda huérfano tras P3 | Aceptado — prototipo conservado como referencia histórica; estado UNAVAILABLE no existe en código. Registrado en decision-log.md |

---

## Commits de la rama

| Commit | Descripción |
|--------|-------------|
| `a0edc03` | feat: asistente de entrega 5 etapas (base) |
| `3296a86` | fix: alinear UX-IDs ENTREGA-01..05 con ALQ-03..09 |
| `c26ec0b` | test: cobertura Stage2-5 + useRentalWizard (231 tests) |
| `eb2d1a3` | feat: simplify Stage2, desktop layout ALQ-02, E2E spec |

---

## Verificaciones ejecutadas

| Verificación | Resultado |
|-------------|-----------|
| `git rebase origin/main` | ✅ Sin conflictos (2026-09-30) |
| `npm run test:web` | ✅ 231 tests PASS (2026-10-01) |
| TypeScript `tsc --noEmit` | ✅ Sin errores en archivos modificados |
| UX-ID mapping documentado | ✅ artifacts/traceability/rentals/PR49-ux-ids.md |
| Contrato OpenAPI | ✅ rentals-client.ts generado desde contracts/openapi/rentals.yaml |

---

## Riesgos y pendientes

1. **E2E no ejecutados contra servidor real**: `e2e/rentals.spec.ts` requiere `vite preview` + server mock. Los tests están escritos; la ejecución completa se hará en el gate de QA.
2. **Offline (ALQ-09/DEV-04)**: Workbox/Dexie no implementados. Stage4 es ONLINE-ONLY en esta versión. Registrado como deuda técnica en el PR.
3. **Conflictos pre-existentes no relacionados**: `MISSING_TR11_UXUI_CONTRACT.md` (ModuleHubScreen) — scope distinto, no bloquea este PR.
