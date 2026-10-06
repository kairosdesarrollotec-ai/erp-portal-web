# Evidencia de tests — PR #66 (CON-04: Convertir a Alquiler)

## Entorno de ejecución

- Node: v22.23.3 (via `/opt/homebrew/opt/node@22/bin`)
- Vitest: v5.0.3
- Comando: `npm run test:web` (workspace `apps/web`)
- Fecha: 2026-10-06

## Resultado

```
 RUN  v5.0.3 /private/tmp/kairos-review/inquiry-web/apps/web

 Test Files  49 passed (49)
      Tests  426 passed (426)
   Start at  12:59:49
   Duration  18.81s
```

**Estado: VERDE — 426/426 tests pasaron.**

## Tests relevantes de InquiryDetailScreen (CON-04)

Los siguientes tests de `InquiryDetailScreen.test.tsx` cubren el alcance del PR #66:

- `muestra el resumen y la cotizacion, resolviendo el nombre del vehiculo (no el UUID)` ✅
- `muestra una foto del vehiculo cotizado y permite cambiarlo antes de reservar` ✅
- `cuando hay cotizacion, "Reservar este vehiculo" prellena la fecha de Consulta, pide modalidad...` ✅
- `ofrece siempre ambos botones: "Reservar este vehículo" y "Convertir a Alquiler"` ✅ (guard `can('INQUIRY', 'CONVERT')` con mock `() => true`)
- `"Convertir a Alquiler" llama al comando con la version vigente y navega al expediente creado` ✅
- `muestra el error de dominio de "Convertir a Alquiler" y no navega` ✅
- `no permite convertir a alquiler una consulta ya convertida` ✅
- `bloquea la conversion a reserva si la consulta no tiene cliente formal (prospecto)` ✅
- `no permite confirmar el cierre sin motivo` ✅

## Hallazgos resueltos en este PR

| ID | Descripción | Resolución |
|---|---|---|
| P1-01 | Botón "Convertir a Alquiler" sin guard de permisos | Añadido `can('INQUIRY', 'CONVERT')` en `InquiryDetailScreen.tsx` |
| P1-02 | Trazabilidad y evidencia ausentes | Creado `artifacts/traceability/inquiries/CON-04-convert-to-rental.md` + este archivo |
| P1-03 | Desviación visual CON-04 no registrada | Entrada `DEV-CON-04-CONVERT-BUTTON-2026-10-06` en `docs/decision-log.md` |
| P1-04 | Desviación visual ALQ-01 no registrada | Entrada `DEV-ALQ-01-REMOVE-NEW-RENTAL-2026-10-06` en `docs/decision-log.md` |
| P2-01 | Cast `as unknown as` en `ConvertToRentalResult` | Interfaz `ConvertToRentalResult` ya definida con `rental: { id, status?, version? }` en `inquiries-client.ts` |
| P2-02 | Mock Playwright usa `status: 201` en lugar de `200` | Corregido a `status: 200` en `e2e/inquiries.spec.ts` |
| P2-05 | Falta `aria-busy` en botón "Convertir a Alquiler" | Añadido `aria-busy={saving}` en `InquiryDetailScreen.tsx` |

## Riesgos y pendientes

- Las desviaciones visuales P1-03 y P1-04 están en estado `PENDIENTE_APROBACION_PROTOTIPO`. Los prototipos `PROTO-CON-04-DETALLE-CON-0842` y `PROTO-ALQ-01-BANDEJA` deben actualizarse para reflejar las pantallas implementadas.
- Los tests E2E de Playwright (`e2e/inquiries.spec.ts`) no se ejecutaron en esta sesión (requieren servidor de desarrollo levantado).
