# Evidencia — PR #86

**PR:** #86 — feat(reservas): RES-06/07/08, perfil TR-09 y enlace Reclutamiento→Personal
**Fecha:** 2026-10-13
**CI web/SBOM/secrets:** ✅ | **E2E Playwright:** ⚠️ pendiente merge base (no regresión del PR)

## Tests Vitest declarados en PR

| Archivo | Estado |
|---|---|
| ReservationConflictScreen.test.tsx (~6 tests) | Declarado |
| ReservationNoShowScreen.test.tsx (~5 tests) | Declarado |
| ReservationSaleScreen.test.tsx (~5 tests) | Declarado |
| ReservationDetailResolutionLinks.test.tsx (~5 tests) | Declarado |
| reservations-client.test.ts (~5 tests) | Declarado |
| UserMenuDropdown.test.tsx (ampliado) | Declarado |
| UserProfileScreen.test.tsx (~4 tests) | Declarado |

## Prototipos aprobados comparados
- PROTO-RES-06-VEHICULO-NO-DISPONIBLE (APPROVED, 1440px)
- PROTO-RES-07-VENTA-DE-VEHICULO-RESERVADO (APPROVED, 1440px)
- PROTO-RES-08-PROTOCOLO-NO-SHOW (APPROVED, 1440px)
- PROTO-RES-08-MODAL-CONFIRMAR-PERDIDA-DE-RESERVA (APPROVED, 1440px)
- PROTO-TR-09-MENU-PERFIL-Y-SESION (APPROVED, 1440px)
- PROTO-TR-09-MODAL-CERRAR-SESION-CON-FORMULARIOS-PEND (APPROVED, 1440px)

## Desvíos documentados
- DEV-PORTAL-RES-SALE-CLIENT-001 — tipo cast para 3 endpoints (pendiente aprobación)
- DEV-PORTAL-TR09-PROFILE-CLIENT-001 — fetch manual para /users/me/profile (pendiente aprobación)

## Pendientes (no bloquean CI)
- P2-01: Sin baseline visual mobile/tablet para RES-06/07/08
- P2-02: Sin tests E2E para los nuevos flujos
- P2-03: Confirmaciones de no-show/venta sin focus trap (accesibilidad teclado)
