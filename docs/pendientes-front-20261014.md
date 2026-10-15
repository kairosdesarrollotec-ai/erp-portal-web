# Pendientes del frontend - 2026-10-14

Rama `feature/devolucion-asistencia-20261014`. Contratos de referencia: returns 1.2.0, hr-administration 0.3.0,
fleet 0.4.0, inquiries 0.6.0, reservations 0.8.0, rentals 1.4.0.

## Hecho en esta rama

- DEV-01: recordatorios (`GET /returns/reminders`, `POST /returns/{id}/commands/register-reminder`) y alertas
  (`GET /returns/alerts`, campo `alerts` del expediente) en la bandeja; banners en resultado, dano tecnico y garantia.
- DEC-TZ-LIMA-001: util `apps/web/src/app/shared/lima-time.ts` aplicado a reservas, consultas, alquiler, devolucion, flota y HR.
- ADP-02: evidencia opcional (foto de WhatsApp) al registrar asistencia y aviso `evidenceMissing`. No existe "Importar" asistencia.

## Pendiente: contrato backend

### DEV-04 - SYNC_CONFLICT (sincronizacion del checklist de recepcion sin conexion)

No existe contrato backend definido: `returns.yaml` 1.2.0 no tiene ningun endpoint, codigo de error ni esquema de
conflicto de sincronizacion para el checklist/evidencias de devolucion. Por eso NO se implemento la pantalla ni el
estado `SYNC_CONFLICT` de DEV-04 (no se inventa el contrato).

Falta definir en el backend, siguiendo el patron de ALQ-09 / TR-08:

- Endpoint o campo que permita detectar que la copia local del checklist (borrador offline) quedo desfasada
  respecto del servidor (version/etag del checklist o del expediente).
- Codigo de error de dominio para el conflicto (hoy solo existen `RETURN_VERSION_CONFLICT` 412 y `RETURN_STATE_CONFLICT` 409 sobre el expediente).
- Regla de resolucion (conservar local / usar servidor / fusionar) y que evidencias subidas offline se conservan.

Cuando el contrato exista: agregar el cliente en `returns-client.ts`, el estado en `useReturnFlow` y la pantalla de conflicto
reutilizando el patron de `ReservationDetailScreen` / `InquiryDetailScreen` (`SYNC_CONFLICT`).

## Fuera de alcance (decisiones vigentes)

- Honorarios: se llenan manualmente por Gerencia.
- GPS de salidas a campo y de alquiler: pendiente.
- Envio automatico de WhatsApp: no existe integracion; el recordatorio es manual-asistido (copiar / `wa.me`).
- Cobro de paralizacion y liberacion de garantia: siguen manuales (las alertas solo avisan).

## Supuestos

- Telefono para `wa.me`: solo digitos; un celular peruano de 9 digitos (`9XXXXXXXX`) se prefija con `51`.
- Sin prototipo aprobado propio para la tarjeta de recordatorio ni los banners de alerta: se reutilizan los estilos de
  banner/tarjeta del modulo (referencias: PROTO-DEV-01-BANDEJA, PROTO-DEV-02-RECORDATORIO-Y-RECEPCION).
- `returns.yaml` 1.2.0 referencia `#/components/parameters/*` que no existen; para regenerar `returns.generated.ts` se
  uso una copia temporal con esos parametros declarados (tarea de backend: corregir el yaml).
- Evidencia de asistencia: una referencia que empieza con `http(s)://` viaja como `url`; otra cosa, como `storageRef`.
