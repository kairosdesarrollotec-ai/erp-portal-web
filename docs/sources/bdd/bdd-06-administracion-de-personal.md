# BDD — 06 Administración de Personal

# BDD-ADP-001 — Proceso: Administración de Personal

**Código:** BDD-KAIROS-MVP-002 / ADP **Versión:** 1.9 (actualizado 02 sep 2026 — 2 escenarios Gherkin nuevos: BR-ADP-007/008) **Depende de:** `BDD-KAIROS-TRANSVERSAL.md` (glosario, actores, catálogo de Cliente, reglas transversales, NFR, privacidad, criterios de aceptación)

> ⚠️ **Corrección importante (02 sep 2026):** BR-ADP-002 se documentaba como "las 2 personas clave de un área nunca pueden superponer vacaciones" — Fiorella aclaró que **no es así**: es una regla de capacidad de área (máximo 1 persona de vacaciones a la vez, sin importar cuántos colaboradores tenga el área), resuelta por orden de solicitud, verificada contra el calendario del área. Se corrige en toda la sección 16.9 y en el resto del documento.

> Parte de la serie BDD-KAIROS-MVP-002, dividida por gobernanza el 27 ago 2026. La fuente canónica sigue siendo el conjunto de estos documentos — ninguno se lee de forma aislada sin `BDD-KAIROS-TRANSVERSAL.md`.

### 7.6 Administración de Personal

> No es un flujo lineal — son 7 sub-flujos independientes, cada uno con su propio disparador.

| Paso | Sub-flujo | Actor principal | Acción | Regla/decisión | Resultado |
| --- | --- | --- | --- | --- | --- |
| ADP-P01 | Asistencia | Personal | Marcar asistencia (informal) | DAT-ADP-001 | Registro informal |
| ADP-P02 | Asistencia | Fiorella | Filtrar Excel (quincena/fin de mes) | — | Tardanzas/faltas identificadas |
| ADP-P03 | Asistencia | Fiorella | Comunicar (oral 1a vez, memo si reiterada) | — | Advertencia registrada |
| ADP-P04 | Asistencia | Fiorella | Clasificar falta | DAT-ADP-002 | ¿Justificada? Determina si hay descuento |
| ADP-P05 | Permisos | Personal | Solicitar permiso con anticipación | — | Solicitud registrada |
| ADP-P06 | Permisos | Fiorella/José | Autorizar o denegar | Exclusivo de ambos (BR-ADP-003) | Permiso resuelto |
| ADP-P07 | Remuneración | Sistema | Pagar quincena íntegra | BR-ADP-001 | Pago sin descuento |
| ADP-P08 | Remuneración | Fiorella | Aplicar descuentos a fin de mes | DAT-ADP-003 | Descuento aplicado (hoy sin rigor) |
| ADP-P09 | Vacaciones | Personal | Solicitar vacaciones | DAT-ADP-004 | Solicitud registrada |
| ADP-P10 | Vacaciones | Fiorella | Verificar disponibilidad en el calendario del área | BR-ADP-002 (corregida 02 sep) | Programadas, o en espera de que se libere el cupo del área |
| ADP-P11 | Planilla | Contadora | Gestionar SUNAT/ESSALUD | Al 4to mes | Personal en planilla |
| ADP-P12 | Salidas a campo | Personal | Solicitar salida | DAT-ADP-005 | Solicitud registrada |
| ADP-P13 | Salidas a campo | Fiorella/José/Cecilia | Autorizar en cascada | BR-ADP-004, 5 min por nivel | DAT-ADP-006 (nivel alcanzado) |
| ADP-P14 | Salidas a campo | Sistema | Evaluar regreso a tiempo | BR-ADP-005 | Advertencia u "observado" |
| ADP-P15 | Salida | Fiorella | Detectar señal de salida | Conversación continua cada 1-2 días | — |
| ADP-P16 | Salida | Fiorella | Clasificar tipo de salida | ¿Renuncia o despido? | DAT-ADP-007 |
| ADP-P17 | Salida | Sistema | Disparar Reclutamiento | BR-REC-008 | Necesidad de personal creada |

#### 7.6.1 Evaluación de Desempeño (TO-BE, no ejecutado) y Capacitación (parcial, real)

- **ADP-P18 (TO-BE):** Planificación → preparación → aplicación → retroalimentación → plan de mejora. Confirmado por Fiorella (24 ago): nunca se ha aplicado en la práctica (BR-ADP-007).
- **ADP-P19 (parcial real):** Detección informal → taller interno de \~1h → evaluación de comprensión — esto sí ocurre desde el año pasado (BR-ADP-008).

---

### 8.6 Administración de Personal

| ID | Información | Obligatoria | Condición | Validación funcional | Finalidad | Sensibilidad |
| --- | --- | --- | --- | --- | --- | --- |
| DAT-ADP-001 | Registro de asistencia | Sí | Diario | Informal — sin sistema hoy (PR-AP-01) | Base para descuentos | Personal |
| DAT-ADP-002 | Tipo de falta | Sí | Si hay falta | `JUSTIFICADA`/`INJUSTIFICADA` | Determina si hay descuento | Personal |
| DAT-ADP-003 | Monto de descuento | Condicional | Con sanción | Tabla de sanciones (poco aplicada) | Cálculo de remuneración | Financiera |
| DAT-ADP-004 | Fechas de vacaciones | Sí | Por persona/área | Máximo 1 persona del área de vacaciones a la vez, verificado contra el calendario del área (BR-ADP-002, corregida 02 sep) | Programación | Personal |
| DAT-ADP-005 | Solicitud de salida a campo | Sí | Al solicitar | Área, tema, hora salida/retorno | Control de campo | Interna |
| DAT-ADP-006 | Nivel de autorización alcanzado | Sí | Al autorizar | 1/2/3, más "sin autorización" si los 3 niveles no responden (BR-ADP-004) | Trazabilidad de la decisión | Interna |
| DAT-ADP-007 | Motivo de salida (renuncia/despido) | Sí | Al terminar la relación | Enum | Dispara Reclutamiento (BR-REC-008) | Sensible |
| DAT-ADP-008 | Resultado de evaluación de desempeño | — | TO-BE, nunca aplicado | — | Fuera del MVP (BR-ADP-007) | Sensible |
| DAT-ADP-009 | Registro de capacitación interna | Sí | Al ejecutar un taller | Tema, asistentes, evaluación de comprensión | Historial de capacitación (BR-ADP-008) | Interna |

---

### 9.9 Administración de Personal

| ID | Regla | Prioridad | Fuente | Estado |
| --- | --- | --- | --- | --- |
| BR-ADP-001 | La quincena se paga íntegra, sin descuentos; los descuentos por tardanzas/faltas se aplican a fin de mes | Alta | SRC-ADP-001, sección 3.4 | `CONFIRMADO` — reconocido que hoy no se aplica con rigor |
| BR-ADP-002 | **Corregida 02 sep 2026 (Fiorella):** no se trata de 2 personas designadas como "clave" — es una regla de capacidad del área. Máximo 1 persona del área puede estar de vacaciones en un momento dado, sin importar cuántos colaboradores tenga esa área. Si 2 o más solicitan fechas que se superponen, **tiene prioridad quien lo solicitó primero**; el sistema verifica contra el calendario del área antes de aprobar cualquier solicitud nueva | Alta | SRC-DL-001 (02 sep) — corrige el entendimiento anterior de SRC-ADP-001, sección 3.5 | `CONFIRMADO` — corregida |
| BR-ADP-003 | Solo Fiorella y José Pariona autorizan permisos o salidas antes de hora | Alta | SRC-ADP-001, sección 3.3 | `CONFIRMADO` |
| BR-ADP-004 | Orden de autorización de salidas a campo: 1° Fiorella, 2° José Pariona, 3° Cecilia. **Revertido 31 ago:** el 4to nivel automático **no se implementa** — el sistema notifica que nadie autorizó y la persona no sale; el resto queda manual | Alta | SRC-ADP-001, sección 3.7; SRC-DL-001 (27, 31 ago) | `CONFIRMADO` — `RESUELTO` OQ-ADP-102 (31 ago) |
| BR-ADP-005 | Si la persona no regresa a tiempo de una salida a campo: las primeras 3 veces son advertencia, la 4ta la deja "observada" | Media | SRC-ADP-001, sección 3.7 | `CONFIRMADO` |
| BR-ADP-006 | Renuncia: se paga la quincena pendiente, sin previo aviso en la mayoría de los casos. Despido: llamadas de atención, luego 15 días de aviso si es reincidente. Máximo 3 sanciones → suspensión 1-2 días → cese | Alta | SRC-ADP-001, sección 3.8; SRC-DL-001 (27 ago) | `CONFIRMADO` — `RESUELTO` OQ-ADP-103 |
| BR-ADP-007 | Evaluación de Desempeño formal nunca se ha aplicado en la práctica. A partir del 4to mes, periodicidad semestral | Media | SRC-DL-001 (24, 27 ago) | `CONFIRMADO` — TO-BE, fuera del MVP; `RESUELTO` OQ-ADP-101 |
| BR-ADP-008 | Capacitación existe de forma parcial e informal: talleres internos de \~1h, desde el año pasado | Media | SRC-DL-001 (24 ago) | `CONFIRMADO` |

---

### 10.8 Autorización de salida a campo

| Fiorella responde en 5 min | José responde en 5 min | Cecilia autoriza | Resultado |
| --- | --- | --- | --- |
| Sí | — | — | Autorizado por Fiorella |
| No | Sí | — | Autorizado por José |
| No | No | Sí | Autorizado por Cecilia |
| No | No | No | Sin autorización — el sistema notifica y la persona no sale; escalación adicional queda manual, fuera del sistema |

### 10.9 Consecuencia de tardanza al regresar de campo

| N° de veces sin regresar a tiempo | Resultado |
| --- | --- |
| 1ª a 3ª vez | Advertencia |
| 4ª vez en adelante | Persona queda "observada" |

### 11.7 Administración de Personal — por sub-flujo

| Sub-flujo | Estados |
| --- | --- |
| Asistencia | Normal → Con falta → Justificada/Injustificada |
| Permisos | Solicitado → Autorizado/Denegado |
| Vacaciones | Solicitado → Programado/Reprogramado |
| Salidas a campo | Solicitado → Autorizado (nivel 1/2/3) → Cerrado normal / Observado / Sin autorización |
| Relación laboral | Activa → En salida → Terminada (dispara Reclutamiento) |

---

### 12.6 Administración de Personal

| Código | Situación | Tratamiento | Autorización | Evidencia |
| --- | --- | --- | --- | --- |
| EX-ADP-001 | Ninguno de los 3 niveles de autorización responde | La persona no sale; el sistema solo notifica "nadie autorizó" | Fiorella o José (manual) | Notificación del sistema |
| EX-ADP-002 | 2 o más personas de la misma área solicitan vacaciones en fechas que se superponen | Se aprueba a quien solicitó primero; el resto se reprograma o espera a que se libere el cupo del área (BR-ADP-002, corregida) | Fiorella | Registro de la solicitud con marca de tiempo, y de la reprogramación |
| EX-ADP-003 | Personal renuncia sin previo aviso | Se paga la quincena pendiente, termina el vínculo de inmediato | Fiorella | Registro de salida |

### 16.9 Administración de Personal (BR-ADP-002, BR-ADP-005)

> ⚠️ **Corregido 02 sep 2026:** el escenario de abajo describía "las 2 personas clave" como si fueran roles fijos designados. La regla real, confirmada por Fiorella, es de capacidad de área (máximo 1 persona de vacaciones a la vez), no de personas designadas.

```
@SC-ADP-001
Feature: Capacidad de vacaciones por área (máximo 1 persona a la vez)

  @SC-ADP-001.01
  Scenario: Dos personas del área solicitan fechas superpuestas
    Given un área con 4 colaboradores y ya 1 con vacaciones programadas en un rango de fechas
    When otro colaborador del mismo área solicita vacaciones que se superponen con ese rango
    Then el sistema verifica el calendario del área
    And rechaza o reprograma la nueva solicitud, priorizando a quien la pidió primero

  @SC-ADP-001.02
  Scenario: Solicitud sin superposición
    Given un área sin nadie de vacaciones en el rango solicitado
    When un colaborador de esa área solicita vacaciones
    Then la solicitud se aprueba sin necesidad de reprogramar a nadie
```

```
@SC-ADP-002
Feature: Regreso tardío de salida a campo

  @SC-ADP-002.01
  Scenario: Primeras 3 veces sin regresar a tiempo
    Given un colaborador con menos de 3 salidas a campo con regreso tardío
    When no regresa a tiempo de una salida a campo
    Then recibe una advertencia

  @SC-ADP-002.02
  Scenario: Cuarta vez sin regresar a tiempo
    Given un colaborador con exactamente 3 salidas a campo previas con regreso tardío
    When no regresa a tiempo por cuarta vez
    Then queda marcado como "observado"
```

```
@SC-ADP-003
Feature: Ningún nivel de autorización responde en salida a campo

  @SC-ADP-003.01
  Scenario: Los 3 niveles no responden
    Given una solicitud de salida a campo sin respuesta de Fiorella, José ni Cecilia dentro de sus ventanas de 5 minutos
    When se agotan los 3 niveles
    Then el sistema notifica que nadie autorizó
    And la persona no sale
    And no se asigna automáticamente un 4to autorizador — la decisión queda manual, fuera del sistema
```

### 16.9.1 Pago de quincena íntegra y descuento a fin de mes (BR-ADP-001) — nuevo, 01 sep 2026

```
@SC-ADP-004
Feature: Pago de quincena íntegra y descuento a fin de mes

  @SC-ADP-004.01
  Scenario: Quincena se paga sin descuentos
    Given un colaborador con tardanzas o faltas registradas durante la quincena
    When se procesa el pago de la quincena
    Then se paga el monto íntegro, sin ningún descuento

  @SC-ADP-004.02
  Scenario: Descuento aplicado a fin de mes
    Given tardanzas o faltas injustificadas acumuladas durante el mes
    When se cierra el mes
    Then el descuento correspondiente se aplica en ese momento, no antes
```

### 16.9.2 Clasificación de salida — renuncia o despido (BR-ADP-006) — nuevo, 01 sep 2026

```
@SC-ADP-005
Feature: Clasificación de salida — renuncia o despido

  @SC-ADP-005.01
  Scenario: Renuncia sin previo aviso
    Given un colaborador que comunica su renuncia
    When no da previo aviso
    Then se le paga la quincena pendiente
    And la relación laboral termina de inmediato
    And se dispara la necesidad de personal hacia Reclutamiento (BR-REC-008)

  @SC-ADP-005.02
  Scenario: Despido por reincidencia
    Given un colaborador con llamadas de atención previas
    When reincide y se decide el despido
    Then se le da un aviso de 15 días
    And se documenta el motivo como despido
```

> 📌 La trazabilidad de este proceso vive en `BDD-KAIROS-TRACEABILITY.md`, sección 18.6.

### 16.9.3 Evaluación de Desempeño formal (BR-ADP-007) — nuevo, 02 sep 2026, fuera del MVP

```
@SC-ADP-006
Feature: Evaluación de Desempeño formal

  @R2
  @SC-ADP-006.01
  Scenario: Evaluación semestral a partir del 4to mes
    Given un colaborador que ya pasó a planilla (4to mes)
    When se cumple el ciclo semestral de evaluación
    Then se aplica la Evaluación de Desempeño formal
    And el resultado queda registrado en el expediente del colaborador
```

### 16.9.4 Capacitación interna informal (BR-ADP-008) — nuevo, 02 sep 2026

```
@SC-ADP-007
Feature: Capacitación interna informal

  @SC-ADP-007.01
  Scenario: Taller interno ante una necesidad detectada
    Given que Fiorella detecta una necesidad de capacitación en el equipo
    When se organiza un taller interno de ~1 hora
    Then se registra el tema, los asistentes y la evaluación de comprensión
    And ese registro queda como historial de capacitación del colaborador
```

### 19.6 Administración de Personal

| ID | Pregunta | Opciones | Propietario | Impacto | Estado |
| --- | --- | --- | --- | --- | --- |
| OQ-ADP-101 | ¿Cuál es el plazo real para completar el Plan de Evaluación de Desempeño? | — | Fiorella | Planificación de Release 2 | `RESUELTO` 27 ago — A partir del 4to mes, semestral |
| OQ-ADP-102 | ¿Existe un cuarto nivel de autorización si Cecilia tampoco responde? | — | Fiorella | Continuidad operativa | `RESUELTO` (31 ago) — Se revierte la resolución parcial del 27 ago. No se automatiza |
| OQ-ADP-103 | ¿El descuento por sanciones se mantiene igual o se endurece? | — | Fiorella | Diseño de la regla de remuneración | `RESUELTO` 27 ago — Se endurece de forma acotada (máx. 3 sanciones → suspensión → cese) |

### 21.6 Administración de Personal

| Caso | Sub-flujo | Condición | Resultado |
| --- | --- | --- | --- |
| DT-ADP-01 | Asistencia | Falta injustificada, primera vez | Comunicación oral, descuento a fin de mes |
| DT-ADP-02 | Salidas a campo | Fiorella no responde, José autoriza | Autorizado en nivel 2 |
| DT-ADP-03 | Salida | Renuncia sin previo aviso | Paga quincena, dispara Reclutamiento |
| DT-ADP-04 | Vacaciones | Dos personas del área piden fechas superpuestas | Se aprueba a quien solicitó primero, se reprograma la otra |
| DT-ADP-05 | Salidas a campo | Ningún nivel (1-3) responde | Sin autorización, escalación manual fuera del sistema |

Los datos reales de identidad y pago deben anonimizarse en ambientes no productivos.

---
