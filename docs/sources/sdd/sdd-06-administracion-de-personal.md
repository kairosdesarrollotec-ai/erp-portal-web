# SDD — 06 Administración de Personal

> **Estado vigente:** APROBADO como versión base por instrucción explícita del usuario el 18 oct 2026. Este estado reemplaza cualquier indicación histórica de borrador; cambios posteriores se gestionan como mejoras documentadas.

# Solution Design Document — Administración de Personal

**Código:** SDD-KAIROS-MVP-002 / ADP **Versión:** 2.1 — dividido a partir de `SDD-KAIROS-Consolidado-Detallado.md` (v1.2), corregido 02 sep 2026 (BR-ADP-002: capacidad de área, no "2 personas clave") **Estado:** DRAFT COMPLETE — candidato a revisión arquitectónica, no aprobado **Entrada funcional:** `BDD-ADP-001` (Administración de Personal) — v1.6, 31 ago 2026 **Depende de:** `SDD-KAIROS-TRANSVERSAL.md` (arquitectura base, multiempresa, seguridad, integraciones, offline, observabilidad, despliegue, migración, ADR y riesgos transversales, decisiones abiertas de arquitectura, criterios de aprobación) **Alcance:** Proceso de Administración de Personal — asistencia, permisos, vacaciones, remuneración, salidas a campo, salida **Propietario:** Arquitectura de Solución — pendiente de asignar **Revisores:** Producto, Operaciones, QA **Fecha:** 31 de agosto de 2026

> Este documento traduce el comportamiento de `BDD-ADP-001` a una solución lógica verificable. Para todo lo que no varía por proceso, ver `SDD-KAIROS-TRANSVERSAL.md` — este documento no lo repite.

---

## 1. Control y gobernanza

### 1.1 Historial

| Versión | Cambio | Autor | Estado |
| --- | --- | --- | --- |
| 2.0 | Extraído de `SDD-KAIROS-Consolidado-Detallado.md` (secciones 9.6, 10.9-10.10, 11.9-11.12, 12.8-12.9, 18.10, 24.7, 27.7-27.8, ADR-KAI-006) hacia un documento propio de Administración de Personal, siguiendo el ejemplo de referencia. Incorpora la reversión de OQ-ADP-102 (sin 4to nivel automático) confirmada el 31 ago con Fiorella | Russbel (BA), a pedido del usuario | Candidato |

### 1.2 Estado de decisiones

Ver `SDD-KAIROS-TRANSVERSAL.md`, sección 1.2.

### 1.3 Documentos relacionados

| Documento | Relación |
| --- | --- |
| `BDD-ADP-001` (v1.6) | Fuente funcional autoritativa de este proceso |
| `SDD-KAIROS-TRANSVERSAL.md` | Arquitectura base común a los 6 procesos |
| `SDD-KAIROS-TRACEABILITY.md` | Trazabilidad BDD → SDD → TDD consolidada |
| `SDD-REC-001` | Proceso hermano — recibe personal incorporado, recibe señal de nuevas vacantes |
| `TDD-KAIROS-Consolidado-Detallado.md` | Refinamiento técnico subordinado — tabla `vacations` con `EXCLUDE` para no-superposición ya definida |

### 1.4 Criterio de autoridad

Ver `SDD-KAIROS-TRANSVERSAL.md`, sección 1.4. Este documento no redefine ninguna regla `BR-ADP-*` del BDD.

---

## 2. Resumen ejecutivo

Administración de Personal no es un flujo lineal — son sub-flujos independientes: asistencia, permisos, vacaciones, salidas a campo (con cascada de autorización de 3 niveles), y clasificación de salida (renuncia/despido). El módulo propietario `HR-Administration` colabora con `Recruitment` solo mediante el evento `RelacionLaboralTerminada` (ADR-KAI-006, compartido con `SDD-REC-001`).

Una decisión confirmada el 31 de agosto de 2026, que revierte lo acordado el 27 de agosto: **no existe un 4to nivel de autorización automático** para salidas a campo. Tras agotar los 3 niveles de la cascada (Fiorella → José Pariona → Cecilia), el sistema solo notifica que nadie autorizó — la decisión de a quién más consultar queda manual, fuera del sistema, por decisión explícita de Fiorella (no confía hoy en el personal de Gestión y Procesos para automatizar esa escalación).

### 2.1 Resultado arquitectónico

Una autorización de salida a campo se resuelve como una cascada con temporizador de 5 minutos por nivel: si Fiorella no responde, escala a José; si José no responde, escala a Cecilia; si Cecilia tampoco responde, el sistema se detiene ahí — **no hay un 4to nivel automatizado**. Cualquier resolución posterior a ese punto es una decisión humana fuera del alcance del comando.

---

## 3. Alcance de la solución

### 3.1 Incluido

- Registro de asistencia informal y cálculo de sanciones a fin de mes (nunca en la quincena).
- Autorización de permisos, exclusiva de Fiorella y José.
- Programación de vacaciones, con verificación de capacidad del área (máximo 1 persona a la vez, corregido 02 sep 2026 — ya no son "2 personas clave" designadas).
- Cascada de autorización de salida a campo (3 niveles, 5 min por nivel, **sin 4to nivel automático**).
- Evaluación de regreso a tiempo de una salida a campo (advertencia / observado).
- Clasificación de salida (renuncia/despido) y disparo de la señal hacia Reclutamiento.

### 3.2 Excluido

- Cualquier 4to nivel de autorización automatizado — decisión explícita revertida el 31 ago.
- Evaluación de Desempeño formal — diseñada, nunca aplicada (fuera del MVP, ver `SDD-KAIROS-TRANSVERSAL.md`, sección 3.2).
- Capacitación formal completa (Plan Anual, presupuesto, proveedor externo).

### 3.3 Dependencias

| Dependencia | Requerida para | Dueño |
| --- | --- | --- |
| Recruitment | Origen del colaborador (candidato incorporado) | Reclutamiento y Selección |
| IAM | Alcance de empresa/sede | Transversal |

---

## 4. Drivers específicos de Administración de Personal

| ID | Driver | Origen | Implicación de solución | Prioridad |
| --- | --- | --- | --- | --- |
| DR-ADP-001 | Máximo 1 persona del área de vacaciones a la vez (corregido 02 sep — no son "2 personas clave" fijas) | BR-ADP-002 | Constraint de exclusión por `area_id` sobre la tabla `vacations` (ya definido en TDD con `EXCLUDE`) | Alta |
| DR-ADP-002 | Cascada de autorización con temporizador, sin 4to nivel automático | BR-ADP-004 (revertido 31 ago) | El dominio expone exactamente 3 niveles de decisión automatizada; agotados los 3, el comando termina en "sin autorización" — no existe un 4to autorizador por defecto en el sistema | Crítica |
| DR-ADP-003 | Salida dispara Reclutamiento solo por evento formal | ADR-KAI-006 | Igual que en `SDD-REC-001` — el evento `RelacionLaboralTerminada` es el único acoplamiento | Alta |

---

## 5–8. Arquitectura de contexto, contenedores, componentes y alternativas

Administración de Personal usa la arquitectura ya definida en `SDD-KAIROS-TRANSVERSAL.md` (secciones 5-8). El componente propietario es **HR-Administration** (`attendance`, `leaves`, `field trips` — ver tabla 8.1 del documento transversal).

---

## 9. Diseño por casos de uso

> No es un flujo lineal — cada caso de uso corresponde a un sub-flujo independiente (BDD, sección 7.6).

### UC-ADP-001 — Registrar asistencia y aplicar sanción

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | ADP-P01 a P04 |
| Actor | Personal/Fiorella |
| Entrada conceptual | Registro informal de asistencia, tipo de falta |
| Autorización | `hr:manage` (Fiorella) |
| Coordinación | HR-Administration (registro directo) |
| Consistencia | El descuento se calcula a fin de mes, nunca en la quincena (BR-ADP-001) |
| Resultado | Advertencia, o descuento aplicado |
| Eventos | — |
| Errores | — |
| Idempotencia | No aplica — es registro de hechos |

### UC-ADP-002 — Autorizar permiso

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | ADP-P05 a P06 |
| Actor | Personal/Fiorella/José |
| Entrada conceptual | Solicitud con anticipación |
| Autorización | `hr:manage` — exclusivo de Fiorella y José (BR-ADP-003) |
| Coordinación | HR-Administration (registro directo) |
| Consistencia | — |
| Resultado | Permiso autorizado o denegado |
| Eventos | — |
| Errores | — |
| Idempotencia | Sí |

### UC-ADP-003 — Programar vacaciones

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | ADP-P09 a P10 |
| Actor | Personal/Fiorella |
| Entrada conceptual | Fechas solicitadas |
| Autorización | `hr:manage` |
| Coordinación | HR-Administration (registro directo) |
| Consistencia | Verificación de capacidad del área — máximo 1 persona a la vez (BR-ADP-002, DR-ADP-001, corregida 02 sep) |
| Resultado | Vacaciones programadas, o reprogramadas |
| Eventos | — |
| Errores | `VACATION_OVERLAP` |
| Idempotencia | Sí |

### UC-ADP-004 — Autorizar salida a campo en cascada

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | ADP-P12 a P14 |
| Actor | Personal/Fiorella/José/Cecilia |
| Entrada conceptual | Solicitud, nivel de autorización alcanzado |
| Autorización | Cascada de 3 niveles con temporizador de 5 minutos por nivel (BR-ADP-004, confirmado 31 ago sin 4to nivel automático) |
| Coordinación | HR-Administration (registro directo) |
| Consistencia | Temporizador por nivel, no salta directamente al siguiente |
| Resultado | Autorizada (con el nivel registrado), o sin autorización — decisión posterior queda manual, fuera del sistema (DR-ADP-002) |
| Eventos | — |
| Errores | `NO_AUTHORIZATION_AVAILABLE` |
| Idempotencia | Sí |

### UC-ADP-005 — Clasificar y disparar salida

| Aspecto | Diseño |
| --- | --- |
| Paso BDD | ADP-P15 a P17 |
| Actor | Fiorella |
| Entrada conceptual | Tipo de salida (renuncia/despido) |
| Autorización | `hr:manage` |
| Coordinación | HR-Administration → Recruitment (dispara nueva vacante) |
| Consistencia | El evento `RelacionLaboralTerminada` es la única forma de generar la señal hacia Recruitment (ADR-KAI-006) |
| Resultado | Relación terminada, nueva necesidad de personal registrada |
| Eventos | `RelacionLaboralTerminada` |
| Errores | `EMPLOYMENT_ALREADY_TERMINATED` |
| Idempotencia | Sí |

---

## 10. Secuencias críticas

### 10.1 Autorización de salida a campo en cascada (sin 4to nivel automático — confirmado 31 ago)

```ruby
sequenceDiagram
    participant P as Personal
    participant ADP as HR-Administration
    participant F as Fiorella
    participant J as José
    participant C as Cecilia
    P->>ADP: Solicitar salida a campo
    ADP->>F: Notificar (temporizador 5 min)
    alt Fiorella responde
        F-->>ADP: Autoriza
    else Sin respuesta
        ADP->>J: Notificar (temporizador 5 min)
        alt José responde
            J-->>ADP: Autoriza
        else Sin respuesta
            ADP->>C: Notificar (temporizador 5 min)
            alt Cecilia responde
                C-->>ADP: Autoriza o no
            else Sin respuesta
                ADP-->>P: NO_AUTHORIZATION_AVAILABLE — sin 4to nivel automático
                Note over ADP: Decisión posterior queda manual, fuera del sistema (Fiorella/José al día siguiente)
            end
        end
    end
    ADP-->>P: Resultado con nivel alcanzado
```

### 10.2 Salida dispara Reclutamiento

```
sequenceDiagram
    participant ADP as HR-Administration
    participant OUT as Outbox
    participant REC as Recruitment
    ADP->>ADP: Clasificar salida (renuncia/despido)
    ADP->>OUT: Publicar RelacionLaboralTerminada
    OUT->>REC: Entregar evento
    REC->>REC: Registrar nueva necesidad de personal
```

Esta secuencia materializa el ADR-KAI-006.

---

## 11. Modelo lógico de información

### 11.1 Entidades

| Entidad | Propietario | Identidad | Relaciones | Ciclo de vida |
| --- | --- | --- | --- | --- |
| Employee | HR-Administration | UUID | Candidato de origen | Ingresado → periodo de prueba → planilla/terminado |
| Attendance | HR-Administration | UUID | Colaborador | Registro diario, informal |
| Leave | HR-Administration | UUID | Colaborador | Solicitado → autorizado/denegado |
| Vacation | HR-Administration | UUID | Colaborador | Solicitada → programada |
| FieldTrip | HR-Administration | UUID | Colaborador | Solicitada → autorizada (nivel 1/2/3) / sin autorización → cerrada/observada |
| EmploymentTermination | HR-Administration | UUID | Colaborador | Se crea una vez; dispara Recruitment |

### 11.2 Relaciones

```
erDiagram
    CANDIDATE ||--o| EMPLOYEE : becomes
    EMPLOYEE ||--o{ ATTENDANCE : logs
    EMPLOYEE ||--o{ LEAVE : requests
    EMPLOYEE ||--o{ VACATION : schedules
    EMPLOYEE ||--o{ FIELD_TRIP : performs
    EMPLOYEE ||--o| EMPLOYMENT_TERMINATION : ends_with
    EMPLOYMENT_TERMINATION ||--o| VACANCY : triggers
```

### 11.3 Propiedad y consistencia

- HR-Administration es autoridad sobre el ciclo de vida del colaborador ya contratado.
- El único punto de acoplamiento con Recruitment es el evento `RelacionLaboralTerminada` (ADR-KAI-006) — ninguno modifica directamente las tablas propietarias del otro.
- `FieldTrip` **no modela un 4to nivel de autorización** — el estado terminal de un comando de autorización agotado es `NO_AUTHORIZATION_AVAILABLE`, sin un autorizador de respaldo asignado por el sistema (DR-ADP-002, confirmado 31 ago).

### 11.4 Clasificación de sensibilidad

| Clase | Ejemplos | Protección |
| --- | --- | --- |
| Personal | Datos de asistencia, sanciones | Mismo nivel que datos de clientes |
| Interna | Estado de la vacante, nivel de autorización alcanzado | Alcance empresarial |

---

## 12. Diseño lógico de operaciones y errores

| ID | Operación | Tipo | Actor | Entrada conceptual | Salida | Idempotente |
| --- | --- | --- | --- | --- | --- | --- |
| OP-ADP-001 | Registrar asistencia | Comando | Personal | Marca informal | Registro creado | No aplica |
| OP-ADP-002 | Aplicar sanción | Comando | Fiorella | Tipo de falta | Descuento (a fin de mes) | Sí |
| OP-ADP-003 | Autorizar permiso | Comando | Fiorella/José | Solicitud | Autorizado/denegado | Sí |
| OP-ADP-004 | Programar vacaciones | Comando | Fiorella | Fechas | Programadas/reprogramadas | Sí |
| OP-ADP-005 | Autorizar salida a campo | Comando | Fiorella/José/Cecilia | Solicitud, temporizador | Autorizada (con nivel) o sin autorización | Sí |
| OP-ADP-006 | Evaluar regreso de campo | Comando | Sistema | Foto de retorno, hora | Cerrado normal/observado | Sí |
| OP-ADP-007 | Clasificar y disparar salida | Comando | Fiorella | Motivo (renuncia/despido) | Terminado, evento disparado | Sí |

### 12.1 Catálogo de errores lógicos

| Código | Causa | Resultado para el usuario | Recuperación |
| --- | --- | --- | --- |
| `VACATION_OVERLAP` | Dos personas del área piden fechas superpuestas | Rechazo de la segunda solicitud | Se aprueba a quien solicitó primero; la otra se reprograma |
| `NO_AUTHORIZATION_AVAILABLE` | Ningún nivel de la cascada responde (confirmado 31 ago: sin 4to nivel automático) | Salida no autorizada | Escalación manual fuera del sistema, típicamente al día siguiente |
| `EMPLOYMENT_ALREADY_TERMINATED` | Se intenta registrar la salida de alguien ya dado de baja | Rechazo del comando | Consultar el estado actual |

---

## 13. Eventos

| Evento | Productor | Consumidores | Datos mínimos | Garantía |
| --- | --- | --- | --- | --- |
| RelacionLaboralTerminada | HR-Administration | Recruitment, Audit | `employee_id`, motivo (renuncia/despido), fecha | Al menos una vez |

---

## 14–17. Multiempresa, seguridad, integraciones y offline

Administración de Personal hereda el diseño transversal (`SDD-KAIROS-TRANSVERSAL.md`, secciones 14-17). El expediente de personal es transversal a las 4 empresas (Talento Humano). La solicitud de salida a campo puede prepararse offline como borrador, pero **la autorización nunca es offline** (requiere disponibilidad en línea del autorizador, ver tabla 17.1 del documento transversal).

---

## 18. UX Architecture

### 18.1 Flujo de pantallas — Administración de Personal

Panel de asistencia → Solicitud (permiso/vacaciones/salida a campo) → Cascada de autorización si aplica (con indicador visual de "3er nivel sin respuesta — sin autorización automática") → Cierre/registro → (evento) Salida → Nueva vacante en Reclutamiento.

### 18.2 Estado visual específico

- Mensaje explícito cuando los 3 niveles no responden: "Nadie autorizó. Consulta manualmente con Fiorella o José." — refuerzo de UX para DR-ADP-002, evitando que el personal asuma que existe un siguiente nivel automático.

Los principios generales de UX viven en `SDD-KAIROS-TRANSVERSAL.md`, sección 18.

---

## 19. Requisitos no funcionales específicos

| ID | Atributo | Objetivo/criterio | Táctica | Estado |
| --- | --- | --- | --- | --- |
| NFR-BIZ-008 | Autorización sin respuesta | 5 min antes de escalar (por nivel) | Temporizador de escalamiento (cascada BR-ADP-004) | `CONFIRMADA_NEGOCIO` |

---

## 20–23. Observabilidad, continuidad, despliegue y migración

Sin particularidades más allá de la señal transversal "autorizaciones escaladas al 3er nivel" (relacionada con el cumplimiento de la cascada, BR-ADP-004) — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 20.1.

---

## 24. Estrategia de pruebas

### 24.1 Casos obligatorios — Administración de Personal

- Falta injustificada, primera vez (comunicación oral, sin descuento inmediato).
- Autorización de salida a campo escalada hasta Cecilia (3er nivel).
- Ningún nivel de la cascada autoriza (`NO_AUTHORIZATION_AVAILABLE`) — confirma que el sistema **no** asigna un 4to autorizador automático.
- Dos personas del área solicitan vacaciones en fechas superpuestas — se aprueba a quien solicitó primero (`VACATION_OVERLAP`).
- Renuncia sin previo aviso: se paga la quincena, se dispara Reclutamiento.

Los casos obligatorios transversales viven en `SDD-KAIROS-TRANSVERSAL.md`, sección 24.1.

---

## 25. ADR específicos

Este proceso comparte **ADR-KAI-006** (Recruitment y HR-Administration como módulos separados) con `SDD-REC-001` — ver el detalle completo allí. No hay ADR adicionales propios de Administración de Personal; la decisión de no automatizar el 4to nivel de autorización (DR-ADP-002) queda documentada como driver derivado directamente de una regla de negocio (BR-ADP-004), no como una elección arquitectónica entre alternativas técnicas.

---

## 26. Riesgos específicos

| ID | Riesgo | Prob. | Impacto | Mitigación | Propietario |
| --- | --- | --- | --- | --- | --- |
| RSK-ADP-001 | Sin 4to nivel automático, una solicitud de salida a campo puede quedar sin resolver por horas si Fiorella y José no revisan la escalación manual a tiempo | Media | Media | Alerta visible y persistente de "sin autorización" hasta que alguien la resuelva manualmente; no ocultar el estado pendiente | Producto/Operaciones |

Los riesgos transversales también aplican — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 26.

---

## 27. Trazabilidad BDD → SDD → TDD

| Regla BDD | Dato (BDD) | Caso de uso (SDD) | Componente | Operación/evento | Refinamiento TDD |
| --- | --- | --- | --- | --- | --- |
| BR-ADP-001 | DAT-ADP-002/003 | UC-ADP-001 | HR-Administration | OP-ADP-002 | — |
| BR-ADP-003 | — | UC-ADP-002 | HR-Administration | OP-ADP-003 | — |
| BR-ADP-002 | DAT-ADP-004 | UC-ADP-003 | HR-Administration | OP-ADP-004, `VACATION_OVERLAP` | TDD, tabla `vacations` con `EXCLUDE` |
| BR-ADP-004/005 (confirmada 31 ago) | DAT-ADP-005/006 | UC-ADP-004 | HR-Administration | OP-ADP-005/006, `NO_AUTHORIZATION_AVAILABLE` | — |
| BR-REC-008 | DAT-ADP-007 | UC-ADP-005 | HR-Administration/Recruitment | OP-ADP-007, `RelacionLaboralTerminada` | ADR-KAI-006 |

### 27.1 Nota sobre la brecha AS-IS/Plan formal

Igual que en `SDD-REC-001`, esta trazabilidad documenta el proceso tal como se ejecuta hoy. Las preguntas OQ-ADP-101 a 103 (BDD, sección 19.6) ya están todas `RESUELTO` desde el 31 de agosto de 2026.

> 📌 Esta tabla también vive consolidada en `SDD-KAIROS-TRACEABILITY.md`.

---

## 28. Decisiones abiertas relevantes para Administración de Personal

| ID (BDD) | Pregunta | Estado |
| --- | --- | --- |
| OQ-ADP-102 | ¿Existe un cuarto nivel de autorización si Cecilia tampoco responde? | ✅ `RESUELTO` (31 ago) — **se revierte** la resolución parcial del 27 ago; no se automatiza ningún 4to nivel. Ver DR-ADP-002 y BR-ADP-004 |

No hay decisiones `OQ-SOL-*` de arquitectura específicas de Administración de Personal — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 28.

---

## 29. Plan de realización

Administración de Personal corresponde al **Slice 12** del plan transversal: "Administración de Personal básico (asistencia, permisos, salidas a campo)" (`SDD-KAIROS-TRANSVERSAL.md`, sección 29).

---

## 30. Criterios de aprobación

Este documento se aprueba junto con el resto de la serie bajo los 14 criterios de `SDD-KAIROS-TRANSVERSAL.md`, sección 30. Específico de Administración de Personal: el criterio 1 (BDD aprobado) está completo para este proceso — las 3 preguntas de `BDD-ADP-001` sección 19.6 están todas `RESUELTO`.

---

## 31. Checklist de calidad 9–10

| Dimensión | Evidencia | Estado |
| --- | --- | --- |
| Vinculación con BDD | Sección 1.3, `BR-ADP-*` en todo el documento | Cumple |
| Casos de uso | Sección 9 — 5 casos de uso | Cumple |
| Secuencias críticas | Sección 10 — 2 diagramas (autorización sin 4to nivel confirmado) | Cumple |
| Modelo lógico de datos | Sección 11 | Cumple |
| Operaciones y errores | Sección 12 — 7 operaciones, 3 errores | Cumple |
| Eventos | Sección 13 | Cumple |
| UX Architecture | Sección 18 | Cumple |
| NFR específicos | Sección 19 | Cumple |
| Pruebas | Sección 24 — 5 casos obligatorios | Cumple |
| ADR compartidos | Sección 25 — ADR-KAI-006 | Cumple |
| Riesgos específicos | Sección 26 — 1 riesgo nuevo | Cumple |
| Trazabilidad BDD→SDD→TDD | Sección 27 | Cumple BDD→SDD; SDD→TDD parcial (tabla `vacations` ya refinada, resto pendiente) |
| Dependencia del documento transversal | Explícita en secciones 1.3, 5-8, 14-17, 20-23, 29-30 | Cumple |

**Evaluación:** DRAFT COMPLETE para el alcance de Administración de Personal, con la reversión de OQ-ADP-102 del 31 de agosto ya incorporada. No aprobado — depende de los mismos roles técnicos sin asignar que el resto de la serie.

---

## Anexo A — Frontera entre SDD y TDD

Ver `SDD-KAIROS-TRANSVERSAL.md`, Anexo A.
