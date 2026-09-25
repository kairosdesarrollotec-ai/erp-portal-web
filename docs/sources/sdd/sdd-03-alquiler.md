# SDD — 03 Alquiler

# Solution Design Document — Alquiler

**Código:** SDD-KAIROS-MVP-002 / ALQ **Versión:** 2.1 — dividido a partir de `SDD-KAIROS-Consolidado-Detallado.md` (v1.2), actualizado 02 sep 2026 (evidencia: 35 fotos + video de 3 a 16 min) **Estado:** DRAFT COMPLETE — candidato a revisión arquitectónica, no aprobado **Entrada funcional:** `BDD-ALQ-001` (Alquiler) **Depende de:** `SDD-KAIROS-TRANSVERSAL.md` (arquitectura base, multiempresa, seguridad, integraciones, offline, observabilidad, despliegue, migración, ADR y riesgos transversales, decisiones abiertas de arquitectura, criterios de aprobación) **Alcance:** Proceso de Alquiler — contrato, notaría, entrega, ampliaciones **Propietario:** Arquitectura de Solución — pendiente de asignar **Revisores:** Producto, Operaciones, UX, Seguridad, Finanzas, Legal, QA **Fecha:** 31 de agosto de 2026

> Este documento traduce el comportamiento de `BDD-ALQ-001` a una solución lógica verificable. Para todo lo que no varía por proceso, ver `SDD-KAIROS-TRANSVERSAL.md` — este documento no lo repite.

---

## 1. Control y gobernanza

### 1.1 Historial

| Versión | Cambio | Autor | Estado |
| --- | --- | --- | --- |
| 2.0 | Extraído de `SDD-KAIROS-Consolidado-Detallado.md` (secciones 9.1, 10.1-10.2, 11.1, 11.4, 12.1, 12.3, 18.5, 24.2, 27.1) hacia un documento propio de Alquiler, siguiendo el ejemplo de referencia | Russbel (BA), a pedido del usuario | Candidato |

### 1.2 Estado de decisiones

Ver `SDD-KAIROS-TRANSVERSAL.md`, sección 1.2.

### 1.3 Documentos relacionados

| Documento | Relación |
| --- | --- |
| `BDD-ALQ-001` | Fuente funcional autoritativa de este proceso |
| `SDD-KAIROS-TRANSVERSAL.md` | Arquitectura base común a los 6 procesos |
| `SDD-KAIROS-TRACEABILITY.md` | Trazabilidad BDD → SDD → TDD consolidada |
| `SDD-RES-001` | Proceso del que Alquiler recibe la conversión |
| `SDD-DEV-001` | Proceso hacia el que Alquiler cierra (devolución) |
| `TDD-KAIROS-Consolidado-Detallado.md` | Refinamiento técnico subordinado — modelo físico de Alquiler ya avanzado (secciones 17-23) |

### 1.4 Criterio de autoridad

Ver `SDD-KAIROS-TRANSVERSAL.md`, sección 1.4. Este documento no redefine ninguna regla `BR-ALQ-*`/`BR-DOC-*`/`BR-INS-*` del BDD.

---

## 2. Resumen ejecutivo

Alquiler es el proceso de mayor volumen transaccional y complejidad documental de VeloxRent: valida cliente y documentos, aplica alcolímetro, evalúa la condición de notaría (obligatoria por vehículo, tercera vía sin notaría, o revisión manual), formaliza contrato y garantía, ejecuta el checklist de entrega con evidencia obligatoria (35 fotos + 3 videos de 3 a 16 min cada uno), y gestiona ampliaciones. El módulo propietario `Rentals` colabora con `Customers`, `Fleet`, `Payments`, `Inspections` y `Evidence`.

### 2.1 Resultado arquitectónico

Un contrato se formaliza como una operación coordinada: se validan documentos y elegibilidad, se registra el resultado del alcolímetro, se evalúa la condición notarial sobre política versionada, y se registran contrato y garantía en la misma operación lógica. La entrega solo se completa cuando el checklist tiene evidencia obligatoria verificable — no basta con marcar un check.

---

## 3. Alcance de la solución

### 3.1 Incluido

- Validación de cliente, documentos y nacionalidad.
- Prueba de alcolímetro con bloqueo inmediato si es desfavorable.
- Evaluación de condición notarial: obligatoria por vehículo, tercera vía, o revisión manual.
- Formalización de contrato (plantilla versionada) y garantía.
- Checklist de entrega con evidencia obligatoria (35 fotos + 3 videos).
- Ampliación de alquiler (por días o por horas).

### 3.2 Excluido

- Firma digital de contrato hasta aprobación legal (se mantiene firma con huella).
- Evaluación notarial automatizada al 100% — casos `MANUAL_REVIEW` requieren aprobación humana.

### 3.3 Dependencias

| Dependencia | Requerida para | Dueño |
| --- | --- | --- |
| Customers | Elegibilidad y verificación de documentos | Customers |
| Fleet | Restricción del vehículo (lista de notaría obligatoria) | Fleet |
| Payments | Registro de pago y garantía | Payments |
| Inspections / Evidence | Checklist de entrega y evidencia obligatoria | Transversal |
| Reservations | Origen, si el alquiler viene de una reserva convertida | Reserva |

---

## 4. Drivers específicos de Alquiler

| ID | Driver | Origen | Implicación de solución | Prioridad |
| --- | --- | --- | --- | --- |
| DR-ALQ-001 | Documento contractual con una sola versión vigente | BR-DOC-002/003, DR-KAI-006 (transversal) | Plantillas versionadas, inmutables tras la firma | Alta |
| DR-ALQ-002 | Evidencia de entrega obligatoria y voluminosa | BR-INS-001/002/004, DR-KAI-011 (transversal) | Checklist no se completa sin el conteo mínimo verificado por el worker de evidencia | Alta |
| DR-ALQ-003 | Alcolímetro desfavorable bloquea de inmediato | BR-ALQ-005 | El comando de continuar el flujo queda deshabilitado hasta un nuevo resultado favorable | Crítica |
| DR-ALQ-004 | Notaría condicional, no uniforme | BR-ALQ-003/004 | Política de evaluación versionada con 4 resultados posibles, no un booleano simple | Alta |

---

## 5–8. Arquitectura de contexto, contenedores, componentes y alternativas

Alquiler usa la arquitectura ya definida en `SDD-KAIROS-TRANSVERSAL.md` (secciones 5-8). Los componentes propietarios son **Rentals** (`rentals`, `contracts`, `extensions`) e **Inspections** (`inspections`, `inspection items`), que colabora con **Evidence** para el checklist de entrega (ver tabla 8.1 del documento transversal).

---

## 9. Diseño por casos de uso

### UC-ALQ-001 — Validar cliente y documentos

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | ALQ-P01 a P03 |
| Actor | Administrador de alquiler |
| Entrada conceptual | Documentos del cliente, nacionalidad, rol de firmante |
| Autorización | `rental:validate`, alcance de empresa/sede |
| Coordinación | Rentals → Customers (elegibilidad y verificación externa) |
| Consistencia | Validación síncrona antes de continuar |
| Resultado | Documentos válidos, o expediente cancelado |
| Eventos | — |
| Errores | Documento inválido, cliente bloqueado (`CUSTOMER_BLOCKED`) |
| Idempotencia | No aplica — es verificación, no comando de escritura crítica |

### UC-ALQ-002 — Aplicar prueba de alcolímetro

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | ALQ-P04 |
| Actor | Administrador |
| Entrada conceptual | Resultado `FAVORABLE`/`DESFAVORABLE` |
| Autorización | `rental:validate` |
| Coordinación | Rentals (registro directo) |
| Consistencia | Bloqueo inmediato si desfavorable (BR-ALQ-005) |
| Resultado | Proceso continúa, o expediente cancelado |
| Eventos | — |
| Errores | `ALCOHOL_TEST_FAILED` |
| Idempotencia | Sí |

### UC-ALQ-003 — Evaluar condición de notaría

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | ALQ-P08 |
| Actor | Sistema/Administrador |
| Entrada conceptual | Vehículo, historial del cliente, verificación biométrica |
| Autorización | `notary:request` |
| Coordinación | Rentals → Fleet (restricción del vehículo) → Customers (histórico) |
| Consistencia | Evaluación síncrona sobre política versionada (BR-ALQ-003/004) |
| Resultado | `MANDATORY`/`DOUBLE_DEPOSIT`/`THIRD_PATH_ELIGIBLE`/`MANUAL_REVIEW` |
| Eventos | `ExcepcionNotarialAprobada` (si aplica una excepción) |
| Errores | `THIRD_PATH_NOT_ELIGIBLE`, `NOTARY_MANDATORY_VEHICLE` |
| Idempotencia | Sí |

### UC-ALQ-004 — Formalizar contrato y pago

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | ALQ-P05 a P06 |
| Actor | Administrador |
| Entrada conceptual | Plantilla vigente (BR-DOC-003), monto de garantía |
| Autorización | `rental:create`, `payment:register` |
| Coordinación | Rentals → Payments |
| Consistencia | Contrato y pago coordinados en la misma operación lógica |
| Resultado | Contrato firmado, pago validado |
| Eventos | `ContratoFirmado`, `PagoRegistrado` |
| Errores | Monto de garantía inconsistente con el tarifario |
| Idempotencia | Sí |

### UC-ALQ-005 — Completar entrega

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | ALQ-P07, P09-P11 |
| Actor | Administrador + Operador |
| Entrada conceptual | Checklist, evidencia (35 fotos + 3 videos de 3 a 16 min cada uno), trámite notarial si aplica |
| Autorización | `inspection:execute`, `rental:deliver` |
| Coordinación | Rentals → Inspections → Evidence |
| Consistencia | No se puede entregar sin checklist completo (BR-INS-001/002/004) |
| Resultado | Vehículo entregado, expediente archivado (BR-DOC-001) |
| Eventos | `EntregaCompletada` |
| Errores | `MISSING_REQUIRED_EVIDENCE` |
| Idempotencia | Sí |

### UC-ALQ-006 — Ampliar alquiler

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | ALQ-P12 a P15 |
| Actor | Cliente/Administrador |
| Entrada conceptual | Fecha solicitada, adenda |
| Autorización | `rental:validate` |
| Coordinación | Rentals → Payments |
| Consistencia | No automática — depende de disponibilidad (BR-ALQ-012) |
| Resultado | Ampliación formalizada, o falta grave registrada (BR-ALQ-013) |
| Eventos | — |
| Errores | `EXTENSION_LIMIT_REACHED` |
| Idempotencia | Sí |

---

## 10. Secuencias críticas

### 10.1 Validar y contratar un alquiler

```
sequenceDiagram
    participant UI as Web/PWA
    participant RNT as Rentals
    participant CUS as Customers
    participant PAY as Payments
    UI->>RNT: Crear alquiler
    RNT->>CUS: Validar documentos y elegibilidad
    RNT->>RNT: Registrar alcolímetro
    RNT->>RNT: Evaluar notaría
    RNT->>PAY: Registrar pago y garantía
    PAY-->>RNT: Pago validado
    RNT-->>UI: Contrato listo para firma
```

### 10.2 Completar la entrega del vehículo

```
sequenceDiagram
    participant UI as Web/PWA
    participant RNT as Rentals
    participant INS as Inspections
    participant EVI as Evidence
    participant OUT as Outbox
    UI->>RNT: Iniciar entrega
    RNT->>INS: Ejecutar checklist
    INS->>EVI: Cargar 35 fotos + 3 videos
    EVI-->>INS: Evidencia validada
    INS-->>RNT: Checklist completo
    RNT->>OUT: Registrar EntregaCompletada
    RNT-->>UI: Vehículo entregado
```

---

## 11. Modelo lógico de información

### 11.1 Entidades

| Entidad | Propietario | Identidad | Relaciones | Ciclo de vida |
| --- | --- | --- | --- | --- |
| Rental | Rentals | UUID | Cliente, vehículo, reserva (opcional) | Borrador a terminal |
| NotaryEvaluation | Rentals | UUID | Alquiler | Evaluada una vez, con versión de política |
| Contract | Rentals | UUID | Alquiler, plantilla | Inmutable tras la firma |
| Extension | Rentals | UUID | Alquiler, adenda | Propuesta → autorizada → formalizada |
| Deposit | Payments | UUID | Alquiler | Pendiente → devuelta / retenida |
| Evidence | Evidence | UUID | Alquiler (propietario) | Pendiente → validada / rechazada |

### 11.2 Relaciones

```
erDiagram
    RESERVATION ||--o| RENTAL : becomes
    RENTAL ||--o| NOTARY_EVALUATION : evaluates
    RENTAL ||--o| CONTRACT : formalizes
    RENTAL ||--o{ EXTENSION : extends
    RENTAL ||--o{ DEPOSIT : secures
    RENTAL ||--o{ EVIDENCE : documents
    RENTAL ||--o| RETURN : closes_with
```

### 11.3 Propiedad y consistencia

- Rentals es autoridad sobre el ciclo de vida del alquiler.
- Payments es autoridad sobre el resultado financiero (garantía).
- Notaría se evalúa una sola vez por alquiler, sobre una versión de política fija en ese instante.

### 11.4 Clasificación de sensibilidad

| Clase | Ejemplos | Protección |
| --- | --- | --- |
| Financiera | Garantía | Roles financieros + auditoría |
| Restringida | Resultado de alcolímetro | Acceso explícito + registro |
| Personal | Documento de identidad | Enmascarado, cifrado |
| Interna | Estado del expediente | Alcance empresarial |

---

## 12. Diseño lógico de operaciones y errores

| ID | Operación | Tipo | Actor | Entrada conceptual | Salida | Idempotente |
| --- | --- | --- | --- | --- | --- | --- |
| OP-ALQ-001 | Validar documentos | Comando | Administrador | Documentos, nacionalidad | Válido/cancelado | Sí |
| OP-ALQ-002 | Registrar alcolímetro | Comando | Administrador | Resultado | Continúa/cancela | Sí |
| OP-ALQ-003 | Evaluar notaría | Comando | Sistema | Vehículo, cliente | Resultado (4 valores) | Sí |
| OP-ALQ-004 | Formalizar contrato | Comando | Administrador | Plantilla, garantía | Contrato firmado | Sí |
| OP-ALQ-005 | Completar entrega | Comando | Administrador + Operador | Checklist, evidencia | Entregado | Sí |
| OP-ALQ-006 | Solicitar ampliación | Comando | Cliente | Fecha, motivo | Propuesta registrada | Sí |
| OP-ALQ-007 | Autorizar ampliación | Comando | Administrador | Disponibilidad | Autorizada/rechazada | Sí |

### 12.1 Catálogo de errores lógicos

| Código | Causa | Resultado para el usuario | Recuperación |
| --- | --- | --- | --- |
| `ALCOHOL_TEST_FAILED` | Alcolímetro desfavorable | Proceso bloqueado | Reprogramación según protocolo |
| `NOTARY_MANDATORY_VEHICLE` | Vehículo de la lista obligatoria | No admite excepción | Continuar con notaría |
| `THIRD_PATH_NOT_ELIGIBLE` | No cumple los 3 criterios de la tercera vía | Debe duplicar garantía o pasar por notaría | Elegir otra vía |
| `MISSING_REQUIRED_EVIDENCE` | Falta foto/video obligatorio | Entrega bloqueada | Completar la evidencia |
| `EXTENSION_LIMIT_REACHED` | Se alcanzó el máximo de ampliaciones | No se permite ampliar más | Formalizar un contrato nuevo |
| `CUSTOMER_BLOCKED` | Cliente en estado rojo | Bloqueado para nuevas operaciones | Escalamiento según política |

---

## 13. Eventos

| Evento | Productor | Consumidores | Datos mínimos | Garantía |
| --- | --- | --- | --- | --- |
| ExcepcionNotarialAprobada | Rentals | Audit, Reporting | `rental_id`, resultado, aprobador, justificación | Al menos una vez |
| ContratoFirmado | Rentals | Notifications, Audit, Reporting | `rental_id`, versión de plantilla, hash | Al menos una vez |
| PagoRegistrado | Payments | Rentals, Audit | `payment_id`, montos, concepto | Al menos una vez |
| EntregaCompletada | Rentals | Notifications, Audit, Reporting | `rental_id`, estado, resultado de alcolímetro | Al menos una vez |
| PoliticaOTarifaActualizada | Fleet/Rentals | Reporting, Audit | tipo de entidad, versión anterior/nueva | Al menos una vez |

---

## 14–17. Multiempresa, seguridad, integraciones y offline

Alquiler hereda el diseño transversal (`SDD-KAIROS-TRANSVERSAL.md`, secciones 14-17). Particularidad propia: el checklist de entrega puede prepararse offline como borrador (fotos/video en cola local), pero **la entrega no se confirma sin conectividad** (misma regla que Reserva, ADR-KAI-004).

---

## 18. UX Architecture

### 18.1 Flujo de pantallas — Alquiler

Verificación de documentos → Alcolímetro → Resultado de notaría → Contrato y pago → Checklist de entrega (con carga de evidencia) → Confirmación de entrega → (opcional) Solicitud y autorización de ampliación.

Los principios generales de UX viven en `SDD-KAIROS-TRANSVERSAL.md`, sección 18.

---

## 19. Requisitos no funcionales específicos

| ID | Atributo | Objetivo/criterio | Táctica | Estado |
| --- | --- | --- | --- | --- |
| NFR-BIZ-001/002 | Tiempo de inspección | 30 min técnico + 15 min documentario | Checklist digital con temporizador visible | `CONFIRMADA_NEGOCIO` |
| NFR-BIZ-006/007 | Evidencia mínima | 35 fotos + 3 videos de 3 a 16 min cada uno cada uno (referencia operativa, no mínimo estrictamente verificable) | Validación de conteo en el worker de evidencia | `CONFIRMADA_NEGOCIO` |

---

## 20–23. Observabilidad, continuidad, despliegue y migración

Sin particularidades para Alquiler más allá de la señal transversal "evidencias rechazadas" (relacionada con THR-006, personal que marca checklist sin revisar) — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 20.1.

---

## 24. Estrategia de pruebas

### 24.1 Casos obligatorios — Alquiler

- Contratación con notaría obligatoria (Hilux/Colorado/Verna/Yaris).
- Contratación por tercera vía (cliente antiguo + biométrico + vehículo de menor costo).
- Alcolímetro desfavorable en la entrega.
- Entrega bloqueada por evidencia incompleta (menos de 35 fotos o video fuera del rango de 3 a 16 min).
- Incumplimiento de los 4 requisitos de ampliación (falta grave, cliente rojo).

Los casos obligatorios transversales viven en `SDD-KAIROS-TRANSVERSAL.md`, sección 24.1.

---

## 25. ADR específicos

Alquiler no tiene ADR propios — usa los 5 ADR transversales de `SDD-KAIROS-TRANSVERSAL.md`, sección 25, especialmente ADR-KAI-005 (carga directa de evidencia), que se materializa directamente en `UC-ALQ-005`.

---

## 26. Riesgos específicos

El riesgo transversal RSK-010 (personal marca checklist sin revisar realmente, 3 casos reales confirmados — P-27) es el de mayor relevancia práctica para Alquiler — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 26.

---

## 27. Trazabilidad BDD → SDD → TDD

| Regla BDD | Dato (BDD) | Caso de uso (SDD) | Componente | Operación/evento | Refinamiento TDD |
| --- | --- | --- | --- | --- | --- |
| BR-ALQ-005 | DAT-ALQ-002 | UC-ALQ-002 | Rentals | OP-ALQ-002 | TDD, sección 9.13 |
| BR-ALQ-003/004 | DAT-ALQ-003/004 | UC-ALQ-003 | Rentals/Fleet/Customers | OP-ALQ-003, `ExcepcionNotarialAprobada` | TDD, secciones 9.5 y 9.11 |
| BR-DOC-003 | DAT-ALQ-005 | UC-ALQ-004 | Rentals/Payments | OP-ALQ-004, `ContratoFirmado`/`PagoRegistrado` | TDD, sección 9.12 |
| BR-INS-001/002/004 | DAT-ALQ-006/007 | UC-ALQ-005 | Rentals/Inspections/Evidence | OP-ALQ-005, `EntregaCompletada` | TDD, secciones 9.6 y 7.10 |
| BR-ALQ-012/013 | DAT-ALQ-009 | UC-ALQ-006 | Rentals/Payments | OP-ALQ-006/007 | — |

> 📌 Esta tabla también vive consolidada en `SDD-KAIROS-TRACEABILITY.md`.

---

## 28. Decisiones abiertas relevantes para Alquiler

No hay preguntas de negocio abiertas específicas de Alquiler en el BDD (todas resueltas). Decisión de arquitectura relacionada: OQ-SOL-001/002/003 (proveedor cloud, backend, ORM) afectan directamente la implementación de `Rentals`, dado su volumen — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 28.

---

## 29. Plan de realización

Alquiler corresponde a los **Slices 5, 6, 7 y 8** del plan transversal: conversión a Alquiler, contrato/pago/notaría, inspección de salida/evidencia/offline, y entrega/alquiler activo/ampliación (`SDD-KAIROS-TRANSVERSAL.md`, sección 29).

---

## 30. Criterios de aprobación

Este documento se aprueba junto con el resto de la serie bajo los 14 criterios de `SDD-KAIROS-TRANSVERSAL.md`, sección 30.

---

## 31. Checklist de calidad 9–10

| Dimensión | Evidencia | Estado |
| --- | --- | --- |
| Vinculación con BDD | Sección 1.3, `BR-ALQ-*`/`BR-DOC-*`/`BR-INS-*` en todo el documento | Cumple |
| Casos de uso | Sección 9 — 6 casos de uso | Cumple |
| Secuencias críticas | Sección 10 — 2 diagramas | Cumple |
| Modelo lógico de datos | Sección 11 | Cumple |
| Operaciones y errores | Sección 12 — 7 operaciones, 6 errores | Cumple |
| Eventos | Sección 13 | Cumple |
| UX Architecture | Sección 18 | Cumple |
| NFR específicos | Sección 19 | Cumple |
| Pruebas | Sección 24 — 5 casos obligatorios | Cumple |
| Trazabilidad BDD→SDD→TDD | Sección 27 | Cumple BDD→SDD; SDD→TDD avanzado (TDD ya tiene modelo físico de Alquiler) |
| Dependencia del documento transversal | Explícita en secciones 1.3, 5-8, 14-17, 20-23, 25-26, 29-30 | Cumple |

**Evaluación:** DRAFT COMPLETE para el alcance de Alquiler. No aprobado — depende de los mismos roles técnicos sin asignar que el resto de la serie.

---

## Anexo A — Frontera entre SDD y TDD

Ver `SDD-KAIROS-TRANSVERSAL.md`, Anexo A.
