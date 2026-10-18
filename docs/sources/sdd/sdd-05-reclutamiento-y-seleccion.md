# SDD — 05 Reclutamiento y Selección

> **Estado vigente:** APROBADO como versión base por instrucción explícita del usuario el 18 oct 2026. Este estado reemplaza cualquier indicación histórica de borrador; cambios posteriores se gestionan como mejoras documentadas.

# Solution Design Document — Reclutamiento y Selección

**Código:** SDD-KAIROS-MVP-002 / REC **Versión:** 2.0 — dividido a partir de `SDD-KAIROS-Consolidado-Detallado.md` (v1.2) **Estado:** DRAFT COMPLETE — candidato a revisión arquitectónica, no aprobado **Entrada funcional:** `BDD-REC-001` (Reclutamiento y Selección) **Depende de:** `SDD-KAIROS-TRANSVERSAL.md` (arquitectura base, multiempresa, seguridad, integraciones, offline, observabilidad, despliegue, migración, ADR y riesgos transversales, decisiones abiertas de arquitectura, criterios de aprobación) **Alcance:** Proceso de Reclutamiento y Selección — AS-IS real, con espacio para el Plan de Talento Humano formal **Propietario:** Arquitectura de Solución — pendiente de asignar **Revisores:** Producto, Operaciones, QA **Fecha:** 31 de agosto de 2026

> Este documento traduce el comportamiento de `BDD-REC-001` a una solución lógica verificable. Para todo lo que no varía por proceso, ver `SDD-KAIROS-TRANSVERSAL.md` — este documento no lo repite.

---

## 1. Control y gobernanza

### 1.1 Historial

| Versión | Cambio | Autor | Estado |
| --- | --- | --- | --- |
| 2.0 | Extraído de `SDD-KAIROS-Consolidado-Detallado.md` (secciones 9.5, 10.8, 11.9-11.12, 12.7, 12.9 parcial, 18.9, 24.6, 27.6, 27.8, ADR-KAI-006) hacia un documento propio de Reclutamiento y Selección, siguiendo el ejemplo de referencia | Russbel (BA), a pedido del usuario | Candidato |

### 1.2 Estado de decisiones

Ver `SDD-KAIROS-TRANSVERSAL.md`, sección 1.2.

### 1.3 Documentos relacionados

| Documento | Relación |
| --- | --- |
| `BDD-REC-001` | Fuente funcional autoritativa de este proceso |
| `SDD-KAIROS-TRANSVERSAL.md` | Arquitectura base común a los 6 procesos |
| `SDD-KAIROS-TRACEABILITY.md` | Trazabilidad BDD → SDD → TDD consolidada |
| `SDD-ADP-001` | Proceso hermano — recibe al personal incorporado y dispara nuevas vacantes hacia Reclutamiento |
| `TDD-KAIROS-Consolidado-Detallado.md` | Refinamiento técnico subordinado |

### 1.4 Criterio de autoridad

Ver `SDD-KAIROS-TRANSVERSAL.md`, sección 1.4. Este documento no redefine ninguna regla `BR-REC-*` del BDD.

---

## 2. Resumen ejecutivo

Reclutamiento y Selección responde a "¿quién debería trabajar con nosotros?" — detecta la necesidad de personal, publica, recibe candidatos, entrevista, decide (exclusivamente Fiorella, sin ficha de puntaje formal hoy), incorpora, y evalúa el periodo de prueba a 3 meses. El módulo propietario es `Recruitment`.

El diseño debe reflejar el **AS-IS real** (proceso informal, decisión de Fiorella sola) sin bloquear la evolución hacia el **Plan de Talento Humano formal** (Análisis de Puesto documentado, ficha de evaluación con puntaje, aprobación de Gerencia) — decisión de arquitectura DR-KAI-012, ya documentada en el transversal.

### 2.1 Resultado arquitectónico

Una decisión de contratación se resuelve como un registro simple hoy (decisión de Fiorella, sin flujo de aprobación paralelo), pero el modelo de datos deja espacio explícito (campos opcionales, no obligatorios) para cuando el Plan formal se aplique íntegro — sin necesitar rediseño quirúrgico del dominio en ese momento.

---

## 3. Alcance de la solución

### 3.1 Incluido

- Registro de necesidad y perfil informal de vacante.
- Publicación y recepción de candidatos.
- Entrevista y decisión de contratación (exclusiva de Fiorella).
- Incorporación de personal (dispositivos, documentos, inducción).
- Evaluación de periodo de prueba a 3 meses y paso a planilla o término.

### 3.2 Excluido

- Ficha de puntaje formal, Análisis de Puesto documentado — existen en el Plan de Talento Humano pero no se aplican hoy; el campo queda preparado, no obligatorio.
- Evaluación de Desempeño y Capacitación formal — quedan fuera del MVP (ver `SDD-KAIROS-TRANSVERSAL.md`, sección 3.2).

### 3.3 Dependencias

| Dependencia | Requerida para | Dueño |
| --- | --- | --- |
| HR-Administration | Creación del expediente del colaborador tras incorporar | Administración de Personal |
| IAM | Alcance de empresa/sede para la vacante | Transversal |

---

## 4. Drivers específicos de Reclutamiento y Selección

| ID | Driver | Origen | Implicación de solución | Prioridad |
| --- | --- | --- | --- | --- |
| DR-REC-001 | AS-IS real más simple que el Plan formal | BR-REC-006, DR-KAI-012 (transversal) | El modelo soporta la versión informal simplificada hoy, con campos opcionales listos para el Plan formal, sin rediseño futuro | Media |
| DR-REC-002 | Decisión de contratación exclusiva de Fiorella | BR-REC-003 | La autorización de `hr:manage` para decidir contratación no se delega a ningún otro rol en esta versión | Alta |
| DR-REC-003 | Salida de personal dispara nueva vacante solo por evento formal | ADR-KAI-006 | El único acoplamiento entre Recruitment y HR-Administration es el evento `RelacionLaboralTerminada` — ningún módulo lee directamente las tablas del otro | Alta |

---

## 5–8. Arquitectura de contexto, contenedores, componentes y alternativas

Reclutamiento y Selección usa la arquitectura ya definida en `SDD-KAIROS-TRANSVERSAL.md` (secciones 5-8). El componente propietario es **Recruitment** (`vacancies`, `candidates`, `employees` en su fase de origen — ver tabla 8.1 del documento transversal).

---

## 9. Diseño por casos de uso

> Los casos de uso reflejan el flujo AS-IS real (BDD, sección 7.5) — no el Plan de Talento Humano formal, que hoy se aplica solo parcialmente (BR-REC-006). El diseño debe soportar esta versión simplificada sin bloquear la evolución hacia el Plan (DR-REC-001).

### UC-REC-001 — Detectar necesidad y definir perfil

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | REC-P01 a P02 |
| Actor | Fiorella/José |
| Entrada conceptual | Fuente de la necesidad, funciones del puesto |
| Autorización | `hr:manage` |
| Coordinación | Recruitment (registro directo) |
| Consistencia | Síncrona |
| Resultado | Vacante registrada, con perfil informal (BR-REC-008) |
| Eventos | — |
| Errores | — |
| Idempotencia | No aplica |

### UC-REC-002 — Publicar y recibir candidatos

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | REC-P03 a P06 |
| Actor | Marketing/Fiorella |
| Entrada conceptual | Canales de publicación, CV, pretensión salarial |
| Autorización | `hr:manage` |
| Coordinación | Recruitment (registro directo) |
| Consistencia | — |
| Resultado | Candidato en negociación |
| Eventos | — |
| Errores | — |
| Idempotencia | No aplica |

### UC-REC-003 — Entrevistar y decidir

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | REC-P07 a P10 |
| Actor | Fiorella |
| Entrada conceptual | Resultado de entrevista — sin ficha de puntaje formal hoy (BR-REC-003) |
| Autorización | `hr:manage` — decisión exclusiva de Fiorella (DR-REC-002) |
| Coordinación | Recruitment (registro directo) |
| Consistencia | Decisión síncrona, sin aprobación paralela hoy |
| Resultado | Candidato contratado, o no |
| Eventos | `CandidatoSeleccionado` |
| Errores | `CANDIDATE_ALREADY_DECIDED` |
| Idempotencia | Sí |

### UC-REC-004 — Incorporar personal

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | REC-P11 a P13 |
| Actor | Administrador |
| Entrada conceptual | Dispositivos entregados, documento de responsabilidad, documento de expectativas |
| Autorización | `hr:manage` |
| Coordinación | Recruitment → HR-Administration (creación del expediente de colaborador) |
| Consistencia | Ingreso coordinado con inducción |
| Resultado | Personal incorporado, periodo de prueba iniciado (BR-REC-005) |
| Eventos | `PersonalIncorporado` |
| Errores | — |
| Idempotencia | Sí |

### UC-REC-005 — Evaluar periodo de prueba y decidir planilla

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | REC-P14 a P15 |
| Actor | Fiorella |
| Entrada conceptual | Resultado de la evaluación a 3 meses |
| Autorización | `hr:manage` |
| Coordinación | Recruitment → HR-Administration (paso a planilla) |
| Consistencia | — |
| Resultado | Planilla al 4to mes, o término de la relación |
| Eventos | `PasoAPlanilla` / `RelacionLaboralTerminada` |
| Errores | — |
| Idempotencia | Sí |

---

## 10. Secuencias críticas

### 10.1 Selección de personal (AS-IS real, sin ficha de puntaje formal)

```
sequenceDiagram
    participant CAND as Candidato
    participant REC as Recruitment
    participant FIO as Fiorella
    CAND->>REC: Contacto directo
    REC->>FIO: Registrar CV y pretensión salarial
    FIO->>FIO: Entrevistar (15 min, Meet)
    FIO->>FIO: Reanalizar entrevista y CV
    FIO-->>REC: Decisión de contratación
    REC-->>CAND: Resultado
```

---

## 11. Modelo lógico de información

### 11.1 Entidades

| Entidad | Propietario | Identidad | Relaciones | Ciclo de vida |
| --- | --- | --- | --- | --- |
| Vacancy | Recruitment | UUID | Empresa, perfil | Necesidad registrada → publicada → cerrada |
| Candidate | Recruitment | UUID | Vacante | En negociación → decidido |

### 11.2 Relaciones

```
erDiagram
    VACANCY ||--o{ CANDIDATE : receives
    CANDIDATE ||--o| EMPLOYEE : becomes
```

### 11.3 Propiedad y consistencia

- Recruitment es autoridad sobre el ciclo de selección — no ejecuta comandos sobre el día a día del colaborador ya contratado.
- El único punto de acoplamiento con HR-Administration es el evento `RelacionLaboralTerminada` (ADR-KAI-006) — ninguno modifica directamente las tablas propietarias del otro.
- **El modelo debe representar el AS-IS real** (candidato → decisión informal de Fiorella) **y dejar espacio para el Plan formal** (Análisis de Puesto documentado, ficha de evaluación con puntaje, aprobación de Gerencia) **sin rediseño** — DR-REC-001. Concretamente: `Candidate` no fuerza hoy un campo de puntaje obligatorio, pero el campo existe como opcional desde esta versión, listo para cuando el Plan se aplique íntegro.

### 11.4 Clasificación de sensibilidad

| Clase | Ejemplos | Protección |
| --- | --- | --- |
| Sensible | CV, pretensión salarial, resultado de entrevista | Fiorella/José, no expuesto fuera del proceso |
| Interna | Estado de la vacante | Alcance empresarial |

---

## 12. Diseño lógico de operaciones y errores

| ID | Operación | Tipo | Actor | Entrada conceptual | Salida | Idempotente |
| --- | --- | --- | --- | --- | --- | --- |
| OP-REC-001 | Registrar necesidad y perfil | Comando | Fiorella/José | Fuente, funciones | Vacante registrada | Sí |
| OP-REC-002 | Registrar candidato | Comando | Fiorella | CV, pretensión salarial | Candidato en negociación | Sí |
| OP-REC-003 | Decidir contratación | Comando | Fiorella | Resultado de entrevista | Contratado/no | Sí |
| OP-REC-004 | Incorporar personal | Comando | Administrador | Dispositivos, documentos | Personal incorporado | Sí |
| OP-REC-005 | Evaluar periodo de prueba | Comando | Fiorella | Resultado a 3 meses | Planilla/término | Sí |

### 12.1 Catálogo de errores lógicos

| Código | Causa | Resultado para el usuario | Recuperación |
| --- | --- | --- | --- |
| `CANDIDATE_ALREADY_DECIDED` | Se intenta decidir dos veces sobre el mismo candidato | Rechazo del comando | Consultar la decisión ya registrada |

---

## 13. Eventos

| Evento | Productor | Consumidores | Datos mínimos | Garantía |
| --- | --- | --- | --- | --- |
| CandidatoSeleccionado | Recruitment | HR-Administration, Audit | `candidate_id`, decisión, justificación | Al menos una vez |
| PasoAPlanilla | Recruitment | HR-Administration, Audit | `employee_id` | Al menos una vez |

---

## 14–17. Multiempresa, seguridad, integraciones y offline

Reclutamiento y Selección hereda el diseño transversal (`SDD-KAIROS-TRANSVERSAL.md`, secciones 14-17). Particularidad: el expediente de personal (Talento Humano) es transversal a las 4 empresas del grupo — visible solo a Fiorella/José y a roles de RRHH designados, sin distinción por empresa individual (ver tabla 14.2 del documento transversal).

---

## 18. UX Architecture

### 18.1 Flujo de pantallas — Reclutamiento y Selección

Necesidad de personal → Perfil (informal) → Publicación → Candidatos en negociación → Entrevista → Decisión → Incorporación → Periodo de prueba → Planilla o término.

Los principios generales de UX viven en `SDD-KAIROS-TRANSVERSAL.md`, sección 18.

---

## 19. Requisitos no funcionales específicos

Reclutamiento y Selección no tiene NFR de negocio propios más allá de los transversales — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 19. Es, junto con Administración de Personal, el proceso menos exigente en consistencia transaccional, dado su bajo volumen y naturaleza mayormente conversacional.

---

## 20–23. Observabilidad, continuidad, despliegue y migración

Sin particularidades para Reclutamiento y Selección más allá de las señales transversales — ver `SDD-KAIROS-TRANSVERSAL.md`, secciones 20-23.

---

## 24. Estrategia de pruebas

### 24.1 Casos obligatorios — Reclutamiento y Selección

- Candidato rechaza las condiciones (no continúa).
- Fiorella decide no contratar tras la entrevista.
- Personal mecánico: variante con contrato interno notariado.
- Evaluación a 3 meses positiva (planilla) vs. negativa (término, dispara Reclutamiento).

Los casos obligatorios transversales viven en `SDD-KAIROS-TRANSVERSAL.md`, sección 24.1.

---

## 25. ADR específicos

### ADR-KAI-006 — Recruitment y HR-Administration como módulos separados

| Elemento | Contenido |
| --- | --- |
| Contexto | Reclutamiento responde "¿quién debería trabajar con nosotros?"; Administración de Personal responde "¿qué pasa día a día?" (BR-REC-001) |
| Decisión | Módulos independientes, conectados solo por el evento `RelacionLaboralTerminada` |
| Beneficio | Refleja la separación real ya validada en el negocio, evita mezclar dos ritmos distintos de trabajo |
| Consecuencia | Requiere el evento transversal bien definido para no perder la señal de "nueva vacante por salida" |
| Estado | `PROPUESTA_SOLUCIÓN` — sin aprobación formal de Arquitectura (sin Tech Lead asignado) |

> Este ADR es compartido con `SDD-ADP-001`, dado que describe la frontera entre ambos módulos.

---

## 26. Riesgos específicos

El riesgo transversal RSK-012 (confusión entre AS-IS real y Plan de Talento Humano formal al construir las pantallas) es el más relevante para este proceso — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 26.

---

## 27. Trazabilidad BDD → SDD → TDD

| Regla BDD | Dato (BDD) | Caso de uso (SDD) | Componente | Operación/evento | Refinamiento TDD |
| --- | --- | --- | --- | --- | --- |
| BR-REC-008 | DAT-REC-001 | UC-REC-001 | Recruitment | OP-REC-001 | — |
| BR-REC-003 | DAT-REC-005 | UC-REC-003 | Recruitment | OP-REC-003, `CandidatoSeleccionado` | — |
| BR-REC-009 | DAT-REC-006 | UC-REC-004 | Recruitment/HR-Administration | OP-REC-004 | — |
| BR-REC-005 | DAT-REC-008 | UC-REC-005 | Recruitment/HR-Administration | OP-REC-005 | — |
| BR-REC-006 | — | Todos (`UC-REC-*`) | Recruitment | — | Nota: DR-REC-001 |

### 27.1 Nota sobre la brecha AS-IS/Plan formal

Esta trazabilidad documenta el proceso **tal como se ejecuta hoy** (informal, decisión exclusiva de Fiorella). Las preguntas OQ-REC-101 a 104 (BDD, sección 19.5) no bloquean esta arquitectura — el modelo (sección 11.3, DR-REC-001) ya contempla evolucionar hacia el Plan formal sin rediseño, cuando esas preguntas se resuelvan con Fiorella.

> 📌 Esta tabla también vive consolidada en `SDD-KAIROS-TRACEABILITY.md`.

---

## 28. Decisiones abiertas relevantes para Reclutamiento y Selección

No hay preguntas de negocio abiertas específicas de este proceso — las preguntas OQ-REC-101 a 104 del BDD ya están `RESUELTO`. Decisión de arquitectura relacionada: OQ-SOL-012 (Talento Humano avanzado, en qué release) — Evaluación de Desempeño ya tiene fecha objetivo Q1 2027; Capacitación formal sigue `PENDIENTE` — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 28.

---

## 29. Plan de realización

Reclutamiento y Selección corresponde al **Slice 11** del plan transversal: "Reclutamiento y Selección básico" (`SDD-KAIROS-TRANSVERSAL.md`, sección 29).

---

## 30. Criterios de aprobación

Este documento se aprueba junto con el resto de la serie bajo los 14 criterios de `SDD-KAIROS-TRANSVERSAL.md`, sección 30.

---

## 31. Checklist de calidad 9–10

| Dimensión | Evidencia | Estado |
| --- | --- | --- |
| Vinculación con BDD | Sección 1.3, `BR-REC-*` en todo el documento | Cumple |
| Casos de uso | Sección 9 — 5 casos de uso | Cumple |
| Secuencias críticas | Sección 10 | Cumple |
| Modelo lógico de datos | Sección 11 — incluye el matiz AS-IS/Plan formal | Cumple |
| Operaciones y errores | Sección 12 — 5 operaciones, 1 error | Cumple |
| Eventos | Sección 13 | Cumple |
| UX Architecture | Sección 18 | Cumple |
| Pruebas | Sección 24 — 4 casos obligatorios | Cumple |
| ADR específicos | Sección 25 — ADR-KAI-006 | Cumple |
| Trazabilidad BDD→SDD→TDD | Sección 27 | Cumple BDD→SDD; SDD→TDD pendiente en su totalidad |
| Dependencia del documento transversal | Explícita en secciones 1.3, 5-8, 14-17, 19-24, 26, 29-30 | Cumple |

**Evaluación:** DRAFT COMPLETE para el alcance de Reclutamiento y Selección. No aprobado — depende de los mismos roles técnicos sin asignar que el resto de la serie.

---

## Anexo A — Frontera entre SDD y TDD

Ver `SDD-KAIROS-TRANSVERSAL.md`, Anexo A.
