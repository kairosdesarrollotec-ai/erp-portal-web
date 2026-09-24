# SDD — 04 Devolución

# Solution Design Document — Devolución

**Código:** SDD-KAIROS-MVP-002 / DEV **Versión:** 2.2 — corregido 02 sep 2026 (hallazgo P0-05 + P1-05: criterio 1 recalculado, 0 preguntas abiertas) **Estado:** DRAFT COMPLETE — candidato a revisión arquitectónica, no aprobado **Entrada funcional:** `BDD-DEV-001` (Devolución) — **v1.8, 02 sep 2026** (corregido 02 sep, hallazgo P0-05: este encabezado citaba v1.6) **Depende de:** `SDD-KAIROS-TRANSVERSAL.md` (arquitectura base, multiempresa, seguridad, integraciones, offline, observabilidad, despliegue, migración, ADR y riesgos transversales, decisiones abiertas de arquitectura, criterios de aprobación) **Alcance:** Proceso de Devolución — recepción, inspección, daños, garantía **Propietario:** Arquitectura de Solución — pendiente de asignar **Revisores:** Producto, Operaciones, UX, Finanzas, Legal, QA **Fecha:** 31 de agosto de 2026

> Este documento traduce el comportamiento de `BDD-DEV-001` a una solución lógica verificable. Para todo lo que no varía por proceso, ver `SDD-KAIROS-TRANSVERSAL.md` — este documento no lo repite.

---

## 1. Control y gobernanza

### 1.1 Historial

| Versión | Cambio | Autor | Estado |
| --- | --- | --- | --- |
| 2.0 | Extraído de `SDD-KAIROS-Consolidado-Detallado.md` (secciones 9.2, 10.3, 11.1, 11.4, 12.2-12.3, 18.6, 24.3, 27.2) hacia un documento propio de Devolución, siguiendo el ejemplo de referencia. Incorpora el cierre de OQ-009 y OQ-DEV-102, y la nueva regla BR-DEV-011 (cobro de días de paralización), confirmados el 31 ago con Fiorella | Russbel (BA), a pedido del usuario | Candidato |

### 1.2 Estado de decisiones

Ver `SDD-KAIROS-TRANSVERSAL.md`, sección 1.2.

### 1.3 Documentos relacionados

| Documento | Relación |
| --- | --- |
| `BDD-DEV-001` (v1.6) | Fuente funcional autoritativa de este proceso |
| `SDD-KAIROS-TRANSVERSAL.md` | Arquitectura base común a los 6 procesos |
| `SDD-KAIROS-TRACEABILITY.md` | Trazabilidad BDD → SDD → TDD consolidada |
| `SDD-ALQ-001` | Proceso del que Devolución recibe el cierre |
| `TDD-KAIROS-Consolidado-Detallado.md` | Refinamiento técnico subordinado — máquina de estados de Return (7 estados) ya definida (secciones 17-23) |

### 1.4 Criterio de autoridad

Ver `SDD-KAIROS-TRANSVERSAL.md`, sección 1.4. Este documento no redefine ninguna regla `BR-DEV-*` del BDD.

---

## 2. Resumen ejecutivo

Devolución recibe el vehículo, aplica alcolímetro, ejecuta el checklist de retorno, evalúa si hay daño y resuelve la garantía. El hallazgo estructural clave, confirmado el 31 de agosto de 2026, es que **el tarifario fijo de daños solo existe para daño estético** (carrocería, "paño") — el daño técnico (motor, frenos, suspensión, dirección) **no tiene ni tendrá tabla de precios**, se resuelve siempre mediante informe individual del mecánico externo Motrix. El módulo propietario `Returns` colabora con `Inspections`, `Incidents` y `Payments`.

Una separación arquitectónica importante, corregida en la 2da auditoría independiente del BDD: la **custodia física** del vehículo (que ocurre en cuanto llega, incluso con alcolímetro pendiente) es distinta del **cierre formal contractual** de la devolución (que solo ocurre tras el alcolímetro favorable). El estado `RECEPCIÓN PROVISIONAL` materializa esta separación.

### 2.1 Resultado arquitectónico

Cerrar una devolución sin daños libera la garantía dentro de un plazo máximo de 24 horas naturales (nunca un mínimo de espera). Cerrar una devolución con daño técnico dispara siempre una derivación a Motrix con informe y monto por caso — nunca un cálculo automático contra una tabla, porque esa tabla no existe por diseño. Si el vehículo queda paralizado más de 24h esperando la decisión del cliente, el sistema debe reflejar el cobro de esos días como alquiler adicional (BR-DEV-011, nueva).

---

## 3. Alcance de la solución

### 3.1 Incluido

- Recepción del vehículo con custodia preventiva, separada del cierre formal (`RECEPCIÓN PROVISIONAL`).
- Alcolímetro de devolución, con derivación a Gerencia si es desfavorable.
- Checklist de retorno con evidencia.
- Evaluación de daño: sin daño (garantía en 24h), estético (tarifario fijo), técnico (informe individual de Motrix), grave (inmovilización, vía legal).
- Cobro de días de paralización como alquiler adicional cuando el cliente se demora más de 24h en responder.
- Semáforo de riesgo del cliente: `SIN_OBSERVACIÓN` / `ÁMBAR` / `ROJO`, sin ciclo de rehabilitación, por empresa (no por todo KAIROS), con historial visible al grupo.
- Acta de devolución de garantía (opcional, a pedido del cliente).

### 3.2 Excluido

- Cualquier tabla de precios fija para daño técnico — decisión de diseño confirmada 31 ago, no un vacío de información (ver BR-DEV-006 y OQ-009 en la sección 28).
- Rehabilitación automática o manual del semáforo de riesgo — confirmado que no existe (OQ-DEV-102).
- Un 4to nivel de autorización automático para excepciones de Devolución que requieran más de Gerencia — no aplica a este proceso (ver `SDD-ADP-001` para la cascada de autorización de campo, que es un caso distinto).

### 3.3 Dependencias

| Dependencia | Requerida para | Dueño |
| --- | --- | --- |
| Rentals | Vehículo, cliente y garantía de origen | Alquiler |
| Inspections / Evidence | Checklist de retorno | Transversal |
| Incidents | Clasificación de gravedad del daño | Devolución (propietario) |
| Payments | Resolución financiera de la garantía y el descuento | Payments |
| Maintenance (Motrix, externo) | Informe y presupuesto de daño técnico | Externo, sin acceso confirmado |

---

## 4. Drivers específicos de Devolución

| ID | Driver | Origen | Implicación de solución | Prioridad |
| --- | --- | --- | --- | --- |
| DR-DEV-001 | Garantía nunca se libera con incidencia abierta | BR-DEV-002, DR-KAI-007 (transversal) | Invariante de dominio verificada antes de `refund` | Crítica |
| DR-DEV-002 | No existe tabla de precios para daño técnico, por diseño | BR-DEV-006 (confirmado 31 ago) | El dominio no modela un cálculo automático de descuento técnico — solo registra el monto que llega del informe de Motrix, caso por caso | Alta |
| DR-DEV-003 | Custodia física separada de cierre formal | BR-DEV-001, auditoría BDD 27 ago | Estado `RECEPCIÓN PROVISIONAL` explícito, distinto de `PROGRAMADA` y de `INSPECCIÓN` | Crítica |
| DR-DEV-004 | Semáforo de riesgo sin rehabilitación, por empresa | BR-DEV-008 (confirmado 31 ago) | Transición de estado unidireccional (nunca revierte); alcance de la marca es la empresa, pero el historial se replica como información de solo lectura al resto del grupo | Alta |
| DR-DEV-005 | Días de paralización se facturan como alquiler adicional | BR-DEV-011 (nueva, 31 ago) | El cierre financiero de la devolución debe poder generar un cargo adicional vinculado a los días transcurridos desde la devolución hasta la resolución del daño | Media |

---

## 5–8. Arquitectura de contexto, contenedores, componentes y alternativas

Devolución usa la arquitectura ya definida en `SDD-KAIROS-TRANSVERSAL.md` (secciones 5-8). Los componentes propietarios son **Returns** (`returns`, `return resolutions`), **Incidents** (`incidents`, `damage assessments`) y **Maintenance** (`work orders`, `parts`, hoy sin integración con Motrix confirmada).

---

## 9. Diseño por casos de uso

### UC-DEV-001 — Coordinar y recibir el vehículo

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | DEV-P01 a P03 |
| Actor | Administrador |
| Entrada conceptual | Hora pactada, resultado de alcolímetro |
| Autorización | `return:start` |
| Coordinación | Returns (registro directo) |
| Consistencia | Recepción provisional si el resultado es desfavorable (DR-DEV-003) |
| Resultado | Vehículo recibido, o recepción provisional |
| Eventos | — |
| Errores | `ALCOHOL_TEST_FAILED` |
| Idempotencia | Sí |

### UC-DEV-002 — Ejecutar checklist de retorno

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | DEV-P04 |
| Actor | Administrador + Operador + Cliente |
| Entrada conceptual | Inspección interna/externa, documento de responsabilidad (BR-DEV-009) |
| Autorización | `inspection:execute` |
| Coordinación | Returns → Inspections → Evidence |
| Consistencia | Checklist completo antes de evaluar el daño |
| Resultado | Checklist completo |
| Eventos | — |
| Errores | `MISSING_REQUIRED_EVIDENCE` |
| Idempotencia | Sí |

### UC-DEV-003 — Evaluar daño y resolver garantía

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | DEV-P05 a P09 |
| Actor | Operador (evaluación técnica) → José Pariona (gravedad) → Gerencia (monto) |
| Entrada conceptual | Comparación contra la entrega; tarifario fijo (BR-DEV-006, tabla 9.6.1 del BDD) solo para daño estético; informe individual de Motrix para daño técnico |
| Autorización | `incident:assess`, `refund:approve` |
| Coordinación | Returns → Incidents → Maintenance (Motrix, si es técnico) → Payments |
| Consistencia | No se libera la garantía con una incidencia abierta vinculada (DR-DEV-001) |
| Resultado | Garantía en curso de devolución, o descuento aplicado según tarifario o informe |
| Eventos | `DevolucionCompletada`, `PagoAjustado` |
| Errores | `INCIDENT_STILL_OPEN` |
| Idempotencia | Sí |

### UC-DEV-004 — Cobrar días de paralización

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | BR-DEV-011 (nueva, 31 ago) |
| Actor | Sistema/Gerencia |
| Entrada conceptual | Fecha de devolución, fecha de resolución del informe/aceptación del cliente |
| Autorización | `payment:register` |
| Coordinación | Returns → Payments |
| Consistencia | Solo aplica si transcurren más de 24h desde la devolución sin respuesta del cliente al informe de daño |
| Resultado | Cargo adicional registrado como días de alquiler |
| Eventos | `PagoAjustado` |
| Errores | — |
| Idempotencia | Sí |

### UC-DEV-005 — Archivar expediente

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | DEV-P10 |
| Actor | Administrador |
| Entrada conceptual | Documentos finales |
| Autorización | `return:complete` |
| Coordinación | Returns (cierre) |
| Consistencia | — |
| Resultado | Expediente cerrado |
| Eventos | — |
| Errores | — |
| Idempotencia | Sí |

---

## 10. Secuencias críticas

### 10.1 Recibir y evaluar una devolución

```ruby
sequenceDiagram
    participant UI as Web/PWA
    participant RET as Returns
    participant INS as Inspections
    participant INC as Incidents
    participant MOT as Maintenance (Motrix)
    participant PAY as Payments
    UI->>RET: Recibir vehículo
    RET->>RET: Registrar alcolímetro
    RET->>INS: Ejecutar checklist de retorno
    INS-->>RET: ¿Sin daños?
    RET->>INC: Registrar incidencia (si hay daño)
    alt Daño estético
        INC->>PAY: Monto según tarifario fijo (tabla 9.6.1 BDD)
    else Daño técnico
        INC->>MOT: Derivar a informe individual
        MOT-->>INC: Presupuesto por caso
        INC->>PAY: Monto según informe
    end
    PAY-->>RET: Garantía resuelta
    RET-->>UI: Devolución completada
```

### 10.2 Cobro de días de paralización

```ruby
sequenceDiagram
    participant RET as Returns
    participant PAY as Payments
    participant CLI as Cliente
    RET->>CLI: Notificar informe de daño técnico
    CLI-->>RET: Respuesta (aceptación o negociación)
    alt Respuesta dentro de 24h
        RET->>PAY: Resolver garantía sin cargo adicional
    else Respuesta después de 24h
        RET->>PAY: Registrar cargo por días de paralización (BR-DEV-011)
        PAY-->>RET: Garantía resuelta con ajuste
    end
```

---

## 11. Modelo lógico de información

### 11.1 Entidades

| Entidad | Propietario | Identidad | Relaciones | Ciclo de vida |
| --- | --- | --- | --- | --- |
| Return | Returns | UUID | Alquiler | Programada → recepción provisional → cerrada |
| Incident | Incidents | UUID | Devolución | Abierta → cerrada / vía legal |
| DamageAssessment | Incidents | UUID | Incidencia | Evaluada una vez — resultado: tarifario fijo (estético) o informe externo (técnico) |
| ImmobilizationCharge | Payments | UUID | Incidencia con daño técnico | Se crea solo si el vehículo queda paralizado \>24h sin respuesta del cliente (BR-DEV-011) |

### 11.2 Relaciones

```
erDiagram
    RENTAL ||--o| RETURN : closes_with
    RETURN ||--o{ INCIDENT : detects
    INCIDENT ||--o| DAMAGE_ASSESSMENT : classifies
    INCIDENT ||--o| IMMOBILIZATION_CHARGE : may_generate
```

### 11.3 Propiedad y consistencia

- Returns es autoridad sobre el cierre y resultado de la devolución.
- Incidents es autoridad sobre la clasificación de daño — ningún otro módulo la modifica directamente.
- Payments es autoridad sobre el resultado financiero (garantía, descuento, cargo por paralización).
- **El modelo no representa un cálculo automático de precio técnico** — `DamageAssessment` para daño técnico siempre referencia un monto externo (informe de Motrix), nunca una fórmula interna (DR-DEV-002).

### 11.4 Clasificación de sensibilidad

| Clase | Ejemplos | Protección |
| --- | --- | --- |
| Financiera | Garantía, descuento, cargo por paralización | Roles financieros + auditoría |
| Restringida | Resultado de alcolímetro, evidencia de daño | Acceso explícito + registro |
| Interna | Estado del expediente, historial del semáforo de riesgo | Alcance empresarial (con visibilidad de grupo para el semáforo, ver `SDD-KAIROS-TRANSVERSAL.md` sección 14.2) |

---

## 12. Diseño lógico de operaciones y errores

| ID | Operación | Tipo | Actor | Entrada conceptual | Salida | Idempotente |
| --- | --- | --- | --- | --- | --- | --- |
| OP-DEV-001 | Iniciar devolución | Comando | Administrador | Hora, alcolímetro | Recibido/provisional | Sí |
| OP-DEV-002 | Completar checklist de retorno | Comando | Administrador + Operador | Inspección, documento de responsabilidad | Completo | Sí |
| OP-DEV-003 | Evaluar daño | Comando | Operador/José Pariona | Comparación, tarifario o derivación a Motrix | Sin daño / con daño, gravedad | Sí |
| OP-DEV-004 | Resolver garantía | Comando | Gerencia/Sistema | Monto, incidencia | Devuelta/retenida | Sí |
| OP-DEV-005 | Registrar cargo por paralización | Comando | Sistema | Días transcurridos | Cargo aplicado | Sí |
| OP-DEV-006 | Archivar expediente | Comando | Administrador | Documentos | Cerrado | Sí |

### 12.1 Catálogo de errores lógicos

| Código | Causa | Resultado para el usuario | Recuperación |
| --- | --- | --- | --- |
| `ALCOHOL_TEST_FAILED` | Alcolímetro desfavorable | Recepción provisional y escalamiento | Espera de decisión de Gerencia |
| `MISSING_REQUIRED_EVIDENCE` | Falta foto/video obligatorio | Devolución bloqueada | Completar la evidencia |
| `INCIDENT_STILL_OPEN` | Incidencia abierta vinculada | Garantía no se libera | Resolver la incidencia primero |
| `TECHNICAL_DAMAGE_NO_FIXED_PRICE` | Se intenta calcular un precio técnico automático | Rechazo del comando — el flujo correcto es derivar a Motrix | Registrar el monto que llegue del informe externo |
| `CUSTOMER_BLOCKED` | Cliente en estado rojo | Bloqueado para nuevas operaciones | Escalamiento según política — sin rehabilitación (BR-DEV-008) |

---

## 13. Eventos

| Evento | Productor | Consumidores | Datos mínimos | Garantía |
| --- | --- | --- | --- | --- |
| DevolucionCompletada | Returns | Notifications, Audit, Reporting | `rental_id`, estado, resultado de alcolímetro | Al menos una vez |
| PagoAjustado | Payments | Returns, Audit | `deposit_id`, monto, concepto, autorizador | Al menos una vez |
| ClienteClasificado | Customers | Rentals, Returns, Audit, Reporting | `customer_id`, estado anterior/nuevo, motivo | Al menos una vez |

---

## 14–17. Multiempresa, seguridad, integraciones y offline

Devolución hereda el diseño transversal (`SDD-KAIROS-TRANSVERSAL.md`, secciones 14-17), con una particularidad de visibilidad multiempresa: **el semáforo de riesgo del cliente (ámbar/rojo) es por empresa, pero el historial/motivo debe replicarse como información visible a todo el grupo KAIROS** (confirmado 31 ago) — no es un bloqueo automático cruzado, es una alerta preventiva. La integración con Motrix (sección 16.4 del documento transversal) es especialmente relevante aquí: hoy sin acceso confirmado, pero es la vía obligatoria para todo daño técnico.

---

## 18. UX Architecture

### 18.1 Flujo de pantallas — Devolución

Recordatorio previo → Recepción y alcolímetro → Checklist de retorno (con carga de evidencia) → Resultado de daño (estético con tarifario visible / técnico con derivación a Motrix) → Resolución de garantía → Cierre de expediente.

### 18.2 Estado visual específico

- Panel de "daño técnico en evaluación externa" — distinto del panel de "daño estético con monto del tarifario" — para que el personal no confunda ambos flujos.

Los principios generales de UX viven en `SDD-KAIROS-TRANSVERSAL.md`, sección 18.

---

## 19. Requisitos no funcionales específicos

| ID | Atributo | Objetivo/criterio | Táctica | Estado |
| --- | --- | --- | --- | --- |
| NFR-BIZ-003 | Plazo de devolución de garantía | Máximo 24h seguidas naturales (no es tiempo mínimo de espera) | Job programado + invariante de dominio (DR-DEV-001) | `CONFIRMADA_NEGOCIO` |
| NFR-DEV-001 | Cobro de paralización | Se activa automáticamente al superar 24h sin respuesta del cliente | Job programado sobre `DamageAssessment` técnico abierto | `PROPUESTA_SOLUCIÓN` — nueva, deriva de BR-DEV-011 |

---

## 20–23. Observabilidad, continuidad, despliegue y migración

Sin particularidades más allá de la señal transversal "recordatorio de devolución no ejecutado" (relacionado con P-33) — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 20.3.

---

## 24. Estrategia de pruebas

### 24.1 Casos obligatorios — Devolución

- Devolución sin daños, garantía en 24 horas.
- Alcolímetro desfavorable en la devolución (recepción provisional).
- Daño leve estético con aceptación del cliente (cliente ámbar, monto del tarifario 9.6.1).
- Daño técnico derivado a Motrix, con monto registrado del informe externo (no calculado internamente).
- Cliente que no responde en 24h — cargo de días de paralización aplicado (BR-DEV-011).
- Daño grave (vehículo inmovilizado, cliente rojo, vía legal si no coopera).
- Intento de liberar garantía con incidencia abierta (`INCIDENT_STILL_OPEN`).
- Cliente en ámbar/rojo con múltiples alquileres posteriores sin incidentes — el estado no cambia (sin rehabilitación).

Los casos obligatorios transversales viven en `SDD-KAIROS-TRANSVERSAL.md`, sección 24.1.

---

## 25. ADR específicos

Devolución no tiene ADR propios en esta versión — usa los 5 ADR transversales de `SDD-KAIROS-TRANSVERSAL.md`, sección 25. La decisión de no modelar un cálculo automático de daño técnico (DR-DEV-002) queda documentada como driver, no como ADR formal, dado que es una traducción directa de una regla de negocio (BR-DEV-006) y no una elección entre alternativas técnicas.

---

## 26. Riesgos específicos

| ID | Riesgo | Prob. | Impacto | Mitigación | Propietario |
| --- | --- | --- | --- | --- | --- |
| RSK-DEV-001 | Sin integración confirmada con Motrix, el informe de daño técnico queda como proceso 100% manual, sin trazabilidad automática del monto | Alta | Media | Registro manual del monto del informe como campo obligatorio en `DamageAssessment`; priorizar el levantamiento de la integración con Motrix (sección 16.4 del documento transversal) | Integraciones |
| RSK-DEV-002 | El cobro de días de paralización (BR-DEV-011, regla nueva) puede generar disputas si no queda claro para el cliente desde el primer aviso | Media | Media | Notificación explícita del plazo de 24h y de la consecuencia de no responder, desde el primer contacto tras la devolución | Producto/UX |

Los riesgos transversales (RSK-001 a RSK-012) también aplican — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 26.

---

## 27. Trazabilidad BDD → SDD → TDD

| Regla BDD | Dato (BDD) | Caso de uso (SDD) | Componente | Operación/evento | Refinamiento TDD |
| --- | --- | --- | --- | --- | --- |
| BR-DEV-004/005 | DAT-DEV-001/002 | UC-DEV-001 | Returns | OP-DEV-001 | TDD, sección 9.13 |
| BR-DEV-006 (confirmada 31 ago) | DAT-DEV-004 | UC-DEV-003 | Returns/Incidents/Maintenance | OP-DEV-003, `DevolucionCompletada` | — |
| BR-DEV-011 (nueva, 31 ago) | DAT-DEV-008 | UC-DEV-004 | Returns/Payments | OP-DEV-005, `PagoAjustado` | — |
| BR-DEV-001/002 | — | UC-DEV-005 | Returns/Payments | OP-DEV-004/006 | TDD, sección 9.14 |
| BR-DEV-008 (confirmada 31 ago) | — | — | Customers | `ClienteClasificado` | TDD, sección 30 |
| NFR-KAI-008 | — | UC-DEV-003 | Payments | `INCIDENT_STILL_OPEN` | TDD, sección 30 |

> 📌 Esta tabla también vive consolidada en `SDD-KAIROS-TRACEABILITY.md`.

---

## 28. Decisiones abiertas relevantes para Devolución

| ID (BDD) | Pregunta | Estado |
| --- | --- | --- |
| OQ-009 | ¿Cuál es la tabla técnica de daños y autorizaciones? | ✅ `RESUELTO` (31 ago) — **no existe tabla técnica, por diseño**: todo daño técnico se resuelve vía informe individual de Motrix. Ver DR-DEV-002 y BR-DEV-006 |
| OQ-DEV-101 | ¿Existe un plazo máximo para que Gerencia asigne el descuento en un daño leve/moderado? | `PENDIENTE` — no hay SLA numérico formal; el mecanismo real es el cobro de días de paralización (BR-DEV-011), no un plazo de Gerencia. Ver `BDD-DEV-001`, sección 19.2 |
| OQ-DEV-102 | ¿El semáforo de riesgo tiene ciclo de rehabilitación? ¿Por VeloxRent o por todo KAIROS? | ✅ `RESUELTO` (31 ago) — sin rehabilitación; por empresa, con historial visible al grupo. Ver DR-DEV-004 y BR-DEV-008 |

No hay decisiones `OQ-SOL-*` de arquitectura específicas de Devolución — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 28.

---

## 29. Plan de realización

Devolución corresponde a los **Slices 9 y 10** del plan transversal: "Devolución e inspección de retorno" y "Daños, garantía y cierre financiero" (`SDD-KAIROS-TRANSVERSAL.md`, sección 29).

---

## 30. Criterios de aprobación

Este documento se aprueba junto con el resto de la serie bajo los 14 criterios de `SDD-KAIROS-TRANSVERSAL.md`, sección 30. Específico de Devolución: el criterio 1 (BDD aprobado) está completamente cumplido — **actualizado 02 sep 2026:** de las 3 preguntas de esta sección, las 3 quedaron `RESUELTO` (OQ-009 y OQ-DEV-102 el 31 de agosto; OQ-DEV-101 el 02 de septiembre, confirmado por Fiorella como variable por diseño, no un SLA fijo).

---

## 31. Checklist de calidad 9–10

| Dimensión | Evidencia | Estado |
| --- | --- | --- |
| Vinculación con BDD | Sección 1.3, `BR-DEV-*` en todo el documento | Cumple |
| Casos de uso | Sección 9 — 5 casos de uso (incluye el nuevo UC-DEV-004) | Cumple |
| Secuencias críticas | Sección 10 — 2 diagramas | Cumple |
| Modelo lógico de datos | Sección 11 — incluye la nueva entidad `ImmobilizationCharge` | Cumple |
| Operaciones y errores | Sección 12 — 6 operaciones, 5 errores | Cumple |
| Eventos | Sección 13 | Cumple |
| UX Architecture | Sección 18 | Cumple |
| NFR específicos | Sección 19 | Cumple |
| Pruebas | Sección 24 — 8 casos obligatorios | Cumple |
| Riesgos específicos | Sección 26 — 2 riesgos nuevos | Cumple |
| Trazabilidad BDD→SDD→TDD | Sección 27 | Cumple BDD→SDD; SDD→TDD parcial (BR-DEV-011 y BR-DEV-008 aún sin refinamiento TDD) |
| Dependencia del documento transversal | Explícita en secciones 1.3, 5-8, 14-17, 20-23, 25-26, 29-30 | Cumple |

**Evaluación:** DRAFT COMPLETE para el alcance de Devolución, con las decisiones de negocio del 31 de agosto ya incorporadas. No aprobado — depende de los mismos roles técnicos sin asignar que el resto de la serie, y de la integración con Motrix (sección 16.4 del documento transversal) para cerrar el flujo de daño técnico de punta a punta.

---

## Anexo A — Frontera entre SDD y TDD

Ver `SDD-KAIROS-TRANSVERSAL.md`, Anexo A.
