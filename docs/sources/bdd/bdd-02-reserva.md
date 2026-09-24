# BDD — 02 Reserva

# BDD-RES-001 — Proceso: Reserva

**Código:** BDD-KAIROS-MVP-002 / RES **Versión:** 1.9 (actualizado 03 sep 2026 — BR-RES-002 confirmada (traslado íntegro a garantía), BR-RES-009 ampliada para incluir la atomicidad que ya se citaba en SDD/TDD, EX-RES-005 nueva, protocolo de no-show precisado) **Depende de:** `BDD-KAIROS-TRANSVERSAL.md` (glosario, actores, catálogo de Cliente, reglas transversales, NFR, privacidad, criterios de aceptación)

> Parte de la serie BDD-KAIROS-MVP-002, dividida por gobernanza el 27 ago 2026. La fuente canónica sigue siendo el conjunto de estos documentos — ninguno se lee de forma aislada sin `BDD-KAIROS-TRANSVERSAL.md`.

### 7.4 Reserva

> ⚠️ **Corregido 27 ago 2026 (reunión con Fiorella):** se corrige el orden de los pasos y se retira el bloqueo provisional (`RES-P06.1`) que se había agregado como propuesta TO-BE el mismo día por la mañana. Fiorella aclaró en la reunión de la tarde que **no existe ningún tipo de bloqueo provisional** — el vehículo permanece disponible para cualquier otro cliente hasta el momento exacto en que se completan **ambos** requisitos: pago recibido **y** documentos/contrato entregados.

| Paso | Actor principal | Acción | Información gestionada | Regla/decisión | Resultado |
| --- | --- | --- | --- | --- | --- |
| RES-P01 | Cliente | Llegar desde Consulta con intención de reservar | — | Viene de Consulta (BR-CON-001) | Proceso de Reserva iniciado |
| RES-P02 | Administrador | Verificar ubicación del cliente | DAT-RES-001 | ¿Está en Ayacucho? | Determina modalidad |
| RES-P03 | Administrador | Determinar modalidad | DAT-RES-002 | Ayacucho + puede acercarse → presencial; si no, remota (BR-RES-005) | Modalidad definida |
| RES-P04 | Cliente | Entregar datos, destino, tiempo estimado | DAT-RES-006 | — | Requerimiento capturado |
| RES-P05 | Administrador | Verificar disponibilidad | Catálogo vigente, en función de los datos de RES-P04 | Solo se ofrece el vehículo si está disponible | Vehículo(s) elegibles determinados |
| RES-P06 | Cliente | Ver el vehículo elegible | Presencial: en persona. Remota: DAT-RES-004 (video 360°) | Se envía/muestra recién aquí, una vez confirmada la disponibilidad | Cliente conoce el vehículo |
| RES-P07 | Cliente | Decidir sobre el vehículo mostrado | — | ¿Le convence? Si no, se ofrecen alternativas | Continúa o cierra |
| RES-P08 | Cliente | Leer políticas y aceptar | Grabación de lectura | — | Aceptación registrada |
| RES-P09 | Cliente | Pagar el monto de reserva vigente | DAT-RES-003 (S/300 observado, parámetro versionado, BR-RES-001) | Por sí solo no bloquea el vehículo — ver RES-P11 | Pago registrado |
| RES-P10 | Cliente | Firmar contrato (y documento de aceptación si es remota) | DAT-RES-005 (condicional) | Por sí solo no bloquea el vehículo — ver RES-P11 | Contrato firmado |
| RES-P11 | Administrador | Bloquear el vehículo | Control interno y externo (BR-RES-009) | El bloqueo es un único evento atómico que ocurre solo cuando RES-P09 y RES-P10 están **ambos** completos | Vehículo bloqueado para el periodo |
| RES-P12 | Administrador | Enviar formato y archivar | Formato WhatsApp N°03 | — | Reserva confirmada |

#### 7.4.1 Sub-proceso: venta de vehículo reservado

| Paso | Actor principal | Acción | Regla/decisión | Resultado |
| --- | --- | --- | --- | --- |
| RES-P13 | Gerencia | Notificar la venta al administrador | BR-RES-007 | Cliente informado |
| RES-P14 | Administrador | Ofrecer alternativa con fotos/video 360° | — | Alternativa presentada |
| RES-P15 | Cliente | Decidir sobre la alternativa | ¿Acepta? | Reenvío de requisitos, o cancelación |
| RES-P16 | Gerencia | Procesar transferencia de devolución inmediata (si rechaza) | — | Reserva cancelada, monto devuelto |

### 8.4 Reserva

| ID | Información | Obligatoria | Condición | Validación funcional | Finalidad | Sensibilidad |
| --- | --- | --- | --- | --- | --- | --- |
| DAT-RES-001 | Ubicación del cliente (Ayacucho/fuera) | Sí | Siempre | Booleano | Determina modalidad (BR-RES-005) | Normal |
| DAT-RES-002 | Modalidad (presencial/remota) | Sí | Siempre | Enum | Define requisitos adicionales | Normal |
| DAT-RES-003 | Monto de la reserva vigente | Sí | Siempre | Parámetro versionado (BR-RES-001) — valor vigente observado: S/300 | Cálculo financiero | Financiera |
| DAT-RES-004 | Video 360° | Condicional | Modalidad remota | Duración/calidad mínima (`SUPUESTO`) | Evidencia del estado del vehículo | Normal |
| DAT-RES-005 | Documento de aceptación | Condicional | Modalidad remota | Firmado | Respaldo legal de la vía remota (BR-RES-006) | Sensible |
| DAT-RES-006 | Destino y tiempo estimado | Sí | Siempre | Igual que Consulta | Condiciona el vehículo elegible | Normal |
| DAT-RES-007 | Fecha/hora/vehículo reservado | Sí | Siempre | Inmutables tras confirmación (BR-RES-003) | Evita reprogramación no controlada | Normal |

### 9.3 Reserva

| ID | Regla | Prioridad | Fuente | Estado |
| --- | --- | --- | --- | --- |
| BR-RES-001 | El monto observado de reserva es S/300 y debe administrarse como parámetro versionado | Alta | SRC-RES-001 | `CONFIRMADO` |
| BR-RES-002 | Reserva concretada inicia posteriormente un alquiler. **El monto de S/300 ya pagado en la reserva se traslada íntegro a la garantía del alquiler, no es un concepto aparte ni se descuenta del precio del alquiler** — ejemplo: garantía Hilux S/1000, con los S/300 ya pagados el cliente paga S/700 más en oficina al firmar el contrato | Alta | SRC-RES-001; **confirmado 03 sep 2026** por José y Fiorella (antes `PENDIENTE_NEGOCIO` en `SDD-RES-001`, hallazgo P0-03 del 02 sep) | `CONFIRMADO` |
| BR-RES-003 | **No existe reprogramación de reserva.** Cualquier cambio de fecha/hora/vehículo hace perder el monto completo | Crítica | SRC-RES-001, sección 7 | `CONFIRMADO` — **Cierre 31 ago (OQ-RES-105):** regla tajante confirmada, sin criterios de excepción |
| BR-RES-004 | La reserva no pasa por notaría bajo ninguna circunstancia | Alta | SRC-RES-001 | `CONFIRMADO` |
| BR-RES-005 | Un cliente en Ayacucho que no puede acercarse a la oficina usa la misma vía remota que un cliente fuera de Ayacucho | Media | SRC-DL-001 (18 ago) | `CONFIRMADO` |
| BR-RES-006 | La modalidad remota exige video 360° del vehículo y un documento de aceptación firmado | Alta | SRC-RES-001 | `CONFIRMADO` |
| BR-RES-007 | Ante venta de un vehículo reservado, existe un proceso formal | Crítica | SRC-RES-001, sección 3.1 | `CONFIRMADO` |
| BR-RES-008 | Las variantes de conductor de Alquiler aplican igual en Reserva | Media | SRC-DL-001 (11 ago) | `CONFIRMADO` |
| BR-RES-009 | **El bloqueo del vehículo (compromiso firme) es un único evento atómico que ocurre solo cuando el pago y los documentos/contrato están completos a la vez — no existe bloqueo provisional.** Se registra en el control de alquileres interno y externo | Crítica | SRC-DL-001 (18 ago, registro dual); reunión 27 ago (atomicidad, Fiorella); reconfirmado 03 sep 2026 (reunión Fiorella) | `CONFIRMADO` — ⚠️ **Ampliada 03 sep 2026:** el texto original solo cubría el registro dual interno/externo; la garantía de atomicidad (pago+documentos a la vez) ya se citaba como "BR-RES-009" en `SDD-RES-001`/`TDD-RES-001` desde el 27 ago sin que el texto formal de esta fila la incluyera — se corrige para que el ID diga lo que ya se estaba usando en toda la serie SDD/TDD, sin necesidad de tocar esos documentos |

### 10.5 Modalidad de Reserva

| Cliente en Ayacucho | Puede acercarse a la oficina | Modalidad |
| --- | --- | --- |
| Sí | Sí | Presencial |
| Sí | No | Remota |
| No | — | Remota |

### 10.6 Resolución ante venta de vehículo reservado

| Cliente acepta la alternativa | Resultado |
| --- | --- |
| Sí | Reenvía requisitos, se emite nuevo formato de reserva |
| No | Cancelación + transferencia de devolución inmediata |

### 11.5 Reserva

| Estado | Significado | Entrada permitida | Salidas permitidas |
| --- | --- | --- | --- |
| Borrador | En preparación (viene de Consulta) | Creación | Pendiente de pago |
| Pendiente de pago | Esperando el S/300 | Borrador | Confirmada |
| Confirmada | Vehículo bloqueado, contrato firmado | Pendiente de pago | Convertida, Cancelada, Expirada |
| Convertida | Pasó a Alquiler en la fecha pactada | Confirmada | — (pasa a Alquiler) |
| Cancelada | Cliente cambió datos (pierde el monto, BR-RES-003) o rechazó alternativa ante venta | Confirmada | — |
| Expirada | Cliente no se presentó (no-show) | Confirmada | — |

### 12.4 Reserva

| Código | Situación | Tratamiento | Autorización | Evidencia |
| --- | --- | --- | --- | --- |
| EX-RES-001 | Vehículo reservado se vende antes de la fecha | Proceso formal (BR-RES-007) | Gerencia | Registro de la resolución |
| EX-RES-002 | Cliente solicita cambiar fecha/hora/vehículo | Cancelación con pérdida del monto completo (BR-RES-003) | — | Registro de cancelación |
| EX-RES-003 | Cliente solicita servicio de aeropuerto asociado a la reserva | Servicio real con cobro adicional | Administrador | Formato de solicitud |
| EX-RES-004 | Cliente no responde el día pactado (no-show) y al día siguiente confirma que sí quiere alquilar | Se pierde la reserva; compensación informal posible con kilometraje adicional. **Protocolo confirmado 03 sep 2026 (Fiorella):** no es un vencimiento automático — llamada 1 día antes como recordatorio, mensaje si no contesta, segunda llamada 2h antes de la hora pactada; sin respuesta, la reserva queda perdida sin devolución. La decisión de dar por perdida la reserva la evalúa Gerencia caso por caso, no un proceso automático | Gerencia | Registro de la negociación (caso real, 31 ago) |
| EX-RES-005 | **Nuevo, 03 sep 2026:** dos clientes compiten por el mismo vehículo — uno paga el depósito pero no completa los 4 requisitos (contrato firmado, políticas firmadas, documento de responsabilidad, voucher); el otro paga y sí completa todos los requisitos primero | El vehículo queda para quien completó **todos** los requisitos primero (BR-RES-009). Al cliente que se queda sin vehículo se le ofrecen alternativas antes de tocar su dinero; si no acepta ninguna, se le hace el reembolso del depósito de inmediato — no aplica la irreversibilidad de `BR-RES-003`/`OQ-RES-103` porque su reserva nunca llegó a confirmarse | Administrador, con validación de Gerencia | Registro de la consulta al cliente y de la devolución (confirmado por José y Fiorella, reuniones del 03 sep) |

### 16.3 Reserva (BR-RES-001, BR-RES-004, BR-RES-006, RES-P11)

```
@SC-RES-001
Feature: Pago del monto de reserva vigente

  @SC-RES-001.01
  Scenario: Cliente paga el monto vigente completo
    Given una reserva con el vehículo elegible mostrado
    When el cliente paga el monto de reserva vigente (S/300 observado)
    Then el pago queda validado
    And la reserva avanza a firma de contrato

  @SC-RES-001.02
  Scenario: Cliente paga un monto menor al vigente
    Given una reserva con el vehículo elegible mostrado
    When el cliente registra un pago menor al monto de reserva vigente
    Then el sistema no valida el pago
    And la reserva permanece en estado pendiente de pago
```

```
@SC-RES-002
Feature: La reserva nunca pasa por notaría

  @SC-RES-002.01
  Scenario: Intento de exigir notaría en una reserva
    Given una reserva en proceso, sin importar el vehículo
    When se intenta aplicar el flujo notarial de Alquiler a la reserva
    Then el sistema no permite ese paso
```

```
@SC-RES-003
Feature: Requisitos de la modalidad remota de reserva

  @SC-RES-003.01
  Scenario: Reserva remota completa
    Given un cliente fuera de Ayacucho
    When revisa el video 360° del vehículo
    And firma el documento de aceptación
    Then la reserva remota queda habilitada para pago

  @SC-RES-003.02
  Scenario: Falta el documento de aceptación
    Given un cliente fuera de Ayacucho que ya revisó el video 360°
    When no firma el documento de aceptación
    Then la reserva no puede confirmarse por la vía remota
```

```
@SC-RES-004
Feature: Bloqueo atómico del vehículo en Reserva

  @SC-RES-004.01
  Scenario: Pago y documentos completos — el vehículo se bloquea
    Given una reserva con el monto de reserva vigente pagado
    When el cliente entrega también el contrato/documento de aceptación firmado
    Then el vehículo queda bloqueado para el periodo pactado (RES-P11)

  @SC-RES-004.02
  Scenario: Solo el pago está completo, faltan los documentos
    Given una reserva con el monto de reserva vigente pagado
    When el cliente no ha entregado el contrato/documento de aceptación
    Then el vehículo permanece disponible para otros clientes

  @SC-RES-004.03
  Scenario: Solo los documentos están completos, falta el pago
    Given una reserva con el contrato/documento de aceptación ya firmado
    When el cliente no ha pagado el monto de reserva vigente
    Then el vehículo permanece disponible para otros clientes
```

### 16.3.1 Cliente pierde el monto de reserva al solicitar un cambio (BR-RES-003) — migrado desde `BDD-KAIROS-TRANSVERSAL.md` el 01 sep 2026

> Confirma con un escenario Gherkin explícito la regla tajante reafirmada el 31 de agosto (OQ-RES-105) — hasta ahora solo vivía en la matriz de excepciones (EX-RES-002) y en el caso real (EX-RES-004).

```
@SC-RES-005
Feature: Cliente pierde el monto de reserva al solicitar un cambio

  @SC-RES-005.01
  Scenario: Cliente solicita cambiar la fecha de una reserva confirmada
    Given una reserva confirmada
    When el cliente solicita cambiar fecha, hora o vehículo
    Then el sistema no permite modificar la reserva
    And se trata como una cancelación
    And el cliente pierde el monto de reserva vigente pagado (S/300 observado)

  @SC-RES-005.02
  Scenario: Cliente pierde la reserva por no presentarse y decide alquilar de todas formas
    Given una reserva confirmada cuyo cliente no respondió el día pactado
    When el cliente confirma al día siguiente que sí quiere alquilar
    Then la reserva original queda cancelada, sin devolución del monto
    And cualquier compensación (ej. kilometraje adicional) es informal, decidida caso por caso por Gerencia, y no revierte la pérdida del monto
```

### 16.3.2 Vehículo reservado se vende antes de la fecha pactada (BR-RES-007) — migrado desde `BDD-KAIROS-TRANSVERSAL.md` el 01 sep 2026

```
@SC-RES-006
Feature: Vehículo reservado se vende antes de la fecha pactada

  @SC-RES-006.01
  Scenario: Cliente rechaza la alternativa ofrecida
    Given una reserva confirmada cuyo vehículo fue vendido
    When se ofrece una alternativa con fotos y video 360°
    And el cliente la rechaza
    Then Gerencia procesa la transferencia de devolución inmediata
    And la reserva queda cancelada
```

> 📌 La trazabilidad de este proceso vive en `BDD-KAIROS-TRACEABILITY.md`, sección 18.4.

### 16.3.3 Determinar modalidad de Reserva según ubicación (BR-RES-005) — nuevo, 02 sep 2026

```
@SC-RES-007
Feature: Determinar modalidad de Reserva según ubicación

  @SC-RES-007.01
  Scenario: Cliente en Ayacucho, puede acercarse
    Given un cliente ubicado en Ayacucho que puede acercarse a la oficina
    When se determina la modalidad
    Then la modalidad es presencial

  @SC-RES-007.02
  Scenario: Cliente fuera de Ayacucho, o no puede acercarse
    Given un cliente fuera de Ayacucho, o que no puede acercarse a la oficina
    When se determina la modalidad
    Then la modalidad es remota
```

### 16.3.4 Tratamiento financiero al convertir Reserva en Alquiler (BR-RES-002) y competencia por el mismo vehículo (EX-RES-005) — nuevo, 03 sep 2026

```
@SC-RES-008
Feature: Tratamiento financiero de la garantía al convertir Reserva en Alquiler

  @SC-RES-008.01
  Scenario: El monto de reserva se traslada íntegro a la garantía
    Given una reserva confirmada con el monto de S/300 ya pagado
    And una garantía de alquiler de S/1000 para el vehículo reservado
    When el cliente llega a oficina y firma el contrato de alquiler
    Then el monto de S/300 se traslada íntegro a la garantía
    And el cliente completa S/700 adicionales para cubrir la garantía total

@SC-RES-009
Feature: Dos clientes compiten por el mismo vehículo

  @SC-RES-009.01
  Scenario: El segundo cliente completa los 4 requisitos primero
    Given un primer cliente que pagó el depósito de S/300 pero no envió los 3 documentos restantes
    And un segundo cliente que paga el depósito y envía los 4 requisitos completos antes que el primero
    When se evalúa quién se queda con el vehículo
    Then el vehículo queda para el segundo cliente
    And al primer cliente se le ofrecen vehículos alternativos disponibles

  @SC-RES-009.02
  Scenario: El primer cliente rechaza las alternativas ofrecidas
    Given el primer cliente del escenario anterior, que perdió la carrera por el vehículo
    When se le ofrecen alternativas y las rechaza todas
    Then se le reembolsa el depósito de inmediato
    And no aplica la irreversibilidad de BR-RES-003/OQ-RES-103, porque su reserva nunca llegó a confirmarse
```

> 📌 Fuente: transcripciones de reunión con José Pariona (03 sep, 08:56) y con Fiorella (03 sep, 12:17), ambas confirmando el mismo tratamiento.

| ID | Pregunta | Opciones | Propietario | Impacto | Estado |
| --- | --- | --- | --- | --- | --- |
| OQ-RES-101 | ¿Cuánto dura el bloqueo provisional del vehículo? | — | Operación | Disponibilidad del vehículo | `RESUELTO` 27 ago — **La pregunta parte de una premisa incorrecta: no existe bloqueo provisional.** |
| OQ-RES-102 | ¿Existe tolerancia de no-show para Reserva? | — | Operación | Liberación del vehículo | `RESUELTO` 27 ago — **Sin tolerancia contractual formal.** Confirmado con caso real 31 ago (EX-RES-004) |
| OQ-RES-103 | ¿El monto de S/300 es reembolsable en algún otro caso? | — | Fiorella | Política de reembolsos | `RESUELTO` 27 ago — **No es reembolsable en ningún otro caso** una vez que la reserva está confirmada. ⚠️ **Aclarado 03 sep 2026:** esto no contradice `EX-RES-005` (cliente que paga pero pierde la carrera por completar los 4 requisitos) — ese caso nunca llega a tener una reserva confirmada, por lo que devolverle el depósito no es "reembolsar una reserva", es simplemente no cobrar por algo que nunca se concretó |
| OQ-RES-104 | ¿Qué valor legal tiene la aceptación remota? | — | Legal | Validez del contrato a distancia | `RESUELTO parcial` 27 ago — documentos internos, sin fuerza legal formal por sí solos, pero con valor probatorio práctico ya demostrado |
| OQ-RES-105 | ¿Bajo qué criterios se podría cambiar la fecha de una reserva sin perderla por completo? | — | Fiorella | Nivel de flexibilidad de BR-RES-003 | `RESUELTO` (31 ago) — **Se mantiene la regla tajante, sin criterios de excepción.** |

### 21.4 Reserva

| Caso | Ubicación | Modalidad | Cambio de fecha | Resultado |
| --- | --- | --- | --- | --- |
| DT-RES-01 | Ayacucho, puede acercarse | Presencial | No | Reserva confirmada |
| DT-RES-02 | Fuera de Ayacucho | Remota | No | Reserva confirmada con video 360° |
| DT-RES-03 | Cualquiera | Cualquiera | Sí | Cancelada, pierde el monto |
| DT-RES-04 | Cualquiera | Cualquiera | — (vehículo vendido, cliente acepta alternativa) | Reserva reformulada |
| DT-RES-05 | Cualquiera | Cualquiera | — (vehículo vendido, cliente rechaza) | Cancelada, reembolso inmediato |
