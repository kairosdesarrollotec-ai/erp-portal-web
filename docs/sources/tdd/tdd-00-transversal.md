# TDD — 00 Transversal

# Technical Design Document — Fundación Transversal KAIROS

**Código:** TDD-KAIROS-MVP-002 / TRANSVERSAL **Versión:** 3.4 — 10 sep 2026: stack frontend React formalizado **Estado:** Completo en contenido, pendiente de revisión formal **Entradas:** `BDD-KAIROS-TRANSVERSAL.md`, `SDD-KAIROS-TRANSVERSAL.md`, `SAD-KAIROS-MVP-001.md`, `UX-UI-KAIROS-v3.1` **Dominio:** Plataforma, IAM, convenciones de dominio compartidas, seguridad técnica, infraestructura, CI/CD, runbooks — base común para los 6 procesos **Propietario técnico:** **Eder Ramos (Tech Lead)** **Revisores:** Arquitectura, Backend, Frontend, Datos, Seguridad, QA, DevOps **Fecha:** 10 de septiembre de 2026

> Este documento sigue la plantilla de referencia entregada por el usuario (`Ejemplo-TDD-Reserva-Vehiculo-KAIROS.md`), adaptada con el mismo criterio de su propio Anexo B: un TDD transversal + un TDD por dominio + una matriz central. Los 6 documentos de proceso (`TDD-CON-001`, `TDD-RES-001`, `TDD-ALQ-001`, `TDD-DEV-001`, `TDD-REC-001`, `TDD-ADP-001`) dependen de este documento para todo lo que no varía por proceso: stack técnico, estructura de repositorio, convenciones de dominio (value objects, tablas transversales de idempotencia/auditoría/outbox/compromisos de vehículo), seguridad técnica, infraestructura, estrategia de pruebas transversal, CI/CD, runbooks, DoD y criterios de aprobación.

---

## 1. Control y autoridad

### 1.1 Historial

| Versión | Cambio | Autor | Estado |
| --- | --- | --- | --- |
| 0.1–1.0 | Ver historial completo en `TDD-KAIROS-Consolidado-Detallado.md` (archivado como referencia histórica) — construcción de las secciones transversales y las 6 secciones físicas por proceso | Russbel (BA) con apoyo de Claude | Archivado |
| 2.0 | División del documento consolidado en 1 TDD transversal + 6 TDD por proceso + 1 matriz de trazabilidad central, siguiendo el Anexo B del ejemplo de referencia — mismo criterio ya aplicado al BDD (27 ago) y al SDD (31 ago). Corrige las referencias obsoletas a "bloqueo provisional (RES-P06.1)" en Reserva — retirado por Fiorella el 27 ago, reafirmado el 31 ago (OQ-RES-105) — y aplica las decisiones de la reunión del 31 ago a Devolución (BR-DEV-006/011) y Administración de Personal (BR-ADP-004, sin 4to nivel) | Russbel (BA), a pedido del usuario | Candidato |
| **2.1** | **Incorpora la base arquitectónica del **`SAD-KAIROS-MVP-001`** v0.5** (Tech Lead ya asignado, decisiones formales del 30 ago 2026): stack tecnológico corregido de AWS a **Google Cloud** (Cloud Run, Cloud Storage, Secret Manager) + **Supabase** (PostgreSQL) + **Firebase** (Hosting, Authentication) — corrige TD-002/003/004/005/007/008/009/010 de la versión 2.0, que asumían un stack AWS incorrecto. Se actualizan las secciones 1.4, 3, 8, 9 y 14 | Russbel (BA), a partir de `SAD-KAIROS-MVP-001.md` subido por el usuario | Candidato |
| **2.2** | **Decisiones directas de Eder Ramos (Tech Lead), 02 sep 2026.** (1) `ADR-008` cerrado: no hay ni habrá `VehicleHold` — `OQ-TDD-007` resuelto; (2) `OQ-TDD-006` resuelto: Cloud Tasks como servicio de cola; (3) `OQ-TDD-008` resuelto: el escenario "pago sin disponibilidad" no ocurre bajo el diseño confirmado; (4) TD-003 corregido: **Next.js sí se usa** (el SAD lo había quitado, se prioriza la instrucción directa del Tech Lead); (5) evidencia actualizada a 35 fotos + 3 videos de \~7-8 min cada uno | Russbel (BA), a partir de las respuestas directas del Tech Lead | Candidato |
| 2.3–2.4 | ⚠️ **Registro retroactivo (corregido 03 sep 2026):** el encabezado del documento subió a 2.3 y luego a 2.4 sin dejar sus propias filas en esta tabla — gap detectado al auditar este documento el 03 sep. Por el texto que quedó en el encabezado de la v2.4, el cambio fue: corrección del conteo de preguntas abiertas del criterio 1 de la sección 15 (queda en 0 pendientes, ya no cita `OQ-DEV-101` como abierta). No se reconstruye más detalle del que ya deja el propio encabezado, para no inventar contenido no verificado | Russbel (BA), hallazgo propio al auditar el historial | Candidato |
| **2.5** | **Respuestas directas de Fiorella, 03 sep 2026, sobre gobernanza de aprobación.** (1) Fiorella confirma que **ella misma da la aprobación final de UAT de cada módulo**; (2) **presupuesto para pasar de los planes gratuitos de Google Cloud/Supabase/Firebase a planes productivos ya aprobado** — cierra el bloqueante que señalaba el criterio 7 de la sección 15 sobre factibilidad real de los NFR; (3) Fiorella fija el **04 de septiembre de 2026 (viernes)** como fecha límite para cerrar las preguntas de negocio y Legal pendientes; (4) una vez cerradas esas dudas y actualizado el SDD, **el equipo del proyecto puede aprobar el paquete internamente**, sin esperar la asignación previa de Datos/Seguridad/QA/DevOps; (5) se corrige además la fila "Tech Lead" de la tabla de firmas (sección 15.1), que seguía sin nombre pese a que el resto del documento ya identifica a Eder Ramos desde el 02 sep — inconsistencia interna detectada al auditar | Russbel (BA), a partir de las respuestas directas de Fiorella | Candidato |
| **2.6** | **Segunda ronda del 03 sep 2026 — reuniones con José (08:56) y Fiorella (12:17), transcripciones recibidas.** `OQ-TDD-004` (gate Legal de la firma remota) se consultó directamente con ambos y **sigue sin resolverse** — ninguno tiene certeza de su fuerza legal; se documenta que Fiorella y José asumen el riesgo mientras tanto, por instrucción directa del usuario. No hay cambios de arquitectura o stack en esta ronda — las respuestas de hoy fueron de negocio (Reserva) y gobernanza Legal, ya reflejadas en `BDD-RES-001`, `SDD-RES-001`, `TDD-RES-001` y `SDD-KAIROS-TRANSVERSAL.md` | Russbel (BA), a partir de las transcripciones de las 2 reuniones del 03 sep | Candidato |
| **2.7** | **Tercera ronda del 03 sep 2026 — decisiones directas del usuario.** `OQ-TDD-004` **resuelto y ya no bloqueante**: la reserva remota nunca es el respaldo legal final, el contrato de Alquiler siempre se firma presencialmente con video como evidencia adicional (coincide con `OQ-SOL-009` del SDD, también resuelto). Nueva decisión de infraestructura (sección 9.1): **sin CDN global** para servir fotos/video — decisión de negocio para evitar la pregunta legal de transferencia internacional de datos (`OQ-SOL-015` del SDD); queda pendiente que Eder Ramos confirme explícitamente la implicancia técnica (carga más lenta fuera de la región) | Russbel (BA), a partir de decisiones directas del usuario | Candidato |
| **2.8** | **Cuarta ronda del 03 sep 2026.** **Eder Ramos asignado como responsable de Datos, Seguridad, QA y DevOps**, además de Tech Lead/Arquitectura — cierra la asignación (no la validación formal) de los criterios 3, 4 y 5 de la sección 15, y de las filas correspondientes de la tabla de firmas (15.1). Sin cambios de contenido técnico en esta ronda | Russbel (BA), a partir de decisiones directas del usuario | Candidato |
| **2.9** | **Quinta ronda del 03 sep 2026.** El usuario decide **no asignar un responsable Legal por el momento**, considerando suficiente la validación formal ya dada por el negocio (Fiorella y José como Gerencia) — se refleja en la nota de la sección 15. Sin cambios técnicos en esta ronda | Russbel (BA), a partir de instrucción directa del usuario | Candidato |
| **3.0** | **04 sep 2026.** El usuario corrige un error propio: la instrucción del 02 de septiembre que decía que el Tech Lead confirmó el uso de Next.js **fue equivocada** — el frontend **no usará Next.js**, queda como React simple (SPA/PWA), consistente con la versión original del SAD. Se corrigen `TD-003` (sección 3) y el diagrama de arquitectura de ejecución (sección 5). **No cambia nada del backend**: `TD-002` (NestJS) sigue confirmado sin cambios — es una capa distinta y no se vio afectada por la confusión | Russbel (BA), a partir de instrucción directa del usuario | Candidato |
| **3.1** | **04 sep 2026 (2ª ronda).** El usuario confirma que **no es necesaria la firma formal** de ningún rol — los roles ya asignados en la tabla de firmas (15.1) quedan `Aprobado sin firma formal`. Backend y Frontend siguen sin persona asignada, sin cambios en esta ronda | Russbel (BA), a partir de instrucción directa del usuario | Candidato |
| **3.2** | **04 sep 2026 (3ª ronda).** **Backend asignado a Eder Ramos, Frontend asignado a Russbel** — se asume Backend para el Tech Lead por ser su rol técnico natural; pendiente de confirmar si es al revés. Con esto, los 9 roles de la tabla de firmas (15.1) quedan todos con persona asignada | Russbel (BA), a partir de instrucción directa del usuario | Candidato |
| **3.3** | **04 sep 2026 (4ª ronda).** Corrección: **Backend y Frontend quedan asignados exclusivamente a Eder Ramos** — el usuario aclaró que Russbel no ocupa ninguno de los dos roles. Eder Ramos acumula 8 roles técnicos en total (Tech Lead/Arquitectura, Datos, Seguridad, UX, QA, DevOps, Backend, Frontend) | Russbel (BA), a partir de instrucción directa del usuario | Candidato |
| **3.4** | **10 sep 2026.** Stack frontend formalizado por el Tech Lead: Vite, React Router, TanStack Query, Zustand limitado, React Hook Form + Zod, cliente OpenAPI generado, `vite-plugin-pwa`/Workbox, Dexie/IndexedDB acotado a ALQ-09/DEV-04, Radix UI Primitives, CSS Modules/Custom Properties, Lucide React, date-fns, TanStack Table, Vitest/Testing Library/MSW/Playwright/axe y Sentry. Se prohíbe Next.js y cualquier sustitución sin ADR. | Eder Ramos (Tech Lead) | Aprobado sin firma formal |

### 1.2 Jerarquía documental

1. **BDD**: significado y comportamiento de negocio.
2. **SDD**: solución lógica, componentes y tácticas.
3. **TDD** (esta serie): implementación física y contratos exactos.
4. OpenAPI/JSON Schema/DDL: especificaciones ejecutables (viven fuera de este Markdown — ver Anexo A).
5. Código y pruebas: realización verificable.

Cuando exista contradicción, se detiene la implementación afectada y se registra una decisión en el Decision Log; el TDD no redefine silenciosamente el negocio ni la arquitectura.

### 1.3 Convenciones

| Marca | Significado |
| --- | --- |
| `DECIDIDO` | Aceptado para este proyecto |
| `PROPUESTA` | Diseño razonable pendiente de aprobación formal por Tech Lead/Arquitectura |
| `PENDIENTE` | Requiere una decisión explícita de un rol identificado |
| `BLOQUEANTE` | Impide aprobar o implementar el comportamiento/módulo afectado antes de producción |

### 1.4 Documentos relacionados

| Documento | Relación |
| --- | --- |
| `BDD-KAIROS-TRANSVERSAL.md` + 6 archivos por proceso | Fuente funcional autoritativa |
| `SDD-KAIROS-TRANSVERSAL.md` + 6 archivos por proceso | Fuente arquitectónica |
| `TDD-CON-001`, `TDD-RES-001`, `TDD-ALQ-001`, `TDD-DEV-001`, `TDD-REC-001`, `TDD-ADP-001` | TDD por proceso — dependen de este documento para lo transversal |
| `SAD-KAIROS-MVP-001.md`\*\* v0.5\*\* | **Baseline arquitectónico normativo — se ubica entre el BDD/SAD y el SDD/TDD (ver **`SDD-KAIROS-TRANSVERSAL.md`** sección 1.4). Este documento incorpora su contenido de stack técnico, seguridad e infraestructura; el SAD sigue siendo la fuente original para el detalle completo** |
| `TDD-KAIROS-TRACEABILITY.md` | Matriz central BDD → SDD → TDD → Test, los 6 procesos |
| `TDD-KAIROS-Consolidado-Detallado.md` | Versión anterior, un solo archivo — archivada tras esta división |
| `ENG-KAIROS-001`, `SEC-KAIROS-001` | Normativos complementarios del SAD (estándares de ingeniería y de seguridad) — no entregados a Claude, referenciados solo por nombre |
| `03-TDD-ERP-KAIROS-MVP.md` | Anterior — archivado, solo referencia histórica |
| `Ejemplo-TDD-Reserva-Vehiculo-KAIROS.md` | Plantilla de referencia de nivel 9-10 aportada por el usuario |
| Decision Log KAIROS/VeloxRent | Decisiones, correcciones y hallazgos cronológicos |

---

## 2. Objetivo técnico y alcance

Implementar el ERP KAIROS/VeloxRent para los 6 procesos (Consulta, Reserva, Alquiler, Devolución, Reclutamiento y Selección, Administración de Personal) garantizando:

- cero doble confirmación del mismo vehículo e intervalo (Reserva/Alquiler);
- transiciones de estado únicamente mediante comandos, nunca `PATCH status` directo;
- idempotencia de escrituras críticas;
- aislamiento por organización/empresa (KAIROS: VeloxRent, Casa del Auto, Motrix, RENOVA);
- aceptación remota versionada (Reserva/Alquiler);
- auditoría inmutable de toda decisión crítica (NFR-KAI-002);
- publicación confiable de eventos entre módulos (outbox transaccional);
- contratos compartidos por frontend, backend y QA vía OpenAPI contract-first.

### 2.1 Incluido en el MVP

- Backend y frontend de los 6 procesos.
- Persistencia de las entidades lógicas definidas en cada SDD de proceso.
- Integración interna entre los módulos propietarios (Inquiries, Reservations, Rentals, Returns, Recruitment, HR-Administration) y los transversales (Customers, Fleet, Payments, Evidence, Notifications, Audit).
- OpenAPI de las operaciones críticas de cada módulo.
- Eventos de dominio/integración vía outbox.
- Autorización, auditoría y observabilidad transversales.
- Migraciones, CI/CD y pruebas.

### 2.2 Fuera de alcance del MVP

- Proveedor bancario productivo (conciliación manual asistida — BR-ALQ-011).
- Firma digital legal (firma con huella hasta aprobación Legal — OQ-SOL-009, `EXCLUIDO_R1`).
- Infraestructura productiva definitiva (Terraform como referencia, no como entregable final).
- Evaluación de Desempeño y Capacitación formal (BR-ADP-007/008 — fuera del MVP, candidatas a Release 2).
- Integración WhatsApp bidireccional (OQ-SOL-010 del SDD).
- Compresión/retención exacta de multimedia e integración productiva con Motrix (OQ-SOL-006, `EXCLUIDO_R1`; integración con Motrix sin acceso confirmado, ver `SDD-KAIROS-TRANSVERSAL.md` sección 16.4).

---

## 3. Decisiones técnicas transversales

> ⚠️ **Corregido y actualizado 01 sep 2026** con `SAD-KAIROS-MVP-001` (30 ago 2026), ratificado por un Tech Lead ya asignado (nombre no informado a Claude). Esto **corrige una suposición equivocada** de la versión anterior de este documento: el stack propuesto asumía **AWS** (S3, SQS, Cognito) — el SAD confirma que la nube elegida es **Google Cloud** (Cloud Run, Cloud Storage, Firebase), con **Supabase** como proveedor gestionado de PostgreSQL. Se corrigen TD-007 y TD-009 en consecuencia. También se corrige TD-003: el SAD no incluye Next.js, solo "React, JavaScript, HTML y CSS" como PWA.

| ID | Decisión | Estado | Justificación |
| --- | --- | --- | --- |
| TD-001 | **TypeScript 5.9.x** | `DECIDIDO` (SAD, 30 ago) | Tipado compartido entre frontend, backend y contratos |
| TD-002 | **Node.js 22 LTS + NestJS** | `DECIDIDO` (Eder Ramos, 02 sep 2026 — corrige la versión anterior, que dejaba el framework sin definir) | Runtime backend + framework HTTP. La estructura interna sigue exigiendo Clean Architecture dentro de los módulos de NestJS (Domain/Application/Adapters/Infrastructure) |
| TD-003 | **React (SPA/PWA), sin framework Next.js** | `DECIDIDO` — **corregido 04 sep 2026**: el 02 de septiembre se había registrado que el Tech Lead confirmó el uso de Next.js; el usuario indica que fue un error suyo — **no se usará Next.js**, consistente con la versión original del SAD (30 ago), que nunca lo incluyó ("React, JavaScript, HTML y CSS"). No afecta a TD-002 (NestJS, backend) — son capas distintas | Operación web/móvil, soporte offline acotado a 2 checklists (BR-INS-\*) |
| TD-004 | **PostgreSQL administrado por Supabase**, región `sa-east-1` (São Paulo) | `DECIDIDO` (SAD, 30 ago) | Integridad referencial, rangos temporales (`tstzrange`) para no-solapamiento de vehículos, PITR/WAL para RPO ≤15 min |
| TD-005 | **Prisma ORM 7.10.0** (`prisma`, `@prisma/client`, `@prisma/adapter-pg` en versiones idénticas) | `DECIDIDO` (SAD, 30 ago) — corrige la versión anterior de este documento, que proponía Drizzle | Los `exclusion constraints`/`checks` avanzados (ej. `vehicle_commitments`, sección 7.4) siguen siendo SQL explícito por debajo de Prisma cuando el ORM no los expresa nativamente |
| TD-006 | OpenAPI 3.1 contract-first | `PROPUESTA` — el SAD no se pronuncia sobre el formato de contrato HTTP, sigue siendo una decisión de este TDD | Contrato ejecutable compartido por los 6 módulos |
| TD-007 | **Procesamiento asíncrono sobre Google Cloud** (Cloud Tasks o Pub/Sub — el SAD no elige entre ambos) + outbox transaccional | `DECIDIDO` parcial (SAD, 30 ago) — corrige la versión anterior de este documento, que proponía SQS (AWS); AWS SQS no aplica en una arquitectura desplegada en Cloud Run/GCP | Side effects confiables entre módulos — falta al Tech Lead elegir el servicio exacto de cola dentro de GCP |
| TD-008 | **Firebase Authentication con Identity Platform** | `DECIDIDO` (SAD, 30 ago) — corrige la versión anterior de este documento, que proponía Cognito (AWS) | Autenticación estándar, MFA (TOTP) obligatorio para todos los usuarios (ver sección 8.4) |
| TD-009 | **Google Cloud Storage privado**, región `southamerica-east1`, 1 TB inicial | `DECIDIDO` (SAD, 30 ago) — corrige la versión anterior de este documento, que proponía S3 (AWS) | Los 3 videos + 35 fotos por expediente (BR-INS-003/004, actualizado 02 sep) quedan fuera de la API |
| TD-010 | **Sentry** (errores/trazas) + **Google Cloud Logging** (logs backend) | `DECIDIDO` (SAD, 30 ago) — corrige la versión anterior de este documento, que proponía solo OpenTelemetry | Trazas, métricas y logs transversales a los 6 módulos — OpenTelemetry queda como herramienta complementaria de backend, no como baseline |
| TD-011 | Infraestructura como código (herramienta exacta no fijada por el SAD — Terraform sigue siendo la propuesta de este documento) | `PROPUESTA` | Infraestructura reproducible en 4 ambientes sobre Google Cloud |
| TD-012 | Vitest, Testcontainers y Playwright | `PROPUESTA` — el SAD no elige framework de pruebas, solo fija objetivos de cobertura (sección 10.1) | Pirámide de pruebas completa |
| TD-013 (nueva) | **GitHub + GitHub Actions** | `DECIDIDO` (SAD, 30 ago) | CI/CD — ver toolchain completo de seguridad en la sección 8.4 |
| TD-FE-001 | **Vite** | `DECIDIDO` (Tech Lead, 10 sep) | Build/dev server para SPA/PWA estática en Firebase Hosting |
| TD-FE-002 | **React Router** | `DECIDIDO` | Routing, layouts, navegación, breadcrumbs y guards UX |
| TD-FE-003 | **TanStack Query** | `DECIDIDO` | Única autoridad de server state en cliente |
| TD-FE-004 | **Zustand** | `DECIDIDO` | Estado global exclusivamente cliente; no duplica API ni formularios |
| TD-FE-005 | **React Hook Form + Zod** | `DECIDIDO` | Formularios y validación cliente; backend sigue siendo autoridad |
| TD-FE-006 | **OpenAPI + cliente/tipos generados** | `DECIDIDO` | Prohibidos DTO manuales paralelos |
| TD-FE-007 | **vite-plugin-pwa + Workbox** | `DECIDIDO` | Service worker/app shell sin ampliar confirmaciones offline |
| TD-FE-008 | **Dexie sobre IndexedDB** | `DECIDIDO` | Solo borradores cifrados ALQ-09/DEV-04 |
| TD-FE-009 | **Radix UI Primitives + CSS Modules + CSS Custom Properties** | `DECIDIDO` | Accesibilidad base, encapsulación y tokens UX/UI |
| TD-FE-010 | **Lucide React + date-fns + TanStack Table** | `DECIDIDO` | Iconografía, fechas y bandejas consistentes |
| TD-FE-011 | **Vitest + Testing Library + user-event + MSW + Playwright + axe** | `DECIDIDO` | Unit, component, mocks contractuales, E2E y accesibilidad |
| TD-FE-012 | **Sentry** | `DECIDIDO` | Observabilidad frontend sin PII |

### 3.2 Reglas de coexistencia del stack frontend

- TanStack Query conserva exclusivamente estado remoto; Zustand no replica respuestas completas de API.
- React Hook Form conserva estado de formulario; Zustand no conserva campos temporales.
- React Router implementa navegación/guards de experiencia; NestJS revalida autorización en cada operación.
- Zod mejora feedback cliente y puede consumir schemas derivados; nunca reemplaza validación backend.
- Dexie no almacena tokens ni amplía offline fuera de ALQ-09 y DEV-04.
- Workbox no cachea respuestas sensibles sin política explícita.
- Radix aporta primitivas; los tokens y patrones de UX/UI v3.1 gobiernan apariencia.
- Versiones exactas quedan fijadas en `package.json` y lockfile al bootstrap. Cambios de major o sustituciones requieren ADR.

### 3.1 ADR transversales relacionados

Mismos 6 ADR ya identificados en `SDD-KAIROS-TRANSVERSAL.md` (sección 25) y `SDD-REC-001`/`SDD-ADP-001` (ADR-KAI-006), \*\*9 de los cuales ya están \*\*`APROBADA_ARQUITECTURA` desde el 30 de agosto (ver `SDD-KAIROS-TRANSVERSAL.md` sección 25 para el detalle completo, incluidos ADR-KAI-007/010/011 nuevos):

- ADR-KAI-001 Monolito modular (no microservicios en el MVP) — `APROBADA_ARQUITECTURA`.
- ADR-KAI-002 Consistencia fuerte de disponibilidad (Reserva/Alquiler) — `APROBADA_ARQUITECTURA`.
- ADR-KAI-003 Outbox transaccional para side effects — `APROBADA_ARQUITECTURA`.
- ADR-KAI-004 No confirmar operaciones críticas offline — `APROBADA_ARQUITECTURA`.
- ADR-KAI-005 Evidencia por carga directa a almacenamiento de objetos, no por la API — `APROBADA_ARQUITECTURA`.
- ADR-KAI-006 Recruitment y HR-Administration como módulos separados — `APROBADA_ARQUITECTURA`.
- ADR-KAI-007 Aislamiento multiempresa en esquema compartido — `APROBADA_ARQUITECTURA`, nuevo.
- ADR-KAI-010 Clean Architecture obligatoria — `APROBADA_ARQUITECTURA`, nuevo.
- ADR-KAI-011 Secure SDLC basado en OWASP — `APROBADA_ARQUITECTURA`, nuevo.

**Sin cerrar:** el gate Legal de la aceptación remota (`ADR-009`) — `ADR-008` (`VehicleHold`) se cerró definitivamente el 02 sep 2026 (Eder Ramos: "no hay ni habrá `VehicleHold`").

---

## 4. Requisitos trazados (nivel transversal)

> Detalle completo por handler/artefacto vive en cada TDD de proceso. Esta tabla mapea a nivel de módulo.

| Módulo TDD | Procesos BDD que cubre | Entrada SDD | Estado |
| --- | --- | --- | --- |
| Inquiries | Consulta | `SDD-CON-001` | Completo — ver `TDD-CON-001` |
| Reservations | Reserva | `SDD-RES-001` | Completo — ver `TDD-RES-001` |
| Rentals | Alquiler | `SDD-ALQ-001` | Completo — ver `TDD-ALQ-001` |
| Returns | Devolución | `SDD-DEV-001` | Completo — ver `TDD-DEV-001`, incorpora BR-DEV-006/011 (31 ago) |
| Recruitment | Reclutamiento y Selección | `SDD-REC-001` | Completo — ver `TDD-REC-001` |
| HR-Administration | Administración de Personal | `SDD-ADP-001` | Completo — ver `TDD-ADP-001`, incorpora BR-ADP-004 (31 ago) |
| Customers, Fleet, Payments, Evidence, Notifications, Audit | Transversal a los 6 | `SDD-KAIROS-TRANSVERSAL.md`, sección 8 | Se detallan junto con el módulo que los consume (ver tablas de la sección 7 de este documento) |

---

## 5. Arquitectura de ejecución

```
flowchart TD
    UI["React PWA"] --> API["NestJS REST API"]
    API --> APP_INQ["Inquiries Application"]
    API --> APP_RES["Reservations Application"]
    API --> APP_RENT["Rentals Application"]
    API --> APP_RET["Returns Application"]
    API --> APP_REC["Recruitment Application"]
    API --> APP_HR["HR-Administration Application"]
    APP_INQ --> DOM["Domain layers (uno por módulo)"]
    APP_RES --> DOM
    APP_RENT --> DOM
    APP_RET --> DOM
    APP_REC --> DOM
    APP_HR --> DOM
    DOM --> PORTS["Customer/Fleet/Payment/Evidence/Notification Ports"]
    DOM --> DB["PostgreSQL"]
    DB --> OUT["Outbox Publisher"]
    OUT --> Q["Cloud Tasks / Pub-Sub (GCP)"]
    Q --> WK["Notification/Projection/Audit Workers"]
```

### 5.1 Dependencias permitidas

```
presentation → application → domain
infrastructure → application ports + domain
domain → ninguna dependencia de framework
módulo A → módulo B solo mediante puerto explícito o evento, nunca leyendo su tabla directamente
```

Se prohíben importaciones directas entre carpetas `infrastructure` de módulos distintos — mismo criterio que ADR-KAI-001.

---

## 6. Estructura del repositorio

```
apps/
  web/
    src/app/
      router/
      providers/
      layouts/
      guards/
    src/features/
      inquiries/
      reservations/
      rentals/
      returns/
      recruitment/
      hr-administration/
    src/offline/
      database/
      encryption/
      queue/
      synchronization/
      conflicts/
    src/design-system/
      tokens/
      primitives/
      patterns/
    vite.config.ts
  api/
    src/modules/
      inquiries/
      reservations/
      rentals/
      returns/
      recruitment/
      hr-administration/
      customers/          # transversal
      fleet/               # transversal
      payments/            # transversal
      evidence/            # transversal
      notifications/       # transversal
      audit/                # transversal
  worker/
    src/consumers/
packages/
  contracts/openapi/
  contracts/events/
  domain-shared/
  ui/
  config/
  testing/
infra/terraform/
docs/adr/
tests/e2e/
```

### 6.1 Estructura interna por módulo (patrón replicado en los 6)

```
modules/<dominio>/
  domain/
    entities/
    value-objects/
    policies/
    events/
    repositories.ts
  application/
    commands/
    queries/
    ports/
    dto/
  infrastructure/
    persistence/
    integrations/
  presentation/http/
  tests/
```

### 6.2 Límites de archivo

- Objetivo: ≤300 líneas.
- Excepción: ≤500 con justificación.
- Un handler por comando.
- Una política por decisión relevante (ej. `NotarialPolicy`, `RiskSemaphorePolicy`).
- No existe archivo global `services.ts` o `utils.ts` sin cohesión.

---

## 7. Convenciones transversales de dominio

> Patrones que se repiten en los 6 módulos — se definen una sola vez aquí; cada TDD de proceso los referencia en vez de redefinirlos.

### 7.1 Value objects comunes

- `OrganizationId`, `CompanyId`, `BranchId` — aislamiento multiempresa (NFR-KAI-003).
- `CustomerId`, `VehicleId`, `UserId`.
- `DateTimeRange` con semántica `[start, end)` — usado en Reserva, Alquiler y vacaciones/permisos de Administración de Personal.
- `Money(amount, currency)` — dinero como string decimal + ISO 4217, nunca float.
- `VersionNumber` — optimistic locking transversal.
- `Reason` — motivo obligatorio en toda excepción o cambio de estado sensible.

### 7.2 Invariantes transversales (derivan de NFR-KAI-\* del BDD)

1. `startAt < endAt` en todo rango temporal (Reserva, Alquiler, permisos).
2. Aislamiento multiempresa: ninguna consulta cruza `organization_id`/`operating_company_id` sin asignación válida (NFR-KAI-003).
3. Una decisión crítica auditada nunca se sobrescribe; se versiona o se anexa (NFR-KAI-002).
4. Un reintento no duplica pago, reserva, alquiler ni expediente de personal (NFR-KAI-004).
5. Estados terminales no reciben nuevos comandos salvo operación administrativa explícita y auditada.
6. Ninguna transición de un dato clasificatorio unidireccional (ej. `risk_status` del cliente, ver `TDD-DEV-001`) puede revertirse por código — solo se agrega un nuevo estado hacia adelante, nunca un `UPDATE` que regrese a un valor anterior (confirmado 31 ago: el semáforo de riesgo no tiene rehabilitación, BR-DEV-008).

### 7.3 Idempotencia, auditoría y outbox (tablas compartidas por los 6 módulos)

```sql
CREATE TABLE idempotency_keys (
  scope varchar(100) NOT NULL,
  key varchar(100) NOT NULL,
  request_hash char(64) NOT NULL,
  response_status integer NULL,
  response_body jsonb NULL,
  resource_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (scope, key)
);

CREATE TABLE outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type varchar(50) NOT NULL,
  aggregate_id uuid NOT NULL,
  aggregate_version integer NOT NULL,
  event_type varchar(100) NOT NULL,
  event_version integer NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  published_at timestamptz NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_error varchar(1000) NULL
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  company_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  action varchar(100) NOT NULL,
  resource_type varchar(50) NOT NULL,
  resource_id uuid NOT NULL,
  before_data jsonb NULL,
  after_data jsonb NULL,
  reason varchar(500) NULL,
  correlation_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
```

Cada módulo (Reservations, Rentals, Returns, Inquiries, Recruitment, HR-Administration) reutiliza estas 3 tablas — no crea su propia tabla de auditoría u outbox.

### 7.4 Compromisos de vehículo (transversal a Reserva y Alquiler)

```sql
CREATE TABLE vehicle_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  operating_company_id uuid NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  source_type varchar(20) NOT NULL,   -- 'RESERVATION' | 'RENTAL' | 'MAINTENANCE'
  source_id uuid NOT NULL,
  period tstzrange NOT NULL,
  status varchar(20) NOT NULL,        -- 'ACTIVE' | 'CONSOLIDATED' | 'RELEASED' | 'EXPIRED'
  expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT commitment_source_unique UNIQUE (source_type, source_id),
  CONSTRAINT commitment_nonempty CHECK (NOT isempty(period)),
  EXCLUDE USING gist (
    vehicle_id WITH =,
    period WITH &&
  ) WHERE (status IN ('ACTIVE','CONSOLIDATED'))
);
```

Esta es la implementación física de **NFR-KAI-001** (nunca se confirman dos reservas o alquileres solapados del mismo vehículo). ⚠️ **Corregido 31 ago:** la fila se crea en un **único paso atómico** al confirmar (pago + documentos completos a la vez, BR-RES-009/BR-RES-003 confirmado 27 y 31 ago) — no existe un "bloqueo provisional" previo. Ver `TDD-RES-001`, sección 10.1, para la transacción corregida.

---

## 8. Seguridad técnica transversal

### 8.1 Controles

- TLS 1.2+.
- OIDC (Firebase Authentication), MFA obligatorio para **todos** los usuarios, no solo roles sensibles (ver sección 8.4, corregido 01 sep).
- Tokens cortos y revocación — objetivo ≤5 min tras baja o incidente.
- WAF/rate limiting.
- CSP, CSRF según mecanismo de sesión, XSS/input validation.
- Cifrado en reposo (evidencia, datos de Cliente) — administrado por Google en GCS.
- Secretos fuera de código — gestionados por DevOps vía **Google Secret Manager** (`DECIDIDO`, SAD 30 ago).
- Dependencias/SBOM/escaneo — toolchain concreto en sección 8.4.
- Auditoría de accesos sensibles (semáforo de riesgo, datos de personal).

### 8.2 Threat cases obligatorios (transversales a los 6 módulos)

- IDOR sobre reserva/alquiler/expediente de personal/evidencia.
- Cross-tenant access (NFR-KAI-003) — probado manipulando URL, body, query y token con IDs de otra empresa (SAD §12.2).
- Replay de confirmación (comandos críticos).
- Voucher/evidencia reutilizados.
- Manipulación de importe (monto de reserva, garantía, descuentos por daño, cargos por paralización).
- SSRF en cargas/URLs.
- MIME spoofing/malware en evidencia (3 videos + 35 fotos).
- PII en logs/eventos (datos de Cliente y de Personal).
- Elevación por delegación vencida (autorización en cascada Fiorella → José → Cecilia, BR-ALQ-014/BR-ADP-004) — delegaciones máximo 30 días, nunca de `Platform Administrator` ni aprobación financiera total (SAD §12.2.1).

### 8.3 Rate limits propuestos

| Operación | Límite | Estado |
| --- | --- | --- |
| Lecturas autenticadas | 300/min/usuario | `PROPUESTA` |
| Comandos | 60/min/usuario | `PROPUESTA` |
| Sesiones de upload (evidencia) | 20/h/usuario | `PROPUESTA` |
| Login | Administrado por Firebase Authentication | `DECIDIDO` (proveedor ya fijado por el SAD) |

Los valores numéricos exactos se ajustan con métricas y threat modeling una vez asignado el responsable de Seguridad.

### 8.4 Autenticación, roles y toolchain de seguridad — `APROBADA_ARQUITECTURA` según SAD-KAIROS-MVP-001 §12 (incorporado 01 sep 2026)

**Sesión (valores exactos aprobados):** absoluta 8h; inactividad general 30 min; roles privilegiados (Gerencia, Finanzas, RR.HH.) 15 min; una operación crítica exige MFA realizado en los últimos 5 min.

**Catálogo de roles:** Platform Administrator, Corporate Auditor, Company Administrator, Operations Manager, Reservation Agent, Fleet Operator, Cashier, Finance Approver, HR Manager, Recruiter, Read Only — matriz rol–permiso–empresa–sede versionada, con denegación por defecto (ver `SDD-KAIROS-TRANSVERSAL.md`, sección 15.5 para el detalle completo).

**Toolchain de seguridad aprobado (Secure SDLC):**

| Control | Herramienta |
| --- | --- |
| SAST | Semgrep Community |
| SCA + contenedores + IaC | Trivy |
| Secretos | Gitleaks |
| DAST | OWASP ZAP |
| SBOM | Syft (CycloneDX + SPDX) |

SLA de remediación: crítica 24h, alta 7 días, media 30 días, baja 90 días. Sin excepción posible: bypass de autenticación, acceso entre empresas, RCE, inyección explotable, secretos activos expuestos, pago duplicable, o vulnerabilidad explotada activamente. Pentest independiente obligatorio antes de producción y al menos anual.

---

## 9. Infraestructura transversal

> ⚠️ **Corregido 01 sep 2026:** la tabla de componentes de la versión anterior estaba orientada a AWS (CloudFront, ECS, RDS, SQS, S3). El SAD confirma que la nube elegida es **Google Cloud**, con Firebase y Supabase como proveedores gestionados adicionales — se reemplaza la tabla completa.

### 9.1 Componentes aprobados — SAD-KAIROS-MVP-001 §19 (`APROBADA_ARQUITECTURA`)

| Capa | Servicio | Estado |
| --- | --- | --- |
| Hosting frontend | **Firebase Hosting** | `DECIDIDO` |
| Identidad | **Firebase Authentication / Identity Platform** | `DECIDIDO` |
| API/Backend | **Google Cloud Run**, región `southamerica-east1` (São Paulo) | `DECIDIDO` |
| Datos | **Supabase PostgreSQL**, región `sa-east-1` (São Paulo) | `DECIDIDO` |
| Archivos/evidencia | **Google Cloud Storage**, región `southamerica-east1`, 1 TB inicial | `DECIDIDO` |
| Entrega de contenido (fotos/video) | **Sin CDN global** — servido directo desde `southamerica-east1`, decisión de negocio del 03 sep 2026 (`OQ-SOL-015`) para evitar el tránsito internacional de datos personales | `DECIDIDO` — ⚠️ **implicancia técnica pendiente de que Eder Ramos la confirme explícitamente**: sin CDN, la carga de fotos/video será más lenta para cualquier cliente fuera de la región Perú/Brasil |
| Cola/procesamiento asíncrono | Google Cloud (Cloud Tasks o Pub/Sub — el SAD no elige entre ambos) + outbox | `DECIDIDO` parcial |
| Secretos | **Google Secret Manager** | `DECIDIDO` |
| Observabilidad | **Sentry** + **Google Cloud Logging** (baseline); Cloud Monitoring, Error Reporting, OpenTelemetry, Firebase Performance y Supabase Logs (complementarios) | `DECIDIDO` |
| CI/CD | **GitHub + GitHub Actions** | `DECIDIDO` |

**✅ Resuelto 02 sep 2026 (confirmado por Eder Ramos: "Sí, confirmado"):** el plan productivo de Supabase que garantiza contractualmente 99.9% de disponibilidad, RPO 15 min y RTO 2h ya está contratado. Los planes gratuitos siguen usándose solo en DEV/QA/piloto, como estaba previsto — ya no es una advertencia abierta. La residencia de datos en São Paulo tampoco requiere aprobación legal adicional, según confirmó Fiorella el mismo día.

### 9.2 Ambientes

- Desarrollo, QA/Integración, Preproducción/UAT y Producción, aislados.
- Datos sintéticos fuera de producción — crítico dado que Cliente y Personal manejan datos sensibles (DNI, biometría, remuneración). Protocolo de anonimización detallado en `SDD-KAIROS-TRANSVERSAL.md`, sección 23.6.
- Credenciales y claves separadas por ambiente (Google Secret Manager por ambiente).
- Infraestructura como código con estado protegido y bloqueado (herramienta exacta — Terraform — sigue como `PROPUESTA` de este documento, el SAD no la fija).
- **Gobierno de despliegue:** DEV vía CI (desarrolladores); QA vía CI con aprobación QA; UAT vía DevOps con aprobación QA/Product Owner; **PROD vía DevOps con aprobación de Tech Lead y del responsable funcional del módulo — ningún desarrollador despliega manualmente a producción** (SAD §19, `APROBADA_ARQUITECTURA`).

### 9.3 Escalado

- API stateless, en Cloud Run (autoscaling nativo).
- Pool de conexiones limitado por la capacidad contratada de Supabase.
- Worker escala por profundidad/edad de cola.
- La confirmación de disponibilidad (Reserva/Alquiler) nunca usa caché como autoridad — siempre lee `vehicle_commitments` en transacción.
- **Ventana operativa confirmada 31 ago 2026: 8:00 a.m. a 5:00 p.m., 7 días, las 4 empresas** (ver `SDD-KAIROS-TRANSVERSAL.md`, sección 4.1 y OQ-SOL-007 en sección 14) — corresponde al horario de **negocio**, distinto del NFR de disponibilidad técnica del SAD (99.9% mensual, medido 24×7 incluyendo mantenimiento programado y no programado, ver `SDD-KAIROS-TRANSVERSAL.md` sección 19). Ambos valores conviven: la ventana operativa es cuándo el negocio necesita el sistema disponible sin excusa; el NFR técnico es el estándar de ingeniería, más exigente, aplicado todo el día.

---

## 10. Estrategia de pruebas transversal

| Nivel | Herramienta | Cobertura mínima |
| --- | --- | --- |
| Unit | Vitest | Dominio y políticas de cada módulo (ej. `NotarialPolicy`, `RiskSemaphorePolicy`) |
| Integración | Testcontainers (PostgreSQL real) | Constraints de exclusión, triggers, migraciones |
| Contrato | Validación OpenAPI | Cada endpoint contra su schema |
| Concurrencia | Suite dedicada | No-solapamiento de vehículo (`vehicle_commitments`), doble reserva |
| E2E | Playwright | Flujo completo por proceso, ver escenarios Gherkin de cada BDD de proceso |
| Seguridad | Suite de threat cases | Sección 8.2 de este documento |

Cada escenario Gherkin de la serie BDD debe tener una realización verificable en esta pirámide — se traza formalmente en `TDD-KAIROS-TRACEABILITY.md` y en la sección de trazabilidad de cada TDD de proceso.

---

## 11. CI/CD

### 11.1 Pipeline

1. Lint + typecheck.
2. Unit tests.
3. Build.
4. Integration tests (Testcontainers).
5. Contract tests (OpenAPI).
6. Escaneo de dependencias/SBOM.
7. Despliegue a DEV automático; QA/UAT/PRD con aprobación manual.

### 11.2 Branch/artefactos

- Commits revisados.
- Imagen inmutable por digest.
- Artefacto OpenAPI versionado.
- Migraciones con checksum.
- Evidencia de pruebas asociada al build.

---

## 12. Runbooks transversales

Se requieren antes de producción (aplican a cualquier módulo):

- Outbox/DLQ detenido.
- Restauración de base de datos.
- Evidencia atascada (subida de videos/fotos fallida).
- Pago inconsistente.
- Doble compromiso de vehículo detectado por migración.
- Revocación urgente de usuario.
- Caída de proveedor OIDC.
- Rollback de aplicación.
- Conciliación posterior a contingencia manual (ej. RENIEC/MTC caído).

Cada runbook incluye síntomas, diagnóstico, contención, recuperación, validación y escalamiento — se redactan como documentos independientes (Anexo A), no dentro de este Markdown.

---

## 13. Definition of Done técnico (transversal a los 6 procesos)

Una historia está terminada cuando:

1. Requisito y escenario BDD aprobados.
2. Diseño SDD/TDD trazado.
3. OpenAPI/event schema actualizado.
4. Migración compatible incorporada.
5. Autorización y scope (multiempresa) implementados.
6. Auditoría presente cuando corresponde (NFR-KAI-002).
7. Unit, integration, contract y E2E relevantes pasan.
8. Observabilidad y alertas operativas existen.
9. Seguridad no reporta vulnerabilidades críticas/altas sin aceptación.
10. Documentación/runbook actualizados.
11. QA y Producto aceptan el comportamiento.

---

## 14. Decisiones técnicas abiertas (transversales)

> Las específicas de cada dominio (ej. matriz de validaciones de Devolución) viven en el TDD de proceso correspondiente. Estas son las que afectan a los 6 módulos por igual.

| ID | Decisión | Propietario | Impacto | Gate | Estado |
| --- | --- | --- | --- | --- | --- |
| OQ-TDD-001 | ORM definitivo (Drizzle vs. Prisma) | Tech Lead/Datos | Repositories/migraciones de los 6 módulos | Antes de implementación | ✅ `RESUELTO` (30 ago 2026, vía SAD) — **Prisma ORM 7.10.0** |
| OQ-TDD-002 | Proveedor OIDC/IdP | Tech Lead/Seguridad | Autenticación de los 6 módulos | Antes de sizing de Seguridad | ✅ `RESUELTO` (30 ago 2026, vía SAD) — **Firebase Authentication con Identity Platform**, MFA obligatorio para todos (sección 8.4) |
| OQ-TDD-003 | Ventana operativa exacta (SLO) | Producto/Tech Lead | Infra/alertas | Antes de sizing | ✅ `RESUELTO` (31 ago 2026) — **8:00 a.m. a 5:00 p.m., 7 días, las 4 empresas**. Ya no bloquea el sizing; falta aplicar el valor a las alertas y ventanas de mantenimiento concretas |
| OQ-TDD-004 | Valor legal de la aceptación remota/firma con huella | Legal | Evidence/retención | Antes de go-live remoto (Reserva y Alquiler) | ✅ `RESUELTO`\*\* (no bloqueante, 03 sep 2026, 3ª ronda):\*\* el usuario confirmó que la reserva remota nunca es el respaldo legal final — el contrato de Alquiler siempre se firma presencialmente, con video como evidencia adicional. El mecanismo técnico ya está `APROBADA_ARQUITECTURA_CON_GATE_LEGAL` (SAD ADR-009); el gate Legal formal (`OQ-SOL-009` del SDD, ahora `RESUELTO` también) queda como ratificación pendiente antes de producción, no como bloqueo de diseño |
| OQ-TDD-005 | Política de retención de idempotencia y purga de outbox | Tech Lead | Todos los módulos | Antes de producción | `PENDIENTE` |
| OQ-TDD-006 | Servicio exacto de cola dentro de Google Cloud | Tech Lead | Implementación del outbox publisher (sección 7.3) | Antes de implementar el worker | ✅ `RESUELTO` (02 sep 2026) — **Cloud Tasks**, confirmado por Eder Ramos |
| OQ-TDD-007 | Propuesta de `VehicleHold` de 10 min del SAD (`ADR-008`) | Producto + Tech Lead | Modelo de estados y transacción de confirmación de `TDD-RES-001` | — | ✅ `RESUELTO` (02 sep 2026) — **Cerrado definitivamente por Eder Ramos: "no hay ni habrá **`VehicleHold`**."** `TDD-RES-001` no se modifica — su diseño actual (sin hold) ya era correcto |
| OQ-TDD-008 | Resolución cuando el pago ya se validó pero la disponibilidad falla al confirmar | Producto/Finanzas | `ConfirmReservationHandler` en `TDD-RES-001`, sección 10.1 | — | ✅ `RESUELTO` (02 sep 2026) — **Eder Ramos confirmó que este escenario no ocurre**: la confirmación (pago + documentos) es atómica, no existe un estado intermedio donde el pago esté validado sin disponibilidad garantizada |

---

## 15. Criterios de aprobación del TDD

> 📌 **Actualizado 03 sep 2026 (respuesta directa de Fiorella):** una vez resueltas las últimas dudas de negocio del BDD y actualizado el SDD/TDD con las respuestas ya recibidas, **el equipo del proyecto (Fiorella + Eder Ramos + Russbel) puede aprobar el TDD internamente**. **Actualizado 03 sep (4ª ronda): los roles de Datos, Seguridad, QA y DevOps ya están asignados (Eder Ramos)** — la nota original decía que no había que esperar a que se asignaran; ahora ya no aplica, porque ya se asignaron. **Actualizado 03 sep (5ª ronda): el usuario decidió no asignar un responsable Legal por el momento** — la validación formal ya dada por el negocio (Fiorella/José como Gerencia) se considera suficiente para seguir.

> ⚠️ Actualizado 01 sep 2026 — ya existe un Tech Lead actuando (ver `SAD-KAIROS-MVP-001`), que movió el criterio 2 de "sin nadie asignado" a "asignado, con 9 de 11 ADR ya aprobados". **Actualizado 03 sep: los demás roles (Datos, Seguridad, QA, DevOps) ya tienen nombre — Eder Ramos.**

El documento (transversal + los 6 de proceso) puede pasar a `APPROVED` cuando:

1. BDD y SDD de los 6 procesos estén aprobados (o las excepciones aceptadas) — **actualizado 02 sep 2026:** las 18 preguntas de negocio del BDD ya están `RESUELTO`/`RESUELTO parcial` — no queda ninguna pregunta funcional abierta (`OQ-DEV-101` y `OQ-CLI-101` cerradas, `OQ-CON-101` confirmada formalmente el 02 de septiembre).
2. ADR y stack estén aceptados por Arquitectura — **Tech Lead asignado: Eder Ramos (02 sep).** 10 de 11 ADR ya `APROBADA_ARQUITECTURA` (`ADR-008` cerrado el 02 sep), y el stack tecnológico completo está decidido (sección 3). El gate Legal de la aceptación remota (OQ-TDD-004) ya no bloquea (resuelto 03 sep, 3ª ronda). Falta la firma final formal de Eder Ramos (sección 15.1).
3. OpenAPI completo de los 6 módulos pase revisión frontend/backend/QA — `PENDIENTE` de ejecución; **rol de QA ya asignado (Eder Ramos, 03 sep 2026)**.
4. DDL y migraciones pasen revisión de Datos — **rol de Data Steward asignado (Eder Ramos, 03 sep 2026)**, falta la validación formal (el SAD nombra los dominios, ver `SDD-KAIROS-TRANSVERSAL.md` sección 14.4).
5. Threat model y autorización pasen Seguridad — el diseño ya avanzó bastante (roles, MFA, toolchain OWASP en sección 8.4). **Rol de Seguridad asignado (Eder Ramos, 03 sep 2026)**, falta la validación formal.
6. Eventos y reintentos pasen Arquitectura/Operaciones.
7. NFR tengan objetivos aceptados y pruebas definidas — 8 de 11 NFR ya `APROBADA_ARQUITECTURA` (ver `SDD-KAIROS-TRANSVERSAL.md`, sección 19). **Resuelto 03 sep 2026:** Fiorella confirma que el presupuesto para pasar de los planes gratuitos de Google Cloud/Supabase/Firebase a planes productivos **ya está aprobado** — cierra la factibilidad real que quedaba pendiente sobre esos NFR. Solo queda la ejecución técnica de la contratación.
8. Decisiones bloqueantes (sección 14, más las específicas por proceso) estén resueltas o excluidas — ✅ **Cumplido desde el 02 sep 2026, reforzado el 03 sep.** OQ-TDD-006, 007 y 008 se resolvieron directamente con el Tech Lead; OQ-TDD-004 (gate Legal) se resolvió el 03 sep (3ª ronda) — ya no queda ninguna decisión bloqueante pendiente.
9. Primer vertical slice (Alquiler o Devolución) se implemente como prueba del diseño.
10. Restauración, concurrencia e idempotencia hayan sido verificadas — el SAD ya define objetivos de cobertura concretos (100% escenarios críticos, ≥80% líneas/ramas nuevas, ≥90% dominio crítico) que se heredan como referencia para este criterio.

> 📌 **Resumen actualizado 03 sep (4ª ronda):** el trabajo del Tech Lead el 30 de agosto avanzó sustancialmente los criterios 2 y 7. El criterio 7 (NFR/planes productivos) queda cumplido — presupuesto aprobado por Fiorella el 03 sep. **Los criterios 3, 4, 5 (QA, Datos, Seguridad) ya tienen responsable asignado — Eder Ramos** — solo queda la validación formal, no la asignación. El criterio 8 tiene 2 decisiones bloqueantes concretas y accionables, en vez de una lista genérica.

### 15.1 Firmas

> ✅ **Actualizado 04 sep 2026:** el usuario confirmó que **no es necesaria la firma formal** — la documentación se considera aprobada con las decisiones y asignaciones de rol ya registradas. **Backend y Frontend asignados a Eder Ramos** (acumula 8 roles técnicos en total) — con todos los roles de esta tabla ya cubiertos.

| Rol | Nombre | Decisión | Fecha | Observación |
| --- | --- | --- | --- | --- |
| Producto | **Fiorella (Sponsor)** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 03 sep 2026 | Fiorella confirma que ella misma da la aprobación final de UAT por módulo |
| Tech Lead | **Eder Ramos** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 30 ago 2026 (decisiones), confirmado por nombre 02 sep 2026 | 9 de 11 ADR aprobados el 30 ago; `ADR-008` cerrado 02 sep — solo `ADR-009` (gate Legal) sin cerrar |
| Arquitectura | Ver Tech Lead | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 30 ago 2026 | Mismo estado que el SDD |
| Datos | **Eder Ramos** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 03 sep 2026 | Acumula el rol de Data Steward junto con Tech Lead |
| Seguridad | **Eder Ramos** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 03 sep 2026 | Acumula el rol de Seguridad junto con Tech Lead |
| Backend | **Eder Ramos** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 04 sep 2026 | Asignado |
| Frontend | **Eder Ramos** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 04 sep 2026 | Asignado |
| QA | **Eder Ramos** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 03 sep 2026 | Acumula el rol de QA Lead junto con Tech Lead |
| DevOps | **Eder Ramos** | Aprobado sin firma formal (decisión del usuario, 04 sep 2026) | 03 sep 2026 | Acumula el rol de DevOps junto con Tech Lead |

---

## 16. Checklist de calidad 9-10 (transversal)

| Dimensión | Sección | Estado |
| --- | --- | --- |
| Autoridad y alcance | 1-2 | Cumple |
| Decisiones técnicas | 3 | Cumple, sujeto a aprobación de Tech Lead |
| Trazabilidad de entrada (nivel módulo) | 4 | Cumple; detalle por handler en cada TDD de proceso |
| Arquitectura/estructura de repositorio | 5-6 | Cumple |
| Convenciones y tablas transversales | 7 | Cumple, con corrección del 31 ago (sin bloqueo provisional) |
| Seguridad técnica | 8 | Cumple, sujeto a revisión de Seguridad |
| Infraestructura | 9 | Cumple como referencia, ventana operativa ya resuelta |
| Pruebas | 10 | Cumple como estrategia |
| CI/CD | 11 | Cumple como referencia |
| Runbooks | 12 | Cumple como lista; documentos independientes pendientes |
| DoD | 13 | Cumple |
| Decisiones abiertas | 14 | Cumple; OQ-TDD-003 resuelto el 31 ago |
| Aprobación | 15 | Cumple en estructura; firmas pendientes |
| Modelo de dominio, máquina de estados, modelo físico, transacciones, contrato HTTP, matriz de validaciones y trazabilidad por proceso | Viven en cada `TDD-XXX-001` y en `TDD-KAIROS-TRACEABILITY.md` | Ver documentos correspondientes |

**Evaluación:** nivel 9-10 en rigor de contenido para el alcance transversal. Pendiente exclusivamente de las firmas formales y de las decisiones técnicas que corresponden a roles todavía sin asignar (Tech Lead, Data Architect, Seguridad, QA, DevOps) — ningún vacío de contenido restante depende de más levantamiento de información con Fiorella.

---

## Anexo A — Qué debe vivir fuera del Markdown

- `openapi.yaml` completo por módulo.
- Schemas JSON de eventos.
- Migraciones SQL.
- Terraform.
- Dashboards y alertas como código.
- Tests automatizados.
- Runbooks (documentos independientes, no listas dentro de este archivo).
- ADR independientes.

El pipeline verifica que esos artefactos correspondan a la versión de esta serie de TDD.

## Anexo B — Cómo se dividió este TDD

Siguiendo el Anexo B del ejemplo de referencia (`Ejemplo-TDD-Reserva-Vehiculo-KAIROS.md`), el documento único `TDD-KAIROS-Consolidado-Detallado.md` (v1.0, 1813 líneas) se dividió el 31 de agosto de 2026 en:

- **Este documento transversal** — plataforma, IAM, convenciones de dominio compartidas (value objects, tablas de idempotencia/auditoría/outbox/compromisos de vehículo), seguridad técnica, infraestructura, estrategia de pruebas transversal, CI/CD, runbooks, DoD, decisiones técnicas abiertas transversales y criterios de aprobación.
- **6 documentos por proceso** — `TDD-CON-001`, `TDD-RES-001`, `TDD-ALQ-001`, `TDD-DEV-001`, `TDD-REC-001`, `TDD-ADP-001` — cada uno con su modelo de dominio, máquina de estados, modelo físico PostgreSQL, transacciones y concurrencia, contrato HTTP, matriz de validaciones y trazabilidad propios.
- **Una matriz de trazabilidad central** — `TDD-KAIROS-TRACEABILITY.md`, que consolida BDD → SDD → TDD → API/evento → Test de los 6 procesos.

Al dividir se corrigieron 2 hallazgos reales detectados en el documento consolidado:

1. **Reserva ya no describe un "bloqueo provisional" (**`RES-P06.1`**)** — esa propuesta se agregó al BDD el 27 de agosto por la mañana y se retiró esa misma tarde cuando Fiorella confirmó que no existe; el 31 de agosto se reafirmó como parte del cierre de OQ-RES-105. El modelo de estados, la transacción de creación y el contrato HTTP de `TDD-RES-001` quedan alineados con el bloqueo atómico único (pago + documentos a la vez).
2. **Devolución incorpora las decisiones del 31 de agosto** — BR-DEV-006 confirmada (no existe tabla de precio para daño técnico, por diseño, se deriva siempre a informe de Motrix), la nueva regla BR-DEV-011 (cobro de días de paralización), y BR-DEV-008 confirmada (semáforo de riesgo sin rehabilitación).

Verificación de integridad: ninguna decisión técnica, tabla, transacción o criterio del documento consolidado se pierde — cada uno vive en exactamente un documento de esta serie. El archivo único `TDD-KAIROS-Consolidado-Detallado.md` queda archivado como referencia histórica.
