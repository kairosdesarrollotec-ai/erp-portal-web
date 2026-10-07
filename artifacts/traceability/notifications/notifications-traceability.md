# Trazabilidad — Módulo Notificaciones Web

**Fecha:** 2026-10-07
**Autor:** falcon.donovan@gmail.com

---

## Cadena de trazabilidad

| Eslabón | ID / Referencia | Estado |
|---------|-----------------|--------|
| BDD | BDD notifications v1.1 | APPROVED 2026-10-02 |
| SDD | SDD notifications v1.1 | APPROVED 2026-10-02 |
| TDD | TDD notifications v1.1 | APPROVED 2026-10-02 |
| UX/UI | v3.1 | CURRENT |
| OpenAPI | notifications.yaml | CURRENT |
| Cliente generado | src/api/notifications.generated.ts | Generado desde OpenAPI |
| Código | src/app/notifications/NotificationsPanel.tsx | Implementado |
| Estado | IMPLEMENTADO | — |

---

## Componentes implementados

### NotificationsPanel

**Archivo:** `apps/web/src/app/notifications/NotificationsPanel.tsx`

Cubre:
- Panel lateral de notificaciones del usuario autenticado
- Lista de notificaciones con estado LEIDA / NO_LEIDA
- Acción "marcar como leída" por notificación
- Estado LOADING, EMPTY, READY
- Consumo de `notifications.yaml` vía cliente generado desde OpenAPI

---

## Notas

- El módulo de notificaciones no tiene UX-ID propio registrado en el prototype-manifest actual. Si se requiere implementar nuevas pantallas visuales, registrar el prototipo antes de proceder.
- Las notificaciones son solo-lectura desde el frontend; el backend gestiona el estado y la entrega.
