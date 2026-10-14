# Trazabilidad — Módulo Reservas Web (RES-01, RES-04, RES-05, RES-06, RES-07, RES-08) y Perfil (TR-09)

**Fecha:** 2026-10-13
**Autor:** falcon.donovan@gmail.com

---

## Cadena de trazabilidad

| Eslabón | ID / Referencia | Estado |
|---------|-----------------|--------|
| BDD | BDD-KAIROS-MVP-002-RES | CURRENT |
| SDD | SDD-KAIROS-MVP-002-RES | CURRENT |
| TDD | TDD-KAIROS-MVP-002-RES | CURRENT |
| UX/UI | v3.1 | CURRENT |
| UX-ID | RES-01 (Bandeja de Reservas) | CURRENT |
| UX-ID | RES-04 (Detalle de Reserva) | CURRENT |
| UX-ID | RES-05 (Registro de Pago) | CURRENT |
| UX-ID | RES-06 (Conflicto — Vehículo No Disponible) | CURRENT |
| UX-ID | RES-07 (Venta de Vehículo Reservado) | CURRENT |
| UX-ID | RES-08 (Protocolo No-Show) | CURRENT |
| UX-ID | TR-09 (Menú Perfil y Sesión) | CURRENT |
| OpenAPI | reservations.yaml v0.7.0 | CURRENT |
| OpenAPI | transversal.yaml | CURRENT |
| Cliente generado | src/api/reservations.generated.ts | Parcial — ver DEV-PORTAL-RES-SALE-CLIENT-001 |
| Cliente generado | src/api/transversal.generated.ts | Parcial — ver DEV-PORTAL-TR09-PROFILE-CLIENT-001 |
| Código | src/app/reservations/ | Implementado |
| Código | src/app/profile/ | Implementado |
| Código | src/app/shared/UserMenuDropdown.tsx | Implementado |
| Estado | IMPLEMENTADO (PR #86) | — |

---

## Pantallas implementadas

### RES-01 — Bandeja de Reservas

**Directorio:** `apps/web/src/app/reservations/`

Cubre:
- Lista paginada de reservas con filtros
- Acciones por fila: ver detalle, confirmar, cancelar
- Estado LOADING (skeleton), EMPTY, READY
- Permisos evaluados vía `useRolePermissions` (RESERVATION.READ_LIST, RESERVATION.READ_DETAIL)

**Fuente:** UX/UI v3.1 + reservations.yaml v0.2.0

### RES-04 — Detalle de Reserva

Cubre:
- Vista completa del expediente de reserva
- Secciones: datos del cliente, vehículo, fechas, pagos, documentos
- Permiso: RESERVATION.READ_DETAIL
- Links de resolución: `ReservationDetailResolutionLinks` expone accesos a RES-06, RES-07, RES-08 según estado

### RES-05 — Registro de Pago

Cubre:
- Formulario de pago (RHF + Zod)
- Permiso: RESERVATION.REGISTER_PAYMENT

### RES-06 — Conflicto / Vehículo No Disponible

**Componente:** `ReservationConflictScreen`
**Directorio:** `apps/web/src/app/reservations/`
**Prototipo:** PROTO-RES-06-VEHICULO-NO-DISPONIBLE (APPROVED, 1440px, screen_state: READY)

Cubre:
- Pantalla de conflicto cuando el vehículo de una reserva ya no está disponible
- Listado de vehículos alternativos (`AlternativesList`, hook `useAlternativeVehicles`)
- Acción de cambio de vehículo — endpoint POST /reservations/{id}/change-vehicle
- Estado LOADING, READY, ERROR
- Permiso: RESERVATION.RESOLVE_CONFLICT

**Desvío:** DEV-PORTAL-RES-SALE-CLIENT-001 — type cast para endpoints no regenerados en cliente

### RES-07 — Venta de Vehículo Reservado

**Componente:** `ReservationSaleScreen`
**Directorio:** `apps/web/src/app/reservations/`
**Prototipo:** PROTO-RES-07-VENTA-DE-VEHICULO-RESERVADO (APPROVED, 1440px, screen_state: READY)

Cubre:
- Pantalla para marcar venta del vehículo reservado y resolver la reserva
- Flujo: flag-sale → resolve-sale con datos del comprador
- Endpoints: POST /reservations/{id}/flag-sale, POST /reservations/{id}/resolve-sale
- Estado LOADING, READY, ERROR
- Permiso: RESERVATION.RESOLVE_SALE

**Desvío:** DEV-PORTAL-RES-SALE-CLIENT-001 — type cast para endpoints no regenerados en cliente

### RES-08 — Protocolo No-Show

**Componente:** `ReservationNoShowScreen` + modal `ConfirmNoShowModal`
**Directorio:** `apps/web/src/app/reservations/`
**Prototipos:**
  - PROTO-RES-08-PROTOCOLO-NO-SHOW (APPROVED, 1440px, screen_state: READY)
  - PROTO-RES-08-MODAL-CONFIRMAR-PERDIDA-DE-RESERVA (APPROVED, 1440px, screen_state: MODAL)

Cubre:
- Pantalla de protocolo no-show con confirmación de pérdida de reserva
- Modal de confirmación antes de aplicar no-show
- Estado LOADING, READY, ERROR
- Permiso: RESERVATION.APPLY_NO_SHOW

**Pendiente accesibilidad (P2-03):** modal sin focus trap completo; teclado no queda atrapado dentro del modal.

### TR-09 — Menú Perfil y Sesión

**Componentes:** `UserMenuDropdown` (shared) + `UserProfileScreen`
**Directorios:** `apps/web/src/app/shared/`, `apps/web/src/app/profile/`
**Prototipos:**
  - PROTO-TR-09-MENU-PERFIL-Y-SESION (APPROVED, 1440px, screen_state: READY)
  - PROTO-TR-09-MODAL-CERRAR-SESION-CON-FORMULARIOS-PEND (APPROVED, 1440px, screen_state: MODAL)

Cubre:
- Dropdown de perfil de usuario en el header (botón "Mi Perfil" y "Cerrar sesión")
- Modal de advertencia de cierre de sesión con borradores pendientes
- Pantalla de perfil del usuario autenticado (GET /users/me/profile)
- Estado LOADING, READY, ERROR

**Desvío:** DEV-PORTAL-TR09-PROFILE-CLIENT-001 — fetch manual para /users/me/profile porque endpoint no está en transversal.generated.ts

---

## Notas

- Los permisos de reservas se evalúan por la matriz ADM-02 vía `useRolePermissions` (no por rol legacy).
- RES-06/07/08 consumen endpoints de reservations.yaml v0.7.0; el cliente generado (`reservations.generated.ts`) no fue regenerado para este PR — ver desvíos en `docs/decision-log.md`.
- Para pantallas sin `PROTO-ID APPROVED` en `prototype-manifest.yaml`, se requiere registrar el prototipo antes de modificar la composición visual.
- Baseline visual mobile/tablet no existe para RES-06/07/08 (P2-01).
