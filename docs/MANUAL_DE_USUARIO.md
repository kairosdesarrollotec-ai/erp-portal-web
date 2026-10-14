# Manual de Usuario — KAIROS / VeloxRent ERP

> **Versión del Manual:** 1.5 (Corte al 12 de octubre de 2026)
> **Ámbito:** Guía de interacción paso a paso con el sistema web (`erp-portal-web`) y sus servicios integrados (`erp-monolithic-api`).
> **Política de Actualización:** Este documento se actualiza al cierre de cada jornada diaria con los nuevos módulos, flujos y pantallas que se integren al sistema.

---

## Índice General

1. [Introducción y Objetivos del Sistema](#1-introducción-y-objetivos-del-sistema)
2. [Arquitectura de Acceso y Seguridad](#2-arquitectura-de-acceso-y-seguridad)
   - 2.1 [Inicio de Sesión (Login)](#21-inicio-de-sesión-login)
   - 2.2 [Autenticación de Dos Factores (MFA)](#22-autenticación-de-dos-factores-mfa)
   - 2.3 [Activación de Cuenta para Nuevos Usuarios](#23-activación-de-cuenta-para-nuevos-usuarios)
   - 2.4 [Selección de Contexto de Trabajo (Empresa y Sede)](#24-selección-de-contexto-de-trabajo-empresa-y-sede)
3. [Estructura Visual y Navegación (Shell)](#3-estructura-visual-y-navegación-shell)
   - 3.1 [Barra Superior (Header)](#31-barra-superior-header)
   - 3.2 [Menú Lateral de Navegación (Sidebar)](#32-menú-lateral-de-navegación-sidebar)
   - 3.3 [Centro de Módulos (Hub)](#33-centro-de-módulos-hub)
   - 3.4 [Centro de Notificaciones](#34-centro-de-notificaciones)
4. [Tablero de Control por Rol (Dashboard)](#4-tablero-de-control-por-rol-dashboard)
5. [Módulo de Clientes](#5-módulo-de-clientes)
   - 5.1 [Bandeja y Búsqueda de Clientes](#51-bandeja-y-búsqueda-de-clientes)
   - 5.2 [Registro de Nuevo Cliente](#52-registro-de-nuevo-cliente)
   - 5.3 [Edición de Datos de Cliente](#53-edición-de-datos-de-cliente)
6. [Módulo de Flota Vehicular](#6-módulo-de-flota-vehicular)
   - 6.1 [Catálogo y Filtros de Flota](#61-catálogo-y-filtros-de-flota)
   - 6.2 [Alta de Vehículo con Fotografía](#62-alta-de-vehículo-con-fotografía)
   - 6.3 [Edición de Especificaciones y Tarifas](#63-edición-de-especificaciones-y-tarifas)
   - 6.4 [Cambio Rápido de Estado y Baja de Vehículo](#64-cambio-rápido-de-estado-y-baja-de-vehículo)
7. [Módulo de Consultas y Cotizaciones](#7-módulo-de-consultas-y-cotizaciones)
   - 7.1 [Bandeja de Consultas](#71-bandeja-de-consultas)
   - 7.2 [Registro de Nueva Consulta (CON-02)](#72-registro-de-nueva-consulta-con-02)
   - 7.3 [Exhibición y Cotización con Flota Real (CON-03)](#73-exhibición-y-cotización-con-flota-real-con-03)
   - 7.4 [Detalle, Historial y Cierre de Consulta (CON-04)](#74-detalle-historial-y-cierre-de-consulta-con-04)
8. [Módulo de Reservas](#8-módulo-de-reservas)
   - 8.1 [Bandeja General de Reservas (RES-01)](#81-bandeja-general-de-reservas-res-01)
   - 8.2 [Requisitos y Confirmación (RES-04 / RES-05)](#82-requisitos-y-confirmación-res-04--res-05)
   - 8.3 [Cancelación de Reserva](#83-cancelación-de-reserva)
9. [Módulo de Administración del Sistema](#9-módulo-de-administración-del-sistema)
   - 9.1 [Gestión de Usuarios y Asignaciones Multi-Sede (ADM-01)](#91-gestión-de-usuarios-y-asignaciones-multi-sede-adm-01)
   - 9.2 [Matriz de Roles y Permisos Granulares (ADM-02 y ROLES-DIN-01..03)](#92-matriz-de-roles-y-permisos-granulares-adm-02-y-roles-din-0103)
   - 9.3 [Registro de Eventos y Auditoría (ADM-03)](#93-registro-de-eventos-y-auditoría-adm-03)
   - 9.4 [Catálogos y Parámetros: Monto de Reserva (ADM-04)](#94-catálogos-y-parámetros-monto-de-reserva-adm-04)
   - 9.5 [Plantillas de Notificaciones (ADM-05)](#95-plantillas-de-notificaciones-adm-05)
   - 9.6 [Plantillas de Documentos (ADM-03 / TPL)](#96-plantillas-de-documentos-adm-03--tpl)
10. [Módulo de Alquileres (ALQ-01 a ALQ-11)](#10-módulo-de-alquileres-alq-01-a-alq-11)
   - 10.1 [Ciclo de Vida y Máquina de Estados del Alquiler](#101-ciclo-de-vida-y-máquina-de-estados-del-alquiler)
   - 10.2 [Creación de Alquiler: desde Consulta o desde Reserva Confirmada (RES-05)](#102-creación-de-alquiler-desde-consulta-o-desde-reserva-confirmada-res-05)
   - 10.3 [Validación Documental Presencial (BR-CON-004) — ENTREGA-01](#103-validación-documental-presencial-br-con-004--entrega-01)
   - 10.4 [Protocolo de Alcolímetro de Tolerancia Cero (BR-ALQ-005) — ENTREGA-02](#104-protocolo-de-alcolímetro-de-tolerancia-cero-br-alq-005--entrega-02)
   - 10.5 [Matriz Notarial Automática y Tercer Camino / Excepción Gerencial (BR-ALQ-003/004)](#105-matriz-notarial-automática-y-tercer-camino--excepción-gerencial-br-alq-003004)
   - 10.6 [Formalización de Contrato y Depósito en Garantía (BR-DOC-002/003) — ENTREGA-03](#106-formalización-de-contrato-y-depósito-en-garantía-br-doc-002003--entrega-03)
   - 10.7 [Entrega Física y Checklist de Inspección con Evidencia Obligatoria (BR-INS-003/004) — ENTREGA-04 y ENTREGA-05](#107-entrega-física-y-checklist-de-inspección-con-evidencia-obligatoria-br-ins-003004--entrega-04-y-entrega-05)
   - 10.8 [Alquiler Activo, Seguimiento y Ampliación (ALQ-10 y ALQ-11)](#108-alquiler-activo-seguimiento-y-ampliación-alq-10-y-alq-11)
   - 10.9 [Falta Grave por Incumplimiento de Ampliación (BR-ALQ-013)](#109-falta-grave-por-incumplimiento-de-ampliación-br-alq-013)
11. [Módulo de Devoluciones (DEV-01 a DEV-10)](#11-módulo-de-devoluciones-dev-01-a-dev-10)
   - 11.1 [Ciclo de Vida de la Devolución](#111-ciclo-de-vida-de-la-devolución)
   - 11.2 [Bandeja de Devoluciones y Alquileres Activos (DEV-01)](#112-bandeja-de-devoluciones-y-alquileres-activos-dev-01)
   - 11.3 [Recepción Provisional (DEV-02)](#113-recepción-provisional-dev-02)
   - 11.4 [Prueba de Alcoholímetro (DEV-03)](#114-prueba-de-alcoholímetro-dev-03)
   - 11.5 [Checklist, Evidencias y Documento de Responsabilidad (DEV-04)](#115-checklist-evidencias-y-documento-de-responsabilidad-dev-04)
   - 11.6 [Resultado de la Inspección: Hub de la Devolución (DEV-05)](#116-resultado-de-la-inspección-hub-de-la-devolución-dev-05)
   - 11.7 [Registro de Daños (DEV-06, DEV-07, DEV-08)](#117-registro-de-daños-dev-06-dev-07-dev-08)
   - 11.8 [Garantía y Cierre (DEV-09 y DEV-10)](#118-garantía-y-cierre-dev-09-y-dev-10)
   - 11.9 [Alcance Actual y Pendientes](#119-alcance-actual-y-pendientes)
12. [Módulo de Incidencias y Siniestros (INC-01 e INC-02)](#12-módulo-de-incidencias-y-siniestros-inc-01-e-inc-02)
   - 12.1 [Bandeja General de Incidencias (INC-01)](#121-bandeja-general-de-incidencias-inc-01)
   - 12.2 [Registro de Nueva Incidencia](#122-registro-de-nueva-incidencia)
   - 12.3 [Detalle, Timeline y Seguimiento de Incidencia (INC-02)](#123-detalle-timeline-y-seguimiento-de-incidencia-inc-02)
   - 12.4 [Reglas de Negocio y Bloqueo de Devoluciones (BR-INC-001)](#124-reglas-de-negocio-y-bloqueo-de-devoluciones-br-inc-001)
13. [Módulo de Reclutamiento y Selección (REC-01 a REC-08)](#13-módulo-de-reclutamiento-y-selección-rec-01-a-rec-08)
   - 13.1 [Bandeja y Registro de Necesidades de Personal (REC-01)](#131-bandeja-y-registro-de-necesidades-de-personal-rec-01)
   - 13.2 [Perfil, Requisitos y Publicación de la Vacante (REC-02)](#132-perfil-requisitos-y-publicación-de-la-vacante-rec-02)
   - 13.3 [Tablero Kanban de Candidatos por Vacante (REC-03)](#133-tablero-kanban-de-candidatos-por-vacante-rec-03)
   - 13.4 [Ficha de Postulante y Enmascarado de Datos (REC-04)](#134-ficha-de-postulante-y-enmascarado-de-datos-rec-04)
   - 13.5 [Agendamiento con Directorio de Entrevistadores (REC-05)](#135-agendamiento-con-directorio-de-entrevistadores-rec-05)
   - 13.6 [Evaluación y Registro de Resultados de Entrevista (REC-06)](#136-evaluación-y-registro-de-resultados-de-entrevista-rec-06)
   - 13.7 [Decisión de Contratación y Oferta Laboral (REC-07)](#137-decisión-de-contratación-y-oferta-laboral-rec-07)
   - 13.8 [Onboarding y Período de Prueba de 30/60/90 Días (REC-08)](#138-onboarding-y-período-de-prueba-de-306090-días-rec-08)
14. [Módulo de Administración de Personal (ADP-01 a ADP-10)](#14-módulo-de-administración-de-personal-adp-01-a-adp-10)
   - 14.1 [Bandeja de Personal (ADP-01)](#141-bandeja-de-personal-adp-01)
   - 14.2 [Alta de una Persona: "Nueva persona"](#142-alta-de-una-persona-nueva-persona)
   - 14.3 [Ficha de la Persona](#143-ficha-de-la-persona)
   - 14.4 [Asistencia del Equipo y Descuentos de Fin de Mes (ADP-02)](#144-asistencia-del-equipo-y-descuentos-de-fin-de-mes-adp-02)
   - 14.5 [Asistencia de la Persona y Registro de Marcaciones](#145-asistencia-de-la-persona-y-registro-de-marcaciones)
   - 14.6 [Falta: Justificación, Reclasificación y Memo (ADP-03)](#146-falta-justificación-reclasificación-y-memo-adp-03)
   - 14.7 [Permisos (ADP-04)](#147-permisos-adp-04)
   - 14.8 [Vacaciones (ADP-05)](#148-vacaciones-adp-05)
   - 14.9 [Salida a Campo: Solicitud, Autorización y Regreso (ADP-06, ADP-07, ADP-08)](#149-salida-a-campo-solicitud-autorización-y-regreso-adp-06-adp-07-adp-08)
   - 14.10 [Término de la Relación Laboral (ADP-09)](#1410-término-de-la-relación-laboral-adp-09)
   - 14.11 [Capacitaciones (ADP-10)](#1411-capacitaciones-adp-10)
15. [Módulo de Pagos y Garantías (PAG-01 y PAG-02)](#15-módulo-de-pagos-y-garantías-pag-01-y-pag-02)
   - 15.1 [Bandeja de Garantías (PAG-01)](#151-bandeja-de-garantías-pag-01)
   - 15.2 [Detalle de la Garantía y Ajustes (PAG-02)](#152-detalle-de-la-garantía-y-ajustes-pag-02)
16. [Módulo de Reportes (REP-01)](#16-módulo-de-reportes-rep-01)
17. [Búsqueda Global y Trabajo sin Conexión](#17-búsqueda-global-y-trabajo-sin-conexión)
   - 17.1 [Búsqueda Global (BUS-01)](#171-búsqueda-global-bus-01)
   - 17.2 [Sincronización de Evidencias sin Conexión (TR-08)](#172-sincronización-de-evidencias-sin-conexión-tr-08)
18. [Módulos en Construcción (Hoja de Ruta)](#18-módulos-en-construcción-hoja-de-ruta)
   - 18.1 [Funcionalidades en construcción](#181-funcionalidades-en-construcción)
   - 18.2 [Consultas abiertas al negocio (pendientes de respuesta de Fiorella / Producto)](#182-consultas-abiertas-al-negocio-pendientes-de-respuesta-de-fiorella--producto)
19. [Glosario de Términos y Estados](#19-glosario-de-términos-y-estados)
20. [Bitácora Diaria de Cambios del Manual](#20-bitácora-diaria-de-cambios-del-manual)

---
## 1. Introducción y Objetivos del Sistema

**KAIROS / VeloxRent ERP** es la plataforma integral de gestión operativa y comercial para empresas de alquiler de vehículos y servicios de movilidad turística.

El sistema organiza sus operaciones sobre un modelo corporativo **multi-empresa y multi-sede**:
- Cada usuario pertenece a un grupo empresarial y puede tener asignaciones a una o varias empresas y sedes operativas físicas.
- La información de clientes, flota vehicular, consultas y reservas se encuentra estrictamente aislada y protegida según la sede activa en la que el usuario esté trabajando.

---

## 2. Arquitectura de Acceso y Seguridad

### 2.1 Inicio de Sesión (Login)
* **Ruta de acceso:** `/`
* **Propósito:** Autenticar la identidad del colaborador mediante credenciales seguras corporativas (Firebase Authentication).

#### Interacciones paso a paso:
1. Ingrese su **Correo electrónico corporativo** registrado en el sistema.
2. Ingrese su **Contraseña**.
   * Puede hacer clic en el ícono de **Ojo** (`Eye`/`EyeOff`) para visualizar u ocultar los caracteres de su contraseña.
3. Presione el botón **"Ingresar"**.
4. **Respuestas del sistema:**
   * **Credenciales válidas:** Si no tiene MFA configurado, el sistema valida el estado de su cuenta y lo dirige al siguiente paso (Activación o Selección de Empresa/Sede).
   * **Credenciales incorrectas:** Se muestra una alerta roja destacada con el mensaje indicando que el correo o contraseña son inválidos.
   * **Cuenta bloqueada:** La pantalla se sustituye por el aviso *"Tu cuenta está bloqueada. Contacta a tu administrador para reactivarla"*.
   * **Servicio no disponible:** Si no hay conectividad con el servidor de autenticación, se muestra un mensaje de contingencia con el botón *"Volver"* para reintentar.

---

### 2.2 Autenticación de Dos Factores (MFA)
* **Propósito:** Proteger el acceso de cuentas con roles administrativos u operativos mediante un código temporal de un solo uso (TOTP).

#### Interacciones paso a paso:
1. Tras ingresar credenciales válidas en una cuenta con MFA activo, se desplegará automáticamente la ventana modal **"Desafío de Autenticación de Dos Factores"**.
2. Abra su aplicación autenticadora en su teléfono móvil (Google Authenticator, Microsoft Authenticator o similar).
3. Ingrese el código numérico de **6 dígitos** generado.
4. Presione **"Verificar"** (o presione la tecla *Enter*).
5. Si el código es correcto, ingresará de inmediato al sistema. Si es incorrecto o expiró, el modal indicará el error permitiendo reintentar.

---

### 2.3 Activación de Cuenta para Nuevos Usuarios
* **Ruta:** `/activar-cuenta`
* **Propósito:** Forzar la actualización de contraseñas provisionales y el registro de seguridad en el primer acceso.

#### Interacciones paso a paso:
1. Al ingresar por primera vez con una contraseña asignada por el Administrador, el sistema redirige automáticamente a esta pantalla.
2. **Definir nueva contraseña:**
   * Ingrese su nueva clave secreta personal (debe cumplir los estándares: mínimo 8 caracteres, combinación de mayúsculas, minúsculas y números).
   * Confirme la nueva contraseña en el segundo campo.
3. **Configurar Segundo Factor (MFA):**
   * Escanee el código QR que se muestra en pantalla con su app autenticadora móvil.
   * Introduzca el código de verificación de 6 dígitos que muestra su teléfono.
4. Presione **"Activar mi cuenta"**. Al completarse con éxito, quedará habilitado para operar el sistema.

---

### 2.4 Selección de Contexto de Trabajo (Empresa y Sede)
* **Ruta:** `/seleccion-empresa-sede`
* **Título en pantalla:** *"¿Dónde vas a trabajar hoy?"*
* **Propósito:** Establecer la empresa jurídica y la sede física en la que se registrarán todas las operaciones durante la jornada laboral.

#### Interacciones paso a paso:
1. El sistema presenta una cuadrícula de tarjetas con todas las empresas y sedes a las que el usuario tiene acceso otorgado.
2. Cada tarjeta visualiza:
   * Nombre de la Empresa (ej. *VeloxRent Perú S.A.C.*).
   * Nombre de la Sede (ej. *Sede Central Miraflores*, *Aeropuerto Jorge Chávez*).
   * Rol asignado para dicha sede (ej. *Front-office*, *Administración*).
3. Haga clic sobre la tarjeta de la sede donde operará hoy.
4. El sistema guardará la sesión de trabajo y lo conducirá al **Tablero Principal (`/tablero`)** o al módulo asignado.
5. **Opciones adicionales:**
   * **"Cerrar sesión / Usar otra cuenta":** Enlace ubicado al pie para desloguearse de forma segura sin elegir sede.

---

## 3. Estructura Visual y Navegación (Shell)

Toda la aplicación autenticada comparte un marco de trabajo uniforme compuesto por la Barra Superior y el Menú Desplegable.

### 3.1 Barra Superior (Header)
Visible permanentemente en la parte superior de todas las pantallas de negocio:

* **Ícono de Menú Hamburguesa (☰):** Al hacer clic, abre el panel lateral de módulos (`AppSidebar`).
* **Logotipo / Marca KAIROS:** Al hacer clic sobre el logo, navega directamente al **Centro de Módulos (`/modulos`)**.
* **Título de la Página:** Muestra en qué pantalla se encuentra el usuario (ej. *Clientes*, *Flota Vehicular*, *Reservas*).
* **Badge de Sede Activa:** Muestra el texto `[Empresa] — [Sede]` (ej. *VeloxRent Perú — Miraflores*).
* **Buscador Global (ícono de lupa, BUS-01):** Abre un campo de búsqueda para encontrar alquileres, reservas, clientes, vehículos y devoluciones desde cualquier pantalla. Ver detalle en la sección 17.1.
* **Campana de Notificaciones:** Muestra un círculo indicador con la cantidad de notificaciones no leídas. Al hacer clic, abre el panel lateral de notificaciones.
* **Menú de Usuario (avatar):** Al hacer clic sobre el avatar con la inicial del usuario se despliega un menú con:
  * Nombre del usuario y **rol operativo activo** (ej. *Front-office*).
  * **Empresa y sede activa:** la combinación con la que se está trabajando.
  * **Cambiar empresa/sede:** permite cambiar de sede operativa en cualquier momento sin cerrar sesión, retornando a `/seleccion-empresa-sede`.
  * **Sesión activa:** tiempo restante de la sesión (formato *"Xh Ymin restantes"*; la sesión dura 8 horas).
  * **Cerrar sesión:** cierra de manera limpia y segura la sesión en Firebase y limpia los datos en memoria local. Si en el dispositivo quedaron **formularios o evidencias pendientes de sincronizar** (trabajo guardado sin conexión), el sistema muestra antes una ventana de confirmación que advierte que se perderán si se cierra la sesión.

> **Nota:** la pantalla de **Perfil de usuario** (TR-09) aún no está disponible para el usuario final; ver la sección 18.

---

### 3.2 Menú Lateral de Navegación (Sidebar)
Se activa mediante el botón de menú hamburguesa (☰) y se puede cerrar haciendo clic en la **"X"** o haciendo clic fuera del menú:

* Su título es **"Módulos"** y lista los **13 módulos del sistema**, pero **cada usuario ve solo los módulos para los que tiene permiso** (los permisos se asignan por módulo y acción, no por nombre de rol). Mientras los permisos se están cargando no se muestra ningún módulo restringido.
* Los módulos activos están resaltados y permiten navegación instantánea mediante un solo clic.
* Si en el futuro un módulo no cuenta con pantalla operativa, se mostrará una etiqueta gris **"Próximamente"** (hoy ningún módulo la tiene).
* Al seleccionar cualquier módulo, el menú se cierra automáticamente y carga la pantalla elegida conservando el contexto de la empresa y sede activa.
* Al pie del menú hay dos accesos: **"Cambiar sede"** y **"Cerrar sesión"**.

---

### 3.3 Centro de Módulos (Hub)
* **Ruta:** `/modulos`
* **Propósito:** Vista panorámica general del ERP con tarjetas visuales grandes. Igual que en el menú lateral, **solo aparecen las tarjetas de los módulos para los que el usuario tiene permiso**.

| Módulo | Acceso Directo | Permiso que lo habilita | Estado Actual |
|---|---|---|---|
| **Tablero** | `/tablero` | Todo usuario autenticado | ✅ Operativo |
| **Consultas** | `/consultas` | Permisos de Consultas | ✅ Operativo |
| **Reservas** | `/reservas` | Permisos de Reservas | ✅ Operativo |
| **Alquileres** | `/alquileres` | Permisos de Alquileres | ✅ Operativo |
| **Devoluciones** | `/devoluciones` | Permisos de Devoluciones | ✅ Operativo |
| **Flota** | `/flota` | Permisos de Flota | ✅ Operativo |
| **Clientes** | `/clientes` | Permisos de Clientes | ✅ Operativo |
| **Pagos y Garantías** | `/pagos/garantias` | `PAYMENT.READ_LIST` | ✅ Operativo (sección 15) |
| **Incidencias** | `/incidencias` | `INCIDENT.VIEW` | ✅ Operativo |
| **Personal** | `/personal` | `HR_ADMINISTRATION.VIEW_EMPLOYEES` | ✅ Operativo (Administración de Personal, sección 14) |
| **Reclutamiento** | `/reclutamiento` | `RECRUITMENT.VIEW_VACANCY` | ✅ Operativo (sección 13) |
| **Reportes** | `/reportes` | `REPORT.READ_OPERATIONAL` o `REPORT.READ_FINANCIAL` | ✅ Operativo (sección 16) |
| **Administración** | `/admin/usuarios` | Cualquier permiso de `ADMIN` | ✅ Operativo (sección 9) |

> **Cambio respecto a v1.4:** *Reclutamiento* ahora tiene su propia tarjeta, y *Personal* corresponde a la **Administración de Personal**. *Pagos y Garantías* y *Reportes* dejaron de ser "Próximamente".

---
### 3.4 Centro de Notificaciones
* Se abre al presionar la campana en el Header.
* Despliega un panel lateral derecho con las alertas generadas por el sistema:
  * Creación y asignación de cotizaciones.
  * Cambios de estado de vehículos y reservas.
  * Notificaciones de bienvenida y registro de usuarios.
* Permite marcar alertas individuales como leídas o revisar el detalle del evento.

---

## 4. Tablero de Control por Rol (Dashboard)
* **Ruta:** `/tablero`
* **Propósito:** Mostrar de forma inmediata las tareas pendientes y prioridades operativas del día según el rol del usuario conectado. El saludo (*"Hola"*) indica el nombre del rol activo.

### Vistas según el Rol del Usuario:
1. **Usuarios operativos (Front-Office y demás roles no administradores):**
   * Muestra la lista interactiva de tareas pendientes. Hoy el sistema proyecta tareas reales para **Front-Office**, a partir del ciclo de vida de Reservas y Consultas; para otros roles la lista puede aparecer vacía (ver sección 18).
   * Cada tarea es una tarjeta cliqueable con título y detalle explicativo (ej. *"Completar documentación para Reserva RES-2026-001"*).
   * Al hacer clic en una tarea, el sistema redirige automáticamente a la pantalla de detalle correspondiente (*Deep Linking*).
   * Si no hay pendientes en la sede, muestra el mensaje amigable: *"No tienes pendientes por ahora."*.
2. **Rol Administrador de Plataforma (`PLATFORM_ADMIN`):**
   * Despliega la sección **"ACCESOS DIRECTOS DE CONFIGURACIÓN"** con 4 tarjetas de acceso rápido:
     * *Usuarios* (`/admin/usuarios`).
     * *Catálogos y parámetros* (`/admin/parametros`).
     * *Auditoría* (`/admin/auditoria`).
     * *Permisos* (`/admin/permisos`).
   * Las plantillas de notificaciones (`/admin/notificaciones`) y de documentos (`/admin/plantillas`) se alcanzan desde el módulo Administración.

---

## 5. Módulo de Clientes

* **Ruta:** `/clientes`
* **Propósito:** Directorio centralizado de personas naturales y jurídicas que solicitan cotizaciones, alquilan unidades o mantienen contratos con la empresa.

### 5.1 Bandeja y Búsqueda de Clientes
1. **Contador en vivo:** Muestra el número total de clientes registrados bajo la empresa actual (ej. *"15 clientes registrados"*).
2. **Buscador en tiempo real:**
   * Campo de texto con ícono de lupa: *"Buscar por nombre, documento o teléfono…"*.
   * La lista se filtra instantáneamente conforme el usuario escribe, sin necesidad de presionar *Enter*.
3. **Columnas de la tabla de clientes:**
   * **Nombre / Razón Social:** Nombre completo o denominación legal.
   * **Documento:** Tipo de documento y número identificador (ej. `DNI: 45892147`, `RUC: 20601234567`).
   * **Nacionalidad:** Etiqueta distintiva `PERUANO` o `EXTRANJERO`.
   * **Contacto:** Correo electrónico y teléfono móvil.
   * **Acciones:** Botón de lápiz (Editar).

---

### 5.2 Registro de Nuevo Cliente
1. Presione el botón azul **"+ Nuevo Cliente"** en la esquina superior derecha del encabezado.
2. Se abrirá la ventana modal **"Nuevo Cliente"**.
3. **Complete los campos del formulario:**
   * **Tipo de documento (Obligatorio):** Seleccione entre `DNI`, `RUC`, `Carné de Extranjería (CE)` o `Pasaporte`.
   * **Número de documento (Obligatorio):** Ingrese el número correspondiente. *Nota: El sistema no permite registrar dos clientes con el mismo número de documento en la misma empresa.*
   * **Nombre completo o razón social (Obligatorio):** Ingrese los nombres completos o la razón social de la empresa.
   * **Nacionalidad (Obligatorio):** Seleccione `Peruano` o `Extranjero`.
   * **Fecha de ingreso al país (Condicional):** Si seleccionó `Extranjero`, este campo se habilitará automáticamente para registrar la fecha legal de ingreso al territorio nacional.
   * **Correo electrónico (Opcional):** Correo para envío de cotizaciones y contratos.
   * **Teléfono (Opcional):** Teléfono móvil de contacto.
   * **Dirección (Opcional):** Domicilio registrado.
4. Presione **"Guardar Cliente"**.
   * Si faltan campos obligatorios, el modal mostrará un mensaje de alerta específico.
   * Si los datos son correctos, el cliente se guardará, la lista se actualizará de inmediato y el modal se cerrará.

---

### 5.3 Edición de Datos de Cliente
1. En la fila del cliente deseado, haga clic en el botón con ícono de **Lápiz** (`Pencil`).
2. Se abrirá la modal con el título **"Editar Cliente"**, precargada con todos los datos existentes.
3. Modifique la información necesaria (teléfono, correo, dirección, etc.).
4. Presione **"Guardar Cambios"**.
5. Los datos se actualizarán de forma inmediata en la base de datos central y en la tabla.

---

## 6. Módulo de Flota Vehicular

* **Ruta:** `/flota`
* **Propósito:** Administrar el inventario de vehículos disponibles para alquiler, sus especificaciones mecánicas, tarifas diarias y estados de servicio.

### 6.1 Catálogo y Filtros de Flota
1. **Búsqueda por texto:** Ingrese placa, marca o modelo en la barra de búsqueda (*"Buscar por placa, marca o modelo…"*) para filtrar la tabla en tiempo real.
2. **Filtro por Estado:** Menú desplegable para seleccionar:
   * *Todos los estados*
   * *Disponible* (Verde): Unidad lista para cotización o entrega inmediata.
   * *Alquilado* (Azul): Unidad actualmente en posesión de un cliente bajo contrato.
   * *Mantenimiento* (Amarillo): Unidad en taller mecánico o inspección preventiva.
   * *Fuera de Servicio* (Gris/Rojo): Unidad dada de baja o inhabilitada temporalmente.
3. **Contador de inventario:** Muestra el número total de unidades en la flota de la sede.
4. **Columnas de la tabla:** Placa, Vehículo, Categoría, Tarifa diaria, Estado y Acción. El botón **"Ver detalle"** de cada fila abre la ficha del vehículo (`/flota/:id`), que muestra el *Estado operativo*; los bloques *Historial de mantenimiento* y *Telemetría y compromisos futuros* aparecen como espacios reservados (ver sección 18).
5. **Disponibilidad por fechas:** el catálogo de Flota **no** tiene filtro por fechas. La disponibilidad de la flota según las fechas de un viaje se consulta desde la cotización de una consulta (CON-03, sección 7.3), donde los vehículos ocupados se muestran al final y deshabilitados.

---

### 6.2 Alta de Vehículo con Fotografía
1. Presione el botón **"+ Nuevo Vehículo"** en la barra superior.
2. Se abrirá el formulario modal **"Nuevo Vehículo"**.
3. **Carga de Fotografía del Vehículo:**
   * Haga clic en el recuadro de cámara o arrastre una imagen (formatos soportados: JPEG, PNG, WebP).
   * El sistema genera una vista previa instantánea y optimiza la imagen automáticamente para reducir los tiempos de carga en red.
4. **Datos del Vehículo:**
   * **Placa (Obligatorio):** Ingrese la placa vehicular (ej. `ABC-123`). La placa es única y no se puede repetir en el sistema.
   * **Marca y Modelo (Obligatorios):** Ej. *Toyota Yaris*, *Hyundai Tucson*.
   * **Año de Fabricación:** Ej. `2024`.
   * **Color:** Ej. `Gris Plata`, `Blanco`.
   * **Categoría (Obligatorio):** Seleccione entre `Sedán`, `SUV`, `Pick-up`, `Hatchback`, `Van` o `Compacto`.
   * **Tarifa Diaria en Soles (S/.) (Obligatorio):** Precio base de alquiler por día (ej. `180.00`).
   * **Estado Inicial:** Seleccione `Disponible` (o `Mantenimiento` si aún requiere alistamiento).
5. Presione **"Guardar Vehículo"**.

---

### 6.3 Edición de Especificaciones y Tarifas
1. En la tabla de flota, ubique el vehículo y presione el botón **"Editar"** en su fila.
2. Se desplegará la modal en modo edición:
   * La **Placa** se muestra protegida en modo sólo lectura (constituye el identificador físico inmutable del vehículo).
   * Puede actualizar la marca, modelo, año, color, categoría, tarifa diaria por día y sustituir la fotografía.
3. Presione **"Guardar Cambios"**.

---

### 6.4 Cambio Rápido de Estado y Baja de Vehículo
* **Cambio de Estado en 1 Clic:**  
  En la columna *Acción* de la tabla, cada vehículo cuenta con un menú desplegable directo (`Disponible`, `Alquilado`, `Mantenimiento`, `Fuera de Servicio`). Al cambiar la selección, el estado se actualiza en el servidor en tiempo real sin recargar la página.
* **Dar de Baja a un Vehículo:**  
  1. Si un vehículo no está en estado *Fuera de Servicio*, verá el botón **"Dar de baja"**.
  2. Al presionarlo, el sistema solicitará confirmación mediante un botón de seguridad rojo: **"Confirmar baja"**.
  3. Al confirmar, el vehículo pasará al estado inactivo `OUT_OF_SERVICE`.
  4. Si se equivocó, puede presionar **"Volver"** para cancelar la acción.

---

## 7. Módulo de Consultas y Cotizaciones

* **Ruta:** `/consultas`
* **Propósito:** Gestionar el ciclo de prospección comercial desde la primera llamada o visita del cliente hasta la cotización formal de un vehículo de la flota real.

### 7.1 Bandeja de Consultas
* Muestra todas las consultas registradas en la sede activa.
* **Estados visuales:**
  * `REGISTRADA`: Consulta recibida con requerimiento de viaje pero aún sin vehículo cotizado.
  * `COTIZADA`: Se ha asignado un vehículo de la flota y calculado el presupuesto estimado.
  * `CONVERTIDA`: La cotización fue aceptada y avanzó a reserva.
  * `CERRADA_SIN_CONVERSION`: Consulta finalizada sin concretar venta (por no cumplir política turística, desistimiento del cliente o falta de disponibilidad).
* Presione el botón **"+ Nueva Consulta"** para iniciar una atención.

---

### 7.2 Registro de Nueva Consulta (CON-02)
* **Ruta:** `/consultas/nueva`
* **Mecanismo de Salvaguarda:** Cuenta con indicador de autoguardado en el encabezado (*"Guardado en este dispositivo"*), que evita la pérdida de información si la ventana se cierra accidentalmente.

#### Paso a paso del flujo de atención:
1. **Modalidad de Exhibición:**
   * Seleccione **"Presencial"** si el cliente se encuentra físicamente en el counter/oficina.
   * Seleccione **"Virtual"** si la atención es por canales digitales. Si elige *Virtual*, se desplegará el selector **"Canal de contacto"** para indicar el origen (`WhatsApp`, `Llamada telefónica`, `Página Web`, `Redes Sociales`, `Correo electrónico`).
2. **Vinculación Obligatoria del Cliente:**
   * **Buscar cliente existente:** Escriba en el buscador de clientes por nombre o número de documento. Al aparecer el resultado en la lista desplegable, haga clic sobre él para seleccionarlo.
   * **Si es un cliente nuevo:** Presione el botón **"+ Registrar nuevo cliente"**. Se abrirá el modal de alta rápida de clientes; al guardarlo, quedará automáticamente vinculado a esta consulta.
   * Una vez vinculado, verá la tarjeta del cliente con su documento y nacionalidad. Cuenta con un botón *"Desvincular"* por si requiere cambiar de cliente.
   * **Requisito especial para Extranjeros:** Si el cliente tiene nacionalidad extranjera, el sistema desplegará automáticamente el campo obligatorio: **"Documento de hospedaje"** (reserva de hotel o carta de alojamiento).
3. **Necesidad de Viaje:**
   * **Destino (Obligatorio):** Ciudad o circuito turístico (ej. *Cusco - Valle Sagrado*, *Paracas - Ica*).
   * **Fecha de viaje (Obligatorio):** Selector de fecha. *Validación de seguridad: El sistema no permite elegir fechas en el pasado; la fecha mínima es el día de hoy.*
   * **Número de personas:** Cantidad de pasajeros (mínimo 1).
   * **Días estimados:** Duración proyectada del alquiler (mínimo 1 día).
4. **Validación de Uso Turístico (Regla Crítica de Negocio):**
   * El sistema pregunta: *¿El uso es turístico?*
   * **Si selecciona "SÍ":** Se valida la conformidad con la póliza de seguros de la flota y se habilita el botón verde **"Continuar"** para pasar al catálogo de vehículos.
   * **Si selecciona "NO":** El sistema muestra una advertencia indicando que las unidades cuentan con cobertura de seguro exclusiva para fines turísticos. El botón principal se transforma en **"Cerrar consulta"**, registrando la consulta como cerrada sin cotización comercial.

---

### 7.3 Exhibición y Cotización con Flota Real (CON-03)
* **Ruta:** `/consultas/:id/vehiculos`
* **Propósito:** Consultar la flota de vehículos de la sede y presentar las opciones al cliente, **indicando cuáles están ocupados en las fechas del viaje**.

1. **Conexión Directa con Flota:** La pantalla consulta al módulo de Flota los vehículos en estado `AVAILABLE` que pertenezcan a la misma sede y empresa, y verifica además sus compromisos (reservas y alquileres) dentro de la ventana del viaje.
2. **Disponibilidad por fechas (nuevo):**
   * La ventana de revisión se mide **desde la fecha real del viaje** de la consulta (00:00) y cubre los **días de viaje** indicados en la consulta.
   * Los vehículos **ocupados en esas fechas se muestran al final** de la lista, con aspecto atenuado, el texto **"No disponible en estas fechas"** y el detalle **"Ocupado del dd/mm al dd/mm"**. Su botón **"Cotizar este vehículo"** queda **deshabilitado**.
   * Si **todos** los vehículos están ocupados, aparece el aviso: *"Todos los vehículos están ocupados en las fechas de este viaje. Cambia las fechas de la consulta o revisa más tarde."*
3. **Filtros Rápidos:**
   * Buscador por marca o modelo (*"Buscar"*).
   * Filtro por rango de precio mínimo y máximo por día (*"Precio mín. (S/)"* y *"Precio máx. (S/)"*).
4. **Cálculo Automático de Cotización:**  
   Cada tarjeta de vehículo muestra:
   * Foto y datos técnicos (Categoría, Año, Color).
   * Tarifa por día y total estimado en una sola línea: `S/ 150.00 / día · Est. S/ 450.00 (3 días)`. El **Total Estimado** se calcula multiplicando la tarifa diaria por el número de días de viaje de la consulta.
   * Enlace **"Ver más detalles"**.
5. **Aviso de datos desactualizados y botón "Actualizar ahora":** si la pantalla lleva abierta más de 5 minutos aparece el aviso *"Esta vista tiene más de 5 minutos — vuelve a cargarla antes de cotizar."* con el botón **"Actualizar ahora"**, que re-consulta la flota para verificar que ningún otro asesor haya tomado la unidad.
6. **Acción de Cotización:**  
   Al presionar el botón **"Cotizar este vehículo"** en la tarjeta elegida:
   * El vehículo se vincula a la consulta.
   * La consulta pasa oficialmente al estado `COTIZADA`.
   * El sistema navega a la pantalla de detalle de la consulta.
   * Si otra operación modificó la consulta o el vehículo mientras se miraba la pantalla, se muestra un aviso de conflicto de versión y se debe recargar antes de cotizar.
7. **Consulta virtual:** para consultas de modalidad virtual, el botón *"Enviar evidencia (video 360°) — no disponible todavía"* aparece deshabilitado (ver sección 18).

---

### 7.4 Detalle, Historial y Cierre de Consulta (CON-04)
* **Ruta:** `/consultas/:id`
* **Propósito:** Revisar el resumen de la cotización, la trazabilidad de interacciones y efectuar la conversión o el cierre.

1. **Resumen Comercial:** Muestra el vehículo cotizado (con el enlace **"Cambiar vehículo"**), el cliente, la fecha de registro, el canal de la consulta y el importe presupuestado, junto con la insignia del estado. Si todavía no hay cotización, el botón disponible es **"Cotizar vehículo"**.
2. **Línea de Tiempo (Historial):** Muestra cronológicamente cuándo se creó la consulta, qué canales se utilizaron y las cotizaciones emitidas. En pantallas pequeñas el historial se encuentra en un acordeón **"Ver historial"**.
3. **Conversión de la Consulta (siempre se ofrecen ambas acciones):** Con una cotización emitida, la consulta aún abierta y un cliente formal asociado, el detalle muestra dos botones:
   * **"Reservar este vehículo":** abre un formulario con **"Fecha y hora de inicio"** (precargada con la fecha del viaje a las 09:00) y la pregunta **"¿El cliente puede acercarse a oficina?"** (*"Sí — presencial"* / *"No — remota"*). Al presionar **"Confirmar reserva"** se crea la reserva en borrador y el sistema lleva al detalle de la reserva (sección 8).
   * **"Convertir a Alquiler":** (requiere el permiso `INQUIRY.CONVERT_TO_RENTAL`) crea el expediente de alquiler directo a partir de la cotización vigente (ver sección 10.2). La consulta pasa a `CONVERTIDA` y el sistema lo lleva a la primera etapa del expediente recién creado (`/alquileres/:id/entrega-01`). Si el cliente aún no está registrado formalmente (prospecto), ambos botones se reemplazan por el aviso para registrarlo primero.
4. **Cierre sin Conversión:**
   * Si el cliente desiste o no concreta la compra, presione **"Cerrar sin conversión"** (requiere el permiso `INQUIRY.CLOSE`).
   * En la ventana *"¿Por qué cierras esta consulta sin conversión?"* ingrese el **Motivo de cierre** obligatorio (ej. *"Cliente optó por transporte público"*, *"Precios fuera de su presupuesto"*).
   * Presione **"Confirmar cierre"**.
5. **Protección contra conflictos de edición:** si otro usuario modifica la consulta mientras se la ve, aparece el banner *"Esta consulta cambió por otra operación mientras la veías"* con el botón **"Recargar"**.

---

## 8. Módulo de Reservas

* **Ruta:** `/reservas`
* **Propósito:** Administrar los compromisos formales de alquiler asegurados mediante el pago del monto de reserva vigente y la entrega de la documentación.

### 8.1 Bandeja General de Reservas (RES-01)
* Lista de reservas registradas en la sede activa.
* **Columnas:**
  * **Cliente:** Nombre del titular de la reserva.
  * **Vehículo:** Modelo y placa asignada.
  * **Fechas:** Rango de fecha de inicio y fecha de devolución pactada.
  * **Estado:**
    * `DRAFT` (Borrador / No confirmada): Reserva registrada que aún tiene requisitos pendientes (pago o documentos). La fila muestra el botón **"Continuar"**.
    * `CONFIRMED` (Confirmada): Reserva con pago y documentación completos, lista para convertirse en alquiler.
    * `PENDING_SALE_RESOLUTION` (Pendiente de resolver): reserva que requiere una resolución de venta antes de continuar.
    * `CONVERTED` (Convertida): reserva que ya originó un alquiler (estado terminal).
    * `CANCELLED` (Cancelada): Reserva dada de baja con registro de motivo (estado terminal).
* Al hacer clic en cualquier fila de la tabla se abre el detalle de la reserva.

---

### 8.2 Requisitos y Confirmación (RES-04 / RES-05)
* **Ruta:** `/reservas/:id`

Para que una reserva pase de Borrador (`DRAFT`) a Confirmada (`CONFIRMED`), la política del sistema exige completar dos requisitos indispensables, que aparecen como lista de verificación:

1. **Requisito 1: "Pago del monto de reserva vigente":**
   * La lista muestra el importe exigido (por defecto **S/ 300**, parámetro versionado que administra el área de Administración; ver sección 9.4).
   * Presione **"Subir"** y adjunte el comprobante de pago (formatos JPEG, WEBP, PNG o PDF). El archivo se sube de forma segura al almacenamiento del sistema y queda registrado como comprobante de pago.
2. **Requisito 2: "Documentos / contrato":**
   * Presione **"Subir"** y adjunte la documentación y el contrato de la reserva.
   * En una reserva de modalidad **virtual** el requisito indica además *"Incluye video 360° y documento de aceptación remota"*.
3. **Confirmación Definitiva:**
   * Una vez cumplidos ambos requisitos, si el usuario tiene el permiso `RESERVATION.CONFIRM`, se activa el botón **"Confirmar reserva"**; al presionarlo la reserva pasa inmediatamente a `CONFIRMED`.
   * Si el usuario no tiene ese permiso, la pantalla informa: *"La reserva se confirma automáticamente al completar los 2 requisitos."*
4. **Vehículo ocupado (nuevo, error 409 `VEHICLE_NOT_AVAILABLE`):**
   * Si, al confirmar, el vehículo ya está comprometido en las fechas de la reserva (otra reserva o un alquiler lo tomó), aparece una **alerta clara** con el motivo que informa el servidor o, por defecto: *"Este vehículo ya está ocupado para estas fechas. Elige otro vehículo u otras fechas."*
   * El botón **"Confirmar reserva"** queda **deshabilitado** mientras la alerta esté vigente: hay que elegir otro vehículo u otras fechas desde la consulta.
5. **Protección contra Conflictos de Edición (`SYNC_CONFLICT`):**  
   El aviso *"Esta reserva cambió por otra operación mientras la veías"* con el botón *"Recargar"* se muestra **únicamente** cuando otro usuario modificó la reserva al mismo tiempo (conflicto de versión). Ya no se usa para el caso del vehículo ocupado, que tiene su propia alerta.
6. **Continuar con el alquiler:** en una reserva `CONFIRMED` el botón **"Continuar con alquiler"** abre el expediente de alquiler (`/alquileres/nuevo`) heredando cliente, vehículo y fechas (ver sección 10.2, Vía B).

---

### 8.3 Cancelación de Reserva
* En el detalle de una reserva `CONFIRMED` el botón disponible es **"Cancelar por cambio solicitado"** (requiere el permiso `RESERVATION.CANCEL_CUSTOMER_REQUESTED_CHANGE`).
* El sistema advierte: *"Esto se procesará como cancelación — se pierde el monto de reserva (BR-RES-003)."* No existe la reprogramación de reservas: el cambio de fechas o de vehículo se trata como cancelación y nueva reserva.
* Ingrese el **"Motivo del cambio solicitado"** (campo obligatorio) y presione **"Confirmar cancelación"** (o **"Volver"** para salir sin cancelar).
* Al cancelar, la unidad reservada regresa inmediatamente a disponibilidad en la flota. `CANCELLED` y `CONVERTED` son estados terminales.
* La cancelación por **inasistencia del cliente (no show)** solo puede registrarla Gerencia (permiso `CANCEL_NO_SHOW`).

---

## 9. Módulo de Administración del Sistema

> **Nota de Seguridad:** Estos submódulos sólo son accesibles para usuarios que posean el rol `ADMINISTRACION` o `PLATFORM_ADMIN`, o permisos específicos del módulo `ADMIN`.

### 9.1 Gestión de Usuarios y Asignaciones Multi-Sede (ADM-01)
* **Ruta:** `/admin/usuarios`
* **Propósito:** Crear usuarios corporativos, definir sus roles y asignarles acceso a una o múltiples sedes de las empresas del grupo.

#### Pasos para Crear y Asignar un Usuario:
1. Presione el botón **"+ Agregar usuario"**.
2. **Correo Electrónico:** Ingrese el correo corporativo del colaborador.
3. **Rol del Sistema:** Seleccione el rol a otorgar:
   * Con la arquitectura de **Roles Dinámicos (ROLES-DIN-01)**, el selector se alimenta en tiempo real de los roles activos configurados para la organización (`GET /admin/roles`).
   * Los roles corporativos (ej. `FRONT_OFFICE`, `OPERACIONES`, `GERENCIA`, `ADMINISTRACION`, u otros creados por la empresa) se asignan vinculando el identificador del rol (`targetRoleId`). La tabla principal exhibe el nombre dinámico del rol.
4. **Asignación Multi-Empresa y Multi-Sede:**
   * El sistema despliega un árbol organizado por empresas del grupo.
   * Puede marcar individualmente las sedes donde el usuario tendrá autorización para trabajar, o hacer clic en el botón de la empresa para marcar todas sus sedes en bloque.
5. **Contraseña Inicial (Opcional):**
   * Si ingresa una contraseña, el usuario podrá usarla para su primer inicio de sesión.
   * Si la deja en blanco, el sistema generará una credencial temporal segura y enviará automáticamente un correo electrónico de bienvenida mediante el servicio **Resend** con el enlace de activación.
6. Presione **"Guardar Asignación"**.

---

### 9.2 Matriz de Roles y Permisos Granulares (ADM-02 y ROLES-DIN-01..03)
* **Ruta:** `/admin/permisos`
* **Propósito:** Gestión integral de roles corporativos personalizados y configuración granular de privilegios por módulo y acción.
* **Disponibilidad:** Interfaz diseñada exclusivamente para pantallas de escritorio (desktop) debido a la alta densidad de información (las pantallas con resolución menor a 900px muestran un banner explicativo fijo).

#### 9.2.1 Panel de Gestión de Roles Dinámicos
* **Creación de Rol:** Permite ingresar un nombre descriptivo (hasta 60 caracteres) y presionar "Crear rol". Todo nuevo rol nace inicialmente sin permisos asignados.
* **Renombrado en Línea:** Posibilidad de modificar el nombre de un rol existente. Cuenta con detección automática de colisiones concurrentes (`409 VERSION_CONFLICT`), recargando los datos actualizados.
* **Desactivación de Rol:** Permite desactivar roles obsoletos tras confirmación modal. El sistema valida y bloquea la acción si el rol tiene usuarios asignados o si constituye el único rol con facultades administrativas.
* **Rol Inmutable:** El rol de superadministrador corporativo (`PLATFORM_ADMIN`) es permanente y de solo lectura.

#### 9.2.2 Matriz Interactiva de Permisos
* Visualiza una cuadrícula de doble entrada con los módulos y acciones del sistema:
  * `ADMIN` (MANAGE_USERS, VIEW_AUDIT, MANAGE_PARAMETERS, MANAGE_PERMISSIONS, MANAGE_NOTIFICATIONS)
  * `CUSTOMER` (VIEW, CREATE, UPDATE, DELETE)
  * `FLEET` (VIEW, CREATE, UPDATE, STATUS_CHANGE)
  * `INQUIRY` (VIEW, CREATE, CONVERT_TO_RENTAL, CLOSE)
  * `RESERVATION` (VIEW, CREATE, CONFIRM, CANCEL)
  * `RENTAL` (VIEW, CREATE, ADVANCE_STAGE, CANCEL, APPROVE_NOTARY)
  * `RETURN` (VIEW, CREATE, INSPECT, CLOSE)
  * `INCIDENT` (VIEW, CREATE, UPDATE, CLOSE, REFER_LEGAL)
  * `RECRUITMENT` (VIEW_VACANCY, CREATE_VACANCY, PUBLISH_VACANCY, MANAGE_CANDIDATES, INTERVIEW, DECIDE_CANDIDATE, ONBOARDING, EVALUATE_PROBATION)
* **Segregación de Funciones:** Si un operador marca combinaciones de permisos incompatibles según las directivas de control interno, las casillas se resaltan con borde rojo y advertencia visual, bloqueando el guardado (`409 INCOMPATIBLE_PERMISSIONS`).
* **Ámbitos de Alcance:** Al guardar cambios, se puede seleccionar el ámbito de aplicación de la versión: toda la Organización (`org`), una Empresa específica (`company:ID`), o una Sede concreta (`branch:COMPANY:BRANCH`).
* **Aplicación Inmediata:** La autorización se valida en tiempo real en backend mediante `MatrixAuthorizationService` y en frontend a través del hook `usePermissions()`.

---
### 9.3 Registro de Eventos y Auditoría (ADM-03)
* **Ruta:** `/admin/auditoria`
* Bitácora inmutable de seguridad y cumplimiento legal.
* Registra de forma automática:
  * Fecha y hora exacta (UTC y local).
  * Usuario responsable (correo y rol).
  * Empresa y Sede donde ocurrió el evento.
  * Módulo y acción efectuada (ej. `CUSTOMER_CREATED`, `VEHICLE_STATUS_CHANGED`, `RESERVATION_CONFIRMED`).
  * Carga útil (*payload*) y metadatos del cambio.

---

### 9.4 Catálogos y Parámetros: Monto de Reserva (ADM-04)
* **Ruta:** `/admin/parametros` (tarjeta *"Catálogos y parámetros"* del tablero de administración).
* Gestiona el **"Monto de reserva"**, el importe en soles (PEN) que el cliente paga para asegurar una reserva. El valor inicial vigente es **S/ 300**.
* El parámetro es **versionado**: nunca se sobrescribe, cada cambio crea una nueva versión.
  1. Presione **"Cambiar"** e ingrese el nuevo importe.
  2. Presione **"Continuar"** y revise el resumen.
  3. Presione **"Confirmar cambio"**.
* La tabla **"Historial de versiones"** muestra todas las versiones del monto con su vigencia.
* La pantalla incluye un enlace a la **"Gestión de plantillas"** de documentos (sección 9.6).

> **Corrección respecto a v1.4:** esta pantalla **no** define importes de garantía por categoría de vehículo. La garantía de cada alquiler se digita al formalizar el contrato, respetando el mínimo del vehículo (sección 10.6).

---

### 9.5 Plantillas de Notificaciones (ADM-05)
* **Ruta:** `/admin/notificaciones`
* Gestión de los textos y plantillas de correo electrónico y avisos en el sistema (bienvenida, confirmación de reserva, recordatorio de viaje).

---

### 9.6 Plantillas de Documentos (ADM-03 / TPL)
* **Ruta:** `/admin/plantillas`
* **Propósito:** Administrar las plantillas legales que el sistema usa al formalizar documentos: contratos de alquiler, contrato de reserva y documento de responsabilidad de devolución.
* **Pestañas por tipo de documento:**
  * Contrato de alquiler (plantilla general, usada como respaldo).
  * Contrato de alquiler para **persona natural**, **persona natural con conductor distinto del titular**, **persona jurídica** y **persona jurídica con conductor distinto del titular** (las cuatro variantes que se seleccionan en el paso de garantía y contrato; ver sección 10.6).
  * Contrato de reserva.
  * Documento de responsabilidad de devolución.
* **Estados:** cada plantilla se muestra con la insignia **Vigente**, **Borrador** o **Archivada**, y la etiqueta **"En uso"** cuando corresponde.
* **Nueva plantilla (asistente de 3 pasos, "Nueva plantilla de documento"):**
  1. **Metadatos:** metadatos de la plantilla.
  2. **Subir archivo:** PDF o DOCX de hasta 20 MB.
  3. **Activar:** al activar una plantilla, esta pasa a *Vigente* y la anterior del mismo tipo y empresa pasa a *Archivada*. **Solo puede existir una plantilla vigente por tipo y empresa**, y la activación queda registrada en auditoría.
* Si falta la plantilla vigente de una combinación, el flujo de alquiler lo advierte (sección 10.6) y se debe cargar desde esta pantalla.

---

## 10. Módulo de Alquileres (ALQ-01 a ALQ-11)

El módulo de **Alquileres** gobierna la fase troncal de la operación de KAIROS ERP: desde la formalización legal, validación documental y pruebas de seguridad hasta la entrega de la unidad física con evidencia fotográfica inmutable, el seguimiento del alquiler activo (ampliaciones, incidencias, devolución) y la activación del vehículo en flota.

* **Ruta:** `/alquileres`
* **Bandeja (ALQ-01):** tabla con las columnas **Cliente**, **Vehículo**, **Etapa** (insignia y barra de progreso) y **Empresa**. No existe un botón de alta directa de alquiler (ver sección 10.2). Cada fila ofrece botones según su estado:
  * **"Iniciar devolución"** (alquiler `ACTIVE`) o **"Continuar devolución"** (`RETURN_IN_PROGRESS`).
  * **"Ver incidencias"** / **"Registrar incidencias"** (requiere `INCIDENT.VIEW`), que abre el módulo de Incidencias filtrado por ese alquiler.
  * **"Registrar falta grave"** (solo alquileres con ampliación pendiente y permiso `RENTAL.REPORT_EXTENSION_BREACH`; sección 10.9).
  * **"Continuar"** para los expedientes aún en etapas de entrega.
* **Al hacer clic en una fila:** un alquiler `ACTIVE` o con ampliación pendiente abre la **pantalla del alquiler activo** (`/alquileres/:id`, sección 10.8); un alquiler en devolución lleva a `/devoluciones`; los demás abren la etapa de entrega que les corresponde (`/alquileres/:id/entrega-01` a `entrega-05`).

---

### 10.1 Ciclo de Vida y Máquina de Estados del Alquiler

El expediente de alquiler transita por una máquina de estados estricta para garantizar cero omisiones de seguridad ni brechas contractuales:

1. **`DRAFT` (Borrador):** Expediente recién creado, vinculado a cliente, vehículo y sede operativa. En la bandeja se muestra como *Entrega, etapa 1 de 5*.
2. **`VALIDATION` (Validación Documental):** Documentos de identidad, licencia de conducir y arraigo validados conforme a la nacionalidad del titular; en esta fase se hace la prueba de alcolímetro.
3. **`NOTARY_EVALUATION` (Evaluación Notarial):** Prueba de alcolímetro de tolerancia cero aprobada favorablemente; el sistema somete el perfil a la matriz notarial de riesgo.
4. **`CONTRACTING` (Contratación y Garantía):** Matriz notarial resuelta (o excepción gerencial aprobada); en espera de firma de contrato y abono del depósito de garantía.
5. **`PENDING_DELIVERY` (Pendiente de Entrega):** Contrato formalizado y garantía confirmada; el vehículo se prepara para inspección física y entrega.
6. **`ACTIVE` (Alquiler Activo):** Inspección completada con checklist de 35 fotos y 3 videos; la unidad pasa a estado `RENTED` en Flota y el cliente sale de sede con el vehículo.
7. **`EXTENSION_PENDING` (Ampliación Pendiente):** El cliente solicitó una ampliación del plazo; queda a la espera de la autorización de Gerencia (sección 10.8). Se muestra como *Activo*.
8. **`RETURN_IN_PROGRESS` (Retorno en Curso):** Unidad arribada a sede para chequeo de retorno y liquidación de garantía (módulo Devoluciones).
9. **`CLOSED` (Cerrado):** Vehículo devuelto en conformidad, liquidación de depósito ejecutada y expediente finiquitado.
10. **`CANCELLED` (Cancelado):** Expediente anulado por resultado desfavorable o rechazo de alcolímetro, o por desistimiento previo a la entrega.

Transiciones permitidas: `DRAFT → VALIDATION`, `VALIDATION → NOTARY_EVALUATION`, `NOTARY_EVALUATION → CONTRACTING`, `CONTRACTING → PENDING_DELIVERY`, `PENDING_DELIVERY → ACTIVE`, `ACTIVE → EXTENSION_PENDING / RETURN_IN_PROGRESS / CLOSED`, `EXTENSION_PENDING → ACTIVE` y `RETURN_IN_PROGRESS → CLOSED`. Cualquier etapa anterior a la entrega puede pasar a `CANCELLED`.

#### Las 5 etapas del asistente de entrega
Mientras el expediente no está activo, la pantalla muestra una barra de 5 pasos con un botón fijo **"Continuar"**:

| Paso | Ruta | Contenido | Sección |
|---|---|---|---|
| 1. Cliente y documentos | `/alquileres/:id/entrega-01` | Validación documental presencial | 10.3 |
| 2. Validaciones | `/alquileres/:id/entrega-02` | RENIEC/MTC manual y alcoholímetro | 10.4 |
| 3. Garantía y contrato | `/alquileres/:id/entrega-03` | Matriz notarial, contrato, firma y garantía | 10.5 y 10.6 |
| 4. Checklist | `/alquileres/:id/entrega-04` | 35 fotos, 3 videos y formatos FIV/FCKE | 10.7 |
| 5. Confirmación | `/alquileres/:id/entrega-05` | Resumen y confirmación de entrega | 10.7 |

---

### 10.2 Creación de Alquiler: desde Consulta o desde Reserva Confirmada (RES-05)

**Todo alquiler nace de una Consulta.** No existe un botón de alta directa de alquiler en la bandeja (ALQ-01): el expediente se genera por una de estas dos vías, y la pantalla **"Crear expediente"** (`/alquileres/nuevo`) se abre únicamente desde ellas.

#### Vía A: Convertir una Consulta a Alquiler (CON-04)
* **Acceso:** Desde el detalle de la consulta (sección 7.4), botón **"Convertir a Alquiler"**. Se usa cuando el cliente alquila de inmediato (en mostrador) o decide alquilar sin reservar.
* **Comportamiento del sistema:**
  * La consulta debe estar `COTIZADA`, con cliente formal asociado y una cotización vigente (no vencida); de lo contrario se muestra el error correspondiente (por ejemplo, cotización vencida: volver a cotizar).
  * El vehículo y la duración salen de la cotización vigente más reciente, no de un formulario.
  * Un cliente en semáforo **ROJO** queda bloqueado (`CUSTOMER_BLOCKED`); el estado **ÁMBAR** no bloquea.
  * El vehículo debe estar disponible, pertenecer a la sede (o ser compartido) y no tener reservas o compromisos que se solapen con el periodo; si lo tiene, el sistema responde `VEHICLE_NOT_AVAILABLE`.
  * En una sola operación, la consulta pasa a `CONVERTIDA` y se crea el expediente en estado `DRAFT` vinculado a ella. El expediente se crea **sin fechas de inicio ni de devolución**: el tiempo del alquiler corre desde que se cierra la entrega (sección 10.7).
  * Queda registrado en auditoría y se emite el evento `RentalCreatedFromInquiry.v1`.
* **Cobro:** el alquiler directo **no tiene monto de reserva**; se cobra la **garantía completa** del vehículo (sección 10.6).

#### Vía B: Continuar desde Reserva Confirmada (`RES-05`)
* **Acceso:** Desde la pantalla de detalle de reserva confirmada (`ReservationDetailScreen`), presionar el botón **"Continuar con alquiler"**.
* **Comportamiento del sistema:**
  * Valida que la reserva pertenezca a la empresa y sede del contexto activo.
  * Valida que la reserva se encuentre en estado `CONFIRMED`.
  * Hereda automáticamente los datos del cliente, vehículo asignado, plan tarifario (`NORMAL`, `PLUS`, `LIBRE`) y fechas pactadas (`startAt`, `expectedEndAt`).
  * Genera el expediente de alquiler en estado `DRAFT`, asociando de forma inmutable el ID de la reserva previa.
  * Emite el evento de auditoría y notificación `RentalCreatedFromReservation.v1`.
* **Monto de la reserva (decisión del 6 de octubre de 2026, opción "a"):** los **S/ 300** pagados en la reserva **se trasladan íntegros a la garantía** del alquiler y en la entrega **solo se cobra la diferencia** (sección 10.6). Solo se aplica si la reserva está `CONFIRMED` o `CONVERTED` y su pago fue validado; en caso contrario se cobra la garantía completa. La respuesta formal de Finanzas sobre esta regla sigue pendiente de ratificación (sección 18).

---

### 10.3 Validación Documental Presencial (BR-CON-004) — ENTREGA-01
* **Ruta:** `/alquileres/:id/entrega-01`
* **Regla de Negocio `BR-CON-004`:**
  * **Titulares Peruanos:** Requiere DNI vigente, Licencia de Conducir física y recibo de servicios o comprobante de arraigo domiciliario.
  * **Titulares Extranjeros:** Requiere Pasaporte o Carnet de Extranjería, Licencia de Conducir internacional / de origen, y comprobante de hospedaje o reserva hotelera demostrable.
* **Operación:**
  * Seleccione el **"Tipo de conductor"**: *Titular*, *Acompañante* o *Persona jurídica*.
  * El agente de Front-Office verifica la consistencia física de los documentos y marca las casillas: **"Licencia de conducir válida (obligatoria)"**, **DNI o Pasaporte/CE válido** y **"Comprobante de domicilio / estadía válido"**.
  * Opcionalmente adjunte los respaldos (Licencia, Documento de identidad, Comprobante de domicilio, Estado de cuenta u Otro; formatos JPEG, WEBP, PNG o PDF) y registre **Notas**.
  * El botón **"Continuar"** se habilita cuando están marcadas, como mínimo, la licencia y el documento de identidad. Al confirmar, con el encabezado de concurrencia `If-Match`, el alquiler transiciona de `DRAFT` a `VALIDATION`.

---

### 10.4 Protocolo de Alcolímetro de Tolerancia Cero (BR-ALQ-005) — ENTREGA-02
* **Ruta:** `/alquileres/:id/entrega-02`
* **Verificación de identidad y licencia:** la pantalla incluye las tarjetas **RENIEC** y **MTC** con casillas de verificación **manual**. El sistema **no** consulta esos servicios externos (su integración está excluida del MVP; ver sección 18).
* **Regla de Negocio `BR-ALQ-005`:**
  * El sistema KAIROS ERP aplica una estricta política de **tolerancia cero al alcohol y sustancias psicoactivas** previa a la entrega de cualquier unidad móvil.
* **Registro de la prueba:** seleccione el resultado (**Favorable**, **Desfavorable** o **"Se negó"**), indique **"Fecha y hora de la prueba"** y registre la **"Evidencia / notas"**.
* **Opciones de Registro:**
  * **`FAVORABLE` (0.00 g/l):** El titular aprueba la prueba de aire expirado. El expediente transiciona automáticamente a `NOTARY_EVALUATION` y el botón **"Continuar"** pasa a la etapa siguiente.
  * **`DESFAVORABLE` (> 0.00 g/l) o `RECHAZADO`:** Si el cliente arroja resultado positivo o se niega a someterse a la prueba:
    * La pantalla solo permite continuar con resultado Favorable (*"Solo se puede continuar con resultado Favorable."*).
    * Cuando el resultado no favorable se registra en el sistema, este bloquea de forma irreversible el alquiler: el estado pasa de inmediato a **`CANCELLED`**.
    * Se registra un evento crítico en la bitácora de auditoría (`ALCOHOL_TEST_FAILED_RENTAL_CANCELLED`).
    * Se publica el evento Outbox `AlcoholTestFailed.v1` alertando a Gerencia y Finanzas para la aplicación de penalidades contractuales de la reserva.

---

### 10.5 Matriz Notarial Automática y Tercer Camino / Excepción Gerencial (BR-ALQ-003/004)
* **Reglas de Negocio `BR-ALQ-003` y `BR-ALQ-004`:**
  * **Vehículos Prohibidos de Alto Riesgo:** Los modelos de alta siniestralidad o sustracción de partes (`Toyota Hilux`, `Chevrolet Colorado`, `Hyundai Verna`, `Toyota Yaris`) tienen **trámite notarial obligatorio (`MANDATORY`)** sin excepción posible.
  * **Clientes Recurrentes ("Tercer Camino"):** Clientes con más de 2 alquileres previos cerrados satisfactoriamente y validación biométrica aprobada califican para **`THIRD_PATH_ELIGIBLE`**.
    * El Tercer Camino permite sustituir el trámite notarial presencial mediante firma biométrica o contrato digital simplificado, agilizando la entrega a 10 minutos.
    * **Aprobación Exclusiva de Gerencia:** La excepción notarial no puede ser concedida por operadores de ventanilla; requiere obligatoriamente la autorización formal mediante el permiso `RENTAL.APPROVE_NOTARY_EXCEPTION` con justificación sustentada (mínimo 10 caracteres). Quien no lo tiene ve el mensaje *"No tienes permiso para aprobar o rechazar esta excepción notarial."*
  * **Clientes Nuevos:** Aplica depósito duplicado de salvaguarda (`DOUBLE_DEPOSIT`).
  * Una vez aprobada o resuelta la política notarial, el expediente transiciona a `CONTRACTING`.
* **En la pantalla (ENTREGA-03):** la evaluación notarial se ejecuta **automáticamente** al abrir la etapa y muestra uno de estos resultados: *"Notaría obligatoria"*, *"Doble depósito de garantía"*, *"Elegible para tercer camino (requiere aprobación)"* o *"Revisión manual requerida"*. En el caso de tercer camino aparece el campo de **Motivo/justificación** y el botón **"Aprobar excepción"**.

---

### 10.6 Formalización de Contrato y Depósito en Garantía (BR-DOC-002/003) — ENTREGA-03
* **Ruta:** `/alquileres/:id/entrega-03` (*"Garantía y contrato"*)
* **Regla de Negocio `BR-DOC-002` y `BR-DOC-003`:**
  * Se vincula la plantilla contractual inmutable activa de la empresa (`templateVersionId`) y la referencia documental digital o código de escaneo físico (`documentRef`).
  * Se registra el importe de garantía de depósito (`depositAmount`) y la moneda (`PEN` o `USD`), asociándolo al registro contable del expediente. **Por ahora el monto se digita manualmente**, pero **no puede ser menor al mínimo del vehículo**: la pantalla muestra *"Mínimo requerido: S/ X"* y bloquea el avance si se ingresa menos. Cuando se carguen los montos exactos por vehículo en Flota, se leerán de ahí.
  * En un alquiler sin notaría "bajo consulta" la garantía se duplica; esa excepción solo la autorizan Fiorella o José.
  * Al completar este paso, el expediente transiciona a `PENDING_DELIVERY`.
* **Plantilla del contrato (selector por titular):**
  1. Elija **"Persona natural"** o **"Persona jurídica"** y marque, si corresponde, **"Con conductor distinto del titular"**. De la combinación resultan **4 variantes** de contrato (natural, natural con conductor, jurídica, jurídica con conductor).
  2. La pantalla muestra *"Plantilla: <nombre>"* con la plantilla vigente de la empresa para esa variante. Solo varían la placa, el precio y la garantía; el texto legal es el mismo por variante (`BR-DOC-003`).
  3. Si aún no hay plantilla específica, el sistema usa la **plantilla general de alquiler** y avisa: *"Aún no hay plantilla específica para esta combinación; se usará la plantilla general de alquiler."*
  4. Si no existe ninguna plantilla vigente: *"No hay plantilla de contrato vigente para esta combinación. Pide a Administración que cargue una antes de formalizar."* (sección 9.6).
* **Firma del contrato:** el titular firma en el recuadro **"Firma del contrato"** (obligatoria).
* **Pago de la garantía:**
  * **Medio de pago:** Efectivo, Tarjeta o Transferencia.
  * **"Garantía total (PEN)"** con el mínimo requerido del vehículo.
  * **Pagador:** *"Paga el titular"* o *"Paga un agente externo"*.
* **Desglose con la reserva aplicada (nuevo, decisión P0-03 opción "a"):** cuando el alquiler viene de una reserva válida, la pantalla muestra:

  | Concepto | Significado |
  |---|---|
  | **Garantía total** | Importe de garantía del alquiler |
  | **Reserva aplicada (−)** | Los S/ 300 ya pagados, trasladados íntegros a la garantía |
  | **Diferencia a cobrar** | Lo que efectivamente se cobra en la entrega |

  * Si la reserva de origen no traslada monto (fue cancelada o no está vigente, o su pago no fue validado), se informa que *"se cobra la garantía completa"*.
  * Si la reserva aplicada supera la garantía indicada, el sistema muestra el error *"La reserva aplicada (S/ X) supera la garantía indicada."* y no permite avanzar; la reserva y la garantía deben estar en la misma moneda.
  * El alquiler directo desde consulta no tiene reserva, por lo que se cobra la garantía completa.
* **Formalizar:** el botón **"Formalizar y continuar"** abre la ventana **"¿Formalizar el contrato?"** (acción irreversible, con el desglose) y se confirma con **"Formalizar"**.

---

### 10.7 Entrega Física y Checklist de Inspección con Evidencia Obligatoria (BR-INS-003/004) — ENTREGA-04 y ENTREGA-05
* **Reglas de Negocio `BR-INS-003` y `BR-INS-004`:**
  * Para prevenir fraudes, reclamos infundados de carrocería o pérdidas de accesorios, la entrega física exige un **estándar pericial ineludible**:
    * **Mínimo 35 fotografías:** Cobertura de 360 grados de la carrocería, llantas, aros, techo, salón interior, tablero con odómetro encendido, maletera, llanta de repuesto y kit de emergencia.
    * **Mínimo 3 videos de inspección:** Video panorámico del exterior, video del encendido de motor y funcionamiento de luces/climatizador, y video de la entrega de llaves al titular.
  * **Validación de Bloqueo:** Si el formulario no alcanza al menos 35 fotos y 3 videos, el sistema rechaza la solicitud arrojando un error tipado `MissingDeliveryEvidenceError` con detalle exacto del faltante.
* **ENTREGA-04 "Checklist y evidencias" (`/alquileres/:id/entrega-04`):**
  * Seleccione la **zona** (Frontal, Lateral izquierdo, Lateral derecho, Posterior, Interior) y agregue fotos (JPEG o WebP, hasta 12 MB) y videos (MP4 o WebM, hasta 200 MB). Se muestra el avance de fotos y videos.
  * **Tiempo de inspección:** el mínimo es de 30 minutos técnicos más 15 minutos documentarios. Si se registra menos, aparece la ventana *"Tiempo por debajo del mínimo"*, que exige indicar un motivo y confirmar con **"Continuar con excepción"**.
  * Registre las **"Notas (FIV / FCKE)"** de los formatos de inspección vehicular y control de kit de emergencia.
  * **Trabajo sin conexión:** si se pierde la conexión, las fotos y videos se guardan en el dispositivo y se suben automáticamente al recuperarla (sección 17.2). Los avisos son *"Sin conexión — tu trabajo se guarda en este dispositivo…"*, *"Sincronizando N archivos…"* y *"Confirmado por servidor N fotos · M videos"*.
  * El botón **"Continuar"** solo se habilita **con conexión, sin archivos pendientes de subir y con el servidor confirmando al menos 35 fotos y 3 videos**.
* **ENTREGA-05 "Confirmación de entrega" (`/alquileres/:id/entrega-05`):** muestra un resumen de solo lectura con enlaces **"Editar"** a cada etapa. Presione **"Confirmar entrega"**; la ventana *"¿Confirmar la entrega?"* advierte que *"Esta acción es irreversible y activa el alquiler."* Al completarse, el sistema regresa a la bandeja de alquileres.
  * **Efectos Atómicos al Completar la Entrega:**
    1. El estado del alquiler pasa a **`ACTIVE`**.
    2. El estado del vehículo en el módulo de Flota pasa automáticamente de `AVAILABLE` a **`RENTED`**.
    3. Se fija el inicio del alquiler (`startAt`) en el momento exacto de cierre de la entrega, porque el plazo contractual se cuenta desde la entrega (cláusula 19). En un alquiler creado desde una consulta, la devolución prevista (`expectedEndAt`) se calcula como ese inicio más los días de la cotización; en un alquiler desde reserva se mantienen las fechas pactadas. Antes de cerrar se vuelve a verificar la disponibilidad del vehículo.
    4. Se emite el evento Outbox `EntregaCompletada.v1`.

---

### 10.8 Alquiler Activo, Seguimiento y Ampliación (ALQ-10 y ALQ-11)
* **Ruta:** `/alquileres/:id` (se abre al hacer clic en un alquiler `ACTIVE` o con ampliación pendiente).
* **Resumen:** vehículo, placa, insignia de estado, cliente, **Inicio**, **Devolución prevista** y plan tarifario.
* **Tarjeta "Garantía":** *Garantía total*, *Reserva aplicada* y *Cobrado en la entrega*.
* **Tarjeta "Ampliación":** muestra la última solicitud con su estado (pendiente, autorizada, rechazada o incumplida), la nueva fecha de devolución y cuatro condiciones con su cumplimiento (*cumplido*, *pendiente* o *sin dato*): **"Aviso con 12 h"**, **"Autorización de Gerencia"**, **"Pago del periodo"** y **"Adenda firmada"**.
* **Panel GPS:** hoy muestra siempre *"El seguimiento GPS aún no está conectado a este sistema. La ubicación de {placa} no se muestra."* No se muestra ubicación, kilometraje ni estado del conductor (ver sección 18).
* **Botones:**
  * **"Solicitar ampliación"** (deshabilitado si ya hay una ampliación pendiente).
  * **"Registrar incidencia"** (abre `/incidencias?rentalId=` con el alquiler preseleccionado).
  * **"Iniciar devolución"** (lleva a la recepción de la devolución, sección 11).
  * **"Registrar falta grave"** (solo con ampliación pendiente y permiso `RENTAL.REPORT_EXTENSION_BREACH`; sección 10.9).

#### Solicitud de ampliación (ALQ-11, BR-ALQ-012)
1. Presione **"Solicitar ampliación"** (permiso `RENTAL.REQUEST_EXTENSION`; solo un alquiler `ACTIVE`).
2. Indique la **"Nueva fecha y hora de devolución"**, que debe ser posterior a la devolución prevista. La ampliación no puede superar **3 días** adicionales.
3. La ventana recuerda que la ampliación *"requiere aviso con 12 horas de anticipación, autorización de Gerencia, pago del periodo adicional y adenda firmada (BR-ALQ-012)"* y que, si no se cumplen, Gerencia puede registrar una falta grave (BR-ALQ-013). El sistema exige que la devolución prevista actual esté a **12 horas o más**.
4. Presione **"Enviar solicitud"**: el alquiler pasa a `EXTENSION_PENDING` y se emite el evento `AmpliacionSolicitada.v1`.
5. **Autorización:** el sistema valida que el vehículo no tenga otros compromisos en el periodo ampliado; al autorizarse, el alquiler vuelve a `ACTIVE` con la nueva fecha de devolución (evento `AmpliacionAutorizada.v1`). **Hoy la pantalla no tiene botones para autorizar o rechazar la ampliación** (ver sección 18).

---

### 10.9 Falta Grave por Incumplimiento de Ampliación (BR-ALQ-013)
* **Quién:** Gerencia, con el permiso `RENTAL.REPORT_EXTENSION_BREACH`, sobre un alquiler con ampliación pendiente. Se accede con **"Registrar falta grave"** desde la bandeja o desde el alquiler activo.
* **Ventana "Registrar falta grave — Incumplimiento de ampliación":**
  * Muestra el contexto: expediente, cliente y garantía en depósito.
  * Lista los 4 requisitos de la ampliación con ✓ o ✕ y el contador *"N de 4 cumplidos"*.
  * Explica las consecuencias: **retención total de la garantía**, cliente en semáforo **Rojo** de inmediato, falta grave registrada, y que *"Gerencia decidirá en las próximas 24h si se inicia denuncia formal por apropiación ilícita"*.
  * Exige las **"Observaciones de Gerencia"** y una casilla de confirmación antes de habilitar **"Confirmar falta grave y retener garantía"** (o **"Cancelar — volver a verificar"**).
* **Efectos en el sistema:** la ampliación pasa a `BREACH`, se registra un ajuste de **retención total** sobre la garantía (visible en Pagos y Garantías, sección 15), el cliente pasa a **ROJO**, se deja constancia en auditoría (`EXTENSION_BREACH_REPORTED`) y se emite el evento `FaltaGraveAmpliacionRegistrada.v1`.
* **Alcance:** el sistema **no inicia automáticamente** ningún proceso legal; solo deja la constancia para la evaluación de Gerencia y del área legal. No existe un estado de alquiler llamado "falta grave". Recuerde que el semáforo **nunca retrocede de forma automática**.

---

## 11. Módulo de Devoluciones (DEV-01 a DEV-10)

* **Ruta:** `/devoluciones`
* **Propósito:** Recibir el vehículo al final del alquiler, inspeccionarlo, registrar daños y cargos, y liquidar la garantía hasta cerrar el expediente de devolución.
* **Disponible para:** Front-office y roles con permiso sobre Devoluciones en la sede activa. La decisión ante un alcoholímetro desfavorable corresponde a Gerencia.

---

### 11.1 Ciclo de Vida de la Devolución

La devolución avanza por estados en orden estricto:

1. **`PROGRAMADA`:** Devolución creada a partir de un alquiler activo.
2. **`RECEPCION_PROVISIONAL`:** El vehículo llegó a sede y queda en custodia; todavía no se cierra el contrato.
3. **`INSPECCION`:** Prueba de alcoholímetro, checklist y evidencias en curso.
4. **`SIN_DANOS` / `CON_DANOS`:** Resultado de la inspección.
5. **`CIERRE_FINANCIERO`:** Liquidación de garantía y cargos.
6. **`CERRADA`:** Expediente finiquitado.
7. **`CANCELADA`:** Devolución anulada antes de cerrarse.

La **custodia del vehículo no equivale al cierre contractual**: recibir la unidad no libera la garantía ni cierra el alquiler.

---

### 11.2 Bandeja de Devoluciones y Alquileres Activos (DEV-01)

1. Ingrese desde el menú **Devoluciones** o desde la bandeja de **Alquileres** con el botón **"Iniciar devolución"** (o **"Continuar devolución"** si ya hay una en curso).
2. La bandeja lista las devoluciones de la sede activa con su estado, y un panel con los **alquileres activos** que aún no tienen devolución.
3. Al presionar **"Iniciar devolución"** sobre un alquiler activo, el sistema crea la devolución y lo lleva a la recepción.
4. Un expediente de otra empresa o sede se muestra como *no encontrado*.

---

### 11.3 Recepción Provisional (DEV-02)

1. Registre la llegada del vehículo con sus datos de recepción (fecha y hora, kilometraje y nivel de combustible).
2. Si quien devuelve el vehículo **no es el titular**, registre sus datos en el campo de **notas**; quedan guardados en el expediente.
3. Presione **"Continuar"** para pasar al alcoholímetro.

---

### 11.4 Prueba de Alcoholímetro (DEV-03)

1. Elija el resultado de la prueba entre tres opciones: **"Favorable — puede continuar"**, **"Desfavorable — no puede continuar normalmente"** o **"Se negó a realizar la prueba"**, y complete las **Observaciones**.
2. **Favorable:** se continúa al checklist de inspección (botón **"Continuar al checklist"**).
3. **Desfavorable o se negó:** la devolución **no continúa** al checklist. El vehículo queda en **recepción provisional bajo custodia** y se deriva a **Gerencia** (botón **"Derivar a Gerencia"**); la pantalla advierte que el cliente queda como candidato a "rojo".
4. **Decisión de Gerencia:** los usuarios con el permiso `RESOLVE_ALCOHOL_ESCALATION` ven la sección **"Decisión de Gerencia"**; el resto ve **"Pendiente de decisión de Gerencia"**. Gerencia elige:
   * **Continuar a la inspección:** el expediente sigue su curso.
   * **Mantener el vehículo en custodia de VeloxRent.**
   * La casilla **"Marcar cliente como rojo"** viene marcada por defecto (BR-DEV-005) y puede desmarcarse.
   * El **"Motivo de la decisión"** es obligatorio (mínimo 5 caracteres) en ambas opciones. Se confirma en la ventana *"Confirmar decisión de Gerencia"* con **"Registrar decisión de Gerencia"**; la decisión queda visible en el expediente.
5. Un alcoholímetro desfavorable puede marcar al cliente en **semáforo rojo** (BR-DEV-005).

---

### 11.5 Checklist, Evidencias y Documento de Responsabilidad (DEV-04)

1. **Checklist de recepción** (*"Recepción — {placa}"*: 35 fotos, 3 videos, FIV y FCKE del vehículo devuelto):
   * Elija la **zona** y use **"Agregar fotos"** o **"Agregar video"** (en el celular abren la cámara). El panel **"Progreso por zona"** muestra el avance.
   * En **"Formatos"** marque **"FIV — inspección vehicular completada"** y **"FCKE — control de kit de emergencia completado"**.
2. **Evidencias:** se suben mediante URL firmada. Igual que en la entrega, **si se pierde la conexión las fotos y videos se guardan en el dispositivo y se sincronizan al recuperarla** (sección 17.2); si una subida falla aparece **"Reintentar sincronización"**. El botón **"Continuar a Resultado"** permanece deshabilitado mientras no haya conexión, queden archivos pendientes, el servidor no confirme al menos 35 fotos y 3 videos, o falte la firma del documento.
3. **Documento de responsabilidad:** el texto declara que el titular no registra infracciones (respaldo ante la SAT). Complete **"Nombre de quien firma"**, responda **"¿Quien firma es el titular?"** (Sí/No) y obtenga la **firma** en el recuadro (BR-DEV-009). El botón solo se habilita con el documento firmado.
4. Si **quien firma no es el titular**, el sistema exige indicar su **relación con el titular**.

> **Nota:** el uso de este documento firmado es provisional hasta la validación del área Legal.

---

### 11.6 Resultado de la Inspección: Hub de la Devolución (DEV-05)

1. Muestra el **comparador de zonas** del vehículo (entrega vs. retorno) y el resumen de la inspección.
2. Desde aquí se decide el siguiente paso:
   * **Sin daños:** se pasa directo a la garantía (**"Liberar garantía"**).
   * **Con daños:** se registran los daños antes de continuar. No existe **"Liberar garantía"** mientras haya daños por liquidar.
3. El **semáforo del cliente** (Normal, Ámbar o Rojo) se muestra en pantalla. **El semáforo nunca retrocede:** una vez en un nivel más grave, no baja automáticamente.

---

### 11.7 Registro de Daños (DEV-06, DEV-07, DEV-08)

1. **Gravedad (DEV-06):** clasifique el daño. Un daño **grave** marca al cliente en **ROJO**.
2. **Daño estético (DEV-07):**
   * Elija la **zona dañada**.
   * El **monto lo fija el sistema** según el tarifario del vehículo; se muestra como *"Monto del tarifario"* y no se escribe a mano.
   * Marque **"Cliente acepta el costo"** si corresponde.
   * Presione **"Registrar daño estético"**. El cliente pasa a semáforo **Ámbar**.
   * Si el vehículo no tiene tarifario definido, el sistema rechaza el registro y avisa.
3. **Daño técnico (DEV-08):**
   * Siempre requiere un **informe técnico externo de Motrix**.
   * El **monto se ingresa manualmente**, porque no existe tarifa exacta.
4. Al terminar, presione **"Continuar a garantía"**.

---

### 11.8 Garantía y Cierre (DEV-09 y DEV-10)

1. **Garantía (DEV-09):**
   * **Sin daños:** use **"Liberar garantía"**. Se pide confirmar el **monto exacto** antes de ejecutar.
   * **Con daños:** el costo estético se **descuenta de la garantía**. El monto retenido se mantiene hasta definir si el daño supera la garantía.
   * **Regla de Bloqueo por Incidencias (`BR-INC-001`):** No se permite liberar la garantía ni cerrar la devolución si el alquiler posee una o más incidencias abiertas (`ABIERTA` o en proceso). El sistema rechaza la operación con el error `INCIDENT_STILL_OPEN`.
2. **Inmovilización:** si el vehículo queda inmovilizado más de 24 horas, se cargan los días de inmovilización.
3. **Cierre (DEV-10):** revise el resumen financiero y presione **"Cerrar devolución"**. La pantalla muestra **"Firmado por …"** como dato de solo lectura, tomado del documento de responsabilidad.
4. Al cerrar, la devolución pasa a **`CERRADA`**.

---

### 11.9 Alcance Actual y Pendientes

* **Módulos Integrados y Operativos:** El módulo de Incidencias y Siniestros (INC-01/02) y la administración de Roles Dinámicos (ADM-01/02, ROLES-DIN-01..03) se encuentran plenamente desplegados y operativos. La regla de bloqueo `INCIDENT_STILL_OPEN` garantiza que ningún alquiler con incidentes pendientes sea liquidado sin supervisión técnica.
* **Trabajo sin conexión (parcial):** la captura de evidencias del checklist (DEV-04) y de la entrega funciona sin conexión mediante cola local (sección 17.2), pero **completar** la devolución (continuar a resultado, firmar y cerrar) **requiere conexión**. La devolución completa sin conexión no está disponible.
* **Pendiente:** recordatorio automático antes de la devolución (llamada 3 h antes), cobro automático de inmovilización y alerta de garantía a las 24 h.
* La multa por combustible se digita manualmente por ahora y se definirá por vehículo cuando se conozca la unidad.

---

## 12. Módulo de Incidencias y Siniestros (INC-01 e INC-02)

> **Nota de Seguridad y Acceso:** La gestión de incidentes requiere los permisos del módulo `INCIDENT` (`VIEW`, `CREATE`, `UPDATE`, `CLOSE`, `REFER_LEGAL`). Accesible para roles operativos, de supervisión y administración.

### 12.1 Bandeja General de Incidencias (INC-01)
* **Ruta:** `/incidencias`
* **Propósito:** Supervisión centralizada, filtrado y resolución ágil de siniestros, fallas técnicas, infracciones y contingencias viales ocurridas durante el uso de la flota.
* **Filtros Disponibles:**
  * **Por Estado:** Todas, `ABIERTA`, `CERRADA`, `VIA_LEGAL`.
  * **Por Severidad:** Todas, `LEVE`, `MODERADA`, `GRAVE`.
  * **Por Tipo:** Todos, Pérdida de llave (`KEY_LOSS`), Choque o daño (`CRASH_OR_DAMAGE`), Papeleta o intervención policial (`TRAFFIC_FINE_OR_INTERVENTION`), Remolque (`TOWING`), u Otro (`OTHER`).
* **Visualización:**
  * En escritorio: tabla con columnas Tipo, Severidad (badge de color según impacto), Expediente de Alquiler / Vehículo, Estado, Responsable y Acciones.
  * En móviles: tarjetas adaptativas compactas.
* **Resolución Directa en Bandeja:**
  * Para incidencias de severidad **`LEVE`** y estado **`ABIERTA`**, la bandeja proporciona el botón de acción rápida **"Resolver"** en la misma fila.
  * Solicita un resumen de resolución y ejecuta el cierre inmediato con control de concurrencia optimista (`If-Match`), agilizando eventos menores sin necesidad de navegar a la vista de detalle.

---

### 12.2 Registro de Nueva Incidencia
* **Desde un alquiler:** el botón **"Registrar incidencia"** de la pantalla del alquiler activo (sección 10.8) abre este formulario con el alquiler ya seleccionado (`/incidencias?rentalId=`).
* **Acción:** Presione el botón **"+ Registrar incidencia"** ubicado en la cabecera de la bandeja.
* **Campos del Formulario (`RegisterIncidentDialog`):**
  1. **Expediente de Alquiler / Unidad:** Búsqueda y vinculación del contrato o vehículo afectado. Puede quedar sin contrato si la incidencia ocurre en traslado interno de flota.
  2. **Tipo de Incidente:**
     * `KEY_LOSS`: Pérdida de llave o control remoto.
     * `CRASH_OR_DAMAGE`: Colisión, abolladura, rotura de lunas o siniestro de tránsito.
     * `TRAFFIC_FINE_OR_INTERVENTION`: Fotopapeleta, intervención de serenazgo/policía o internamiento.
     * `TOWING`: Traslado en grúa por inmovilización mecánica.
     * `OTHER`: Contingencias atípicas.
  3. **Severidad del Evento:**
     * `LEVE`: Afectación menor que no impide la continuidad del servicio ni genera riesgo jurídico.
     * `MODERADA`: Daño parcial o infracción que demanda seguimiento técnico o retención de garantía.
     * `GRAVE`: Siniestro mayor, pérdida total, sustracción o proceso judicial inminente.
  4. **Descripción de los Hechos:** Relato pormenorizado del suceso, lugar, personas involucradas y medidas inmediatas adoptadas (hasta 2,000 caracteres).
* Presione **"Guardar Incidencia"**. Al registrarse, el incidente adopta el estado inicial **`ABIERTA`** e inserta el evento inicial inmutable en su historial (`REPORTED`).

---

### 12.3 Detalle, Timeline y Seguimiento de Incidencia (INC-02)
* **Ruta:** `/incidencias/:id`
* **Propósito:** Registro pormenorizado de gestiones, coordinación con talleres y aseguradoras, y resolución formal del expediente.
* **Características Clave:**
  * **Historial Inmutable (Append-Only):** La bitácora cronológica almacena cada intervención (`REPORTED`, `ACTION`, `RESOLVED`, `CLOSED`, `REFERRED_LEGAL`) con usuario responsable y sello de tiempo. Ninguna entrada histórica puede ser editada ni eliminada.
  * **Agregar Nueva Acción:** Campo de texto interactivo con foco automático para documentar gestiones operativas (ej. *'Grúa arribó a kilómetro 45'*, *'Peritaje de aseguradora en curso'*).
  * **Cerrar Incidencia:** Disponible cuando la contingencia ha sido solventada. Requiere de forma obligatoria redactar un **Resumen de Resolución** antes de habilitar la confirmación. El estado pasa a **`CERRADA`**.
  * **Derivar a Vía Legal:** Para controversias mayores (fuga del conductor, negativa de pago de daños, denuncias penales), abre el diálogo modal `ReasonDialog` exigiendo el fundamento legal del traslado. Pasa el expediente a **`VIA_LEGAL`**.
  * **Control de Concurrencia:** Utiliza validación de versiones (`If-Match`) para evitar sobreescritura de actuaciones por operadores concurrentes.

---

### 12.4 Reglas de Negocio y Bloqueo de Devoluciones (BR-INC-001)
* **Bloqueo Estricto de Cierre:** Mientras un alquiler registre una o más incidencias en estado **`ABIERTA`**, el Módulo de Devoluciones no permite la liberación de garantías ni el cierre financiero del expediente (`DEV-09` / `DEV-10`).
* **Mensaje del Sistema:** La tentativa de cierre genera el rechazo inmediato con código **`INCIDENT_STILL_OPEN`**: *"No se puede liquidar la garantía ni cerrar la devolución porque existen incidencias abiertas vinculadas a este alquiler. Resuelva o cierre las incidencias antes de continuar."*

---
## 13. Módulo de Reclutamiento y Selección (REC-01 a REC-08)

> **Nota de Seguridad y Acceso:** La gestión de talento humano requiere los privilegios del módulo `RECRUITMENT` (`VIEW_VACANCY`, `CREATE_VACANCY`, `PUBLISH_VACANCY`, `MANAGE_CANDIDATES`, `INTERVIEW`, `DECIDE_CANDIDATE`, `ONBOARDING`, `EVALUATE_PROBATION`). Accesible desde la tarjeta **"Reclutamiento"** del menú.

### 13.1 Bandeja y Registro de Necesidades de Personal (REC-01)
* **Ruta:** `/reclutamiento`
* **Propósito:** Centralizar las solicitudes de contratación y monitorear el estado de cada requerimiento por área y sede.
* **Columnas de la Bandeja:** Puesto, Área / Departamento, Fuente de la vacante (`Renuncia`, `Crecimiento`, `Área nueva`), Estado actual y botón de acceso "Abrir".
* **Filtros por Estado:** Todas, `Necesidad registrada`, `Publicada`, `En negociación`, `Decidida`, `Cancelada`, `Pausada`.
* **Crear Necesidad de Personal:**
  1. Presione **"+ Crear necesidad"** (requiere permiso `CREATE_VACANCY`).
  2. Ingrese el Puesto requerido (ej. *'Mecánico Automotriz de Taller'*, *'Asesor de Mostrador'*).
  3. Indique el Área solicitante (Operaciones, Front Office, Mantenimiento, etc.).
  4. Seleccione la Fuente del requerimiento (`RENUNCIA`, `CRECIMIENTO`, `NUEVA_AREA`).
  5. Active el interruptor **"Es vacante de mecánico"** (`isMechanic`) si la posición corresponde a mantenimiento o mecánica vehicular.
  6. Presione **"Crear vacante"**. La posición se inicia en estado **`NECESIDAD_REGISTRADA`**.
* **Pausar y reanudar una vacante (nuevo):** con el permiso `PUBLISH_VACANCY`, las vacantes `PUBLICADA` muestran el botón **"Pausar"** y las `PAUSADA` el botón **"Reanudar"**, tanto en la fila de la bandeja como en el perfil de la vacante.
  * **"Pausar vacante":** la vacante *"dejará de recibir candidatos nuevos hasta que la reanudes. Los candidatos actuales se conservan."* Puede indicar un **Motivo** opcional (hasta 500 caracteres), que queda en auditoría. Mensaje de éxito: *"La vacante quedó pausada."*
  * **"Reanudar vacante":** la vacante vuelve a `PUBLICADA` (*"La vacante se reanudó y vuelve a estar publicada."*).
  * Si el estado no lo permite, el sistema informa que solo se puede pausar una vacante publicada o en negociación y reanudar una pausada.

---

### 13.2 Perfil, Requisitos y Publicación de la Vacante (REC-02)
* **Ruta:** `/reclutamiento/vacantes/:id`
* **Propósito:** Especificar el perfil de puesto y formalizar la convocatoria en los canales autorizados.
* **Formulario de Publicación:**
  * **Descripción de Funciones:** Detalle de tareas clave, responsabilidades y competencias requeridas.
  * **Remuneración Base:** Rango salarial ofrecido en PEN.
  * **Horario y Turno:** Jornada laboral, esquema de turnos o días de descanso.
  * **Canales de Publicación:** Selección de medios de difusión (`Facebook`, `Recomendación`, `Institutos técnicos`).
  * **Regla Obligatoria para Mecánicos (`BR-REC-004`):** Si la vacante posee el flag técnico activo (`isMechanic`), el sistema exige obligatoriamente incluir el canal **'Institutos técnicos'** entre las opciones seleccionadas.
* Presione **"Publicar vacante"** (requiere permiso `PUBLISH_VACANCY`). El estado avanza a **`PUBLICADA`**.

---

### 13.3 Tablero Kanban de Candidatos por Vacante (REC-03)
* **Ruta:** `/reclutamiento/vacantes/:id/candidatos`
* **Propósito:** Visualización dinámica del avance de postulantes en el embudo de selección.
* **Etapas del Tablero:**
  1. **Nuevo (`NUEVO`):** Postulantes recién registrados en el sistema.
  2. **Contactado (`CONTACTADO`):** Candidatos con contacto inicial y prefiltro completado.
  3. **Entrevista (`ENTREVISTA`):** Candidatos convocados a entrevista personal o técnica.
  4. **Decisión (`DECISION`):** Finalistas con entrevistas concluidas listos para deliberación.
* **Principio de Decisión Humana:** El sistema prescinde de filtros automatizados o algoritmos opacos de descarte. La transición entre etapas es manual mediante el menú **"Mover a…"** de cada tarjeta de candidato, permitiendo avanzar exclusivamente hacia adelante para garantizar la integridad histórica del proceso.

---

### 13.4 Ficha de Postulante y Enmascarado de Datos (REC-04)
* **Ruta:** `/reclutamiento/candidatos/:id`
* **Alta de Candidatos:** Botón **"+ Agregar candidato"** en el tablero: nombres completos, DNI/documento, teléfono, correo y pretensión salarial. Opcionalmente se puede adjuntar el **CV** (PDF, Word `.docx`, JPG o PNG, hasta 10 MB), que se sube después de crear al candidato; si la subida falla, el candidato igualmente queda creado y el sistema avisa que el CV no se pudo subir para reintentarlo desde la ficha.
* **Secciones de la ficha:** *Datos generales*, *Contacto y CV*, *Negociación* y *Entrevistas*.
* **Enmascaramiento de Datos Sensibles:** Para usuarios sin permisos directos de gerencia o gestión confidencial de personal, la información de contacto y documentos privados se muestra oculta bajo un ícono de candado (*"Este dato requiere permiso adicional"*), manteniendo visibles la trayectoria laboral y los atributos profesionales.
* **CV del candidato:** **"Subir CV"** (o **"Reemplazar CV"**) y **"Ver CV"**, que abre el archivo mediante un enlace firmado temporal (válido por unos minutos; si caduca basta volver a presionar "Ver CV").
* **Guía Salarial:** Expone la pretensión económica del postulante en paralelo a la remuneración base de la vacante para orientar la negociación salarial.
* **Condiciones de negociación (nuevo):** el botón **"Registrar negociación"** abre un formulario con:
  * **Resultado:** *En curso*, *Acordada* o *No acordada*.
  * **"Lo que ofrecemos":** sueldo ofrecido, horario y otras condiciones.
  * **"Lo que plantea el candidato":** pretensión, horario, condiciones y fecha de incorporación.
  * **Acuerdo:** el *sueldo acordado* es obligatorio si el resultado es *Acordada*. Al acordar, el candidato pasa a la etapa **Entrevista**. Si es *No acordada*, el **Motivo** es obligatorio.
  * La sección **"Historial de negociación"** conserva todos los registros. Desde la ficha también están los botones **"Acordar y continuar"** y **"Descartar"**.

---

### 13.5 Agendamiento con Directorio de Entrevistadores (REC-05)
* **Ruta:** `/reclutamiento/candidatos/:id/entrevista`
* **Directorio de Evaluadores:** Combobox accesible (`InterviewerPicker`) sincronizado con el directorio de la organización (`GET /interviewers`), permitiendo buscar por nombre o correo y preseleccionando automáticamente al usuario conectado si pertenece al equipo evaluador.
* **Agendamiento:** Definición de fecha, hora, modalidad (presencial en local u online) y notas preparatorias.

---

### 13.6 Evaluación y Registro de Resultados de Entrevista (REC-06)
* **Formulario de Calificación:**
  * **Notas de la Entrevista:** Apreciaciones cualitativas sobre dominio técnico, actitudes y desempeño en situaciones laborales.
  * **Dictamen:** Selección binaria directa entre **`Avanza`** o **`No avanza`** (sin escalas cuantitativas ambiguas).
* Al registrarse el resultado, el dictamen se vincula al expediente del candidato permitiendo su pase a la columna de **Decisión**.

---

### 13.7 Decisión de Contratación y Oferta Laboral (REC-07)
* **Ruta:** `/reclutamiento/candidatos/:id/decision`
* **Propósito:** Formalización de la oferta o resolución de cierre con el postulante finalista.
* **Acciones Definitivas:**
  * **Contratar (`CONTRATADO`):** Abre la ventana modal de contratación, confirmando las condiciones salariales y la fecha de ingreso propuesta (calculada por defecto para el siguiente día laborable).
  * **No contratar (`RECHAZADO`):** Abre el diálogo `DiscardCandidateDialog`, donde se ingresa de forma obligatoria el motivo de descarte para fines de auditoría y estadística de selección.

---

### 13.8 Onboarding y Período de Prueba de 30/60/90 Días (REC-08)
* **Incorporación (`/reclutamiento/candidatos/:id/incorporacion`):**
  * Habilitada únicamente tras confirmar el estado `CONTRATADO`.
  * **Checklist de Ingreso:** Verificación documental rigurosa:
    1. Inducción y capacitación de bienvenida completadas.
    2. Asignación de credenciales de acceso y entrega de herramientas/dispositivos.
    3. Documento de responsabilidad firmado.
    4. *Contrato Notariado:* Si la vacante correspondió al perfil técnico de Mecánico (`isMechanic`), se exige validar la suscripción y legalización notarial del contrato de trabajo.
  * **Alta en Personal:** la persona contratada se registra como colaboradora desde el módulo **Personal** con **"Nueva persona"** (sección 14.2). Es un registro distinto del candidato y del cliente. Hoy el alta no se dispara automáticamente desde esta pantalla (ver sección 18).
* **Período de Prueba (`/reclutamiento/candidatos/:id/periodo-de-prueba`):**
  * Seguimiento del trimestre legal de prueba.
  * El sistema calcula de forma dinámica los días restantes para culminar los 3 meses (`probationDaysRemaining`). Si se procede a evaluar antes del plazo, advierte la antelación y requiere doble confirmación.
  * **Honorarios de la prueba (nuevo):** la tarjeta **"Honorarios de la prueba"** (requiere los permisos `EVALUATE_PROBATION` y ver datos sensibles del candidato) permite registrar los **Honorarios mensuales (S/)**, el **Sueldo posterior a la prueba** (opcional) y la **Jornada o notas**, con **"Registrar honorarios"** (luego **"Editar honorarios"**). Mensaje de éxito: *"Honorarios del periodo de prueba registrados."* Son datos de registro: **el sistema no calcula nada** y, una vez evaluada la prueba, los honorarios quedan bloqueados.
  * **Evaluación del Mes 3:**
    * **Aprobación (`APTO`):** El colaborador supera el período probatorio y queda ratificado para incorporación a planilla permanente en el mes 4.
    * **Desaprobación (`NO_APTO`):** Se formaliza el cese laboral por no superación del período de prueba con apego a las normativas de la legislación laboral.
    * Una prueba ya evaluada no puede evaluarse nuevamente.

---

## 14. Módulo de Administración de Personal (ADP-01 a ADP-10)

> **Nota de Seguridad y Acceso:** el módulo exige los privilegios `HR_ADMINISTRATION`: `VIEW_EMPLOYEES`, `MANAGE_EMPLOYEES`, `LOG_ATTENDANCE`, `AUTHORIZE_LEAVE`, `SCHEDULE_VACATION`, `REQUEST_FIELD_TRIP`, `AUTHORIZE_FIELD_TRIP`, `EVALUATE_FIELD_TRIP_RETURN`, `TERMINATE_EMPLOYMENT` y `REGISTER_TRAINING`. Cada botón aparece solo si el usuario tiene el permiso correspondiente. Se accede desde la tarjeta **"Personal"** del menú.

* **Ruta base:** `/personal`
* **Propósito:** gestionar a las personas que trabajan en la empresa: su ficha, asistencia, permisos, vacaciones, salidas a campo, término de relación laboral y capacitaciones, con las reglas de negocio de la empresa aplicadas por el sistema.
* **Estados de la relación laboral:** *Periodo de prueba*, *Planilla* y *Terminado*.

### 14.1 Bandeja de Personal (ADP-01)
* **Ruta:** `/personal`
* **Accesos superiores:** **"Asistencia del mes"**, **"Salidas a campo"** (para quien puede solicitar, autorizar o evaluar salidas), **"Capacitación"** (permiso `REGISTER_TRAINING`), **"Solicitar mi salida a campo"** (permiso `REQUEST_FIELD_TRIP`) y **"Nueva persona"** (permiso `MANAGE_EMPLOYEES`).
* **Filtros:** Empresa, Área, Relación laboral y búsqueda *"Buscar por nombre o documento"*.
* **Tabla:** Nombre, Área, Empresa, Relación laboral y el botón **"Abrir ficha"**. Se cargan hasta 100 registros por vez con **"Cargar más"**.
* Sin el permiso de lectura se muestra *"No tienes acceso a la información del personal."*

### 14.2 Alta de una Persona: "Nueva persona"
* **Ruta:** `/personal/nuevo` (permiso `MANAGE_EMPLOYEES`).
* **Campos:** Nombre completo, Tipo de documento (por defecto DNI), Número de documento, **Área** (se elige de las existentes o se escribe una nueva), Cargo, Fecha de ingreso, Correo (opcional), Teléfono (opcional) y Sueldo base (opcional).
* Presione **"Registrar persona"**. Si el correo coincide con el correo de acceso de un usuario del sistema, la ficha queda vinculada a ese usuario.
* La persona es un registro **distinto** del Candidato (Reclutamiento) y del Cliente. El sistema rechaza un documento duplicado y avisa si el candidato indicado ya fue registrado como persona. La pantalla admite un vínculo opcional con un candidato contratado (`?candidateId=`), pero hoy Reclutamiento no tiene un enlace automático hacia ella (sección 18).

### 14.3 Ficha de la Persona
* **Ruta:** `/personal/:id`
* **Datos laborales:** Documento, Puesto, Área, Empresa y sede, Fecha de ingreso, Contacto y **"Tardanzas en salidas a campo"** (con la insignia **"Observado"** cuando corresponde), más un enlace al proceso de Reclutamiento de origen.
* **Botones "Gestionar":** Asistencia, Permisos, **"Solicitar vacaciones"** (`SCHEDULE_VACATION`), **"Solicitar salida a campo"** y **"Registrar renuncia o despido"** (`TERMINATE_EMPLOYMENT`; se oculta si la persona ya está terminada).
* **"Asistencia acumulada":** Presentes, Tardanzas, Faltas justificadas, Faltas injustificadas y **"Descuento pendiente (fin de mes)"**.
* **Listados:** Permisos recientes, Vacaciones recientes, **"Memos de advertencia"** (con la etiqueta *"generado automáticamente"*), Capacitaciones y Salidas a campo recientes.

### 14.4 Asistencia del Equipo y Descuentos de Fin de Mes (ADP-02)
* **Ruta:** `/personal/asistencia?mes=`
* **Tabla mensual** con selector de mes: Persona, Área, Tardanzas, Faltas injustificadas, Descuento y Estado (*Aplicado*, *Pendiente de fin de mes* o *Sin descuento*), con el enlace **"Ver asistencia"**.
* **"Aplicar descuentos de fin de mes"** (permiso `MANAGE_EMPLOYEES`): solo se habilita **a partir del último día del mes** (hora de Lima). Abre una ventana de confirmación con el **monto exacto** a descontar; al confirmar se informa *"Descuentos aplicados: S/ X a N persona(s)."*
* **Regla `BR-ADP-001`:** el descuento por falta injustificada es el **sueldo base ÷ 30** por día; la tardanza se descuenta proporcionalmente a los minutos (valor diario ÷ 480 × minutos). Los descuentos se registran como *pendientes* y **se aplican al cierre del mes, nunca en la quincena**. Las faltas justificadas, los permisos y los días presentes no descuentan.

### 14.5 Asistencia de la Persona y Registro de Marcaciones
* **Ruta:** `/personal/:id/asistencia`
* Muestra un **calendario** del mes. El botón **"Registrar marcación"** (permiso `LOG_ATTENDANCE`) abre el formulario: **Fecha**, **"Resultado del día"** (*Presente*, *Tardanza*, *Permiso* o *"Falta (se continúa para justificarla)"*), **"Minutos de tardanza"**, hora de entrada y salida (opcionales) y **Observaciones**.
* El registro es **manual**: el sistema no importa marcaciones de reloj biométrico (ver sección 18).

### 14.6 Falta: Justificación, Reclasificación y Memo (ADP-03)
* **Ruta:** `/personal/:id/asistencia/falta?fecha=`
* Se llega al registrar un día como falta. La pantalla muestra el **"Historial de faltas y tardanzas del mes"** y el formulario **"¿Se justifica la falta?"**:
  * **Justificada sin descuento:** la justificación es obligatoria.
  * **Injustificada con descuento:** el monto lo **calcula el sistema** y se muestra en solo lectura.
* **Memo de advertencia (`ADP-P03`):** a partir de la **2ª falta injustificada del mes** el sistema genera automáticamente un memo de advertencia (*"Memo de advertencia generado automáticamente"*). La pantalla anticipa el aviso *"Esta es la 2ª falta del mes — corresponde un memo de advertencia."* (la vista previa cuenta las faltas del mes; el memo real se genera con las injustificadas).
* **Reclasificar:** el botón **"Marcar como injustificada"** o **"Justificar esta falta"** pide un motivo de al menos 5 caracteres y se confirma con **"Guardar cambio"**. No se puede reclasificar una falta cuyo descuento ya fue aplicado. La reclasificación se vuelve a evaluar para el memo.
* La sección **"Descuento de fin de mes"** incluye **"Aplicar descuento"** (ver 14.4).
* **Los memos solo los genera el sistema** (nunca se escriben a mano), no se duplican y quedan registrados en auditoría.

### 14.7 Permisos (ADP-04)
* **Ruta:** `/personal/:id/permisos`
* **Tipos:** *Permiso por horas*, *Salida antes de hora*, *Licencia médica* y *Asunto personal*. **Estados:** *Solicitado*, *Autorizado* y *Denegado*.
* **"Solicitar un permiso":** Fecha, Tipo, Desde/Hasta hora (opcionales) y Motivo; presione **"Solicitar permiso"**. Mensaje: *"Solicitud de permiso registrada. Queda pendiente de autorización."*
* **Sustento:** mientras el permiso está *Solicitado* se puede usar **"Adjuntar sustento (foto o PDF, hasta 10 MB)"** (JPEG, PNG, WEBP o PDF; hasta 5 archivos por permiso). Los archivos aparecen como *"Sustento N"*; sin archivos se lee *"Sin sustento adjunto."*
* **Autorización:** los botones **"Aprobar"** y **"Denegar"** solo los ve quien tiene `AUTHORIZE_LEAVE`. Es una **aprobación de un solo paso**; no pasa por la cascada de niveles de las salidas a campo.

### 14.8 Vacaciones (ADP-05)
* **Ruta:** `/personal/:id/vacaciones`
* En **"Elige tus fechas"** indique Desde/Hasta y presione **"Solicitar"**. El sistema verifica en tiempo real (*"Verificando disponibilidad de tu área…"*).
* **Regla `BR-ADP-002`:** **máximo una persona del área de vacaciones a la vez**. Tiene prioridad quien solicitó primero. Si hay cruce aparece el aviso con las fechas ocupadas y no se permite solicitar.
* Al solicitar con éxito: *"Vacaciones programadas."* La lista muestra cada solicitud con su estado: *Solicitada*, *Programada*, *Reprogramada*, *Cancelada* o *Completada*.

### 14.9 Salida a Campo: Solicitud, Autorización y Regreso (ADP-06, ADP-07, ADP-08)
1. **Solicitud (ADP-06):** `/personal/salida-a-campo` (para uno mismo) o `/personal/:id/salida-a-campo`. Pantalla pensada para el celular: el **Área** aparece de solo lectura; complete **"Tema de la salida"**, **"Destino"**, **"Hora de salida (hoy)"** y **"Hora estimada de retorno"** y presione **"Enviar solicitud"**.
   * Aviso: *"La solicitud pasa por 3 niveles de autorización, 5 minutos por nivel. Si nadie responde, la salida no se autoriza."*
   * **Requiere conexión**: sin internet se muestra un mensaje bloqueante (*"Necesitas conexión a internet para solicitar una salida a campo — esta solicitud no se puede guardar sin conexión"*) y nada se guarda en el dispositivo.
   * Si el usuario no está vinculado a una ficha de personal, el sistema lo informa.
2. **Listado (`/personal/campo`):** secciones **"Por autorizar"**, **"En campo, esperando el regreso"** y **"Cerradas o sin autorización"**, con los botones *Abrir*, *Registrar regreso* o *Ver*. Estados: *Esperando nivel 1/2/3*, *Autorizada*, *Sin autorización*, *Cerrada* y *Cerrada con persona observada*.
3. **Autorización en cascada (ADP-07, `BR-ADP-004`)**, en `/personal/campo/:tripId/autorizacion`:
   * La solicitud recorre **exactamente 3 niveles de 5 minutos cada uno** (*"Nivel 1 de 3"*, *"Nivel 2 de 3"*, *"Nivel 3 de 3"*). La pantalla muestra una cuenta regresiva y se actualiza sola cada 10 segundos.
   * Quien tiene `AUTHORIZE_FIELD_TRIP` puede **"Aprobar"** o **"Rechazar"**. Al rechazar, el **"Motivo del rechazo"** es obligatorio (mínimo 5 caracteres) y se confirma con **"Confirmar rechazo"**: *"Salida rechazada. La persona no sale."*
   * Si un nivel no responde en 5 minutos, la solicitud pasa automáticamente al siguiente nivel. Si **ningún nivel responde a tiempo**, la salida queda **sin autorización** (*"Sin autorización"*). No existe un cuarto nivel ni aprobación automática.
4. **Regreso (ADP-08, `BR-ADP-005`)**, en `/personal/campo/:tripId/regreso`: registre la **"Hora real de regreso"** y las **Observaciones**. Las tres primeras tardanzas al regresar son una **advertencia** y la salida se cierra normalmente; a la **4ª tardanza** la persona pasa a **observada** y el sistema genera el memo automático de advertencia por retorno tardío. La pantalla muestra una vista previa (*"Llegó N min tarde: sería la Nª tardanza…"*) y el botón correspondiente (*"Registrar esta tardanza como advertencia"*, *"Registrar tardanza (4ª) y marcar como observado"* o *"Cerrar"*).

### 14.10 Término de la Relación Laboral (ADP-09)
* **Ruta:** `/personal/:id/termino` (permiso `TERMINATE_EMPLOYMENT`).
* Elija **Renuncia** o **Despido**:
  * **Renuncia:** **"Fecha de aviso"**, **"Último día trabajado"** y la confirmación de que la **quincena pendiente fue pagada** (obligatoria).
  * **Despido:** **"Motivo del despido"** (mínimo 5 caracteres), **"Sanciones previas registradas"** y la casilla **"Con aviso de 15 días (por reincidencia)"**.
  * **"Pago pendiente (S/, opcional)"**.
* La ventana *"¿Confirmar el término de X?"* exige marcar **"Entiendo que el término es irreversible"**. Al confirmar, la persona pasa a *Terminado* y el sistema genera una **vacante en Reclutamiento** poco después.

### 14.11 Capacitaciones (ADP-10)
* **Ruta:** `/personal/capacitacion` (permiso `REGISTER_TRAINING`).
* **"Registrar capacitación":** **Tema** (hasta 200 caracteres), **Fecha** (no puede ser futura), **Asistentes** (búsqueda con casillas; solo personal no terminado) y **"Notas sobre comprensión general"** (hasta 2000 caracteres). La duración de referencia es de **aproximadamente 1 hora** y no bloquea el registro.
* Presione **"Registrar taller"**; los talleres quedan en **"Talleres registrados"** y en la ficha de cada asistente. No es una evaluación formal de desempeño (`BR-ADP-007`).

---

## 15. Módulo de Pagos y Garantías (PAG-01 y PAG-02)

> **Acceso:** permisos `PAYMENT`: `READ_LIST`, `READ_DETAIL`, `REGISTER_ADJUSTMENT`, `APPROVE_REFUND` y `CLOSE_FINANCIAL`.

### 15.1 Bandeja de Garantías (PAG-01)
* **Ruta:** `/pagos/garantias`, tarjeta **"Pagos y Garantías"**.
* **Tarjetas de resumen:** *En custodia* (con el monto retenido), *Parcialmente retenidas*, *Devueltas* y *Retenidas definitivas*.
* **Filtro por Estado** y tabla con **Alquiler**, **Cliente**, **Monto original**, **Saldo neto**, **Estado**, **Registrado** y **"Ver detalle"**. Se cargan 20 registros por vez con **"Cargar más"**.
* **Estados de la garantía:** `HELD` (*En custodia*), `PARTIALLY_RETAINED` (*Parcialmente retenida*), `RETURNED` (*Devuelta*) y `RETAINED` (*Retenida*).

### 15.2 Detalle de la Garantía y Ajustes (PAG-02)
* **Ruta:** `/pagos/garantias/:depositId`
* **Encabezado:** *Monto original*, *Total ajustado* y *Saldo neto*.
* **"Historial de ajustes":** los ajustes son **definitivos** y no pueden modificarse ni eliminarse (`BR-PAG-003`). Tipos:
  * *Descuento por daño estético*.
  * *Retención total* (por ejemplo, la que genera la falta grave de la sección 10.9).
  * *Liberación de fondos*.
  * *Cargo por inmovilización*.
* **"+ Registrar ajuste"** (permiso `PAYMENT.REGISTER_ADJUSTMENT`): elija el **Tipo**, el **Monto** (mínimo S/ 0.01) y el **Motivo** (entre 5 y 500 caracteres).
* **"Aprobar devolución de garantía"** (permiso `APPROVE_REFUND`): deshabilitado si el expediente ya es terminal o si existe una retención total.
* **"Cerrar expediente financiero"** (permiso `CLOSE_FINANCIAL`). Los estados `RETURNED` y `RETAINED` son terminales.

---

## 16. Módulo de Reportes (REP-01)

* **Ruta:** `/reportes` (permiso `REPORT.READ_OPERATIONAL` o `REPORT.READ_FINANCIAL`; sin ellos se muestra *"Acceso restringido"*).
* **Rango de fechas:** **Desde/Hasta**, por defecto los últimos 30 días y con un máximo de **90 días** (`BR-REP-005`; un rango inválido muestra *"Fechas inválidas."*).
* **Pestaña Operativo:** indicadores *Alquileres activos*, *Devoluciones pendientes*, *Flota disponible*, *Reservas activas* e *Incidencias abiertas*; el gráfico **"Alquileres diarios"**; **"Utilización de flota"** (alquilados, en devolución y disponibles, con la *Tasa de utilización*) y **"Actividad reciente"**.
* **Pestaña Financiero:** *Ingresos del período*, *Garantías en custodia*, *Garantías devueltas*, *Garantías retenidas*, *Parcialmente retenidas* y *Neto retenido*.
* **"Exportar CSV"** (permiso `REPORT.EXPORT`) descarga los datos del reporte consultado.
* Esta primera versión no incluye reportes de siniestralidad, rentabilidad por vehículo ni cumplimiento de asistencia. La pestaña Financiero aún espera la aprobación visual del área de Producto (sección 18).

---

## 17. Búsqueda Global y Trabajo sin Conexión

### 17.1 Búsqueda Global (BUS-01)
* **Acceso:** el **ícono de lupa** de la barra superior (no existe un atajo de teclado). Se cierra con **ESC**.
* **Uso:** escriba al menos **2 caracteres** en *"Buscar por nombre, documento, placa o expediente..."*; los resultados aparecen automáticamente tras una breve pausa. Muestra hasta 5 coincidencias por grupo, con el encabezado *"N coincidencia(s)"*.
* **Grupos:** Alquileres, Reservas, Clientes, Vehículos y Devoluciones. No busca personal ni candidatos.
* **Navegación:** use las flechas ↑ ↓ y **ENTER**, o haga clic; el sistema abre la pantalla correspondiente. Sin resultados: *"No encontramos resultados para 'x'"*.

### 17.2 Sincronización de Evidencias sin Conexión (TR-08)
* **Alcance:** la subida de **fotos y videos** de la **entrega** (sección 10.7) y de la **recepción de devolución** (sección 11.5). Las evidencias se guardan en el dispositivo (base local) cuando no hay internet y se suben solas al volver la conexión.
* **Qué ve el usuario:** avisos de *"Sin conexión"*, *"Sincronizando N archivos…"* y *"Confirmado por servidor N fotos · M videos"*; si una subida falla, el botón **"Reintentar sincronización"**.
* **Lo que sí requiere conexión:** continuar a la etapa siguiente, confirmar la entrega, completar la devolución y **solicitar una salida a campo**. El avance solo se habilita cuando el servidor confirma las evidencias mínimas (ADR-KAI-004).
* **Cerrar sesión:** si hay trabajo pendiente de sincronizar, el sistema pide confirmación antes de cerrar la sesión (sección 3.1).

---

## 18. Módulos en Construcción (Hoja de Ruta)

Lo que sigue **no está disponible hoy** para el usuario final, o lo está de forma parcial. Se incorporará en próximas etapas.

### 18.1 Funcionalidades en construcción
1. **Perfil de usuario (TR-09):** el servicio que consolida los datos del perfil del usuario ya existe, pero **la pantalla de perfil todavía está en desarrollo** y no forma parte de la versión publicada. Hoy no hay ruta de perfil; el menú del avatar solo ofrece cambio de empresa/sede y cierre de sesión.
2. **Autorizar o rechazar una ampliación de alquiler (ALQ-11):** la solicitud existe (sección 10.8), pero **no hay botones en pantalla** para que Gerencia autorice o rechace; hoy solo está disponible el registro de falta grave.
3. **Seguimiento GPS del alquiler activo (ALQ-10):** el panel indica que el GPS no está conectado. Falta definir el proveedor y la especificación.
4. **Verificación RENIEC / MTC:** se hace de forma **manual** (casillas de verificación). La integración con ambos servicios está excluida del MVP y requeriría proveedor, API, credenciales y decisión de arquitectura.
5. **Consulta virtual con evidencia en video 360°:** el botón de envío de evidencia aparece deshabilitado (sección 7.3).
6. **Alta automática de personal desde Reclutamiento:** el candidato contratado se registra con **"Nueva persona"** (sección 14.2); falta el enlace directo desde la incorporación.
7. **Asistencia por importación o biométrico:** el registro de asistencia es manual; la importación está pendiente del formato del archivo.
8. **Honorarios del periodo de prueba con cálculo:** hoy solo se registran; la regla de cálculo está por definir.
9. **Garantía y multa por combustible por vehículo en Flota:** por ahora se digitan manualmente en el contrato y en la devolución; luego se leerán de la ficha del vehículo.
10. **Automatizaciones de devolución:** recordatorio 3 h antes de la devolución, cobro automático de inmovilización y alerta de garantía a las 24 h.
11. **Tablero para roles distintos de Front-Office:** hoy solo Front-Office recibe tareas proyectadas (sección 4).
12. **Fichas de Cliente y de Vehículo:** *Semáforo de riesgo crediticio*, *Documentos del cliente*, *Historial*, *Historial de mantenimiento* y *Telemetría y compromisos futuros* son espacios reservados sin datos.
13. **Reportes:** la pestaña Financiero necesita aprobación visual de Producto; no existen aún reportes de rentabilidad ni de siniestralidad.
14. **Devolución completa sin conexión:** solo las evidencias funcionan sin conexión (sección 17.2).
15. **Resolución de conflictos de edición en el checklist de devolución (SYNC_CONFLICT de DEV-04)** y prototipo de la decisión de Gerencia del alcoholímetro: pendientes de diseño.

### 18.2 Consultas abiertas al negocio (pendientes de respuesta de Fiorella / Producto)
* **Monto de reserva:** ratificación de Finanzas de que los S/ 300 se trasladan íntegros a la garantía (opción "a"), qué ocurre con el monto de una reserva cancelada o por inasistencia, y qué ocurre si la reserva excede la garantía (hoy el sistema lo rechaza).
* **Contrato:** si "con/sin conductor" (`BR-DOC-003`) equivale a "conductor distinto del titular" (`BR-ALQ-015`).
* **Personal:** formato del archivo de asistencia, vínculo usuario–ficha, catálogo de áreas y umbral de memo por faltas (hoy 2 al mes).
* **Reclutamiento:** efecto de la pausa sobre candidatos y entrevistas en curso, retención del CV, tope salarial en la negociación y regla de honorarios en la prueba.

---

## 19. Glosario de Términos y Estados

* **Empresa / Sede:** Estructura jerárquica de dos niveles. Una Empresa representa una razón social jurídica; una Sede representa un local físico u oficina de atención.
* **AVAILABLE (Disponible):** Vehículo que se encuentra operativo, limpio y sin reserva activa, apto para asignación inmediata.
* **RENTED (Alquilado):** Vehículo en posesión del cliente bajo un contrato de alquiler activo.
* **MAINTENANCE (Mantenimiento):** Vehículo temporalmente no disponible por servicios de mantenimiento preventivo, correctivo o limpieza profunda.
* **OUT_OF_SERVICE (Fuera de Servicio):** Vehículo dado de baja, con avería grave o inhabilitado legalmente.
* **DRAFT (Reserva / Alquiler Borrador):** Registro preliminar cuyos requisitos de pago de garantía, validación documental o alcolímetro aún no han sido completados.
* **CONFIRMED (Reserva Confirmada):** Reserva con pago de garantía validado y documentos en regla; el vehículo queda formalmente bloqueado para el cliente en las fechas pactadas.
* **VALIDATION (Alquiler en Validación):** Alquiler con documentos del conductor e intervinientes verificados contra estándares de identidad y arraigo.
* **NOTARY_EVALUATION (Evaluación Notarial):** Alquiler con prueba de alcolímetro aprobada; en evaluación contra matriz de riesgo notarial y tercer camino.
* **CONTRACTING (Contratación):** Alquiler en formalización de contrato de arrendamiento y registro de garantía.
* **PENDING_DELIVERY (Pendiente de Entrega):** Alquiler con contrato formalizado y garantía abonada, listo para inspección y entrega de llaves.
* **ACTIVE (Alquiler Activo):** Vehículo formalmente entregado al cliente con checklist de 35 fotos y 3 videos; unidad en estado `RENTED`.
* **EXTENSION_PENDING (Ampliación Pendiente):** Alquiler activo con solicitud de extensión de plazo en evaluación o pago de saldo.
* **RETURN_IN_PROGRESS (Retorno en Curso):** Unidad arribada a sede para chequeo de recepción física y liquidación de garantía.
* **CLOSED (Alquiler Cerrado):** Expediente finiquitado con devolución de vehículo conforme y depósito de garantía liquidado.
* **CANCELLED (Alquiler Cancelado):** Alquiler rescindido por alcolímetro positivo/rechazado o desistimiento antes de entrega.
* **PROGRAMADA / RECEPCION_PROVISIONAL / INSPECCION (Devolución):** Etapas previas al resultado: devolución creada, vehículo recibido en custodia, e inspección en curso.
* **SIN_DANOS / CON_DANOS:** Resultado de la inspección de retorno.
* **CIERRE_FINANCIERO / CERRADA (Devolución):** Liquidación de garantía y cargos, y expediente de devolución finiquitado.
* **ABIERTA / CERRADA / VIA_LEGAL (Incidencia):** Estados del ciclo de vida de una contingencia o siniestro vehicular (INC-01/02).
* **INCIDENT_STILL_OPEN:** Regla de negocio que bloquea el cierre de devolución y la devolución de garantía mientras existan incidencias abiertas (`BR-INC-001`).
* **NECESIDAD_REGISTRADA / PUBLICADA / EN_NEGOCIACION / DECIDIDA / CANCELADA (Vacante):** Estados del requerimiento de personal (REC-01/02).
* **NUEVO / CONTACTADO / ENTREVISTA / DECISION (Etapas de Selección):** Fases secuenciales del tablero Kanban de candidatos (REC-03).
* **CONTRATADO / RECHAZADO (Decisión de Selección):** Resoluciones definitivas en el expediente del postulante (REC-07).
* **isMechanic:** Indicador de especialización técnica para vacantes y candidatos automotrices; activa canales obligatorios en institutos y legalización notarial de contrato.
* **Onboarding / Período de Prueba:** Proceso de inducción formal y seguimiento trimestral con dictamen de aptitud (`APTO` / `NO_APTO`).
* **RoleRef / Roles Dinámicos:** Modelo corporativo de asignación de roles mediante identificadores dinámicos vinculados a la organización (`roleId`) y matriz de permisos por módulo y acción.
* **MatrixAuthorizationService:** Servicio backend centralizado encargado de verificar en tiempo real los privilegios del usuario activo frente a la matriz de permisos de la sede u organización.
* **Semáforo del cliente (Normal / Ámbar / Rojo):** Nivel de riesgo del cliente según su historial. Una vez que empeora, no retrocede automáticamente.
* **Tercer Camino (Third Path):** Mecanismo de excepción para clientes de bajo riesgo que permite exonerar el trámite notarial clásico mediante biometría y aprobación expresa de Gerencia.
* **Uso Turístico Exclusivo:** Política contractual y de cobertura aseguradora que exige que los vehículos sean destinados únicamente a recreación y turismo, restringiendo el uso para transporte público, carga o actividades no autorizadas.
* **Deep Link:** Enlace directo que conduce al usuario a la tarea u objeto exacto dentro del sistema sin necesidad de navegar manualmente por las listas.

* **PENDING_SALE_RESOLUTION / CONVERTED (Reserva):** Reserva pendiente de resolver y reserva ya convertida en alquiler (terminal).
* **VEHICLE_NOT_AVAILABLE (409):** Error de dominio que indica que el vehículo ya está comprometido en las fechas pedidas; distinto del conflicto de versión (412), que indica que el registro cambió mientras se lo veía.
* **Reserva aplicada:** Monto de reserva (S/ 300 por defecto) trasladado íntegro a la garantía del alquiler; en la entrega solo se cobra la diferencia.
* **Variante de contrato:** Una de las 4 plantillas de contrato de alquiler (persona natural, natural con conductor distinto del titular, jurídica, jurídica con conductor distinto del titular), con la plantilla general como respaldo.
* **Falta grave (BR-ALQ-013):** Registro de Gerencia por incumplimiento de una ampliación: retención total de la garantía y cliente en semáforo Rojo.
* **EXTENSION_PENDING:** Alquiler con ampliación solicitada, a la espera de la autorización de Gerencia.
* **PAUSADA (Vacante):** Vacante que no recibe candidatos nuevos hasta ser reanudada.
* **Periodo de prueba / Planilla / Terminado (Relación laboral):** Estados de una persona en Administración de Personal.
* **Memo de advertencia:** Documento generado automáticamente por el sistema (2ª falta injustificada del mes o 4ª tardanza al regresar de campo).
* **Cascada de autorización:** Recorrido de 3 niveles de 5 minutos para autorizar una salida a campo; sin respuesta, queda sin autorización.
* **HELD / PARTIALLY_RETAINED / RETURNED / RETAINED (Garantía):** En custodia, parcialmente retenida, devuelta y retenida.
* **Ajuste de garantía:** Movimiento definitivo (descuento, retención total, liberación o cargo por inmovilización) sobre una garantía.
* **Búsqueda global:** Buscador de la barra superior (ícono de lupa) para alquileres, reservas, clientes, vehículos y devoluciones.
* **Cola de evidencias (offline):** Almacén local del dispositivo donde esperan las fotos y videos hasta poder subirse.

---
## 20. Bitácora Diaria de Cambios del Manual

| Fecha | Versión | Cambios Realizados | Responsable |
|---|---|---|---|
| **2026-09-30** | **v1.0** | **Creación inicial del manual integral.** Cobertura completa de Login, MFA, Activación, Selección de Sede, Header/Sidebar, Dashboard, Clientes (alta/edición/búsqueda), Flota (alta con foto/edición/estados/baja), Consultas (CON-01 a CON-04 con validación turística y clientes vinculados), Reservas (RES-01 a RES-05) y Administración (ADM-01 a ADM-05). | Equipo de Ingeniería KAIROS |
| **2026-09-30** | **v1.1** | **Integración del Módulo de Alquileres (ALQ-01 a ALQ-11).** Documentación del ciclo de vida completo de 10 estados, creación directa y desde reserva confirmada (RES-05), validación documental (BR-CON-004), prueba de alcolímetro de tolerancia cero (BR-ALQ-005), matriz notarial y tercer camino con aprobación gerencial (BR-ALQ-003/004), formalización de contrato con garantía (BR-DOC-002/003), y protocolo de entrega física con 35 fotos + 3 videos y transición a RENTED (BR-INS-003/004). | Equipo de Ingeniería KAIROS |
| **2026-10-05** | **v1.2** | **Integración del Módulo de Devoluciones (DEV-01 a DEV-10).** Ciclo de vida, recepción provisional, alcoholímetro con decisión de Gerencia, checklist con evidencias y documento de responsabilidad firmado, hub de resultado, registro de daños estéticos y técnicos, garantía y cierre. Se corrige el estado de Alquileres y Devoluciones en el Centro de Módulos. | Equipo de Ingeniería KAIROS |
| **2026-10-06** | **v1.3** | **Consulta → Alquiler directo.** El detalle de consulta (CON-04) ofrece siempre "Reservar este vehículo" y "Convertir a Alquiler"; se retira la vía "Nuevo Alquiler" de la bandeja (todo alquiler nace de una consulta). Se documentan las validaciones de conversión, que el alquiler directo no lleva monto de reserva y cobra garantía completa, y que el inicio del alquiler se fija al cerrar la entrega. Se retira del manual la mención de cronómetro de facturación y monitoreo GPS (no documentada). | Equipo de Ingeniería KAIROS |
| **2026-10-09** | **v1.4** | **Integración de Roles Dinámicos (ADM-01/02), Incidencias (INC-01/02) y Reclutamiento (REC-01 a REC-08).** Incorporación del panel de roles corporativos y matriz interactiva de permisos granulares (`ROLES-DIN-01..03`). Módulo de Incidencias con tipos, severidades, timeline inmutable, resolución rápida y regla de bloqueo `INCIDENT_STILL_OPEN` en devoluciones. Módulo de Reclutamiento con vacantes, canales obligatorios para mecánicos (`isMechanic`), tablero Kanban, selector de entrevistadores, ofertas laborales, onboarding y evaluación de período de prueba (30/60/90 días). Actualización de hoja de ruta hacia Administración de Personal (ADP) y ampliación del glosario. | Equipo de Ingeniería KAIROS |
| **2026-10-12** | **v1.5** | **Corte al 12 de octubre, verificado contra el código de la rama de cierre de huecos.** Alquiler: los S/ 300 de la reserva pasan íntegros a la garantía y solo se cobra la diferencia (desglose en ENTREGA-03), selector de plantilla de contrato por titular (4 variantes), asistente de entrega de 5 etapas, pantalla del alquiler activo (ALQ-10), solicitud de ampliación (ALQ-11), GPS aún no conectado y falta grave (BR-ALQ-013). Reservas: aviso claro y confirmación bloqueada ante `VEHICLE_NOT_AVAILABLE`; el aviso de "cambió por otra operación" queda solo para el conflicto de versión; requisitos con "Subir". Consultas: flota por fechas en CON-03 (ocupados al final y deshabilitados) y CON-04/DEV-03/DEV-04 alineadas a los prototipos aprobados. Reclutamiento: pausa y reanudación de vacantes, CV con enlace firmado, condiciones de negociación y honorarios del periodo de prueba. Nuevos módulos: Administración de Personal (ADP-01 a ADP-10, incluida "Nueva persona", rechazos, reclasificación, capacitaciones, evidencias y memos automáticos), Pagos y Garantías (PAG-01/02), Reportes (REP-01), Búsqueda Global (BUS-01) y sincronización de evidencias sin conexión (TR-08). Se corrigen respecto a v1.4: menú y centro de módulos por permisos (13 módulos), menú de usuario, 4 tarjetas del tablero de administración, pantalla ADM-04 (monto de reserva, no garantías por categoría), plantillas de documentos (9.6) y hoja de ruta (Perfil de usuario TR-09 solo en construcción). | Equipo de Ingeniería KAIROS |

---
*Este manual es un documento vivo del proyecto KAIROS ERP. Se mantendrá actualizado al final de cada jornada de desarrollo.*
