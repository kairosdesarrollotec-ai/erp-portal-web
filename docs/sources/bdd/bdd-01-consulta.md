# BDD — 01 Consulta

# BDD-CON-001 — Proceso: Consulta

**Código:** BDD-KAIROS-MVP-002 / CON **Versión:** 1.8 (actualizado 02 sep 2026 — escenario Gherkin nuevo: BR-CON-005) **Depende de:** `BDD-KAIROS-TRANSVERSAL.md` (glosario, actores, catálogo de Cliente, reglas transversales, NFR, privacidad, criterios de aceptación)

> Parte de la serie BDD-KAIROS-MVP-002, dividida por gobernanza el 27 ago 2026. La fuente canónica sigue siendo el conjunto de estos documentos — ninguno se lee de forma aislada sin `BDD-KAIROS-TRANSVERSAL.md`.

### 7.3 Consulta

| Paso | Actor principal | Acción | Información gestionada | Regla/decisión | Resultado |
| --- | --- | --- | --- | --- | --- |
| CON-P01 | Cliente | Contactar por canal habilitado | DAT-CON-004 (canal) | Presencial, WhatsApp, redes o web, tras publicación/campaña | Contacto registrado |
| CON-P02 | Administrador | Recepcionar y solicitar datos/razón de uso | Nombre, motivo | — | Datos iniciales recibidos |
| CON-P03 | Administrador | Evaluar uso | DAT-CON-001 | ¿Uso turístico? | Continúa o se cierra sin conversión |
| CON-P04 | Cliente | Brindar destino, periodo, personas | DAT-CON-003 | Condiciona qué vehículo se puede ofrecer (BR-CON-005) | Requerimiento capturado |
| CON-P05 | Administrador | Verificar procedencia | DAT-CON-002 | ¿Peruano? | Determina el 3er requisito (BR-CON-004) |
| CON-P06 | Administrador | Informar requisitos y tarifario | Lista de documentos según nacionalidad | — | Cliente informado |
| CON-P07 | Administrador | Mostrar el vehículo | Presencial: en persona. Virtual: DAT-CON-006 (fotos/video) | Modalidad según canal | Cliente conoce el vehículo |
| CON-P08 | Cliente | Revisar información | — | ¿Desea continuar con reserva o alquiler? | Continúa o se cierra |
| CON-P09 | Administrador | Derivar o cerrar | DAT-CON-005 (motivo, si no continúa) | Deriva a Reserva o Alquiler según el caso; si no, se registra el motivo | Consulta cerrada (con o sin conversión) |

### 8.3 Consulta

| ID | Información | Obligatoria | Condición | Validación funcional | Finalidad | Sensibilidad |
| --- | --- | --- | --- | --- | --- | --- |
| DAT-CON-001 | Uso turístico (sí/no) | Sí | Siempre | Booleano | Determina si continúa (BR-CON-005 en sentido amplio) | Normal |
| DAT-CON-002 | Nacionalidad | Sí | Siempre | `PERUANO`/`EXTRANJERO` | Determina requisitos (BR-CON-004) | Normal |
| DAT-CON-003 | Destino y tiempo estimado | Sí | Siempre | Texto/duración | Condiciona vehículo elegible (BR-CON-005) | Normal |
| DAT-CON-004 | Canal de contacto | Sí | Siempre | Enum (WhatsApp/llamada/presencial/web/redes) | Trazabilidad de origen | Normal |
| DAT-CON-005 | Motivo de no continuar | Condicional | Si cierra sin conversión | Texto libre | Análisis de causas de no conversión | Normal |
| DAT-CON-006 | Fotos/video del vehículo enviados | Condicional | Modalidad virtual | Registro de envío | Evidencia de la exhibición remota | Normal |

### 9.2 Consulta

| ID | Regla | Prioridad | Fuente | Estado |
| --- | --- | --- | --- | --- |
| BR-CON-001 | Consulta es un proceso separado de Reserva, Alquiler y Devolución | Alta | SRC-DL-001 (19-21 ago) | `CONFIRMADO` |
| BR-CON-002 | Una consulta puede cerrar sin conversión, convertirse en reserva o en alquiler directo | Alta | SRC-CON-001 | `CONFIRMADO` |
| BR-CON-003 | Todos los clientes, presenciales y remotos, sin excepción para clientes recurrentes, pasan siempre por alguna modalidad de Consulta antes de Reserva o Alquiler | Crítica | SRC-DL-001 (21 ago) | `CONFIRMADO` |
| BR-CON-004 | Verificación de nacionalidad determina el tercer requisito solicitado: peruano → recibo de agua/luz; extranjero → constancia de hospedaje | Alta | SRC-CON-001 | `CONFIRMADO` |
| BR-CON-005 | El destino y tiempo estimado del viaje condicionan qué vehículo se puede ofrecer (restricciones de ruta/trocha) | Media | SRC-ALQ-001 (10 ago) | `CONFIRMADO`, con vacío reconocido para rutas mixtas (P-31) |

### 10.4 Derivación de Consulta

| Uso turístico | Cliente decide continuar | Resultado |
| --- | --- | --- |
| No | — | Cierre sin conversión |
| Sí | No | Cierre sin conversión, con motivo registrado |
| Sí | Sí | Deriva a Reserva o Alquiler, según si la fecha es futura o inmediata |

### 11.4 Consulta

| Estado | Significado | Entrada permitida | Salidas permitidas |
| --- | --- | --- | --- |
| Registrada | Contacto inicial capturado | Creación | En atención |
| En atención | Calificando uso, procedencia y requisitos | Registrada | Cotizada, Cerrada (sin conversión) |
| Cotizada | Vehículo mostrado/enviado | En atención | En seguimiento, Convertida, Cancelada |
| En seguimiento | Cliente evaluando la decisión | Cotizada | Convertida, Cerrada |
| Convertida | Deriva a Reserva o Alquiler | En seguimiento | — (pasa a otro proceso) |
| Cerrada | Sin conversión, con motivo | Cualquiera elegible | — |

### 12.3 Consulta

| Código | Situación | Tratamiento | Autorización | Evidencia |
| --- | --- | --- | --- | --- |
| EX-CON-001 | Cliente recurrente intenta saltarse Consulta | No permitido — todos pasan por Consulta sin excepción (BR-CON-003) | Sistema | Bloqueo del sistema |
| EX-CON-002 | Modalidad virtual con validación informal de Fiorella (31 ago), sin revisión detallada por escrito | Tratar como validado operativamente, pendiente de firma formal (ver `BDD-KAIROS-TRANSVERSAL.md`, sección 19.1) | Russbel (BA), con autorización verbal de Fiorella | Nota en la Ficha AS-IS y en el Decision Log (31 ago) |

### 16.2 Consulta (BR-CON-003, BR-CON-004)

```
@SC-CON-001
Feature: Todo cliente pasa por Consulta, incluso el recurrente

  @SC-CON-001.01
  Scenario: Cliente antiguo intenta ir directo a Reserva
    Given un cliente con más de 2 alquileres previos con VeloxRent
    When solicita reservar un vehículo sin pasar por Consulta
    Then el sistema exige completar Consulta primero
    And no permite crear la reserva sin ese paso

  @SC-CON-001.02
  Scenario: Cliente peruano — tercer requisito documental
    Given un cliente que se identifica como peruano en Consulta
    When se solicitan los documentos requeridos
    Then el tercer requisito exigido es el recibo de agua o luz

  @SC-CON-001.03
  Scenario: Cliente extranjero — tercer requisito documental
    Given un cliente que se identifica como no peruano en Consulta
    When se solicitan los documentos requeridos
    Then el tercer requisito exigido es la constancia de hospedaje
    And se registra la fecha de ingreso al país para validar vigencia del brevete
```

### 16.2.1 Derivar Consulta según canal (BR-CON-005) — migrado desde `BDD-KAIROS-TRANSVERSAL.md` el 01 sep 2026

```
@SC-CON-002
Feature: Derivar Consulta según canal

  @SC-CON-002.01
  Scenario: Cliente virtual recibe evidencia en vez de ver el vehículo en persona
    Given que el cliente contacta por un canal virtual
    When decide continuar tras revisar requisitos y tarifario
    Then se le envían fotos y video del vehículo disponible
    And la exhibición remota queda registrada como evidencia
```

### 16.2.2 Derivar o cerrar la consulta (BR-CON-002) — nuevo, 01 sep 2026

> Cierra el vacío de trazabilidad identificado en `BDD-KAIROS-TRACEABILITY.md` (sección 19): BR-CON-002 nunca había tenido un escenario Gherkin dedicado.

```
@SC-CON-003
Feature: Derivar o cerrar la consulta

  @SC-CON-003.01
  Scenario: Cliente decide continuar y se deriva
    Given una consulta con vehículo mostrado y requisitos ya informados
    When el cliente decide continuar
    Then la consulta se deriva a Reserva o Alquiler, según si la fecha es futura o inmediata

  @SC-CON-003.02
  Scenario: Cliente decide no continuar
    Given una consulta con vehículo mostrado
    When el cliente decide no continuar
    Then la consulta se cierra sin conversión
    And se registra el motivo del cierre (DAT-CON-005)
```

> 📌 La trazabilidad de este proceso vive en `BDD-KAIROS-TRACEABILITY.md`, sección 18.3.

### 16.2.3 El destino condiciona el vehículo elegible (BR-CON-005) — nuevo, 02 sep 2026

```
@SC-CON-004
Feature: El destino condiciona el vehículo elegible

  @SC-CON-004.01
  Scenario: Destino con restricción de ruta conocida
    Given un cliente que indica un destino con restricción de ruta/trocha ya catalogada
    When se calcula el catálogo de vehículos elegibles
    Then solo se muestran los vehículos aptos para esa ruta

  @SC-CON-004.02
  Scenario: Destino de ruta mixta (vacío reconocido, P-31)
    Given un cliente que indica un destino de ruta mixta, no catalogada
    When se calcula el catálogo de vehículos elegibles
    Then el sistema no tiene un criterio automático definido todavía
    And se marca para revisión manual del Administrador
```

### 19.3 Consulta

| ID | Pregunta | Opciones | Propietario | Impacto | Estado |
| --- | --- | --- | --- | --- | --- |
| OQ-CON-101 | ¿La modalidad virtual de Consulta ya tiene validación formal de Fiorella? | Validar formalmente / seguir como borrador | Fiorella | Confiabilidad del flujo remoto | `VALIDADO OPERATIVAMENTE — PENDIENTE DE FIRMA FORMAL` (reclasificado 01 sep, ver `BDD-KAIROS-TRANSVERSAL.md` sección 19.1) — Fiorella confirmó "sí, están validados", pero aclaró que solo lo leyó rápido por celular, sin revisar el detalle, y pidió a Russbel validarlo él mismo |

### 21.3 Consulta

| Caso | Uso turístico | Nacionalidad | Canal | Resultado |
| --- | --- | --- | --- | --- |
| DT-CON-01 | Sí | Peruano | Presencial | Deriva a Reserva o Alquiler |
| DT-CON-02 | Sí | Extranjero | Virtual | Envía fotos/video, requisitos de extranjero |
| DT-CON-03 | No | — | Cualquiera | Cierre sin conversión |
