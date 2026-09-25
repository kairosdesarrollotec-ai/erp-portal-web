# BDD — 08 Resumen ejecutivo

# BDD-KAIROS-EXECUTIVE-SUMMARY — Resumen ejecutivo (vista derivada, no autoritativa)

**Código:** BDD-KAIROS-MVP-002 / EXECUTIVE-SUMMARY **Versión:** 1.19 (sincronizado 04 sep 2026, verificación final) **Naturaleza:** Este documento es una **vista derivada** para lectura rápida (Gerencia, stakeholders no técnicos). **No es fuente autoritativa** — ante cualquier diferencia, prevalece el documento del proceso correspondiente o `BDD-KAIROS-TRANSVERSAL.md`.

> Corregido 12 veces desde el 01 de septiembre: 2 rondas por auditorías independientes (desincronización, tareas ya completadas, conteos), 1 ronda por la restauración auténtica del Transversal contra su copia real, 1 ronda por respuestas directas de Fiorella y del Tech Lead a los inputs de negocio y arquitectura que quedaban pendientes (02 sep), 1 ronda por 2 respuestas de gobernanza de Fiorella el 03 sep (quién aprueba UAT y el presupuesto de planes productivos), 1 ronda por las respuestas de negocio de Reserva y el catálogo completo de Legal (2 reuniones separadas el 03 sep con José y Fiorella), 1 ronda por decisiones directas del usuario (resolvió 3 de las 4 preguntas de Legal, asignó a Eder Ramos como responsable de Datos/Seguridad/QA/DevOps), y 1 ronda final (esta) que retira el borrador de cláusula de privacidad — se propondrá primero a Fiorella — y confirma que no se asignará un responsable Legal por ahora, dando por suficiente la validación formal del negocio. **Con esta versión, no queda ninguna pregunta funcional de negocio abierta; de Legal solo queda la revisión de Fiorella sobre la cláusula de privacidad (todavía sin texto documentado); solo UX sigue sin rol asignado.** Fecha de baseline: 03 de septiembre de 2026.

---

## 1. Qué es esto

El ERP KAIROS/VeloxRent digitaliza 6 procesos: **Consulta, Reserva, Alquiler, Devolución** (núcleo de VeloxRent — alquiler de vehículos), y **Reclutamiento y Selección, Administración de Personal** (transversales a las 4 empresas del grupo: VeloxRent, Casa del Auto, Motrix, RENOVA).

## 2. Estructura de la documentación (serie completa) — con manifiesto de versión

| Documento | Contenido | Versión | Último cambio relevante |
| --- | --- | --- | --- |
| `BDD-KAIROS-TRANSVERSAL.md` | Control, alcance, glosario, actores, catálogo de Cliente, reglas transversales, NFR, privacidad, criterios de aceptación | **1.18** | 04 sep — corrige el propio manifiesto (fila de este Executive Summary, atrasada 5 versiones) |
| `BDD-CON-001` | Proceso de Consulta (presencial/virtual) | 1.8 | 02 sep |
| `BDD-RES-001` | Proceso de Reserva | **1.9** | 03 sep — BR-RES-002/009 confirmadas y ampliadas, `EX-RES-005` nueva |
| `BDD-ALQ-001` | Proceso de Alquiler (incluye notaría, inspección) | 1.7 | 02 sep |
| `BDD-DEV-001` | Proceso de Devolución (incluye garantía, daños) | 1.9 | 02 sep — `OQ-DEV-101` resuelta: sin plazo fijo, variable por diseño |
| `BDD-REC-001` | Proceso de Reclutamiento y Selección | 1.7 | 02 sep |
| `BDD-ADP-001` | Proceso de Administración de Personal | 1.9 | 02 sep — `BR-ADP-002` corregida de fondo: capacidad de área, no "2 personas clave" |
| `BDD-KAIROS-TRACEABILITY.md` | Trazabilidad completa: necesidad → paso → dato → regla → escenario, los 6 procesos | **1.11** | 03 sep — 76→79 escenarios |
| `BDD-KAIROS-EXECUTIVE-SUMMARY.md` | Este documento | **1.19** | 04 sep |

> El detalle completo del manifiesto de versión vive en `BDD-KAIROS-TRANSVERSAL.md`, sección 0.

## 3. Estado del proyecto (02 sep 2026)

**Candidato para revisión funcional. No aprobado.** Cobertura estructural completa para los 6 procesos.

**Cifras verificadas al 01 sep 2026** (no estimadas — conteo línea por línea contra los 7 documentos vigentes):

- **70 reglas de negocio** consolidadas (12 transversales + 58 específicas de proceso).
- **12 reglas de máxima prioridad** (`Crítica`).
- **79 escenarios de aceptación** (verificado 03 sep 2026 vía `BDD-KAIROS-TRACEABILITY.md`: 66 al 01 sep, 76 al cerrar la deuda Gherkin el 02 sep, 79 tras agregar BR-RES-002 y `EX-RES-005` el 03 sep), con cobertura directa para las 12 reglas críticas.

**Actualizado 02 sep:** Fiorella cerró directamente las 2 preguntas funcionales que quedaban (`OQ-DEV-101` y `OQ-CLI-101`) y confirmó formalmente `OQ-CON-101`. **Actualizado 03 sep:** las 5 preguntas de negocio sobre Reserva que seguían pendientes (tratamiento financiero de la garantía, reembolso, no-show, reserva reformulada, tiempo de atención) también se resolvieron, con José y Fiorella confirmando por separado. **Actualizado 03 sep (3ª ronda):** de las 8 preguntas de Legal, 6 ya están resueltas con decisiones directas del usuario y de Fiorella; solo queda 1 con contenido pendiente (privacidad de datos, no bloqueante) y 1 esperando ratificación formal de un abogado (tampoco bloqueante ahora). **No queda ninguna pregunta funcional de negocio ni de Legal que bloquee la documentación.** Ver sección 5.

## 4. Decisiones de negocio más importantes ya confirmadas

- **Reserva:** el monto de S/300 (parametrizable) no es reembolsable salvo que VeloxRent venda el vehículo reservado. No existe reprogramación — cualquier cambio de fecha/hora/vehículo cancela la reserva, **confirmado como regla tajante y sin excepciones el 31 de agosto** (antes de esa fecha, la posibilidad de flexibilizarla estaba abierta como pregunta — ya no lo está). No existe bloqueo provisional del vehículo: se bloquea únicamente cuando pago y documentos están completos a la vez.
- **Alquiler:** hasta 4 modelos de vehículo (Hilux, Colorado, Verna, Yaris) requieren notaría obligatoria sin excepción. La notaría se informa al cliente solo al final del proceso (medida antifraude deliberada). El trámite lo paga VeloxRent, nunca el cliente.
- **Inspección:** checklist de 35 fotos + 3 videos de \~7-8 minutos cada uno (actualizado 02 sep). Una inspección de menos de 30 minutos requiere autorización explícita para continuar.
- **Devolución:** la garantía se libera dentro de un **máximo** de 24 horas (no es un tiempo mínimo de espera). Un daño grave marca al cliente en rojo de forma automática, incluso si paga sin objeción. **Confirmado el 31 de agosto:** no existe tabla de precios para daño técnico (motor, frenos, suspensión, dirección) — se resuelve siempre mediante informe individual del mecánico externo Motrix, y esto es una decisión de diseño, no un dato pendiente. **Nueva regla del 31 de agosto:** si el vehículo queda paralizado más de 24h esperando la respuesta del cliente a ese informe, los días se cobran como alquiler adicional.
- **Semáforo de riesgo del cliente:** **confirmado el 31 de agosto** — no existe rehabilitación bajo ninguna circunstancia (Ámbar y Rojo son estados permanentes). Es por empresa (no bloquea automáticamente en las otras 3 del grupo), pero el historial es visible a todo KAIROS como alerta preventiva.
- **Administración de Personal:** la cascada de autorización de salidas a campo tiene exactamente 3 niveles (Fiorella → José → Cecilia). **Confirmado y revertido el 31 de agosto:** no se automatiza ningún 4to nivel — Fiorella decidió explícitamente no delegar esa decisión de forma automática en personal de Gestión y Procesos.
- **Consulta virtual:** **confirmado formalmente el 02 de septiembre** — ya no es solo una validación operativa, Fiorella lo dio por aprobado.
- **Vacaciones (Administración de Personal):** **corregido el 02 de septiembre** — la regla real no es "2 personas clave" designadas por área, es una regla de capacidad: como máximo 1 persona de cualquier área puede estar de vacaciones a la vez, sin importar cuántos colaboradores tenga esa área. Tiene prioridad quien lo solicitó primero, verificado contra el calendario del área.
- **Daño leve/moderado (Devolución):** **confirmado el 02 de septiembre** — no hay ni debe haber un plazo fijo (SLA) para que Gerencia asigne el descuento; es intencionalmente variable, según si el cliente acepta el daño o lo negocia.
- **Documentos de extranjeros (Consulta/Alquiler):** **confirmado el 02 de septiembre** — pasaporte y carnet de extranjería son alternativos, nunca se exigen los dos al mismo tiempo. La licencia de conducir válida sí es siempre obligatoria.
- **Verificación de identidad:** si el MTC no responde, se bloquea la entrega sin excepción. Si RENIEC no responde, Gerencia puede autorizar una excepción caso por caso.
- **Talento Humano:** el plan formal se espera aplicar en el primer trimestre de 2027, a cargo de un rol nuevo transversal a las 4 empresas del grupo.
- **Roles del proyecto:** **confirmado el 02 de septiembre — Tech Lead: Eder Ramos. Sponsor: Fiorella.** Ambos roles, antes vacantes, ya están asignados (ver `SDD-KAIROS-TRANSVERSAL.md`/`TDD-KAIROS-TRANSVERSAL.md` para el detalle de las decisiones de arquitectura que esto ya destrabó: cierre definitivo de `ADR-008`, elección de Cloud Tasks). **Corrección 04 sep:** la mención de Next.js que aparecía aquí fue un error del usuario — el frontend no usa Next.js, es React (SPA/PWA) simple.
- **Gobernanza de aprobación (nuevo, 03 de septiembre):** Fiorella confirma que **ella misma da la aprobación final de UAT de cada módulo** (no hay un segundo aprobador de negocio), que **el presupuesto para pasar de los planes gratuitos de Google Cloud/Supabase/Firebase a planes productivos ya está aprobado**, y que **una vez cerradas las últimas dudas y actualizado el SDD, el equipo del proyecto puede aprobarlo internamente** sin esperar la asignación de los roles todavía vacantes. Fiorella fija el **viernes 04 de septiembre de 2026** como fecha límite para cerrar las preguntas pendientes (ver sección 5). Detalle completo en `SDD-KAIROS-TRANSVERSAL.md` y `TDD-KAIROS-TRANSVERSAL.md`, sección 30/15.

## 5. Lo que sigue abierto

> Actualizado 03 sep 2026 (3ª ronda del día): **de las 8 preguntas de Legal, ya solo queda 1 con contenido genuinamente pendiente** (privacidad de datos — no bloqueante) **y 1 que sigue esperando ratificación formal de un abogado** (aunque ya no bloquea el diseño). Las otras 6 están resueltas con decisiones directas del usuario o de Fiorella. **No queda ninguna pregunta de negocio ni de Legal que bloquee seguir con la documentación.**

| # | Pregunta | Para quién | Estado |
| --- | --- | --- | --- |
| 1 | Valor legal de la aceptación remota (firma con huella a distancia) | — | ✅ `RESUELTO` (no bloqueante, 03 sep 2026) — la reserva remota nunca es el respaldo legal final: el contrato de Alquiler siempre se firma presencialmente al recoger el vehículo (con notaría para 4 modelos, sin notaría para el resto), con el video de lectura de políticas como evidencia adicional en ambos casos. Ratificación formal de Legal pendiente antes de producción, no antes de aprobar la documentación |
| 2 | Privacidad de los datos de clientes y personal | — | `PENDIENTE` (no bloqueante) — vacío confirmado el 03 sep: Fiorella reconoció que "no se le ha informado hasta ahora" al cliente sobre el tratamiento de sus datos. **El usuario decidió proponerle directamente una cláusula a Fiorella antes de documentarla aquí** — no hay texto formal todavía en esta serie de documentos. No frena seguir con el resto de la documentación |
| 3 | Riesgo compartido entre las 4 empresas del grupo (semáforo) | — | ✅ `RESUELTO` (03 sep 2026) — decisión del usuario: uso estrictamente interno entre las 4 empresas de KAIROS, nunca se exporta a terceros externos al grupo |
| 4 | Retención definitiva por tipo de evidencia | — | ✅ `RESUELTO` (corregido 03 sep) — **1 año en almacenamiento activo + mínimo 5 años en archivo externo**, confirmado por Fiorella (sustituye los "3 meses" registrados el 02 sep, que quedaron superados) |
| 5 | Qué evidencias deben tener retención bloqueada (litigio en curso) | — | ✅ `RESUELTO` (03 sep) — casos graves: accidentes con heridos o fallecidos, según los protocolos de contingencia que Fiorella está formalizando (pérdida de llave, avería, choque leve/moderado/grave) |
| 6 | Qué mecanismo de firma remota tiene fuerza probatoria suficiente | — | `RESUELTO parcial` — Fiorella dio la jerarquía práctica (contrato notariado primero, luego evidencias: fotos, videos, cámaras, entrevistas, formatos de inspección); mismo tratamiento que el punto 1 — ratificación formal de Legal pendiente antes de producción, no bloqueante ahora |
| 7 | Transferencias mediante CDN global (distinto de la residencia base en São Paulo, ya resuelta) | — | ✅ `RESUELTO` (03 sep 2026) — decisión del usuario: **no se usará CDN global**, las fotos/video se sirven directo desde la región Perú/Brasil, evitando por completo la pregunta de transferencia internacional. Queda pendiente que Eder Ramos confirme la implicancia técnica (carga más lenta fuera de la región) |
| 8 | Quién acepta formalmente los riesgos residuales del proyecto | — | ✅ `RESUELTO` (03 sep) — Fiorella confirma que, mientras no exista un responsable Legal asignado, **el riesgo lo asumen ella y José como Gerencia** |
| — | Residencia de datos en la nube (São Paulo) | — | ✅ `RESUELTO` (02 sep) — Fiorella confirmó que no se requiere aprobación legal adicional |

**No queda ninguna pregunta funcional de negocio abierta, ni ninguna de Legal que bloquee la documentación.** De las 8 preguntas del catálogo Legal (sección 5), 6 ya están resueltas con decisiones directas del usuario y de Fiorella; solo la privacidad de datos (contenido pendiente) y la ratificación formal de un abogado siguen abiertas — ninguna de las dos frena avanzar, ambas deben cerrarse antes de producción.

## 6. Condición para pasar a aprobado

1. \~\~Asignar un responsable Legal\~\~ — **actualizado 03 sep (5ª ronda): el usuario decidió no asignar un responsable Legal por el momento**, considerando suficiente la validación formal ya dada por el negocio (Fiorella y José como Gerencia). Sigue pendiente que Fiorella revise la propuesta de cláusula de privacidad de datos (a proponérsele directamente, todavía sin documentar) — el único punto con contenido genuinamente pendiente, no bloqueante.
2. Asignar los roles de negocio que faltan: **actualizado 03 sep (6ª ronda) — Datos, Seguridad, QA, DevOps y UX ya están asignados: Eder Ramos acumula los 5 roles técnicos, además de Tech Lead.** Ya no queda ningún rol de la tabla de firmas sin asignar — solo Finanzas (Fiorella) sigue pendiente de formalizar. **Producto (Sponsor) y Tech Lead ya están asignados** (Fiorella y Eder Ramos, 02 sep). Fiorella confirma además que es ella quien da la aprobación final de UAT por módulo — el mecanismo de aprobación de Producto ya no está en duda, solo falta la firma formal.
3. \~\~Firmas funcionales de Operación, Finanzas, Producto, Legal, UX y QA\~\~ — **actualizado 04 sep 2026: el usuario confirmó que no es necesaria la firma formal**, la documentación se considera aprobada con las decisiones ya registradas (`BDD-KAIROS-TRANSVERSAL.md`, sección 22.1).
4. Verificar que los 7 escenarios ya migrados (01 sep) estén incorporados en la ejecución automatizada de pruebas, además de en la documentación — la migración documental ya está completa, lo que falta es la verificación de ejecución.
5. **\[Nuevo, 03 sep\]** Para el SDD/TDD específicamente: Fiorella confirma que, una vez cerradas las dudas de negocio pendientes (punto 1) y actualizado el SDD, **el equipo del proyecto puede aprobarlo internamente**, sin esperar a asignar Datos/Seguridad/QA/DevOps — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 30. El presupuesto de planes productivos (Google Cloud/Supabase/Firebase) ya está aprobado, lo que también destraba el criterio de NFR de ese documento.

## 7. Nota sobre las auditorías y correcciones de negocio del 01-02 de septiembre de 2026

Tres auditorías independientes revisaron este paquete el 01 y 02 de septiembre (calificaciones 8.1 → 8.7 → 8.9/10), corrigiendo desincronización entre documentos, contenido normativo perdido en el Transversal, y conteos desactualizados — el detalle completo vive en el historial de versiones de `BDD-KAIROS-TRANSVERSAL.md`. El 02 de septiembre, además, Fiorella y el Tech Lead (Eder Ramos) respondieron directamente los inputs de negocio y arquitectura que quedaban pendientes, cerrando las últimas 2 preguntas funcionales del BDD y varias decisiones de arquitectura del SDD/TDD (`ADR-008`, Cloud Tasks, stack frontend). El 03 de septiembre, José y Fiorella respondieron en 2 reuniones separadas las 5 preguntas de negocio de Reserva que seguían pendientes; en una 3ª ronda el mismo día, el usuario resolvió directamente 3 de las 4 preguntas de Legal que quedaban (firma remota, riesgo compartido, CDN global), dejando solo la privacidad de datos como contenido pendiente, sin bloquear nada. Los conteos finales verificados del BDD son **70 reglas, 12 críticas, 79 escenarios**.
