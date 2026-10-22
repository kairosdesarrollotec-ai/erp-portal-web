# Consolidado de avance por flujo — 2026-10-22

Base: auditorías del 21-oct (`Auditoria_{CON,RES,ALQ,DEV,TR,REC,ADP}_2026-10-21`, en el Project "Kairos Project") + lo reportado por los agentes del 22-oct. **Lo del 22-oct NO está verificado** (faltan `prisma generate`, migraciones, tests y tsc en el Mac): los % del 22-oct son estimaciones.

Ponderado: conforme = 1, parcial = 0,5, falta = 0, fuera de alcance excluido. Estricto: solo lo conforme.

| Flujo | Ítems | 21-oct ponderado | 22-oct ponderado (est.) | 22-oct estricto (est.) | Camino feliz |
|---|---:|---:|---:|---:|---|
| Consulta (CON) | 66 | 58 % | ~74 % | ~59 % | ~90 % |
| Reserva (RES) | 86 | 63 % | ~67 % | ~52 % | ~88 % |
| Alquiler (ALQ) | ~60 | ~55 % | ~62 % | ~45 % | ~80 % |
| Devolución (DEV) | 87 | 86 % | ~89 % | ~75 % | ~97 % |
| Reclutamiento (REC) | 86 | 79 % | ~85 % | ~74 % | ~97 % |
| Administración de Personal (ADP) | 69 | 84 % | ~94 % | ~90 % | ~95 % |
| Transversal / soporte (TR) | ~40 | ~78 % | ~80 % | ~70 % | ~90 % |
| **Total** | **~494** | **~72 %** | **~79 %** | **~67 %** | |

## Lo que falta en ESTE repo (front: `erp-portal-web`)

### Consulta
- Mostrar `requiredDocuments` que devuelve el back y quitar el "documento de hospedaje" (BR-CON-004).
- Enviar `canComeToOffice` y forzar VIRTUAL cuando es falso; canal PRESENCIAL/LLAMADA correcto en CON-02.
- Cotización "más reciente" (`latestQuotationId`/índice 0) y tipo `InquiryInteraction` = {id, channel, occurredAt, outcome, note}.
- CON-01: filtros de fecha y empresa, paginación, búsqueda por cliente (hoy manda texto como UUID).
- Advertencia "ruta trocha" (prototipo aprobado, depende de Q-02), semáforo del cliente (HU-18), alertas de capacidad/garantía, analítica UX, borrador (servidor vs. local).
- Modalidad virtual: "Enviar evidencia" (depende de bucket).

### Reserva
- Modalidad remota: subida de video 360° y documento de aceptación (BR-RES-006).
- Checklist RES-04 completo (políticas, responsabilidad, video) y coherencia botón vs. "confirmación automática".
- Registro de pago con monto, medio y nº de operación; RES-05 con CTA deshabilitado antes de la fecha pactada; RES-01 (columna Empresa, filtros, tarjetas móvil).
- Enviar ubicación del cliente, conductor en reserva (BR-RES-008), servicio de aeropuerto, notificaciones/recordatorios.

### Alquiler
- Enviar método de pago, nº de operación y pagador (hoy se descartan); UI de cancelar alquiler y de tercera vía.
- UI de autorizar/rechazar ampliación con pago y adenda (ALQ-11); persistir tiempos técnico/documental.
- Formularios FIV/FCKE y demás formatos 01–09, guía fotográfica por zona, comprobante de domicilio coherente con el back.
- Registro de lectura de política y huella, archivo físico + Drive, planes Normal/Plus/Libre.

### Devolución
- Integrar el cargo por retraso a la liquidación; multa de combustible.
- Persistir FIV/FCKE; marcas por zona vía endpoints nuevos; evidencia del tercero en DEV-02.
- Vía legal, notificación formal al titular ausente, borrador de 72 h, "cerrar sin SYNCED", rol de gravedad, verificación de identidad.
- Textos "desde la recepción" → "desde el cierre".

### Reclutamiento y Personal
- REC: alerta de vencimiento de prueba, inducción de mecánico y video, ficha de expectativas, disponibilidad, navegación REC-01/REC-08 ↔ ADP-01.
- ADP: repositorio de documentos de TH, autoservicio de vacaciones/permisos, sanciones y tabla, marca de asistencia sin conexión, leer `SYNC.SUPERVISE_CONFLICTS`, alinear `reason` (3–500) con el yaml.

### Transversal
- TR-04 recuperación de contraseña (u ocultar el botón), revisar TR-11 contra v3.0, verificar offline_checklist_drafts/TTL 72 h.

## Condiciones para que el % sea real
1. `npx prisma generate` y aplicar las 14 migraciones (20261021010001–020001 y 20261022010001–040001).
2. Suite back (unit + integración `--runInBand`) y front (`npx tsc -b --noEmit` + tests).
3. Cerrar el seguimiento de front de Consulta/Reserva/Devolución (G5) y la persistencia de `canComeToOffice` en el back.
4. Decisiones de negocio abiertas: niveles de cascada por persona, tabla de sanciones, tercera vía notarial, tope de vacaciones, cargo por retraso en la liquidación, multa de combustible, vía legal, rutas de trocha.

