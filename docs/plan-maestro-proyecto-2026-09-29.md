# Plan Maestro — KAIROS/VeloxRent ERP (estado real al 30-sep-2026)

> Construido cruzando la documentación de negocio (BDD/SDD/TDD/PANTALLAS/MATRIZ) contra lo realmente implementado en código. Versión anterior: 29-sep-2026. Esta actualización incorpora el avance de Alquiler (backend + frontend) y las actualizaciones de infraestructura/seguridad hechas fuera de esta sesión (vía "omniroute" en Terminal).

## 1. Resumen ejecutivo

El proyecto tiene **documentación de negocio prácticamente completa** para los 6 procesos + Transversal + Soporte (BDD/SDD/TDD/pantallas). La implementación sigue por detrás de esa documentación, pero **Alquiler dejó de estar en cero**: hoy se construyó el backend completo del flujo principal más el módulo de ampliaciones, y el frontend del asistente de 5 etapas. Sigue pendiente de merge (bloqueado por un tema de facturación de GitHub Actions, no de código) y tiene gaps conocidos.

- **Devolución, Reclutamiento y Administración de Personal siguen sin una línea de código.**
- **Alquiler pasó de "sin empezar" a "implementado con gaps documentados, pendiente de merge a develop".**
- Entre el 29 y 30-sep, en paralelo a esta sesión, se aplicaron actualizaciones transversales de infraestructura y seguridad (Node 22 LTS, NestJS v10→v12, firebase-admin v12→v14 backend / v10→v12 frontend, vitest v2→v5, vite v5→v8, fix de 2 CVEs en `@grpc/grpc-js`, Dockerfile.dev para desarrollo local con HMR) — ya mergeadas y sincronizadas en `main` de ambos repos.
- El orden real de construcción sigue sin seguir el orden documentado (Consulta→Reserva→Alquiler→Devolución→Reclutamiento→ADP). Orden real: Reserva/Flota/Clientes → Consulta → Administración del sistema (ADM) y TR-06/07 → refinamiento (29-sep) → Alquiler backend+frontend (30-sep, pendiente de merge).

## 2. Estado real por módulo

| Módulo | Documentación | Implementación | Pendiente según los propios docs |
|---|---|---|---|
| **Consulta (CON-01..04)** | ✅ Completa, sin preguntas de negocio abiertas | ✅ Construido, integrado con Flota real, refinado 29-sep | Ninguno de negocio |
| **Reserva (RES-01..08)** | ✅ Completa | ✅ Construido, es el motor de eventos que alimenta el Tablero | — |
| **Alquiler (ALQ-01..11)** | ✅ Completa (asistente de 5 etapas) | ⚠️ **Backend y frontend construidos, en ramas `feature/rental-extensions-api` y `feature/rentals-wizard`, pendientes de merge a develop.** Ver detalle en sección 2.1 | UC-ALQ-006 caso de falta grave (BR-ALQ-013); subida real de evidencia (fotos/videos) en el backend; integración real RENIEC/MTC; catálogo de plantillas de contrato; modo offline de ENTREGA-04 |
| **Devolución (DEV-01..10)** | ✅ Completa (DEV-05 como hub) | ❌ **Sin empezar** | Todo |
| **Reclutamiento (REC-01..08)** | ✅ Completa | ❌ Sin empezar | Todo |
| **Administración de Personal (ADP-01..10)** | ✅ Completa (TO-BE aspiracional, no AS-IS) | ❌ Sin empezar | Todo |
| **Flota (FLO-01/02)** | ✅ Completa | ✅ Construido + edición, baja (OUT_OF_SERVICE), foto real vía file picker, manejo tipado de `GcsUploadError` | Rama `feat/fleet-gcs-photo-upload` (subida a GCS con URL firmada) aún sin mergear en ninguno de los 2 repos |
| **Clientes (CLI-01/02)** | ✅ Completa | ✅ Construido + edición de datos | — |
| **Admin/Soporte (ADM-01..05)** | ✅ Completa | ✅ Las 5 pantallas construidas; selector multi-empresa/sede al agregar usuario | ADM-02 (Roles y permisos) — enforcement real, estado a confirmar |
| **TR-01 a TR-05** (login, activación, MFA, sesión) | ✅ | ✅ Completo | — |
| **TR-06 (Tablero por rol)** | ✅ (7 roles) | ⚠️ Backend+frontend listos, pero solo Front-office tiene datos reales — los otros roles dependen de módulos que no existen (Devolución, RRHH) o que están pendientes de merge (Alquiler) | Depende de que se mergeen/construyan esos módulos |
| **TR-07 (Notificaciones)** | ✅ | ⚠️ Registro interno completo; solo el correo de bienvenida despacha de verdad, vía Resend | Despachador general |
| **TR-08 (Sincronización offline)** | ✅ | ❌ Sin empezar (backend y frontend) | Todo — nota: ENTREGA-04 de Alquiler necesita exactamente esto y hoy quedó online-only |
| **TR-09 (Menú perfil/sesión)** | ✅ | ⚠️ Parcial backend, sin frontend dedicado | Frontend |
| **TR-10 (Control de acceso)** | ✅ | ⚠️ Parcial | — |
| **TR-11 / HU-25 (Menú de 12 módulos)** | ⚠️ Aprobado provisionalmente | ✅ Cerrado | Enlace `/modulos` desde el Dashboard |
| **Búsqueda global** | — | ❌ Sin empezar | Todo |
| **Pagos y garantías (PAG-01/02)** | ✅ | ❌ Sin empezar (aunque Alquiler ya registra pago/garantía dentro de su propio flujo — `formalize-contract`, `deposits` — no existe un módulo de Pagos independiente) | Todo |
| **Incidencias (INC-01/02)** | ✅ | ❌ Sin empezar | Todo |
| **Reportes (REP-01)** | ✅ | ❌ Sin empezar | Todo |

### 2.1 Detalle — Alquiler (avance 30-sep-2026)

**Backend** (`feature/rental-extensions-api`, sobre `apps/api/src/modules/rentals/`):
- Flujo principal completo y testeado (UC-ALQ-001 a UC-ALQ-005): crear, crear desde reserva, listar, obtener, validar documentos, registrar alcoholímetro, evaluar notaría + aprobar excepción, formalizar contrato, completar entrega.
- UC-ALQ-006 (Ampliaciones) parcialmente implementado: `request-extension`, `authorize-extension`, `reject-extension`, con RBAC (autorizar/rechazar restringido a Gerencia). **Falta**: el caso de falta grave (BR-ALQ-013 — cliente no cumple los 4 requisitos, debe retener toda la garantía + evaluar proceso penal + marcar cliente "rojo").
- 114/114 tests unitarios pasan, `tsc --noEmit` limpio. No se pudo verificar la migración contra Postgres real desde el entorno de desarrollo remoto — pendiente confirmar con `npx prisma migrate status`.
- **Pendiente de merge**: el PR está creado pero los 4 checks de CI no llegaron a correr — es un bloqueo de facturación de GitHub Actions a nivel de organización (`kairosdesarrollotec-ai`), no un problema de código. Requiere revisar Billing & plans de la organización.

**Frontend** (`feature/rentals-wizard`, en `apps/web/src/app/rentals/`):
- ALQ-01 (bandeja de alquileres), ALQ-02 (inicio/conversión desde Consulta o Reserva), y el asistente completo ENTREGA-01 a ENTREGA-05 según `PANTALLAS-V3-B-ALQUILER.md`.
- ENTREGA-04 (checklist de 35 fotos + 3 videos) quedó **online-only**: el backend actual (`complete-delivery`) solo acepta contadores, no subida de archivos ni guardado parcial — no hay endpoint de evidencia real todavía. El modo offline/sync documentado en TR-08 no se pudo implementar sobre un backend que no lo soporta.
- RENIEC/MTC en ENTREGA-02 están simulados en UI (no hay integración real en el backend de rentals).
- 8/8 tests pasan, `tsc --noEmit` y eslint limpios.
- **Pendiente de merge**: mismo bloqueo de CI que el backend.

## 3. Discrepancias importantes a tener en cuenta

1. La documentación de Devolución/Reclutamiento/ADP "suena" terminada pero no hay código — riesgo de que alguien externo asuma que el sistema está más avanzado de lo que está.
2. TR-06 documentado como tablero de 7 roles sigue siendo, en la práctica, un tablero de 1 rol funcional (Front-office) hasta que Alquiler se mergee y Devolución exista.
3. ADM-02 (Roles y permisos) sigue con estado contradictorio entre documentos — pendiente de verificación puntual.
4. Hay 3 ramas de trabajo sin mergear que representan avance real ya hecho, no solo planeado: `feature/rental-extensions-api`, `feature/rentals-wizard` (backend/frontend de Alquiler, bloqueadas por CI/billing) y `feat/fleet-gcs-photo-upload` (mejora de subida de fotos a GCS, sin bloqueo técnico conocido, solo pendiente de decidir el flujo de PR).
5. TR-08 (sincronización offline) ya no es solo "documentado pero sin empezar" en abstracto — es un bloqueador concreto para que ENTREGA-04 de Alquiler funcione completo en campo.

## 4. ¿Ir por features o por Historias de Usuario (HU)?

**Recomendación sin cambios: por feature/proceso de negocio completo, no por HU aislada.** El patrón se confirmó de nuevo hoy: Alquiler se construyó como dos tracks paralelos (backend completo / frontend completo) coordinados por módulo, no por HU suelta, igual que Clientes/Flota/Admin/Consultas el día anterior.

## 5. Plan maestro propuesto (fases) — actualizado

**Fase 0 — Completado:** Transversal TR-01–05, TR-06 (parcial), TR-07 (parcial), TR-11/HU-25, Consulta, Reserva, Flota, Clientes, Admin/Soporte.

**Fase 1 — Alquiler (ALQ-01..11).** ⚠️ **En curso, no completa.** Backend y frontend construidos, pendientes de merge (bloqueo de CI/billing) y con gaps: falta grave de ampliación (BR-ALQ-013), evidencia real en checklist de entrega (requiere endpoint de subida + más adelante TR-08 offline), integración RENIEC/MTC real, catálogo de plantillas de contrato.

**Fase 2 — Devolución (DEV-01..10) completo.** Depende funcionalmente de que Alquiler esté mergeado y en uso real.

**Fase 3 — Cierre de huecos Transversal:**
- TR-08 (sincronización offline) — ahora con una necesidad concreta que lo justifica (ENTREGA-04 de Alquiler).
- TR-07 — despachador general de notificaciones.
- ADM-02 — verificar/completar enforcement real de roles y permisos.
- TR-09/10 — completar frontend pendiente.
- Endpoint de subida de evidencia (fotos/videos) para Alquiler y, más adelante, Devolución — prerrequisito técnico compartido por ambos procesos.

**Fase 4 — Pagos y garantías, Incidencias, Reportes.**

**Fase 5 — Reclutamiento y Selección + Administración de Personal.**

**Fase 6 — Búsqueda global.**

## 6. Próximos pasos inmediatos sugeridos

1. Resolver el bloqueo de facturación de GitHub Actions en la organización — sin esto, ningún PR nuevo puede pasar CI, no solo los de Alquiler.
2. Una vez resuelto, mergear `feature/rental-extensions-api` y `feature/rentals-wizard` a `develop`, probar el flujo integrado end-to-end en navegador (no se probó contra backend real todavía, solo con tests unitarios/mock).
3. Decidir sobre `feat/fleet-gcs-photo-upload`: mergear por el flujo normal (PR a develop) o evaluar si ya quedó obsoleta frente a otro trabajo de Fleet.
4. Cerrar los gaps documentados de Alquiler antes de darlo por "completo": falta grave de ampliación, evidencia real, RENIEC/MTC, plantillas de contrato.
5. Empezar Fase 2 (Devolución) una vez Alquiler esté mergeado y estable.
6. Seguir actualizando este documento al cierre de cada sesión relevante.
