# Hallazgos pendientes — 2026-10-03

Bugs reportados en la ronda de revisión del 2026-10-03 que requieren trabajo de backend,
decisión arquitectónica o fuente BDD/SDD para resolverse. No pueden cerrarse con cambios
sólo de frontend.

---

## BUG-03 — Subir comprobante de pago en reserva no sube un archivo real

**Pantalla:** ReservationDetailScreen  
**Descripción:** El botón "Subir" en la sección de comprobante de pago llama a
`registerPayment()` sin ningún parámetro de archivo. No existe un endpoint en
`reservations.yaml` para recibir archivos adjuntos.  
**Stop:** `MISSING_API_CONTRACT`  
**Acción requerida:** Diseñar endpoint `POST /reservations/{id}/documents` o similar
en `reservations.yaml`, implementar en backend y después exponer la carga de archivo
en el frontend.

---

## BUG-04 — Etapa 1 (documentos) no permite adjuntar archivos

**Pantalla:** Stage1DocumentsScreen  
**Descripción:** Los campos de licencia, DNI, domicilio y estado de cuenta son sólo
checkboxes. No existe un endpoint en `rentals.yaml` para adjuntar documentos físicos
escaneados a un alquiler.  
**Stop:** `MISSING_API_CONTRACT`  
**Acción requerida:** Diseñar endpoint de documentos adjuntos en `rentals.yaml` e
implementar el flujo completo de carga de archivos.

---

## BUG-07 — Firma digital en Stage 3 es un checkbox simulado

**Pantalla:** Stage3ContractScreen  
**Descripción:** La captura de firma del cliente es un simple checkbox. No existe
un componente de firma digital en el Design System ni una decisión arquitectónica
sobre qué proveedor de firma usar (ej. canvas HTML5, firma biométrica en tableta, etc.).  
**Stop:** `UNAPPROVED_DEVIATION` — implementar una solución requiere decisión de producto.  
**Acción requerida:** Definir el mecanismo de firma en BDD/SDD, elegir tecnología,
registrar la decisión en `decision-log.md` e implementar el componente.

---

## BUG-08 — Monto de garantía sin validación de mínimo/rango

**Pantalla:** Stage3ContractScreen  
**Descripción:** El input de monto de garantía tiene `min="0"` y `step="0.01"` pero
no valida contra un mínimo configurado por empresa/categoría de vehículo.  
**Stop:** `MISSING_SOURCE` — no se encontró en BDD/SDD una regla de negocio sobre
el monto mínimo de garantía.  
**Acción requerida:** Documentar la regla de negocio en BDD (ej. `BR-ALQ-XXX`),
exponer el parámetro en el contrato OpenAPI de parámetros del sistema, y validar
en frontend contra ese valor configurado.

---

## BUG-10 — Empresa sin plantilla de contrato activa bloquea Stage 3

**Pantalla:** Stage3ContractScreen  
**Descripción:** Si la empresa no tiene una plantilla de contrato activa configurada,
el backend devuelve error al llamar a `formalizeContract()`. No existe en el frontend
un estado que guíe al usuario para resolver esta configuración pendiente.  
**Stop:** `MISSING_SOURCE` — el flujo de configuración de plantillas de contrato por
empresa no está documentado en UX/UI.  
**Acción requerida:** Documentar el flujo de administración de plantillas de contrato
en UX/UI y SDD. Implementar un estado `EXTERNAL_DEPENDENCY_PENDING` en Stage3 que
detecte la ausencia de plantilla activa y muestre instrucciones al administrador.

---

_Registrado por: Claude Sonnet 4.6 — sesión de auditoría 2026-10-03_
