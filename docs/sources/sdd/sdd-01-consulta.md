# SDD — 01 Consulta

# Solution Design Document — Consulta

**Código:** SDD-KAIROS-MVP-002 / CON **Versión:** 2.1 — corregido 02 sep 2026 (hallazgo P1-05: `OQ-CON-101` sincronizada a `RESUELTO` formal, ya no "informal") **Estado:** DRAFT COMPLETE — candidato a revisión arquitectónica, no aprobado **Entrada funcional:** `BDD-CON-001` (Consulta) — v1.7, 01 sep 2026 **Depende de:** `SDD-KAIROS-TRANSVERSAL.md` (arquitectura de contexto/contenedores/componentes, multiempresa, seguridad, integraciones, offline, observabilidad, despliegue, migración, ADR y riesgos transversales, decisiones abiertas de arquitectura, criterios de aprobación) **Alcance:** Proceso de Consulta — presencial y virtual **Propietario:** Arquitectura de Solución — pendiente de asignar **Revisores:** Producto, Operaciones, UX, QA **Fecha:** 31 de agosto de 2026

> Este documento traduce el comportamiento de `BDD-CON-001` a una solución lógica verificable. Para todo lo que no varía por proceso (plataforma, multiempresa, seguridad, integraciones, offline, observabilidad, despliegue, migración, ADR y riesgos transversales), ver `SDD-KAIROS-TRANSVERSAL.md` — este documento no lo repite.

---

## 1. Control y gobernanza

### 1.1 Historial

| Versión | Cambio | Autor | Estado |
| --- | --- | --- | --- |
| 2.0 | Extraído de `SDD-KAIROS-Consolidado-Detallado.md` (secciones 9.3, 10.5, 11.5-11.8, 12.4, 12.6 parcial, 18.7, 24.4, 27.3) hacia un documento propio de Consulta, siguiendo el ejemplo de referencia | Russbel (BA), a pedido del usuario | Candidato |

### 1.2 Estado de decisiones

Ver `SDD-KAIROS-TRANSVERSAL.md`, sección 1.2 (mismo esquema de 7 estados en todos los documentos de la serie).

### 1.3 Documentos relacionados

| Documento | Relación |
| --- | --- |
| `BDD-CON-001` | Fuente funcional autoritativa de este proceso |
| `SDD-KAIROS-TRANSVERSAL.md` | Arquitectura base común a los 6 procesos |
| `SDD-KAIROS-TRACEABILITY.md` | Trazabilidad BDD → SDD → TDD consolidada |
| `SDD-RES-001`, `SDD-ALQ-001` | Procesos hacia los que Consulta deriva |
| `TDD-KAIROS-Consolidado-Detallado.md` | Refinamiento técnico subordinado |

### 1.4 Criterio de autoridad

Ver `SDD-KAIROS-TRANSVERSAL.md`, sección 1.4. Este documento no redefine ninguna regla `BR-CON-*` del BDD — la traduce a arquitectura.

---

## 2. Resumen ejecutivo

Consulta es el primer proceso del recorrido del cliente: registra el contacto, califica el uso turístico y la nacionalidad, informa requisitos, muestra el vehículo (presencial o virtual) y deriva hacia Reserva o Alquiler, o cierra sin conversión. Es el módulo propietario `Inquiries` (CRM), que colabora con `Fleet` (elegibilidad por ruta) y `Customers` (si el cliente ya tiene historial), sin ejecutar ningún comando financiero — Consulta nunca reserva ni bloquea un vehículo, solo lo consulta.

### 2.1 Resultado arquitectónico

Toda consulta se resuelve en una conversación estructurada, sin comandos críticos: se captura el uso, la procedencia y el destino; se informan los requisitos correctos según nacionalidad (BR-CON-004); se muestra el vehículo elegible (BR-CON-005); y se deriva o cierra en una sola operación (BR-CON-002), con el motivo registrado si no continúa.

---

## 3. Alcance de la solución

### 3.1 Incluido

- Registro de contacto por cualquier canal habilitado (presencial, WhatsApp, redes, web).
- Calificación de uso turístico y procedencia.
- Informar requisitos según nacionalidad (peruano/extranjero).
- Mostrar el vehículo — presencial (en persona) o virtual (fotos/video).
- Derivación a Reserva o Alquiler, o cierre con motivo registrado.
- Trazabilidad de origen del contacto (canal) para análisis de conversión.

### 3.2 Excluido

- Cualquier bloqueo o reserva de vehículo — eso ocurre en `SDD-RES-001`/`SDD-ALQ-001`.
- Cobro o registro de pago.
- Validación notarial o de documentos formales de contrato.

### 3.3 Dependencias

| Dependencia | Requerida para | Dueño |
| --- | --- | --- |
| IAM | Todas las operaciones | Transversal |
| Fleet | Elegibilidad del vehículo por ruta/destino | Fleet |
| Customers | Reconocer a un cliente recurrente, si ya existe | Customers |
| Reservations / Rentals | Recibir la derivación cuando el cliente decide continuar | Reserva / Alquiler |

---

## 4. Drivers específicos de Consulta

| ID | Driver | Origen | Implicación de solución | Prioridad |
| --- | --- | --- | --- | --- |
| DR-CON-001 | Consulta nunca bloquea ni compromete un vehículo | BR-CON-001, BR-CON-002 | La consulta de disponibilidad en Fleet es de solo lectura, sin efecto de bloqueo | Alta |
| DR-CON-002 | Todo cliente pasa por Consulta, incluso el recurrente | BR-CON-003 | El sistema exige completar Consulta antes de permitir crear una Reserva o un Alquiler directo | Crítica |
| DR-CON-003 | Requisitos documentales dependen de la nacionalidad | BR-CON-004 | Regla de negocio parametrizable (peruano → recibo de agua/luz; extranjero → constancia de hospedaje), no hardcodeada | Media |

> Los drivers y restricciones transversales (DR-KAI-\*) aplican también a Consulta — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 4.

---

## 5–8. Arquitectura de contexto, contenedores, componentes y alternativas

Consulta usa la arquitectura de contexto, contenedores y componentes ya definida en `SDD-KAIROS-TRANSVERSAL.md` (secciones 5-8). El componente propietario de este proceso es **Inquiries (CRM)**, con datos propios `inquiries`, `interactions`, `quotations` (ver tabla 8.1 del documento transversal). No se identificaron alternativas arquitectónicas específicas de Consulta distintas de las ya evaluadas transversalmente.

---

## 9. Diseño por casos de uso

### UC-CON-001 — Calificar uso y procedencia

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | CON-P01 a P06 |
| Actor | Administrador |
| Entrada conceptual | Canal de contacto, uso turístico, nacionalidad |
| Autorización | `inquiry:create` |
| Coordinación | Inquiries (registro directo) → Customers (si hay datos previos del cliente) |
| Consistencia | Síncrona, sin comandos financieros |
| Resultado | Requisitos informados según nacionalidad (BR-CON-004) |
| Eventos | — |
| Errores | — |
| Idempotencia | No aplica — es una conversación, no un comando crítico |

### UC-CON-002 — Mostrar el vehículo

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | CON-P07 |
| Actor | Administrador |
| Entrada conceptual | Catálogo vigente, destino y tiempo estimado |
| Autorización | `inquiry:read` |
| Coordinación | Inquiries → Fleet (elegibilidad por ruta, BR-CON-005) |
| Consistencia | Consulta de disponibilidad no bloqueante — Consulta no reserva el vehículo |
| Resultado | Vehículo mostrado en persona, o evidencia enviada (modalidad virtual) |
| Eventos | — |
| Errores | — |
| Idempotencia | No aplica |

### UC-CON-003 — Derivar o cerrar la consulta

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | CON-P08 a P09 |
| Actor | Cliente/Administrador |
| Entrada conceptual | Decisión del cliente |
| Autorización | `inquiry:update` |
| Coordinación | Inquiries → Reservations o Rentals (derivación) |
| Consistencia | La consulta se cierra o convierte en una sola operación |
| Resultado | Conversión a Reserva/Alquiler, o cierre con motivo (BR-CON-002) |
| Eventos | `ConsultaConvertida` / `ConsultaCerrada` |
| Errores | — |
| Idempotencia | Sí |

---

## 10. Secuencias críticas

### 10.1 Derivar Consulta a Reserva o Alquiler

```
sequenceDiagram
    participant UI as Web/PWA
    participant INQ as Inquiries
    participant FLT as Fleet
    UI->>INQ: Registrar consulta
    INQ->>FLT: Consultar elegibilidad por ruta
    FLT-->>INQ: Vehículos elegibles
    INQ-->>UI: Requisitos y vehículo mostrado
    UI->>INQ: Cliente decide continuar
    INQ-->>UI: Deriva a Reserva o Alquiler
```

---

## 11. Modelo lógico de información

### 11.1 Entidades

| Entidad | Propietario | Identidad | Relaciones | Ciclo de vida |
| --- | --- | --- | --- | --- |
| Inquiry | Inquiries | UUID | Cliente (opcional), vehículo mostrado | Registrada a convertida/cerrada |
| Interaction | Inquiries | UUID | Consulta | Se agrega, no se modifica |

### 11.2 Relaciones

```
erDiagram
    INQUIRY ||--o{ INTERACTION : logs
    INQUIRY ||--o| RESERVATION : converts
    INQUIRY ||--o| RENTAL : converts
```

### 11.3 Propiedad y consistencia

- Inquiries es autoridad sobre el estado de la consulta hasta su conversión o cierre.
- Fleet es autoridad sobre la elegibilidad del vehículo — Inquiries lo consulta, no lo modifica.
- Reservations/Rentals reciben la conversión, pero no leen ni escriben directamente sobre `inquiries`.

### 11.4 Clasificación de sensibilidad

| Clase | Ejemplos | Protección |
| --- | --- | --- |
| Normal | Canal de contacto, destino, motivo de cierre | Alcance empresarial |
| Personal | Nombre, procedencia del cliente | Finalidad y enmascaramiento |

---

## 12. Diseño lógico de operaciones y errores

| ID | Operación | Tipo | Actor | Entrada conceptual | Salida | Idempotente |
| --- | --- | --- | --- | --- | --- | --- |
| OP-CON-001 | Registrar consulta | Comando | Administrador | Canal, datos del cliente | Consulta registrada | Sí |
| OP-CON-002 | Evaluar uso turístico | Consulta | Administrador | — | Continúa o cierra | No aplica |
| OP-CON-003 | Informar requisitos | Consulta | Administrador | Nacionalidad | Requisitos según BR-CON-004 | No aplica |
| OP-CON-004 | Derivar o cerrar | Comando | Administrador | Decisión del cliente | Convertida/cerrada | Sí |

### 12.1 Errores lógicos

Consulta no genera errores lógicos propios más allá de los transversales (`FORBIDDEN_SCOPE`, `CUSTOMER_BLOCKED` si el cliente ya está en rojo) — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 15.

---

## 13. Eventos

| Evento | Productor | Consumidores | Datos mínimos | Garantía |
| --- | --- | --- | --- | --- |
| ConsultaConvertida | Inquiries | Reservations/Rentals, Reporting | `inquiry_id`, destino | Al menos una vez |
| ConsultaCerrada | Inquiries | Reporting | `inquiry_id`, motivo | Al menos una vez |

Ver semántica general de eventos en `SDD-KAIROS-TRANSVERSAL.md`, sección 13.1.

---

## 14–17. Multiempresa, seguridad, integraciones y offline

Consulta hereda íntegramente el diseño transversal (`SDD-KAIROS-TRANSVERSAL.md`, secciones 14-17). No tiene reglas de visibilidad, amenazas ni necesidades de integración propias más allá de las ya cubiertas allí. En el flujo de campo, "preparar borrador de consulta" es una de las acciones permitidas offline (ver tabla 17.1 del documento transversal).

---

## 18. UX Architecture

### 18.1 Flujo de pantallas — Consulta

Recepción/canal → Uso turístico y procedencia → Requisitos según nacionalidad → Vehículo mostrado (presencial) o evidencia enviada (virtual) → Decisión de continuar → Derivación a Reserva/Alquiler, o cierre con motivo.

Los principios generales de UX, estados visuales y accesibilidad viven en `SDD-KAIROS-TRANSVERSAL.md`, sección 18.

---

## 19. Requisitos no funcionales específicos

Consulta no tiene NFR de negocio propios más allá de los transversales (`SDD-KAIROS-TRANSVERSAL.md`, sección 19). Es el proceso con menor exigencia de consistencia fuerte, ya que no ejecuta comandos financieros ni de disponibilidad bloqueante.

---

## 20–23. Observabilidad, continuidad, despliegue y migración

Sin particularidades para Consulta — ver `SDD-KAIROS-TRANSVERSAL.md`, secciones 20-23.

---

## 24. Estrategia de pruebas

### 24.1 Casos obligatorios — Consulta

- Cliente que rechaza el uso turístico (cierre inmediato).
- Cliente extranjero recibiendo el set de requisitos correcto.
- Modalidad virtual: envío de evidencia en vez de exhibición presencial.
- Cliente decide no continuar (cierre con motivo registrado).
- Cliente recurrente intentando saltarse Consulta (debe bloquearse — DR-CON-002).

Los casos obligatorios transversales viven en `SDD-KAIROS-TRANSVERSAL.md`, sección 24.1.

---

## 25. ADR específicos

Consulta no tiene ADR propios — usa los 5 ADR transversales de `SDD-KAIROS-TRANSVERSAL.md`, sección 25.

---

## 26. Riesgos específicos

Sin riesgos propios más allá de los transversales (`SDD-KAIROS-TRANSVERSAL.md`, sección 26). El riesgo RSK-005 (calidad de datos históricos) es el más relevante para Consulta, dado que el canal de origen (WhatsApp, presencial, redes) hoy no siempre se registra de forma consistente.

---

## 27. Trazabilidad BDD → SDD → TDD

| Regla BDD | Dato (BDD) | Caso de uso (SDD) | Componente | Operación/evento | Refinamiento TDD |
| --- | --- | --- | --- | --- | --- |
| BR-CON-003 | — | UC-CON-001 | Inquiries | OP-CON-001 | TDD, sección 9.1 |
| BR-CON-004 | DAT-CON-002 | UC-CON-001 | Inquiries | OP-CON-003 | — |
| BR-CON-005 | DAT-CON-003 | UC-CON-002 | Inquiries/Fleet | OP-CON-002 | TDD, sección 9.2 |
| BR-CON-002 | DAT-CON-005 | UC-CON-003 | Inquiries | OP-CON-004 | — |

> 📌 Esta tabla también vive consolidada en `SDD-KAIROS-TRACEABILITY.md`, junto a la de los otros 5 procesos.

---

## 28. Decisiones abiertas relevantes para Consulta

| ID (BDD) | Pregunta | Estado |
| --- | --- | --- |
| OQ-CON-101 | ¿La modalidad virtual de Consulta ya tiene validación formal de Fiorella? | ✅ `RESUELTO` (02 sep 2026 — corregido, ya no es "informal") — Fiorella confirmó formalmente la validación del flujo de Consulta virtual. Ver `BDD-CON-001`, sección 19.3 |

No hay decisiones `OQ-SOL-*` de arquitectura específicas de Consulta — ver el catálogo transversal en `SDD-KAIROS-TRANSVERSAL.md`, sección 28.

---

## 29. Plan de realización

Consulta corresponde al **Slice 3** del plan transversal (`SDD-KAIROS-TRANSVERSAL.md`, sección 29): "Cliente, Consulta y cotización", con dependencia de Customers/Inquiries.

---

## 30. Criterios de aprobación

Este documento se aprueba junto con el resto de la serie SDD bajo los 14 criterios de `SDD-KAIROS-TRANSVERSAL.md`, sección 30. Específico de Consulta: el criterio 1 (BDD aprobado) está completamente cumplido para este proceso — `BDD-CON-001` no tiene ninguna pregunta funcional abierta; OQ-CON-101 quedó `RESUELTO` de forma formal el 02 de septiembre.

---

## 31. Checklist de calidad 9–10

| Dimensión | Evidencia | Estado |
| --- | --- | --- |
| Vinculación con BDD | Sección 1.3, `BR-CON-*` en todo el documento | Cumple |
| Casos de uso | Sección 9 — 3 casos de uso | Cumple |
| Secuencias críticas | Sección 10 | Cumple |
| Modelo lógico de datos | Sección 11 | Cumple |
| Operaciones y errores | Sección 12 — 4 operaciones | Cumple |
| Eventos | Sección 13 | Cumple |
| UX Architecture | Sección 18 | Cumple |
| Pruebas | Sección 24 — 5 casos obligatorios | Cumple |
| Trazabilidad BDD→SDD→TDD | Sección 27 | Cumple BDD→SDD; SDD→TDD parcial |
| Dependencia del documento transversal | Explícita en secciones 1.3, 5-8, 14-17, 19-23, 25-26, 29-30 | Cumple |

**Evaluación:** DRAFT COMPLETE para el alcance de Consulta. No aprobado — depende de los mismos roles técnicos sin asignar que el resto de la serie (ver `SDD-KAIROS-TRANSVERSAL.md`, sección 30).

---

## Anexo A — Frontera entre SDD y TDD

Ver `SDD-KAIROS-TRANSVERSAL.md`, Anexo A (idéntico para los 6 procesos).
