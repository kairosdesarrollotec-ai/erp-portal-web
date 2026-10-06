# Trazabilidad — CON-04: Convertir a Alquiler

## Cadena de trazabilidad

| Capa | Referencia | Estado |
|---|---|---|
| BDD | BR-CON-002 (`bdd-01-consulta.md` §16.2.2, escenario `@SC-CON-003`) | CONFIRMADO |
| SDD | `sdd-01-consulta.md` §OP-CON-004 — "Derivar o cerrar consulta"; DR-CON-001 | Vigente |
| TDD | `tdd-01-consulta.md` §CON-P09/BR-CON-002; transición `COTIZADA → CONVERTIDA` vía `convert-to-rental` | Vigente |
| UX-ID | CON-04 — Detalle, cierre o conversión (`especificacion-ux-ui-v3.1` §5.1.4) | Vigente |
| PROTO-ID | `PROTO-CON-04-DETALLE-CON-0842` (aprobado 2026-09-14) | APROBADO — Desviación registrada en `DEV-CON-04-CONVERT-BUTTON-2026-10-06` |
| OpenAPI | `inquiries.yaml` — `POST /inquiries/{id}/commands/convert-to-rental`; respuesta `ConvertToRentalResponse` | Vigente |
| Código | `apps/web/src/app/inquiries/InquiryDetailScreen.tsx` — botón "Convertir a Alquiler" con guard `can('INQUIRY', 'CONVERT')` | Implementado |
| Código | `apps/web/src/app/inquiries/inquiries-client.ts` — `convertInquiryToRental()`, interfaz `ConvertToRentalResult` | Implementado |
| Código | `apps/web/src/app/inquiries/useInquiryDetail.ts` — `convertToRental()` | Implementado |
| Pruebas unitarias | `apps/web/src/app/inquiries/InquiryDetailScreen.test.tsx` — cobertura de "Convertir a Alquiler" | Ver evidencia |
| Pruebas E2E | `e2e/inquiries.spec.ts` — test `"Convertir a Alquiler" crea el alquiler y navega a su expediente` | Playwright |
| Evidencia | `artifacts/evidence/inquiries/PR66-evidence.md` | Ver archivo |

## Desviaciones registradas

- `DEV-CON-04-CONVERT-BUTTON-2026-10-06`: el prototipo `PROTO-CON-04-DETALLE-CON-0842` no muestra el botón "Convertir a Alquiler". La adición está justificada por BR-CON-002. Estado: `PENDIENTE_APROBACION_PROTOTIPO`.
- `DEV-ALQ-01-REMOVE-NEW-RENTAL-2026-10-06`: eliminación de "Nuevo alquiler" en ALQ-01, coherente con BR-CON-002 (todo alquiler nace de Consulta). Estado: `PENDIENTE_APROBACION_PROTOTIPO`.

## Notas

- El guard `can('INQUIRY', 'CONVERT')` controla la visibilidad del botón (hallazgo P1-01, PR #66).
- El atributo `aria-busy={saving}` informa al lector de pantalla el estado de procesamiento (hallazgo P2-05, PR #66).
- El tipo `ConvertToRentalResult` define mínimamente `rental: { id, status?, version? }` para evitar castear el `Record<string, never>` del generado (hallazgo P2-01, PR #66).
- El mock Playwright usa `status: 200` consistente con el contrato OpenAPI (hallazgo P2-02, PR #66).
