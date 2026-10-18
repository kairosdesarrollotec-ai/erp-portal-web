# Especificación UX/UI v3\.1 para Prototipado del ERP KAIROS

```markdown
# Especificación UX/UI — ERP KAIROS/VeloxRent

## Documentación Maestra para Prototipado Integral

**Versión:** 3.1  
**Fecha:** 10 de septiembre de 2026  
**Estado:** APROBADO — versión base (usuario, 18 oct 2026; cambios posteriores se gestionan como mejoras documentadas)
**Sponsor:** Fiorella  
**Tech Lead:** Eder Ramos  
**Plataforma:** React SPA/PWA con TypeScript, Vite y React Router; sin Next.js  
**Baseline funcional:** BDD-KAIROS-TRANSVERSAL v1.18 y BDD de Consulta, Reserva, Alquiler, Devolución, Reclutamiento y Administración de Personal  
**Baseline de solución:** SDD-KAIROS-TRANSVERSAL v3.5 y SDD de los seis procesos  
**Validación técnica:** TDD Transversal y TDD de los seis procesos

> Esta versión reemplaza funcionalmente las especificaciones UX/UI v1.0 y v2.0 como fuente para prototipado. El BDD continúa siendo la fuente de verdad del negocio; el SDD define el comportamiento de la solución; el TDD define restricciones y verificabilidad técnica. Si aparece una contradicción, se corrige primero la fuente correspondiente y luego se actualiza esta especificación.

---

# 1. Objetivo y alcance

Esta especificación permite diseñar en Figma y validar un prototipo navegable completo del MVP KAIROS. Cubre la experiencia desde el inicio de sesión hasta el cierre de cada expediente, incluyendo roles, empresas, estados, errores, autorizaciones, evidencia, offline, sincronización, accesibilidad y trazabilidad.

## 1.1 Procesos incluidos

1. Consulta.
2. Reserva.
3. Alquiler.
4. Devolución.
5. Reclutamiento y Selección.
6. Administración de Personal.
7. Capacidades transversales necesarias: autenticación, clientes, flota, pagos, garantías, incidencias, reportes y administración.

## 1.2 Exclusiones

- Evaluación formal de desempeño: fuera del MVP; objetivo posterior.
- Capacitación formal completa: fuera del MVP; se registra únicamente la capacitación interna existente.
- Confirmaciones transaccionales offline.
- Integración estructurada con Motrix: se registra referencia e informe manual.
- Firma digital contractual definitiva: se conserva el mecanismo vigente de firma/huella y evidencia hasta decisión legal.
- Catálogo público de disponibilidad para clientes no autenticados: no aprobado; el MVP es operado por usuarios internos.
- Cuarto nivel automático de autorización de salidas a campo.
- Bloqueo provisional de vehículos en Reserva.

## 1.3 Correcciones incorporadas respecto de v1.0

- Se corrige la referencia heredada a Next.js: el frontend será React SPA/PWA con Vite y React Router, de acuerdo con SDD v3.6 y TDD v3.4.
- Se actualizan los baselines BDD v1.18 y SDD v3.5.
- Se utilizan los estados `FAVORABLE` y `DESFAVORABLE` para alcolímetro; la UI explica su significado.
- Un alcolímetro desfavorable en entrega bloquea/cancela la entrega; no marca automáticamente al cliente en Rojo.
- En devolución, un resultado desfavorable deriva a custodia preventiva y Gerencia; el marcado Rojo se resuelve según BR-DEV-005.
- El no-show no expira automáticamente: requiere protocolo de contacto y decisión humana de Gerencia.
- Una Reserva incompleta es `BORRADOR/NO CONFIRMADA`, nunca “Reserva no iniciada”.
- La cascada de salida a campo no se reutiliza automáticamente para toda excepción notarial.
- Offline se habilita por formulario y permiso, no por una persona única.
- No se usa `localStorage` para datos sensibles. Los dos formularios offline utilizan almacenamiento cifrado y aislado.
- La duración de cada video es una referencia operativa de aproximadamente 7–8 minutos, no un rango técnico bloqueante.

## 1.4 Mejoras incorporadas en v3.0

- Presupuestos medibles de interacción para evitar pasos y clics sin valor.
- Herencia obligatoria de contexto entre Consulta, Reserva, Alquiler y Devolución.
- Revelado progresivo de excepciones, daños y autorizaciones.
- Acciones rápidas por rol, continuación de borradores y siguiente acción recomendada.
- Búsqueda global segura por cliente, placa y número de expediente.
- Pruebas de usabilidad con métricas de éxito, tiempo, errores, ayuda y satisfacción.
- Tokens completos de color, tipografía, espaciado, radios, sombras, capas y movimiento.
- Anatomía, jerarquía, tamaños, estados y comportamiento responsive de componentes.
- Reglas detalladas para tablas, formularios, iconografía, formatos y estados sensibles.
- Gate independiente para aprobar UX, UI, accesibilidad y handoff técnico.

Estas mejoras simplifican la operación sin eliminar controles legales, financieros, de seguridad, evidencia, MFA o auditoría exigidos por BDD/SDD/TDD.

## 1.5 Stack de implementación frontend formalizado en v3.1

| Capacidad | Tecnología | Responsabilidad UX/UI |
|---|---|---|
| Build SPA/PWA | Vite | Inicio rápido, bundles y assets para Firebase Hosting |
| Navegación | React Router | Rutas, layouts, breadcrumbs, guards de experiencia y retorno seguro |
| Estado remoto | TanStack Query | Loading, error, cache, reintento e invalidación de API |
| Estado cliente | Zustand | Shell y preferencias; no formularios ni duplicado de API |
| Formularios | React Hook Form + Zod | Dirty state, validación, stepper y errores accesibles |
| Contratos | Cliente/tipos generados desde OpenAPI | Evitar campos/endpoints inventados |
| PWA | vite-plugin-pwa + Workbox | App shell y estrategia controlada de cache |
| Offline | Dexie/IndexedDB | Solo ALQ-09 y DEV-04, cifrado y aislado |
| Primitivas UI | Radix UI Primitives | Interacción accesible; apariencia gobernada por este documento |
| Estilos | CSS Modules + CSS Custom Properties | Encapsulación y design tokens |
| Utilidades | Lucide React, date-fns y TanStack Table | Iconos, fechas y tablas consistentes |
| Pruebas | Vitest, Testing Library, user-event, MSW, Playwright y axe | Componentes, flujos, contrato simulado y accesibilidad |
| Observabilidad | Sentry | Errores y rendimiento sin PII |

Las librerías son decisiones de implementación subordinadas a la experiencia aquí definida: no pueden agregar pasos, cambiar lenguaje, omitir estados ni ampliar el alcance offline. Sus versiones exactas se fijan en el lockfile del proyecto y una sustitución requiere ADR.

---

# 2. Actores, roles y contexto multiempresa

## 2.1 Personas de diseño

| Persona | Roles relacionados | Dispositivo dominante | Objetivo |
|---|---|---|---|
| Front-office | Ejecutivo, personal administrativo, Reservation Agent | Desktop/tablet | Atender Consulta, Reserva, Alquiler y Devolución con rapidez y trazabilidad |
| Campo | Operador, mecánico, Fleet Operator | Móvil/tablet | Capturar checklists y evidencia, incluso sin señal |
| Gerencia/autorización | Fiorella, José Pariona, Cecilia, Operations Manager | Móvil/desktop | Resolver excepciones, riesgo, contratación y salidas a campo |
| Finanzas | Cajero, responsable financiero, Finance Approver | Desktop | Validar pagos, garantías, devoluciones y cargos |
| Talento Humano | HR Manager, Recruiter | Desktop | Gestionar candidatos, personal, asistencia, vacaciones y salidas |
| Administración | Company Administrator, Platform Administrator | Desktop | Configurar usuarios, roles, empresa, sede, catálogos y parámetros |
| Auditoría/consulta | Corporate Auditor, Read Only | Desktop | Revisar información y auditoría sin modificarla |
| Cliente/prospecto | Sin cuenta persistente en el MVP | Móvil/presencial asistido | Entregar datos, revisar alternativas y aceptar condiciones |

## 2.2 Reglas de acceso

- Denegación por defecto.
- Todo permiso se evalúa con rol + empresa + sede + vigencia de asignación.
- Un usuario nunca elige libremente `company_id` desde el formulario; el sistema deriva el alcance desde su sesión.
- La identidad Cliente, Candidato y Empleado nunca se fusiona.
- El Cliente puede ser compartido como identidad entre las cuatro empresas; su historial conserva empresa de origen y visibilidad autorizada.
- Las operaciones críticas requieren MFA reciente, como máximo cinco minutos antes.
- MFA es obligatorio para todos los usuarios internos.
- Sesión absoluta: 8 horas.
- Inactividad: 30 minutos; roles privilegiados: 15 minutos.

## 2.3 Matriz resumida de permisos

| Acción | Front-office | Campo | Gerencia | Finanzas | RR. HH. | Admin | Auditor |
|---|---:|---:|---:|---:|---:|---:|---:|
| Registrar Consulta/Reserva/Alquiler/Devolución | Sí | Colabora en checklist | Supervisa | Pago/garantía | No | Configura | Lectura |
| Capturar checklist offline | Con permiso | Sí | No | No | No | No | Lectura posterior |
| Confirmar Reserva/entrega | Sí, en línea | No por sí solo | Excepción cuando aplique | Valida pago | No | No | No |
| Resolver excepción notarial | Solicita | No | Según política de excepción | No | No | No | Lectura |
| Clasificar daño/riesgo | Registra evidencia | Registra hallazgo | Decide según regla | Impacto financiero | No | No | Lectura |
| Gestionar candidato | No | No | Fiorella decide | No | Sí | No | Lectura |
| Autorizar salida a campo | Solicita/consulta | Solicita | Niveles 1–3 | No | Administra | No | Lectura |
| Configurar roles/catálogos | No | No | No | No | No | Sí | No |

---

# 3. Arquitectura de información

## 3.1 Navegación principal por rol

| Módulo | Front-office | Campo | Gerencia | Finanzas | RR. HH. | Admin | Auditor |
|---|---:|---:|---:|---:|---:|---:|---:|
| Inicio | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Consultas | Sí | No | Lectura | No | No | Config. | Lectura |
| Reservas | Sí | No | Excepciones | Pagos | No | Config. | Lectura |
| Alquileres | Sí | Checklist | Excepciones | Pagos | No | Config. | Lectura |
| Devoluciones | Sí | Checklist | Decisiones | Garantías | No | Config. | Lectura |
| Flota | Lectura | Sí | Lectura | No | No | Sí | Lectura |
| Clientes | Sí | Lectura limitada | Riesgo | Lectura financiera | No | Config. | Lectura |
| Pagos/garantías | Registro | No | Lectura/aprueba | Sí | No | Config. | Lectura |
| Incidencias | Sí | Registra | Resuelve | Impacto | No | Config. | Lectura |
| Personal | No | No | Autoriza/decide | No | Sí | Config. | Lectura |
| Reportes | Según permiso | No | Sí | Sí | Sí | Sí | Sí |
| Administración | No | No | No | No | No | Sí | Lectura limitada |

## 3.2 Shell global

Todas las pantallas autenticadas incluyen:

- Selector de empresa/sede si existe más de una asignación.
- Navegación por módulos según permisos.
- Breadcrumb y título único.
- Búsqueda contextual por módulo y búsqueda global segura.
- Centro de notificaciones.
- Indicador de conexión.
- Indicador de elementos pendientes de sincronización.
- Perfil, expiración de sesión y cierre de sesión.
- Ayuda contextual.
- Identificador de correlación visible solo en errores para soporte.

### Búsqueda global segura

Permitirá buscar por nombre, documento enmascarado, placa y número de Consulta, Reserva, Alquiler o Incidente. Los resultados:

- Respetan rol, empresa, sede y permisos; nunca revelan la existencia de datos no autorizados.
- Se agrupan por tipo y muestran estado, empresa/sede permitida y acción contextual.
- Permiten abrir o continuar el expediente en una sola acción.
- Admiten teclado, historial local no sensible y estado sin resultados.
- No incluyen documentos personales completos en URL, telemetría ni sugerencias.

## 3.3 Conteo maestro

La v3 mantiene **75 pantallas lógicas**. Los estados responsive, loading, error, permisos, confirmaciones, modales y optimizaciones inline son variantes adicionales y no aumentan este conteo.

| Grupo | Cantidad |
|---|---:|
| Transversal y autenticación | 10 |
| Consulta | 4 |
| Reserva | 8 |
| Alquiler | 11 |
| Devolución | 10 |
| Reclutamiento y Selección | 8 |
| Administración de Personal | 10 |
| Módulos de soporte | 14 |
| **Total** | **75** |

---

# 4. Contrato obligatorio de toda pantalla

Cada frame de Figma y cada historia de frontend debe documentar:

1. ID y nombre.
2. Objetivo del usuario.
3. Roles autorizados y alcance empresa/sede.
4. Punto de entrada y salida.
5. Datos mostrados y fuente.
6. Campos, obligatoriedad, formato y sensibilidad.
7. Acciones primarias, secundarias y destructivas.
8. Reglas BDD y casos SDD relacionados.
9. Estados de carga, vacío, datos, error, offline, sin permiso y conflicto.
10. Confirmaciones y consecuencias.
11. Eventos auditables.
12. Comportamiento desktop, tablet y móvil.
13. Reglas de teclado, foco y lector de pantalla.
14. Criterios de aceptación.
15. Datos heredados, datos que deben persistir y campos que nunca deben solicitarse nuevamente.
16. Presupuesto de interacción y acción siguiente recomendada.
17. Condiciones de revelado progresivo.
18. Eventos de analítica UX sin datos personales sensibles.

## 4.1 Estados universales

- `INITIAL`.
- `LOADING` con skeleton contextual.
- `EMPTY` con explicación y CTA autorizada.
- `READY`.
- `DIRTY` con cambios no guardados.
- `VALIDATING`.
- `SAVING`.
- `SUCCESS`.
- `RECOVERABLE_ERROR` con reintento.
- `BLOCKING_ERROR` con siguiente acción.
- `FORBIDDEN`.
- `SESSION_EXPIRED`.
- `STALE_VERSION`.
- `EXTERNAL_DEPENDENCY_PENDING`.
- `OFFLINE_READ_ONLY`.
- `LOCAL_DRAFT` solo en los dos checklists autorizados.
- `SYNCING`, `SYNC_CONFLICT`, `SYNCED`.

## 4.2 Reglas de interacción

- No ocultar una acción no disponible: mostrarla deshabilitada con explicación cuando ayude a comprender el flujo.
- Una acción irreversible siempre muestra resumen, consecuencia, actor y botón final explícito.
- No usar “Guardar” si la acción realmente confirma, cancela, autoriza, libera o cobra.
- Evitar doble envío; mostrar progreso y resultado idempotente.
- Nunca mostrar disponibilidad obsoleta como vigente.
- Los errores deben indicar qué pasó, qué se conservó y qué puede hacer el usuario.
- Existirá un solo CTA primario por región o etapa; las acciones secundarias no competirán visualmente con él.
- El sistema conservará empresa, sede, cliente, vehículo, periodo y modalidad cuando ya pertenezcan al contexto válido.
- Consulta → Reserva → Alquiler → Devolución heredará datos compatibles sin digitación o selección repetida.
- Una decisión simple se resolverá inline, en panel o modal; no generará una pantalla nueva salvo consecuencia legal, financiera, de seguridad o auditoría.
- Después de una operación completada se mostrará la siguiente acción recomendada y una salida segura al dashboard o expediente.
- Las acciones frecuentes estarán disponibles desde dashboard, bandeja o fila, sin exigir abrir primero una vista informativa.
- Los filtros y orden de una bandeja se conservarán durante la sesión y al regresar del detalle.
- Formularios extensos usarán guardado automático en servidor cuando sea permitido; los dos checklists offline usarán borrador local cifrado.
- El autoguardado mostrará `Guardando`, `Guardado` o `Error al guardar` sin interrumpir la tarea.

## 4.3 Presupuesto de interacción

Se contabilizan acciones intencionales sobre controles; no se penalizan capturas de evidencia, firma, MFA, aceptación legal ni confirmaciones irreversibles obligatorias.

| Tarea | Objetivo máximo |
|---|---:|
| Abrir tarea o alerta prioritaria desde Inicio | 1 acción |
| Iniciar nueva Consulta desde Inicio | 1 acción |
| Encontrar una operación existente | 3 acciones |
| Continuar un borrador | 1 acción |
| Reservar un vehículo ya seleccionado | 4 acciones principales |
| Convertir Reserva en Alquiler | 2 acciones antes del formulario heredado |
| Iniciar Devolución desde alquiler activo | 1 acción |
| Aprobar o rechazar una excepción | 2 acciones, más MFA si aplica |
| Volver al dashboard | 1 acción |

Si un diseño supera el objetivo, debe justificar cada paso por regla BDD, seguridad, decisión material o prevención de error. UX debe aprobar la excepción.

## 4.4 Revelado progresivo y rutas condicionales

- Sin daño: ocultar clasificación, informe técnico, paralización e incidente.
- Daño estético: mostrar valoración estética y evidencia relacionada.
- Daño técnico: habilitar derivación y referencia manual a Motrix.
- Paralización: mostrar tiempo, respuesta del cliente y efectos permitidos por BR-DEV-011.
- Sin excepción notarial: ocultar campos y acciones de excepción.
- RENIEC disponible: ocultar solicitud manual; RENIEC no disponible: ofrecer la excepción autorizada.
- MTC no disponible: mostrar bloqueo sin ofrecer excepción.
- Online y sin pendientes: ocultar controles técnicos de sincronización.
- Usuario sin facultad de aprobación: mostrar `Solicitar autorización`, nunca controles de aprobar/rechazar.
- Las ayudas avanzadas se muestran bajo demanda; instrucciones críticas permanecen visibles.

## 4.5 Dashboard y acciones rápidas por rol

El dashboard prioriza trabajo, no solo métricas. Debe mostrar, según permiso:

- Tareas pendientes y vencimientos relevantes.
- Alertas críticas y excepciones que requieren decisión.
- Borradores recientes con `Continuar`.
- Acciones frecuentes por rol.
- Procesos incompletos y elementos pendientes de sincronización.
- Última actividad y acceso al expediente, sin exponer datos sensibles.

La primera vista debe responder: **qué debo atender, por qué, con qué prioridad y qué acción corresponde**.

## 4.6 Flujos optimizados obligatorios

- Consulta disponible: `Consulta → Seleccionar vehículo → Reservar este vehículo → Revisar/confirmar`.
- Reserva confirmada: ofrecer `Continuar con alquiler` cuando la regla y el momento lo permitan.
- Entrega: stepper de Cliente/documentos → Validaciones → Garantía/contrato → Checklist/evidencia → Confirmación.
- Devolución: Identificación → Alcolímetro → Checklist/evidencia → Resultado; daños, incidente y garantía aparecen según resultado.
- La navegación permite volver a una etapa editable sin perder datos y explica qué etapas ya no pueden modificarse.

## 4.7 Acciones que no deben eliminarse para reducir clics

Nunca se omiten MFA, firma/huella, evidencia obligatoria, aceptación de responsabilidad, validación externa, confirmación irreversible, autorización de excepción, registro de daño ni control financiero exigido. La eficiencia elimina repetición y navegación vacía; no reduce control del negocio.

---

# 5. Inventario detallado de pantallas

## 5.1 Transversal y autenticación — 10 pantallas

| ID | Pantalla | Rol/entrada | Contenido y acción primaria | Estados/validaciones | Trazabilidad |
|---|---|---|---|---|---|
| TR-01 | Inicio de sesión | Usuario no autenticado | Correo/usuario, contraseña, “Ingresar”, recuperación | Credenciales inválidas, cuenta bloqueada, proveedor no disponible | TDD-TRANS 8.4 |
| TR-02 | Activación inicial y MFA | Primer acceso | Cambio de contraseña si aplica, enrolamiento MFA, códigos de recuperación | Código inválido, expirado, reintentos, ayuda accesible | NFR-SEC-001; TD-008 |
| TR-03 | Desafío MFA | Login u operación crítica | Código MFA y confirmación | MFA reciente <=5 min; opción de reintento seguro | TDD-TRANS 8.4 |
| TR-04 | Recuperación de acceso | Desde TR-01 | Solicitar enlace, confirmar nueva contraseña | Respuesta neutra para evitar enumeración de cuentas | Seguridad transversal |
| TR-05 | Selección de empresa/sede | Usuario con varias asignaciones | Lista autorizada, contexto actual, continuar | No permite valores fuera del token/asignación | BR-ORG-002; NFR-SEC-001 |
| TR-06 | Dashboard por rol | Después del login | Pendientes, alertas, accesos frecuentes, métricas permitidas | Widgets por rol; sin datos; dependencia caída | SDD-TRANS 18.2 |
| TR-07 | Centro de notificaciones | Shell global | Filtros, leídas/no leídas, abrir expediente | Notificación vencida, duplicada, escalada | BDD notificaciones; outbox |
| TR-08 | Centro de sincronización | Shell; usuarios con checklist | Pendientes, progreso, conflictos, reintento | LOCAL_DRAFT/SYNCING/CONFLICT/SYNCED | SDD-TRANS 17 |
| TR-09 | Sesión, perfil y cierre | Menú de usuario | Datos mínimos, contexto, expiración, logout | Limpia claves y borradores locales autorizados | Sesión TDD-TRANS |
| TR-10 | Acceso denegado/sesión expirada | Guardia de ruta/API | Motivo no sensible, volver, reautenticar | Conserva solo borrador permitido; no filtra datos | NFR-SEC-001 |

## 5.2 Consulta — 4 pantallas

| ID | Pantalla | Propósito y UI | Acciones/transiciones | Estados y reglas | Trazabilidad |
|---|---|---|---|---|---|
| CON-01 | Bandeja de Consultas | Buscar por cliente/canal/estado/fecha/empresa; tabla responsive | Nueva, abrir, continuar | Loading, vacío, filtros, error, sin permiso | CON-P01–P09 |
| CON-02 | Nueva Consulta | Canal, cliente, uso, nacionalidad, destino, periodo, personas, requisitos | Guardar borrador servidor; mostrar vehículo; cerrar | Todo cliente pasa por Consulta; ruta mixta advierte, no bloquea | BR-CON-001/003/004/005 |
| CON-03 | Exhibición y cotización | Vehículos elegibles; presencial o evidencia virtual; tarifa vigente | Seleccionar, enviar evidencia, volver | Disponibilidad de solo lectura; no bloquea vehículo | CON-P06/P07; UC-CON-002 |
| CON-04 | Detalle, cierre o conversión | Timeline, datos, motivo, decisión | Convertir a Reserva, convertir a Alquiler, cerrar sin conversión | Motivo obligatorio si cierra; recurrente no omite Consulta | BR-CON-002/003; UC-CON-003 |

### Flujo Consulta

`TR-06 → CON-01 → CON-02 → CON-03 → CON-04 → RES-02 / ALQ-02 / CERRADA`

## 5.3 Reserva — 8 pantallas

| ID | Pantalla | Propósito y UI | Acciones/transiciones | Estados y reglas | Trazabilidad |
|---|---|---|---|---|---|
| RES-01 | Bandeja de Reservas | Estados, fechas, vehículo, cliente, empresa; filtros | Nueva, abrir, resolver pendiente | No mostrar “expirada” automática | RES-P01–P16 |
| RES-02 | Crear Reserva y modalidad | Hereda Consulta; ubicación y posibilidad de acercarse | Presencial/remota; continuar | Ayacucho + no puede ir = remota | BR-RES-005 |
| RES-03 | Selección/confirmación de vehículo | Disponibilidad por destino y periodo; video 360° remota | Elegir o solicitar alternativa | Selección no bloquea vehículo | RES-P04–P07 |
| RES-04 | Requisitos de confirmación | Voucher, contrato, políticas, responsabilidad; aceptación remota | Registrar cada requisito; confirmar al completar | Borrador no confirmado; sin bloqueo parcial | BR-RES-001/006/009 |
| RES-05 | Detalle de Reserva confirmada | Resumen, estado, timeline, evidencia, monto | Convertir, iniciar no-show, venta, cancelar por cambio | Fecha/hora/vehículo inmutables | BR-RES-003; UC-RES-003 |
| RES-06 | Conflicto y alternativas | Vehículo perdido por competencia; alternativas equivalentes | Elegir alternativa o solicitar reembolso | Primero alternativas; reembolso inmediato si rechaza | EX-RES-005 |
| RES-07 | Venta de vehículo reservado | Motivo de venta, alternativa, evidencia enviada | Aceptar alternativa o cancelar/reembolsar | Decisión auditada por Gerencia | BR-RES-007 |
| RES-08 | Protocolo de no-show y conversión | Llamada 1 día antes, mensaje, llamada 2h antes; decisión | Confirmar presencia; convertir; Gerencia cancela | Nunca job/expiración automática; S/300 pasa a garantía | BR-RES-002/003; EX-RES-004 |

### Flujo Reserva

`CON-04 → RES-02 → RES-03 → RES-04 → validación atómica → RES-05 → RES-08 → ALQ-02`

Excepciones:

- Conflicto: `RES-04 → RES-06`.
- Venta: `RES-05 → RES-07`.
- Cambio solicitado: `RES-05 → confirmación reforzada → CANCELADA con pérdida`.
- No-show: `RES-05 → RES-08 → decisión humana`.

## 5.4 Alquiler — 11 pantallas

| ID | Pantalla | Propósito y UI | Acciones/transiciones | Estados y reglas | Trazabilidad |
|---|---|---|---|---|---|
| ALQ-01 | Bandeja de Alquileres | Borrador, validación, notaría, entrega, activo, devolución | Nuevo, abrir, filtrar | Por empresa/sede y permiso | ALQ-P01–P15 |
| ALQ-02 | Inicio/Conversión desde Consulta o Reserva | Cliente, vehículo, periodo, saldo de garantía | Crear/continuar expediente | Reserva aporta S/300 íntegros a garantía | BR-RES-002; ALQ-P01 |
| ALQ-03 | Documentos y conductor | Requisitos por nacionalidad; titular, acompañante, persona jurídica | Validar, corregir, continuar | Licencia obligatoria; pasaporte o CE alternativos | BR-CON-004; BR-ALQ-015 |
| ALQ-04 | Validaciones RENIEC/MTC | Estado individual de cada consulta externa | Reintentar; solicitar excepción RENIEC | MTC caído bloquea; RENIEC admite excepción de Gerencia | BR-ALQ-016 |
| ALQ-05 | Alcolímetro de entrega | Resultado `FAVORABLE/DESFAVORABLE`, hora y evidencia | Continuar o cancelar entrega | Negativa a prueba = DESFAVORABLE; no marca Rojo automáticamente | BR-ALQ-005 |
| ALQ-06 | Evaluación de notaría | Vehículo, cliente antiguo, biométrico, hora, garantía | Aplicar obligatoria, doble garantía, tercera vía o revisión | Hilux/Colorado/Verna/Yaris siempre notaría | BR-ALQ-001–004/009 |
| ALQ-07 | Solicitud/resolución de excepción | Motivo, evidencia, autorizador permitido | Aprobar/rechazar | Política propia; no asumir cascada ADP | BR-ALQ-014/016 |
| ALQ-08 | Contrato, políticas, pago y garantía | Plantilla vigente, lectura grabada, firma/huella, pago | Validar y formalizar | Empresa paga notaría; pago por agente exige verificación | BR-DOC-002/003; BR-ALQ-002/011 |
| ALQ-09 | Checklist de entrega offline | FIV/FCKE, 35 fotos, 3 videos, temporizador, progreso | Guardar local cifrado, sincronizar, finalizar | 30 min técnico + 15 documental; video 7–8 min referencial | BR-INS-001–006 |
| ALQ-10 | Detalle de alquiler activo | Contrato, periodo, GPS, conductor, incidencias, garantía | Registrar incidencia, iniciar ampliación/devolución | Vehículo nuevo requiere GPS activo | BR-ALQ-006–010 |
| ALQ-11 | Ampliación | Aviso, autorización, pago, adenda, días/horas | Aprobar/completar o registrar incumplimiento | 12h antes; máximo 3 días o 1 por horas; cuatro requisitos | BR-ALQ-012/013 |

### Flujo Alquiler

`CON-04/RES-08 → ALQ-02 → ALQ-03 → ALQ-04 → ALQ-05 → ALQ-06 → ALQ-07 si aplica → ALQ-08 → ALQ-09 → ALQ-10`

Ampliación: `ALQ-10 → ALQ-11 → ALQ-10` o `ALQ-11 → incumplimiento grave`.

## 5.5 Devolución — 10 pantallas

| ID | Pantalla | Propósito y UI | Acciones/transiciones | Estados y reglas | Trazabilidad |
|---|---|---|---|---|---|
| DEV-01 | Bandeja de Devoluciones | Programadas, recepción, inspección, daños, financiero, cerradas | Abrir, iniciar, filtrar | Alerta de recordatorio fallido | DEV-P01–P11 |
| DEV-02 | Recordatorio y recepción | Protocolo previo, hora, persona que devuelve, custodia | Registrar contacto, recibir vehículo | Titular ausente exige evidencia y responsabilidad | BR-DEV-004; EX-DEV-001 |
| DEV-03 | Alcolímetro de devolución | `FAVORABLE/DESFAVORABLE`, negativa y evidencia | Continuar a checklist o derivar a Gerencia | Desfavorable deja recepción provisional/custodia | BR-DEV-005 |
| DEV-04 | Checklist de recepción offline | 35 fotos, 3 videos, FIV/FCKE, progreso y sincronización | Capturar, guardar cifrado, sincronizar, finalizar | Solo confirmación servidor cierra sincronización | BR-INS-*; UC-DEV-002 |
| DEV-05 | Comparación de evidencia | Entrega vs devolución por zona; hallazgos | Marcar sin daño/con daño | No depender solo de visión manual ni color | DEV-P04/P05 |
| DEV-06 | Evaluación y gravedad del daño | Leve/moderado/grave; estético/técnico | Confirmar clasificación | José Pariona evalúa gravedad; grave implica Rojo | BR-DEV-006/007 |
| DEV-07 | Daño estético y aceptación | Tarifario vigente, ítem, evidencia, aceptación | Registrar aceptación/negociación | Usa tarifario estético, no técnico | BDD 9.6.1 |
| DEV-08 | Daño técnico/Motrix y paralización | Referencia a informe, monto externo, contacto, contador 24h | Registrar respuesta, cargo o vía legal | Sin tabla fija; cargo después de 24h sin respuesta | BR-DEV-006/011 |
| DEV-09 | Resolución de garantía | Garantía, descuentos, cargos, incidencias | Liberar, retener, devolver parcialmente | Nunca liberar con incidencia abierta; máximo 24h sin incidencia | BR-DEV-001/002; NFR-BIZ-003 |
| DEV-10 | Cierre y expediente | Resumen, documentos, pagos, riesgo, auditoría | Cerrar/archivar | Cierre solo después de resolución financiera | UC-DEV-005 |

### Flujo Devolución

`ALQ-10 → DEV-01 → DEV-02 → DEV-03 → DEV-04 → DEV-05`.

- Sin daños: `DEV-05 → DEV-09 → DEV-10`.
- Daño estético: `DEV-05 → DEV-06 → DEV-07 → DEV-09 → DEV-10`.
- Daño técnico: `DEV-05 → DEV-06 → DEV-08 → DEV-09 → DEV-10`.

## 5.6 Reclutamiento y Selección — 8 pantallas

| ID | Pantalla | Propósito y UI | Acciones/transiciones | Estados y reglas | Trazabilidad |
|---|---|---|---|---|---|
| REC-01 | Vacantes/Necesidades | Fuente, empresa, área, puesto, estado | Crear necesidad, abrir | Renuncia, crecimiento o nueva área | REC-P01; BR-REC-008 |
| REC-02 | Perfil y publicación | Funciones, condiciones, canales | Publicar/pausar | Perfil informal AS-IS; mecánicos en institutos | REC-P02/P03; BR-REC-004 |
| REC-03 | Bandeja de candidatos | Etapa, vacante, contacto, disponibilidad | Crear/abrir/mover con validación | Sin filtro intermedio automático | REC-P04/P05 |
| REC-04 | Ficha y negociación | CV, pretensión, disponibilidad, condiciones | Acordar/descartar | Datos sensibles restringidos | REC-P05–P07 |
| REC-05 | Entrevista | Agenda/Meet, notas situacionales, CV | Registrar resultado | 15 min referencial; sin puntaje formal inventado | REC-P08/P09 |
| REC-06 | Decisión de contratación | Resumen, evidencia, consecuencia | Contratar/no contratar con confirmación | Decide Fiorella; José cubre ausencia | BR-REC-003 |
| REC-07 | Incorporación | Fecha, inducción, dispositivos, responsabilidad, expectativas | Confirmar ingreso y entregas | Ingreso al día siguiente; mecánico contrato notariado | REC-P11–P13; BR-REC-009 |
| REC-08 | Periodo de prueba | Honorarios, hitos, evaluación 3 meses | Pasar a planilla o terminar | Planilla en mes 4 solo si evaluación positiva | BR-REC-005 |

### Flujo Reclutamiento

`REC-01 → REC-02 → REC-03 → REC-04 → REC-05 → REC-06 → REC-07 → REC-08 → ADP-01 o término`.

## 5.7 Administración de Personal — 10 pantallas

| ID | Pantalla | Propósito y UI | Acciones/transiciones | Estados y reglas | Trazabilidad |
|---|---|---|---|---|---|
| ADP-01 | Bandeja/Ficha de personal | Empresa, área, relación, historial permitido | Abrir, filtrar | Identidad Empleado separada | ADP-P01–P17 |
| ADP-02 | Asistencia | Marcaciones/importación, tardanzas y faltas | Registrar/revisar | Registro diario; tratamiento AS-IS | ADP-P01/P02 |
| ADP-03 | Falta, advertencia y descuento | Justificación, reiteración, memo, descuento | Justificar/sancionar | Quincena íntegra; descuento a fin de mes | BR-ADP-001 |
| ADP-04 | Solicitud/resolución de permiso | Fechas, motivo, evidencia | Solicitar, aprobar, denegar | Solo Fiorella/José autorizan | BR-ADP-003 |
| ADP-05 | Calendario y solicitud de vacaciones | Calendario del área, rango y prioridad | Solicitar/aprobar/rechazar | Máximo 1 por área; prioridad por fecha de solicitud | BR-ADP-002 |
| ADP-06 | Solicitud de salida a campo | Área, tema, salida, retorno | Enviar | Siempre requiere conexión para autorización | ADP-P12 |
| ADP-07 | Cola de autorización de campo | Tarjeta, motivo, nivel, contador 5 min | Aprobar/rechazar/escalar automático | Fiorella→José→Cecilia; no hay 4.º nivel | BR-ADP-004; NFR-BIZ-008 |
| ADP-08 | Seguimiento de regreso | Hora prevista/real, contador de incumplimientos | Cerrar/advertir | 1.ª–3.ª advertencia; 4.ª observado | BR-ADP-005 |
| ADP-09 | Renuncia/despido | Tipo, sanciones, aviso, pago pendiente | Confirmar término | Reglas distintas por renuncia/despido; dispara vacante | BR-ADP-006; BR-REC-008 |
| ADP-10 | Capacitación interna | Tema, fecha, asistentes, comprensión | Registrar taller | Taller informal ~1h; evaluación formal fuera del MVP | BR-ADP-008 |

### Flujo Administración de Personal

- Asistencia: `ADP-01 → ADP-02 → ADP-03`.
- Permiso: `ADP-01 → ADP-04`.
- Vacaciones: `ADP-01 → ADP-05`.
- Campo: `ADP-01 → ADP-06 → ADP-07 → ADP-08`.
- Salida: `ADP-01 → ADP-09 → REC-01`.
- Capacitación: `ADP-01 → ADP-10`.

## 5.8 Módulos de soporte — 14 pantallas

| ID | Pantalla | Contenido y responsabilidad | Reglas clave |
|---|---|---|---|
| CLI-01 | Bandeja de Clientes | Buscar, deduplicar asistidamente, abrir ficha según permiso | Maestro global con empresa de origen |
| CLI-02 | Ficha 360° de Cliente | Datos, documentos, historial, riesgo, expedientes y auditoría | No fusionar con Candidato/Empleado |
| FLO-01 | Catálogo/Disponibilidad de Flota | Vehículo, empresa, sede, GPS, disponibilidad por intervalo | Cero solapamientos confirmados |
| FLO-02 | Detalle/Mantenimiento de Vehículo | Estado, GPS, mantenimiento, evidencia y compromisos | Vehículo nuevo no alquilable sin GPS |
| PAG-01 | Bandeja de Pagos y Garantías | Pendientes, validados, rechazados, devoluciones y cargos | Alcance financiero y auditoría |
| PAG-02 | Detalle/Validación financiera | Medio, voucher, conciliación, garantía, devolución | Agente externo requiere verificación |
| INC-01 | Bandeja de Incidencias | Tipo, severidad, expediente, estado, responsable | No cerrar garantía con incidencia abierta |
| INC-02 | Detalle de Incidencia/RIO | Evidencia, acciones, resolución, auditoría | Append-only en decisiones críticas |
| REP-01 | Reportes autorizados | Filtros por empresa/sede/periodo; exportación protegida | Nunca cruzar empresas sin permiso |
| ADM-01 | Usuarios y asignaciones | Alta/baja, empresa, sede, estado, MFA | Denegación por defecto |
| ADM-02 | Roles y permisos | Matriz versionada rol–acción–empresa–sede | Segregación de funciones |
| ADM-03 | Catálogos y parámetros | Tarifas, S/300, plantillas, formatos, vigencia | Una sola versión contractual vigente |
| ADM-04 | Auditoría administrativa | Cambios de usuario, rol, catálogo y política | No editable; actor/fecha/antes/después |
| ADM-05 | Configuración de notificaciones | Plantillas, canal, evento y vigencia | Sin datos sensibles en logs/mensajes |

---

# 6. Especificación de campos y validaciones críticas

## 6.1 Cliente y documentos

- Nacionalidad determina requisitos.
- Peruano: DNI, licencia vigente y recibo de agua/luz.
- Extranjero: licencia vigente, pasaporte o carnet de extranjería como alternativas, más constancia de hospedaje.
- Las validaciones de formato son inmediatas; RENIEC/MTC son asíncronas.
- MTC no disponible: bloqueo sin excepción.
- RENIEC no disponible: excepción exclusiva de Gerencia, con motivo y auditoría.
- Documentos y datos sensibles nunca aparecen completos en logs ni notificaciones.

## 6.2 Reserva

- Monto vigente parametrizado; valor observado S/300.
- Pago y cuatro requisitos se registran individualmente.
- Solo una verificación atómica final cambia a `CONFIRMADA` y crea compromiso del vehículo.
- El vehículo continúa disponible mientras la Reserva esté incompleta.
- Fecha, hora y vehículo no son editables después de confirmación.

## 6.3 Evidencia

- 35 fotos obligatorias por checklist.
- 3 videos independientes: interior, exterior e instrucciones.
- Duración aproximada 7–8 minutos por video como referencia operativa, no bloqueo rígido.
- MIME, tamaño, integridad y relación con expediente deben validarse.
- Estados por archivo: pendiente, local, subiendo, procesando, válido, rechazado, reintento.
- FIV verifica presencia del kit; FCKE verifica presencia, estado y vencimiento.
- Temporizador de inspección: 30 minutos técnicos + 15 documentarios.
- Menos de 30 minutos técnicos exige excepción explícita; no simple alerta.

## 6.4 Alcolímetro

La interfaz evita “positivo/negativo” sin explicación:

| Valor | Etiqueta visible | Consecuencia en entrega | Consecuencia en devolución |
|---|---|---|---|
| `FAVORABLE` | Favorable — puede continuar | Continúa | Continúa al checklist |
| `DESFAVORABLE` | Desfavorable — no puede continuar normalmente | Bloquea/cancela entrega | Custodia preventiva y derivación a Gerencia; candidato a Rojo |
| `REFUSED` | Se negó a realizar la prueba | Se trata como desfavorable | Se trata como desfavorable |

## 6.5 Acciones irreversibles

Requieren modal con consecuencia, motivo, MFA reciente si aplica y confirmación final:

- Cancelar Reserva confirmada por cambio.
- Confirmar pérdida por no-show.
- Marcar Cliente Rojo.
- Liberar/retener garantía.
- Aprobar excepción sensible.
- Decidir contratación o término.
- Confirmar incumplimiento grave de ampliación.

---

# 7. Offline y sincronización

## 7.1 Alcance permitido

Solo funcionan offline:

1. `ALQ-09` Checklist de entrega.
2. `DEV-04` Checklist de recepción.

Ninguna pantalla confirma offline disponibilidad, Reserva, entrega, devolución financiera, pago, validación RENIEC/MTC o autorización.

## 7.2 Estados visibles

- Guardado en este dispositivo.
- Pendiente de conexión.
- Sincronizando X de Y archivos.
- Procesando evidencia.
- Sincronizado con fecha/hora.
- Conflicto que requiere resolución.
- Reintentos agotados: contenido conservado, nueva captura suspendida si se excede capacidad.

## 7.3 Seguridad local

- IndexedDB cifrado con AES-256-GCM y clave no exportable.
- Separación por usuario, dispositivo, empresa y expediente.
- Sesión offline máxima de 8 horas.
- Rotación de claves cada 90 días y ante incidente.
- Limpieza al cerrar sesión, revocar acceso o completar política de retención.
- Datos altamente sensibles no disponibles offline.
- No utilizar `localStorage` para datos personales, documentos, pagos o evidencia.

## 7.4 Conflictos

- Nunca aplicar “última escritura gana” silenciosamente.
- Mostrar campo local, campo servidor, autor y hora.
- Permitir conservar servidor, conservar local si autorizado o combinar campos no conflictivos.
- Toda resolución se audita.

---

# 8. Diseño responsive

## 8.1 Breakpoints

| Tipo | Rango | Rejilla | Margen |
|---|---:|---:|---:|
| Móvil | 320–767 px | 4 columnas | 16 px |
| Tablet | 768–1023 px | 8 columnas | 24 px |
| Desktop | 1024–1439 px | 12 columnas | 32 px |
| Desktop XL | >=1440 px | 12 columnas, máximo 1440 px | Automático |

## 8.2 Reglas por contexto

- Campo: CTA principal fijo inferior, captura a una mano, objetivos >=44×44 px, progreso persistente.
- Oficina: formularios en dos columnas cuando no rompan el orden semántico; resumen lateral fijo.
- Tablas en móvil: tarjetas o scroll horizontal con primera columna fija; nunca reducir texto debajo de 14 px.
- Modales críticos en móvil: hoja completa; en desktop: diálogo centrado con foco atrapado.
- Evidencia: cámara primero en móvil; carga/galería en desktop.

---

# 9. Sistema de diseño y componentes

## 9.1 Principios visuales

- Claridad operativa antes que decoración.
- Consistencia entre módulos y empresas del grupo KAIROS.
- Una jerarquía primaria inequívoca por región.
- Densidad adaptable: cómoda por defecto y compacta solo para usuarios entrenados.
- Color, icono y texto se complementan; ninguno actúa solo.
- Las decisiones críticas muestran estado, consecuencia y acción siguiente.

## 9.2 Tokens de color

Los valores constituyen la base candidata a validación de marca y contraste. Figma y código usarán nombres semánticos, no colores literales.

| Token | Valor | Uso |
|---|---|---|
| `primary-50` | `#EEF4FA` | Fondo seleccionado suave |
| `primary-100` | `#D9E7F4` | Hover de superficie |
| `primary-500` | `#1D4E89` | CTA primario y enlace |
| `primary-600` | `#153A66` | Hover/active primario |
| `primary-700` | `#102D51` | Énfasis alto |
| `secondary-500` | `#2E7D6B` | Acento secundario |
| `success-50` / `success-700` | `#EAF6EF` / `#1E7D4B` | Confirmación favorable |
| `warning-50` / `warning-700` | `#FFF4DF` / `#8A5505` | Advertencia y atención |
| `danger-50` / `danger-700` | `#FDECEC` / `#A51F1F` | Bloqueo y destrucción |
| `info-50` / `info-700` | `#EAF2FC` / `#18528F` | Información y dependencia |
| `neutral-0` | `#FFFFFF` | Superficie elevada |
| `neutral-50` | `#F7F8FA` | Fondo de aplicación |
| `neutral-100` | `#EEF0F3` | Superficie secundaria |
| `neutral-300` | `#C8CDD4` | Borde y disabled |
| `neutral-600` | `#59616B` | Texto secundario |
| `neutral-900` | `#1A1D21` | Texto principal |
| `focus-ring` | `#2166B0` | Foco visible de 2 px + separación de 2 px |

Estados hover, active, selected, disabled y focus deben definirse como variables. Ninguna combinación se aprueba sin contraste WCAG 2.2 AA verificado.

## 9.3 Tipografía

Familia primaria: **Inter**, con fallback de sistema. Números financieros y tabulares usarán cifras tabulares cuando estén disponibles.

| Token | Tamaño | Peso | Interlineado | Uso |
|---|---:|---:|---:|---|
| `display` | 32 px | 700 | 40 px | Indicador destacado excepcional |
| `h1` | 28 px | 700 | 36 px | Título de página |
| `h2` | 24 px | 600 | 32 px | Sección principal |
| `h3` | 20 px | 600 | 28 px | Subsección/tarjeta |
| `body` | 16 px | 400 | 24 px | Contenido y formulario |
| `body-strong` | 16 px | 600 | 24 px | Énfasis funcional |
| `small` | 14 px | 400 | 20 px | Metadato y tabla compacta |
| `label` | 14 px | 600 | 20 px | Etiqueta persistente |
| `caption` | 12 px | 400 | 16 px | Nota no crítica |

No se permite texto menor de 12 px. Instrucciones, errores, estados, botones y datos críticos no usarán `caption`.

## 9.4 Espaciado, tamaño, radios, elevación y capas

- Escala: `0, 4, 8, 12, 16, 24, 32, 40, 48, 64 px`.
- Alturas de controles: `40 px` compacta, `48 px` estándar y mínimo táctil `44×44 px`.
- Ancho de lectura: máximo `720 px`; formulario: `800 px`; contenido general: `1440 px`.
- Radios: `4 px` pequeño, `8 px` control, `12 px` tarjeta, `16 px` panel/hoja.
- Bordes: `1 px`; foco: `2 px` con separación de `2 px`.
- Elevación 0: sin sombra; 1: tarjeta flotante; 2: menú/popover; 3: modal. No usar sombras decorativas distintas.
- Capas: contenido `0`, navegación fija `100`, dropdown/popover `200`, overlay `300`, modal `400`, toast `500`.
- La jerarquía de capas debe mantenerse en Figma y frontend sin valores ad hoc.

## 9.5 Iconografía

- Librería oficial candidata: **Lucide**, trazo consistente.
- Tamaños: 16 px en metadatos, 20 px en controles, 24 px en navegación y 32 px en estados destacados.
- Todo icono ambiguo lleva etiqueta visible o nombre accesible.
- No mezclar familias filled, outline o estilos ilustrativos dentro de controles.
- Estados críticos combinan icono, texto y color.
- Iconos decorativos se ocultan a tecnologías de asistencia.

## 9.6 Jerarquía de acciones

| Tipo | Uso | Regla |
|---|---|---|
| Primaria | Continuar o completar etapa | Solo una por región |
| Secundaria | Acción reversible alternativa | Menor énfasis que primaria |
| Terciaria | Consultar, volver o acción auxiliar | Texto o ghost |
| Destructiva | Cancelar operación, rechazar, eliminar | Peligro y confirmación según consecuencia |

- `Cancelar` o `Volver` no usan peligro si solo navegan.
- Desktop: acción primaria a la derecha; móvil: CTA fijo inferior cuando corresponda.
- Loading conserva ancho, bloquea doble envío y anuncia progreso.
- Disabled siempre explica la causa cuando el usuario necesita comprender cómo habilitar la acción.

## 9.7 Componentes obligatorios

1. App shell y navegación responsive.
2. Selector de empresa/sede.
3. Breadcrumb.
4. Input, select, radio, checkbox, textarea y autocompletado.
5. Date picker y date-range picker.
6. Stepper multipaso.
7. Tabla responsive con filtros, orden y paginación.
8. Tarjeta de expediente.
9. Badge de estado con texto e icono.
10. Timeline de auditoría.
11. Modal/hoja de confirmación reforzada.
12. Uploader y visor de documentos.
13. Captura de fotografía/video.
14. Galería y comparador antes/después.
15. Barra de carga/procesamiento multimedia.
16. Banner offline y centro de sincronización.
17. Cola/tarjeta de autorización con temporizador.
18. Calendario de área.
19. Panel de pago/garantía.
20. Panel de dependencia externa.
21. Skeleton, empty state, error state y forbidden state.
22. Toast y alerta `aria-live`.
23. Resumen de errores de formulario.
24. Visor de contrato, políticas, firma/huella.

## 9.8 Contrato de cada componente

La librería documentará para cada componente:

1. Propósito y casos permitidos/prohibidos.
2. Anatomía y slots.
3. Variantes, tamaños y densidad.
4. Espaciado interno y alineación.
5. Default, hover, focus, active, selected, disabled, loading, error, success y read-only.
6. Contenido mínimo/máximo, truncamiento y wrapping.
7. Teclado, foco, nombre, rol y anuncios accesibles.
8. Desktop, tablet y móvil.
9. Variables/tokens utilizados.
10. Ejemplo y criterio de aceptación.

## 9.9 Tablas y bandejas

- Altura estándar `52 px`; variante compacta `40 px` solo por preferencia persistente.
- Cabecera fija en listas extensas; encabezados anuncian orden ascendente/descendente.
- Columnas se priorizan por tarea; identificador, estado y acción principal nunca desaparecen sin alternativa.
- Texto extenso trunca con acceso al contenido completo; datos críticos no dependen de tooltip.
- Acciones frecuentes aparecen en fila; acciones infrecuentes se agrupan en menú etiquetado.
- Filtros, orden, página y densidad se conservan al volver del detalle.
- Selección masiva solo para operaciones autorizadas y homogéneas, con resumen antes de ejecutar.
- Vacío inicial y “sin resultados por filtros” usan mensajes diferentes.
- En móvil se transforman en tarjetas o scroll controlado; nunca se comprime texto bajo 14 px.
- Exportación respeta permisos, enmascaramiento, volumen, progreso y auditoría.

## 9.10 Formularios

- Labels persistentes; obligatorio se identifica y el formulario declara qué significa el indicador.
- Campos cortos no ocupan ancho completo; campos relacionados se agrupan semánticamente.
- Validación al salir del campo para formato; al enviar para reglas cruzadas o externas.
- El error se muestra inline y en resumen enlazado; conserva los valores válidos.
- Campos condicionales aparecen al activarse y reciben foco solo cuando es útil.
- Ayuda breve visible; explicación extensa bajo demanda.
- Máscaras y formatos para DNI/CE/pasaporte, teléfono, placa, fecha, hora, dinero y kilometraje.
- Valores heredados se muestran como resumen o read-only cuando no sean editables; nunca se solicitan nuevamente.
- Formularios multipaso muestran completado, actual, pendiente, error y bloqueo; permiten volver a etapas editables.
- La salida con cambios no guardados solicita confirmación; con autoguardado exitoso no genera advertencia innecesaria.

## 9.11 Formatos de contenido y microcopy

| Dato | Formato UI |
|---|---|
| Fecha | `DD/MM/AAAA` |
| Hora | 24 horas, zona `America/Lima` |
| Dinero PEN | `S/ 1,250.00` |
| Kilometraje | `45 320 km` |
| Porcentaje | `15 %` |
| Placa | Mayúsculas y patrón peruano aplicable |
| Documento | Parcialmente enmascarado según permiso |
| Botón | Verbo + objeto: `Confirmar reserva` |

- Lenguaje directo, respetuoso y orientado a la acción.
- Evitar “Aceptar” cuando pueda usarse un verbo específico.
- Mensajes de error indican problema, dato conservado y solución.
- Términos canónicos: `Cliente Rojo` para clasificación; “lista” solo si BDD lo define como colección administrativa.
- Estados técnicos se traducen a lenguaje humano y conservan el código solo para soporte.

## 9.12 Estados sensibles

Cada patrón usa icono, título, explicación, timestamp/actor si corresponde y acción recomendada:

- Cliente Rojo.
- Bloqueo de seguridad.
- Excepción pendiente/aprobada/rechazada.
- Dependencia externa no disponible.
- Offline y borrador local.
- Sincronización pendiente, en progreso, fallida o en conflicto.
- Evidencia incompleta.
- Pago o garantía pendiente/bloqueada/liberada.
- Operación irreversible.

Rojo se reserva para peligro, bloqueo o destrucción; advertencias recuperables usan ámbar. Un badge no sustituye la explicación cuando existe consecuencia.

## 9.13 Movimiento y feedback

- Feedback de control: 100–200 ms; panel/modal: 200–300 ms.
- Skeleton mantiene la estructura; no usar spinner indefinido.
- Usar progreso determinado cuando el total sea conocido.
- Ninguna animación retrasa una operación ni bloquea una alerta crítica.
- Respetar `prefers-reduced-motion`; desactivar desplazamientos y transiciones no esenciales.
- Éxito persistente cambia el estado de la pantalla; toast complementa, no es la única confirmación.

## 9.14 Estados de componentes

Cada componente interactivo tendrá: default, hover, focus, active, filled, disabled, loading, error, success y read-only cuando aplique.

---

# 10. Accesibilidad WCAG 2.2 AA

## 10.1 Criterios generales

- Contraste >=4.5:1 para texto normal y >=3:1 para texto grande.
- Navegación completa por teclado.
- Foco visible y orden lógico.
- “Saltar al contenido”.
- Landmarks semánticos y título único por ruta.
- Labels persistentes; placeholder nunca sustituye label.
- Errores asociados mediante `aria-describedby` y resumen al inicio.
- `aria-live="polite"` para información y `assertive` para bloqueos críticos.
- Reflow a 320 CSS px.
- Zoom de texto a 200% sin pérdida.
- Objetivos táctiles preferidos >=44×44 px.
- No depender de color, posición, sonido o forma.
- Manejo de foco al abrir/cerrar modal y devolver foco al disparador.
- `prefers-reduced-motion`.
- Advertencia previa de expiración y posibilidad permitida de extender sesión.
- Prevención, revisión y confirmación de operaciones financieras y legales.
- Autocompletado semántico de datos personales cuando sea seguro.
- Pruebas con teclado, VoiceOver y NVDA además de Axe/Lighthouse.

## 10.2 Evidencia audiovisual accesible

- Etiqueta de propósito para cada foto/video.
- Instrucción textual de qué capturar.
- Miniatura con estado legible por lector de pantalla.
- No usar reproducción automática.
- Controles accesibles de reproducir, pausar, volumen y progreso.

---

# 11. Rendimiento, feedback y errores

- Lecturas comunes: p95 <=2 s.
- Comandos transaccionales sin archivos: p95 <=3 s.
- Carga multimedia fuera de ese presupuesto, siempre con progreso explícito.
- Nunca usar spinner indefinido.
- Disponibilidad obsoleta se etiqueta y no permite confirmar.
- Tasa de error API objetivo <0.5%, excluyendo errores atribuibles al cliente.
- Todo error muestra mensaje humano, acción siguiente y código de soporte.
- Los botones críticos permanecen bloqueados durante envío y recuperan el resultado idempotente.

## 11.1 Dependencias externas

| Dependencia | Estado UI | Conducta |
|---|---|---|
| RENIEC | Pendiente/verificado/no disponible | No disponible permite solicitar excepción a Gerencia |
| MTC | Pendiente/verificado/no disponible | No disponible bloquea entrega, sin excepción |
| Pagos/banca | Pendiente/validado/rechazado | No confirmar operación financiera hasta resolución |
| Mensajería | Enviado/entregado/fallido | Fallo visible y reintento; no altera transacción confirmada |
| Motrix | Pendiente/recibido | Referencia manual; sin cálculo técnico interno |

---

# 12. Auditoría, privacidad y retención visible

## 12.1 Eventos visibles en timeline

- Creación y cambio de estado.
- Actor, rol, empresa y sede.
- Pago, validación y devolución.
- Documento/plantilla y versión usada.
- Autorización, rechazo, motivo y nivel.
- Captura, sincronización y validación de evidencia.
- Cambio de riesgo.
- Conflicto y resolución.
- Operación fallida relevante.

## 12.2 Privacidad

- Enmascarar documentos y datos financieros según rol.
- Prohibir datos personales completos en URLs, toasts, logs y notificaciones.
- Confirmar antes de exportar información sensible.
- Registrar quién consultó información crítica cuando corresponda.
- Retención: logs técnicos 90 días; rendimiento 30 días; seguridad 1 año; auditoría general 5 años; pagos, contratos y evidencia 10 años; incidentes 5 años.

---

# 13. Prototipo navegable requerido

## 13.1 Alcance mínimo del prototipo

El prototipo de alta fidelidad debe contener:

1. Las 75 pantallas lógicas o su equivalente consolidado documentado.
2. Versión desktop de todos los flujos de oficina.
3. Versión móvil de autenticación, Gerencia, ALQ-09, DEV-04, ADP-06/07 y notificaciones.
4. Estados principales y alternativos.
5. Modales de acciones irreversibles.
6. Flujo offline y sincronización completo.
7. Flujo de error RENIEC y bloqueo MTC.
8. Competencia por vehículo y alternativas.
9. No-show humano.
10. Daños estético/técnico, paralización y garantía.
11. Reclutamiento y Administración de Personal completos.

## 13.2 Convención de frames

`[ID]-[Breakpoint]-[Estado]-[Variante]`

Ejemplos:

- `RES-04-DESKTOP-READY-REMOTE`.
- `RES-06-DESKTOP-BLOCKING_ERROR-NO_AVAILABILITY`.
- `ALQ-09-MOBILE-LOCAL_DRAFT-OFFLINE`.
- `DEV-04-MOBILE-SYNCING-23_OF_38`.
- `ADP-07-MOBILE-READY-LEVEL_3`.

## 13.3 Conexiones obligatorias

Todo frame interactivo debe tener conexión de:

- Continuar.
- Volver.
- Cancelar.
- Error.
- Reintentar.
- Sin permiso.
- Sesión expirada.
- Confirmación irreversible.
- Salida hacia otro módulo.

---

# 14. Matriz de trazabilidad UX

| Módulo | Pantallas | BDD | SDD | TDD | Cobertura esperada |
|---|---|---|---|---|---|
| Transversal | TR-01–TR-10 | BDD 00 | SDD 00 | TDD 00 | Autenticación, roles, multiempresa, auditoría, offline |
| Consulta | CON-01–CON-04 | CON-P01–P09; BR-CON-* | UC-CON-001–003 | TDD CON | Completa |
| Reserva | RES-01–RES-08 | RES-P01–P16; BR-RES-* | UC-RES-001–005 | TDD RES | Completa |
| Alquiler | ALQ-01–ALQ-11 | ALQ-P01–P15; BR-ALQ/INS/DOC-* | UC-ALQ-001–006 | TDD ALQ | Completa |
| Devolución | DEV-01–DEV-10 | DEV-P01–P11; BR-DEV-* | UC-DEV-001–005 | TDD DEV | Completa |
| Reclutamiento | REC-01–REC-08 | REC-P01–P15; BR-REC-* | UC-REC-001–005 | TDD REC | Completa para AS-IS MVP |
| Administración Personal | ADP-01–ADP-10 | ADP-P01–P19; BR-ADP-* | UC-ADP-001–005 | TDD ADP | Completa; desempeño formal excluido |
| Soporte | CLI/FLO/PAG/INC/REP/ADM | BDD transversal y reglas relacionadas | Componentes transversales | TDD transversal | Necesaria para operación integral |

Antes de aprobar Figma, cada `BR-*` de BDD 07 debe aparecer en al menos una pantalla, regla de navegación, estado o criterio de aceptación.

---

# 15. Criterios de aceptación de diseño

## 15.1 Por pantalla

- Propósito, rol, empresa/sede y datos identificados.
- Happy path y al menos un estado alternativo relevante.
- Acción primaria inequívoca.
- Validaciones y errores accionables.
- Trazabilidad BDD/SDD/TDD.
- Responsive definido.
- Teclado, foco y lector de pantalla considerados.
- Sin datos sensibles innecesarios.

## 15.2 Por flujo

- Inicio y fin claros.
- Ningún callejón sin salida.
- Regreso seguro tras error o sesión expirada.
- Transiciones de estado consistentes con BDD/TDD.
- Permisos aplicados en navegación y acción.
- Operación crítica auditada.
- Sin confirmación offline prohibida.
- Datos heredados sin solicitud repetida injustificada.
- Presupuesto de interacción cumplido o excepción UX documentada.
- Siguiente acción recomendada y salida segura.
- Excepciones y campos condicionales visibles solo cuando aplican.

## 15.3 Pruebas de usabilidad

Antes de aprobar la UX se ejecutará una ronda moderada o remota con al menos cinco participantes representativos, incluyendo Front-office y al menos uno de Campo o Gerencia. Se medirán tareas críticas de Consulta, Reserva, Alquiler, Devolución y autorización.

| Métrica | Umbral de aprobación |
|---|---:|
| Finalización del happy path sin ayuda | >=90 % |
| Errores críticos | <=10 % de participantes |
| Abandono del happy path | 0 % por causa de interfaz |
| Cumplimiento del presupuesto de interacción | >=90 % de tareas |
| Satisfacción posterior a tarea | >=4/5 |
| Comprensión de estado y siguiente acción | >=90 % |

Se registrarán tiempo, acciones, retrocesos, errores, solicitudes de ayuda y comentarios. Los tres puntos de mayor fricción generan correcciones o una decisión documentada de Producto/UX.

## 15.4 Gate de aprobación

El handoff a Frontend se aprueba únicamente cuando:

1. Producto valida alcance y lenguaje.
2. Tech Lead valida factibilidad y contratos.
3. UX valida cobertura y consistencia del prototipo.
4. Seguridad valida autenticación, permisos, privacidad y almacenamiento local.
5. QA confirma criterios de aceptación y estados alternativos.
6. La matriz BDD–pantalla no contiene reglas críticas huérfanas.
7. UX obtiene al menos `8/10`, cumple los umbrales de usabilidad y ninguna dimensión crítica queda bajo `7/10`.
8. UI obtiene al menos `8/10`, sin fallos críticos de contraste, jerarquía, responsive o estados.
9. No existen contradicciones críticas con BDD, SDD o TDD.
10. Los componentes aprobados en Figma coinciden con tokens, anatomía, estados y breakpoints documentados.

---

# 16. Checklist de handoff a Figma y Frontend

- [ ] Librería de componentes con variantes y propiedades.
- [ ] Variables de color, tipografía, espaciado, radios y breakpoints.
- [ ] Variables de sombras, capas, tamaños y movimiento.
- [ ] Auto Layout en todos los componentes.
- [ ] Nombres de frames según convención.
- [ ] Pantallas desktop/móvil requeridas.
- [ ] Prototipo continuo por cada rol.
- [ ] Estados loading/empty/error/forbidden/offline/conflict.
- [ ] Especificación de campos y validaciones.
- [ ] Matriz de permisos por acción.
- [ ] Anotaciones BDD/SDD/TDD.
- [ ] Texto final de mensajes críticos aprobado.
- [ ] Formatos de fecha, hora, moneda, placa, documento y kilometraje validados.
- [ ] Iconografía única, etiquetada y accesible.
- [ ] Tablas y formularios validados en densidad cómoda, compacta y móvil.
- [ ] Estados sensibles con icono, texto, color y acción recomendada.
- [ ] Presupuesto de interacción validado en las tareas críticas.
- [ ] Herencia de datos y revelado progresivo verificados.
- [ ] Prueba con al menos cinco usuarios y métricas registradas.
- [ ] Contrastes verificados.
- [ ] Orden de foco y comportamiento de modal.
- [ ] Exportables con nombres y tamaños definidos.
- [ ] Eventos analíticos y auditables identificados.
- [ ] Dependencias externas y contingencias diseñadas.
- [ ] Revisión de los 75 IDs sin pantallas huérfanas.

---

# 17. Pendientes que no deben asumirse en diseño

| Pendiente | Tratamiento UX provisional |
|---|---|
| Identidad visual definitiva | Usar tokens accesibles de esta versión y marcarlos como candidatos |
| Texto legal/privacidad final | Reservar ubicación; no inventar consentimiento |
| Volumetría y tiempo real de subida en campo | Mostrar progreso sin prometer duración |
| SLA de atención de Reserva | No mostrar promesa de minutos |
| SLA de decisión de descuento por Gerencia | No inventar contador; el contador de 24h corresponde a respuesta del cliente/paralización |
| Política exacta de excepción notarial | Diseñar solicitud genérica parametrizada; no copiar automáticamente cascada ADP |
| Integración estructurada Motrix | Usar referencia/adjunto manual |

---

# 18. Dictamen de preparación

Con esta versión, el documento queda preparado para diseñar, medir y aprobar los prototipos con criterios funcionales, UX, UI, responsive y de accesibilidad. La aprobación final todavía requiere:

- Confirmar con Producto el inventario y las exclusiones.
- Resolver los pendientes de la sección 17 que afecten texto o autorización.
- Diseñar y validar los prototipos.
- Ejecutar pruebas de accesibilidad y usabilidad.
- Completar la matriz de cobertura a nivel de cada escenario crítico.
- Verificar en Figma las variables, variantes, Auto Layout y conexiones.
- Ejecutar la prueba de usabilidad y comprobar los presupuestos de interacción.

**Objetivo de calidad documental de esta v3.1:** 9.7/10 como especificación para prototipado y handoff. El 10/10 solo puede alcanzarse después de validar el prototipo navegable en desktop y móvil, sus componentes reales, accesibilidad, pruebas con usuarios y trazabilidad con Producto, UX/UI, Tech Lead, Seguridad y QA.
```
