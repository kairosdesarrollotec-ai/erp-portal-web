# Plan Maestro — KAIROS/VeloxRent ERP (estado real al 29-sep-2026)

> Construido cruzando la documentación de negocio (BDD/SDD/TDD/PANTALLAS/MATRIZ) contra lo realmente implementado en código, según `claude/cierre-dia-2026-09-28.md` y el trabajo mergeado el 29-sep. No existía hasta ahora un documento que cruzara ambas cosas — la documentación de diseño (MATRIZ-TRAZABILIDAD-COMPLETA, MAPA-NAVEGACION-COMPLETO) es 100% de diseño UX y no tiene columna de estado de implementación.

## 1. Resumen ejecutivo

El proyecto tiene **documentación de negocio prácticamente completa** para los 6 procesos + Transversal + Soporte (BDD/SDD/TDD/pantallas), pero la **implementación real está muy por detrás** de esa documentación en los procesos núcleo del negocio. Concretamente:

- **Alquiler y Devolución — los dos procesos originales del negocio, con la documentación más detallada de todo el proyecto (máquinas de estado, 9+7 tablas, transacciones críticas) — no tienen ni una línea de código escrita.**
- Lo que sí está construido es, en su mayoría, infraestructura transversal y procesos que resultaron necesarios para alimentar esa infraestructura (Reserva, Flota, Clientes se priorizaron porque el Tablero por rol —TR-06— necesitaba datos reales de algo).
- El orden real de construcción no siguió el orden de negocio documentado (Consulta→Reserva→Alquiler→Devolución→Reclutamiento→ADP). Fue: Reserva/Flota/Clientes → Consulta → Administración del sistema (ADM) y TR-06/07 → refinamiento de Clientes/Flota/Admin/Consultas (29-sep). Alquiler, Devolución, Reclutamiento y Administración de Personal siguen en cero.

## 2. Estado real por módulo

| Módulo | Documentación | Implementación | Pendiente según los propios docs |
|---|---|---|---|
| **Consulta (CON-01..04)** | ✅ Completa, sin preguntas de negocio abiertas | ✅ Construido, integrado con Flota real, refinado 29-sep (fecha mínima, bug cliente vinculado, formulario sin prospecto manual) | Ninguno de negocio |
| **Reserva (RES-01..08)** | ✅ Completa | ✅ Construido (PR#10), es el motor de eventos que alimenta el Tablero | — |
| **Alquiler (ALQ-01..11)** | ✅ Completa (asistente de 5 etapas) | ❌ **Sin empezar** | Todo |
| **Devolución (DEV-01..10)** | ✅ Completa (DEV-05 como hub) | ❌ **Sin empezar** | Todo |
| **Reclutamiento (REC-01..08)** | ✅ Completa | ❌ Sin empezar | Todo |
| **Administración de Personal (ADP-01..10)** | ✅ Completa (TO-BE aspiracional, no AS-IS) | ❌ Sin empezar | Todo |
| **Flota (FLO-01/02)** | ✅ Completa | ✅ Construido + 29-sep: edición, baja (OUT_OF_SERVICE), foto real vía file picker | — |
| **Clientes (CLI-01/02)** | ✅ Completa | ✅ Construido + 29-sep: edición de datos | — |
| **Admin/Soporte (ADM-01..05)** | ✅ Completa | ✅ Las 5 pantallas construidas; 29-sep: selector multi-empresa/sede al agregar usuario | ADM-02 (Roles y permisos) — enforcement real, estado a confirmar |
| **TR-01 a TR-05** (login, activación, MFA, sesión) | ✅ | ✅ Completo | — |
| **TR-06 (Tablero por rol)** | ✅ (7 roles) | ⚠️ Backend+frontend listos, pero solo Front-office tiene datos reales — los otros 6 roles ven vacío porque sus módulos (Alquiler, Devolución, RRHH) no existen | Depende de que se construyan esos módulos |
| **TR-07 (Notificaciones)** | ✅ | ⚠️ Registro interno completo; solo el correo de bienvenida (activación de cuenta) despacha de verdad, vía Resend. No hay despachador general a EMAIL/PUSH/SMS | Despachador general |
| **TR-08 (Sincronización offline)** | ✅ | ❌ Sin empezar (backend y frontend) | Todo |
| **TR-09 (Menú perfil/sesión)** | ✅ | ⚠️ Parcial backend, sin frontend dedicado | Frontend |
| **TR-10 (Control de acceso)** | ✅ | ⚠️ Parcial | — |
| **TR-11 / HU-25 (Menú de 12 módulos)** | ⚠️ Aprobado provisionalmente sin contrato UX previo (excepción documentada) | ✅ Cerrado (PR#20) | Enlace `/modulos` desde el Dashboard |
| **Búsqueda global** | — | ❌ Sin empezar | Todo |
| **Pagos y garantías (PAG-01/02)** | ✅ | ❌ Sin empezar | Todo |
| **Incidencias (INC-01/02)** | ✅ | ❌ Sin empezar | Todo |
| **Reportes (REP-01)** | ✅ | ❌ Sin empezar | Todo |

## 3. Discrepancias importantes a tener en cuenta

1. **La documentación de Alquiler/Devolución "suena" terminada** (9-10/10 en trazabilidad) pero no hay ni una línea de código. Riesgo real de que alguien externo lea solo BDD/SDD/TDD y asuma que el sistema está mucho más avanzado de lo que está.
2. Los planes previos (`Plan_de_Trabajo_Transversal_y_Siguientes.md`, `Plan_Implementacion_Pendientes_2026-09-24.md`) están **obsoletos**: describían una secuencia de merges que ya se ejecutó completa por otra vía, y no cubren Alquiler/Devolución/Reclutamiento/ADP en absoluto.
3. TR-06 documentado como tablero de 7 roles es, en la práctica, un tablero de 1 rol funcional (Front-office) — los otros 6 dependen de módulos que no existen.
4. ADM-02 (Roles y permisos) tiene estado contradictorio entre documentos — vale la pena una verificación puntual antes de asumir que el enforcement de permisos está completo en todos los módulos.

## 4. ¿Ir por features o por Historias de Usuario (HU)?

**Recomendación: por feature/proceso de negocio completo, no por HU aislada.** Motivos:

- Es literalmente el patrón que ya funcionó: Consulta, Reserva, Flota y Clientes se construyeron como módulos completos de punta a punta (dominio + backend + frontend + tests), no como HUs sueltas mezcladas entre módulos. Los 5 tracks paralelos del 29-sep (Clientes, Flota, Admin, Consultas, Header) también se organizaron por feature/módulo, no por HU individual, y funcionó sin conflictos entre agentes.
- Alquiler y Devolución son procesos con máquinas de estado y transacciones que cruzan varias HUs (ALQ-01 a ALQ-11, DEV-01 a DEV-10) — construir una HU aislada (ej. solo "iniciar alquiler" sin "firma de contrato" ni "checklist de entrega") deja el proceso inservible a medio camino. El propio diseño (asistente de 5 etapas para Alquiler, hub de revelado progresivo para Devolución DEV-05) asume que las HUs del mismo proceso se entregan juntas.
- Ir por HU aislada sí tiene sentido dentro de un feature ya en construcción (ej. "edición de cliente" fue una HU específica dentro del feature Clientes ya existente), pero no como estrategia para arrancar procesos nuevos desde cero.

## 5. Plan maestro propuesto (fases)

**Fase 0 — Completado (referencia, no requiere acción):**
Transversal TR-01–05, TR-06 (parcial), TR-07 (parcial), TR-11/HU-25, Consulta, Reserva, Flota, Clientes, Admin/Soporte ADM-01/03/04/05.

**Fase 1 — Alquiler (ALQ-01..11) completo.** Es el proceso núcleo más urgente: sin él, Reserva no tiene continuidad real de negocio (una reserva confirmada no puede convertirse en un alquiler activo). Prioridad máxima.

**Fase 2 — Devolución (DEV-01..10) completo.** Depende funcionalmente de que exista Alquiler (no se puede devolver lo que no se alquiló). Va inmediatamente después.

**Fase 3 — Cierre de huecos Transversal que ya tienen documentación:**
- TR-08 (sincronización offline) — sin empezar, útil sobre todo cuando ya haya operación de campo real (Alquiler/Devolución) que lo necesite.
- TR-07 — despachador general de notificaciones (hoy solo funciona para activación de cuenta).
- ADM-02 — verificar/completar enforcement real de roles y permisos.
- TR-09/10 — completar frontend pendiente.

**Fase 4 — Pagos y garantías, Incidencias, Reportes.** Dependen de que Alquiler/Devolución existan (los pagos y garantías se gestionan durante esos procesos; los incidentes se reportan durante el uso del vehículo; los reportes necesitan datos reales de todo el ciclo).

**Fase 5 — Reclutamiento y Selección + Administración de Personal.** Proceso de RRHH, independiente del ciclo de alquiler — puede correr en paralelo a cualquiera de las fases anteriores si hay capacidad, ya que no tiene dependencias técnicas con Alquiler/Devolución/Pagos. Es la última fase solo porque el core del negocio (rentar y devolver vehículos) tiene más urgencia que RRHH interno.

**Fase 6 — Búsqueda global.** Transversal, de bajo riesgo, se puede insertar en cualquier momento con capacidad libre.

## 6. Próximos pasos inmediatos sugeridos

1. Confirmar con el equipo si Fase 1 (Alquiler) arranca ya — es la decisión de mayor impacto de este plan.
2. Si arranca, repetir el patrón del 29-sep: dividir Alquiler en tracks paralelos por capa/sub-HU que no toquen los mismos archivos (ej. backend dominio+persistencia / frontend asistente de 5 etapas / integración con Flota-Reserva), usando agentes en paralelo como se hizo con Clientes/Flota/Admin/Consultas.
3. Actualizar este documento al cierre de cada sesión de trabajo relevante (mismo criterio que los `cierre-dia-*.md`), para que no vuelva a quedar desactualizado como pasó con los planes de 23/24-sep.
