# BDD — 07 Trazabilidad

# BDD-KAIROS-TRACEABILITY — Matriz de trazabilidad consolidada

**Estado:** APROBADO — versión base (usuario, 18 oct 2026; cambios posteriores se gestionan como mejoras documentadas)

**Código:** BDD-KAIROS-MVP-002 / TRACEABILITY **Versión:** 1.11 (actualizada 03 sep 2026 — 76→79 escenarios: BR-RES-002 y EX-RES-005 nuevas; corrige 2 filas de Reserva desactualizadas — BR-RES-005 ya tenía escenario desde el 02 sep y esta tabla seguía diciendo que no) **Contenido:** Trazabilidad completa (necesidad → paso → dato → regla → escenario `@SC-*` → resultado → fuente → estado) de los 6 procesos.

> Versión 1.6 corrigió los 7 hallazgos de la primera auditoría independiente. La versión 1.7 migró y creó escenarios Gherkin nuevos. La versión 1.8 corrigió el conteo de Reserva y el título "sin celdas huérfanas". **Esta versión 1.9 corrige el hallazgo técnico más importante de una tercera auditoría:** la matriz solo trazaba 47 de las 70 reglas — faltaban 23, principalmente porque nunca existió una sección transversal propia (nueva sección 18.0, 12 reglas) y porque 11 reglas de proceso simples, sin rama de decisión, se habían omitido al construir las tablas. Se agregan las 23, todas con al menos una fila — las que no tienen escenario Gherkin dedicado lo declaran explícitamente con su justificación. También se corrige la introducción de la sección 19 (contradecía su propia tabla) y se aclara la propiedad cruzada del "aviso tardío de choque" entre Alquiler y Devolución.
> 
> Fuente de cada fila: ver el `BDD-XXX-001` del proceso correspondiente. Este documento es una vista de trazabilidad, no autoritativa.

---

## 18.0 Transversal (12 reglas — nueva sección, hallazgo P0 #2 de la tercera auditoría)

> ✅ **Agregada 02 sep 2026.** Las 12 reglas transversales (`BR-ORG-*`, `BR-INS-*`, `BR-DOC-*`) nunca tuvieron su propia sección en esta matriz — 5 aparecían dispersas en las tablas de proceso por su relación indirecta, y 7 no aparecían en absoluto. Se consolidan aquí las 12.

| Necesidad | Paso | Dato | Regla | Escenario `@SC-*` | Resultado esperado | Fuente | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Agrupar las 4 empresas de KAIROS | — | — | BR-ORG-001 | — (sin escenario dedicado — regla estructural simple) | Identificación de empresa en cada registro | SRC-DL-001 | `CONFIRMADO` |
| Aislar datos entre empresas | — | — | BR-ORG-002 | `@SC-ORG-001.01`, `@SC-ORG-001.02` | Usuario solo ve expedientes de su empresa asignada | SRC-DL-001 (18 ago) | `CONFIRMADO` |
| Personal polivalente en los 3 procesos principales | — | — | BR-ORG-003 | — (sin escenario dedicado — regla de continuidad, no de decisión) | Cualquier Administrador cubre Alquiler/Devolución/Reserva | SRC-ALQ-001 (7 ago) | `CONFIRMADO` |
| Tiempo mínimo de inspección | ALQ-P07, DEV-P04 | — | BR-INS-001 | — (sin escenario dedicado — estándar de referencia, sin rama condicional) | 30 min técnicos + 15 min documentarios | SRC-ALQ-001 (14 ago) | `CONFIRMADO` |
| 3 videos independientes del checklist | ALQ-P07 | DAT-ALQ-007 | BR-INS-002 | `@SC-INS-001` cubre el alcolímetro; el conteo de videos no tiene escenario propio — cubierto por validación de campo | Interior, exterior, instrucciones al cliente | SRC-DL-001 (19 ago) | `CONFIRMADO` |
| Duración de referencia de cada video (\~7 min) | ALQ-P07 | DAT-ALQ-007 | BR-INS-003 | — (sin escenario dedicado — estándar práctico, no mínimo estrictamente verificable) | \~7 min por video | SRC-DL-001 (19 ago) | `CONFIRMADO` |
| Evidencia fotográfica mínima | ALQ-P07 | DAT-ALQ-006 | BR-INS-004 | `@SC-INS-002.01`, `@SC-INS-002.02` | 35 fotos (5 documentos + 29 vehículo) | SRC-DL-001 (17 ago) | `CONFIRMADO` |
| Distinción FIV vs. FCKE | ALQ-P07, DEV-P04 | — | BR-INS-005 | — (sin escenario dedicado — regla de definición de formato) | FIV solo presencia del kit; FCKE presencia+estado+vencimiento | SRC-DL-001 (17 ago) | `CONFIRMADO` |
| Inspección corta requiere excepción explícita | ALQ-P07 | — | BR-INS-006 | — (sin escenario dedicado — cubierta por el flujo de autorización de excepciones) | Continúa solo con autorización y motivo registrado | SRC-DL-001 (21, 27 ago) | `CONFIRMADO` — `RESUELTO` OQ-004 |
| Expediente con partida doble | ALQ-P11 | — | BR-DOC-001 | — (sin escenario dedicado — regla operativa de archivo) | Conservación física y digital | SRC-ALQ-001 (14 ago) | `CONFIRMADO` |
| Una sola versión vigente por documento | — | — | BR-DOC-002 | `@SC-DOC-001.01`, `@SC-DOC-001.02` | Versión anterior pasa a histórica al aprobar una nueva | SRC-NFR-001 (7 ago) | `CONFIRMADO` |
| Plantilla única de contrato por combinación | ALQ-P05 | — | BR-DOC-003 | `@SC-ALQ-003` cubre la notaría "sorpresa" sobre esa plantilla, no la regla de plantilla única en sí — sin escenario dedicado | Solo varían placa, precio y garantía | SRC-DL-001 (24 ago) | `CONFIRMADO` |

---

## 18.1 Alquiler (16 reglas, todas trazadas — hallazgo P0 #2 y #3)

| Necesidad | Paso | Dato | Regla | Escenario `@SC-*` | Resultado esperado | Fuente | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Verificar documentos según nacionalidad | ALQ-P02 | DAT-CLI-002, DAT-CLI-004 | BR-CON-004 | `@SC-CON-001.02`, `@SC-CON-001.03` (en `BDD-CON-001`) | Documentos válidos, o proceso cancelado | SRC-ALQ-001 | `CONFIRMADO` |
| Prueba de alcolímetro en la entrega | ALQ-P04 | DAT-ALQ-002 | BR-ALQ-005 | `@SC-INS-001.01`, `@SC-INS-001.02`, `@SC-INS-001.03` | Continúa, o se cancela de inmediato | SRC-ALQ-001 | `CONFIRMADO` |
| Evaluar condición de notaría | ALQ-P08 | DAT-ALQ-003, DAT-ALQ-004 | BR-ALQ-003, BR-ALQ-004 | `@SC-ALQ-002.01` a `@SC-ALQ-002.04` | `MANDATORY`/`DOUBLE_DEPOSIT`/`THIRD_PATH_ELIGIBLE`/`MANUAL_REVIEW` | SRC-DL-001 (19 ago) | `CONFIRMADO` |
| La empresa paga el trámite notarial | ALQ-P09 | — | BR-ALQ-002 | `@SC-ALQ-001.01`, `@SC-ALQ-001.02` | Costo nunca se traslada al cliente | SRC-DL-001 (13 ago) | `CONFIRMADO` |
| Notaría no se informa hasta el final | ALQ-P09 | — | BR-ALQ-009 | `@SC-ALQ-003.01`, `@SC-ALQ-003.02` | Cliente acepta y firma, o cierra sin contrato | SRC-DL-001 (27 ago) | `CONFIRMADO` |
| Checklist de salida con evidencia mínima | ALQ-P07 | DAT-ALQ-006, DAT-ALQ-007 | BR-INS-002, BR-INS-003, BR-INS-004 | `@SC-INS-002.01`, `@SC-INS-002.02` | Evidencia completa (35 fotos + 3 videos), o entrega bloqueada | SRC-DL-001 (17, 19 ago) | `CONFIRMADO` |
| Incumplimiento de los 4 requisitos de ampliación | ALQ-P12-P15 (excepción EX-ALQ-003) | DAT-ALQ-009 | BR-ALQ-012, BR-ALQ-013 | `@SC-ALQ-004.01` | Falta grave, garantía retenida, cliente rojo | SRC-ALQ-001, Fase 4b | `CONFIRMADO` |
| Aviso tardío de choque | — (excepción EX-DEV-002) | — | — | `@SC-ALQ-005.01` | Cargos aplicados igualmente | SRC-ALQ-001 | `CONFIRMADO` — **propiedad aclarada 02 sep (hallazgo #9):** el choque ocurre durante el Alquiler (de ahí vive el escenario `@SC-ALQ-005` en `BDD-ALQ-001`), pero su excepción está codificada como `EX-DEV-002` porque la resolución final del cargo ocurre en Devolución. Se declara explícitamente: **Devolución es propietaria de la resolución del cargo; Alquiler es propietario de la notificación y el plazo de aviso (15/30 min)** — no es un error, es una regla que cruza 2 procesos con responsabilidades distintas |
| RENIEC/MTC no responde | — (excepción EX-ALQ-004) | — | BR-ALQ-016 | `@SC-ALQ-006.01`, `@SC-ALQ-006.02` | MTC: bloqueo sin excepción. RENIEC: excepción solo con Gerencia | SRC-DL-001 (27 ago) | `CONFIRMADO` — `RESUELTO` OQ-ALQ-101 |
| Definir cliente antiguo | ALQ-P08 | DAT-ALQ-004 | BR-ALQ-001 | `@SC-ALQ-002.03` usa esta definición para la tercera vía — sin escenario dedicado solo para el conteo | Cliente antiguo = más de 2 alquileres previos | SRC-DL-001 (19 ago) | `CONFIRMADO` |
| Kilometraje incluido del plan Normal | ALQ-P01 | DAT-ALQ-001 | BR-ALQ-006 | — (sin escenario dedicado — parámetro de tarifario, no rama de decisión) | 200 km incluidos por cada 24h | SRC-ALQ-001, sección 7 | `CONFIRMADO` |
| Velocidad máxima contractual | — | — | BR-ALQ-007 | — (sin escenario dedicado — regla contractual simple, cubierta por validación de campo) | 100 km/h general | SRC-ALQ-001 (14 ago) | `CONFIRMADO` |
| Restricción geográfica del vehículo | — | — | BR-ALQ-008 | — (sin escenario dedicado — regla contractual simple) | Circulación solo dentro de Ayacucho salvo autorización | SRC-ALQ-001, sección 7 | `CONFIRMADO` |
| GPS obligatorio antes de alquilar | — | — | BR-ALQ-010 | — (sin escenario dedicado — precondición de flota, no de la operación de alquiler) | Vehículo nuevo con GPS activo | SRC-ALQ-001, sección 7 | `CONFIRMADO` |
| Medios de pago aceptados | ALQ-P06 | — | BR-ALQ-011 | — (sin escenario dedicado — cubierta por validación de campo del método de pago) | Todos los medios; pago por agente requiere verificación adicional | SRC-DL-001 (4 ago) | `CONFIRMADO` |
| Autorización de respaldo en decisiones menores | — | — | BR-ALQ-014 | — (sin escenario dedicado — mismo patrón de cascada que `@SC-ADP-003` en Administración de Personal, sin Gherkin propio en Alquiler) | Cecilia u otro designado autoriza si Fiorella/José no responden en 5 min | SRC-ALQ-001 (17 ago) | `CONFIRMADO` |
| Variantes de conductor | ALQ-P03 | — | BR-ALQ-015 | — (sin escenario dedicado — catálogo de variantes, sin rama condicional propia) | Con conductor de empresa, sin conductor propio, o con conductor propio autorizado | SRC-ALQ-001, sección 7 | `CONFIRMADO` |

---

## 18.2 Devolución (11 reglas, todas trazadas — hallazgo P0 #2 y #3)

| Necesidad | Paso | Dato | Regla | Escenario `@SC-*` | Resultado esperado | Fuente | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Recordatorio de devolución | DEV-P01 | DAT-DEV-001 | BR-DEV-004 | — (sin escenario Gherkin — regla `Media`) | Cliente confirma hora | SRC-DEV-001, paso 15 | `CONFIRMADO` |
| Alcolímetro en la devolución | DEV-P03 | DAT-DEV-002 | BR-DEV-005 | — (sin escenario Gherkin — cubierta indirectamente por el flujo de recepción provisional) | Recepción provisional si desfavorable, deriva a Gerencia | SRC-DEV-001 (13 ago) | `CONFIRMADO` |
| Devolver garantía sin daños | DEV-P06 | — | BR-DEV-001 | `@SC-DEV-001.01`, `@SC-DEV-001.02` | Garantía liberada en un **máximo** de 24 horas naturales (no es tiempo mínimo de espera) | SRC-DL-001 (21 ago) | `CONFIRMADO` — `RESUELTO` OQ-006 |
| Daño grande suspende el plazo | DEV-P09 | — | BR-DEV-002 | `@SC-DEV-001.03` | Plazo de 24h no aplica, vehículo puede inmovilizarse | SRC-DEV-001, Fase 5b | `CONFIRMADO` |
| Evaluar daño estético vs. técnico | DEV-P05-P07 | DAT-DEV-003, DAT-DEV-004 | BR-DEV-006 | `@SC-DEV-005.01`, `@SC-DEV-005.02` **(nuevo, 01 sep)** | Estético: tarifario fijo (tabla 9.6.1). Técnico: informe individual de Motrix, sin tabla | SRC-DL-001 (17, 27, 31 ago) | `CONFIRMADO` — `RESUELTO` OQ-009 (31 ago) |
| Clasificar gravedad del daño | DEV-P08 | DAT-DEV-003 | BR-DEV-007 | `@SC-DEV-006.01` **(nuevo, 01 sep)** | Gravedad determinada por José Pariona (leve/moderado/grave) | SRC-DEV-001, Fase 5b | `CONFIRMADO` |
| Transición del semáforo de riesgo | — | DAT-CLI-016 | BR-DEV-008 | `@SC-DEV-002.01` a `@SC-DEV-002.04` | Escalamiento sin retroceso; por empresa, visible al grupo | SRC-DL-001 (4, 21, 31 ago) | `CONFIRMADO` — `RESUELTO` OQ-DEV-102 (31 ago) |
| Documento de responsabilidad en la devolución | DEV-P04 | DAT-DEV-005 | BR-DEV-009 | — (sin escenario Gherkin — cubierta indirectamente por `@SC-DEV-004`) | Respaldo legal ante la SAT | SRC-DEV-001, paso 17 | `CONFIRMADO` |
| Acta de devolución de garantía opcional | — | DAT-DEV-006 | BR-DEV-010 | `@SC-DEV-003.01`, `@SC-DEV-003.02` | Se emite solo a pedido del cliente | SRC-DL-001 (24 ago) | `CONFIRMADO` |
| Cobro de días de paralización | — (deriva de DEV-P07) | DAT-DEV-008 | BR-DEV-011 | `@SC-DEV-007.01`, `@SC-DEV-007.02` **(nuevo, 01 sep)** | Cargo adicional como alquiler, si transcurren \>24h sin respuesta del cliente a un daño técnico | SRC-DL-001 (31 ago) | `CONFIRMADO` — nueva regla, 31 ago |
| Titular ausente en la devolución | DEV-P04 (alternativo) | DAT-DEV-005, DAT-DEV-007 | — (excepción EX-DEV-001) | `@SC-DEV-004.01` | Evidencia reforzada, notificación formal al día siguiente | SRC-DEV-001, Fase 5b | `CONFIRMADO` |
| Tolerancia de devolución sin sanción | DEV-P01 | — | BR-DEV-003 | — (sin escenario dedicado — regla contractual simple, cubierta por validación de campo) | 30 minutos de tolerancia | SRC-ALQ-001, sección 7 | `CONFIRMADO` |

---

## 18.3 Consulta (5 reglas, todas trazadas — hallazgo P0 #2 y #3)

| Necesidad | Paso | Dato | Regla | Escenario `@SC-*` | Resultado esperado | Fuente | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Todo cliente pasa por Consulta | CON-P01 | — | BR-CON-003 | `@SC-CON-001.01` | Cliente recurrente no puede saltarse Consulta | SRC-DL-001 (21 ago) | `CONFIRMADO` |
| Verificar nacionalidad | CON-P05 | DAT-CON-002 | BR-CON-004 | `@SC-CON-001.02`, `@SC-CON-001.03` | Requisitos correctos según nacionalidad | SRC-CON-001 | `CONFIRMADO` |
| Destino condiciona el vehículo | CON-P04 | DAT-CON-003 | BR-CON-005 | — (sin escenario Gherkin — vacío reconocido para rutas mixtas, P-31) | Vehículo elegible determinado | SRC-ALQ-001 (10 ago) | `CONFIRMADO` con vacío reconocido |
| Mostrar vehículo según canal | CON-P07 | DAT-CON-006 | — | `@SC-CON-002.01` | Evidencia enviada (virtual) o exhibición en persona (presencial) | SRC-CON-001 | `CONFIRMADO` |
| Derivar o cerrar consulta | CON-P09 | DAT-CON-005 | BR-CON-002 | `@SC-CON-003.01`, `@SC-CON-003.02` **(nuevo, 01 sep)** | Conversión a Reserva/Alquiler, o cierre con motivo | SRC-CON-001 | `CONFIRMADO` |
| Validación de la modalidad virtual | — | — | — | — | Modalidad **validada operativamente, pendiente de firma formal** | SRC-DL-001 (31 ago) | `VALIDADO OPERATIVAMENTE — PENDIENTE DE FIRMA FORMAL` — `OQ-CON-101` |
| Consulta como proceso separado | CON-P01 | — | BR-CON-001 | `@SC-CON-001.01` usa esta separación como precondición — sin escenario dedicado solo para la separación en sí | Consulta no se confunde con Reserva/Alquiler/Devolución | SRC-DL-001 (19-21 ago) | `CONFIRMADO` |

---

## 18.4 Reserva (9 reglas, todas trazadas — hallazgo P0 #2 y #3)

| Necesidad | Paso | Dato | Regla | Escenario `@SC-*` | Resultado esperado | Fuente | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Determinar modalidad | RES-P03 | DAT-RES-001, DAT-RES-002 | BR-RES-005 | `@SC-RES-007.01`, `@SC-RES-007.02` (corregido 03 sep 2026 — esta fila decía "sin escenario Gherkin", pero el escenario existe en `BDD-RES-001` desde el 02 sep) | Modalidad presencial o remota correcta | SRC-DL-001 (18 ago) | `CONFIRMADO` |
| Pagar el monto de reserva vigente | RES-P09 | DAT-RES-003 | BR-RES-001 | `@SC-RES-001.01`, `@SC-RES-001.02` | Pago validado por el monto vigente (S/300 observado) | SRC-RES-001 | `CONFIRMADO` |
| La reserva nunca pasa por notaría | — | — | BR-RES-004 | `@SC-RES-002.01` | Bloqueo del sistema ante cualquier intento | SRC-RES-001 | `CONFIRMADO` |
| Modalidad remota completa | RES-P04, RES-P08 | DAT-RES-004, DAT-RES-005 | BR-RES-006 | `@SC-RES-003.01`, `@SC-RES-003.02` | Video 360° + documento de aceptación, ambos obligatorios | SRC-RES-001 | `CONFIRMADO` |
| Bloqueo atómico del vehículo | RES-P11 | DAT-RES-007 | BR-RES-009 | `@SC-RES-004.01`, `@SC-RES-004.02`, `@SC-RES-004.03` | Bloqueo solo si pago **y** documentos están completos a la vez | SRC-DL-001 (18, 27 ago) | `CONFIRMADO` — `RESUELTO` OQ-RES-101 |
| Cambiar fecha/hora/vehículo de una reserva confirmada | — (excepción EX-RES-002, EX-RES-004) | DAT-RES-007 | BR-RES-003 | `@SC-RES-005.01`, `@SC-RES-005.02` (2 escenarios — corregido 01 sep, antes se contaba solo 1) | Cancelación total, monto perdido — sin criterios de excepción | SRC-RES-001, sección 7; confirmado tajante 31 ago | `CONFIRMADO` — `RESUELTO` OQ-RES-105 (31 ago) |
| Venta de vehículo reservado | RES-P13-P16 | — | BR-RES-007 | `@SC-RES-006.01` | Alternativa aceptada, o cancelación con reembolso inmediato | SRC-RES-001, sección 3.1 | `CONFIRMADO` |
| No-show del cliente | — (excepción EX-RES-004) | — | BR-RES-003 | `@SC-RES-005.02` (mismo escenario cubre el caso real, 31 ago) | Pierde la reserva; compensación informal posterior no revierte la pérdida | SRC-DL-001 (31 ago) | `CONFIRMADO` |
| Bloqueo registrado interno y externo | RES-P11 | — | BR-RES-009 | Ver `@SC-RES-004` | Registro doble, no solo externo | SRC-DL-001 (18 ago) | `CONFIRMADO` |
| Reserva inicia un alquiler, monto se traslada a garantía | — | — | BR-RES-002 | `@SC-RES-008.01` (nuevo, 03 sep 2026 — cierra el gap "sin escenario dedicado") | Reserva concretada → Alquiler; monto de S/300 trasladado íntegro a la garantía | SRC-RES-001; confirmado por José y Fiorella el 03 sep 2026 | `CONFIRMADO` |
| Competencia entre 2 clientes por el mismo vehículo | RES-P09-P11 (excepción EX-RES-005) | — | BR-RES-009 | `@SC-RES-009.01`, `@SC-RES-009.02` (nuevos, 03 sep 2026) | Gana quien completa los 4 requisitos primero; al otro se le ofrece alternativa y, si no acepta, reembolso inmediato | SRC-DL-001 (03 sep, reuniones con José y Fiorella) | `CONFIRMADO` |
| Variantes de conductor de Alquiler aplican en Reserva | RES-P04 | — | BR-RES-008 | — (sin escenario dedicado — mismo catálogo que BR-ALQ-015, sin Gherkin propio en Reserva) | Con conductor de empresa, sin conductor propio, o con conductor propio autorizado | SRC-DL-001 (11 ago) | `CONFIRMADO` |

---

## 18.5 Reclutamiento y Selección (9 reglas, todas trazadas — hallazgo P0 #2 y #3)

| Necesidad | Paso | Dato | Regla | Escenario `@SC-*` | Resultado esperado | Fuente | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Detectar necesidad de personal | REC-P01 | DAT-REC-001 | BR-REC-008 | `@SC-REC-003.01`, `@SC-REC-003.02` **(nuevo, 01 sep)** | Necesidad registrada, 3 fuentes posibles | SRC-DL-001 (12 ago) | `CONFIRMADO` |
| Decidir contratación sin ficha formal | REC-P10 | DAT-REC-005 | BR-REC-003 | `@SC-REC-002.01` | Decisión registrada y justificada, exclusiva de Fiorella | SRC-REC-001, sección 2 | `CONFIRMADO` — `RESUELTO` OQ-REC-103, OQ-REC-104 |
| Personal mecánico se recluta distinto | REC-P03 | — | BR-REC-004 | `@SC-REC-001.02` | Institutos técnicos, no portales de empleo | SRC-REC-001, Fase 1 | `CONFIRMADO` |
| Periodo de prueba y paso a planilla | REC-P14, REC-P15 | DAT-REC-008 | BR-REC-005 | `@SC-REC-001.01` | Planilla al 4to mes si es positiva | SRC-REC-001, Fase 5 | `CONFIRMADO` |
| Plan de Talento Humano como meta | — | — | BR-REC-006 | — (sin escenario Gherkin — meta a Q1 2027, fuera del MVP) | Aplicación íntegra Q1 2027 | SRC-DL-001 (24, 27 ago) | `CONFIRMADO` — `RESUELTO` OQ-REC-101, OQ-REC-102 |
| Personal mecánico: contrato notariado | REC-P11 (variante) | — | BR-REC-009 | `@SC-REC-001.02` | Contrato interno notariado | SRC-REC-001, Fase especial | `CONFIRMADO` |
| Reclutamiento y Administración de Personal son procesos separados | — | — | BR-REC-001 | — (sin escenario dedicado — regla estructural, ver ADR-KAI-006 en el SDD) | Sin superposición de responsabilidades entre los 2 módulos | SRC-DL-001 (11 ago) | `CONFIRMADO` |
| Talento Humano aplica a las 4 empresas | — | — | BR-REC-002 | — (sin escenario dedicado — regla de alcance multiempresa) | Procesos corporativos comunes al grupo KAIROS | SRC-REC-001 | `CONFIRMADO` |
| Definición de "Gerencia y Subgerencia" en el Plan formal | — | — | BR-REC-007 | — (sin escenario dedicado — aclaración terminológica, no comportamiento del sistema) | Fiorella y José en su capacidad formal, no personas adicionales | SRC-DL-001 (24 ago) | `CONFIRMADO` |

---

## 18.6 Administración de Personal (8 reglas, todas trazadas — hallazgo P0 #2 y #3)

| Necesidad | Paso | Dato | Regla | Escenario `@SC-*` | Resultado esperado | Fuente | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Descuentos solo a fin de mes | ADP-P07, ADP-P08 | DAT-ADP-002, DAT-ADP-003 | BR-ADP-001 | `@SC-ADP-004.01`, `@SC-ADP-004.02` **(nuevo, 01 sep)** | Quincena íntegra, descuento a fin de mes | SRC-ADP-001, sección 3.4 | `CONFIRMADO` |
| Vacaciones de las 2 personas clave | ADP-P10 | DAT-ADP-004 | BR-ADP-002 | `@SC-ADP-001.01` | Nunca se superponen | SRC-ADP-001, sección 3.5 | `CONFIRMADO` |
| Autorizar salida a campo en cascada — sin 4to nivel | ADP-P13 | DAT-ADP-005, DAT-ADP-006 | BR-ADP-004 | `@SC-ADP-003.01` | Autorizada en nivel 1/2/3, o sin autorización — escalación manual fuera del sistema | SRC-ADP-001, sección 3.7; SRC-DL-001 (27, 31 ago) | `CONFIRMADO` — `RESUELTO` OQ-ADP-102 (31 ago) |
| Regreso tardío de campo | ADP-P14 | — | BR-ADP-005 | `@SC-ADP-002.01`, `@SC-ADP-002.02` | 1ra-3ra vez advertencia, 4ta observado | SRC-ADP-001, sección 3.7 | `CONFIRMADO` |
| Clasificación de salida (renuncia/despido) | ADP-P16, ADP-P17 | DAT-ADP-007 | BR-ADP-006 | `@SC-ADP-005.01`, `@SC-ADP-005.02` **(nuevo, 01 sep)** | Dispara Reclutamiento | SRC-ADP-001, sección 3.8; SRC-DL-001 (27 ago) | `CONFIRMADO` — `RESUELTO` OQ-ADP-103 |
| Evaluación de Desempeño (TO-BE) | — | DAT-ADP-008 | BR-ADP-007 | — (fuera del MVP, sin escenario) | A partir del 4to mes, semestral — nunca aplicado en la práctica | SRC-DL-001 (24, 27 ago) | `CONFIRMADO` — `RESUELTO` OQ-ADP-101 |
| Capacitación parcial real | — | DAT-ADP-009 | BR-ADP-008 | — (sin escenario Gherkin — práctica parcial informal, regla `Media`) | Talleres internos \~1h, desde el año pasado | SRC-DL-001 (24 ago) | `CONFIRMADO` |
| Autorización exclusiva de permisos | ADP-P06 | — | BR-ADP-003 | — (sin escenario dedicado — mismo patrón que BR-ALQ-014, cubierto por autorización de rol) | Solo Fiorella y José autorizan permisos o salidas antes de hora | SRC-ADP-001, sección 3.3 | `CONFIRMADO` |

---

## 19. Escenarios sin cobertura Gherkin (cerrada 02 sep 2026)

> ✅ **Las 8 reglas que quedaban sin escenario dedicado ya tienen uno.** Se cierran `BR-DEV-004` (`@SC-DEV-008`), `BR-DEV-005` (`@SC-DEV-009`), `BR-DEV-009` (`@SC-DEV-010`), `BR-CON-005` (`@SC-CON-004`), `BR-RES-005` (`@SC-RES-007`), `BR-REC-006` (`@SC-REC-004`, marcado `@R2` — meta Q1 2027, fuera del MVP), `BR-ADP-007` (`@SC-ADP-006`, marcado `@R2` — fuera del MVP), `BR-ADP-008` (`@SC-ADP-007`).

Las 12 reglas `Crítica` de la serie completa (BR-ORG-002, BR-DOC-002, BR-CON-003, BR-RES-003, BR-RES-007, BR-ALQ-002, BR-ALQ-005, BR-ALQ-013, BR-DEV-001, BR-DEV-002, BR-DEV-007, BR-DEV-008) tienen **las 12** al menos un escenario Gherkin verificable — cumple el criterio 8 de aprobación de `BDD-KAIROS-TRANSVERSAL.md`, sección 22. **Con el cierre de esta sección, las 70 reglas de la serie tienen ahora al menos un escenario Gherkin propio o una cobertura indirecta ya documentada — no queda ninguna regla sin al menos una de las dos.**

**Corregido 01 sep (segunda auditoría):** esto cubre las reglas `Crítica` sin excepción, pero **no** implica que toda regla `Alta` también tenga escenario dedicado — 3 reglas `Alta` de esta misma tabla (BR-DEV-005, BR-DEV-009, BR-REC-006) siguen sin uno, con cobertura solo indirecta o exclusión justificada del MVP. La afirmación correcta es: *todas las reglas críticas tienen cobertura directa; algunas reglas altas tienen cobertura indirecta o exclusión justificada* — no "ninguna regla crítica ni alta sin escenario".

---

## 20. Resumen numérico verificado (02 sep 2026, actualizado — 8 escenarios nuevos cierran la deuda Gherkin)

| Proceso | Reglas | Críticas | Escenarios `@SC-*` |
| --- | --- | --- | --- |
| Transversal (Organización, Inspección, Documentos) | 12 | 2 | 4 |
| Consulta | 5 | 1 | 8 |
| Reserva | 9 | 2 | 13 |
| Alquiler | 16 | 3 | 17 |
| Devolución | 11 | 4 | 18 |
| Reclutamiento y Selección | 9 | 0 | 6 |
| Administración de Personal | 8 | 0 | 10 |
| **Total** | **70** | **12** | **76** |

Conteo verificado línea por línea contra los 7 documentos vigentes al 02 de septiembre de 2026. Los escenarios suben de 66 a **76** (10 nuevos: `@SC-DEV-008/009/010`, `@SC-CON-004` con 2, `@SC-RES-007` con 2, `@SC-REC-004`, `@SC-ADP-006/007`), cerrando la deuda Gherkin que quedaba desde la sección 19.
