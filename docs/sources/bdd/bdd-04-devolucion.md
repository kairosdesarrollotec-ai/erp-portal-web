# BDD — 04 Devolución

# BDD-DEV-001 — Proceso: Devolución

**Código:** BDD-KAIROS-MVP-002 / DEV **Versión:** 1.9 (actualizado 02 sep 2026 — 3 escenarios Gherkin nuevos: BR-DEV-004/005/009) **Depende de:** `BDD-KAIROS-TRANSVERSAL.md` (glosario, actores, catálogo de Cliente, reglas transversales, NFR, privacidad, criterios de aceptación)

> Parte de la serie BDD-KAIROS-MVP-002, dividida por gobernanza el 27 ago 2026. La fuente canónica sigue siendo el conjunto de estos documentos — ninguno se lee de forma aislada sin `BDD-KAIROS-TRANSVERSAL.md`.

### 7.2 Devolución

| Paso | Actor principal | Acción | Información gestionada | Regla/decisión | Resultado |
| --- | --- | --- | --- | --- | --- |
| DEV-P01 | Administrador | Enviar recordatorio | Hora pactada | 3h antes, 30 min tolerancia, escalamiento si no contesta (BR-DEV-004) | Cliente confirma hora |
| DEV-P02 | Administrador | Tomar custodia preventiva del vehículo | Hora real de llegada | El vehículo queda bajo resguardo de VeloxRent, pero la devolución contractual todavía no se cierra (estado `RECEPCIÓN PROVISIONAL`) | Vehículo en custodia, expediente sin cerrar |
| DEV-P03 | Administrador | Aplicar prueba de alcolímetro | Resultado | Favorable → continúa a inspección. Desfavorable → permanece en custodia preventiva, se deriva a Gerencia (BR-DEV-005) | Continúa a inspección / queda en custodia |
| DEV-P04 | Administrador + Operador + Cliente | Ejecutar checklist de retorno | Inspección interna/externa, documento de responsabilidad (BR-DEV-009) | Cliente firma; se registra ausencia si no está presente | Checklist completo |
| DEV-P05 | Operador (mecánico) | Evaluar si hay daño | Comparación contra entrega | ¿Sin daños? | Sin daños / con daños |
| DEV-P06 | Sistema | Iniciar devolución de garantía (sin daños) | Monto, fecha de recepción | 24h seguidas naturales (BR-DEV-001) | Garantía en proceso |
| DEV-P07 | Gerencia/Subgerencia | Asignar descuento (daño leve/moderado) | Tabla de precios por "paño" (BR-DEV-006) para daño estético; informe/presupuesto individual del mecánico externo (Motrix) para daño técnico | Vehículo con daño se deriva de inmediato a Motrix si es técnico. Si el cliente se demora más de 24h desde la devolución sin responder, los días de paralización se le cobran como alquiler adicional (BR-DEV-011) | Descuento aplicado, cliente clasificado |
| DEV-P08 | José Pariona | Clasificar gravedad (daño grande) | Formato de revisión + video | Leve/Moderado/Grave (BR-DEV-007) | Gravedad determinada |
| DEV-P09 | Gerencia/Subgerencia | Resolver daño grande | Costo estimado, lucro cesante | No aplican 24h; vehículo inmovilizado; cliente siempre pasa a rojo | Caso resuelto o vía legal |
| DEV-P10 | Administrador | Archivar expediente | Documentos finales | — | Expediente cerrado |

#### 7.2.1 Flujo alternativo: titular ausente en la devolución

Basado en el caso real del choque del Hilux (Ficha de Devolución, Fase 5b): si el titular no está presente, quien esté presente firma un documento de responsabilidad sobre el estado del vehículo, se documenta con video/fotos esa misma noche, y al día siguiente se hace la notificación formal con el detalle completo de daños.

### 8.2 Devolución

| ID | Información | Obligatoria | Condición | Validación funcional | Finalidad | Sensibilidad |
| --- | --- | --- | --- | --- | --- | --- |
| DAT-DEV-001 | Hora de recordatorio enviado | Sí | Siempre | Timestamp | Cumplimiento operativo (P-33) | Interna |
| DAT-DEV-002 | Resultado de alcolímetro (devolución) | Sí | Siempre | `FAVORABLE`/`DESFAVORABLE` | Determina si se recibe el vehículo | Auditada |
| DAT-DEV-003 | Gravedad del daño | Condicional | Si hay daño | `LEVE`/`MODERADO`/`GRAVE` | Determina el tratamiento (BR-DEV-007) | Interna |
| DAT-DEV-004 | Monto de descuento | Condicional | Con daño | Tarifario de "paño" (tabla 9.6.1) para estético; informe individual de Motrix para técnico | Cálculo financiero | Financiera |
| DAT-DEV-005 | Documento de responsabilidad por infracciones | Sí | Siempre | Firmado | Respaldo legal ante la SAT | Sensible |
| DAT-DEV-006 | Acta de devolución de garantía | Condicional | Si el cliente la solicita | Documento opcional | Garantía adicional al cliente | Normal |
| DAT-DEV-007 | Evidencia de daño (video + fotos) | Condicional | Si hay daño | Vinculada al vehículo y fecha | Sustentar el descuento o clasificación | Normal |
| DAT-DEV-008 | Días de paralización del vehículo en taller | Condicional | Vehículo con daño en evaluación/reparación | Conteo de días desde la devolución hasta la resolución | Se cobran al cliente como alquiler adicional (BR-DEV-011) | Financiera |

### 9.6 Devolución

| ID | Regla | Prioridad | Fuente | Estado |
| --- | --- | --- | --- | --- |
| BR-DEV-001 | Una devolución sin daños libera la garantía dentro de un plazo **máximo** de 24 horas seguidas (naturales) — no es un tiempo mínimo de espera | Crítica | SRC-DL-001 (21 ago) | `CONFIRMADO` — `RESUELTO` OQ-006 |
| BR-DEV-002 | Un daño grande suspende el plazo normal de 24h y puede inmovilizar el vehículo hasta que el cliente asuma el costo | Crítica | SRC-DEV-001, Fase 5b | `CONFIRMADO` |
| BR-DEV-003 | Tolerancia de devolución sin sanción: 30 minutos | Media | SRC-ALQ-001, sección 7 | `CONFIRMADO` |
| BR-DEV-004 | Recordatorio 3h antes de la devolución, con 30 min de tolerancia y protocolo de escalamiento | Media | SRC-DEV-001, paso 15 | `CONFIRMADO` — cumplimiento operativo sigue siendo un problema (P-33) |
| BR-DEV-005 | Un cliente que se presenta ebrio a la devolución es motivo suficiente para marcarlo "cliente rojo" directamente | Alta | SRC-DEV-001 (13 ago) | `CONFIRMADO` |
| BR-DEV-006 | La tabla de precios por daño solo es viable para daños estéticos (tarifario tabla 9.6.1). Los daños técnicos/internos **no tienen ni van a tener tabla fija** — se resuelven siempre vía informe individual del mecánico externo (Motrix) | Alta | SRC-DL-001 (17, 27 ago); tarifario confirmado 31 ago | `CONFIRMADO` — cierra `RESUELTO` OQ-009 (31 ago) |
| BR-DEV-007 | La gravedad del daño (leve/moderado/grave) la evalúa José Pariona; un daño grave siempre pasa al cliente a rojo | Crítica | SRC-DEV-001, Fase 5b | `CONFIRMADO` |
| BR-DEV-008 | El semáforo de riesgo tiene un estado base `SIN_OBSERVACIÓN` y 2 niveles de observación (Ámbar/Rojo). **Confirmado 31 ago:** no existe ciclo de rehabilitación — es definitivo. El semáforo es por empresa, con historial visible al grupo | Crítica | SRC-DL-001 (4, 21 ago); rehabilitación y alcance confirmados 31 ago | `CONFIRMADO` — `RESUELTO` OQ-DEV-102 (31 ago) |
| BR-DEV-009 | El cliente firma un documento de responsabilidad declarando no haber incurrido en infracciones | Alta | SRC-DEV-001, paso 17 | `CONFIRMADO` |
| BR-DEV-010 | El acta de devolución de garantía es opcional, se emite solo si el cliente la solicita | Baja | SRC-DL-001 (24 ago) | `CONFIRMADO` |
| BR-DEV-011 | Si el vehículo queda paralizado más allá de las 24h desde la devolución, esos días se cobran al cliente como días de alquiler adicionales, además del monto del daño | Alta | SRC-DL-001 (31 ago) | `CONFIRMADO` — nueva regla, agregada 31 ago |

#### 9.6.1 Tarifario de daños estéticos (Carrocería) — confirmado 31 ago

| Componente | Precio |
| --- | --- |
| Pulido y encerado | S/ 30.00 |
| Paño en los espejos | S/ 100.00 |
| Paño en el capot | S/ 200.00 |
| Paño en la maletera | S/ 250.00 |
| Paño en la puerta lateral derecha e izquierda | S/ 180.00 |
| Paño en la puerta de pasajero derecha e izquierda | S/ 180.00 |
| Paño en la última parte lateral derecha e izquierda | S/ 180.00 |
| Paño lateral delantera derecha e izquierda | S/ 180.00 |
| Paño de la parte del techo | S/ 180.00 |
| Llenado de combustible por línea | S/ 50.00 |

> ⚠️ Motor, frenos, suspensión, dirección, parachoques nuevo, llanta nueva y pitón **no tienen precio fijo** — por diseño, no por dato pendiente (ver BR-DEV-006). Fuente: tarifario oficial VeloxRent, imagen recibida de Fiorella (código de vehículo V22, Chevrolet Spin, placa Z7A-434). **Nota sobre las fechas del documento (01 sep 2026):** Fiorella confirmó que las fechas de elaboración/modificación/revisión que trae el formato son aleatorias/de ejemplo — lo que está vigente y en uso es el formato y los precios en sí, no esas fechas puntuales. No se trata como una inconsistencia a resolver.

### 10.3 Clasificación de daño en Devolución

| Gravedad | Cliente acepta el costo | Resultado |
| --- | --- | --- |
| Leve | Sí | Cliente ámbar, sigue proceso normal |
| Leve | No | Se negocia; puede terminar en ámbar parcial |
| Moderado | Sí | Cliente observado, sin negociación previa |
| Moderado | No | Vía legal |
| Grave | Cualquiera | Cliente rojo siempre; si no coopera, vía legal |

### 11.2 Devolución

| Estado | Significado | Custodia del vehículo | Devolución cerrada? | Entrada permitida | Salidas permitidas |
| --- | --- | --- | --- | --- | --- |
| Programada | Recordatorio enviado, vehículo aún con el cliente | Cliente | No | Fin de Alquiler | Recepción provisional |
| Recepción provisional | Vehículo llegó a VeloxRent; alcolímetro pendiente o desfavorable | VeloxRent | No | Programada | Inspección |
| Inspección | Checklist de retorno en curso | VeloxRent | No | Recepción provisional | Sin daños / Con daños |
| Sin daños | Garantía en curso de devolución | VeloxRent | No | Inspección | Cierre financiero |
| Con daños | Descuento o daño grande en evaluación | VeloxRent | No | Inspección | Cierre financiero / Vía legal |
| Cierre financiero | Garantía resuelta | VeloxRent | No | Sin/Con daños | Cerrada |
| Cerrada | Expediente archivado | N/A | Sí | Cierre financiero | — |

### 12.2 Devolución

| Código | Situación | Tratamiento | Autorización | Evidencia |
| --- | --- | --- | --- | --- |
| EX-DEV-001 | Cliente titular no presente en la devolución (caso real: choque del Hilux) | Se documenta con video/fotos, quien esté presente firma documento de responsabilidad | Administrador | Video, fotos, documento firmado |
| EX-DEV-002 | Choque/avería/intervención policial durante el alquiler | Cliente debe avisar en 15 min y enviar evidencia en 30 min | Cliente | Registro de tiempo de aviso |
| EX-DEV-003 | Cliente intenta ocultar un daño | Se detecta por auditoría posterior | — | Comparación fotográfica |

### 16.6 Devolución (BR-DEV-001, BR-DEV-002, BR-DEV-007, BR-DEV-008, BR-DEV-010)

```
@SC-DEV-001
Feature: Devolución de garantía en 24 horas naturales (plazo máximo, no mínimo de espera)

  @SC-DEV-001.01
  Scenario: Devolución inmediata cuando las verificaciones ya están listas
    Given una devolución cerrada sin daños
    When Finanzas completa las verificaciones antes del límite de 24 horas
    Then la garantía puede liberarse de inmediato, sin esperar a que se cumplan las 24 horas

  @SC-DEV-001.02
  Scenario: Control del plazo máximo
    Given una devolución cerrada sin daños
    When se acerca el límite de 24 horas naturales desde la recepción sin que la garantía se haya liberado
    Then el sistema alerta al responsable

  @SC-DEV-001.03
  Scenario: Daño grande suspende el plazo
    Given una devolución con daño clasificado como grave
    When se evalúa el plazo de garantía
    Then el plazo de 24 horas no aplica
```

```
@SC-DEV-002
Feature: Transiciones del semáforo de riesgo del cliente

  @SC-DEV-002.01
  Scenario: Cliente nuevo sin antecedentes
    Given un cliente que nunca tuvo una observación registrada
    When se consulta su estado de riesgo
    Then el estado es SIN_OBSERVACIÓN

  @SC-DEV-002.02
  Scenario: Daño leve asumido por el cliente
    Given un cliente en estado SIN_OBSERVACIÓN
    When se le clasifica un daño leve y lo asume sin objeción
    Then el estado pasa a ÁMBAR

  @SC-DEV-002.03
  Scenario: Daño grave, independientemente de si el cliente asume el costo
    Given un cliente en cualquier estado de riesgo
    When se le clasifica un daño grave
    Then el estado pasa a ROJO

  @SC-DEV-002.04
  Scenario: Sin rehabilitación de estado
    Given un cliente en estado ÁMBAR o ROJO
    When acumula múltiples alquileres posteriores sin ningún incidente
    Then su estado no cambia
```

```
@SC-DEV-003
Feature: Acta de devolución de garantía (opcional)

  @SC-DEV-003.01
  Scenario: Cliente solicita el acta
    Given una devolución sin daños en curso de garantía
    When el cliente solicita explícitamente el acta de devolución de garantía
    Then se emite el documento con el compromiso de devolución en 24h

  @SC-DEV-003.02
  Scenario: Cliente no solicita el acta
    Given una devolución sin daños en curso de garantía
    When el cliente no solicita ningún documento adicional
    Then no se emite el acta
```

### 16.6.1 Titular ausente en la devolución (excepción EX-DEV-001) — migrado desde `BDD-KAIROS-TRANSVERSAL.md` el 01 sep 2026

```
@SC-DEV-004
Feature: Titular ausente en la devolución

  @SC-DEV-004.01
  Scenario: Persona distinta al titular recibe la devolución
    Given que el titular no está presente al momento de devolver el vehículo
    When otra persona vinculada al alquiler se hace presente
    Then se documenta con video y fotos el estado del vehículo
    And esa persona firma un documento de responsabilidad
    And se realiza la notificación formal al titular al día siguiente
```

### 16.6.2 Evaluación de daño técnico sin tabla de precios fija (BR-DEV-006) — nuevo, 01 sep 2026

```
@SC-DEV-005
Feature: Evaluación de daño técnico sin tabla de precios fija

  @SC-DEV-005.01
  Scenario: Daño técnico se deriva a informe individual
    Given un daño detectado en la devolución clasificado como técnico (motor, frenos, suspensión o dirección)
    When se evalúa el monto del daño
    Then no se aplica ninguna tabla de precios interna
    And el vehículo se deriva de inmediato al mecánico externo Motrix para un informe individual

  @SC-DEV-005.02
  Scenario: Daño estético usa el tarifario fijo
    Given un daño detectado en la devolución clasificado como estético (carrocería)
    When se evalúa el monto del daño
    Then se aplica el tarifario oficial de la tabla 9.6.1
```

### 16.6.3 Clasificación de gravedad del daño (BR-DEV-007) — nuevo, 01 sep 2026

```
@SC-DEV-006
Feature: Clasificación de gravedad del daño

  @SC-DEV-006.01
  Scenario: José Pariona clasifica el daño
    Given un daño detectado durante la devolución
    When José Pariona evalúa el formato de revisión y el video
    Then el daño queda clasificado como leve, moderado o grave
    And esa clasificación determina el tratamiento siguiente (tabla 10.3)
```

### 16.6.4 Cobro de días de paralización (BR-DEV-011) — nuevo, 01 sep 2026

```
@SC-DEV-007
Feature: Cobro de días de paralización por daño técnico

  @SC-DEV-007.01
  Scenario: Cliente responde dentro de las 24 horas
    Given un vehículo con daño técnico derivado a informe de Motrix
    When el cliente responde al informe dentro de las 24 horas desde la devolución
    Then no se genera ningún cargo adicional por paralización

  @SC-DEV-007.02
  Scenario: Cliente no responde dentro de las 24 horas
    Given un vehículo con daño técnico derivado a informe de Motrix
    When transcurren más de 24 horas desde la devolución sin respuesta del cliente
    Then los días de paralización se cobran al cliente como alquiler adicional
    And el cargo se suma al monto del daño, no lo reemplaza
```

> 📌 La trazabilidad de este proceso vive en `BDD-KAIROS-TRACEABILITY.md`, sección 18.2.

### 16.6.5 Recordatorio de devolución (BR-DEV-004) — nuevo, 02 sep 2026

```
@SC-DEV-008
Feature: Recordatorio de devolución 3 horas antes

  @SC-DEV-008.01
  Scenario: Recordatorio enviado a tiempo
    Given un alquiler activo cuya hora de devolución pactada se acerca
    When faltan 3 horas para la hora pactada
    Then el sistema envía el recordatorio al cliente
    And registra la hora de envío
```

### 16.6.6 Alcolímetro desfavorable en la devolución (BR-DEV-005) — nuevo, 02 sep 2026

```
@SC-DEV-009
Feature: Alcolímetro desfavorable en la devolución

  @SC-DEV-009.01
  Scenario: Cliente presenta alcolímetro desfavorable al devolver
    Given un cliente que llega a devolver el vehículo
    When el resultado del alcolímetro es desfavorable
    Then el vehículo queda en recepción provisional, sin cerrar la devolución
    And se deriva a Gerencia
    And el cliente queda como candidato a "rojo"
```

### 16.6.7 Documento de responsabilidad al devolver (BR-DEV-009) — nuevo, 02 sep 2026

```
@SC-DEV-010
Feature: Documento de responsabilidad al devolver

  @SC-DEV-010.01
  Scenario: Cliente firma el documento de responsabilidad
    Given una devolución con checklist en curso
    When el cliente completa el checklist de retorno
    Then firma el documento de responsabilidad declarando no haber incurrido en infracciones
    And ese documento queda como respaldo legal ante la SAT
```

### 19.2 Devolución

| ID | Pregunta | Opciones | Propietario | Impacto | Estado |
| --- | --- | --- | --- | --- | --- |
| OQ-009 | ¿Cuál es la tabla técnica de daños y autorizaciones? | — | Fiorella/José Pariona | Cálculo de descuentos | `RESUELTO` (31 ago) — No existe tabla técnica de precios, por diseño. Ver BR-DEV-006 y `@SC-DEV-005` |
| OQ-DEV-101 | ¿Existe un plazo máximo para que Gerencia asigne el descuento en un daño leve/moderado? | — | Operación | Cuello de botella (P-25) | ✅ `RESUELTO` (02 sep 2026) — **Confirmado por Fiorella: no existe ni debe existir un plazo fijo, por diseño.** El monto depende de si el cliente acepta el daño o no, y de la negociación caso por caso — un SLA numérico no reflejaría la realidad del proceso. Queda como parámetro variable, no como un dato pendiente de definir. El mecanismo alternativo (BR-DEV-011, cobro de días de paralización si el cliente se demora en responder) sigue siendo el control operativo real |
| OQ-DEV-102 | ¿El semáforo de riesgo tiene ciclo de rehabilitación? | — | Fiorella | Diseño del ciclo de vida del cliente | `RESUELTO` (31 ago) — No existe rehabilitación. Ver BR-DEV-008 |

### 21.2 Devolución

| Caso | Alcolímetro | Daño | Resultado |
| --- | --- | --- | --- |
| DT-DEV-01 | Favorable | Sin daños | Garantía en curso de devolución (24h) |
| DT-DEV-02 | Favorable | Leve, cliente acepta | Cliente ámbar, descuento aplicado |
| DT-DEV-03 | Favorable | Grave | Cliente rojo, vehículo inmovilizado |
| DT-DEV-04 | Desfavorable | — | Recepción provisional |
