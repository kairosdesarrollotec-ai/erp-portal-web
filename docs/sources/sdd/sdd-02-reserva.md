# SDD — 02 Reserva

> **Estado vigente:** APROBADO como versión base por instrucción explícita del usuario el 18 oct 2026. Este estado reemplaza cualquier indicación histórica de borrador; cambios posteriores se gestionan como mejoras documentadas.

# Solution Design Document — Reserva

**Código:** SDD-KAIROS-MVP-002 / RES **Versión:** 2.2 — 03 sep 2026: resuelto el hallazgo P0-03 (tratamiento financiero de la garantía, confirmado por José y Fiorella), precisado el mecanismo de no-show (P1-02), agregada nota sobre reembolso por reserva no completada (`EX-RES-005`) **Estado:** DRAFT COMPLETE — candidato a revisión arquitectónica, no aprobado **Entrada funcional:** `BDD-RES-001` (Reserva) — v1.9, 03 sep 2026 **Depende de:** `SDD-KAIROS-TRANSVERSAL.md` (arquitectura base, multiempresa, seguridad, integraciones, offline, observabilidad, despliegue, migración, ADR y riesgos transversales, decisiones abiertas de arquitectura, criterios de aprobación) **Alcance:** Proceso de Reserva — presencial y remota, incluida venta de vehículo reservado **Propietario:** Arquitectura de Solución — **Eder Ramos (Tech Lead)**, confirmado 02 sep 2026 — corregido 03 sep 2026, este documento seguía sin reflejarlo **Revisores:** Producto, Operaciones, UX, Seguridad, Datos, Finanzas, QA **Fecha:** 31 de agosto de 2026

> Este documento traduce el comportamiento de `BDD-RES-001` a una solución lógica verificable. Para todo lo que no varía por proceso, ver `SDD-KAIROS-TRANSVERSAL.md` — este documento no lo repite.

---

## 1. Control y gobernanza

### 1.1 Historial

| Versión | Cambio | Autor | Estado |
| --- | --- | --- | --- |
| 2.0 | Extraído de `SDD-KAIROS-Consolidado-Detallado.md` (secciones 9.4, 10.6-10.7, 11.5-11.8, 12.5-12.6, 18.8, 24.5, 27.4-27.5) hacia un documento propio de Reserva, siguiendo el ejemplo de referencia. Incorpora la confirmación de Fiorella del 31 ago sobre OQ-RES-105 (sin flexibilidad de fecha) | Russbel (BA), a pedido del usuario | Candidato |
| 2.3 | 2026-10-03 | Bug 3: Se agregan endpoints de gestión de documentos de reserva vía GCS. Nuevas entidades: ReservationDocument. Nuevos puertos: ReservationDocumentStoragePort, ReservationDocumentRepositoryPort. | Implementación técnica | Candidato |

### 1.2 Estado de decisiones

Ver `SDD-KAIROS-TRANSVERSAL.md`, sección 1.2.

### 1.3 Documentos relacionados

| Documento | Relación |
| --- | --- |
| `BDD-RES-001` | Fuente funcional autoritativa de este proceso |
| `SDD-KAIROS-TRANSVERSAL.md` | Arquitectura base común a los 6 procesos |
| `SDD-KAIROS-TRACEABILITY.md` | Trazabilidad BDD → SDD → TDD consolidada |
| `SDD-CON-001` | Proceso del que Reserva recibe la conversión |
| `SDD-ALQ-001` | Proceso hacia el que Reserva se convierte al llegar la fecha pactada |
| `TDD-KAIROS-Consolidado-Detallado.md` | Refinamiento técnico subordinado — ya incluye tabla `vehicle_commitments` con exclusión de rango (sección 7.4) |

### 1.4 Criterio de autoridad

Ver `SDD-KAIROS-TRANSVERSAL.md`, sección 1.4. Este documento no redefine ninguna regla `BR-RES-*` del BDD.

---

## 2. Resumen ejecutivo

Reserva confirma la intención del cliente de alquilar un vehículo en una fecha futura, mediante el pago del monto vigente (S/300 observado) y la entrega de documentos/contrato — **ambos requisitos a la vez**, en un único bloqueo atómico (BR-RES-009, confirmado por Fiorella el 27 ago: no existe bloqueo provisional). El módulo propietario `Reservations` colabora con `Fleet` (bloqueo del vehículo), `Payments` (validación del monto) y `Evidence` (video 360° en modalidad remota).

Una decisión estructural clave, confirmada el 31 de agosto de 2026: **no existe reprogramación de reserva bajo ningún criterio**. Cualquier cambio de fecha, hora o vehículo se modela siempre como cancelación con pérdida completa del monto — nunca como una edición del registro vigente.

### 2.1 Resultado arquitectónico

Confirmar una reserva es una operación atómica: se valida el monto pagado, se valida que los documentos/contrato estén completos, y solo entonces se solicita el bloqueo exclusivo del vehículo sobre el intervalo pactado. Si cualquiera de los dos requisitos falta, el vehículo permanece disponible para cualquier otro cliente — no existe un estado intermedio de "apartado".

---

## 3. Alcance de la solución

### 3.1 Incluido

- Determinación de modalidad (presencial/remota) según ubicación del cliente.
- Captura de destino y tiempo estimado antes de mostrar el vehículo (orden corregido 27 ago).
- Confirmación atómica: pago + documentos/contrato → bloqueo del vehículo.
- Modalidad remota: video 360° + documento de aceptación.
- Cancelación por cambio solicitado por el cliente (fecha, hora o vehículo) — no existe reprogramación.
- Resolución de venta de vehículo reservado (alternativa o reembolso inmediato).
- Conversión a Alquiler en la fecha pactada.

### 3.2 Excluido

- Cualquier forma de "bloqueo provisional" previo al pago+documentos completos — descartada explícitamente por Fiorella (27 ago).
- Reprogramación de fecha/hora/vehículo como operación distinta de cancelación — confirmado explícitamente por Fiorella el 31 ago (OQ-RES-105).
- Firma electrónica/digital de la aceptación remota (ver `SDD-KAIROS-TRANSVERSAL.md`, OQ-SOL-009).

### 3.3 Dependencias

| Dependencia | Requerida para | Dueño |
| --- | --- | --- |
| Fleet | Disponibilidad y bloqueo atómico del vehículo | Fleet |
| Customers | Elegibilidad del cliente | Customers |
| Payments | Validación del monto de reserva vigente | Payments |
| Evidence | Video 360° y documento de aceptación (modalidad remota) | Evidence |
| Rentals | Conversión a Alquiler en la fecha pactada | Alquiler |

---

## 4. Drivers específicos de Reserva

| ID | Driver | Origen | Implicación de solución | Prioridad |
| --- | --- | --- | --- | --- |
| DR-RES-001 | Evitar doble reserva del mismo vehículo/intervalo | BR-RES-009, DR-KAI-001 (transversal) | Exclusión transaccional al bloquear (sección 10.1) | Crítica |
| DR-RES-002 | Bloqueo solo atómico, nunca provisional | BR-RES-009 (corregido 27 ago) | El bloqueo es un único evento; nunca dos pasos separados de "apartar" y luego "confirmar" | Crítica |
| DR-RES-003 | No existe reprogramación bajo ningún criterio | BR-RES-003 (confirmado 31 ago, OQ-RES-105) | El dominio no expone ninguna operación de "editar fecha/vehículo" — todo cambio pasa por `UC-RES-003` (cancelar) | Crítica |
| DR-RES-004 | Monto de reserva versionado, no fijo en código | BR-RES-001 | El monto vigente se lee de una configuración versionada, no de una constante | Alta |

---

## 5–8. Arquitectura de contexto, contenedores, componentes y alternativas

Reserva usa la arquitectura ya definida en `SDD-KAIROS-TRANSVERSAL.md` (secciones 5-8). El componente propietario es **Reservations**, con datos propios `reservations`, `holds` (ver tabla 8.1 del documento transversal).

### 5.1 Nota sobre la estrategia de consistencia (específica de Reserva)

La estrategia seleccionada transversalmente (restricción temporal + transacción, `SDD-KAIROS-TRANSVERSAL.md` sección 5.2) es la que materializa directamente DR-RES-001: sin ella, dos administradores podrían confirmar el mismo vehículo para el mismo intervalo casi simultáneamente.

---

## 9. Diseño por casos de uso

### UC-RES-001 — Determinar modalidad y mostrar el vehículo

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | RES-P02 a P04 |
| Actor | Administrador |
| Entrada conceptual | Ubicación del cliente, disponibilidad |
| Autorización | `reservation:create` |
| Coordinación | Reservations → Fleet |
| Consistencia | Consulta de disponibilidad, sin bloqueo todavía |
| Resultado | Modalidad definida (BR-RES-005), vehículo mostrado |
| Eventos | — |
| Errores | — |
| Idempotencia | No aplica |

### UC-RES-002 — Confirmar reserva

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | RES-P08 a P11 |
| Actor | Cliente/Administrador |
| Entrada conceptual | Aceptación de políticas, pago de S/300 vigente, contrato |
| Autorización | `reservation:create`, `payment:register` |
| Coordinación | Reservations → Fleet (bloqueo) → Payments |
| Consistencia | Exclusión transaccional al bloquear el vehículo (DR-RES-001); bloqueo atómico solo cuando pago y documentos están **ambos** completos (DR-RES-002) |
| Resultado | Reserva confirmada, vehículo bloqueado (BR-RES-009) |
| Eventos | `ReservaConfirmada` |
| Errores | `VEHICLE_NOT_AVAILABLE`, `INVALID_DEPOSIT_AMOUNT` |
| Idempotencia | Sí |

> 📌 **Agregado 03 sep 2026 (**`EX-RES-005`** del BDD):** cuando dos clientes compiten por el mismo vehículo y solo uno completa los 4 requisitos (pago + contrato + políticas + documento de responsabilidad) antes que el otro, `VEHICLE_NOT_AVAILABLE` se resuelve a favor de quien completó todo primero — el orden de pago por sí solo no otorga prioridad. El cliente que se queda con el error debe recibir, antes que un reembolso automático: (1) una consulta de vehículos alternativos disponibles; (2) si no acepta ninguno, el reembolso del depósito. Esto no requiere un nuevo endpoint — es la secuencia que ya sigue `UC-RES-002` al fallar por `VEHICLE_NOT_AVAILABLE`, más el flujo de reembolso ya existente en Payments.

### UC-RES-003 — Cancelar por cambio solicitado por el cliente

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | Excepción EX-RES-002, EX-RES-004 |
| Actor | Cliente/Administrador |
| Entrada conceptual | Solicitud de cambio de fecha, hora o vehículo |
| Autorización | `reservation:cancel` |
| Coordinación | Reservations → Payments (pérdida del monto) |
| Consistencia | **No existe una operación de "reprogramar"** — cualquier cambio se resuelve como cancelación (BR-RES-003, confirmado 31 ago). La única compensación posible es informal y **fuera de esta reserva**: kilometraje adicional en un alquiler posterior, a discreción de Gerencia — no revierte la pérdida del monto ni se modela como parte de este caso de uso |
| Resultado | Reserva cancelada, monto perdido |
| Eventos | `ReservaCancelada` |
| Errores | — |
| Idempotencia | Sí |

### UC-RES-004 — Resolver venta de vehículo reservado

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | RES-P13 a P16 |
| Actor | Gerencia/Administrador/Cliente |
| Entrada conceptual | Notificación de venta, alternativa ofrecida |
| Autorización | `reservation:cancel`, `refund:process` |
| Coordinación | Reservations → Fleet → Payments |
| Consistencia | Decisión síncrona del cliente antes de resolver (BR-RES-007) |
| Resultado | Reserva reformulada, o cancelada con reembolso inmediato |
| Eventos | `ReservaCancelada` / `ReservaReformulada` |
| Errores | — |
| Idempotencia | Sí |

### UC-RES-005 — Convertir reserva en alquiler

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | Disparador transversal (BR-RES-002) |
| Actor | Administrador |
| Entrada conceptual | Fecha pactada, revalidación de cliente y documentos |
| Autorización | `rental:create` |
| Coordinación | Reservations → Rentals |
| Consistencia | ✅ `CONFIRMADO_NEGOCIO`** (resuelto 03 sep 2026, cierra hallazgo P0-03):** José y Fiorella confirmaron por separado, en reuniones independientes, la opción **(a)**: el monto de S/300 ya pagado en la reserva se traslada **íntegro** a la garantía del alquiler — no se descuenta del precio, no es un concepto aparte, no depende de la empresa. Ejemplo dado por José: garantía Hilux = S/1000; con los S/300 de reserva ya pagados, el cliente completa S/700 más al firmar el contrato en oficina. `ConvertReservationHandler` puede implementar esta regla como comportamiento definitivo — ver `BDD-RES-001`, BR-RES-002 |
| Resultado | Alquiler creado, reserva convertida |
| Eventos | `ReservaConvertida` |
| Errores | — |
| Idempotencia | Sí |

### UC-RES-006 — Gestión de documentos de reserva (GCS)

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | Soporte documental complementario a UC-RES-002 |
| Actor | Administrador |
| Autorización | `reservation:create`, alcance de empresa/sede |
| Coordinación | Reservations → GCS (URL firmada) → ReservationDocumentRepository |
| Consistencia | El documento se registra solo después de que el cliente lo haya subido directamente a GCS |
| Resultado | Documento adjunto a la reserva y accesible vía listado |
| Idempotencia | Sí (registro por `objectUrl` único) |

#### Endpoints de documentos de reserva

| Endpoint | Método | Descripción |
|---|---|---|
| `/reservations/{id}/documents/upload-url` | POST | Solicita URL firmada PUT para cargar un documento al bucket GCS. |
| `/reservations/{id}/documents` | POST | Registra un documento ya cargado en GCS (recibe `objectUrl`). |
| `/reservations/{id}/documents` | GET | Lista los documentos adjuntos a la reserva. |

**ReservationDocument** (entidad):
- `id`: UUID
- `reservationId`: UUID, FK a `reservations`
- `objectUrl`: URL HTTPS de GCS (validada contra `GCS_BUCKET_NAME`)
- `documentType`: string (tipo de documento: COMPROBANTE_PAGO, ACUERDO, etc.)
- `uploadedAt`: timestamp
- `uploadedBy`: userId

**Puertos de aplicación:**
- `ReservationDocumentStoragePort`: genera URL firmada PUT (prefijo `reservation-documents/`, TTL 15 min)
- `ReservationDocumentRepositoryPort`: persiste y consulta referencias de documentos

**Nota:** sigue el patrón GCS aprobado en SDD-00 §16.5 y PROP-010.

---

## 10. Secuencias críticas

### 10.1 Confirmar reserva (bloqueo atómico)

> ⚠️ Corregida el 28 ago (auditoría independiente + reunión con Fiorella, 27 ago), y reforzada el 31 ago: Fiorella confirmó que la regla se mantiene tajante — no hay bloqueo provisional ni reprogramación.

```ruby
sequenceDiagram
    participant UI as Web/PWA
    participant RSV as Reservations
    participant FLT as Fleet
    participant PAY as Payments
    participant OUT as Outbox

    UI->>RSV: Registrar pago (S/300 vigente)
    RSV->>PAY: Validar monto
    alt Monto inválido
        PAY-->>RSV: INVALID_DEPOSIT_AMOUNT
        RSV-->>UI: Rechazado, requisito de pago no completo
    else Monto válido
        PAY-->>RSV: Pago registrado
    end

    UI->>RSV: Registrar documentos/contrato
    RSV-->>UI: Requisito de documentos completo

    alt Ambos requisitos completos (pago + documentos)
        RSV->>FLT: Solicitar bloqueo atómico del vehículo/intervalo
        FLT->>FLT: Verificar exclusión de rango (vehicle_commitments)
        alt Vehículo ya comprometido por otra operación
            FLT-->>RSV: VEHICLE_NOT_AVAILABLE
            RSV-->>UI: Conflicto — el vehículo ya no está disponible
        else Vehículo disponible
            FLT-->>RSV: Bloqueo concedido
            RSV->>RSV: Transicionar a CONFIRMED
            RSV->>OUT: Registrar ReservaConfirmada (misma transacción)
            RSV-->>UI: Reserva confirmada, vehículo bloqueado
        end
    else Falta un requisito
        RSV-->>UI: El vehículo permanece disponible para otros clientes
    end
```

Esta secuencia materializa **RES-P11 del BDD** y **NFR-KAI-001** mediante la tabla `vehicle_commitments` con exclusión de rango (TDD, sección 7.4).

### 10.2 Resolver venta de vehículo reservado

```ruby
sequenceDiagram
    participant GER as Gerencia
    participant RSV as Reservations
    participant CLI as Cliente
    participant PAY as Payments
    GER->>RSV: Notificar venta del vehículo
    RSV->>CLI: Ofrecer alternativa (fotos/video 360°)
    CLI-->>RSV: Decisión
    alt Acepta
        RSV->>RSV: Reformular reserva
    else Rechaza
        RSV->>PAY: Procesar reembolso inmediato
        PAY-->>RSV: Reserva cancelada
    end
```

---

## 11. Modelo lógico de información

### 11.1 Entidades

| Entidad | Propietario | Identidad | Relaciones | Ciclo de vida |
| --- | --- | --- | --- | --- |
| Reservation | Reservations | UUID | Cliente, vehículo, consulta de origen | Borrador a terminal |
| VehicleCommitment | Fleet | UUID | Reserva o Alquiler | Se crea únicamente cuando pago y documentos están completos a la vez; protege el intervalo reservado por exclusión de rango; permanece hasta conversión, cancelación, expiración por no-show o resolución excepcional — nunca expira a los 10 min, no es un "hold" provisional (corregido 02 sep 2026, hallazgo P0-01) |
| ReservationAcceptance | Reservations | UUID | Reserva (solo modalidad remota) | Se crea una vez, inmutable |
| ReservationResolution | Reservations | UUID | Reserva con vehículo vendido | Registra la decisión del cliente |

### 11.2 Relaciones

```
erDiagram
    INQUIRY ||--o| RESERVATION : converts
    RESERVATION ||--o| VEHICLE_COMMITMENT : blocks
    RESERVATION ||--o| RESERVATION_ACCEPTANCE : requires
    RESERVATION ||--o| RESERVATION_RESOLUTION : resolves
    RESERVATION ||--o| RENTAL : becomes
```

### 11.3 Propiedad y consistencia

- Reservations es autoridad sobre el ciclo de vida de la reserva, incluida la decisión de que **no existe reprogramación** (BR-RES-003, confirmado 31 ago) — cualquier cambio se modela como cancelación de un registro terminal, nunca como edición del mismo registro.
- Fleet es autoridad sobre el bloqueo del vehículo — Reservations y Rentals lo consultan y solicitan, no lo modifican directamente.

### 11.4 Clasificación de sensibilidad

| Clase | Ejemplos | Protección |
| --- | --- | --- |
| Financiera | Monto de reserva (S/300) | Roles financieros + auditoría |
| Restringida | Documento de aceptación remota | Acceso explícito; retención sujeta a validación legal (OQ-RES-104) |
| Normal | Destino, tiempo estimado, motivo de cierre | Alcance empresarial |

---

## 12. Diseño lógico de operaciones y errores

| ID | Operación | Tipo | Actor | Entrada conceptual | Salida | Idempotente |
| --- | --- | --- | --- | --- | --- | --- |
| OP-RES-001 | Confirmar reserva | Comando | Administrador | Vehículo, fecha, pago | Confirmada, bloqueada | Sí |
| OP-RES-002 | Cancelar por cambio solicitado | Comando | Administrador | Motivo | Cancelada, monto perdido | Sí |
| OP-RES-003 | Resolver venta de vehículo | Comando | Gerencia | Decisión del cliente | Reformulada, o cancelada con reembolso | Sí |
| OP-RES-004 | Convertir a alquiler | Comando | Administrador | Fecha pactada | Alquiler creado | Sí |

### 12.1 Catálogo de errores lógicos

| Código | Causa | Resultado para el usuario | Recuperación |
| --- | --- | --- | --- |
| `VEHICLE_NOT_AVAILABLE` | Solapamiento de intervalo | No se puede confirmar | Elegir otro vehículo o fecha |
| `INVALID_DEPOSIT_AMOUNT` | Monto distinto del vigente | Rechazo de la operación | Corregir el monto |
| `QUOTATION_EXPIRED` | Cotización vencida | No se puede convertir | Recotizar desde Consulta |
| `VEHICLE_HAS_ACTIVE_COMMITMENT` | Reserva/alquiler activo sobre el vehículo a vender | Bloqueo de la operación de venta | Resolver la reserva primero (UC-RES-004) |
| `CUSTOMER_BLOCKED` | Cliente en estado rojo | Bloqueado para nuevas operaciones | Escalamiento según política |

---

## 13. Eventos

| Evento | Productor | Consumidores | Datos mínimos | Garantía |
| --- | --- | --- | --- | --- |
| ReservaConfirmada | Reservations | Fleet, Payments, Notifications, Audit, Reporting | `reservation_id`, versión | Al menos una vez |
| ReservaCancelada | Reservations | Fleet, Payments, Notifications | `reservation_id`, motivo | Al menos una vez |
| ReservaReformulada | Reservations | Notifications, Reporting | `reservation_id`, nueva alternativa | Al menos una vez |
| ReservaConvertida | Reservations | Rentals, Audit, Reporting | `reservation_id`, `rental_id` | Al menos una vez |

---

## 14–17. Multiempresa, seguridad, integraciones y offline

Reserva hereda el diseño transversal (`SDD-KAIROS-TRANSVERSAL.md`, secciones 14-17). Particularidad propia: **confirmar una reserva nunca es una operación offline** (ADR-KAI-004) — requiere autoridad central por el mismo motivo que Alquiler: evitar doble compromiso del vehículo.

---

## 18. UX Architecture

### 18.1 Flujo de pantallas — Reserva

Modalidad (presencial/remota) → Vehículo mostrado o video 360° → Datos y destino → Aceptación de políticas → Pago del monto vigente → Contrato (+ documento de aceptación si es remota) → Confirmación con vehículo bloqueado.

### 18.2 Estados visuales específicos

- Bloqueo confirmado con detalle de vehículo e intervalo (no hay estado "provisional" que mostrar, por DR-RES-002).
- Alerta explícita cuando el cliente solicita cambiar fecha/vehículo: "esto se procesará como cancelación, se pierde el monto" — refuerzo de UX para DR-RES-003.

Los principios generales de UX viven en `SDD-KAIROS-TRANSVERSAL.md`, sección 18.

---

## 19. Requisitos no funcionales específicos

| ID | Atributo | Objetivo/criterio | Táctica | Estado |
| --- | --- | --- | --- | --- |
| NFR-RES-001 | Consistencia de bloqueo | 0 dobles confirmaciones del mismo vehículo/intervalo | Exclusión transaccional (sección 10.1) | `PROPUESTA_SOLUCIÓN` |

> ⚠️ Reserva sigue sin ningún NFR de negocio propio medible más allá del de consistencia (mismo hallazgo señalado en auditorías previas) — pendiente de confirmar con Fiorella si existe un tiempo esperado de atención o nunca se ha medido.

---

## 20–23. Observabilidad, continuidad, despliegue y migración

Sin particularidades para Reserva más allá de las señales transversales de "conflictos de bloqueo" y "bloqueos/reservas expirados" (`SDD-KAIROS-TRANSVERSAL.md`, sección 20.1).

---

## 24. Estrategia de pruebas

### 24.1 Casos obligatorios — Reserva

- Confirmación exitosa presencial y remota.
- Conflicto de disponibilidad: dos usuarios confirmando el mismo vehículo/intervalo.
- Cliente solicita cambiar fecha/hora/vehículo (cancelación con pérdida del monto, no reprogramación) — caso reforzado con el caso real del 31 ago (vehículo Chevrolet, no-show).
- Vehículo reservado se vende: cliente acepta alternativa vs. cliente rechaza.
- Conversión a alquiler en la fecha pactada, con revalidación de cliente y documentos.

Los casos obligatorios transversales viven en `SDD-KAIROS-TRANSVERSAL.md`, sección 24.1.

---

## 25. ADR específicos

Reserva no tiene ADR propios — usa los 5 ADR transversales de `SDD-KAIROS-TRANSVERSAL.md`, sección 25, especialmente ADR-KAI-002 (consistencia fuerte de disponibilidad) y ADR-KAI-004 (confirmación no disponible offline), que aplican de forma directa a este proceso.

---

## 26. Riesgos específicos

El riesgo transversal más relevante para Reserva es RSK-009 (doble reserva o doble alquiler del mismo vehículo) — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 26.

---

## 27. Trazabilidad BDD → SDD → TDD

| Regla BDD | Dato (BDD) | Caso de uso (SDD) | Componente | Operación/evento | Refinamiento TDD |
| --- | --- | --- | --- | --- | --- |
| BR-RES-001 | DAT-RES-003 | UC-RES-002 | Reservations/Payments | OP-RES-001, `ReservaConfirmada` | TDD, sección 9.3 |
| BR-RES-003 | DAT-RES-007 | UC-RES-003 | Reservations/Payments | OP-RES-002 | TDD, sección 9.4 |
| BR-RES-007 | — | UC-RES-004 | Reservations/Payments | OP-RES-003 | — |
| BR-RES-002 | — | UC-RES-005 | Reservations/Rentals | OP-RES-004, `ReservaConvertida` | TDD, sección 9.10 |
| NFR-KAI-001 | — | UC-RES-002 | Fleet | `VEHICLE_NOT_AVAILABLE` | TDD, sección 7.5 (exclusión) |

### 27.1 Nota sobre preguntas de negocio relacionadas

> ✅ **Corregido 02 sep 2026 (hallazgo P0-01):** esta nota describía el no-show como si se resolviera mediante el "vencimiento" de un `VehicleHold` temporal — eso mezclaba dos conceptos distintos. El no-show ocurre sobre una **reserva ya confirmada** (con `VehicleCommitment` ya creado), no sobre un bloqueo provisional que expira — ese bloqueo provisional no existe. La pregunta OQ-RES-102 (`RESUELTO` — sin tolerancia contractual formal de no-show) sigue siendo relevante para `UC-RES-002`/`UC-RES-003`, pero el mecanismo correcto es: la reserva confirmada pasa a `CANCELLED` por decisión del Administrador ante el no-show del cliente (sección 8.2 de `BDD-RES-001`), no por expiración automática de un hold.
> 
> ✅ **Precisado 03 sep 2026 (cierra P1-02):** Fiorella confirmó el mecanismo completo — **es decisión humana, no un job automático.** Protocolo: llamada de recordatorio 1 día antes de la fecha pactada; si no contesta, mensaje escrito; segunda llamada 2 horas antes de la hora pactada. Si sigue sin respuesta, **Gerencia** (Fiorella/José) evalúa y confirma la pérdida de la reserva caso por caso — no hay una zona horaria de sistema que aplique automáticamente ni un trigger programado. Implicación de diseño: no crear un job/cron que cancele reservas por no-show; el estado `CANCELLED` se dispara por una acción explícita de un usuario con rol Gerencia, después de agotado el protocolo de contacto (que puede registrarse como bitácora, pero no es lo que dispara la transición).

> 📌 Esta tabla también vive consolidada en `SDD-KAIROS-TRACEABILITY.md`.

---

## 28. Decisiones abiertas relevantes para Reserva

| ID (BDD) | Pregunta | Estado |
| --- | --- | --- |
| OQ-RES-105 | ¿Bajo qué criterios se podría cambiar la fecha de una reserva sin perderla por completo? | ✅ `RESUELTO` (31 ago) — se mantiene la regla tajante, sin criterios de excepción. Ver `BDD-RES-001`, sección 19.4, y BR-RES-003 arriba |
| OQ-RES-101/102/103/104 | Bloqueo provisional, no-show, reembolso, valor legal de aceptación remota | Todas `RESUELTO`/`RESUELTO parcial` desde el 27 ago — ver `BDD-RES-001`, sección 19.4 |

No hay decisiones `OQ-SOL-*` de arquitectura específicas de Reserva más allá de OQ-SOL-009 (firma electrónica, `EXCLUIDO_R1`) — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 28.

---

## 29. Plan de realización

Reserva corresponde al **Slice 4** del plan transversal: "Conversión a Reserva y bloqueo concurrente", con gate de Concurrencia (`SDD-KAIROS-TRANSVERSAL.md`, sección 29).

---

## 30. Criterios de aprobación

Este documento se aprueba junto con el resto de la serie bajo los 14 criterios de `SDD-KAIROS-TRANSVERSAL.md`, sección 30. Específico de Reserva: el criterio 1 (BDD aprobado) está completo para este proceso — las 5 preguntas de `BDD-RES-001` sección 19.4 están todas `RESUELTO` o `RESUELTO parcial`, ninguna sigue `PENDIENTE`.

---

## 31. Checklist de calidad 9–10

| Dimensión | Evidencia | Estado |
| --- | --- | --- |
| Vinculación con BDD | Sección 1.3, `BR-RES-*` en todo el documento | Cumple |
| Casos de uso | Sección 9 — 5 casos de uso | Cumple |
| Secuencias críticas | Sección 10 — 2 diagramas | Cumple |
| Modelo lógico de datos | Sección 11 | Cumple |
| Operaciones y errores | Sección 12 — 4 operaciones, 5 errores | Cumple |
| Eventos | Sección 13 | Cumple |
| UX Architecture | Sección 18 | Cumple |
| NFR específicos | Sección 19 — con vacío señalado (sin NFR de negocio medible) | Cumple con salvedad |
| Pruebas | Sección 24 — 5 casos obligatorios | Cumple |
| Trazabilidad BDD→SDD→TDD | Sección 27 | Cumple BDD→SDD; SDD→TDD parcial |
| Dependencia del documento transversal | Explícita en secciones 1.3, 5-8, 14-17, 20-23, 25-26, 29-30 | Cumple |

**Evaluación:** DRAFT COMPLETE para el alcance de Reserva. No aprobado — depende de los mismos roles técnicos sin asignar que el resto de la serie.

---

## Anexo A — Frontera entre SDD y TDD

Ver `SDD-KAIROS-TRANSVERSAL.md`, Anexo A.
