# BDD — 00 Transversal

# BDD-KAIROS-TRANSVERSAL — Fundación transversal a los 6 procesos

**Código:** BDD-KAIROS-MVP-002 / TRANSVERSAL **Versión:** 1.18 (sincronizado 04 sep 2026, verificación final) **Estado:** Candidato para revisión funcional — ver `BDD-KAIROS-EXECUTIVE-SUMMARY.md` para el estado global

> Parte de la serie BDD-KAIROS-MVP-002, dividida por gobernanza el 27 ago 2026. La fuente canónica sigue siendo el conjunto de estos documentos — ninguno se lee de forma aislada sin este archivo.

---

## 0. Manifiesto de versión del baseline (nuevo, 01 sep 2026)

> Agregado a pedido de la auditoría independiente del 01 sep 2026 (hallazgo bloqueante #4): "Debe existir un manifiesto que identifique exactamente qué versión de cada archivo compone el baseline." Este documento — y no `BDD-KAIROS-Consolidado-Detallado.md` — es ahora la referencia de versión coordinada.

| Documento | Versión vigente | Última actualización | Cambió el 02/03 sep |
| --- | --- | --- | --- |
| `BDD-KAIROS-TRANSVERSAL.md` (este) | **1.18** | 04 sep 2026 | Sí — corrige el propio manifiesto: la fila de Executive Summary seguía en 1.13, atrasada 5 versiones |
| `BDD-CON-001` (Consulta) | 1.8 | 02 sep 2026 | Sí — escenario Gherkin nuevo (BR-CON-005) |
| `BDD-RES-001` (Reserva) | **1.9** | 03 sep 2026 | Sí — BR-RES-002/009 confirmadas y ampliadas, `EX-RES-005` nueva, 3 escenarios Gherkin nuevos |
| `BDD-ALQ-001` (Alquiler) | 1.7 | 02 sep 2026 | Sí — duración de evidencia en video corregida a \~7-8 min |
| `BDD-DEV-001` (Devolución) | 1.9 | 02 sep 2026 | Sí — 3 escenarios Gherkin nuevos (BR-DEV-004/005/009) |
| `BDD-REC-001` (Reclutamiento y Selección) | 1.7 | 02 sep 2026 | Sí — escenario Gherkin nuevo (BR-REC-006, @R2) |
| `BDD-ADP-001` (Administración de Personal) | 1.9 | 02 sep 2026 | Sí — 2 escenarios Gherkin nuevos (BR-ADP-007/008) |
| `BDD-KAIROS-TRACEABILITY.md` | **1.11** | 03 sep 2026 | Sí — 76→79 escenarios, corrige 2 filas de Reserva desactualizadas |
| `BDD-KAIROS-EXECUTIVE-SUMMARY.md` | **1.18** | 04 sep 2026 | Sí — logs técnicos 90 días, no requiere firma formal |

> ⚠️ Nota de versionado: este manifiesto se generaba antes por transcripción manual y quedó desalineado con los encabezados reales de cada archivo (hallazgo P0 #2 de la auditoría del 01 sep, y de nuevo el 03 sep — ver historial de versiones, entrada 1.12). **A partir de esta versión, la tabla se verificó línea por línea con **`grep`** contra el encabezado real de cada uno de los 9 archivos**, no por transcripción manual — el mismo error de desincronización se había repetido 2 veces. El **baseline coordinado de la serie completa es la combinación exacta de esta tabla**.

---

## 1. Control del documento

### 1.1 Historial de versiones

| Versión | Fecha | Cambio | Autor | Aprobador |
| --- | --- | --- | --- | --- |
| 0.1 – 1.5 | 25-27 ago 2026 | Ver historial completo en versiones anteriores de este documento (construcción inicial, 2 auditorías independientes, reunión con Fiorella del 27 ago) | Russbel (BA) con apoyo de Claude | Pendiente |
| 1.6 | 01-09-2026 | Sincronización completa tras la auditoría independiente del 01 sep 2026 (calificación 8.1/10, hallazgos bloqueantes #1-4). Nuevo manifiesto de versión (sección 0); sección 10.10 actualizada a `CONFIRMADO — no existe rehabilitación`; sección 16 — retirados 8 escenarios que en realidad eran específicos de proceso, corregida la colisión de ID `@SC-ADP-003`; sección 19 corregida (solo OQ-DEV-101 sigue `PENDIENTE`); checklist actualizado con el conteo real verificado: 70 reglas, 12 críticas, 51 escenarios | Russbel (BA), a partir de auditoría independiente | Pendiente |
| **1.7** | **01-09-2026** | **Cierre de la deuda de migración y de escenarios Gherkin identificada en la versión 1.6.** (1) Los 7 escenarios pendientes de migrar (SC-ALQ-004, SC-ALQ-005, SC-DEV-004, SC-CON-002, SC-RES-005, SC-RES-006, SC-REC-002) ya se movieron a sus `BDD-XXX-001` de proceso — la sección 16 de este documento queda limpia, sin contenido específico de proceso; (2) se crearon 8 escenarios Gherkin nuevos para cerrar las 7 reglas que no tenían cobertura (BR-CON-002, BR-ALQ-016, BR-DEV-006, BR-DEV-007, BR-DEV-011, BR-REC-008, BR-ADP-001, BR-ADP-006); (3) conteo final verificado: **65 escenarios totales** (antes 51) — 70 reglas y 12 críticas sin cambio; (4) manifiesto de versión (sección 0) actualizado: `BDD-ALQ-001` sube a 1.6 y `BDD-REC-001` a 1.6 (antes 1.5), ya que ambos recibieron escenarios nuevos | Russbel (BA), a pedido del usuario | Pendiente |
| **1.8** | **01-09-2026** | **Corrige 8 hallazgos de una segunda auditoría independiente (calificación 8.7/10):** (1) restaura el contenido normativo real de las secciones 5-15 (actores, catálogo `DAT-CLI-*`, las 12 reglas `BR-ORG-*`/`BR-INS-*`/`BR-DOC-*`, excepciones, notificaciones, evidencias, privacidad), que la v1.7 había dejado como referencia vacía a "la versión previa" — reconstruido de buena fe a partir de referencias cruzadas verificadas en el resto del ecosistema, no restaurado byte a byte (sin acceso al historial de versiones de Confluence); (2) corrige el manifiesto de versión (sección 0) para que coincida con el encabezado real de cada archivo — Transversal, Consulta, Reserva y Devolución estaban en 1.7 pero el manifiesto todavía decía 1.6; (3) corrige el conteo de escenarios de 65 a **66** (faltaba contar `@SC-RES-005.02`, el escenario de no-show); (4) elimina la afirmación residual de "51 escenarios" que había quedado en la evaluación final del checklist; (5) corrige la afirmación absoluta "ninguna regla alta sin escenario" — 3 reglas altas (BR-DEV-005, BR-DEV-009, BR-REC-006) siguen con cobertura solo indirecta o excluida del MVP, no directa; (6) reemplaza "sin celdas huérfanas" por una descripción exacta en `BDD-KAIROS-TRACEABILITY.md`; (7) separa explícitamente 3 categorías de pendientes en la sección 19 — pregunta funcional abierta (OQ-DEV-101), aprobación formal pendiente (OQ-CON-101), y bloqueo legal (aceptación remota/privacidad/evidencia/retención) — antes se presentaban casi como si solo hubiera una; (8) aclara en "Estado final" que la corrección del 01 sep en `TDD-RES-001` resuelve la implementación de este proyecto, pero **no cierra por sí sola** el ADR-008 del SAD, que sigue abierto a nivel de ese documento | Russbel (BA), a partir de una segunda auditoría independiente | Pendiente |
| **1.9** | **02-09-2026** | **Russbel compartió la copia real del documento previa al 28 de agosto (v1.5). Se contrastó línea por línea contra la reconstrucción del 01 sep y se corrigieron las diferencias reales encontradas:** (1) sección 5 (Actores) reemplazada por la tabla original de 11 actores (Prospecto/Cliente, Ejecutivo/Personal administrativo, Operador/Mecánico, Autorizador de excepción 1er/2do y 3er nivel, Evaluador de daños, Responsable financiero, Responsable Talento Humano, Gerencia, Sistema, Administrador del sistema) — la reconstrucción anterior era una simplificación con actores nombrados (Fiorella, José Pariona, Cecilia) en vez de roles; (2) sección 6 ampliada a sus 3 subsecciones reales (precondiciones, disparadores, postcondiciones); (3) sección 7 (catálogo `DAT-CLI-*`) reemplazada — la versión del 01 sep tenía campos inventados que no existen en el original (`DAT-CLI-017` "motivo de observación", `DAT-CLI-018` "empresas interactuadas"); el catálogo real termina en `DAT-CLI-018` = Firma/huella; (4) **BR-INS-005 corregida — el 01 sep se había inventado contenido** ("la evidencia se vincula al vehículo... nunca queda suelta"); la regla real es la distinción FIV (solo presencia del kit de emergencia) vs. FCKE (presencia, estado y vencimiento); (5) sección 9 (notificaciones) ampliada de 3 a las 12 filas reales; (6) sección 13 (evidencias) ampliada a las 13 evidencias reales + 8 eventos auditables; (7) sección 14 (privacidad) ampliada a la tabla real de 7 filas. **Esta versión ya no es una reconstrucción por referencias cruzadas — es una restauración verbatim contra la fuente real** | Russbel (BA), a partir de la copia real compartida por el usuario | Pendiente |
| **1.10** | **02-09-2026** | **Corrige 6 hallazgos P0 de una tercera auditoría independiente (calificación 8.9/10):** (1) sección 20 — se restauran directamente los 10 riesgos funcionales que dependían de "la versión previa" (ya sin acceso, per definición de la v1.9); (2) sección 19 — se agrega `OQ-CLI-101` (nueva): la pregunta sobre coexistencia de pasaporte/carnet de extranjería que ya vivía sin identificador dentro de `DAT-CLI-005` (sección 7) — el conteo correcto de preguntas funcionales abiertas pasa de 1 a 2; (3) sección 22, criterio 10 — corregido el texto auto-contradictorio que decía "queda pendiente" algo que la propia versión anterior ya daba por corregido; (4) sección 19.3 (nueva) — recomendación de arquitectura sobre la matriz notarial no determinística, para que el SDD no la codifique como reglas rígidas sin parametrización; (5) `BDD-KAIROS-TRACEABILITY.md` — se incorporan las 23 reglas que faltaban en la matriz (de 47 a las 70 completas) y se corrige la introducción de la deuda Gherkin, que se contradecía con su propio contenido; (6) `BDD-KAIROS-EXECUTIVE-SUMMARY.md` — actualizado el manifiesto, que seguía citando este documento en v1.8 cuando ya estaba en v1.9 | Russbel (BA), a partir de una tercera auditoría independiente | Pendiente |
| **1.11** | **02-09-2026** | **Respuestas directas de Fiorella a los 6 inputs de negocio pendientes.** (1) `OQ-DEV-101` resuelta: no hay ni debe haber plazo fijo, es variable por diseño según la aceptación del cliente; (2) `OQ-CLI-101` resuelta: pasaporte y carnet de extranjería son alternativos, nunca simultáneos — la licencia de conducir válida sigue siendo obligatoria siempre; (3) `OQ-CON-101` resuelta formalmente: Consulta virtual queda validada, ya no en estado informal; (4) `BR-INS-003` corregida: la duración de cada video se mantiene en \~7-8 minutos — se descarta la lectura alternativa de 3-16 min que se había asumido brevemente; (5) `BR-INS-004` corregida: son 35 fotos, no 34; (6) `BR-ADP-002` (en `BDD-ADP-001`) corregida de fondo: no son "2 personas clave" designadas, es una regla de capacidad — máximo 1 persona del área de vacaciones a la vez, por orden de solicitud. **Con estos cierres, no queda ninguna pregunta funcional de negocio abierta en el BDD** | Russbel (BA), a partir de las respuestas directas de Fiorella | Pendiente |
| **1.12** | **03-09-2026** | **Corrección del manifiesto de versión (sección 0), sin cambios de contenido de negocio.** La tabla seguía citando números de versión obsoletos de sí misma (1.10 en vez de 1.11) y de 6 de los otros 8 documentos (verificado línea por línea contra el encabezado real de cada archivo el 03 sep, a raíz de una verificación pedida por Russbel). Corrige además la fecha de "última actualización" de cada fila, que en varios casos seguía en 01 sep cuando el encabezado real decía 02 sep. Es la segunda vez que este manifiesto se desincroniza de los archivos reales (primera vez: hallazgo P0 #2, 01 sep) — se documenta explícitamente para no repetir el patrón sin registro | Russbel (BA), a partir de verificación propia contra los 9 encabezados reales | Pendiente |
| 1.13 | **03-09-2026** | Sincroniza el manifiesto con `BDD-RES-001` (v1.9, tras las respuestas de negocio de Reserva) y `BDD-KAIROS-TRACEABILITY.md` (v1.11, 79 escenarios) — **error propio: se editó solo la fila del manifiesto y no el encabezado de este mismo archivo**, que quedó en 1.12 mientras la tabla ya decía 1.13. Detectado y corregido en la siguiente versión (1.14), tercera vez que este tipo de desincronización ocurre en este documento | Russbel (BA), a partir de las respuestas de negocio de Reserva | Pendiente |
| **1.14** | **03-09-2026** | Corrige el error de la versión 1.13 (encabezado vs. manifiesto desincronizados dentro del mismo archivo). Sincroniza además `BDD-KAIROS-EXECUTIVE-SUMMARY.md` a v1.13 tras la 3ª ronda de respuestas del día, que resolvió 3 de las 4 preguntas de Legal que quedaban abiertas (firma remota, riesgo compartido, CDN global) — solo la privacidad de datos queda con contenido pendiente | Russbel (BA), a partir de decisiones directas del usuario | Pendiente |
| **1.15** | **03-09-2026** | **Cuarta ronda del día.** (1) Nueva sección 14.1: propuesta de cláusula de tratamiento de datos personales (texto de contrato + guion de video), redactada por Russbel a pedido del usuario, pendiente de revisión de Fiorella; (2) sección 14 actualizada: la reserva remota ya no es un vacío legal, el contrato de Alquiler siempre tiene respaldo presencial con video | Russbel (BA), a partir de solicitud directa del usuario | Pendiente |
| **1.16** | **03-09-2026** | **Quinta ronda.** Se retira la sección 14.1 (cláusula de privacidad) a pedido del usuario: primero se le propondrá a Fiorella directamente, no se documenta como contenido del BDD hasta que exista esa aprobación. La sección 14 vuelve a marcar la privacidad de datos como `PENDIENTE`, sin texto formal todavía | Russbel (BA), a partir de instrucción directa del usuario | Pendiente |
| **1.17** | **04-09-2026** | **Corrección de gobernanza, hallazgo propio:** la tabla de firmas de la sección 22.1 y sus criterios asociados (sección 22) nunca se habían actualizado desde la creación del documento — seguían mostrando Producto, UX y QA como roles vacantes, pese a que Fiorella (02 sep) y Eder Ramos (03 sep) ya los cubren. Se corrige junto con la decisión del usuario del 04 sep de que **no es necesaria la firma formal** — todos los roles asignados quedan `Aprobado sin firma formal`; Legal queda como decisión de no asignar, no como vacío | Russbel (BA), a partir de instrucción directa del usuario y verificación propia | Pendiente |
| **1.18** | **04-09-2026 (verificación final)** | **Hallazgo propio, auditoría de cierre:** la fila de `BDD-KAIROS-EXECUTIVE-SUMMARY.md` en este manifiesto seguía en 1.13, mientras el documento real ya estaba en 1.18 — 5 versiones de atraso, nunca sincronizadas en las rondas anteriores. Corregida. Verificación completa realizada a pedido del usuario: sin más inconsistencias de versión encontradas en los 8 documentos tocados en esta sesión | Russbel (BA), verificación propia a pedido del usuario | Pendiente |

### 1.2 Convenciones

| Estado | Significado |
| --- | --- |
| `CONFIRMADO` | Respaldado por evidencia directa de Fiorella/José y validado por negocio |
| `PROPUESTO` | Diseño TO-BE recomendado, derivado de reglas ya confirmadas, pendiente de aprobación explícita |
| `SUPUESTO` | Necesario para completar el modelo, aún no confirmado por nadie |
| `PENDIENTE` | Requiere una decisión explícita de un rol identificado |
| `BLOQUEANTE` | Impide aprobar o implementar el comportamiento afectado |

### 1.3 Fuentes

| ID | Fuente | Uso |
| --- | --- | --- |
| SRC-CON-001 | Ficha AS-IS de Consulta | Flujo, reglas y datos del proceso de Consulta (presencial y virtual) |
| SRC-RES-001 | Ficha AS-IS de Reserva | Flujo, reglas y datos del proceso de Reserva |
| SRC-ALQ-001 | Ficha AS-IS de Alquiler | Flujo, reglas, datos, backlog transversal |
| SRC-DEV-001 | Ficha AS-IS de Devolución | Flujo y reglas del proceso de Devolución |
| SRC-REC-001 | Ficha AS-IS de Reclutamiento y Selección | Flujo AS-IS real + modelo formal (Plan de Gestión de Talento Humano) |
| SRC-ADP-001 | Ficha AS-IS de Administración de Personal | Flujo AS-IS real + Evaluación de Desempeño/Capacitación |
| SRC-DL-001 | Decision Log KAIROS/VeloxRent | Decisiones, correcciones y hallazgos cronológicos, incluida la reunión del 31 ago |
| SRC-BPMN-\* | 7 Diagramas BPMN | Secuencia visual y puntos de decisión |
| SRC-BKL-001 | Backlog Consolidado VeloxRent | Problemas y oportunidades |
| SRC-DIC-001 | Diccionario de Datos y Modelo de Dominio | Entidades y relaciones de negocio |
| SRC-NFR-001 | Requisitos No Funcionales VeloxRent | Requisitos cualitativos por dimensión — ventana operativa confirmada 8am-5pm (31 ago) |
| SRC-CAP-001 | Capacidades Funcionales del ERP | Capacidades esperadas por dominio |
| SRC-TRANS-\* | Transcripciones de reuniones (incluida 31 ago 2026) | Contexto y citas directas de Fiorella |
| SRC-CTR-001 | Contrato de Reserva, Contrato de Alquiler | Campos formales de cliente |
| SRC-TAR-001 | Tarifario oficial de daños VeloxRent (imagen recibida de Fiorella, 31 ago) | Precios de daños estéticos (tabla 9.6.1 de `BDD-DEV-001`) — ver nota de la sección 1.4 sobre las fechas de este documento |

### 1.4 Nota editorial sobre una fecha del tarifario (cerrada 01 sep, hallazgo #5 de la auditoría)

El tarifario oficial citado en `BDD-DEV-001` (sección 9.6.1) muestra "Fecha de elaboración: 24/08/2026 · Fecha de modificación: 24/09/2026 · Fecha de revisión: 24/09/2026". La auditoría señaló que la fecha de modificación/revisión es posterior a la fecha actual. **Confirmado por Russbel el 01 sep: son fechas aleatorias/de ejemplo del formato — lo que está vigente y en uso son el formato y los precios en sí, no esas fechas puntuales.** No se trata como inconsistencia a resolver ni se le asigna un valor corregido.

---

## 2. Propósito y resultado de negocio

### 2.1 Propósito

Definir, en lenguaje verificable por negocio, QA, UX y desarrollo, cómo deben comportarse los 6 procesos levantados de VeloxRent dentro del ERP interno de KAIROS: Consulta, Reserva, Alquiler, Devolución, Reclutamiento y Selección, y Administración de Personal.

### 2.2 Resultado esperado

Al cierre de cada expediente de cualquiera de los 6 procesos, el sistema debe demostrar, sin depender de conversaciones externas ni de memoria del personal:

- quién solicitó o generó el expediente, y quién lo atendió;
- qué decisión de negocio se tomó en cada punto de bifurcación (notaría, clasificación de riesgo, gravedad de daño, resultado de entrevista);
- qué evidencia respalda cada decisión (foto, video, firma, documento);
- qué pago o garantía se movió, y su estado actual;
- quién autorizó cada excepción, y bajo qué justificación;
- el estado vigente del expediente y su historial completo de cambios.

### 2.3 Indicadores funcionales

| Indicador | Definición | Meta propuesta | Estado |
| --- | --- | --- | --- |
| Alquileres sin doble asignación de vehículo | Alquileres/reservas confirmados sin solapamiento del mismo vehículo | 100% | `PROPUESTO` |
| Expedientes trazables | Expedientes con actor, fecha, condición y evidencia identificables | 100% | `PROPUESTO` |
| Conversión Consulta → Reserva/Alquiler | Consultas que terminan en conversión | Medición inicial | `SUPUESTO` |
| Cumplimiento del recordatorio de devolución (3h antes) | % de devoluciones con recordatorio ejecutado a tiempo | Medición inicial | `SUPUESTO` |
| Inspecciones con evidencia completa (35 fotos + 3 videos) | % de expedientes con evidencia mínima cumplida | 100% | `PROPUESTO` |
| Tiempo de confirmación de reserva | Desde aceptación del cliente hasta confirmación | Por validar | `PENDIENTE` — sigue sin ningún NFR de Reserva confirmado |
| Cobro efectivo de días de paralización | % de casos con daño técnico \>24h que generan el cargo (BR-DEV-011, nueva 31 ago) | Medición inicial | `SUPUESTO` — nueva |
| Reclutamientos con Plan de Talento Humano aplicado íntegro | % de contrataciones que siguen el Plan formal | Medición inicial | `SUPUESTO` |

---

## 3. Alcance

### 3.1 Incluido (MVP)

| Dominio | Procesos que lo componen | Estado |
| --- | --- | --- |
| Organización | Grupo KAIROS, empresas, sedes, colaboradores, cargos y roles | `CONFIRMADO` |
| Identidad | Inicio de sesión, permisos y auditoría | `SUPUESTO` |
| Clientes | Naturales/jurídicos, documentos, historial y clasificación de riesgo | `CONFIRMADO` |
| Consulta | Presencial y virtual | `CONFIRMADO` |
| Reserva | Presencial y remota, pago, bloqueo atómico, conversión a Alquiler | `CONFIRMADO` |
| Alquiler | Contrato, planes, notaría, entrega, ampliaciones | `CONFIRMADO` |
| Devolución | Recepción, inspección, daños, garantía, cargo por paralización, cierre | `CONFIRMADO` |
| Evidencias | Fotos, videos, archivos, firmas y trazabilidad | `CONFIRMADO` |
| Finanzas operativas | Pagos, garantías, descuentos y reembolsos | `CONFIRMADO` |
| Incidencias | Daños, choques, inmovilización y seguimiento | `CONFIRMADO` |
| Reclutamiento y Selección | Vacantes, candidatos, selección, inducción | `CONFIRMADO` (AS-IS real) + `PROPUESTO` (Plan formal) |
| Administración de Personal | Asistencia, permisos, vacaciones, remuneración, salidas a campo (sin 4to nivel automático), salida | `CONFIRMADO` |
| Reportes | Tableros operativos y KPI iniciales | `CONFIRMADO` |

### 3.2 Fuera del alcance de este documento

Sin cambios respecto a la versión anterior — ver Evaluación de Desempeño formal, Capacitación formal completa, contabilidad completa, planilla peruana completa, procesos de Casa del Auto/Motrix/RENOVA, WhatsApp bidireccional, automatización de decisiones laborales o legales.

### 3.3 Inicio y fin de cada proceso

Sin cambios — ver detalle en la sección 3.3 de la versión anterior de este documento, o en cada `BDD-XXX-001` de proceso.

---

## 4. Glosario funcional

| Término | Definición |
| --- | --- |
| Consulta | Calificación previa del cliente, punto de entrada único y obligatorio antes de Reserva o Alquiler |
| Reserva | Compromiso temporal sobre un vehículo y periodo, sujeto a pago (S/300) y aceptación — **bloqueo siempre atómico, nunca provisional** (confirmado 27 y 31 ago) |
| Alquiler | Contrato formal de uso del vehículo, con entrega física, inspección y garantía |
| Devolución | Recepción del vehículo, inspección de retorno y resolución de garantía |
| Bloqueo de vehículo | Retención de un vehículo (por reserva confirmada o alquiler activo) que impide asignarlo a otra operación solapada |
| Cliente antiguo | Cliente con más de 2 alquileres previos con VeloxRent |
| Vehículo de menor costo/riesgo | El de menor valor adquisitivo relativo dentro de la flota vigente |
| Cliente sin observación | Estado base de todo cliente nuevo o sin antecedentes registrados |
| Cliente ámbar | Cliente con una observación leve o daño leve asumido — **estado permanente, sin rehabilitación** (confirmado 31 ago) |
| Cliente rojo | Cliente bloqueado automáticamente del sistema — **estado permanente, sin rehabilitación** (confirmado 31 ago), marcado por empresa con historial visible a todo el grupo KAIROS |
| Tercera vía | Alquiler sin notaría y sin garantía duplicada, para cliente antiguo + biométrico favorable + vehículo de menor costo |
| Notaría "bajo consulta" | Vehículo que puede alquilarse sin notaría solo si el horario del cliente no coincide con el horario de la notaría |
| Gerencia/Subgerencia | Fiorella y José Pariona actuando en su capacidad formal |
| Talento Humano | Nombre formal vigente del área antes llamada "Recursos Humanos" |
| Plan de Gestión de Talento Humano | Documento formal que describe el proceso TO-BE de Reclutamiento — meta hacia Q1 2027 |
| Salida a campo | Actividad fuera de oficina sujeta al mismo control que la asistencia — cascada de **exactamente 3 niveles, sin 4to autorizador automático** (confirmado 31 ago) |
| Acta de devolución de garantía | Documento opcional, emitido solo a pedido del cliente |
| Documento de responsabilidad | Documento firmado por el cliente declarando no haber incurrido en infracciones |
| Días de paralización | Días que el vehículo permanece inmovilizado esperando la respuesta del cliente a un informe de daño técnico más allá de 24h — se cobran como alquiler adicional (BR-DEV-011, nueva 31 ago) |
| Informe de Motrix | Presupuesto individual del mecánico externo Motrix para todo daño técnico — reemplaza cualquier tabla de precios fija, que no existe por diseño (BR-DEV-006) |

---

## 5. Actores y responsabilidades

> ✅ **Corregido 02 sep 2026:** Russbel compartió la copia real previa al 28 de agosto (versión 1.5). Se reemplaza la reconstrucción por referencias cruzadas del 01 sep por el **contenido verbatim del original**.

| Actor | Procesos donde participa | Responsabilidad | Puede decidir | No puede decidir |
| --- | --- | --- | --- | --- |
| Prospecto/Cliente | Consulta, Reserva, Alquiler, Devolución | Solicita información, acepta condiciones, paga, recibe/devuelve el vehículo | Aceptar o rechazar una alternativa; solicitar cambios | Confirmar su propio pago; aprobar su propia excepción |
| Ejecutivo/Personal administrativo | Consulta, Reserva, Alquiler, Devolución | Atiende, cotiza, formaliza, cobra, comunica | Recomendar alternativas vigentes; registrar información | Aprobar excepción notarial; marcar cliente en rojo; validar financieramente pagos por agente |
| Operador/Mecánico | Alquiler, Devolución | Ejecuta inspecciones junto al administrativo | Registrar hallazgos técnicos en el checklist | Aprobar la inspección por sí solo; decidir el monto de un descuento |
| Autorizador de excepción — 1er/2do nivel (Fiorella/José) | Alquiler, Devolución, Administración de Personal | Aprueba excepciones notariales, clasifica riesgo del cliente, asigna montos de descuento | Aprobar/rechazar excepción; marcar cliente en rojo/ámbar; autorizar salidas a campo | Delegar de forma permanente esta decisión a otro rol sin excepción vigente |
| Autorizador de excepción — 3er nivel (Cecilia u otro designado) | Administración de Personal (salidas a campo) | Respaldo cuando 1er/2do nivel no responden en 5 minutos | Autorizar decisiones menores de campo | Aprobar excepciones notariales ni clasificar riesgo de cliente — fuera de su alcance |
| Evaluador de daños (José Pariona) | Devolución | Clasifica técnicamente el daño (leve/moderado/grave) | Determinar si el daño es previo o causado por el cliente; clasificar gravedad | Aprobar el monto final a descontar (eso es Gerencia/Subgerencia) |
| Responsable financiero (Fiorella) | Alquiler, Devolución | Concilia pagos, garantías, descuentos y devoluciones | Aprobar o rechazar evidencia de pago; autorizar devolución de garantía | Cambiar el vehículo o las condiciones comerciales de un expediente |
| Responsable Talento Humano (Fiorella, con apoyo de José Paita/Ronaldo Ccañahua en el diseño formal) | Reclutamiento y Selección, Administración de Personal | Recluta, selecciona, administra el ciclo de vida del personal | Decidir contratación (hoy exclusivo de Fiorella); aplicar sanciones | Ejecutar automatización de decisiones laborales o legales |
| Gerencia (Fiorella/José en capacidad formal) | Todos los procesos | Supervisa, aprueba excepciones, consulta indicadores, decide sobre reservas ante venta de vehículo | Aprobar decisiones definidas por política; resolver casos escalados | Omitir el registro de auditoría de una decisión sensible |
| Sistema | Todos los procesos | Valida, alerta, bloquea y registra | Ejecutar reglas determinísticas (bloqueo automático de cliente rojo, invariante de disponibilidad) | Tomar decisiones discrecionales no autorizadas (ej. aprobar una excepción notarial por sí mismo) |
| Administrador del sistema | Todos los procesos | Configura usuarios, roles, catálogos y políticas | — | No tiene equivalente de negocio hoy; es un rol nuevo introducido por el sistema |

> 📌 **Nota de vigencia (02 sep 2026):** esta tabla es la versión original del 27 ago. Cecilia y José Paita ya aparecían aquí como 3er nivel y como Gestión y Procesos respectivamente — la confirmación del 31 de agosto (BR-ADP-004: no se automatiza un 4to nivel) no cambia esta tabla, solo confirma que "Autorizador de excepción — 3er nivel" es el último nivel automatizado y que no existe un 4to actor equivalente formalizado en el sistema.

### 5.1 Segregación de funciones

- El usuario que registra un pago no debe validar su propia corrección cuando exista conflicto — hoy este control es informal (P-18, Fiorella concilia manualmente).
- Toda excepción (notarial, clasificación de riesgo, salida a campo fuera de política) debe identificar solicitante, autorizador, motivo, vigencia y evidencia.
- Ningún actor puede eliminar el historial de un expediente confirmado — solo archivar (BR-DOC-001).
- La decisión de marcar a un cliente en rojo es exclusiva de Fiorella y José — confirmado desde el 4 de agosto, reafirmado el 21 de agosto con el bloqueo automático.
- El personal polivalente (cualquier persona de VeloxRent debe saber ejecutar los 3 procesos principales) es una regla de continuidad operativa, no de autorización — no cambia quién puede aprobar una excepción.

---

## 6. Precondiciones transversales y disparadores por proceso

### 6.1 Precondiciones transversales (aplican a los 6 procesos)

- Empresa y sede activas.
- Catálogo de vehículos, planes y tarifas vigente (para Consulta, Reserva, Alquiler).
- Usuario con rol y alcance empresarial válidos.
- Cliente o prospecto con medio de contacto identificable (Consulta, Reserva, Alquiler, Devolución).
- Vacante o necesidad de personal registrada (Reclutamiento).
- Colaborador ya contratado con expediente activo (Administración de Personal).

### 6.2 Disparadores por proceso

| Proceso | Disparadores confirmados |
| --- | --- |
| Consulta | Cliente contacta por llamada, WhatsApp, redes sociales o presencial, tras publicación de marketing o campaña |
| Reserva | Cliente acepta una alternativa de vehículo para fecha futura (viene de Consulta) |
| Alquiler | Cliente decide contratar de inmediato (viene de Consulta), o una Reserva confirmada llega a su fecha pactada |
| Devolución | El cliente devuelve físicamente el vehículo (confirmado explícitamente por Fiorella, 21 ago) — el recordatorio 3h antes es el primer paso operativo, no el disparador de negocio |
| Reclutamiento y Selección | 3 fuentes confirmadas (12 ago): renuncia/salida de personal (viene de Administración de Personal), crecimiento de un área existente, o creación de una nueva área |
| Administración de Personal | El personal ya fue contratado y comienza su día a día — múltiples sub-disparadores independientes (fecha de pago quincenal, solicitud de permiso, solicitud de salida a campo, fecha de vencimiento del periodo de prueba, decisión de renuncia/despido) |

### 6.3 Postcondiciones exitosas por proceso

| Proceso | Postcondición exitosa |
| --- | --- |
| Consulta | Cliente informado de requisitos y tarifario, con derivación explícita a Reserva o Alquiler, o cierre registrado con motivo |
| Reserva | Reserva con identificador único, vehículo bloqueado, pago de S/300 validado, contrato físico firmado |
| Alquiler | Vehículo entregado con contrato notariado (si aplica), inspección registrada, pagos verificados, expediente físico y digital completo |
| Devolución | Vehículo recibido e inspeccionado, garantía devuelta (24h) o descuento aplicado, expediente archivado |
| Reclutamiento y Selección | Personal seleccionado, ingresado al día siguiente, inducción iniciada, periodo de prueba con pago por recibo de honorarios activo |
| Administración de Personal | Asistencia/permiso/vacación/salida a campo registrada y vinculada a empresa, fecha y autorización correspondiente |

---

## 7. Catálogo transversal de datos del Cliente (sección 8.0 en el original)

> ✅ **Corregido 02 sep 2026:** la versión del 01 sep tenía campos inventados por reconstrucción (ej. "empresa(s) interactuadas", "motivo de observación" como DAT-CLI-017/018) que no existen en el catálogo real. Se reemplaza por el contenido verbatim de la versión 1.5 (27 ago), construido a partir del Diccionario de Datos (SRC-DIC-001) y los contratos de Reserva/Alquiler.

| ID | Información | Obligatoria | Condición | Validación funcional | Origen | Sensibilidad |
| --- | --- | --- | --- | --- | --- | --- |
| DAT-CLI-001 | Nombres y apellidos (persona natural) / Razón social (persona jurídica) | Sí | Siempre — el campo exacto depende de DAT-CLI-009 | Texto | Formato FIV, contrato | Personal |
| DAT-CLI-002 | Tipo de documento | Sí | Depende de persona natural/jurídica, nacionalidad y rol contractual (DNI si es natural peruano; pasaporte/carnet si es extranjero; RUC si es persona jurídica) | DNI / Pasaporte / Carnet de extranjería / RUC | Contratos, flujograma de Alquiler | Personal |
| DAT-CLI-003 | Número de documento | Sí | Según tipo de documento (DAT-CLI-002) | Regla de validación propia del tipo seleccionado (DNI: 8 dígitos; RUC: 11 dígitos; pasaporte/carnet: alfanumérico) | Copia física, verificación RENIEC | Personal — ⚠️ en el control externo aparece a veces en notación científica (error de Excel, problema conocido) |
| DAT-CLI-004 | Nacionalidad / país de nacionalidad | Sí | Siempre | País (ISO); "¿es peruano?" se deriva como `nacionalidad == PE`, no se modela como campo booleano independiente | Flujograma oficial de Alquiler | Personal — determina el tercer requisito documental (BR-CON-004) |
| DAT-CLI-005 | Pasaporte (tipo + número) | Condicional | Solo si no es peruano — **alternativo a DAT-CLI-006, nunca se exigen ambos simultáneamente (confirmado 02 sep 2026, **`RESUELTO`** OQ-CLI-101)** | Alfanumérico, verificado activo | Reunión 10 ago; confirmado SRC-DL-001 (02 sep) | Personal |
| DAT-CLI-006 | Carnet de extranjería (tipo + número) | Condicional | Solo si no es peruano — **alternativo a DAT-CLI-005, no simultáneo (confirmado 02 sep 2026)** | Alfanumérico | Reunión 10 ago; confirmado SRC-DL-001 (02 sep) | Personal |
| DAT-CLI-007 | Fecha de ingreso al país | Condicional | Solo si no es peruano | Fecha | Reunión 10 ago | Personal — determina vigencia del brevete extranjero (6 meses) |
| DAT-CLI-008 | Voucher de hospedaje | Condicional | Solo si no es peruano | Imagen/PDF, verificado por llamada | Reunión 10 ago | Sensible |
| DAT-CLI-009 | Tipo de persona/cliente | Sí | Siempre | Natural / Jurídica | Formato FIV | Interna |
| DAT-CLI-010 | Representante legal (nombres y apellidos, documento) | Condicional | Si es persona jurídica (razón social ya vive en DAT-CLI-001) | Texto | Contrato de Alquiler (cláusula de representación) | Personal |
| DAT-CLI-011 | Domicilio (departamento/provincia/distrito) | Sí | Siempre | Texto | Contrato de Reserva, Contrato de Alquiler | Personal |
| DAT-CLI-012 | Procedencia | No | Opcional | Texto (ciudad/región) | Formato FIV | Normal — clientes de Lima muestran patrones distintos (más exigentes, prefieren automático) |
| DAT-CLI-013 | Edad | No | Opcional | Numérico | Formato FIV | Personal |
| DAT-CLI-014 | Celular 1 | Sí | Siempre | Numérico | Formato FIV | Personal |
| DAT-CLI-015 | Celular 2 (contacto adicional) | No | Opcional | Numérico | Formato FIV | Personal — usado en el protocolo de aviso de devolución |
| DAT-CLI-016 | Semáforo de riesgo | Sí, con valor por defecto | Siempre | `SIN_OBSERVACIÓN` / `ÁMBAR` / `ROJO` (BR-DEV-008) | Decisión de Fiorella/José | Sensible |
| DAT-CLI-017 | Récord del Ministerio de Transportes (MTC) | Sí | Antes de entregar el vehículo | Activo, sin puntuación negativa | App gubernamental | Personal |
| DAT-CLI-018 | Firma / huella | Sí | Al aceptar contrato o documento de aceptación remota | Física o digital según canal | Contrato, documento de aceptación remota | Sensible — valor legal de la firma remota `PENDIENTE` (OQ-RES-104) |

> ⚠️ **Nota de duplicación (identificada por auditorías anteriores, todavía sin aplicar):** `DAT-CON-002` de `BDD-CON-001` (nacionalidad como `PERUANO`/`EXTRANJERO`) debe tratarse como un valor **derivado** de `DAT-CLI-004` (país ISO) — `nacionalidad == PE`, no como un dato persistido aparte. Pendiente de aplicar esta normalización la próxima vez que se edite `BDD-CON-001`.

---

## 8. Reglas transversales — Organización, Inspección y Documentos

> ✅ **Corregido 02 sep 2026:** reemplazado por el contenido verbatim de la versión 1.5 (27 ago). La reconstrucción del 01 sep tenía a BR-INS-005 con contenido **inventado** ("la evidencia se vincula al vehículo... nunca queda suelta") — la regla real es la distinción FIV/FCKE, completamente distinta.

### 8.1 Organización (BR-ORG-\*)

| ID | Regla | Prioridad | Fuente | Estado |
| --- | --- | --- | --- | --- |
| BR-ORG-001 | KAIROS agrupa VeloxRent, Casa del Auto, Motrix y RENOVA | Alta | SRC-DL-001 | `CONFIRMADO` |
| BR-ORG-002 | El ERP es interno y debe identificar la empresa de cada registro | **Crítica** | SRC-DL-001 (18 ago — organigrama oficial de KAIROS HOLDING) | `CONFIRMADO` — ver escenario `@SC-ORG-001` |
| BR-ORG-003 | Cualquier persona de VeloxRent debe saber ejecutar los 3 procesos principales (Alquiler, Devolución, Reserva), para cubrir la función administrativa si el titular no está | Media | SRC-ALQ-001 (7 ago) | `CONFIRMADO` |

### 8.2 Inspección (BR-INS-\*)

| ID | Regla | Prioridad | Fuente | Estado |
| --- | --- | --- | --- | --- |
| BR-INS-001 | La inspección contempla 30 min técnicos y 15 min documentarios (45 min total) | Alta | SRC-ALQ-001 (14 ago) | `CONFIRMADO` |
| BR-INS-002 | Existen tres videos independientes: interior, exterior, instrucciones al cliente | Alta | SRC-DL-001 (19 ago) | `CONFIRMADO` — `RESUELTO` OQ-002 |
| BR-INS-003 | Son 3 videos independientes por checklist (interior, exterior, instrucciones al cliente). La duración de referencia de cada video es de **\~7-8 minutos** — confirmado 02 sep 2026, con una respuesta previa que mencionaba un rango de 3-16 min descartada por precisión posterior de Fiorella. No es un mínimo estrictamente verificable como sí lo son las 35 fotos (BR-INS-004) | Alta | SRC-DL-001 (19 ago); confirmado de nuevo SRC-DL-001 (02 sep) | `CONFIRMADO` |
| BR-INS-004 | **Actualizada 02 sep 2026:** el estándar de evidencia fotográfica es de **35 fotos** por expediente (antes se documentaban 34) | Alta | SRC-DL-001 (17 ago); cifra corregida SRC-DL-001 (02 sep) | `CONFIRMADO` — cifra actualizada, puede seguir evolucionando |
| BR-INS-005 | El formato de inspección vehicular (FIV) solo verifica presencia del kit de emergencia; el FCKE verifica presencia, estado y vencimiento | Alta | SRC-DL-001 (17 ago) | `CONFIRMADO` — corrige una inversión anterior |
| BR-INS-006 | La inspección de menos de 30 minutos hoy no tiene ningún control automático — es retrospectivo, vía revisión de cámaras. Decisión TO-BE: el sistema debe permitir continuar solo bajo excepción con autorización explícita — no alerta pasiva, no bloqueo total sin salida. Alguien con autorización (Fiorella o quien ella delegue) debe aprobar saltarse el estándar de 30 min, dejando el motivo registrado | Media | SRC-DL-001 (21, 27 ago) | `CONFIRMADO` — `RESUELTO` OQ-004. Fiorella: "la última opción sería la más recomendable... bloquear hasta que, bajo alguna circunstancia, nosotros podríamos autorizar" |

### 8.3 Documentos (BR-DOC-\*)

| ID | Regla | Prioridad | Fuente | Estado |
| --- | --- | --- | --- | --- |
| BR-DOC-001 | El expediente AS-IS se conserva física y digitalmente (partida doble) | Alta | SRC-ALQ-001 (14 ago) | `CONFIRMADO` |
| BR-DOC-002 | Debe existir una única versión vigente de cada documento contractual (contrato, políticas) | **Crítica** | SRC-NFR-001 (7 ago) | `CONFIRMADO` — atiende P-26; ver escenario `@SC-DOC-001` |
| BR-DOC-003 | Los contratos siguen una sola plantilla por combinación (persona natural/jurídica × con/sin conductor) — solo varían placa, precio y garantía | Media | SRC-DL-001 (24 ago) | `CONFIRMADO` |

---

## 9. Matrices de decisión transversales

### 9.1 Alcolímetro (transversal Alquiler/Devolución) — restaurado 02 sep 2026 (contenido real, sección 10.2 del original)

| Resultado | Momento | Efecto |
| --- | --- | --- |
| Favorable | Entrega | Continúa a contratación |
| Desfavorable | Entrega | Se cancela el contrato de inmediato |
| Favorable | Devolución | Continúa el checklist de retorno |
| Desfavorable | Devolución | Vehículo queda en custodia preventiva de VeloxRent (`RECEPCIÓN PROVISIONAL`), la devolución contractual no se cierra, se deriva a Gerencia — en la práctica casi siempre "cliente rojo" |

Las matrices de decisión propias de cada proceso (notaría, gravedad de daño, modalidad de Reserva) viven en la sección 10.X de su `BDD-XXX-001` correspondiente.

---

## 10. Estados transversales

### 10.1 Invariantes transversales — restaurado 02 sep 2026 (contenido real, sección 11.3 del original)

- No entregar el vehículo sin checklist de salida completo.
- No confirmar contratación con alcolímetro desfavorable.
- No devolver garantía con incidencia abierta vinculada.
- No liberar el vehículo de un alquiler activo sin transición válida.

No existe un estado único transversal más allá de estas 4 invariantes — cada proceso tiene su propia máquina de estados (sección 11.X de cada `BDD-XXX-001`). El único estado que además cruza los 6 procesos es el semáforo de riesgo del cliente (`DAT-CLI-016`), documentado en la sección 10.10 de este documento.

### 10.10 Ciclo de rehabilitación del semáforo de riesgo — **ACTUALIZADO 01 sep, ya no es **`PROPUESTO`

> ⚠️ Esta sección estaba `PROPUESTO`, con 4 preguntas abiertas para Fiorella. El 31 de agosto de 2026, la reunión con Fiorella **resolvió las 4 preguntas** — la tabla de abajo queda como registro histórico de la propuesta que se evaluó, no como diseño vigente.

| Transición propuesta (histórica, evaluada 27 ago) | Resultado real confirmado 31 ago |
| --- | --- |
| `SIN_OBSERVACIÓN` → `ÁMBAR` | Se mantiene — es la única transición real que existe (BR-DEV-008) |
| `ÁMBAR` → `SIN_OBSERVACIÓN` | **No existe.** Ámbar es permanente |
| `ÁMBAR` → `ROJO` | Se mantiene — daño grave o reincidencia siempre escala a Rojo |
| `ROJO` → `ÁMBAR` (apelación) | **No existe.** Rojo es permanente y definitivo, sin apelación |
| `ROJO` → `SIN_OBSERVACIÓN` | No aplicaba, sigue sin aplicar |

**Respuestas confirmadas 31 ago a las 4 preguntas que dejaba abiertas esta propuesta:**

1. ¿El semáforo es por VeloxRent o por todo KAIROS? → **Por empresa** (VeloxRent), pero el historial/motivo es visible a todo el grupo KAIROS como información preventiva, sin bloqueo automático cruzado.
2. ¿Cuántos alquileres sin observación se necesitan para bajar de Ámbar a Sin observación? → **Pregunta sin objeto — no existe ese camino de regreso.**
3. ¿Existe apelación real hoy? → **No, ningún estado admite apelación.**
4. ¿Qué evidencia exige una apelación aprobada? → **Pregunta sin objeto — no existe apelación.**

Fiorella propuso además un posible estado "Verde" (cliente de confianza) — queda como mejora `PROPUESTA` para evaluar a futuro, no bloqueante, no confirmada.

Ver `BDD-DEV-001`, BR-DEV-008 y OQ-DEV-102, para el detalle completo con la cita textual de Fiorella.

---

## 11. Excepciones transversales

Las excepciones específicas de cada proceso viven en la sección 12.X de su `BDD-XXX-001` (ej. `EX-ALQ-*`, `EX-DEV-*`, `EX-RES-*`). El principio transversal que gobierna cualquier excepción, restaurado 02 sep 2026 (contenido real, sección 12.7 del original):

> Una contingencia puede permitir continuar la captura del expediente, pero no debe declarar un alquiler entregado o una devolución cerrada si no se han verificado alcolímetro, documentos y evidencia mínima.

## 12. Notificaciones y comunicaciones

> ✅ **Restaurado 02 sep 2026** (contenido real, sección 13 del original) — reemplaza la versión resumida de 3 filas del 01 sep.

| Evento | Destinatario | Contenido mínimo | Canal | Evidencia requerida |
| --- | --- | --- | --- | --- |
| Contrato firmado | Cliente, grupo Alquileres | Datos del alquiler, foto con el contrato | WhatsApp (Formato N°01) | Registro de envío |
| Recordatorio de devolución | Cliente | Hora pactada, tolerancia | Llamada/WhatsApp | Registro de intento y resultado |
| Devolución completada | Cliente, grupo Alquileres | KM excedido, monto, garantía | WhatsApp (Formato N°02) | Registro de envío |
| Daño detectado | Cliente | Monto estimado, tabla aplicable | Directo (llamada/presencial) | Documento de notificación |
| Solicitud de recojo/retorno aeropuerto | Grupo Consultas | Vehículo, placa, pasajeros | WhatsApp (Formato N°5) | Registro de solicitud |
| Cierre de Consulta sin conversión | Base de datos interna | Motivo, canal, fecha | Registro interno | — |
| Reserva confirmada | Cliente, grupo Alquileres | Vehículo, fecha, monto | WhatsApp (Formato N°03) | Registro de envío |
| Vehículo reservado vendido | Cliente | Alternativa ofrecida | Directo (llamada/WhatsApp) | Registro de la comunicación |
| Publicación de vacante | Candidatos potenciales | Perfil, condiciones | WhatsApp, redes, portales | Registro de publicación |
| Convocatoria a entrevista | Candidato | Fecha/hora, enlace Meet | WhatsApp | Registro de confirmación |
| Resultado de selección | Candidato | Aceptado/rechazado | Directo | — |
| Solicitud de salida a campo | Grupo Consultas | Área, tema, horario | WhatsApp (Formato propio) | Registro de solicitud y autorización |

Las plantillas de estos formatos ya existen (Ficha de Alquiler, sección 4) — no se proponen desde cero.

## 13. Evidencias y auditoría funcional

> ✅ **Restaurado 02 sep 2026** (contenido real, sección 14 del original). **Corrección importante:** BR-INS-005 (sección 8.2) **no** es sobre vinculación de evidencia — es la distinción FIV/FCKE. La regla real de vinculación de evidencia no existe como `BR-*` numerada; vive implícitamente en esta tabla operativa.

### 13.1 Evidencias

| Evidencia | Cuándo | Obligatoria | Propósito |
| --- | --- | --- | --- |
| Documento de identidad válido | Antes de contratar | Sí | Verificar identidad |
| Resultado de alcolímetro (entrega) | Antes de contratar | Sí | Cumplir BR-ALQ-005 |
| 35 fotos + 3 videos | Checklist de salida y retorno | Sí | Evidencia de estado del vehículo |
| Documento de responsabilidad (sin notaría) | Alquiler sin notaría | Condicional | Respaldo legal |
| Documento de responsabilidad por infracciones | Devolución | Sí | Respaldo ante la SAT |
| Video + fotos de daño | Devolución con daño | Sí | Sustentar el descuento |
| Formato de revisión (daño grande) | Choque/avería | Sí | Evaluación de gravedad |
| Fotos/video del vehículo (modalidad virtual) | Consulta virtual | Sí | Mostrar el vehículo sin presencia física |
| Video 360° del vehículo | Reserva remota | Sí | Evidencia del estado ofrecido |
| Documento de aceptación | Reserva remota | Sí | Respaldo legal de la aceptación a distancia |
| CV del candidato | Reclutamiento | Sí | Evaluación |
| Documento de expectativas | Reclutamiento, a los 2 días de ingreso | Sí | Alinear expectativas |
| Foto de retorno de campo | Administración de Personal (salida a campo) | Sí | Confirmar el regreso a tiempo |

### 13.2 Eventos auditables adicionales

- Evaluación notarial y su resultado.
- Aprobación o rechazo de una ampliación.
- Clasificación de gravedad de un daño.
- Cambio de estado de cliente (ámbar/rojo).
- Archivo del expediente.
- Decisión de contratación (Reclutamiento).
- Cambio de nivel de autorización en una salida a campo (Administración de Personal).
- Clasificación de renuncia/despido.

El detalle técnico de almacenamiento, retención y ciclo de vida vive en `SDD-KAIROS-TRANSVERSAL.md`, sección 16.5.

## 14. Privacidad, acceso y conservación

> ✅ **Restaurado 02 sep 2026** (contenido real, sección 15 del original).

| Información | Acceso funcional | Restricción |
| --- | --- | --- |
| Documento de identidad | Administrador, Gerencia | Enmascarar en vistas generales |
| Resultado de alcolímetro | Administrador, Gerencia | Auditable |
| Evidencia de daño | Administrador, Gerencia, Evaluador de daños | Acceso auditable |
| Documento de responsabilidad | Administrador, Legal (cuando se asigne) | No exponer públicamente |
| CV y datos del candidato | Fiorella, José (Reclutamiento) | Acceso restringido, no compartir fuera del proceso |
| Registro de asistencia y sanciones | Fiorella, José (Administración de Personal) | Mismo nivel que datos de clientes |
| Documento de aceptación (Reserva remota) | Administrador, Legal (cuando se asigne) | Retención sujeta a validación legal |

Legal debe validar la retención y el valor legal de la firma con huella y la grabación de la lectura de políticas — mismo bloqueo que el criterio 4 de la sección 22. **Actualizado 03 sep 2026: la reserva remota ya no es un vacío legal** — el contrato de Alquiler siempre se firma presencialmente (con o sin notaría según el modelo) con video como evidencia adicional, así que la reserva remota nunca es el respaldo legal final (ver `OQ-SOL-009`/`OQ-TDD-004`, resueltos).

> ⚠️ **Privacidad de datos — actualizado 03 sep 2026 (5ª ronda):** Russbel redactó una propuesta de cláusula de tratamiento de datos a pedido del usuario, pero **el usuario indicó que primero se le propondrá a Fiorella antes de incorporarla a esta documentación** — por eso no se agrega aquí todavía. Sigue como pendiente `PENDIENTE` (no bloqueante), sin texto formal en este documento hasta que exista esa aprobación.

## 15. Resumen de reglas transversales

Las 12 reglas transversales de este documento (`BR-ORG-001/002/003`, `BR-INS-001` a `006`, `BR-DOC-001/002/003`) se combinan con las reglas específicas de cada proceso para llegar a las **70 reglas totales** de la serie — ver el desglose exacto en la sección 23 (checklist) y en `BDD-KAIROS-TRACEABILITY.md`.

---

## 16. Escenarios de aceptación BDD

> ✅ **Migración completada el 01 sep 2026.** La sección 16.10 de la versión 1.6 contenía 8 escenarios que en realidad eran específicos de un proceso, no transversales. Los 7 escenarios de negocio ya se movieron a su `BDD-XXX-001` correspondiente y quedan retirados de este archivo:

| Escenario migrado | Proceso destino | Ubicación actual |
| --- | --- | --- |
| SC-ALQ-004 (Incumplir requisitos de ampliación) | Alquiler | `BDD-ALQ-001`, sección 16.4.1 |
| SC-ALQ-005 (Aviso tardío de choque) | Alquiler | `BDD-ALQ-001`, sección 16.4.2 |
| SC-DEV-004 (Titular ausente en la devolución) | Devolución | `BDD-DEV-001`, sección 16.6.1 |
| SC-CON-002 (Derivar Consulta según canal) | Consulta | `BDD-CON-001`, sección 16.2.1 |
| SC-RES-005 (Cliente pierde el monto al solicitar cambio) | Reserva | `BDD-RES-001`, sección 16.3.1 — verificado: no duplica `SC-RES-004` (ese cubre el bloqueo atómico, este cubre la cancelación por cambio) |
| SC-RES-006 (Vehículo reservado se vende) | Reserva | `BDD-RES-001`, sección 16.3.2 |
| SC-REC-002 (Decisión de contratación sin ficha formal) | Reclutamiento y Selección | `BDD-REC-001`, sección 16.8.1 |

El octavo (`@SC-ADP-003` "Autorización de salida a campo en cascada") quedó **retirado definitivamente** — colisionaba con el tag `@SC-ADP-003` vigente y más completo de `BDD-ADP-001`.

Además, el 01 de septiembre se crearon **8 escenarios Gherkin nuevos** para cerrar las 7 reglas que no tenían cobertura (identificadas en `BDD-KAIROS-TRACEABILITY.md` v1.8, sección 19): `@SC-CON-003` (BR-CON-002), `@SC-ALQ-006` (BR-ALQ-016), `@SC-DEV-005` (BR-DEV-006), `@SC-DEV-006` (BR-DEV-007), `@SC-DEV-007` (BR-DEV-011), `@SC-REC-003` (BR-REC-008), `@SC-ADP-004` (BR-ADP-001), `@SC-ADP-005` (BR-ADP-006) — todos viven en el `BDD-XXX-001` de su proceso.

### 16.1 Organización — aislamiento multiempresa (BR-ORG-002)

```
@SC-ORG-001
Feature: Aislamiento de datos entre empresas del grupo KAIROS

  @SC-ORG-001.01
  Scenario: Usuario ve solo los expedientes de su empresa asignada
    Given un usuario asignado únicamente a VeloxRent
    When consulta el listado de expedientes
    Then solo ve expedientes de VeloxRent
    And no ve expedientes de Casa del Auto, Motrix o RENOVA

  @SC-ORG-001.02
  Scenario: Intento de acceso cruzado sin asignación válida
    Given un usuario asignado únicamente a VeloxRent
    When intenta abrir un expediente de Motrix por URL o ID directo
    Then el sistema deniega el acceso
    And registra el intento en el historial de auditoría
```

### 16.7 Documentos (BR-DOC-002)

```
@SC-DOC-001
Feature: Una sola versión vigente por documento contractual

  @SC-DOC-001.01
  Scenario: Nueva versión reemplaza a la anterior
    Given una versión vigente de la Hoja de Políticas
    When se aprueba una nueva versión
    Then la versión anterior pasa a histórica
    And solo la nueva versión puede usarse en operaciones nuevas

  @SC-DOC-001.02
  Scenario: Intento de operar con una versión no vigente
    Given que existe una versión más reciente aprobada de un documento contractual
    When un usuario intenta generar un contrato con la versión anterior
    Then el sistema no lo permite
```

---

## 17. Requisitos no funcionales expresados como comportamiento

| ID | Expectativa observable | Criterio funcional | Procesos donde aplica |
| --- | --- | --- | --- |
| NFR-KAI-001 | Consistencia | Nunca se confirman dos reservas o alquileres solapados del mismo vehículo | Reserva, Alquiler |
| NFR-KAI-002 | Trazabilidad | Toda decisión crítica puede reconstruirse por actor, fecha y motivo | Todos |
| NFR-KAI-003 | Seguridad multiempresa | Un usuario de una empresa del grupo no accede a expedientes de otra sin asignación válida | Todos |
| NFR-KAI-004 | Recuperabilidad | Un reintento no duplica pago, reserva, alquiler ni expediente de personal | Reserva, Alquiler, Devolución, Reclutamiento |
| NFR-KAI-005 | Claridad de bloqueo | Un bloqueo del sistema indica al usuario la regla incumplida y la acción siguiente | Todos |
| NFR-KAI-006 | Accesibilidad | El flujo principal es operable con teclado y comunica errores sin depender solo del color | Todos |
| NFR-KAI-007 | Consistencia documental | No pueden coexistir dos versiones vigentes de un mismo documento contractual | Alquiler, Reserva |
| NFR-KAI-008 | Integridad de garantía | Un reembolso de garantía nunca se procesa con una incidencia abierta vinculada | Devolución |
| NFR-KAI-009 | Continuidad del personal | Cualquier usuario polivalente puede ejecutar los 3 procesos principales sin fricción por no ser "el titular" | Alquiler, Devolución, Reserva |

> ⚠️ **Distinción explícita, agregada 01 sep 2026 (hallazgo P0 #10 de la segunda auditoría):** existen **dos** conceptos distintos que no deben confundirse.
> 
> - **Horario operativo del negocio: 8:00 a.m. a 5:00 p.m., los 7 días, confirmado el 31 de agosto (OQ-SOL-007).** Es la ventana en la que el negocio necesita atender clientes — fuera de ese horario no se espera personal disponible.
> - **Disponibilidad técnica del ERP: 24×7, con objetivo de 99.9% mensual, aprobada por el SAD (NFR-004).** El sistema debe estar accesible todo el día, todos los días — incluye, por ejemplo, que un administrador revise un expediente fuera de horario, o que corran los jobs automáticos de la sección 9.9 de `BDD-DEV-001` (cobro de días de paralización).
> 
> **Si estos dos términos no se distinguen, el SDD y el SAD podrían interpretarse erróneamente como que el sistema solo debe estar disponible en horario comercial — no es así.** Ver el detalle técnico completo en `SDD-KAIROS-TRANSVERSAL.md`, secciones 4.1, 9.3 y 19.

Las métricas técnicas de latencia, disponibilidad, RPO y RTO se refinan en `SDD-KAIROS-TRANSVERSAL.md` (sección 19).

---

## 18. Trazabilidad, por proceso

Ver `BDD-KAIROS-TRACEABILITY.md` (v1.8, actualizada el 01 sep 2026 con la migración, los escenarios nuevos y la corrección del conteo de Reserva).

---

## 19. Preguntas abiertas y deuda de decisión — resumen consolidado (corregido 01 sep 2026)

> ⚠️ La versión anterior de esta sección declaraba 5 preguntas `PENDIENTE`. Verificado contra el estado real de cada `BDD-XXX-001` al 01 sep 2026: **solo 1 sigue genuinamente abierta.**

| Proceso | Pregunta | Estado real verificado (01 sep) |
| --- | --- | --- |
| Devolución | OQ-009 — tabla técnica de daños | ✅ `RESUELTO` (31 ago) — no existe tabla técnica, por diseño. Ver `BDD-DEV-001`, BR-DEV-006 |
| Devolución | OQ-DEV-101 — SLA de descuento de Gerencia | ⚠️ **Sigue **`PENDIENTE` — sin plazo formal, aunque con mecanismo alternativo documentado (BR-DEV-011, cobro de días de paralización) |
| Devolución | OQ-DEV-102 — rehabilitación del semáforo | ✅ `RESUELTO` (31 ago) — sin rehabilitación, por empresa con visibilidad de grupo. Ver `BDD-DEV-001`, BR-DEV-008, y sección 10.10 de este documento |
| Consulta | OQ-CON-101 — validación formal de Consulta virtual | ✅ `RESUELTO` (02 sep 2026) — **Fiorella confirmó la validación formal del flujo de Consulta virtual.** Ya no queda en estado informal — ver `BDD-CON-001`, sección 19.3, actualizada |
| Reserva | OQ-RES-105 — flexibilidad de fecha | ✅ `RESUELTO` (31 ago) — regla tajante confirmada, sin excepciones. Ver `BDD-RES-001`, BR-RES-003 |
| Administración de Personal | OQ-ADP-102 — 4to nivel de autorización | ✅ `RESUELTO` (31 ago, revierte resolución parcial del 27 ago) — no se automatiza. Ver `BDD-ADP-001`, BR-ADP-004 |
| **Cliente (transversal)** | **OQ-CLI-101 — para clientes extranjeros, ¿pasaporte y carnet de extranjería son alternativos o pueden ser simultáneamente obligatorios?** | ✅ `RESUELTO` (02 sep 2026) — **Son alternativos: cualquiera de los dos es suficiente, nunca se exigen los 2 al mismo tiempo.** Lo que sí es obligatorio siempre, sin excepción, es la licencia de conducir válida. Ver `DAT-CLI-005`/`DAT-CLI-006` (sección 7) actualizados |

### 19.0 Nota sobre el conteo de preguntas funcionales (actualizada 02 sep 2026)

En la reunión del 02 de septiembre, Fiorella cerró las 2 preguntas funcionales que quedaban abiertas: `OQ-DEV-101` (confirmado que no hay ni debe haber un plazo fijo, es variable por diseño) y `OQ-CLI-101` (pasaporte/carnet son alternativos). **A partir de esta versión, no queda ninguna pregunta funcional de negocio abierta en el BDD.**

### 19.1 Nota de clasificación — OQ-CON-101 (hallazgo #6 de la auditoría, 01 sep)

La auditoría señaló que `RESUELTO informal` puede sugerir una aprobación funcional completa que no ocurrió. Se adopta la clasificación recomendada: `VALIDADO OPERATIVAMENTE — PENDIENTE DE FIRMA FORMAL`. Fiorella confirmó verbalmente que el flujo de Consulta virtual está validado, pero aclaró explícitamente que lo revisó rápido por celular sin detalle punto por punto, y delegó la validación formal a Russbel. Se puede operar sobre esta base (no bloquea el diseño ni la implementación), pero no debe presentarse como una aprobación de negocio firmada — falta ese paso final, no el contenido.

### 19.2 Tres categorías de pendientes — no confundir (agregado 01 sep, hallazgo P0 #7)

> La segunda auditoría independiente señaló que "solo 1 pregunta pendiente" simplifica de más. Hay 3 tipos de pendiente, con implicaciones distintas:

| Categoría | Qué incluye | Bloquea |
| --- | --- | --- |
| **Pregunta funcional abierta** | OQ-DEV-101 (SLA de descuento de Gerencia) | El diseño puede avanzar con el mecanismo alternativo ya documentado (BR-DEV-011); no bloquea SDD/TDD |
| **Aprobación formal pendiente** | OQ-CON-101 (Consulta virtual validada operativamente, sin firma formal) | No bloquea el diseño ni la implementación; sí bloquea que se declare "aprobado" en el sentido estricto |
| **Bloqueo legal** | Aceptación remota, privacidad, evidencia, retención (sección 22, criterio 4) | Bloquea la **aprobación final del BDD**, la implementación definitiva de aceptación remota, el diseño final de conservación de evidencias, y la liberación a producción de esos comportamientos específicos — no bloquea seguir construyendo SDD/TDD sobre supuestos provisionales |

**Resultado preciso (actualizado 02 sep):** de todas las preguntas de negocio tratadas desde el 31 de agosto, **ninguna sigue como pregunta funcional abierta** — las 2 últimas (`OQ-DEV-101` y `OQ-CLI-101`) se cerraron el 02 de septiembre. `OQ-CON-101` (Consulta virtual) también se resolvió formalmente el mismo día — ya no es solo una aprobación operativa pendiente. **Lo único que sigue abierto es el bloqueo legal transversal** de la sección 22 (aceptación remota, evidencia, privacidad) — y ese depende de que exista un responsable Legal asignado, no de más preguntas a Fiorella.

### 19.3 Recomendación de arquitectura — matriz notarial no determinística (agregada 02 sep, hallazgo #6)

> La matriz notarial (`BDD-ALQ-001`, sección 10.1) usa expresiones como "vehículo de menor costo/riesgo" y "bajo consulta" que no son directamente codificables sin parametrización. El SDD puede avanzar sobre esta base, pero **no debería convertir estas expresiones en código rígido**. Se recomienda definir, antes de implementar `NotarialPolicy` (ver `SDD-ALQ-001`): (1) catálogo de vehículos que siempre exigen notaría; (2) catálogo de vehículos elegibles para tercera vía; (3) quién mantiene esos catálogos; (4) vigencia de la configuración; (5) evidencia de aprobación de cada cambio; (6) tratamiento cuando un vehículo nuevo todavía no está clasificado en ningún catálogo.

---

## 20. Riesgos funcionales

> ✅ **Restaurado 02 sep 2026 (hallazgo P0 #4 de la tercera auditoría):** los 10 riesgos originales, que quedaban dependiendo de "la versión previa", se reincorporan aquí directamente, con la misma actualización de redacción que ya se hizo en la fila de BR-DEV-006 en `BDD-DEV-001` (ya no "hasta que se reciba la tabla", porque se confirmó que esa tabla no existe por diseño).

| Riesgo | Probabilidad | Impacto | Mitigación funcional | Proceso |
| --- | --- | --- | --- | --- |
| Doble reserva o doble alquiler del mismo vehículo | Media | Crítico | Invariante de disponibilidad (NFR-KAI-001) y escenario de concurrencia obligatorio | Reserva, Alquiler |
| Pago falso o duplicado | Media | Alto | Validación financiera manual (hoy) + referencia no reutilizable | Reserva, Alquiler |
| Cliente pierde S/300 sin entender por qué (no existe reprogramación) | Media | Medio | Comunicar explícitamente en la aceptación de la reserva que cualquier cambio de fecha/hora/vehículo pierde el monto — BR-RES-003 | Reserva |
| Venta de vehículo con reserva o alquiler activo | Baja/Media | Alto | Bloqueo preventivo (O-16) — hoy existe ruta de resolución pero no prevención automática | Reserva, Alquiler |
| Excepción notarial aprobada sin criterios completos | Media | Crítico | Validación de los 3 criterios de la tercera vía antes de habilitar la opción (BR-ALQ-004) | Alquiler |
| Cliente marcado en rojo/ámbar sin evidencia suficiente | Baja | Alto | Evento de auditoría obligatorio para clasificación de cliente | Alquiler, Devolución |
| Daño técnico sin monto interno calculable, evaluación caso a caso | Media | Medio | Registrar evaluación mediante el informe individual de Motrix, con referencia obligatoria (BR-DEV-006) — **ya no es un riesgo de "tabla pendiente"; es el diseño confirmado, el riesgo real es la dependencia operativa de un tercero externo (Motrix) sin integración técnica** | Devolución |
| Recordatorio de devolución omitido por personal nuevo | Alta (ya ocurre hoy, P-33) | Medio | Alerta/recordatorio automático en el sistema, no dependiente de que el personal se acuerde (O-31) | Devolución |
| Selección de personal sin respaldo si Fiorella no está disponible | Alta (ya documentado, PR-RRHH-01) | Alto | Definir un segundo responsable de respaldo (OR-RRHH-02) | Reclutamiento |
| Evaluación de Desempeño se diseña en el sistema pero nunca se usa (como ha pasado hasta hoy) | Media | Bajo (no crítico para MVP) | Mantenerla fuera del MVP explícitamente (sección 3.2), no fingir que es un flujo activo | Administración de Personal |
| Confusión entre AS-IS real y Plan de Talento Humano formal al construir el sistema | Media | Alto | Mantener ambas capas separadas y explícitas en toda la documentación | Reclutamiento, Administración de Personal |
| El cliente no entiende que el cobro de días de paralización (BR-DEV-011, nueva) es distinto del monto del daño mismo | Media | Medio | Notificación explícita del plazo de 24h y de la consecuencia de no responder, desde el primer aviso tras la devolución | Devolución |

---

## 21. Datos de prueba funcionales mínimos, por proceso

Sin cambios — ver cada `BDD-XXX-001`.

---

## 22. Criterios de aceptación del documento

El documento puede aprobarse cuando:

1. El dueño del proceso confirma inicio, fin, pasos y actores de cada uno de los 6 procesos — Fiorella/José, roles confirmados.
2. Operaciones valida los flujos normal, alternativos y excepcionales — Fiorella/José.
3. Finanzas valida pago, correcciones, cancelaciones y reembolsos — Fiorella cubre el rol.
4. Legal valida aceptación remota, privacidad, evidencia y retención — **actualizado 04 sep 2026: el usuario decidió no asignar un responsable Legal por el momento**, considerando suficiente la validación formal ya dada por el negocio (Fiorella/José como Gerencia). Ya no es `BLOQUEANTE`, es una decisión tomada — pendiente solo la cláusula de privacidad de datos (a proponer a Fiorella).
5. Producto aprueba alcance, exclusiones y preguntas resueltas — **Sponsor asignado 02 sep 2026: Fiorella.**
6. UX confirma que los datos y decisiones permiten diseñar las interacciones — **rol asignado 03 sep 2026: Eder Ramos.**
7. QA confirma cobertura positiva, negativa, límites y contingencias — **rol asignado 03 sep 2026: Eder Ramos.**
8. Cada regla crítica tiene al menos un escenario verificable — **verificado 01 sep: las 12 reglas **`Crítica`** (no 11) tienen cobertura en la sección 16 de este documento o en el **`BDD-XXX-001`** correspondiente.**
9. Cada dato obligatorio tiene propósito, condición y regla de validación — cumplido.
10. No existen contradicciones entre flujo, reglas, estados y escenarios — **Cumplido (corregido 02 sep, hallazgo P0 #7):** no se identifican contradicciones conocidas entre flujo, reglas, estados y escenarios. La colisión de ID (`@SC-ADP-003`) y la migración de los 7 escenarios a sus archivos de proceso fueron resueltas el 01 de septiembre de 2026 — ya no quedan pendientes.
11. Las preguntas bloqueantes están resueltas o explícitamente excluidas del release — **actualizado 03 sep: no queda ninguna pregunta de negocio abierta** (sección 19, corregida en sesiones posteriores a este checklist).
12. Existe trazabilidad desde necesidad hasta escenario de aceptación — **reconstruida 01 sep en **`BDD-KAIROS-TRACEABILITY.md`**, actualizada a v1.11 (79 escenarios) el 03 sep.** Las 12 reglas `Crítica` tienen las 12 cobertura directa. De las reglas `Alta`, 3 (BR-DEV-005, BR-DEV-009, BR-REC-006) tienen solo cobertura indirecta o quedan excluidas del MVP — no es una afirmación absoluta de "cero huecos en críticas y altas", es cobertura completa en críticas y prácticamente completa en altas, con las 3 excepciones documentadas en la sección 19 de la Trazabilidad.

### 22.1 Firmas funcionales

> ✅ **Actualizado 04 sep 2026:** esta tabla estaba desactualizada desde su creación — seguía mostrando Producto, UX y QA como roles vacantes pese a que Fiorella (02 sep) y Eder Ramos (03 sep) ya los cubren. Se corrige junto con la decisión del usuario del 04 sep: **no es necesaria la firma formal** — la documentación se considera aprobada con las decisiones y asignaciones ya registradas.

| Rol | Nombre | Decisión | Fecha | Observaciones |
| --- | --- | --- | --- | --- |
| Dueño del proceso | Fiorella / José Pariona | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | — | — |
| Producto | **Fiorella (Sponsor)** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 02 sep 2026 | Antes vacante — corregido 04 sep, esta fila nunca se había actualizado |
| Operaciones | Fiorella / José Pariona | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | — | — |
| Finanzas | Fiorella | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | — | — |
| Legal | **No se asignará por el momento** | `CONFIRMADO_NEGOCIO` (decisión, no vacío) | 04 sep 2026 | El usuario decidió no asignar un responsable Legal — considera suficiente la validación formal ya dada por el negocio |
| UX | **Eder Ramos** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 03 sep 2026 | Antes vacante — corregido 04 sep, esta fila nunca se había actualizado |
| QA | **Eder Ramos** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 03 sep 2026 | Antes vacante — corregido 04 sep, esta fila nunca se había actualizado |

---

## 23. Checklist de calidad 9-10

| Dimensión | Evidencia en el documento | Resultado |
| --- | --- | --- |
| Objetivo y alcance | Secciones 2-3 | Cumple |
| Actores y responsabilidades | Sección 5 | Cumple |
| Flujo de extremo a extremo por proceso | Sección 7 (en cada `BDD-XXX-001`) | Cumple |
| Información funcional por proceso | Sección 8 (en cada `BDD-XXX-001`) | Cumple |
| Reglas identificables | Sección 9 (transversal, 12 reglas) + 6 procesos | Cumple — **70 reglas totales verificadas (12 transversales + 5 Consulta + 9 Reserva + 16 Alquiler + 11 Devolución + 9 Reclutamiento + 8 Administración de Personal)** |
| Reglas críticas | — | **12 reglas verificadas como **`Crítica`: BR-ORG-002, BR-DOC-002, BR-CON-003, BR-RES-003, BR-RES-007, BR-ALQ-002, BR-ALQ-005, BR-ALQ-013, BR-DEV-001, BR-DEV-002, BR-DEV-007, BR-DEV-008 |
| Decisiones complejas (matrices) | Sección 9 (alcolímetro) y 10.10 (semáforo) | Cumple — sección 10.10 ya no es `PROPUESTO` |
| Estados y transiciones por proceso | Sección 10.1 (invariantes transversales) + sección 11.X de cada `BDD-XXX-001` (máquinas de estado propias) | Cumple |
| Excepciones/contingencias por proceso | Sección 11 (principio transversal) + sección 12.X de cada `BDD-XXX-001` | Cumple |
| Comunicaciones/evidencias por proceso | Secciones 12-13 (notificaciones y evidencias, transversal) | Cumple |
| Privacidad/acceso | Sección 14 | Cumple |
| Escenarios verificables | Sección 16 (transversal) + 6 procesos | **66 escenarios verificados en total** (4 transversales + 6 Consulta + 11 Reserva + 17 Alquiler + 15 Devolución + 5 Reclutamiento + 8 Administración de Personal — corregido 01 sep, faltaba contar `@SC-RES-005.02`), sin colisiones de ID; las 12 reglas críticas tienen cobertura directa, 3 reglas altas tienen cobertura solo indirecta o exclusión justificada (ver sección 19 de la Trazabilidad) |
| Comportamientos no funcionales | Sección 17 | Cumple |
| Trazabilidad por proceso | `BDD-KAIROS-TRACEABILITY.md` v1.8 | Cumple — reconstruida con IDs reales; trazabilidad completa para reglas críticas y principales, con ausencias justificadas y deuda residual explícitamente clasificada (ya no se afirma "sin celdas huérfanas" de forma absoluta) |
| Incertidumbre visible (OQ) | Sección 19 | Cumple — 1 pregunta funcional abierta (OQ-DEV-101), 1 aprobación formal pendiente (OQ-CON-101) y el bloqueo legal transversal, las 3 categorías diferenciadas explícitamente (sección 19.2) |
| Riesgos y pruebas | Secciones 20-21 | Cumple |
| Gobernanza y aprobación | Sección 22 | Cumple en estructura; firmas pendientes de las personas asignadas |
| **Baseline coordinado** | Sección 0 (manifiesto, nuevo) | **Cumple — corrige el hallazgo bloqueante #4 de la auditoría del 01 sep** |

**Evaluación (01 sep 2026, tras la segunda corrección):** cobertura estructural completa para los 6 procesos, con conteos verificados línea por línea (no estimados): **70 reglas, 12 críticas, 66 escenarios**. De las 6 preguntas de negocio tratadas en la reunión del 31 de agosto, 5 quedaron resueltas; queda 1 pregunta funcional abierta (OQ-DEV-101), 1 aprobación formal pendiente (OQ-CON-101), y el bloqueo legal transversal ya documentado (sección 22) — ninguno de los tres es bloqueante para seguir construyendo SDD/TDD. Persisten como condición de aprobación formal: firmas de Producto, Legal, UX y QA, y la asignación de 3 roles del proyecto (Legal, QA, Sponsor/Product Owner). Según la segunda auditoría independiente, corregidos estos 8 hallazgos la calificación esperada es de **9.2 a 9.4/10** como BDD funcional completo — el contenido ya estaba mayormente ahí; lo que faltaba era restaurar el contenido normativo perdido y corregir los conteos.

---

## Estado final del documento (corregido 01 sep 2026)

El documento presenta cobertura estructural completa para los 6 procesos y queda en estado **Candidato para revisión funcional**. No está aprobado. Avances desde la última síntesis:

- De 6 preguntas de negocio revisadas en la reunión del 31 de agosto, 5 quedaron `RESUELTO`. Queda 1 pregunta funcional abierta (**OQ-DEV-101**, sin SLA formal de Gerencia, con mecanismo alternativo ya documentado), 1 aprobación formal pendiente (**OQ-CON-101**), y el bloqueo legal transversal (aceptación remota, privacidad, evidencia, retención) — ver la distinción completa en la sección 19.2.
- Persisten: validación de Producto, UX y QA; la matriz notarial, que no es completamente determinística; firmas funcionales (sección 22.1); y 3 roles del proyecto sin asignar (Legal, QA, Sponsor/Product Owner).
- **Corregido 01 sep:** este documento, la matriz de trazabilidad y el resumen ejecutivo ya no contradicen el contenido vigente de los 4 procesos actualizados el 31 de agosto. Las secciones 5-15, que habían quedado como referencia vacía, fueron restauradas con contenido normativo real.
- **Sobre **`ADR-008`** del SAD (VehicleHold), aclarado 01 sep:** el `TDD-RES-001` de este proyecto ya está corregido — implementa correctamente la regla vigente confirmada por Fiorella (bloqueo atómico, sin hold previo) y no la propuesta alternativa de 10 minutos. **Esa corrección resuelve la implementación de KAIROS, pero no cierra por sí sola el **`ADR-008`** como documento** — esa decisión sigue formalmente abierta a nivel del SAD (`BLOQUEANTE_PARCIAL`) hasta que el Tech Lead haga una de estas tres cosas explícitamente: retirar la propuesta del `VehicleHold` del SAD; aprobarla como mecanismo puramente técnico que no cambia la promesa funcional (y entonces actualizar BDD/SDD en consecuencia); o mantener el `ADR-008` bloqueado sin implementarlo, tal como está hoy. Ninguna de las tres debe darse por hecha silenciosamente — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 25.1, para el detalle completo de esta decisión pendiente.

Puede utilizarse para continuar el SDD y el TDD bajo los supuestos ya trazados. Ninguna decisión pendiente debe implementarse como regla confirmada sin verificar primero contra el `BDD-XXX-001` del proceso correspondiente — este documento transversal orienta, pero no sustituye esa verificación.
