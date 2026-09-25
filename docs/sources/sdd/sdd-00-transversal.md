# SDD — 00 Transversal

# Solution Design Document — Fundación Transversal KAIROS

**Código:** SDD-KAIROS-MVP-002 / TRANSVERSAL **Versión:** 3.6 — 10 sep 2026: stack frontend React SPA/PWA formalizado **Estado:** DRAFT COMPLETE — candidato a revisión arquitectónica, no aprobado **Entrada funcional:** `BDD-KAIROS-TRANSVERSAL.md` **Alcance:** Plataforma, identidad y acceso, multiempresa, seguridad, integraciones, offline, observabilidad, despliegue, migración y gobernanza de arquitectura — base común para los 6 procesos de VeloxRent bajo KAIROS **Propietario:** Arquitectura de Solución — **Eder Ramos (Tech Lead)** **Revisores:** Producto, Operaciones, UX, Seguridad, Datos, Integraciones, QA y DevOps **Fecha:** 10 de septiembre de 2026

> Este documento traduce el comportamiento transversal definido en `BDD-KAIROS-TRANSVERSAL.md` a una solución lógica verificable. No define nombres físicos de columnas, DDL, schemas JSON exhaustivos, clases, librerías concretas ni código — eso se refina en el TDD. Los 6 documentos de proceso (`SDD-CON-001`, `SDD-RES-001`, `SDD-ALQ-001`, `SDD-DEV-001`, `SDD-REC-001`, `SDD-ADP-001`) dependen de este documento para todo lo que no varía por proceso: arquitectura de contexto/contenedores/componentes, multiempresa, seguridad, integraciones, offline, observabilidad, despliegue, migración, ADR transversales, riesgos generales, decisiones abiertas de arquitectura y criterios de aprobación.

---

## 1. Control y gobernanza

### 1.1 Historial

| Versión | Cambio | Autor | Estado |
| --- | --- | --- | --- |
| 0.1–1.2 | Ver historial completo en `SDD-KAIROS-Consolidado-Detallado.md` (archivado como referencia histórica) — incluye la construcción inicial y 2 auditorías independientes | Russbel (BA) con apoyo de Claude | Archivado |
| 2.0 | División del documento consolidado en 1 SDD transversal + 6 SDD por proceso + 1 matriz de trazabilidad central, siguiendo el ejemplo de referencia `Ejemplo-SDD-Reserva-Vehiculo-KAIROS.md` (Anexo B del propio ejemplo) — mismo criterio ya aplicado al BDD el 27 ago 2026 | Russbel (BA), a pedido del usuario | Candidato |
| **2.1** | **Incorpora la base arquitectónica del **`SAD-KAIROS-MVP-001`** v0.5** (documento nuevo, fechado 30 ago 2026, con Tech Lead como propietario declarado): stack tecnológico concreto, 11 ADR con estado de aprobación, NFR con valores exactos, catálogo de roles, parámetros offline, topología de despliegue y observabilidad. Se extrajo únicamente contenido de arquitectura del SAD — se ignoró deliberadamente su extenso catálogo de preguntas de negocio/legales abiertas (`Q-RES-*`, `Q-ALQ-*`, `Q-INS-*`, `Q-DEV-*`, `Q-RH-*`, `LGL-*`), que no es arquitectura y ya vive (o debe vivir) en el BDD. Se actualizan las secciones 1.3, 3.2, 14, 15, 16, 17, 19, 20, 21, 22, 23, 25, 28 y 30 | Russbel (BA), a partir de `SAD-KAIROS-MVP-001.md` subido por el usuario | Candidato |
| **2.2** | **Decisiones directas del Tech Lead (Eder Ramos) y el Sponsor (Fiorella), 02 sep 2026 — ambos roles quedan asignados formalmente.** (1) `ADR-008` cerrado definitivamente: "no hay ni habrá `VehicleHold`" — se retira la propuesta del SAD, no queda como pendiente; (2) `OQ-SOL-013` resuelto (el escenario "pago sin disponibilidad" no ocurre bajo el diseño confirmado); (3) `OQ-SOL-014` nueva y resuelta: Cloud Tasks como servicio de cola; (4) stack frontend corregido: **Next.js sí se usa** (el SAD lo omitía, se prioriza la instrucción directa del Tech Lead); (5) retención provisional de evidencia baja de 12 a 3 meses; (6) residencia de datos en São Paulo: Fiorella confirma que no requiere aprobación legal; (7) evidencia audiovisual actualizada a 35 fotos + 3 videos de \~7-8 min cada uno (cierra Q-INS-01 a 08 del SAD; corregido de nuevo 02 sep — Fiorella precisó "\~7-8 min", no un rango de 3 a 16); (8) planes gratuitos de Cloud Run/Supabase/Firebase confirmados como transición aceptada, no como riesgo abierto | Russbel (BA), a partir de las respuestas directas del Tech Lead y el Sponsor | Candidato |
| **2.3** | **Respuestas directas de Fiorella, 03 sep 2026, sobre gobernanza de aprobación.** (1) Fiorella confirma que **ella misma da la aprobación final de UAT de cada módulo** — no hay un segundo aprobador; cierra el criterio 2 de la sección 30 en la parte de aprobación de release (queda pendiente solo la confirmación formal de alcance, no de quién aprueba); (2) **el presupuesto para pasar de los planes gratuitos de Google Cloud/Supabase/Firebase a planes productivos ya está aprobado** — cierra el bloqueante de release que señalaba el criterio 11 de la sección 30 (factibilidad real de los NFR de disponibilidad/RPO/RTO sobre planes productivos, antes sin presupuesto confirmado); (3) Fiorella fija el **04 de septiembre de 2026 (viernes)** como fecha límite para cerrar las preguntas de negocio y Legal que siguen abiertas (sección 6 de `BDD-KAIROS-EXECUTIVE-SUMMARY.md`); (4) Fiorella confirma que, una vez resueltas las últimas dudas del BDD y actualizado este SDD, **el equipo del proyecto (Fiorella + Eder Ramos + Russbel) puede aprobar el SDD internamente**, sin depender de la asignación previa de los roles todavía vacantes (Datos, Seguridad, QA, UX, DevOps) — ver nota añadida al inicio de la sección 30 | Russbel (BA), a partir de las respuestas directas de Fiorella | Candidato |
| **2.4** | **Segunda ronda de respuestas del 03 sep 2026 — reuniones separadas con José Pariona (08:56) y Fiorella (12:17), transcripciones recibidas.** (1) **Retención de evidencia corregida:** Fiorella precisó **1 año en almacenamiento activo + mínimo 5 años en archivo externo** — sustituye a los "3 meses" registrados el 02 sep, que quedan superados (sección 16.5, OQ-SOL-006); (2) **tratamiento financiero de la garantía confirmado** (cierra hallazgo P0-03 de `SDD-RES-001`): el monto de reserva se traslada íntegro a la garantía del alquiler, confirmado por José y por Fiorella por separado; (3) **mecanismo de no-show precisado** (cierra P1-02 de `SDD-RES-001`): es decisión humana de Gerencia tras un protocolo de contacto (llamada 1 día antes, mensaje, llamada 2h antes) — no un job/cron automático; (4) **valor legal de la firma remota y transferencias vía CDN global siguen sin resolver** — ninguna de las dos reuniones los cerró, José dijo explícitamente que hay que consultarlo y el tema de CDN no se tocó en ninguna reunión; (5) Fiorella confirma que, mientras no exista un responsable Legal asignado, **el riesgo de decisiones sin revisión legal lo asumen ella y José** como Gerencia, por instrucción directa del usuario | Russbel (BA), a partir de las transcripciones de las 2 reuniones del 03 sep | Candidato |
| **2.5** | **Tercera ronda del 03 sep 2026 — decisiones directas del usuario sobre los 3 puntos de Legal que seguían abiertos.** (1) `OQ-SOL-009` (firma electrónica) `RESUELTO` — la reserva remota nunca es el respaldo legal final: el contrato de Alquiler siempre se firma presencialmente al recoger el vehículo (con notaría para 4 modelos, sin notaría para el resto), con el video de lectura de políticas como evidencia adicional en ambos casos; (2) `OQ-SOL-008` (riesgo compartido entre las 4 empresas) `RESUELTO` — uso estrictamente interno entre las 4 empresas de KAIROS, nunca se exporta a terceros; (3) `OQ-SOL-015` nueva y resuelta: **no se usará CDN global** para servir fotos/videos — decisión de negocio para evitar la pregunta legal de transferencia internacional de datos, con implicancia técnica pendiente de confirmar con Eder Ramos (carga más lenta fuera de la región); (4) privacidad de datos del cliente queda como contenido pendiente de agregar (cláusula en el guion del contrato/video), explícitamente **no bloqueante** para seguir con el diseño — sí debe cerrarse antes de producción. **Con esto, no queda ninguna decisión de Legal genuinamente bloqueante para el diseño** — solo pendiente de ratificación formal antes de producción | Russbel (BA), a partir de decisiones directas del usuario | Candidato |
| **2.6** | **Cuarta ronda del 03 sep 2026 — decisiones directas del usuario.** (1) **Eder Ramos asignado como responsable de Datos, Seguridad, QA y DevOps**, además de Tech Lead/Arquitectura — cierra la asignación (no la validación formal) de los criterios 4, 5 y 9 de la sección 30, y de las filas correspondientes de la tabla de firmas (30.1); (2) **se redactó una propuesta de cláusula de tratamiento de datos personales** (ver `BDD-KAIROS-TRANSVERSAL.md`, sección 19.2, nueva) para incorporar al guion de lectura del contrato y al texto de `CONTRATO_DE_RESERVA`/`CONTRATO_DE_ALQUILER` — pendiente de revisión de Fiorella antes de usarse. Con esto, de los criterios de aprobación de la sección 30 solo queda sin responsable asignado: UX (rol) y Legal (rol) | Russbel (BA), a partir de decisiones directas del usuario | Candidato |
| **2.7** | **Quinta ronda del 03 sep 2026.** (1) Se retira la cláusula de privacidad redactada en la ronda anterior — el usuario indicó que primero se le propondrá directamente a Fiorella, no se documenta como parte del BDD hasta esa aprobación; (2) **el usuario decide no asignar un responsable Legal por el momento**, considerando suficiente la validación formal ya dada por el negocio (Fiorella y José como Gerencia) — el criterio 6 y la fila "Legal" de la tabla de firmas (30.1) se actualizan para reflejar esto como una decisión, no como un vacío de asignación | Russbel (BA), a partir de instrucción directa del usuario | Candidato |
| 2.8–3.1 | ⚠️ **Registro consolidado (corregido al detectar el gap):** el encabezado subió de 2.7 a 3.1 en 4 pasos (2.8, 2.9, 3.0, 3.1) sin dejar una fila propia por cada uno — se consolidan aquí. **2.8:** Eder Ramos asignado como responsable de Datos, Seguridad, QA y DevOps, además de Tech Lead/Arquitectura — cierra la asignación de los criterios 4, 5 y 9 de la sección 30. **2.9–3.0:** el usuario decide no asignar un responsable Legal por el momento, considerando suficiente la validación formal ya dada por el negocio (Fiorella y José) — actualiza el criterio 6 y la fila "Legal" de la tabla de firmas. **3.1:** Eder Ramos asignado también como responsable de UX — cierra el criterio 8. Con esto, de los 9 roles de la tabla de firmas (30.1) solo Finanzas queda sin firma final formalizada; ningún rol queda sin asignar | Russbel (BA), a partir de instrucciones directas del usuario | Candidato |
| **3.2** | **04 sep 2026.** El usuario confirma que **las ratificaciones de arquitectura y solución pendientes ya están formalmente aprobadas por Eder Ramos (Tech Lead)** — `NFR-REL-001` (idempotencia), `NFR-AUD-001` (auditoría) y `NFR-SEC-001` (aislamiento multiempresa) suben de `PROPUESTA_SOLUCIÓN`/`PROPUESTA_ARQUITECTURA` a `APROBADA_ARQUITECTURA` (sección 19). Se corrige además la nota de gobernanza de la sección 1, que seguía diciendo que Datos y Seguridad estaban sin asignar pese a que Eder Ramos las cubre desde el 03 sep. **No incluye** `ADR-009` (gate legal de la aceptación remota) ni la retención de logs técnicos (sección 20) — ambas dependen de Legal, no de Arquitectura, y el usuario ya decidió no asignar Legal por el momento; siguen abiertas por diseño, no por descuido | Russbel (BA), a partir de instrucción directa del usuario | Candidato |
| **3.3** | **04 sep 2026.** El usuario corrige un error propio: la instrucción del 02 de septiembre que decía que Eder Ramos confirmó el uso de Next.js **fue equivocada** — el frontend **no usará Next.js**, queda como React simple (SPA/PWA), consistente con la versión original del SAD (que nunca incluyó Next.js). Se corrige la fila "Frontend" de la sección 22.1. **No cambia nada del backend**: NestJS sigue siendo el framework confirmado ahí, es una capa distinta y no se vio afectada por la confusión | Russbel (BA), a partir de instrucción directa del usuario | Candidato |
| **3.4** | **04 sep 2026 (2ª ronda).** (1) **Retención de logs técnicos confirmada: 90 días** (el resto de la tabla de la sección 20 sigue como candidata, sujeta a Legal, hasta nueva confirmación); (2) **el usuario confirma que no es necesaria la firma formal** de ningún rol — los 9 roles de la tabla de firmas (30.1) quedan `Aprobado sin firma formal`, incluido Finanzas (Fiorella). Legal sigue como decisión de no asignar, no como vacío de firma | Russbel (BA), a partir de instrucción directa del usuario | Candidato |
| **3.5** | **04 sep 2026 (3ª ronda).** El usuario confirma el resto de la tabla de retención de logs (sección 20) tal como estaba propuesta: trazas de rendimiento 30 días, eventos de seguridad 1 año, auditoría funcional general 5 años, pagos/contratos/evidencia probatoria 10 años, alertas e incidentes 5 años. \*\*Las 6 categorías quedan \*\*`CONFIRMADO` — ya no depende de que se asigne un responsable Legal | Russbel (BA), a partir de instrucción directa del usuario | Candidato |
| **3.6** | **10 sep 2026.** Eder Ramos formaliza el stack de extensión de React: Vite, React Router, TanStack Query, Zustand limitado a estado cliente, React Hook Form + Zod, cliente generado desde OpenAPI, `vite-plugin-pwa`/Workbox, IndexedDB mediante Dexie solo para ALQ-09/DEV-04, Radix UI Primitives, CSS Modules + Custom Properties, Lucide React, date-fns, TanStack Table, Vitest + Testing Library + MSW + Playwright + axe y Sentry. Se confirma nuevamente que no se usará Next.js. | Eder Ramos (Tech Lead) | Aprobado sin firma formal |

### 1.2 Estado de decisiones

| Estado | Significado |
| --- | --- |
| `CONFIRMADA_NEGOCIO` | El comportamiento fue confirmado por el referente del proceso (Fiorella) — es un hecho de negocio, no una decisión de arquitectura |
| `PROPUESTA_SOLUCIÓN` | La arquitectura propone esta solución; es razonable, pero nadie con autoridad de Arquitectura la ha aprobado formalmente todavía |
| `APROBADA_ARQUITECTURA` | Arquitectura, Seguridad, Datos y los responsables correspondientes ya la aprobaron — requiere registrar quién, cuándo, qué versión y con qué alcance |
| `SUPUESTO` | Necesaria para poder diseñar; debe revalidarse cuando exista información o responsable |
| `PENDIENTE` | No existe decisión suficiente |
| `BLOQUEANTE` | Impide aprobar la parte afectada |
| `EXCLUIDO_R1` | Bloqueante reconocida, excluida formalmente del Release 1 por decisión del usuario; se revisa en Release 1.1 |

> **Estado de gobernanza (actualizado 04 sep 2026):** Eder Ramos fue confirmado como Tech Lead y Fiorella como Sponsor el 02 de septiembre de 2026; el 03 de septiembre, Eder Ramos también fue asignado como responsable de Datos, Seguridad, QA, DevOps y UX (ver Decision Log). El 04 de septiembre, el usuario confirmó que **las ratificaciones de arquitectura y solución pendientes ya están formalmente aprobadas por el Tech Lead** — las decisiones que seguían en `PROPUESTA_SOLUCIÓN`/`PROPUESTA_ARQUITECTURA` suben a `APROBADA_ARQUITECTURA` con Eder Ramos como autoridad (ver NFR-REL-001, NFR-AUD-001, NFR-SEC-001 en la sección 19). El modelo físico final y el threat model formal ya pueden tratarse como validados por su responsable asignado; falta únicamente la firma formal registrada en la sección 30.1, no una nueva ratificación de contenido.

### 1.3 Documentos relacionados

### 1.3.1 Manifiesto de baseline BDD (nuevo, 02 sep 2026, hallazgo P0-05)

> Sin este manifiesto no puede demostrarse que el SDD corresponde a la versión del BDD que se pretende usar como referencia. Cada `SDD-XXX-001` declara ahora explícitamente en su encabezado la versión BDD exacta que usó — esta tabla la consolida.

| Documento SDD | Versión BDD referenciada | Fecha BDD | Estado de sincronización |
| --- | --- | --- | --- |
| `SDD-KAIROS-TRANSVERSAL` | `BDD-KAIROS-TRANSVERSAL` v1.11 | 02 sep 2026 | ✅ Sincronizado |
| `SDD-CON-001` | `BDD-CON-001` v1.7 | 01 sep 2026 | ✅ Sincronizado |
| `SDD-RES-001` | `BDD-RES-001` v1.7 | 01 sep 2026 | ✅ Sincronizado |
| `SDD-ALQ-001` | `BDD-ALQ-001` v1.6 | 01 sep 2026 | ✅ Sincronizado |
| `SDD-DEV-001` | `BDD-DEV-001` v1.8 | 02 sep 2026 | ✅ Sincronizado (corregido 02 sep — citaba v1.6) |
| `SDD-REC-001` | `BDD-REC-001` v1.6 | 01 sep 2026 | ✅ Sincronizado |
| `SDD-ADP-001` | `BDD-ADP-001` v1.8 | 02 sep 2026 | ✅ Sincronizado (corregido 02 sep — citaba v1.6) |

> ⚠️ Este manifiesto se actualiza manualmente cada vez que cambia una versión BDD — no hay verificación automática todavía. Si el BDD vuelve a cambiar sin que este documento se actualice el mismo día, la tabla queda desactualizada de nuevo, igual que ocurrió con Devolución y Administración de Personal.

| Documento | Relación |
| --- | --- |
| `BDD-KAIROS-TRANSVERSAL.md` + 6 archivos por proceso | Fuente funcional canónica |
| `BDD-KAIROS-TRACEABILITY.md` | Trazabilidad funcional consolidada |
| `SAD-KAIROS-MVP-001.md`\*\* v0.5\*\* | **Baseline arquitectónico normativo, con Tech Lead como propietario declarado (30 ago 2026) — se ubica entre el BDD y este SDD en la jerarquía de autoridad (ver sección 1.4). Este documento incorpora su contenido arquitectónico; el SAD sigue siendo la fuente original para el detalle completo (roles, gates legales, catálogo extendido de decisiones abiertas)** |
| `SDD-CON-001`, `SDD-RES-001`, `SDD-ALQ-001`, `SDD-DEV-001`, `SDD-REC-001`, `SDD-ADP-001` | SDD por proceso — dependen de este documento para lo transversal |
| `SDD-KAIROS-TRACEABILITY.md` | Matriz central BDD → SDD → TDD, los 6 procesos |
| `SDD-KAIROS-Consolidado-Detallado.md` | Versión anterior, un solo archivo — archivada como referencia histórica tras esta división |
| `02-SDD-ERP-KAIROS-MVP.md` | Anterior — archivado, solo referencia histórica |
| `TDD-KAIROS-Consolidado-Detallado.md` | Refinamiento técnico subordinado |
| `ENG-KAIROS-001`, `SEC-KAIROS-001` | Normativos complementarios del SAD (estándares de ingeniería y de seguridad) — no entregados a Claude, referenciados solo por nombre |
| Fichas AS-IS (6), Decision Log, Diagramas BPMN (7), Backlog Consolidado | Origen de reglas, hallazgos e insumos de riesgo |

### 1.4 Criterio de autoridad

> ⚠️ **Actualizado 01 sep 2026:** la llegada del `SAD-KAIROS-MVP-001` introduce una capa de autoridad que no existía cuando se escribió la versión 2.0 de este documento. El SAD se autodeclara como arquitectura normativa, por encima del SDD. Se adopta esa jerarquía:

1. El BDD decide significado, reglas y resultados del negocio.
2. **El SAD decide arquitectura normativa: principios obligatorios, límites de módulos, autoridades de datos, ADR aprobados y restricciones tecnológicas.**
3. Este documento transversal (SDD) decide la solución lógica y las tácticas de diseño **dentro** de lo que el SAD ya normó — cuando el SAD ya decidió algo (ej. stack tecnológico, ADR aprobados), este documento lo hereda en vez de proponerlo de nuevo.
4. Cada SDD de proceso decide la asignación lógica de responsabilidades específicas de su dominio.
5. El TDD decide implementación física y contratos exactos.
6. Si un diseño contradice al BDD, debe corregirse el diseño o aprobarse formalmente el cambio funcional. Si un diseño contradice al SAD, debe corregirse o elevarse como propuesta de cambio de ADR.
7. Ningún documento de esta serie redefine una regla `BR-*` del BDD ni un ADR aprobado del SAD — solo los traduce a solución lógica.

El SAD tampoco está aprobado (mismo estado `DRAFT COMPLETE — candidato`, ver su sección 1.5) — su llegada no cierra las brechas de gobernanza de este documento (sección 30.1), pero sí resuelve, con estado `APROBADA_ARQUITECTURA` según el propio SAD, varias decisiones que aquí seguían en `PENDIENTE`/`PROPUESTA_SOLUCIÓN` (ver secciones 19, 20, 22 y 28).

---

## 2. Resumen ejecutivo

Los 6 procesos de VeloxRent (Consulta, Reserva, Alquiler, Devolución, Reclutamiento y Selección, Administración de Personal) se implementarán dentro de un **monolito modular**, mediante una aplicación web responsiva/PWA y una API lógica versionada. Cada proceso tiene un módulo propietario de su ciclo de vida (Inquiries, Reservations, Rentals, Returns, Recruitment, HR-Administration); colaboran entre sí y con los módulos transversales (Organization, IAM, Customers, Fleet, Payments, Evidence, Notifications, Reporting, Audit) mediante contratos internos explícitos y eventos — nunca leyendo ni escribiendo directamente el almacenamiento propietario de otro módulo.

La solución garantiza:

- consistencia fuerte al confirmar disponibilidad (Reserva/Alquiler);
- prevención de reservas y alquileres solapados del mismo vehículo;
- separación clara entre los 4 procesos operativos (Consulta → Reserva/Alquiler → Devolución);
- versionamiento de cambios críticos (contratos, políticas, tarifario);
- trazabilidad de pagos, evidencias y excepciones;
- aislamiento multiempresa (KAIROS: VeloxRent, Casa del Auto, Motrix, RENOVA);
- contingencias visibles, sin confirmación offline de operaciones críticas;
- convivencia con el proceso informal de selección de personal, hoy más simple que el Plan de Talento Humano formal (BR-REC-006);
- evolución futura sin introducir microservicios prematuramente.

### 2.1 Resultado arquitectónico

Toda operación crítica de cualquiera de los 6 procesos (confirmar reserva, entregar un alquiler, cerrar una devolución, decidir una contratación, autorizar una salida a campo) se resuelve como una única operación coordinada: se verifica elegibilidad, vigencia de condiciones, disponibilidad o autorización correspondiente, y evidencia requerida; después se confirma el resultado y se publica de forma confiable para auditoría y notificación.

---

## 3. Alcance de la solución

### 3.1 Incluido (vista transversal)

| Dominio | Procesos que lo componen | Estado |
| --- | --- | --- |
| Organización e identidad | Transversal (grupo, empresas, sedes, roles) | `CONFIRMADA_NEGOCIO` |
| Clientes | Transversal a Consulta, Reserva, Alquiler, Devolución | `CONFIRMADA_NEGOCIO` |
| Consulta | Presencial y virtual — ver `SDD-CON-001` | `CONFIRMADA_NEGOCIO` |
| Reserva | Presencial y remota, incluida venta de vehículo reservado — ver `SDD-RES-001` | `CONFIRMADA_NEGOCIO` |
| Alquiler | Contrato, notaría, entrega, ampliaciones — ver `SDD-ALQ-001` | `CONFIRMADA_NEGOCIO` |
| Devolución | Recepción, inspección, daños, garantía — ver `SDD-DEV-001` | `CONFIRMADA_NEGOCIO` |
| Evidencias | Fotos, videos, archivos, firmas (transversal) | `CONFIRMADA_NEGOCIO` |
| Reclutamiento y Selección | AS-IS real + Plan de Talento Humano como meta (BR-REC-006), fecha objetivo Q1 2027 — ver `SDD-REC-001` | `CONFIRMADA_NEGOCIO` (AS-IS y fecha) / `PROPUESTA_SOLUCIÓN` (diseño técnico del Plan formal) |
| Administración de Personal | Asistencia, permisos, vacaciones, remuneración, salidas a campo, salida — ver `SDD-ADP-001` | `CONFIRMADA_NEGOCIO` |
| Reportes | Tableros operativos y KPI iniciales | `PROPUESTA_SOLUCIÓN` |

### 3.2 Excluido

| Capacidad | Tratamiento | Estado |
| --- | --- | --- |
| Contrato e inspección de entrega completos con firma digital | Firma con huella hasta aprobación legal | `PENDIENTE` |
| Evaluación notarial automatizada al 100% | Requiere aprobación humana en casos `MANUAL_REVIEW` | `PROPUESTA_SOLUCIÓN` |
| Contabilidad general | Integración/exportación futura | `SUPUESTO` |
| Conciliación bancaria automática | Manual asistida en el MVP | `SUPUESTO` |
| Evaluación de Desempeño formal | Diseñada, nunca aplicada en la práctica (BR-ADP-007) — a partir del 4to mes, periodicidad semestral (confirmado 27 ago); queda fuera del MVP | `CONFIRMADA_NEGOCIO` (contenido) / `SUPUESTO` (release) |
| Capacitación formal (Plan Anual, presupuesto, proveedor externo) | Existe versión parcial informal; la formal completa queda fuera del MVP | `SUPUESTO` |
| Reserva confirmada sin conectividad | Requiere autoridad central (ADR-KAI-004) | `PROPUESTA_SOLUCIÓN` |
| Procesos propios de Casa del Auto, Motrix y RENOVA | Levantamiento posterior | `PROPUESTA_SOLUCIÓN` |
| Compresión y retención exacta de multimedia (OQ-SOL-006) | ⚠️ **Corregido 03 sep 2026:** Fiorella precisó que la retención real es **1 año en almacenamiento activo, luego se descarga a memoria externa donde se conserva un mínimo de 5 años** — no los "3 meses" que se había registrado el 02 sep (esa cifra queda superada, Fiorella la corrigió directamente en la reunión del 03 sep). Sin compresión agresiva mencionada; sigue `EXCLUIDO_R1` para el detalle legal completo, a revisar en Release 1.1 | `EXCLUIDO_R1` — plazo corregido |
| Tratamiento del riesgo compartido entre las 4 empresas de KAIROS (OQ-SOL-008) | ✅ **Resuelto 03 sep 2026, decisión del usuario:** el semáforo de riesgo se comparte de manera **estrictamente interna** entre las 4 empresas del grupo — nunca se exporta a ningún tercero externo a KAIROS. Con eso, la exclusión legal original queda cerrada: no hay transferencia a terceros que requiera tratamiento legal adicional | `RESUELTO` |
| Firma electrónica/digital (OQ-SOL-009) | ⚠️ **Aclarado 03 sep 2026, decisión del usuario:** el mecanismo actual (huella + documento interno) **solo respalda la Reserva** — el contrato de Alquiler siempre se firma presencialmente al recoger el vehículo (con notaría para 4 modelos específicos, sin notaría para el resto, pero en ambos casos con el video de la lectura de políticas como evidencia adicional). Como la reserva remota nunca es el respaldo legal final de la relación contractual, esta pregunta **deja de ser bloqueante para el diseño** — sigue `EXCLUIDO_R1` solo en el sentido de que Legal debería ratificarlo formalmente antes de producción, no de que frene avanzar ahora | `RESUELTO` (no bloqueante) — Legal debe ratificar antes de producción |

### 3.3 Dependencias entre módulos

| Módulo | Requerido para | Dueño (proceso) |
| --- | --- | --- |
| IAM | Todas las operaciones | Transversal |
| Customers | Elegibilidad, clasificación de riesgo | Consulta, Reserva, Alquiler, Devolución |
| Inquiries (CRM) | Registro y conversión de consultas | Consulta |
| Fleet | Disponibilidad y estado del vehículo | Reserva, Alquiler |
| Reservations | Ciclo de vida de la reserva | Reserva |
| Rentals | Contrato, entrega, ampliación | Alquiler |
| Returns | Recepción e inspección de retorno | Devolución |
| Payments | Confirmación, reembolso, conciliación | Reserva, Alquiler, Devolución |
| Evidence | Fotos, videos, documentos, firmas | Alquiler, Devolución, Reserva remota |
| Incidents | Daños, choques, inmovilización | Devolución |
| Recruitment | Vacantes, candidatos, selección | Reclutamiento y Selección |
| HR-Administration | Asistencia, permisos, vacaciones, salidas | Administración de Personal |
| Notifications | Comunicación con cliente y personal | Transversal |
| Audit | Trazabilidad de decisiones sensibles | Transversal |

---

## 4. Drivers, restricciones y calidad (transversales)

| ID | Driver | Origen | Implicación de solución | Prioridad |
| --- | --- | --- | --- | --- |
| DR-KAI-001 | Evitar doble reserva/alquiler del mismo vehículo | BR-RES-\*, invariante NFR-KAI-001 | Exclusión transaccional sobre `(vehicle_id, rango temporal)` | Crítica |
| DR-KAI-002 | Trazabilidad de decisiones sensibles | NFR-KAI-002, BDD Feature AUD-01 | Auditoría append-only con outbox | Crítica |
| DR-KAI-003 | Aislamiento multiempresa | NFR-KAI-003, BR-ORG-002 | Alcance derivado de asignación vigente, no de un valor enviado por el cliente | Crítica |
| DR-KAI-004 | Reintentos no duplican operación | NFR-KAI-004 | Idempotencia en comandos críticos | Alta |
| DR-KAI-005 | Bloqueo del sistema claro y accionable | NFR-KAI-005 | Errores estructurados con causa y siguiente acción, no solo un código | Alta |
| DR-KAI-006 | Documento contractual con una sola versión vigente | NFR-KAI-007, BR-DOC-002 | Plantillas versionadas, inmutables tras uso | Alta |
| DR-KAI-007 | Garantía nunca se libera con incidencia abierta | NFR-KAI-008, BR-DEV-002 | Invariante de dominio verificada antes de `refund` | Crítica |
| DR-KAI-008 | Personal polivalente, sin fricción por "no ser el titular" | NFR-KAI-009, BR-ORG-003 | Interfaces por rol, no por persona; permisos no atados a un único usuario | Media |
| DR-KAI-009 | Conectividad limitada en campo (inspecciones, asistencia, salidas) | Arquitectura transversal | Borrador local cifrado; comandos críticos requieren autoridad central | Alta |
| DR-KAI-010 | Bajo volumen transaccional inicial | Datos actuales (16 alquileres/mes promedio) | Monolito modular, no microservicios | Media |
| DR-KAI-011 | Evidencia audiovisual obligatoria y voluminosa | BR-INS-002/004 (35 fotos + 3 videos de \~7-8 min cada uno, actualizado 02 sep) | Carga directa a almacenamiento de objetos, acceso temporal, sin pasar por la API principal | Alta |
| DR-KAI-012 | Brecha AS-IS/Plan formal en Talento Humano | BR-REC-006, BR-ADP-007/008 | El sistema debe soportar la versión informal simplificada hoy, con capacidad de evolucionar hacia el Plan formal sin rediseño | Media |

### 4.1 Restricciones

- Operación inicial en Perú y zona horaria `America/Lima`.
- Cuatro empresas bajo KAIROS, con VeloxRent como primer rollout.
- Información previa dispersa (Excel, WhatsApp, Drive, papel) y de calidad variable.
- Accesos de RENIEC, MTC, banca y mensajería no confirmados (`PENDIENTE`, sección 16).
- Política legal de aceptación remota pendiente (mismo hallazgo que OQ-RES-104 del BDD).
- El monto observado de reserva (S/300) es configurable y versionado, no un valor fijo en código (BR-RES-001).
- ✅ **Ventana operativa resuelta 31 ago 2026:** confirmada en **8:00 a.m. a 5:00 p.m., los 7 días de la semana, para las 4 empresas** (cierra OQ-SOL-007, ver sección 28). Reemplaza la inconsistencia anterior entre 7am-6pm y 8am-5pm.

---

## 5. Alternativas evaluadas

### 5.1 Estilo arquitectónico

| Alternativa | Ventajas | Riesgos/costo | Decisión |
| --- | --- | --- | --- |
| Microservicios por proceso | Escalado y despliegue independientes | Mayor costo, DevOps y consistencia distribuida — injustificado al volumen actual | Rechazada para MVP |
| Monolito sin límites de módulo | Implementación inicial rápida | Acoplamiento y propiedad difusa entre los 6 procesos | Rechazada |
| Monolito modular (uno por proceso + módulos transversales) | Transacciones locales, límites evolutivos, coherente con DR-KAI-010 | Requiere disciplina modular (regla de dependencia, sección 8.3) | **Seleccionada** |
| SaaS ERP externo | Menor construcción inicial | Ajuste limitado a las reglas particulares de VeloxRent (notaría condicional, tercera vía, semáforo de 2 niveles) | No baseline |

### 5.2 Estrategia de consistencia

| Alternativa | Evaluación | Decisión |
| --- | --- | --- |
| Solo validación en interfaz | Vulnerable a concurrencia (dos usuarios reservando el mismo vehículo) | Rechazada |
| Bloqueo pesimista global | Contención innecesaria dado el bajo volumen | Rechazada |
| Restricción temporal + transacción (advisory lock o exclusión GiST) | Integridad garantizada en la autoridad de datos | **Seleccionada** |
| Consistencia eventual para confirmar | Puede producir doble reserva o doble alquiler — viola DR-KAI-001 | Rechazada |

### 5.3 Evidencia

La carga directa a almacenamiento de objetos con confirmación posterior se selecciona para evitar que los videos (35 fotos + 3 videos de hasta 16 min) atraviesen el proceso principal de API, y para soportar reanudación ante conectividad limitada (DR-KAI-009, DR-KAI-011).

---

## 6. Arquitectura de contexto

```
flowchart TD
    U["Usuarios KAIROS (los 6 procesos)"] --> APP["ERP Web/PWA"]
    APP --> CORE["Plataforma KAIROS"]
    CORE --> EXT["RENIEC / MTC / GPS / Banca / WhatsApp"]
    CORE --> MOT["Motrix (mantenimiento)"]
    CORE --> OBJ["Evidencias privadas"]
```

### 6.1 Sistemas externos

| Sistema | Información intercambiada | Criticidad | Alternativa inicial | Proceso relacionado |
| --- | --- | --- | --- | --- |
| RENIEC | Identidad/biometría | Crítica | Adaptador + fallback manual | Alquiler |
| MTC | Licencia/récord de tránsito | Alta | Adaptador + evidencia manual | Alquiler |
| GPS | Velocidad, zona, ubicación | Alta | Webhook/polling según proveedor | Alquiler |
| Banca | Conciliación de pagos | Alta | Validación manual; importación de extracto | Reserva, Alquiler, Devolución |
| WhatsApp | Confirmaciones, formatos de reporte | Media | Envío manual asistido; texto/archivo generado | Los 6 procesos |
| Motrix | Mantenimiento, repuestos | Media | API/evento futuro; hoy sin acceso | Alquiler, Devolución |
| Google Drive | Convivencia/transición documental | Baja | Enlace o exportación, no fuente principal | Transversal |

---

## 7. Arquitectura de contenedores

```
flowchart TD
    PWA["Web/PWA"] --> API["API de aplicación"]
    API --> MOD["Módulos de dominio (los 6 procesos)"]
    MOD --> DB["Datos transaccionales"]
    MOD --> OBJ["Object storage"]
    MOD --> Q["Cola"]
    Q --> WK["Workers"]
```

| Contenedor | Responsabilidad | Datos | Escalado |
| --- | --- | --- | --- |
| Web/PWA | Experiencia por rol, borradores y carga | Estado efímero/local autorizado | CDN/navegador |
| API | Autorización, coordinación y contratos | No propietaria | Horizontal |
| Módulos de dominio | Reglas, casos de uso y políticas de los 6 procesos | Agregados del dominio | Junto a API |
| Base transaccional | Consistencia y consulta | Datos estructurados | Vertical/read replicas futuras |
| Object storage | Binarios sensibles (fotos, videos, documentos) | Evidencias | Administrado |
| Cola | Entrega asíncrona | Mensajes | Administrado |
| Worker | Validación, notificación y reintentos | Estado derivado | Horizontal |

---

## 8. Arquitectura de componentes

### 8.1 Módulos del monolito

| Módulo | Responsabilidad | Datos propietarios | Proceso relacionado |
| --- | --- | --- | --- |
| Organization | Grupo, empresa, sede, configuración | organizations, companies, branches | Transversal |
| IAM | Usuarios, roles, permisos, delegaciones | users, roles, grants | Transversal |
| Customers | Cliente, documentos, conductor, riesgo | customers, identities, risk assessments | Consulta, Reserva, Alquiler, Devolución |
| Inquiries (CRM) | Consulta, interacción, cotización, conversión | inquiries, interactions, quotations | Consulta |
| Fleet | Vehículos, estados, restricciones, tarifas | vehicles, availability, rate cards | Reserva, Alquiler |
| Reservations | Reserva, bloqueo atómico, cancelación por cambio solicitado, no-show | reservations, holds | Reserva |
| Rentals | Contrato, plan, notaría, entrega, ampliación | rentals, contracts, extensions | Alquiler |
| Returns | Devolución, recepción y cierre | returns, return resolutions | Devolución |
| Inspections | Checklist, puntos y conformidad | inspections, inspection items | Alquiler, Devolución |
| Evidence | Metadatos y ciclo de carga | evidence records, upload sessions | Alquiler, Devolución, Reserva |
| Payments | Pago, garantía, descuento, reembolso | payments, deposits, adjustments, refunds | Reserva, Alquiler, Devolución |
| Incidents | Daños, choque, robo, resolución | incidents, damage assessments | Devolución |
| Maintenance | Orden, repuesto, inmovilización | work orders, parts | Alquiler, Devolución |
| Recruitment | Vacantes, candidatos, selección, inducción | vacancies, candidates, employees | Reclutamiento y Selección |
| HR-Administration | Asistencia, permisos, vacaciones, salidas | attendance, leaves, field trips | Administración de Personal |
| Notifications | Alertas, tareas y comunicaciones | notifications, reminders | Transversal |
| Reporting | Proyecciones de lectura y KPI | reporting views | Transversal |
| Audit | Acciones sensibles y cambios | audit events | Transversal |

### 8.2 Responsabilidad entre módulos relacionados

| Módulo | Propiedad | Ofrece a otros módulos | No permite |
| --- | --- | --- | --- |
| Inquiries (CRM) | Consulta y cotización | Alternativa aceptada y versión, a Reservations/Rentals | Que otro módulo cambie una cotización directamente |
| Customers | Identidad y riesgo | Elegibilidad vigente | Modificación directa de riesgo por otro módulo |
| Fleet | Vehículo/estado | Disponibilidad y bloqueo, a Reservations/Rentals | Doble ocupación del mismo vehículo |
| Payments | Pago y correcciones | Estado financiero verificable | Alteración de un pago desde otro módulo |
| Evidence | Metadatos/ciclo de carga | Evidencia validada | Acceso binario indiscriminado |
| Recruitment | Selección y contratación | Personal ingresado, a HR-Administration | Que HR-Administration modifique el expediente de selección |
| HR-Administration | Ciclo de vida del colaborador | Señal de salida, a Recruitment (dispara nueva vacante) | Que Recruitment inicie sin la señal formal de HR-Administration |
| Audit | Evento auditable | Registro append-only | Modificación retrospectiva |
| Notifications | Plantillas/entregas | Comunicación trazable | Ser fuente de estado de ningún proceso |

### 8.3 Regla de dependencia

Un módulo no lee ni escribe directamente el almacenamiento propietario de otro. La colaboración se realiza mediante puertos internos o eventos. En el monolito, el contrato puede ejecutarse en proceso, pero debe preservar el límite lógico.

> 📌 Las secciones 9, 10, 11 y 12 (diseño por casos de uso, secuencias críticas, modelo lógico y operaciones) son **específicas de cada proceso** y viven en `SDD-CON-001`, `SDD-RES-001`, `SDD-ALQ-001`, `SDD-DEV-001`, `SDD-REC-001` y `SDD-ADP-001`, no en este documento.

---

## 13. Eventos y procesamiento asíncrono (catálogo transversal)

| Evento | Productor | Consumidores | Datos mínimos conceptuales | Garantía |
| --- | --- | --- | --- | --- |
| ClienteClasificado | Customers | Rentals, Returns, Audit, Reporting | `customer_id`, estado anterior/nuevo, motivo | Al menos una vez |
| ConsultaConvertida / ConsultaCerrada | Inquiries | Reservations/Rentals, Reporting | `inquiry_id`, destino | Al menos una vez |
| ReservaConfirmada / ReservaCancelada / ReservaReformulada / ReservaConvertida | Reservations | Fleet, Payments, Notifications, Audit, Reporting | `reservation_id`, estado, versión | Al menos una vez |
| ExcepcionNotarialAprobada | Rentals | Audit, Reporting | `rental_id`, resultado, aprobador, justificación | Al menos una vez |
| ContratoFirmado | Rentals | Notifications, Audit, Reporting | `rental_id`, versión de plantilla, hash | Al menos una vez |
| PagoRegistrado / PagoAjustado | Payments | Reservations/Rentals/Returns, Audit | `payment_id` o `deposit_id`, montos, concepto, autorizador | Al menos una vez |
| EntregaCompletada / DevolucionCompletada | Rentals/Returns | Notifications, Audit, Reporting | `rental_id`, estado anterior/nuevo, resultado de alcolímetro | Al menos una vez |
| EvidenciaCambiada | Evidence | Rentals/Returns/Reservations, Audit | `evidence_id`, categoría, estado, motivo de rechazo | Al menos una vez |
| PoliticaOTarifaActualizada | Fleet/Rentals | Reporting, Audit | tipo de entidad, versión anterior/nueva | Al menos una vez |
| CandidatoSeleccionado / PasoAPlanilla | Recruitment | HR-Administration, Audit | `candidate_id`/`employee_id`, decisión, justificación | Al menos una vez |
| RelacionLaboralTerminada | HR-Administration | Recruitment, Audit | `employee_id`, motivo (renuncia/despido), fecha | Al menos una vez |

### 13.1 Semántica

- Los eventos representan hechos ocurridos, no solicitudes.
- Cada consumidor debe tolerar duplicados.
- La publicación se coordina mediante el patrón outbox (ADR-KAI-003).
- El orden solo se garantiza por agregado cuando sea necesario.
- Fallos repetidos pasan a una cola de excepciones con alerta y reproceso controlado.

### 13.2 Datos sensibles

Los eventos transportan identificadores y datos mínimos; no incluyen documentos, videos, vouchers completos ni información personal innecesaria.

---

## 14. Diseño multiempresa

### 14.1 Contextos

| Concepto | Semántica |
| --- | --- |
| Organización | Grupo KAIROS |
| Empresa propietaria | Entidad que posee comercialmente el registro |
| Empresa operadora | Entidad que ejecuta la operación (ej. Motrix operando mantenimiento de flota de VeloxRent) |
| Sede | Ubicación operativa |
| Alcance del actor | Asignaciones vigentes que permiten acciones (nombres propios se administran como asignaciones a roles) |

### 14.2 Reglas de visibilidad propuestas

| Recurso | Propiedad | Visibilidad por defecto | Excepción |
| --- | --- | --- | --- |
| Cliente | Organización | Empresas autorizadas del grupo | Restricción legal |
| Riesgo del cliente (ámbar/rojo) | Organización | Roles autorizados de todas las empresas — un cliente rojo en VeloxRent debe bloquearse en las 4 empresas | Ninguna sin decisión de Legal |
| Vehículo | Empresa propietaria | Propietaria y operadora | Reporte gerencial consolidado |
| Reserva/Alquiler/Devolución | Empresa operadora | Usuarios asignados | Supervisión corporativa (Gerencia) |
| Pago/Garantía | Empresa de la operación | Finanzas/administración | Auditoría corporativa |
| Evidencia | Expediente/empresa | Roles explícitos | Acceso legal auditado |
| Expediente de personal | Organización (Talento Humano es transversal a las 4 empresas, BR-REC-002) | Fiorella/José y roles de RRHH designados | Ninguna |

### 14.3 Controles

- El contexto empresarial proviene de una asignación autorizada, no solo de un valor enviado por el cliente.
- Toda consulta y comando aplica alcance.
- Reportes consolidados requieren permiso corporativo.

### 14.4 Modelo de datos multiempresa — `APROBADA_ARQUITECTURA` según SAD-KAIROS-MVP-001 §9.3 (incorporado 01 sep 2026)

> El SAD ya define la combinación exacta que este documento dejaba pendiente para el TDD. Se adopta aquí como decisión de solución:

- **Esquema compartido** (no un esquema por empresa) con contexto empresarial obligatorio en cada tabla: `organization_id`, `company_id` propietaria, `operating_company_id` cuando difiere de la propietaria, `branch_id` cuando aplique.
- El contexto se deriva de la identidad autenticada y la asignación vigente — nunca de un `company_id` enviado libremente por el cliente.
- **Maestros globales para 4 categorías:** Clientes, Vehículos, Empleados y Evidencias tienen identidad única a nivel de todo KAIROS. Un mismo cliente, por ejemplo, no se duplica por empresa — se asocia explícitamente a una o varias empresas, cada una con su propia relación, atributos operativos y permisos.
- **Los pagos NO son globales** — pertenecen a cada empresa y se mantienen separados (a diferencia de clientes/vehículos/empleados/evidencias).
- Defensa en profundidad obligatoria (no basta un solo control): Row-Level Security en PostgreSQL, `company_id` obligatorio en cada tabla, contexto de tenant resuelto por el ORM en cada repositorio, índices/constraints compuestos, y pruebas automáticas de acceso cruzado (intentar leer con IDs de otra empresa manipulando URL, body, query y token).
- Reglas de coincidencia para evitar duplicados **dentro de un mismo tipo de entidad** al cargar el maestro global (nunca entre tipos distintos — ver sección 14.4.1): Cliente por país+tipo+número de documento (comparado solo contra otros Clientes); Empleado por país+tipo+número de documento (comparado solo contra otros Empleados, para detectar si la misma persona ya trabaja en otra de las 4 empresas); Vehículo por VIN/chasis (placa como clave secundaria); Evidencia por hash SHA-256+entidad+tipo. Coincidencia fuerte → vinculación automática; coincidencia probable → cola de revisión humana.
- **Gobierno de datos — nombres asignados 02 sep 2026:** Data Owner corporativo: **Eder Ramos y Fiorella (conjunto)**. Data Stewards operativos por dominio siguen sin nombre individual (`DAT-01N` parcialmente resuelto — el Data Owner ya existe, los Stewards por dominio de Operaciones/Comercial, Flota, Finanzas/Tesorería y RR.HH. siguen pendientes).

### 14.4.1 Separación de identidad: Cliente, Candidato y Empleado nunca se fusionan (corregido 02 sep 2026, respuesta a P1-04 de la auditoría del SDD)

> ⚠️ **Corrección importante:** una propuesta anterior (auditoría del SDD, hallazgo P1-04) sugería un maestro único de identidad ("Core/Party") que unificara persona global, candidato y empleado. **Fiorella la rechazó explícitamente:** "Cliente es una entidad externa y candidato en reclutamiento es persona externa, pero no es un cliente... aunque tengan la misma información, no van a ser solo una entidad porque son distintos conceptos de proceso." Se corrige el modelo:

- **Customer** (Cliente), **Candidate** (candidato de Reclutamiento) y **Employee** (colaborador de Administración de Personal) son **3 entidades completamente independientes**, cada una propietaria de su propio módulo (Customers, Recruitment, HR-Administration respectivamente) — ver `SDD-KAIROS-TRANSVERSAL.md`, sección 8.1.
- **No existe fusión ni deduplicación entre ellas**, incluso si la misma persona real aparece en 2 o 3 roles a la vez (ej. un candidato que después se convierte en cliente). **La duplicación de datos personales (nombre, documento) entre estas 3 entidades es aceptada por diseño** — no es un defecto a corregir con un maestro único.
- **La única identidad verdaderamente global es dentro de cada tipo**, no entre tipos: un mismo `Employee` puede trabajar formalmente para más de una de las 4 empresas del grupo con un solo registro (eso sí es "maestro global de Empleados", sección 14.4). Pero un `Employee` y un `Customer` de la misma persona real **son 2 registros separados, sin vínculo automático**.
- **Consecuencia para P1-04:** no hace falta resolver "quién es el propietario de la identidad global de la persona" — no existe tal identidad global entre tipos. Los propietarios por tipo ya están claros: `Customers` para Cliente, `Recruitment` para Candidato, `HR-Administration` para Empleado (ver la tabla de coordinación Recruitment→HR-Administration ya documentada en `SDD-REC-001`/`SDD-ADP-001`, vía el evento `PersonalIncorporado`, que sigue siendo el único punto de conexión formal entre Candidato y Empleado).
- **Sí se mantiene** el maestro global de **Clientes** entre las 4 empresas (confirmado también el 02 sep, ver 14.4.2) — eso es un eje distinto (mismo tipo de entidad, compartida entre empresas), no debe confundirse con la fusión entre tipos que se acaba de descartar.

### 14.4.2 Compartición de identidad de Cliente entre las 4 empresas — confirmado como parte del MVP (02 sep 2026)

Fiorella confirmó: **"por ahora vamos a mantener eso de que sí se pueda mantener un cliente que pueda compartir en las 4 empresas... como parte del MVP, sí se podrá compartir información entre los 4."** Esto cierra la pregunta 17 (Legal) en el sentido operativo — el maestro global de Cliente (sección 14.4) queda confirmado como diseño de negocio para el MVP, sin esperar una validación legal adicional para esta compartición específica. La validación legal transversal de privacidad (pregunta 8 de Legal) sigue abierta, pero ya no bloquea el diseño de esta compartición particular.

- La compartición de clientes, empleados y evidencias entre empresas del grupo sigue sujeta a validación Legal de finalidad y base jurídica (`DAT-04L`, `BLOQUEANTE_PARCIAL` según el SAD).

---

## 15. Seguridad y privacidad

### 15.1 Límites de confianza

- Navegador/dispositivo: no confiable.
- API: frontera de validación y autorización.
- Módulos: confianza limitada por contrato.
- Object storage: privado; acceso temporal.
- Sistemas externos (RENIEC, MTC, banca, WhatsApp, Motrix): no confiables y potencialmente indisponibles.

### 15.2 Matriz de autorización resumida

| Acción | Ejecutivo/Administrador | Operador/Mecánico | Finanzas | Autorizador de excepción | Gerencia |
| --- | --- | --- | --- | --- | --- |
| Consultar expediente | Alcance | Alcance | Limitado | Alcance | Sí |
| Crear (consulta/reserva/alquiler) | Sí | No | No | No | Sí |
| Confirmar/entregar/devolver | Sí | Ejecuta checklist, no aprueba | No | No | Sí |
| Validar pago | No | No | Sí | No | Según segregación |
| Aprobar excepción notarial | No | No | No | Sí | Sí |
| Clasificar riesgo de cliente | No | No | No | Sí (Fiorella/José) | Sí |
| Ver evidencia sensible | Limitado | Sí (la propia) | Según necesidad | Sí | Auditado |
| Decidir contratación de personal | No | No | No | No | Sí (Fiorella, BR-REC-003) |
| Autorizar salida a campo | Nivel 1/2/3 según cascada (BR-ADP-004) | No | No | — | Sí |

### 15.3 Amenazas

| ID | Amenaza | Activo | Control de solución |
| --- | --- | --- | --- |
| THR-001 | Acceso a datos de otra empresa | Clientes, reservas, alquileres | Alcance derivado y auditoría (sección 14) |
| THR-002 | Reutilización o falsificación de voucher de pago | Pagos | Identificación de duplicado y revisión manual |
| THR-003 | URL de evidencia (video/foto) compartida fuera del sistema | Evidencias | URL corta, privada y revocable |
| THR-004 | Manipulación directa de estado sin pasar por comandos | Reserva/Alquiler/Devolución | Comandos explícitos e invariantes de dominio |
| THR-005 | Replay de una confirmación (doble entrega, doble pago) | Disponibilidad, finanzas | Idempotencia y control de versión (DR-KAI-004) |
| THR-006 | Personal marca checklist sin revisar realmente el contenido | Calidad de la inspección | Evidencia obligatoria verificable (35 fotos + 3 videos), no solo un check |
| THR-007 | Excepción notarial o de riesgo aprobada sin criterios completos | Cumplimiento legal/financiero | Validación de los 3 criterios de la tercera vía antes de habilitar la opción (BR-ALQ-004) |
| THR-008 | Datos sensibles en logs o eventos | Privacidad | Minimización y filtrado (sección 13.2) |
| THR-009 | Dispositivo de campo perdido con borrador local | Evidencia, datos personales | Cifrado, expiración y borrado (DR-KAI-009) |
| THR-010 | Datos de candidato/colaborador expuestos fuera de Talento Humano | Privacidad laboral | Mismo nivel de protección que datos de clientes |

### 15.4 Auditoría

Confirmación, cancelación por cambio solicitado, cambios financieros, excepciones, acceso a evidencia, cambios de riesgo, decisión de contratación y clasificación de salida (renuncia/despido) deben generar auditoría no destructiva.

### 15.5 Autenticación, sesión y roles — `APROBADA_ARQUITECTURA` según SAD-KAIROS-MVP-001 §12.2 (incorporado 01 sep 2026)

> El SAD ya fija valores concretos donde este documento solo tenía principios generales.

**Autenticación:**

- OIDC/OAuth 2.0, proveedor: **Firebase Authentication con Identity Platform** (ver también sección 22.2).
- MFA (TOTP) obligatorio para **todos** los usuarios, no solo roles sensibles; SMS únicamente como recuperación controlada.
- Reautenticación reforzada (MFA de los últimos 5 minutos) exigida antes de ejecutar una operación crítica.

**Sesión:**

- Duración absoluta: 8 horas. Inactividad general: 30 minutos. Roles privilegiados (Gerencia, Finanzas, RR.HH.): 15 minutos.
- Objetivo de revocación tras una baja o incidente: ≤5 minutos.

**Catálogo inicial de roles (**`APROBADA_ARQUITECTURA`**):**

| Rol | Alcance |
| --- | --- |
| Platform Administrator | Configuración técnica; sin operación financiera |
| Corporate Auditor | Consulta y auditoría corporativa (las 4 empresas) |
| Company Administrator | Usuarios y configuración de su empresa |
| Operations Manager | Aprobaciones operativas |
| Reservation Agent | Consultas y reservas |
| Fleet Operator | Vehículos, entrega, devolución, mantenimiento |
| Cashier | Registro de cobros — sin conciliación ni devolución autónoma |
| Finance Approver | Conciliación, garantías, devoluciones |
| HR Manager | Administración de personal |
| Recruiter | Reclutamiento, sin acceso a nómina |
| Read Only | Consulta limitada |

- La matriz rol–permiso–empresa–sede es versionada, con **denegación por defecto**. Un usuario puede pertenecer a varias empresas, pero opera dentro de un contexto activo visible; cambiar de contexto renueva la autorización y cancela borradores incompatibles.
- **Doble aprobación obligatoria** (solicitante y aprobador deben ser personas distintas) para: reembolsos, liberación de garantías, descuentos extraordinarios, anulaciones contables, cambios de cuenta bancaria, ajustes de saldo, asignación de roles privilegiados, eliminación de evidencia, y cambios laborales sensibles.
- Delegaciones: máximo 30 días, con alcance y motivo explícitos. Nunca se delega `Platform Administrator` ni aprobación financiera total. Revisión mensual de usuarios; trimestral de privilegios.

### 15.6 Baseline OWASP y Secure SDLC — `APROBADA_ARQUITECTURA` según SAD-KAIROS-MVP-001 §12.5-12.6 (incorporado 01 sep 2026)

- Adopción de OWASP Top 10 vigente, OWASP API Security Top 10, y OWASP ASVS como catálogo verificable (nivel objetivo pendiente de `SEC-KAIROS-001`, normativo complementario del SAD que Claude no tiene). **Aprobador de la matriz ASVS aplicable/no aplicable, confirmado 02 sep 2026: Eder Ramos (Tech Lead).**
- Toolchain de seguridad aprobado: **Semgrep Community** (SAST), **Trivy** (SCA, contenedores e IaC), **Gitleaks** (secretos), **OWASP ZAP** (DAST), **Syft** (SBOM en CycloneDX/SPDX).
- SLA de remediación por severidad: crítica 24h, alta 7 días, media 30 días, baja 90 días.
- No admiten excepción bajo ninguna circunstancia: bypass de autenticación, acceso entre empresas, RCE, inyección explotable, secretos activos expuestos, pago duplicable, o vulnerabilidad explotada activamente.
- Pentest independiente obligatorio antes de producción, y al menos anual después.

---

## 16. Diseño de integraciones

### 16.1 Identidad (RENIEC/MTC)

| Aspecto | Diseño MVP |
| --- | --- |
| Dirección | Entrada de verificación |
| Modalidad | Adaptador con fallback manual (contingencia sin acceso confirmado) |
| Autoridad | Customers |
| Resultado | `PENDIENTE`/`VERIFICADO`/`RECHAZADO` |
| Indisponibilidad | Expediente queda pendiente de validación, no se bloquea todo el proceso |

### 16.2 Pagos (Banca)

| Aspecto | Diseño MVP |
| --- | --- |
| Dirección | Entrada de evidencia/resultado |
| Modalidad | Manual asistida; automatización futura |
| Autoridad | Payments |
| Resultado | Pendiente, validado o rechazado |
| Indisponibilidad | Mantener reserva/alquiler pendiente, no confirmar |
| Reconciliación | Lista de pagos pendientes y correcciones |

### 16.3 Mensajería (WhatsApp)

**Confirmado 02 sep 2026 (Eder Ramos): no habrá integración de WhatsApp, ni en el Release 1 ni en el MVP.** No es una decisión "todavía no" — es definitiva para el alcance actual. El sistema genera una comunicación versionada y registra el intento (formatos ya existentes: N°01, N°02, N°03, N°5), pero el envío es **siempre manual/asistido** — un humano copia o reenvía el mensaje generado, el sistema no se conecta a la API de WhatsApp. El estado de ningún expediente depende de que WhatsApp confirme la entrega, ni lo dependerá en el futuro cercano.

### 16.4 Mantenimiento (Motrix)

Hoy sin acceso confirmado. VeloxRent no tiene personal mecánico propio actualmente (hallazgo del 24 ago) y deriva todo daño técnico a Motrix por caso (confirmado 31 ago, ver BDD-DEV-001 BR-DEV-006/011) — la integración con Motrix es, en la práctica, más urgente que antes, pero sigue bloqueada por falta de levantamiento con Motrix.

### 16.5 Object storage

- Carga directa mediante sesión autorizada.
- Validación de tamaño, tipo, integridad, duración y malware.
- Acceso privado y temporal.
- Reintentos por partes.
- Ciclo de vida por política legal — provisional: **1 año en almacenamiento activo + mínimo 5 años en archivo externo** (corregido 03 sep 2026 — Fiorella precisó esta cifra sobre los "3 meses" registrados el 02 sep; OQ-SOL-006, `EXCLUIDO_R1` para el detalle legal completo).

**Proveedor y límites técnicos — **`APROBADA_ARQUITECTURA`** según SAD-KAIROS-MVP-001 §13 (incorporado 01 sep 2026):**

| Aspecto | Valor aprobado |
| --- | --- |
| Proveedor | **Google Cloud Storage**, región `southamerica-east1` |
| Capacidad inicial | 1 TB, con revisión trimestral y ampliación al alcanzar 70% de uso o proyección de agotamiento en 6 meses |
| Fotografías | JPEG o WebP, máximo 12 MB por archivo |
| Documentos | PDF o PDF/A, máximo 25 MB |
| Videos | MP4/H.264, máximo inicial 250 MB por archivo — **confirmado 02 sep 2026:** duración de referencia \~7-8 min por video (no el rango de 3-16 min que se había asumido por error), consistente con el límite ya calculado; no requiere ajuste |
| Originales con valor probatorio | No se recomprimen ni alteran; solo las copias operativas pueden optimizarse |
| Cifrado | Administrado por Google, con versionado, soft delete y lifecycle hacia clases frías |

> ✅ **Discrepancia de negocio resuelta (02 sep 2026, hallazgo Q-INS-01 a Q-INS-08 del SAD):** Fiorella confirmó los valores definitivos — **35 fotos** (no 34) y **3 videos independientes de \~7-8 minutos cada uno** (no 1 video segmentado, y no el rango de 3-16 min que se había asumido en una respuesta anterior antes de la aclaración final). `BDD-DEV-001`/`BDD-ALQ-001`/`BDD-KAIROS-TRANSVERSAL.md` ya se actualizaron con estos valores definitivos.

### 16.6 Contrato de resiliencia

| Fallo | Comportamiento |
| --- | --- |
| RENIEC/MTC no responde | No bloquear todo el proceso; expediente pendiente de validación |
| Banca no responde | No confirmar; permitir revisión manual |
| Mensajería no responde | Confirmar si el negocio ya fue confirmado; reintentar la comunicación |
| Storage no responde | Mantener evidencia pendiente; no confirmar modalidad remota ni cerrar checklist |
| Worker falla | Reintento; después cola de excepción |

---

## 17. Offline y sincronización

> ⚠️ **Alcance corregido 01 sep 2026**, según SAD-KAIROS-MVP-001 §14.1 (`APROBADA_ARQUITECTURA`): el offline es **más acotado** de lo que este documento tenía en su versión 2.0. Solo 2 formularios están autorizados offline — no "asistencia" en general, y ningún otro formulario fuera de esos 2.

### 17.1 Alcance

| Acción | Offline | Motivo |
| --- | --- | --- |
| Consultar datos previamente cargados | Limitado | Apoyo operativo en campo |
| **Checklist de entrega del vehículo (Alquiler)** | **Sí** | Único formulario de captura autorizado offline, junto con el de abajo |
| **Checklist de recepción del vehículo (Devolución)** | **Sí** | Único otro formulario de captura autorizado offline |
| Adjuntar archivo pendiente (solo de esos 2 checklists) | Sí, en cola local | Reanudación posterior |
| Cualquier otro formulario (asistencia, permisos, salidas a campo, etc.) | **No** | Corregido 01 sep — el SAD no lo autoriza; solo los 2 checklists anteriores tienen excepción offline |
| Consultar disponibilidad real | No | Requiere autoridad central (DR-KAI-001) |
| Validar pago | No | Requiere autoridad financiera |
| Confirmar reserva/entrega/devolución | No | Operación crítica y concurrente |
| Aprobar excepción o clasificar riesgo | No | Seguridad y auditoría |
| Ejecutar validación RENIEC/MTC | No | Confirmado por el SAD — nunca offline |
| Autorizar salida a campo | No | Requiere disponibilidad del autorizador en línea |

### 17.2 Ciclo de sincronización

1. El dispositivo conserva un borrador cifrado y vinculado al usuario.
2. Al recuperar conexión, solicita estado y versión del servidor.
3. Si no existe conflicto, sincroniza campos y archivos pendientes.
4. Si existe conflicto, muestra comparación y exige resolución.
5. Solo la confirmación del servidor cambia el estado visible a sincronizado.
6. Después del acuse, elimina el material local según política.

### 17.3 Conflictos

| Conflicto | Resolución |
| --- | --- |
| Cambio de contacto no crítico | Selección asistida |
| Vehículo/periodo modificado por otro usuario | No mezclar; recargar y revalidar |
| Expediente ya confirmado/cancelado por otro usuario | Rechazar borrador incompatible |
| Archivo duplicado | Comparar integridad; no duplicar |
| Sesión revocada | Bloquear acceso y proteger/eliminar datos locales |

### 17.4 Parámetros técnicos aprobados y matriz de conflicto ampliada — SAD-KAIROS-MVP-001 §14.3 (incorporado 01 sep 2026)

**TTL y límites aprobados:**

| Elemento | TTL/límite |
| --- | --- |
| Checklist o borrador | 72 h |
| Foto pendiente | 24 h; purga local ≤1 h tras carga confirmada |
| Video pendiente | 24 h |
| Comando normal | 8 h |
| Comando de reserva/disponibilidad | **15 min — nunca puede confirmar offline** |
| Tombstone (registro de borrado) | Confirmación del servidor + 7 días; máximo 30 días |
| Sesión offline | 8 h |
| Reintentos | Máximo 10 en 24h, backoff exponencial con jitter |
| Cola local | 100 comandos y 250 MB de evidencias como máximo |

Al agotar reintentos o capacidad, se suspende nueva captura offline, se conserva lo pendiente sin perderlo, y se guía al usuario a conectarse o pedir soporte.

**Matriz de conflicto por tipo de dato (ampliada):**

| Tipo de dato | Regla de resolución |
| --- | --- |
| Disponibilidad, Reserva, estado del vehículo | Prevalece siempre el servidor — sin override manual posible |
| Pago | Exclusivamente online — la fuente financiera siempre prevalece |
| Checklist | Campos distintos se combinan (merge); el mismo campo modificado por dos actores requiere resolución de un supervisor |
| Evidencias | Aditivas — nunca se sobrescriben silenciosamente |
| Datos de empleados | Resuelve Recursos Humanos |
| Borrados críticos | Resuelve el Data Owner |

**Cifrado local:** claves generadas por dispositivo/usuario mediante Web Crypto (`AES-256-GCM`), protegidas por una clave no exportable habilitada solo después de autenticar. Rotan cada 90 días y ante cierre de sesión, revocación o incidente. Los datos altamente sensibles no están disponibles en modo offline bajo ninguna circunstancia.

---

## 18. UX Architecture (principios transversales)

### 18.1 Principios

- Mobile first para campo (inspecciones, salidas a campo, asistencia).
- Formularios por pasos, con guardado de borrador.
- Estado de sincronización siempre visible.
- Errores accionables, vinculados al campo y con resumen general.
- No depender exclusivamente del color.
- Confirmación reforzada para acciones irreversibles (cancelación, aprobación de excepción, decisión de contratación).
- Interfaces por rol, no por persona (DR-KAI-008).
- Glosario funcional (BDD transversal) reutilizado como fuente de términos de UI.

### 18.2 Navegación inicial

1. Inicio/tablero. 2. Consultas. 3. Reservas. 4. Alquileres. 5. Devoluciones. 6. Flota. 7. Clientes. 8. Pagos/garantías. 9. Incidencias. 10. Personal (Reclutamiento + Administración). 11. Reportes. 12. Administración del sistema.

### 18.3 Estados visuales obligatorios

- Cargando. Sin resultados. Bloqueo provisional con vencimiento (Reserva). Pago pendiente, validado o rechazado. Evidencia procesando, válida o rechazada. Conflicto de versión. Sin conectividad. Sin permiso. Confirmación parcial prohibida. Error recuperable con siguiente acción.

### 18.4 Accesibilidad

- WCAG 2.2 AA como objetivo.
- Navegación por teclado.
- Confirmación reforzada para cancelaciones y cambios críticos.

> 📌 Los flujos de pantalla específicos por proceso viven en la sección 18 de cada `SDD-XXX-001`.

---

## 19. Requisitos no funcionales y tácticas (transversales)

> ⚠️ **Actualizado 01 sep 2026** con los valores del SAD-KAIROS-MVP-001 §16, que en su mayoría ya están `APROBADA_ARQUITECTURA` (Tech Lead) — suben de estado respecto a la versión 2.0 de este documento, que los tenía en `SUPUESTO`/`PROPUESTA_SOLUCIÓN`.

| ID | Atributo | Objetivo/criterio | Táctica | Estado |
| --- | --- | --- | --- | --- |
| NFR-KAI-001 | Consistencia de disponibilidad | 0 dobles confirmaciones del mismo vehículo | Exclusión transaccional (sección 5.2) | `CONFIRMADA_NEGOCIO` (SAD NFR-001) |
| NFR-PERF-001 | Lectura común | **p95 ≤2 s** | Índices, consulta acotada | `APROBADA_ARQUITECTURA` (SAD NFR-002) |
| NFR-PERF-002 | Comando transaccional sin archivos | **p95 ≤3 s** | API stateless | `APROBADA_ARQUITECTURA` (SAD NFR-003) |
| NFR-AVL-001 | Disponibilidad | **99.9% mensual, 24×7** (incluye mantenimiento programado y no programado; error budget ≈43 min 49 s/mes) — no limitada a la ventana operativa 8am-5pm de negocio | Monitoreo y alertas | `APROBADA_ARQUITECTURA` (SAD NFR-004) — **factibilidad ya demostrada: plan productivo de Supabase confirmado por Eder Ramos el 02 sep 2026** (ver sección 22.1) |
| NFR-ERR-001 (nuevo) | Tasa de error de API | **\<0.5%**, excluyendo errores atribuibles al cliente | Monitoreo de tasa de error | `APROBADA_ARQUITECTURA` (SAD NFR-005) |
| NFR-REL-001 | Idempotencia | 0 duplicados por reintento | Clave de idempotencia y registro de resultado | `APROBADA_ARQUITECTURA` (ratificado por Eder Ramos, 04 sep 2026) |
| NFR-AUD-001 | Auditoría | 100% de comandos críticos | Auditoría/outbox | `APROBADA_ARQUITECTURA` (SAD NFR-008; ratificado por Eder Ramos, 04 sep 2026) |
| NFR-SEC-001 | Aislamiento multiempresa | 0 accesos cruzados no autorizados | Alcance derivado + política de datos (sección 14.4) | `APROBADA_ARQUITECTURA` (SAD NFR-009; ratificado por Eder Ramos, 04 sep 2026) |
| NFR-DR-001 | RPO | **≤15 min** | PostgreSQL con PITR/WAL continuo (Supabase) | `APROBADA_ARQUITECTURA` (SAD NFR-006) |
| NFR-DR-002 | RTO | **≤2 h** | IaC/runbook | `APROBADA_ARQUITECTURA` (SAD NFR-007) |
| NFR-UX-001 | Accesibilidad | **WCAG 2.2 nivel AA**; nivel A es barrera mínima que nunca puede incumplirse | Componentes y auditoría UX (axe, Lighthouse) | `APROBADA_ARQUITECTURA` (SAD NFR-010) |
| NFR-COMPAT-001 (nuevo) | Compatibilidad de navegadores | Versión estable actual + principal anterior de Chrome, Edge, Firefox y Safari; sin versiones beta | — | `APROBADA_ARQUITECTURA` (SAD NFR-011) |

> 📌 Los NFR específicos de negocio por proceso (ej. NFR-BIZ-001/002 de tiempos de inspección de Alquiler, NFR-BIZ-003 de plazo de garantía de Devolución) viven en la sección 19 de cada SDD de proceso.

### 19.1 Volumetría base

El volumen observado es bajo (16 alquileres/mes promedio, pico de 31 en mayo 2025), pero el dimensionamiento debe contemplar las 4 empresas del grupo, evidencias grandes y picos concurrentes de consulta. Reserva sigue sin ningún NFR propio medible más allá de los transversales — pendiente con Fiorella.

### 19.2 Capacidad multimedia

Las 34 fotografías y 3 videos de al menos 7 minutos son **reglas de negocio** (BR-INS-002/004), no NFR de infraestructura. Se utilizan como entrada para estimar ancho de banda, almacenamiento, tiempo de carga y retención — ese cálculo exacto se refina en el TDD cuando se asigne un responsable técnico.

---

## 20. Observabilidad

### 20.1 Señales

| Señal | Propósito |
| --- | --- |
| Latencia de disponibilidad | Experiencia y capacidad |
| Conflictos de bloqueo/solapamiento | Demanda y concurrencia |
| Confirmaciones fallidas por causa | Mejora operativa |
| Bloqueos/reservas expirados | Conversión y política |
| Pagos pendientes | Operación financiera |
| Evidencias rechazadas | Calidad de captura (relacionado con THR-006) |
| Eventos en excepción | Salud asíncrona |
| Accesos denegados | Seguridad |
| Autorizaciones escaladas al 3er nivel | Cumplimiento de la cascada (BR-ADP-004) |

### 20.2 Trazabilidad técnica

Cada operación propaga un identificador de correlación desde la interfaz hasta módulos, eventos y workers. Los logs no deben contener documentos, vouchers, URLs firmadas ni datos personales completos.

### 20.3 Alertas

- Error de confirmación por encima del umbral.
- Cola de excepción con mensajes.
- Tiempo de disponibilidad incumplido.
- Tasa anormal de accesos denegados.
- Almacenamiento o base cerca del límite.
- Fallo reiterado de notificaciones.
- Recordatorio de devolución no ejecutado (relacionado con P-33).

### 20.4 Toolchain aprobado — SAD-KAIROS-MVP-001 §17 (incorporado 01 sep 2026)

| Herramienta | Uso | Estado |
| --- | --- | --- |
| **Sentry** | Errores y trazas de aplicación (frontend + backend) | `APROBADA_ARQUITECTURA` |
| **Google Cloud Logging** | Logs de backend y plataforma | `APROBADA_ARQUITECTURA` |
| **GitHub Actions** | Ejecución de CI/CD y quality gates | `APROBADA_ARQUITECTURA` |
| Firebase Performance | Complementario, frontend | Propuesto |
| Cloud Monitoring, Error Reporting, OpenTelemetry | Complementario, backend | Propuesto |
| Supabase Logs/Reports | Complementario, PostgreSQL | Propuesto |

Métricas mínimas aprobadas: disponibilidad, P50/P95/P99, tasa 4xx/5xx, saturación, conexiones, colas offline, conflictos, reservas fallidas, duplicados, fallos de MFA y accesos denegados. Retención de logs — **actualizado 04 sep 2026, confirmada en su totalidad por el usuario, ya **`CONFIRMADO`** en las 6 categorías (ya no candidata ni sujeta a Legal):** logs técnicos online 90 días, trazas de rendimiento 30 días, eventos de seguridad 1 año, auditoría funcional general 5 años, **pagos/contratos/evidencia probatoria 10 años**, alertas e incidentes 5 años.

---

## 21. Continuidad, recuperación y degradación

| Falla | Servicio conservado | Servicio suspendido | Recuperación |
| --- | --- | --- | --- |
| Mensajería | Todos los procesos, consulta | Envío automático | Reintento/manual |
| Banca | Borrador de pago | Confirmación financiera | Validación manual |
| Storage de evidencia | Presencial sin evidencia pendiente | Modalidad remota, cierre de checklist | Reintento |
| Base transaccional | Ningún comando | Confirmación de cualquier proceso | Failover/restore |
| Conectividad en campo | Borrador local | Comandos críticos | Sincronización |
| Worker | Operación principal | Side effects (notificaciones, proyecciones) | Cola/reproceso |
| RENIEC/MTC | Captura del expediente | Verificación automática | Contingencia manual |

### 21.1 Recuperación

- Backups automáticos y recuperación a punto en el tiempo.
- Versionado de objetos.
- Infraestructura reproducible.
- Despliegue reversible.
- Migraciones compatibles hacia atrás.
- Reconciliación de outbox y mensajes.
- Prueba periódica de RPO/RTO.

### 21.2 Política de backups aprobada — SAD-KAIROS-MVP-001 §18 (incorporado 01 sep 2026)

- PostgreSQL productivo con **PITR/WAL continuo** para cumplir RPO ≤15 min (soportado por el plan productivo de Supabase — no por el plan gratuito, ver sección 22.2).
- Backup diario retenido 30 días, mensual retenido 12 meses, anual según lo que defina Legal.
- **Restauración de prueba trimestral** y **simulacro integral semestral**, midiendo RPO/RTO reales hasta validación funcional — no basta con la garantía contractual del proveedor.
- Migraciones de base de datos siguen el patrón *expand/contract*, compatibles hacia atrás. El rollback de aplicación se hace mediante *forward-fix* o reconciliación posterior — nunca mediante restauración ciega de base de datos, para no destruir operaciones válidas ocurridas después del punto de respaldo.

---

## 22. Despliegue lógico y ambientes

> ⚠️ **Actualizado 01 sep 2026:** el SAD reemplaza la topología genérica anterior (CDN/WAF + API + monolito, "propuesta") por una topología con **proveedores concretos aprobados**, ya no una arquitectura abstracta.

### 22.1 Topología aprobada — SAD-KAIROS-MVP-001 §19 (`APROBADA_ARQUITECTURA`)

```
flowchart TD
    NET["Internet"] --> HOST["Firebase Hosting"]
    HOST --> PWA["React PWA"]
    PWA --> AUTH["Firebase Authentication / Identity Platform"]
    PWA --> API["Node.js en Google Cloud Run"]
    API --> DB["Supabase PostgreSQL"]
    API --> OBJ["Google Cloud Storage (evidencia)"]
    API --> Q["Outbox y procesamiento asíncrono"]
```

**Stack tecnológico aprobado (30 ago 2026):**

| Capa | Decisión | Región/detalle |
| --- | --- | --- |
| Frontend | **React SPA/PWA + TypeScript + Vite + React Router**; sin Next.js | Desplegado en **Firebase Hosting**. TanStack Query gestiona server state; Zustand solo estado global cliente; React Hook Form + Zod formularios; cliente generado desde OpenAPI; Workbox PWA; Dexie/IndexedDB solo para los dos checklists offline autorizados |
| Backend | **Node.js 22 LTS + TypeScript 5.9.x**, contenerizado | **Google Cloud Run**, `southamerica-east1` (São Paulo) |
| Base transaccional | **PostgreSQL administrado por Supabase** | `sa-east-1` (São Paulo) |
| ORM | **Prisma ORM 7.10.0** (`prisma`, `@prisma/client`, `@prisma/adapter-pg` en versiones idénticas) | — |
| Identidad/OIDC | **Firebase Authentication con Identity Platform** | — |
| CI/CD | **GitHub + GitHub Actions** | — |
| Evidencias | **Google Cloud Storage**, `southamerica-east1` | 1 TB inicial (ver sección 16.5) |

### 22.1.1 Decisión de arquitectura frontend — formalizada 10 sep 2026

| Capacidad | Tecnología decidida | Límite de responsabilidad |
| --- | --- | --- |
| Build/dev server | Vite | Compilar SPA/PWA; no introducir SSR/SSG |
| Navegación | React Router | Rutas, layouts, guards UX, breadcrumbs y lazy loading; la API conserva la autorización real |
| Server state | TanStack Query | Cache, loading, reintentos, invalidación y sincronización con API |
| Client state | Zustand | Solo shell, empresa/sede activa, preferencias y estado visual; no duplicar server state ni formularios |
| Formularios | React Hook Form + Zod | Estado de campos y validación cliente compartible; backend revalida siempre |
| Contratos | OpenAPI + cliente/tipos generados | Prohibido mantener DTO manual paralelo |
| PWA | `vite-plugin-pwa` + Workbox | App shell/cache; no ampliar el alcance offline funcional |
| Offline autorizado | IndexedDB mediante Dexie | Exclusivamente ALQ-09 y DEV-04, cifrado y aislado |
| UI accesible | Radix UI Primitives + design system propio | Primitivas sin imponer apariencia; tokens UX/UI v3.1 gobiernan el diseño |
| Estilos | CSS Modules + CSS Custom Properties | Encapsulación y tokens; sin valores visuales ad hoc |
| Tablas/iconos/fechas | TanStack Table, Lucide React, date-fns | Una solución común y accesible |
| Pruebas | Vitest, Testing Library, user-event, MSW, Playwright y axe | Unitarias, componentes, contrato simulado, E2E y accesibilidad |
| Observabilidad | Sentry | Errores y trazas sin PII |

Las versiones exactas se fijan en el lockfile durante el bootstrap técnico, validando compatibilidad entre sí. Los agentes no pueden cambiar major versions ni sustituir una herramienta sin ADR aprobada.

> Esto resuelve directamente las decisiones que este documento tenía como `PENDIENTE` en la sección 28 (`OQ-SOL-001` proveedor cloud, `OQ-SOL-002` backend, `OQ-SOL-003` ORM, `OQ-SOL-004` IdP) — ver esa sección para el detalle actualizado.

**Plan productivo ya confirmado (Eder Ramos, 02 sep 2026): "Sí, confirmado."** El plan de Supabase que garantiza contractualmente 99.9% de disponibilidad, RPO de 15 min y RTO de 2 horas ya está contratado — **deja de ser una advertencia abierta**, era la última pieza que faltaba para que los NFR de la sección 19 (`NFR-AVL-001`, `NFR-DR-001`, `NFR-DR-002`) pasen de "objetivo sobre un plan gratuito sin garantía" a "objetivo sobre un plan contractualmente respaldado". Los planes gratuitos siguen usándose solo en DEV/QA/piloto, como estaba previsto. **Sobre la residencia de datos en São Paulo: Fiorella confirmó que no se requiere aprobación legal adicional** — cerrado (`ARQ-001L` del SAD).

### 22.2 Ambientes

| Ambiente | Uso | Datos | Integraciones |
| --- | --- | --- | --- |
| Desarrollo (Local/Dev) | Desarrollo, integración continua | Sintéticos | Emuladas/mocks |
| QA/Integración | Pruebas funcionales | Anonimizados/sintéticos | Sandbox |
| Preproducción/UAT | Aceptación de negocio | Controlados | Cercanas a real |
| Producción | Operación | Reales | Productivas |

**Gobierno de despliegue aprobado (SAD §19):**

| Ambiente | Quién despliega |
| --- | --- |
| DEV | Desarrolladores, vía CI |
| QA | CI, con aprobación de QA |
| UAT | DevOps, con aprobación de QA/Product Owner |
| PROD | **DevOps, con aprobación de Tech Lead y del responsable funcional del módulo — ningún desarrollador despliega manualmente a producción** |

- Cloud Run: despliegue canary/progresivo, cambio controlado de tráfico.
- Firebase Hosting: preview channels, release atómico.
- Runbooks versionados en Git: DevOps los mantiene, Tech Lead los aprueba, QA los valida mediante simulacros.

### 22.3 Separación

Credenciales, almacenamiento, base de datos, colas y claves se separan por ambiente. No se copian datos productivos sin anonimización y autorización (ver protocolo de anonimización en la sección 23.5).

---

## 23. Migración y convivencia

### 23.1 Fuentes

- `CONTROL_DE_ALQUILERES_INTERNO` y `CONTROL_DE_ALQUILERES_EXTERNO` (Excel).
- Documentos físicos y contratos.
- Google Drive.
- Conversaciones de WhatsApp como evidencia limitada.
- Registros de vehículos y tarifario.
- Expedientes de personal (Reclutamiento, Administración de Personal).

### 23.2 Alcance inicial — actualizado 01 sep 2026 según SAD §23 (`APROBADA_ARQUITECTURA`)

- **Mínimo un año de historia** disponible (reemplaza el `SUPUESTO` anterior de "24 meses") — cualquier ampliación se decide durante el inventario de fuentes.
- Clientes activos y clasificación de riesgo vigente.
- Vehículos disponibles o comprometidos (9 unidades activas) — flota completa.
- Reservas/contratos abiertos y saldos pendientes.
- Personal activo, con expediente de Reclutamiento y Administración de Personal, y reclutamientos abiertos.
- Evidencias ligadas a procesos activos o con obligación de conservación legal.

**Umbral de aceptación aprobado:** menos de 0.5% de entidades migradas con defecto o sin reconciliar, con métricas también publicadas por campo y por expediente. **Tolerancia cero** (cualquier error crítico/alto bloquea la aceptación) para: pagos, contratos activos, identidad fuerte, VIN, empleados activos, permisos, `company_id`, integridad referencial, aislamiento entre empresas, evidencias críticas y saldos.

### 23.3 Flujo — ampliado según SAD §23

1. Inventariar fuente y propietario.
2. Perfilar calidad y duplicados.
3. Definir mapeo y reglas de transformación.
4. Ejecutar carga de prueba.
5. Reconciliar por las claves de coincidencia aprobadas (sección 14.4).
6. Migrar los datos mínimos para operación.
7. Conservar archivos históricos según política.
8. **Crear backup o punto de recuperación antes de cada delta** (nuevo, SAD).
9. Sincronizar deltas por fecha de creación, última actualización y sincronización.
10. Validar el resultado contra el umbral (sección 23.2); ante defectos no aceptables, volver al paso anterior.
11. Desplegar progresivamente por módulo — **primero VeloxRent, luego grupos controlados de usuarios de las otras empresas**.

**Implementación técnica aprobada:** backup administrado de Supabase + `pg_dump` cifrado en Google Cloud Storage; journal de migración idempotente; Prisma Migrate + SQL versionado. DevOps ejecuta, Datos concilia, el Data Owner aprueba por módulo.

### 23.4 Convivencia — plazo concreto aprobado (SAD §23)

Excel, Drive y WhatsApp prevalecen **hasta que se apruebe el módulo correspondiente**. Una vez aprobado un módulo, KAIROS pasa a ser la fuente operativa prevalente y **convive como máximo 1 mes** con los mecanismos anteriores — pasado ese mes, se retira el uso operativo paralelo salvo excepción documentada. Una extensión requiere aprobación conjunta de Sponsor + Tech Lead + Data Owner (máximo 30 días adicionales); una segunda extensión pasa al comité de cambios con plan de cierre obligatorio.

### 23.5 Rollback funcional

Si el go-live se revierte, se exportan las operaciones nuevas y pendientes, se informa el momento de corte y se activa el procedimiento manual (Excel/WhatsApp) que ya conoce el personal. Los datos registrados en KAIROS no se destruyen. El rollback de aplicación usa la revisión anterior de Cloud Run/Firebase Hosting; los datos se corrigen mediante *forward-fix* o reconciliación posterior, nunca mediante restauración ciega (ver sección 21.2).

### 23.6 Anonimización para QA/UAT — nuevo, SAD §23 (incorporado 01 sep 2026)

Protocolo aprobado para extraer datos productivos hacia ambientes no productivos: (1) autorización formal de la extracción; (2) copia temporal cifrada en zona aislada; (3) eliminación de secretos/credenciales; (4) sustitución — nombres sintéticos, documento/teléfono/correo tokenizados o sustituidos de forma determinística, direcciones/fechas generalizadas o desplazadas, pagos sintéticos sin referencias reales, fotos/firmas/biometría/contratos eliminados y reemplazados por archivos sintéticos; (5) validación de integridad referencial; (6) búsqueda de residuos de información personal; (7) **Legal/Privacidad aprueba la ausencia razonable de reidentificación**, QA valida integridad antes de publicar; (8) destrucción de la copia temporal, con registro del ejecutor y aprobador.

### 23.7 Respuestas de negocio a las preguntas de migración pendientes (02 sep 2026)

> Fiorella respondió las preguntas D.4-D.7 de la ronda del 02 de septiembre. Ninguna es bloqueante — todas se resuelven en el momento de ejecutar la migración, no antes.

| Pregunta | Respuesta |
| --- | --- |
| Columnas exactas y transformación por fuente | Se define recién al momento de migrar cada fuente — no bloquea avanzar con el resto del diseño |
| Fuentes con fecha confiable para migración delta | No es bloqueante; se validará la información en su momento, no es necesario resolverlo para el MVP |
| Registros sin identificador fuerte (sin DNI/RUC claro) | No se migran automáticamente — se valida con negocio caso por caso si corresponde migrarlos; no es parte del MVP |
| Conciliación de operaciones registradas por error en ambos sistemas durante la convivencia | **Regla confirmada: prevalece el registro con la actualización más reciente** — si KAIROS se actualizó último, prevalece KAIROS; si el Excel se actualizó último, prevalece el Excel. Se resuelve por timestamp de última modificación, en cualquiera de las 2 direcciones |

La última fila (conciliación) sí es una regla de diseño concreta — se incorpora al flujo de migración (sección 23.3, paso 9) como criterio de resolución de conflictos por `last-write-wins` entre las 2 fuentes.

---

## 24. Estrategia de pruebas de solución (transversal)

| Nivel | Cobertura |
| --- | --- |
| Arquitectura | Límites y dependencias entre los módulos de los 6 procesos (sección 8.3) |
| Contrato lógico | Operaciones y eventos |
| Integración | Customers, Fleet, Payments, Evidence, Recruitment, HR-Administration |
| Concurrencia | Dos confirmaciones del mismo vehículo (DR-KAI-001) |
| Resiliencia | Fallos de storage, pago, mensajería, RENIEC/MTC |
| Seguridad | Rol, empresa, evidencia y replay (sección 15.3) |
| Offline | Borrador, conflicto y sincronización (sección 17) |
| Recuperación | Backup, restore y outbox |
| Aceptación | Escenarios BDD de los 6 procesos |

### 24.1 Casos obligatorios transversales

- Confirmación exitosa presencial y remota (Reserva, Alquiler).
- Cliente rojo intenta iniciar una operación.
- Bloqueo/reserva expirado.
- Reintento idempotente en cualquier comando crítico.
- Usuario de otra empresa intentando acceder a un expediente ajeno.
- Evidencia rechazada por conteo o duración insuficiente.
- Worker/notificación indisponible.
- Escalamiento de autorización a 2do y 3er nivel.

> 📌 Los casos obligatorios específicos por proceso viven en la sección 24 de cada SDD de proceso.

---

## 25. ADR transversales

> ⚠️ **Actualizado 01 sep y 02 sep 2026:** `SAD-KAIROS-MVP-001` §20 formaliza 11 ADR con el Tech Lead como autoridad declarada, fechados 30 ago 2026. Los primeros 5 corresponden exactamente a `ADR-KAI-001` a `005` de este documento — se adopta su estado de aprobación. Se agregan `ADR-KAI-007` (multiempresa), `ADR-KAI-010` (Clean Architecture) y `ADR-KAI-011` (Secure SDLC). `ADR-KAI-006` sigue viviendo en `SDD-REC-001`/`SDD-ADP-001`. La sección 25.1 documentaba `ADR-008` y `ADR-009` del SAD como sin cerrar — `ADR-008`\*\* ya se cerró el 02 sep 2026\*\* (confirmado por Eder Ramos, Tech Lead: no existe ni existirá `VehicleHold`); `ADR-009` (aceptación remota) sigue con gate Legal abierto.

### ADR-KAI-001 — Monolito modular

| Elemento | Contenido |
| --- | --- |
| Contexto | Bajo volumen inicial (DR-KAI-010) y reglas todavía evolucionando en los 6 procesos |
| Decisión | Implementar los módulos de dominio en una unidad desplegable |
| Alternativas | Microservicios, monolito no modular (sección 5.1) |
| Beneficio | Transacciones locales y menor costo operativo |
| Consecuencia | Requiere control estricto de dependencias (sección 8.3) |
| Reversibilidad | Módulos extraíbles cuando existan disparadores medidos |
| Estado | `APROBADA_ARQUITECTURA` — ratificado por el Tech Lead el 30 ago 2026 (SAD-KAIROS-MVP-001, ADR-001). Reconsiderar cuando exista escalado, SLA, equipo o ciclo de despliegue independiente medido |

### ADR-KAI-002 — Consistencia fuerte de disponibilidad

| Elemento | Contenido |
| --- | --- |
| Contexto | Dos usuarios pueden reservar o alquilar el mismo vehículo simultáneamente |
| Decisión | Autoridad central y exclusión transaccional por intervalo (sección 5.2) |
| Alternativa rechazada | Validación solo en UI o consistencia eventual |
| Consecuencia | Dependencia de base transaccional para confirmar |
| Estado | `APROBADA_ARQUITECTURA` — ratificado por el Tech Lead el 30 ago 2026 (SAD-KAIROS-MVP-001, ADR-002) |

### ADR-KAI-003 — Outbox transaccional para side effects

| Elemento | Contenido |
| --- | --- |
| Contexto | Confirmar una reserva, un alquiler o una devolución dispara efectos secundarios (notificaciones, proyecciones de reportes, eventos hacia otros módulos) que no deben perderse ni quedar inconsistentes con el estado principal |
| Decisión | Persistir el estado del agregado y el evento de dominio en la misma transacción de base de datos (patrón outbox); un publicador separado entrega el evento a la cola después |
| Alternativas evaluadas | (a) Publicar el evento directamente a la cola dentro de la misma transacción de negocio — descartada, el broker puede fallar y dejar el estado sin evento; (b) publicar después de confirmar, sin outbox — descartada, una caída entre el commit y la publicación pierde el evento sin posibilidad de recuperación |
| Justificación | Es la única alternativa de las evaluadas que garantiza que un expediente confirmado nunca queda sin su evento correspondiente |
| Consecuencias positivas | Cero pérdida de eventos; notificaciones y proyecciones pueden reconstruirse ante una falla del publicador |
| Consecuencias negativas | Retraso entre la confirmación y la entrega del evento (asíncrono, no instantáneo); requiere un proceso de limpieza/purga de la tabla outbox |
| Riesgos | Acumulación de eventos no publicados si el publicador falla de forma sostenida — mitigado con alertas (sección 20.3) |
| Reversibilidad | Alta — es un detalle de implementación interno, no afecta contratos externos |
| Estado | `APROBADA_ARQUITECTURA` — ratificado por el Tech Lead el 30 ago 2026 (SAD-KAIROS-MVP-001, ADR-003) |

### ADR-KAI-004 — Confirmación no disponible offline

| Elemento | Contenido |
| --- | --- |
| Contexto | El personal de campo (inspecciones, asistencia, salidas) tiene conectividad limitada (DR-KAI-009); algunas operaciones son candidatas a funcionar sin conexión |
| Decisión | La captura de datos puede continuar como borrador local sin conexión, pero disponibilidad de vehículo, pago, confirmación de reserva/alquiler y autorización de excepciones requieren autoridad central — nunca se confirman offline |
| Alternativas evaluadas | (a) Confirmar todo offline con reconciliación posterior — descartada, reintroduce el riesgo de doble reserva/alquiler que DR-KAI-001 busca eliminar; (b) bloquear toda la app sin conexión — descartada, impide el trabajo de campo real |
| Justificación | Prioriza integridad de datos críticos sobre disponibilidad local del sistema |
| Consecuencias positivas | Cero conflictos de doble confirmación por trabajo offline; el personal de campo puede seguir capturando evidencia sin conexión |
| Consecuencias negativas | El personal debe tener conectividad en el momento exacto de confirmar una operación crítica |
| Riesgos | Pérdida de un borrador local si el dispositivo falla antes de sincronizar — mitigado con guardado incremental |
| Reversibilidad | Media — ampliar el alcance offline más adelante (OQ-SOL-005) requeriría rediseñar la resolución de conflictos (sección 17.3) |
| Estado | `APROBADA_ARQUITECTURA` — ratificado por el Tech Lead el 30 ago 2026 (SAD-KAIROS-MVP-001, ADR-004). Alcance offline acotado a los 2 checklists — ver sección 17.1, corregida el 01 sep |

### ADR-KAI-005 — Carga directa de evidencia a almacenamiento de objetos

| Elemento | Contenido |
| --- | --- |
| Contexto | Cada expediente de Alquiler/Devolución genera 35 fotos + 3 videos (BR-INS-002/004) — volumen alto de binarios que no debe pasar por la API principal |
| Decisión | Los binarios se cargan directamente al almacenamiento de objetos mediante una URL de autorización temporal; la API conserva solo metadatos y controla el ciclo de vida de la evidencia |
| Alternativas evaluadas | (a) Subir los archivos a través de la API — descartada, satura el backend; (b) permitir carga a un bucket público — descartada, expone evidencia sensible |
| Justificación | Separa el tráfico pesado (binarios) del tráfico transaccional (comandos), y mantiene la evidencia sensible fuera de acceso público por diseño |
| Consecuencias positivas | La API no se satura con archivos grandes; el almacenamiento de objetos escala independientemente |
| Consecuencias negativas | Requiere un worker separado para validar tipo, tamaño, hash y malware después de la carga |
| Riesgos | Una carga que falla a mitad de camino puede dejar metadatos huérfanos — mitigado con expiración de sesiones de carga no confirmadas |
| Reversibilidad | Media — cambiar el patrón de carga afectaría el frontend y el contrato de `/upload-sessions` |
| Estado | `APROBADA_ARQUITECTURA` — ratificado por el Tech Lead el 30 ago 2026 (SAD-KAIROS-MVP-001, ADR-005) |

### ADR-KAI-007 — Aislamiento multiempresa en esquema compartido

| Elemento | Contenido |
| --- | --- |
| Contexto | Grupo corporativo de 4 empresas desde el inicio, con necesidad de reportes consolidados y costo operativo bajo |
| Decisión | Esquema de base de datos compartido (no un esquema por empresa), con contexto empresarial obligatorio en cada tabla, autorización en la capa de aplicación y control complementario en los datos (RLS) |
| Alternativa rechazada | Un esquema o base de datos separada por empresa — descartada por mayor costo operativo y complejidad de reportes consolidados, injustificada al volumen actual |
| Consecuencia | El detalle físico completo vive en la sección 14.4 (maestros globales, RLS, reglas de coincidencia) |
| Riesgo | Una omisión de filtro de alcance puede exponer datos de otra empresa — requiere pruebas negativas automáticas de aislamiento (sección 24.1) |
| Estado | `APROBADA_ARQUITECTURA` — ratificado por el Tech Lead el 30 ago 2026 (SAD-KAIROS-MVP-001, ADR-007) |

### ADR-KAI-010 — Clean Architecture como arquitectura interna obligatoria

| Elemento | Contenido |
| --- | --- |
| Contexto | KAIROS debe proteger sus reglas de negocio frente a cambios de framework, persistencia, transporte o proveedor, y facilitar pruebas |
| Decisión | Cada módulo se organiza en 4 capas — Domain, Application, Adapters, Infrastructure — con dependencias exclusivamente hacia adentro (`Infrastructure → Adapters → Application → Domain`); Domain no depende de frameworks, HTTP, ORM, base de datos, colas, cloud ni UI |
| Consecuencia | Exige puertos, mappers, pruebas de arquitectura automatizadas y disciplina de dependencias — puede agregar código explícito en los límites entre capas |
| Conformidad | Verificado mediante análisis de dependencias en CI y revisión de PR; el detalle exacto vive en `ENG-KAIROS-001` (normativo complementario del SAD, no entregado a Claude) |
| Estado | `APROBADA_ARQUITECTURA` — ratificado por el Tech Lead el 30 ago 2026 (SAD-KAIROS-MVP-001, ADR-010) |

### ADR-KAI-011 — Secure SDLC basado en OWASP

| Elemento | Contenido |
| --- | --- |
| Contexto | KAIROS procesa identidad, pagos, evidencia biométrica, información laboral y datos de 4 empresas distintas |
| Decisión | Adoptar OWASP Top 10, OWASP API Security Top 10 y OWASP ASVS como baseline verificable, con controles automáticos (SAST, SCA, secretos, IaC, DAST, SBOM) y revisión humana — ver toolchain aprobado en la sección 15.6 |
| Consecuencia | Los pipelines de CI/CD incorporan los 5 controles automáticos; las excepciones de seguridad son temporales, con propietario y fecha de expiración obligatorios |
| Conformidad | `SEC-KAIROS-001` (normativo complementario del SAD, no entregado a Claude) y los quality gates de seguridad — ver sección 15.6 |
| Estado | `APROBADA_ARQUITECTURA` — ratificado por el Tech Lead el 30 ago 2026 (SAD-KAIROS-MVP-001, ADR-011) |

> 📌 **ADR-KAI-006** (Recruitment y HR-Administration como módulos separados) es específico del dominio de Talento Humano y vive en `SDD-REC-001` / `SDD-ADP-001`.

### 25.1 Decisiones sin cerrar del SAD — no adoptadas como ADR-KAI-\*, incorporado 01 sep 2026

> Estas 2 decisiones del SAD (`ADR-008` y `ADR-009`) \*\*no se convierten en \*\*`ADR-KAI-*` porque el propio SAD las deja explícitamente sin cerrar. Se documentan aquí para que cualquiera que lea este SDD sepa que existe una propuesta en evaluación — sin tratarla como decisión vigente.

`ADR-008`\*\* — CERRADO 02 sep 2026: no existe ni existirá `VehicleHold`.\*\*

- **Decisión definitiva, confirmada por Eder Ramos (Tech Lead) el 02 sep 2026: "No hay ni habrá **`VehicleHold`**."** Esto cierra formalmente el `ADR-008` del SAD — la propuesta de un bloqueo atómico de 10 minutos queda **retirada**, no solo pendiente.
- **Diseño vigente y definitivo** (el que ya construimos en `SDD-RES-001`/`TDD-RES-001`): `VehicleCommitment` se crea únicamente en la confirmación de Reserva/Alquiler, cuando pago y documentos están completos a la vez — no existe ningún hold previo, ni lo habrá. Coincide con BR-RES-009 del BDD (confirmada 27 y 31 ago) y ahora también con la decisión explícita del Tech Lead. **No hay que cambiar nada en los documentos ya construidos — ya estaban alineados con esta decisión antes de que se formalizara.**
- **Sobre el riesgo que motivó la propuesta** ("pago recibido después de que otro cliente confirme el mismo vehículo", `Q-RES-01` del SAD): Eder Ramos también confirmó (02 sep) que este escenario no aplica tal como se planteaba — **la reserva/alquiler solo se confirma (bloquea el vehículo) cuando se cumplen los requisitos ya definidos** (pago + documentos simultáneos). No hace falta un mecanismo adicional de bloqueo temprano.
- \*\*Consecuencia para \*\*`OQ-SOL-013` (sección 28): dado que el escenario "pago sin disponibilidad posterior" no se produce bajo el diseño confirmado, esa decisión abierta también se cierra — ver sección 28.

**SAD ADR-009 — Aceptación remota provisional, con gate Legal abierto:**

- Estado SAD: `APROBADA_ARQUITECTURA_CON_GATE_LEGAL` — el mecanismo técnico (hash SHA-256, timestamp, identidad autenticada, MFA/OTP, consentimiento explícito, versión documental, IP/dispositivo, auditoría, copia al cliente, almacenamiento inmutable) ya está aceptado arquitectónicamente.
- **Lo que falta no es técnico:** Legal debe ratificar la fuerza probatoria, el texto exacto, la retención y la suficiencia del mecanismo antes de que se pueda tratar como definitivo — coincide con `OQ-SOL-009` de este documento (`EXCLUIDO_R1`, sección 28) y con `OQ-RES-104` del BDD (`RESUELTO parcial` — valor probatorio práctico ya demostrado en un caso real, pero sin fuerza legal formal).
- El Tech Lead no puede cerrar este gate por su cuenta, según indica el propio SAD.

---

## 26. Riesgos y deuda (transversales)

| ID | Riesgo | Prob. | Impacto | Mitigación | Propietario |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Reglas de negocio siguen cambiando | Alta | Alta | Políticas versionadas y revalidación | Producto |
| RSK-002 | Videos elevan costos de almacenamiento | Alta | Media | Compresión, retención y lifecycle | Cloud/Legal |
| RSK-003 | Integraciones (RENIEC/MTC/Banca/Motrix) no disponibles | Alta | Alta | Adaptadores y fallback manual | Integraciones |
| RSK-004 | Usuarios continúan en Excel/WhatsApp en paralelo | Alta | Alta | Rollout progresivo, UX guiada, corte de convivencia | Operaciones |
| RSK-005 | Datos históricos deficientes (código de vehículo inconsistente) | Alta | Media | Perfilado y migración por etapas | Datos |
| RSK-006 | Riesgo legal (aceptación remota, retención de evidencia, firma) | Media | Alta | Gate Legal antes de release | Legal |
| RSK-007 | Offline genera conflictos de sincronización | Media | Alta | Alcance limitado e idempotencia | Tech Lead |
| RSK-008 | Roles no formalizados (matriz RACI/RBAC pendiente de validación de Seguridad) | Alta | Alta | Matriz de autorización ya construida, pendiente de aprobación | Seguridad |
| RSK-009 | Doble reserva o doble alquiler del mismo vehículo | Media | Crítico | Invariante de disponibilidad (DR-KAI-001) | Tech Lead |
| RSK-010 | Personal marca checklist sin revisar realmente (3 casos reales, P-27) | Alta (ya ocurre hoy) | Media | Evidencia obligatoria verificable, no solo un check | Producto/QA |
| RSK-011 | Sin personal mecánico propio, calidad de inspección depende de tercero | Media | Media | Fuera de alcance del sistema — riesgo operativo de VeloxRent, no de la solución | Operaciones |
| RSK-012 | Confusión entre AS-IS real y Plan de Talento Humano formal al construir las pantallas | Media | Alta | Mantener ambas capas separadas y explícitas | Producto |

---

## 27. Trazabilidad BDD → SDD → TDD

> 📌 La matriz completa, por proceso, vive en `SDD-KAIROS-TRACEABILITY.md`.

---

## 28. Decisiones abiertas de arquitectura (OQ-SOL-\*)

> 📌 Por decisión explícita del usuario, esta lista se mantiene **separada** de las preguntas de negocio (`OQ-*` del BDD) — son decisiones de arquitectura pura, no de negocio.

| ID | Decisión | Opciones | Responsable | Impacto | Estado |
| --- | --- | --- | --- | --- | --- |
| OQ-SOL-001 | Proveedor cloud | AWS u otro | Sponsor/Cloud Architect | Despliegue completo | ✅ `RESUELTO` (30 ago 2026, vía SAD-KAIROS-MVP-001) — **Google Cloud** (Cloud Run + Cloud Storage, región `southamerica-east1`) con **Supabase PostgreSQL** (`sa-east-1`) como base transaccional y **Firebase** (Hosting + Authentication) para frontend e identidad. Ver sección 22.1. Pendiente: planes productivos con HA/PITR contratados — los planes gratuitos actuales no cumplen los NFR de disponibilidad/RPO/RTO (bloqueante de release según el propio SAD) |
| OQ-SOL-002 | Backend: NestJS o Fastify estructurado | — | Tech Lead | Estructura del código | ✅ `RESUELTO` (02 sep 2026, confirmado por Eder Ramos) — **Node.js 22 LTS + TypeScript 5.9.x + NestJS**, contenerizado en Cloud Run. La estructura interna sigue exigiendo Clean Architecture dentro de los módulos de NestJS (Domain/Application/Adapters/Infrastructure, ver ADR-KAI-010) |
| OQ-SOL-003 | ORM: Prisma o Drizzle | — | Data/Tech Lead | Acceso a datos | ✅ `RESUELTO` (30 ago, vía SAD) — **Prisma ORM 7.10.0** (`prisma`, `@prisma/client`, `@prisma/adapter-pg` en versiones idénticas) |
| OQ-SOL-004 | IdP: Cognito o corporativo | — | Seguridad | Autenticación | ✅ `RESUELTO` (30 ago, vía SAD) — **Firebase Authentication con Identity Platform**, MFA (TOTP) obligatorio para todos los usuarios. Ver sección 15.5 |
| OQ-SOL-005 | Nivel real de offline más allá de lo ya definido (sección 17) | — | UX/Producto/Arquitectura | Alcance de campo | ✅ `RESUELTO` (30 ago, vía SAD) — acotado a exactamente 2 formularios (checklist de entrega de Alquiler, checklist de recepción de Devolución), con parámetros técnicos exactos (TTL, límites, matriz de conflicto). Ver sección 17, corregida el 01 sep |
| OQ-SOL-006 | Compresión y retención exacta de multimedia | Por tipo/finalidad | Cloud/Legal | Storage y costo | `EXCLUIDO_R1` — decisión del usuario, 28 ago |
| OQ-SOL-007 | Ventana operativa exacta para SLO | 07-18 / 08-17 / 24x7 técnico | Producto | Disponibilidad objetivo | ✅ `RESUELTO` (31 ago 2026, sincronizado 02 sep) — **8:00 a.m. a 5:00 p.m., los 7 días, para las 4 empresas**, confirmado por Fiorella. Reemplaza el valor obsoleto de 7am-6pm que generaba la inconsistencia. **El valor ya está reflejado en **`NFR-AVL-001`** (sección 19) — no queda ningún pendiente de sincronización en esta pregunta.** |
| OQ-SOL-008 | Tratamiento del riesgo compartido entre las 4 empresas de KAIROS | Grupo/empresa | Legal/Negocio | Diseño multiempresa (sección 14) | ✅ `RESUELTO`\*\* (03 sep 2026):\*\* uso estrictamente interno entre las 4 empresas del grupo, nunca se exporta a terceros — decisión del usuario, coincide con la opinión previa de José |
| OQ-SOL-009 | Firma electrónica/digital | — | Legal/Seguridad | Contrato y evidencia legal | ✅ `RESUELTO`\*\* (no bloqueante, 03 sep 2026):\*\* el usuario confirmó que la reserva remota nunca es el respaldo legal final — el contrato de Alquiler siempre se firma presencialmente (con o sin notaría, según el modelo de vehículo), con video como evidencia adicional en ambos casos. Legal debe ratificarlo formalmente antes de producción, pero ya no bloquea el diseño ni la documentación |
| OQ-SOL-010 | Integración WhatsApp bidireccional | — | Producto/Integración | Alcance de mensajería | ✅ `RESUELTO` (02 sep 2026, confirmado por Eder Ramos) — **no se va a integrar.** No es una decisión de "todavía no", es definitiva: WhatsApp sigue siendo manual/asistido (formatos generados por el sistema, envío humano), como ya describía la sección 16.3, y **no entra en el Release 1 ni en el MVP** |
| OQ-SOL-011 | Datos históricos exactos a migrar | — | Producto/Datos | Alcance de migración | ⚠️ **Separado en 2 partes (02 sep 2026):** el **alcance general** ya está `RESUELTO` — Fiorella confirmó que la migración detallada (columnas, transformaciones, fuentes con fecha confiable, tratamiento de registros sin identificador fuerte) se define recién al momento de ejecutar la migración, y que ninguno de esos puntos es bloqueante para el MVP (ver sección 23.7). El **detalle exacto de fuentes, columnas y reglas de transformación** sigue genuinamente `PENDIENTE` — no por falta de decisión, sino porque su resolución está programada para la etapa de migración, no para ahora |
| OQ-SOL-012 | Talento Humano avanzado (Evaluación de Desempeño, Capacitación formal) en qué release | — | Sponsor/Producto | Roadmap | `CONFIRMADA_NEGOCIO` parcial — Evaluación de Desempeño ya tiene fecha objetivo (Q1 2027); Capacitación formal sigue `PENDIENTE` |
| OQ-SOL-013 | **Política para "pago recibido sin disponibilidad posterior"** | — | Producto/Finanzas | `ConfirmReservationHandler` en `TDD-RES-001` | ✅ `RESUELTO` (02 sep 2026) — **Eder Ramos (Tech Lead) confirmó que este escenario no ocurre bajo el diseño vigente**: la reserva/alquiler solo se confirma (y bloquea el vehículo) cuando pago y documentos están completos a la vez, en una sola transacción atómica — no existe un momento intermedio donde el pago ya esté validado pero la disponibilidad todavía no. No se necesita política de reembolso para este caso porque el caso no se produce |
| OQ-SOL-014 (nueva, 02 sep) | Servicio exacto de cola dentro de Google Cloud | Cloud Tasks / Pub-Sub | Tech Lead | Implementación del outbox publisher | ✅ `RESUELTO` (02 sep 2026) — **Cloud Tasks**, confirmado por Eder Ramos |
| OQ-SOL-015 (nueva, 03 sep) | ¿Se sirven fotos/videos mediante CDN global o directo desde la región? | CDN global / sin CDN, directo desde la región | Producto (decisión de negocio) | Evita o no la pregunta legal de transferencia internacional de datos personales (Ley N° 29733) | ✅ `RESUELTO` (03 sep 2026) — **sin CDN global**, uso estrictamente interno/regional, decisión del usuario para evitar el tránsito internacional de datos personales (fotos de DNI, videos de inspección). ⚠️ **Implicancia técnica pendiente de confirmar con Eder Ramos:** sin CDN, la carga de fotos/video será más lenta para clientes fuera de la región Perú/Brasil — probablemente aceptable dado que la base de clientes es mayormente de Ayacucho/Perú, pero debe quedar como decisión técnica explícita, no asumida |

> 📌 **Actualizado 02 sep 2026:** de las decisiones que seguían `PENDIENTE`, 4 se resolvieron el 30 de agosto vía el SAD (OQ-SOL-001 a 005) y 2 más se resolvieron el 02 de septiembre directamente con el Tech Lead (`OQ-SOL-013` pago sin disponibilidad — el escenario no se produce bajo el diseño confirmado; `OQ-SOL-014` Cloud Tasks). **No queda ninguna decisión **`BLOQUEANTE`** en esta lista.** Las demás decisiones restantes (OQ-SOL-010/011) siguen `PENDIENTE` sin ser bloqueantes.

---

## 29. Plan de realización

| Slice | Capacidad demostrable | Dependencias | Gate |
| --- | --- | --- | --- |
| 1 | Organización, autenticación y roles | IAM | Seguridad |
| 2 | Flota, tarifario y disponibilidad | Fleet | Datos |
| 3 | Cliente, Consulta y cotización | Customers/Inquiries | — |
| 4 | Conversión a Reserva y bloqueo concurrente | Reservations | Concurrencia |
| 5 | Conversión a Alquiler y validaciones | Rentals | — |
| 6 | Contrato, pago y notaría | Payments | Finanzas |
| 7 | Inspección de salida, evidencia y offline | Evidence | — |
| 8 | Entrega, alquiler activo y ampliación | Rentals | — |
| 9 | Devolución e inspección de retorno | Returns | — |
| 10 | Daños, garantía y cierre financiero | Incidents/Payments | — |
| 11 | Reclutamiento y Selección básico | Recruitment | — |
| 12 | Administración de Personal básico (asistencia, permisos, salidas a campo) | HR-Administration | — |
| 13 | Reportes, alertas y auditoría operativa transversal | Reporting/Audit | UAT |

Cada slice comprende experiencia, operación lógica, datos, autorización, auditoría, observabilidad y pruebas.

### 29.1 Orden de rollout y fecha objetivo — `APROBADA_ARQUITECTURA` según SAD-KAIROS-MVP-001 §2-3 (incorporado 01 sep 2026)

El SAD formaliza el orden de liberación de los 6 procesos y una fecha objetivo concreta, que este documento no tenía antes:

**Orden aprobado:** Consulta → Reserva → Alquiler → Devolución → Reclutamiento y Selección → Administración de Personal (coincide con el orden ya usado en los slices de arriba).

**Fecha objetivo para completar los 6 módulos: 13 de noviembre de 2026.**

Cada módulo debe completar sus features y criterios de aceptación, superar las pruebas aplicables, ser validado por usuarios representantes, y conservar aprobación registrada antes de liberarse — no es solo una fecha de calendario, es una condición de calidad por módulo.

---

## 30. Criterios de aprobación

> 📌 **Actualizado 03 sep 2026 (respuesta directa de Fiorella):** una vez resueltas las últimas dudas de negocio del BDD y actualizado este SDD con las respuestas ya recibidas, **el equipo del proyecto (Fiorella + Eder Ramos + Russbel) puede aprobar el SDD internamente** — no es condición esperar a que se asignen los roles todavía vacantes (Datos, Seguridad, QA, UX, DevOps) para dar por aprobado el paquete a nivel interno del proyecto. Esto no elimina los criterios 4, 5, 9 y 6 de la lista de abajo como buenas prácticas a completar antes de ir a producción, pero sí destraba la aprobación funcional del documento sin esperarlos indefinidamente. Fecha límite fijada por Fiorella para cerrar las preguntas de negocio/Legal que siguen abiertas: **viernes 04 de septiembre de 2026.**

> ⚠️ **Actualizado 01 sep 2026:** la llegada de `SAD-KAIROS-MVP-001` (fechado 30 ago 2026) cambia un hecho importante — **ya existe un Tech Lead actuando como propietario del SAD**, que ratificó 9 de 11 ADR de forma formal. Esto mueve el criterio 3 de "sin nadie asignado" a "asignado y con decisiones tomadas, pendiente solo de la firma final". Los demás roles (Datos, Seguridad, QA, Legal, DevOps, Sponsor/Producto) siguen sin nombres asignados — el propio SAD lo reconoce en su sección 1.6 ("permanecen pendientes los nombres y suplentes").

El SDD (transversal + los 6 de proceso) puede pasar a `APPROVED` cuando:

1. El BDD de los 6 procesos esté aprobado, o las excepciones estén aceptadas — **actualizado 02 sep 2026:** de 18 preguntas de negocio, **las 18 están **`RESUELTO`**/**`RESUELTO parcial` — Fiorella cerró las 2 últimas (`OQ-DEV-101`, `OQ-CLI-101`) y confirmó formalmente `OQ-CON-101` el 02 de septiembre. No queda ninguna pregunta funcional de negocio abierta en el BDD (ver `BDD-KAIROS-TRANSVERSAL.md`, sección 19.0).
2. Producto confirme alcance y releases (secciones 3, 29) — **Sponsor asignado 02 sep 2026: Fiorella.** **Actualizado 03 sep:** Fiorella confirma además que **ella misma da la aprobación final de UAT de cada módulo** — no hay un segundo aprobador de negocio. Falta únicamente la confirmación formal de alcance/releases de su parte, pero el rol y el mecanismo de aprobación ya no están en duda.
3. Arquitectura acepte los ADR y límites de módulos (sección 25) — **Tech Lead asignado 02 sep 2026: Eder Ramos.** 10 de 11 ADR ya `APROBADA_ARQUITECTURA` (los 9 originales + `ADR-008` cerrado el 02 sep). Solo queda `ADR-009` (gate Legal de la aceptación remota) sin cerrar — depende de Legal, no de Arquitectura. Falta la firma final formal de Eder Ramos (sección 30.1).
4. Datos valide el modelo lógico, propiedad y migración (secciones 14.4, 23) — el modelo ya está definido con detalle por el SAD (maestros globales, RLS, reglas de coincidencia). **Actualizado 03 sep 2026 (4ª ronda): rol de Data Steward asignado — Eder Ramos**, quien acumula Datos junto con Tech Lead/Arquitectura. Falta la validación formal, ya no la asignación.
5. Seguridad valide autorización, amenazas y datos sensibles (secciones 15, 15.5, 15.6) — el diseño ya está mucho más desarrollado (roles, MFA, toolchain OWASP). **Actualizado 03 sep 2026: rol de Seguridad asignado — Eder Ramos**, quien acumula Seguridad junto con Tech Lead/Arquitectura/Datos. Falta la validación formal, ya no la asignación.
6. Legal apruebe aceptación remota, retención y acceso a evidencias — **Actualizado 03 sep 2026 (2ª ronda):** de las 4 decisiones bloqueantes originales de este documento, ya no queda ninguna genuinamente bloqueante para el diseño — `OQ-SOL-008` (riesgo compartido) y `OQ-SOL-009` (firma electrónica) se resolvieron con decisiones directas del usuario; el SAD agrega su propio catálogo extenso de gates legales (`LGL-*`) que sigue pendiente de ratificación formal por Legal antes de producción, no antes de aprobar este documento. **Actualizado 03 sep (5ª ronda):** el usuario decidió **no asignar un responsable Legal por el momento** — considera que la validación formal ya dada por el negocio (Fiorella y José como Gerencia) es suficiente para seguir. La cláusula de privacidad de datos se propondrá directamente a Fiorella antes de documentarse aquí — no se agrega su texto todavía. José y Fiorella confirmaron que **el riesgo de decisiones sin revisión legal externa lo asumen ellos como Gerencia**.
7. Finanzas apruebe pago, correcciones, cancelaciones y reembolsos — Fiorella cubre este rol; **actualizado 04 sep 2026: ya no requiere formalización adicional**, el usuario confirmó que la documentación no necesita firma formal.
8. UX valide flujo, estados, dispositivos y accesibilidad (sección 18) — prácticamente cubierto por el AS-IS ya levantado; el SAD agrega objetivos concretos de accesibilidad (WCAG 2.2 AA, dispositivos táctiles, compatibilidad de navegadores). **Actualizado 03 sep 2026 (6ª ronda): rol de UX asignado — Eder Ramos**, quien acumula UX junto con los otros 5 roles técnicos. Falta el sign-off formal, ya no la asignación.
9. QA confirme que todos los escenarios BDD tienen realización verificable — **Actualizado 03 sep 2026: rol de QA Lead asignado — Eder Ramos**, quien acumula QA junto con Tech Lead/Arquitectura/Datos/Seguridad. El SAD ya define cobertura objetivo (100% de escenarios críticos, ≥80% líneas/ramas de código nuevo, ≥90% del dominio crítico) que este documento hereda como referencia; falta la validación formal, ya no la asignación.
10. Integraciones tengan factibilidad, fallback y propietario (sección 16) — el SAD confirma que **Release 1 no incluye ninguna integración técnica externa** — todas (RENIEC, MTC, Banca, WhatsApp, Motrix) son manuales por decisión explícita, no por vacío de información. Esto simplifica este criterio: no hay nada que "resolver" técnicamente, solo formalizar el proceso manual.
11. NFR estén cuantificados, sean verificables y tengan táctica (sección 19) — ✅ **avanzó sustancialmente el 30 ago**: 8 de 11 NFR ya `APROBADA_ARQUITECTURA` por el Tech Lead, con valores concretos. **Resuelto 03 sep 2026:** Fiorella confirma que el presupuesto para pasar de los planes gratuitos de Google Cloud/Supabase/Firebase a planes productivos **ya está aprobado** — cierra el bloqueante de release que el propio SAD reconocía sobre la factibilidad real de 99.9% 24×7 / RPO 15 min / RTO 2h. Solo queda la ejecución técnica de la contratación, no la aprobación del gasto.
12. Toda decisión bloqueante esté resuelta o excluida formalmente (sección 28) — ✅ **Cumplido desde el 02 sep 2026.** De las decisiones `BLOQUEANTE` de este documento, 3 quedaron `EXCLUIDO_R1`, y el resto (`OQ-SOL-001` a `005`, `007`, `013`, `014`) están `RESUELTO`. No queda ninguna decisión bloqueante activa.
13. Exista trazabilidad completa hacia el TDD — trazabilidad BDD→SDD completa; SDD→TDD parcial (ver `SDD-KAIROS-TRACEABILITY.md`). El SAD exige además una matriz BDD→ADR→SDD/TDD (su sección 25) — parcialmente cubierta por las tablas de esta serie, sin consolidar todavía en un solo repositorio.
14. El plan de migración y rollback sea aceptado (sección 23) — el SAD ya lo detalla con umbrales de aceptación concretos (sección 23.2); falta la aprobación formal de Sponsor y Tech Lead.

> 📌 **Resumen actualizado 04 sep (8ª ronda):** con Eder Ramos (Tech Lead) y Fiorella (Sponsor) ya asignados, los criterios 2 y 3 avanzaron de "sin nadie asignado" a "asignado, con decisiones tomadas". El criterio 12 (decisiones bloqueantes) queda completamente cumplido. El criterio 11 (NFR/planes productivos) queda cumplido — presupuesto aprobado por Fiorella el 03 sep. **Los criterios 4, 5, 8, 9 (Datos, Seguridad, UX, QA) ya tienen responsable asignado — Eder Ramos acumula los 5 roles técnicos.** **El criterio 6 (Legal) ya no tiene ninguna decisión genuinamente bloqueante para el diseño** — el riesgo compartido (OQ-SOL-008), la firma electrónica (OQ-SOL-009) y los logs técnicos (90 días) se resolvieron; **el usuario decidió no asignar un responsable Legal por el momento**; la cláusula de privacidad de datos se propondrá directamente a Fiorella, todavía sin texto documentado. `NFR-REL-001`, `NFR-AUD-001` y `NFR-SEC-001` quedan `APROBADA_ARQUITECTURA`, ratificados por Eder Ramos. **Actualizado 04 sep: el usuario confirmó que no es necesaria la firma formal de ningún rol** — los 9 roles de la tabla 30.1 quedan aprobados sin firma pendiente (Legal sigue como decisión de no asignar, no como vacío).

### 30.1 Firmas

> ✅ **Actualizado 04 sep 2026:** el usuario confirmó que **no es necesaria la firma formal** — la documentación se considera aprobada con las decisiones y asignaciones de rol ya registradas. Los 9 roles de esta tabla quedan `Aprobado sin firma formal`, excepto Legal (no asignado por decisión, ver fila correspondiente).

| Rol | Nombre | Decisión | Fecha | Observación |
| --- | --- | --- | --- | --- |
| Producto | **Fiorella (Sponsor)** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 02 sep 2026 (rol); 03 sep 2026 (mecanismo de aprobación) | Rol asignado. Fiorella confirma que ella misma da la aprobación final de UAT por módulo — falta solo la confirmación formal de alcance/releases, no el mecanismo |
| Arquitectura / Tech Lead | **Eder Ramos** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 02 sep 2026 (confirmado directamente) | 10 de 11 ADR aprobados (`ADR-008` cerrado 02 sep); solo `ADR-009` sin cerrar, depende de Legal |
| Datos | **Eder Ramos** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 03 sep 2026 | Acumula el rol de Data Steward junto con Tech Lead — falta la validación formal del modelo lógico, no la asignación |
| Seguridad | **Eder Ramos** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 03 sep 2026 | Acumula el rol de Seguridad junto con Tech Lead — falta la validación formal de autorización/amenazas, no la asignación |
| Legal | **No se asignará por el momento** | `CONFIRMADO_NEGOCIO` (decisión, no vacío) | 03 sep 2026 | El usuario decidió no asignar un responsable Legal por ahora — considera que lo ya validado formalmente por el negocio (Fiorella/José como Gerencia) es suficiente. Sigue como el único gate sin ratificación de un abogado externo, pero ya no es un rol "pendiente de asignar" |
| Finanzas | Fiorella | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 04 sep 2026 | Fiorella cubre el rol; ya no requiere formalización adicional |
| UX | **Eder Ramos** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 03 sep 2026 | Acumula el rol de UX junto con Tech Lead/Datos/Seguridad/QA/DevOps |
| QA | **Eder Ramos** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 03 sep 2026 | Acumula el rol de QA Lead junto con Tech Lead — falta la validación formal de cobertura de escenarios, no la asignación |
| DevOps | **Eder Ramos** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 03 sep 2026 | Acumula el rol de DevOps junto con Tech Lead — falta la validación formal, no la asignación |

---

## 31. Checklist de calidad 9–10

| Dimensión | Evidencia | Estado |
| --- | --- | --- |
| Vinculación con BDD | Sección 1.3, referencias `BR-*`/`NFR-KAI-*` en todo el documento | Cumple |
| Drivers y alternativas | Secciones 4–5 | Cumple |
| Contexto/contenedores | Secciones 6–7 | Cumple |
| Componentes y propiedad | Sección 8 | Cumple |
| Eventos | Sección 13 | Cumple |
| Multiempresa | Sección 14 | Cumple |
| Seguridad/threat model | Sección 15 | Cumple |
| Integraciones | Sección 16 | Cumple |
| Offline | Sección 17 | Cumple |
| UX Architecture (principios) | Sección 18 | Cumple |
| NFR y tácticas | Sección 19 | Cumple |
| Observabilidad/continuidad | Secciones 20–21 | Cumple |
| Despliegue/ambientes | Sección 22 | Cumple |
| Migración/convivencia | Sección 23 | Cumple |
| Pruebas transversales | Sección 24 | Cumple |
| ADR | Sección 25 — 5 ADR transversales (el 6to vive en Reclutamiento/ADP) | Cumple |
| Riesgos y decisiones | Secciones 26, 28 | Cumple — sin bloqueantes genuinas pendientes desde el 31 ago |
| Plan y aprobación | Secciones 29–30 | Cumple en estructura; firmas pendientes de las personas asignadas |
| Casos de uso, secuencias, modelo lógico, operaciones, trazabilidad por proceso | Viven en cada `SDD-XXX-001` y en `SDD-KAIROS-TRACEABILITY.md` | Ver documentos correspondientes |

**Evaluación:** este documento transversal alcanza el nivel de detalle 9-10 esperado para su alcance. Queda **DRAFT COMPLETE, no aprobado** — la brecha real no es de contenido sino de roles técnicos sin asignar (Arquitectura, Datos, Seguridad, QA) y de firmas formales (sección 30.1).

---

## Anexo A — Frontera entre SDD y TDD

| SDD define | TDD refina |
| --- | --- |
| Módulos y responsabilidades | Paquetes, clases y dependencias exactas |
| Entidades lógicas | Tablas, columnas, tipos, índices y constraints |
| Operaciones conceptuales | Endpoints, schemas y códigos HTTP |
| Eventos conceptuales | Payload, versión, topic/queue y retry exactos |
| Tácticas de calidad | Configuración, librerías y parámetros |
| Autorización lógica | Policies, claims y enforcement técnico |
| Secuencias de solución | Transacciones, queries y manejo de excepciones |

## Anexo B — Cómo se dividió este SDD

Siguiendo el criterio del ejemplo de referencia (`Ejemplo-SDD-Reserva-Vehiculo-KAIROS.md`, Anexo B), el documento único `SDD-KAIROS-Consolidado-Detallado.md` (v1.2, \~1985 líneas) se dividió el 31 de agosto de 2026 en:

- **Este documento transversal** — plataforma, IAM, multiempresa, seguridad, cloud, integraciones, offline, observabilidad, despliegue, migración, ADR transversales, riesgos generales, decisiones abiertas de arquitectura (`OQ-SOL-*`) y criterios de aprobación.
- **6 documentos por proceso** — `SDD-CON-001` (Consulta), `SDD-RES-001` (Reserva), `SDD-ALQ-001` (Alquiler), `SDD-DEV-001` (Devolución), `SDD-REC-001` (Reclutamiento y Selección), `SDD-ADP-001` (Administración de Personal) — cada uno con sus casos de uso, secuencias críticas, modelo lógico de datos, operaciones, catálogo de errores, ADR específicos (si existen) y criterios de prueba propios.
- **Una matriz de trazabilidad central** — `SDD-KAIROS-TRACEABILITY.md`, que consolida la trazabilidad BDD → SDD → TDD de los 6 procesos, antes repartida como sección 27.1-27.9 dentro del documento único.

Verificación de integridad al dividir: ninguna decisión arquitectónica, driver, ADR, riesgo o criterio de aprobación del documento consolidado se pierde ni se duplica — cada uno vive en exactamente un documento de esta serie, con referencias cruzadas donde corresponde. El archivo único `SDD-KAIROS-Consolidado-Detallado.md` queda archivado como referencia histórica, igual que se hizo con el BDD el 27 de agosto de 2026.
