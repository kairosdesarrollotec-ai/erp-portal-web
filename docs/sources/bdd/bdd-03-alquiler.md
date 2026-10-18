# BDD — 03 Alquiler

# BDD-ALQ-001 — Proceso: Alquiler

**Estado:** APROBADO — versión base (usuario, 18 oct 2026; cambios posteriores se gestionan como mejoras documentadas)

**Código:** BDD-KAIROS-MVP-002 / ALQ **Versión:** 1.7 (actualizado 02 sep 2026 — duración de evidencia en video corregida a \~7-8 min) **Depende de:** `BDD-KAIROS-TRANSVERSAL.md` (glosario, actores, catálogo de Cliente, reglas transversales, NFR, privacidad, criterios de aceptación)

> Parte de la serie BDD-KAIROS-MVP-002, dividida por gobernanza el 27 ago 2026. La fuente canónica sigue siendo el conjunto de estos documentos — ninguno se lee de forma aislada sin `BDD-KAIROS-TRANSVERSAL.md`.

### 7.1 Alquiler

| Paso | Actor principal | Acción | Información gestionada | Regla/decisión | Resultado |
| --- | --- | --- | --- | --- | --- |
| ALQ-P01 | Cliente/Administrador | Presentar documentos requeridos (viene de Consulta) | DAT-CLI-\*, nacionalidad | Peruano: DNI+licencia+recibo agua/luz. Extranjero: pasaporte+carnet extranjería+constancia hospedaje (BR-CON-004) | Documentos recibidos |
| ALQ-P02 | Administrador | Verificar documentos | Documentos presentados | ¿Cumple lo solicitado? | Documentos válidos, o proceso cancelado |
| ALQ-P03 | Administrador | Definir firmante/conductor | Titular, acompañante, persona jurídica | Solo firma quien maneja, salvo acompañante autorizado (BR-ALQ-015) | Roles contractuales definidos |
| ALQ-P04 | Administrador | Aplicar prueba de alcolímetro | Resultado FAVORABLE/DESFAVORABLE | Tolerancia cero; rechazo = desfavorable (BR-ALQ-005) | Proceso continúa o se cancela |
| ALQ-P05 | Administrador | Elaborar contrato y políticas | Plantilla única (BR-DOC-003), lectura grabada | Firma con huella en cada hoja | Contrato firmado |
| ALQ-P06 | Cliente/Administrador | Registrar pago y garantía | Monto según vehículo | Depósito a cuenta de garantía separada | Pago validado |
| ALQ-P07 | Administrador + Operador | Revisar checklist de salida | 35 fotos, 3 videos de \~7-8 min cada uno (BR-INS-002/003/004, actualizado 02 sep) | Mínimo 30 min técnico + 15 documentario (BR-INS-001) | Checklist completo |
| ALQ-P08 | Sistema/Administrador | Evaluar condición de notaría | Vehículo, hora, cliente antiguo, biométrico | 4 vehículos obligatorios (BR-ALQ-003); tercera vía (BR-ALQ-004) | Resultado: `MANDATORY`/`DOUBLE_DEPOSIT`/`THIRD_PATH_ELIGIBLE`/`MANUAL_REVIEW` |
| ALQ-P09 | Administrador | Tramitar notaría (si aplica) | Pago del trámite | La empresa paga (BR-ALQ-002); no se informa al cliente hasta el final (BR-ALQ-009) | Trámite completado |
| ALQ-P10 | Administrador | Entregar vehículo | Llaves, récord MTC | Verificación de récord del cliente | Vehículo entregado |
| ALQ-P11 | Administrador | Registrar y archivar expediente | Físico + Drive (BR-DOC-001) | Partida doble | Expediente archivado |
| ALQ-P12 | Cliente | Solicitar ampliación (si aplica) | Fecha, motivo | Aviso 12h antes (BR-ALQ-012) | Solicitud registrada |
| ALQ-P13 | Administrador | Autorizar ampliación | Disponibilidad del vehículo | No automático, depende de disponibilidad | Autorizada o rechazada |
| ALQ-P14 | Cliente | Pagar y firmar adenda | Adenda por días u horas | Máximo 3 días (1 si por horas) (BR-ALQ-012) | Ampliación formalizada |
| ALQ-P15 | Sistema | Detectar incumplimiento de ampliación | Ninguno de los 4 requisitos cumplido | Sanción de garantía + proceso penal + cliente rojo (BR-ALQ-013) | Falta grave registrada |

#### 7.1.1 Flujo alternativo: servicio de aeropuerto

Aplica principalmente desde Reserva, también directo en Alquiler. El proceso de alquiler nunca se ejecuta en el aeropuerto — el cliente siempre pasa primero por la oficina (regla dura, Ficha de Alquiler, Fase 5c).

### 8.1 Alquiler

| ID | Información | Obligatoria | Condición | Validación funcional | Finalidad | Sensibilidad |
| --- | --- | --- | --- | --- | --- | --- |
| DAT-ALQ-001 | Plan (Normal/Plus/Libre) | Sí | Siempre | Catálogo vigente | Determinar kilometraje y precio | Interna |
| DAT-ALQ-002 | Resultado de alcolímetro (entrega) | Sí | Antes de contratar | `FAVORABLE`/`DESFAVORABLE` | Bloqueo del proceso (BR-ALQ-005) | Auditada |
| DAT-ALQ-003 | Resultado de evaluación notarial | Sí | Antes de decidir el camino | Enum de 4 valores | Determinar el siguiente paso | Interna |
| DAT-ALQ-004 | Número de alquileres previos del cliente | Sí | Para tercera vía | Contador ≥0 | Elegibilidad de excepción (BR-ALQ-004) | Interna |
| DAT-ALQ-005 | Garantía (monto) | Sí | Siempre | Según tarifario; x2 si sin notaría bajo consulta | Cálculo financiero | Financiera |
| DAT-ALQ-006 | Evidencia fotográfica (35 fotos) | Sí | Checklist de salida/retorno | Conteo mínimo | Cumplimiento BR-INS-004 | Normal |
| DAT-ALQ-007 | Evidencia en video (3 videos independientes) | Sí | Checklist de salida/retorno | Presencia de los 3 videos, duración de referencia \~7-8 min cada uno (actualizado 02 sep) | Cumplimiento BR-INS-002/003 | Normal |
| DAT-ALQ-008 | Documento de responsabilidad (sin notaría) | Condicional | Tercera vía o bajo consulta | Firmado | Respaldo legal | Sensible |
| DAT-ALQ-009 | Adenda de ampliación | Condicional | Si se amplía | Firmada, por días u horas | Control del límite (BR-ALQ-012) | Normal |
| DAT-ALQ-010 | Récord de tránsito del cliente (MTC) | Sí | Antes de entregar | Sin puntuación negativa | Verificar habilitación | Personal |

### 9.4 Alquiler

| ID | Regla | Prioridad | Fuente | Estado |
| --- | --- | --- | --- | --- |
| BR-ALQ-001 | El cliente antiguo tiene más de dos alquileres previos | Alta | SRC-DL-001 (19 ago) | `CONFIRMADO` |
| BR-ALQ-002 | La empresa paga el trámite notarial, no el cliente | Crítica | SRC-DL-001 (13 ago) | `CONFIRMADO` |
| BR-ALQ-003 | Hilux, Chevrolet Colorado, Verna y Yaris requieren notaría siempre, sin excepción | Alta | SRC-ALQ-001, sección 7 | `CONFIRMADO` |
| BR-ALQ-004 | Existe una tercera vía sin notaría y sin garantía duplicada | Alta | SRC-DL-001 (19 ago) | `CONFIRMADO` |
| BR-ALQ-005 | El alcoholímetro es obligatorio en entrega y devolución, con tolerancia cero | Crítica | SRC-ALQ-001, sección 7 | `CONFIRMADO` |
| BR-ALQ-006 | El plan Normal considera 200 km incluidos por cada 24 horas | Media | SRC-ALQ-001, sección 7 | `CONFIRMADO` |
| BR-ALQ-007 | La velocidad máxima contractual general es 100 km/h | Media | SRC-ALQ-001 (14 ago) | `CONFIRMADO` |
| BR-ALQ-008 | El vehículo solo puede circular dentro de Ayacucho salvo autorización expresa | Media | SRC-ALQ-001, sección 7 | `CONFIRMADO` |
| BR-ALQ-009 | Notaría "sorpresa": no se informa al cliente hasta el final del proceso administrativo | Media | SRC-ALQ-001, sección 7; SRC-DL-001 (27 ago) | `CONFIRMADO` |
| BR-ALQ-010 | Todo vehículo nuevo debe tener GPS instalado y activo antes de poder alquilarse | Alta | SRC-ALQ-001, sección 7 | `CONFIRMADO` |
| BR-ALQ-011 | Se aceptan todos los medios de pago; pagos por agente requieren verificación adicional | Alta | SRC-DL-001 (4 ago) | `CONFIRMADO` |
| BR-ALQ-012 | Ampliación: aviso con 12h de anticipación + autorización + pago + adenda firmada; máximo 3 días consecutivos (1 si es por horas) | Alta | SRC-ALQ-001, Fase 4b | `CONFIRMADO` |
| BR-ALQ-013 | Si el cliente no cumple los 4 requisitos de ampliación: sanción de toda la garantía + posible proceso penal + cliente pasa a rojo de inmediato | Crítica | SRC-ALQ-001, Fase 4b | `CONFIRMADO` |
| BR-ALQ-014 | Para decisiones menores, si Fiorella y José no responden en 5 minutos, Cecilia u otro personal designado puede autorizar | Media | SRC-ALQ-001 (17 ago) | `CONFIRMADO` |
| BR-ALQ-015 | Variantes de conductor: con conductor de la empresa, sin conductor propio, con conductor propio autorizado | Media | SRC-ALQ-001, sección 7 | `CONFIRMADO` |
| BR-ALQ-016 | Si el MTC no responde, se bloquea la entrega sin excepción posible. Si RENIEC no responde, sí puede haber excepción, autorizada exclusivamente por Gerencia caso por caso | Alta | SRC-DL-001 (27 ago) | `CONFIRMADO` — `RESUELTO` OQ-ALQ-101 |

### 10.1 Notaría (Alquiler)

| Vehículo prohibido sin notaría | Cliente antiguo (\>2) | Biométrico OK | Vehículo de menor costo | Resultado |
| --- | --- | --- | --- | --- |
| Sí | — | — | — | `MANDATORY` |
| No | No | — | — | `DOUBLE_DEPOSIT` (bajo consulta) |
| No | Sí | Sí | Sí | `THIRD_PATH_ELIGIBLE` |
| No | Sí | Sí | No | `DOUBLE_DEPOSIT` |
| No | Parcial/No | No | — | `MANUAL_REVIEW` |

### 11.1 Alquiler

| Estado | Significado | Entrada permitida | Salidas permitidas |
| --- | --- | --- | --- |
| Borrador | En preparación | Creación (desde Consulta o conversión de Reserva) | Validación, Cancelado |
| Validación | Verificando documentos y alcolímetro | Borrador | Contratación, Cancelado |
| Contratación | Firmando contrato y pagando | Validación | Pendiente de entrega |
| Pendiente de entrega | Esperando checklist e inspección | Contratación | Activo |
| Activo | Vehículo en poder del cliente | Pendiente de entrega | Activo (ampliación), inicio de Devolución |
| Incidencia | Ocurrió un problema durante el alquiler | Cualquiera elegible | Activo (resuelto) o escalado |

### 12.1 Alquiler

| Código | Situación | Tratamiento | Autorización | Evidencia |
| --- | --- | --- | --- | --- |
| EX-ALQ-001 | Cliente extranjero sin voucher de hospedaje al momento | Firma documento de responsabilidad, envía la evidencia esa misma noche | Administrador | Documento firmado |
| EX-ALQ-002 | Personal alquila vehículo prohibido sin notaría por su cuenta | Riesgo de control interno reconocido (P-20) — sin protocolo formal de bloqueo automático hoy | — | Ninguna todavía |
| EX-ALQ-003 | Cliente no cumple los 4 requisitos de ampliación | Sanción total de garantía + posible proceso penal + cliente rojo de inmediato | Gerencia | Registro de falta grave |
| EX-ALQ-004 | RENIEC/MTC no responde durante la verificación | Ver BR-ALQ-016 — MTC bloquea, RENIEC admite excepción de Gerencia | Gerencia (solo RENIEC) | Registro de la excepción |

### 16.4 Alquiler — notaría y pago (BR-ALQ-002, BR-ALQ-003, BR-ALQ-004, BR-ALQ-009)

```
@SC-ALQ-001
Feature: La empresa paga el trámite notarial

  @SC-ALQ-001.01
  Scenario: Alquiler con notaría obligatoria
    Given un alquiler de un vehículo prohibido sin notaría (Hilux, Colorado, Verna o Yaris)
    When se ejecuta el trámite notarial
    Then el costo del trámite se registra como gasto de VeloxRent
    And no se genera ningún cobro al cliente por ese concepto

  @SC-ALQ-001.02
  Scenario: Intento de cobrar el trámite notarial al cliente
    Given un alquiler que requiere notaría
    When se intenta registrar el trámite notarial como pago del cliente
    Then el sistema no permite esa clasificación
```

```
@SC-ALQ-002
Feature: Matriz de decisión notarial

  @SC-ALQ-002.01
  Scenario: Vehículo prohibido sin notaría
    Given un alquiler de un vehículo de la lista prohibida (Hilux, Colorado, Verna, Yaris)
    When se evalúa el camino notarial
    Then el resultado es MANDATORY, sin excepción posible

  @SC-ALQ-002.02
  Scenario: Cliente nuevo con vehículo no prohibido
    Given un vehículo no prohibido
    And un cliente con 2 o menos alquileres previos
    When se evalúa el camino notarial
    Then el resultado es DOUBLE_DEPOSIT

  @SC-ALQ-002.03
  Scenario: Tercera vía completa
    Given un vehículo no prohibido y de menor valor relativo en la flota
    And un cliente antiguo (más de 2 alquileres previos)
    And verificación biométrica RENIEC favorable
    When se evalúa el camino notarial
    Then el resultado es THIRD_PATH_ELIGIBLE
    And se firma el documento de responsabilidad en vez de ir a notaría

  @SC-ALQ-002.04
  Scenario: Cliente antiguo con biométrico favorable pero vehículo de mayor valor
    Given un vehículo no prohibido que no es de menor valor relativo
    And un cliente antiguo con biométrico favorable
    When se evalúa el camino notarial
    Then el resultado es DOUBLE_DEPOSIT, no tercera vía
```

```
@SC-ALQ-003
Feature: Notaría "sorpresa" — medida antifraude

  @SC-ALQ-003.01
  Scenario: Cliente completa el proceso sin objetar la notaría
    Given un alquiler que requiere notaría
    When se informa el requisito notarial al final del proceso administrativo
    And el cliente acepta continuar
    Then el alquiler avanza a la firma notarial

  @SC-ALQ-003.02
  Scenario: Cliente decide no continuar al enterarse de la notaría
    Given un alquiler que requiere notaría
    When se informa el requisito notarial al final del proceso administrativo
    And el cliente decide no continuar
    Then el alquiler se cierra sin contrato
    And se registra el motivo de cierre
```

### 16.4.1 Incumplir los requisitos de ampliación (BR-ALQ-013) — migrado desde `BDD-KAIROS-TRANSVERSAL.md` el 01 sep 2026

```
@SC-ALQ-004
Feature: Incumplir los requisitos de ampliación

  @SC-ALQ-004.01
  Scenario: Cliente se queda con el vehículo sin cumplir los 4 requisitos
    Given un alquiler activo con una ampliación no autorizada
    When el cliente no cumple aviso, autorización, pago y adenda
    Then se registra como falta grave
    And se retiene toda la garantía
    And el cliente pasa a "rojo" de inmediato
    And se evalúa iniciar un proceso penal
```

### 16.4.2 Aviso tardío de choque durante el alquiler (BR-ALQ-\*) — migrado desde `BDD-KAIROS-TRANSVERSAL.md` el 01 sep 2026

```
@SC-ALQ-005
Feature: Aviso tardío de choque durante el alquiler

  @SC-ALQ-005.01
  Scenario: Cliente no avisa un choque dentro del plazo
    Given un choque ocurrido durante el alquiler
    When el cliente no comunica dentro de los primeros 15 minutos
    And no envía evidencia dentro de los 30 minutos siguientes
    Then VeloxRent puede considerar inválido el relato del cliente
    And se aplican los cargos correspondientes igualmente
```

### 16.4.3 Contingencia de verificación de identidad — RENIEC/MTC no disponible (BR-ALQ-016) — nuevo, 01 sep 2026

> Cierra el vacío de trazabilidad identificado en `BDD-KAIROS-TRACEABILITY.md` (sección 19): BR-ALQ-016 solo tenía cobertura en la matriz de excepciones (EX-ALQ-004), sin escenario Gherkin dedicado.

```
@SC-ALQ-006
Feature: Contingencia de verificación de identidad (RENIEC/MTC no disponible)

  @SC-ALQ-006.01
  Scenario: MTC no responde durante la verificación
    Given un cliente en proceso de validación antes de la entrega
    When el sistema de MTC no responde
    Then la entrega del vehículo se bloquea sin excepción posible
    And no se confirma el alquiler hasta poder verificar el récord de tránsito

  @SC-ALQ-006.02
  Scenario: RENIEC no responde durante la verificación
    Given un cliente en proceso de validación antes de la entrega
    When el sistema de RENIEC no responde
    Then Gerencia puede autorizar una excepción caso por caso
    And la excepción queda registrada con su justificación
```

### 16.5 Inspección (BR-ALQ-005, BR-INS-004)

```
@SC-INS-001
Feature: Alcoholímetro con tolerancia cero en la entrega

  @SC-INS-001.01
  Scenario: Resultado favorable
    Given un cliente listo para recibir el vehículo
    When el resultado del alcoholímetro es favorable
    Then el proceso continúa a la contratación

  @SC-INS-001.02
  Scenario: Resultado desfavorable
    Given un cliente listo para recibir el vehículo
    When el resultado del alcoholímetro es desfavorable
    Then el contrato se cancela de inmediato

  @SC-INS-001.03
  Scenario: Cliente se niega a la prueba
    Given un cliente listo para recibir el vehículo
    When se niega a realizar la prueba de alcoholímetro
    Then se trata como resultado desfavorable
    And el contrato se cancela de inmediato
```

```
@SC-INS-002
Feature: Evidencia fotográfica mínima del checklist

  @SC-INS-002.01
  Scenario: Checklist completo
    Given una inspección de salida en curso
    When se registran las 35 fotos requeridas (5 de documentos + 29 del vehículo)
    Then el checklist queda completo
    And el vehículo puede entregarse

  @SC-INS-002.02
  Scenario: Evidencia incompleta
    Given una inspección de salida en curso
    When faltan una o más de las 35 fotos requeridas
    Then el checklist no puede cerrarse
    And el vehículo no puede entregarse hasta completar la evidencia
```

### BR-ALQ-017: Carga de documentos de alquiler vía GCS (Entrega-01)

**Prioridad:** Alta

Los documentos que el operador debe adjuntar durante la etapa de entrega (licencia, DNI, etc.) se almacenan en Google Cloud Storage mediante el patrón de dos pasos aprobado (ADR-KAI-005 / PROP-011):
1. Frontend solicita URL firmada: `POST /rentals/{id}/documents/upload-url`.
2. Frontend sube directamente a GCS.
3. Frontend notifica al backend: `POST /rentals/{id}/documents`.

Los documentos son accesibles mediante `GET /rentals/{id}/documents`. El almacenamiento local (base64) está prohibido en producción.

### BR-ALQ-018: Firma digital del cliente en contrato (Entrega-03)

**Prioridad:** Alta

La firma digital del cliente (canvas base64, `signatureData`) es un requisito obligatorio para formalizar el contrato de alquiler. El sistema debe bloquear el botón "Formalizar" si no se ha capturado la firma. La firma se persiste en la tabla `rental_contracts` como evidencia operativa. **Nota:** la validez legal formal de esta firma está pendiente de aprobación del área Legal (ver PROP-012 en decision-log).

### BR-ALQ-019: Monto mínimo de garantía en formalización (Entrega-03)

**Prioridad:** Alta

Si el vehículo tiene `depositMinimum` definido, el monto de garantía registrado al formalizar el contrato debe ser ≥ `depositMinimum`. El sistema bloquea la formalización si el monto es inferior, mostrando el valor mínimo requerido. Este control opera en el frontend y es validado por el backend al recibir el comando `formalize-contract`.

### SC-ALQ-DOC-01: Carga de documento de licencia en Entrega-01

**Dado** que el alquiler está en estado DRAFT o VALIDATION
**Y** el operador autenticado tiene acceso a la sede
**Cuando** carga el documento de licencia de conducir mediante el flujo GCS de dos pasos
**Entonces** el sistema retorna URL firmada válida por 15 minutos
**Y** tras la carga, `GET /rentals/{id}/documents` lista el documento adjunto

### SC-ALQ-FIRMA-01: Formalización bloqueada sin firma del cliente

**Dado** que el alquiler está en etapa Entrega-03 (Stage3)
**Cuando** el operador intenta formalizar sin capturar la firma digital del cliente
**Entonces** el botón "Formalizar" permanece deshabilitado
**Y** se muestra el mensaje "La firma del cliente es obligatoria para continuar"

### SC-ALQ-DEP-01: Formalización bloqueada por monto de garantía inferior al mínimo

**Dado** que el vehículo tiene `depositMinimum: 500.00`
**Y** el operador ingresa un monto de garantía de 300.00
**Cuando** intenta formalizar el contrato
**Entonces** el botón "Formalizar" permanece deshabilitado
**Y** se muestra el error "El monto es inferior al mínimo de garantía (S/ 500.00)"

### SC-ALQ-DEP-02: Formalización exitosa con monto de garantía ≥ mínimo

**Dado** que el vehículo tiene `depositMinimum: 500.00`
**Y** el operador ingresa un monto de garantía de 600.00
**Y** la firma del cliente ha sido capturada
**Cuando** formaliza el contrato
**Entonces** el sistema acepta la operación y avanza a Entrega-04

> 📌 La trazabilidad de este proceso vive en `BDD-KAIROS-TRACEABILITY.md`, sección 18.1.

### 19.1 Alquiler

| ID | Pregunta | Opciones | Propietario | Impacto | Estado |
| --- | --- | --- | --- | --- | --- |
| OQ-004 | ¿Inspección menor a 30 min alerta, bloquea o requiere excepción? | — | Producto/Operación | Entrega/devolución | `RESUELTO` 27 ago — Requiere excepción con autorización explícita (BR-INS-006) |
| OQ-ALQ-101 | ¿Qué pasa si RENIEC/MTC no responde durante la verificación de un cliente? | — | Producto/Operación | Bloqueo del proceso de entrega | `RESUELTO` 27 ago — Asimétrico. MTC bloquea sin excepción; RENIEC admite excepción de Gerencia. Ver BR-ALQ-016 y `@SC-ALQ-006` (nuevo, 01 sep) |

### 21.1 Alquiler

| Caso | Vehículo | Cliente | Alcolímetro | Notaría | Resultado |
| --- | --- | --- | --- | --- | --- |
| DT-ALQ-01 | Sin restricción | Elegible | Favorable | Bajo consulta, garantía x2 | Contratado |
| DT-ALQ-02 | Hilux | Elegible | Favorable | Obligatoria | Contratado con notaría |
| DT-ALQ-03 | Sin restricción | Antiguo + biométrico OK | Favorable | Tercera vía | Contratado sin notaría ni garantía duplicada |
| DT-ALQ-04 | Cualquiera | Elegible | Desfavorable | — | Cancelado |
| DT-ALQ-05 | Cualquiera | Rojo | — | — | Bloqueado |
