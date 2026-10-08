# Trazabilidad — Módulo Reservas Web (RES-01, RES-04, RES-05, RES-06, RES-07, RES-08)

**Fecha:** 2026-10-07
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
| UX-ID | RES-06 (Registro de Documentos) | CURRENT |
| UX-ID | RES-07 (Confirmar Reserva) | CURRENT |
| UX-ID | RES-08 (Cancelar Reserva) | CURRENT |
| OpenAPI | reservations.yaml v0.2.0 | CURRENT |
| Cliente generado | src/api/reservations.generated.ts | Generado desde OpenAPI |
| Código | src/app/reservations/ | Implementado |
| Estado | IMPLEMENTADO | — |

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

### RES-05 — Registro de Pago

Cubre:
- Formulario de pago (RHF + Zod)
- Permiso: RESERVATION.REGISTER_PAYMENT

### RES-06 — Registro de Documentos

Cubre:
- Carga de documentos del cliente (DL, pasaporte, etc.)
- Permiso: RESERVATION.REGISTER_DOCUMENTS

### RES-07 — Confirmar Reserva

Cubre:
- Acción de confirmación con If-Match
- Permiso: RESERVATION.CONFIRM

### RES-08 — Cancelar Reserva

Cubre:
- Cancelación por solicitud del cliente y por no-show
- Permisos: RESERVATION.CANCEL_CUSTOMER_REQUESTED_CHANGE, RESERVATION.CANCEL_NO_SHOW

---

## Notas

- Los permisos de reservas se evalúan por la matriz ADM-02 vía `useRolePermissions` (no por rol legacy).
- Para pantallas sin `PROTO-ID APPROVED` en `prototype-manifest.yaml`, se requiere registrar el prototipo antes de modificar la composición visual.
