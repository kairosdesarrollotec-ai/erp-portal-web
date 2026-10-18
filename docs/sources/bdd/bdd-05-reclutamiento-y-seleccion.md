# BDD — 05 Reclutamiento y Selección

# BDD-REC-001 — Proceso: Reclutamiento y Selección

**Estado:** APROBADO — versión base (usuario, 18 oct 2026; cambios posteriores se gestionan como mejoras documentadas)

**Código:** BDD-KAIROS-MVP-002 / REC **Versión:** 1.7 (actualizado 02 sep 2026 — escenario Gherkin nuevo: BR-REC-006, marcado @R2) **Depende de:** `BDD-KAIROS-TRANSVERSAL.md` (glosario, actores, catálogo de Cliente, reglas transversales, NFR, privacidad, criterios de aceptación)

> Parte de la serie BDD-KAIROS-MVP-002, dividida por gobernanza el 27 ago 2026. La fuente canónica sigue siendo el conjunto de estos documentos — ninguno se lee de forma aislada sin `BDD-KAIROS-TRANSVERSAL.md`.

### 7.5 Reclutamiento y Selección

> Se documenta el flujo AS-IS real (lo que Fiorella ejecuta hoy) — la versión formal del Plan de Gestión de Talento Humano vive en la Ficha AS-IS, sección 3.9, y es la meta (TO-BE) hacia la que se avanza (BR-REC-006).

| Paso | Actor principal | Acción | Información gestionada | Regla/decisión | Resultado |
| --- | --- | --- | --- | --- | --- |
| REC-P01 | Fiorella/José | Detectar necesidad de personal | DAT-REC-001 | 3 fuentes: renuncia/salida, crecimiento, nueva área (BR-REC-008) | Necesidad registrada |
| REC-P02 | Fiorella | Definir funciones y perfil | DAT-REC-002 | Informal | Perfil definido |
| REC-P03 | Marketing/Fiorella | Publicar la vacante | Canales: WhatsApp, redes, portal UNCH, Bumeran/Computrabajo | Mecánico: búsqueda activa en institutos técnicos (BR-REC-004) | Vacante publicada |
| REC-P04 | Candidato | Contactar directamente a Fiorella | — | Sin filtro intermedio | Candidato en contacto |
| REC-P05 | Fiorella | Consultar pretensión salarial, disponibilidad, CV | DAT-REC-003, DAT-REC-004 | — | Datos del candidato recibidos |
| REC-P06 | Fiorella | Negociar condiciones | Base salarial por puesto | — | Condiciones acordadas |
| REC-P07 | Candidato | Decidir sobre las condiciones | — | ¿De acuerdo? | Continúa o no |
| REC-P08 | Fiorella | Entrevistar (15 min, Meet) | DAT-REC-005 | Preguntas situacionales, sin ficha de puntaje formal | Entrevista realizada |
| REC-P09 | Fiorella | Reanalizar entrevista y CV | — | No se da respuesta inmediata | Decisión en curso |
| REC-P10 | Fiorella | Decidir contratación | — | Exclusivo de Fiorella (BR-REC-003) | Contratado o no |
| REC-P11 | Personal nuevo | Ingresar al día siguiente | DAT-REC-006 | Inducción general + específica | Personal incorporado |
| REC-P12 | Administrador | Entregar dispositivos | Documento de responsabilidad firmado | Uniforme, celular, locker | Dispositivos entregados |
| REC-P13 | Personal nuevo | Firmar documento de expectativas | A los 2 días | — | Documento firmado |
| REC-P14 | Fiorella | Evaluar a los 3 meses | DAT-REC-008 | Pago por recibo de honorarios durante la prueba (BR-REC-005) | Resultado de evaluación |
| REC-P15 | Fiorella | Decidir paso a planilla | — | ¿Positiva? Sí: planilla mes 4. No: termina relación | Planilla o salida |

#### 7.5.1 Variante: personal mecánico

Contrato interno notariado, por la alta responsabilidad del puesto (BR-REC-009) — no cambia la estructura del flujo, solo agrega este requisito en REC-P11.

### 8.5 Reclutamiento y Selección

| ID | Información | Obligatoria | Condición | Validación funcional | Finalidad | Sensibilidad |
| --- | --- | --- | --- | --- | --- | --- |
| DAT-REC-001 | Fuente de la necesidad | Sí | Siempre | Enum (renuncia/crecimiento/nueva área) | Origen del proceso (BR-REC-008) | Interna |
| DAT-REC-002 | Perfil del puesto | Sí | Siempre | Texto libre — informal hoy | Base de la publicación | Interna |
| DAT-REC-003 | Pretensión salarial | Sí | Siempre | Numérico | Negociación | Sensible |
| DAT-REC-004 | CV del candidato | Sí | Siempre | Archivo | Evaluación | Sensible |
| DAT-REC-005 | Resultado de entrevista | Sí | Siempre | Texto libre — sin ficha de puntaje formal hoy | Sustento de la decisión | Sensible |
| DAT-REC-006 | Fecha de ingreso | Sí | Si se contrata | Fecha | Trazabilidad del expediente | Interna |
| DAT-REC-007 | Modalidad de pago | Sí | Siempre | `HONORARIOS`/`PLANILLA` | Cálculo de beneficios | Financiera |
| DAT-REC-008 | Resultado de evaluación a 3 meses | Sí | Al cumplir el plazo | Cualitativo | Decisión de paso a planilla (BR-REC-005) | Sensible |

### 9.8 Reclutamiento y Selección

| ID | Regla | Prioridad | Fuente | Estado |
| --- | --- | --- | --- | --- |
| BR-REC-001 | Reclutamiento y Administración de Personal son procesos separados | Alta | SRC-DL-001 (11 ago) | `CONFIRMADO` |
| BR-REC-002 | Los procesos corporativos de Talento Humano aplican a las cuatro empresas del grupo | Alta | SRC-REC-001 | `CONFIRMADO` |
| BR-REC-003 | Toda la selección recae hoy en una sola persona (Fiorella); José Pariona asume en su ausencia | Alta | SRC-REC-001, sección 2 | `CONFIRMADO` — `RESUELTO` OQ-REC-103, OQ-REC-104 |
| BR-REC-004 | Personal mecánico se recluta de forma distinta: bases de datos de egresados de institutos técnicos | Media | SRC-REC-001, Fase 1 | `CONFIRMADO` |
| BR-REC-005 | Periodo de prueba: pago por recibo de honorarios; evaluación a los 3 meses; ingreso a planilla al 4to mes si es positiva | Alta | SRC-REC-001, Fase 5 | `CONFIRMADO` |
| BR-REC-006 | El Plan de Gestión de Talento Humano es la meta (TO-BE), aplicada hoy de forma parcial. Fecha objetivo: Q1 2027 | Alta | SRC-DL-001 (24, 27 ago) | `CONFIRMADO` — `RESUELTO` OQ-REC-101 y OQ-REC-102 |
| BR-REC-007 | "Gerencia y Subgerencia" en el Plan formal son Fiorella y José actuando en su capacidad formal | Media | SRC-DL-001 (24 ago) | `CONFIRMADO` |
| BR-REC-008 | 3 fuentes disparan la necesidad de personal: renuncia/salida, crecimiento, nueva área | Media | SRC-DL-001 (12 ago) | `CONFIRMADO` |
| BR-REC-009 | El personal mecánico firma un contrato interno notariado, por la alta responsabilidad de su trabajo | Alta | SRC-REC-001, Fase especial | `CONFIRMADO` |

### 10.7 Selección de personal (AS-IS real)

| Candidato de acuerdo con las condiciones | Fiorella decide contratar | Resultado |
| --- | --- | --- |
| No | — | No continúa el proceso |
| Sí | No | No continúa el proceso |
| Sí | Sí | Ingresa al día siguiente |

### 11.6 Reclutamiento y Selección

| Estado | Significado | Entrada permitida | Salidas permitidas |
| --- | --- | --- | --- |
| Necesidad registrada | Vacante identificada | Creación | Publicado |
| Publicado | Convocatoria activa | Necesidad registrada | En negociación |
| En negociación | Candidato en contacto | Publicado | Entrevistado, Descartado |
| Entrevistado | Entrevista realizada, en análisis | En negociación | Decidido |
| Decidido | Fiorella tomó la decisión | Entrevistado | Ingresado, Descartado |
| Ingresado | Personal incorporado | Decidido | Periodo de prueba |
| Periodo de prueba | Evaluación en curso (pago por honorarios) | Ingresado | Planilla, Terminado |
| Planilla | Beneficios completos activos | Periodo de prueba | Terminado (futuro) |

### 12.5 Reclutamiento y Selección

| Código | Situación | Tratamiento | Autorización | Evidencia |
| --- | --- | --- | --- | --- |
| EX-REC-001 | Candidato rechaza la oferta tras la entrevista | Se contacta al siguiente candidato disponible | Fiorella | — |
| EX-REC-002 | Ningún candidato es idóneo | La vacante permanece abierta sin límite de tiempo fijo | Fiorella | — |
| EX-REC-003 | Vacante de personal mecánico | Búsqueda activa en institutos técnicos; contrato interno notariado | Fiorella | Contrato notariado |

### 16.8 Reclutamiento y Selección (BR-REC-004, BR-REC-005)

```
@SC-REC-001
Feature: Periodo de prueba del personal

  @SC-REC-001.01
  Scenario: Evaluación positiva a los 3 meses
    Given un colaborador en periodo de prueba, pagado por recibo de honorarios
    When la evaluación a los 3 meses es positiva
    Then el colaborador ingresa a planilla en el 4to mes

  @SC-REC-001.02
  Scenario: Reclutamiento de personal mecánico
    Given una vacante para personal mecánico
    When se busca al candidato
    Then se usa la base de datos de egresados de institutos técnicos
    And no se publica en portales de empleo generales
```

### 16.8.1 Decisión de contratación sin ficha formal de puntaje (BR-REC-003) — migrado desde `BDD-KAIROS-TRANSVERSAL.md` el 01 sep 2026

```
@SC-REC-002
Feature: Decisión de contratación sin ficha formal de puntaje

  @SC-REC-002.01
  Scenario: Fiorella decide contratar tras la entrevista
    Given un candidato entrevistado
    When Fiorella reanaliza la entrevista y el CV
    And decide contratar
    Then se registra la decisión con su justificación
    And el candidato ingresa al día siguiente
```

### 16.8.2 Fuentes que disparan una necesidad de personal (BR-REC-008) — nuevo, 01 sep 2026

```
@SC-REC-003
Feature: Fuentes que disparan una necesidad de personal

  @SC-REC-003.01
  Scenario: Necesidad por renuncia o salida
    Given que un colaborador termina su relación laboral
    When se dispara el evento de salida (RelacionLaboralTerminada)
    Then se registra una nueva necesidad de personal con origen "renuncia/salida"

  @SC-REC-003.02
  Scenario: Necesidad por crecimiento o nueva área
    Given que Fiorella o José identifican el crecimiento de un área existente o la creación de una nueva
    When se registra la necesidad
    Then queda identificada con el origen correspondiente (crecimiento o nueva área)
```

> 📌 La trazabilidad de este proceso vive en `BDD-KAIROS-TRACEABILITY.md`, sección 18.5.

### 16.8.3 Aplicación íntegra del Plan de Talento Humano (BR-REC-006) — nuevo, 02 sep 2026, fuera del MVP

```
@SC-REC-004
Feature: Aplicación íntegra del Plan de Talento Humano

  @R2
  @SC-REC-004.01
  Scenario: Selección sigue el Plan formal completo (meta Q1 2027)
    Given que el Plan de Gestión de Talento Humano está aplicado íntegramente
    When se ejecuta un proceso de selección
    Then se sigue el Análisis de Puesto documentado y la ficha de evaluación con puntaje
    And la decisión queda respaldada por ese puntaje, no solo por el criterio de Fiorella
```

### 19.5 Reclutamiento y Selección

| ID | Pregunta | Opciones | Propietario | Impacto | Estado |
| --- | --- | --- | --- | --- | --- |
| OQ-REC-101 | ¿Cuándo se espera completar el Plan de Talento Humano formal? | — | Fiorella | Planificación de Release 2 | `RESUELTO` 27 ago — Primer trimestre de 2027 |
| OQ-REC-102 | ¿Quién asumirá el rol formal de "Talento Humano"? | — | Fiorella | Riesgo de cuello de botella (PR-RRHH-01) | `RESUELTO` 27 ago — Persona nueva, especializada, para las 4 empresas del grupo |
| OQ-REC-103 | ¿Existe alguna ficha de evaluación con puntaje? | — | Fiorella | Diseño del formulario de selección | `RESUELTO` 27 ago — No existe ficha con puntaje, evaluación cualitativa por área |
| OQ-REC-104 | ¿Qué pasa si dos candidatos compiten por la misma vacante? | — | Fiorella | Diseño del flujo de selección múltiple | `RESUELTO` 27 ago — Sí hay comparación formal, con casos prácticos |

### 21.5 Reclutamiento y Selección

| Caso | Candidato de acuerdo | Decisión de Fiorella | Resultado |
| --- | --- | --- | --- |
| DT-REC-01 | Sí | Contratar | Ingresa al día siguiente |
| DT-REC-02 | No | — | No continúa |
| DT-REC-03 | Sí | No contratar | No continúa |
| DT-REC-04 | Sí (mecánico) | Contratar | Contrato interno notariado |
