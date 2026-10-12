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
   - 3.1 [Barra Superior (Header) y Búsqueda Global (BUS-01)](#31-barra-superior-header-y-búsqueda-global-bus-01)
   - 3.2 [Menú Lateral de Navegación (Sidebar)](#32-menú-lateral-de-navegación-sidebar)
   - 3.3 [Centro de Módulos (Hub)](#33-centro-de-módulos-hub)
   - 3.4 [Centro de Notificaciones](#34-centro-de-notificaciones)
4. [Tablero de Control por Rol (Dashboard)](#4-tablero-de-control-por-rol-dashboard)
5. [Módulo de Clientes](#5-módulo-de-clientes)
   - 5.1 [Bandeja y Búsqueda de Clientes](#51-bandeja-y-búsqueda-de-clientes)
   - 5.2 [Registro de Nuevo Cliente](#52-registro-de-nuevo-cliente)
   - 5.3 [Edición de Datos de Cliente](#53-edición-de-datos-de-cliente)
6. [Módulo de Flota Vehicular](#6-módulo-de-flota-vehicular)
   - 6.1 [Catálogo, Filtros y Disponibilidad por Fechas](#61-catálogo-filtros-y-disponibilidad-por-fechas)
   - 6.2 [Alta de Vehículo con Fotografía](#62-alta-de-vehículo-con-fotografía)
   - 6.3 [Edición de Especificaciones y Tarifas](#63-edición-de-especificaciones-y-tarifas)
   - 6.4 [Cambio Rápido de Estado y Baja de Vehículo](#64-cambio-rápido-de-estado-y-baja-de-vehículo)
7. [Módulo de Consultas y Cotizaciones](#7-módulo-de-consultas-y-cotizaciones)
   - 7.1 [Bandeja de Consultas](#71-bandeja-de-consultas)
   - 7.2 [Registro de Nueva Consulta (CON-02)](#72-registro-de-nueva-consulta-con-02)
   - 7.3 [Exhibición y Cotización con Flota Real y Fechas de Viaje (CON-03)](#73-exhibición-y-cotización-con-flota-real-y-fechas-de-viaje-con-03)
   - 7.4 [Detalle, Historial y Conversión de Consulta (CON-04)](#74-detalle-historial-y-conversión-de-consulta-con-04)
8. [Módulo de Reservas](#8-módulo-de-reservas)
   - 8.1 [Bandeja General de Reservas (RES-01)](#81-bandeja-general-de-reservas-res-01)
   - 8.2 [Validación de Requisitos y Confirmación Segura (RES-04 / RES-05)](#82-validación-de-requisitos-y-confirmación-segura-res-04--res-05)
   - 8.3 [Cancelación de Reserva](#83-cancelación-de-reserva)
9. [Módulo de Administración del Sistema](#9-módulo-de-administración-del-sistema)
   - 9.1 [Gestión de Usuarios y Asignaciones Multi-Sede (ADM-01)](#91-gestión-de-usuarios-y-asignaciones-multi-sede-adm-01)
   - 9.2 [Matriz de Roles y Permisos Granulares (ADM-02 y ROLES-DIN-01..03)](#92-matriz-de-roles-y-permisos-granulares-adm-02-y-roles-din-0103)
   - 9.3 [Registro de Eventos y Auditoría (ADM-03)](#93-registro-de-eventos-y-auditoría-adm-03)
   - 9.4 [Políticas de Depósito y Parámetros (ADM-04)](#94-políticas-de-depósito-y-parámetros-adm-04)
   - 9.5 [Plantillas de Notificaciones y Documentos (ADM-05 / ADM-03)](#95-plantillas-de-notificaciones-y-documentos-adm-05--adm-03)
10. [Módulo de Alquileres (ALQ-01 a ALQ-11)](#10-módulo-de-alquileres-alq-01-a-alq-11)
    - 10.1 [Ciclo de Vida y Máquina de Estados del Alquiler](#101-ciclo-de-vida-y-máquina-de-estados-del-alquiler)
    - 10.2 [Creación de Alquiler y Traslado de Reserva a Garantía (P0-03 opción a)](#102-creación-de-alquiler-y-traslado-de-reserva-a-garantía-p0-03-opción-a)
    - 10.3 [Validación Documental Presencial (BR-CON-004)](#103-validación-documental-presencial-br-con-004)
    - 10.4 [Protocolo de Alcolímetro de Tolerancia Cero (BR-ALQ-005)](#104-protocolo-de-alcolímetro-de-tolerancia-cero-br-alq-005)
    - 10.5 [Matriz Notarial Automática y Tercer Camino Gerencial (BR-ALQ-003/004)](#105-matriz-notarial-automática-y-tercer-camino-gerencial-br-alq-003004)
    - 10.6 [Plantilla de Contrato por Titular y Depósito de Garantía](#106-plantilla-de-contrato-por-titular-y-depósito-de-garantía)
    - 10.7 [Entrega Física con Evidencia Pericial (BR-INS-003/004)](#107-entrega-física-con-evidencia-pericial-br-ins-003004)
    - 10.8 [Alquileres Activos, Solicitud de Ampliación y Falta Grave (ALQ-10/11 y BR-ALQ-013)](#108-alquileres-activos-solicitud-de-ampliación-y-falta-grave-alq-1011-y-br-alq-013)
11. [Módulo de Devoluciones (DEV-01 a DEV-10)](#11-módulo-de-devoluciones-dev-01-a-dev-10)
    - 11.1 [Ciclo de Vida de la Devolución](#111-ciclo-de-vida-de-la-devolución)
    - 11.2 [Bandeja de Devoluciones y Alquileres Activos (DEV-01)](#112-bandeja-de-devoluciones-y-alquileres-activos-dev-01)
    - 11.3 [Recepción Provisional (DEV-02)](#113-recepción-provisional-dev-02)
    - 11.4 [Prueba de Alcoholímetro (DEV-03)](#114-prueba-de-alcoholímetro-dev-03)
    - 11.5 [Checklist, Evidencias y Documento de Responsabilidad (DEV-04)](#115-checklist-evidencias-y-documento-de-responsabilidad-dev-04)
    - 11.6 [Resultado de la Inspección: Hub de la Devolución (DEV-05)](#116-resultado-de-la-inspección-hub-de-la-devolución-dev-05)
    - 11.7 [Registro de Daños Estéticos y Técnicos (DEV-06, DEV-07, DEV-08)](#117-registro-de-daños-estéticos-y-técnicos-dev-06-dev-07-dev-08)
    - 11.8 [Garantía, Bloqueo por Incidencias y Cierre (DEV-09 y DEV-10)](#118-garantía-bloqueo-por-incidencias-y-cierre-dev-09-y-dev-10)
12. [Módulo de Incidencias y Siniestros (INC-01 e INC-02)](#12-módulo-de-incidencias-y-siniestros-inc-01-e-inc-02)
    - 12.1 [Bandeja General de Incidencias (INC-01)](#121-bandeja-general-de-incidencias-inc-01)
    - 12.2 [Registro de Nueva Incidencia](#122-registro-de-nueva-incidencia)
    - 12.3 [Timeline Inmutable y Seguimiento (INC-02)](#123-timeline-inmutable-y-seguimiento-inc-02)
    - 12.4 [Regla de Bloqueo de Garantías en Devolución (BR-INC-001)](#124-regla-de-bloqueo-de-garantías-en-devolución-br-inc-001)
13. [Módulo de Reclutamiento y Selección (REC-01 a REC-08)](#13-módulo-de-reclutamiento-y-selección-rec-01-a-rec-08)
    - 13.1 [Bandeja de Vacantes y Pausado Operativo (REC-01)](#131-bandeja-de-vacantes-y-pausado-operativo-rec-01)
    - 13.2 [Publicación y Regla de Mecánicos (REC-02 / BR-REC-004)](#132-publicación-y-regla-de-mecánicos-rec-02--br-rec-004)
    - 13.3 [Tablero Kanban de Candidatos (REC-03)](#133-tablero-kanban-de-candidatos-rec-03)
    - 13.4 [Ficha de Postulante y Descarga Segura de CV (REC-04)](#134-ficha-de-postulante-y-descarga-segura-de-cv-rec-04)
    - 13.5 [Agendamiento de Entrevistas con Directorio (REC-05)](#135-agendamiento-de-entrevistas-con-directorio-rec-05)
    - 13.6 [Evaluación y Dictamen Técnico (REC-06)](#136-evaluación-y-dictamen-técnico-rec-06)
    - 13.7 [Oferta Laboral, Honorarios de Prueba y Negociación (REC-07)](#137-oferta-laboral-honorarios-de-prueba-y-negociación-rec-07)
    - 13.8 [Onboarding y Período de Prueba de 30/60/90 Días (REC-08)](#138-onboarding-y-período-de-prueba-de-306090-días-rec-08)
14. [Módulo de Administración de Personal (ADP-01 a ADP-10)](#14-módulo-de-administración-de-personal-adp-01-a-adp-10)
    - 14.1 [Bandeja General y Directorio de Colaboradores (ADP-01)](#141-bandeja-general-y-directorio-de-colaboradores-adp-01)
    - 14.2 [Alta de Personal y Expediente Laboral (ADP-02)](#142-alta-de-personal-y-expediente-laboral-adp-02)
    - 14.3 [Solicitudes de Permisos y Licencias con Evidencia (ADP-03)](#143-solicitudes-de-permisos-y-licencias-con-evidencia-adp-03)
    - 14.4 [Cascada Automática de Aprobaciones Multinivel (ADP-04)](#144-cascada-automática-de-aprobaciones-multinivel-adp-04)
    - 14.5 [Programación y Control de Vacaciones (ADP-05)](#145-programación-y-control-de-vacaciones-adp-05)
    - 14.6 [Control de Asistencia y Reclasificación de Faltas (ADP-06)](#146-control-de-asistencia-y-reclasificación-de-faltas-adp-06)
    - 14.7 [Memos Disciplinarios Automáticos por Reincidencia (ADP-07)](#147-memos-disciplinarios-automáticos-por-reincidencia-adp-07)
    - 14.8 [Autorización de Salidas a Campo y Rechazo Motivado (ADP-08)](#148-autorización-de-salidas-a-campo-y-rechazo-motivado-adp-08)
    - 14.9 [Confirmación de Retorno de Campo (ADP-09)](#149-confirmación-de-retorno-de-campo-adp-09)
    - 14.10 [Capacitaciones y Control de Asistencia (ADP-10)](#1410-capacitaciones-y-control-de-asistencia-adp-10)
15. [Módulos de Pagos, Reportes y Búsqueda Global (Fase 6)](#15-módulos-de-pagos-reportes-y-búsqueda-global-fase-6)
    - 15.1 [Pagos y Gestión de Garantías (PAG-01 / PAG-02)](#151-pagos-y-gestión-de-garantías-pag-01--pag-02)
    - 15.2 [Reportes Gerenciales y Operativos (REP-01)](#152-reportes-gerenciales-y-operativos-rep-01)
    - 15.3 [Búsqueda Global Unificada (BUS-01)](#153-búsqueda-global-unificada-bus-01)
16. [Sincronización Offline y Modo Desconectado (TR-08)](#16-sincronización-offline-y-modo-desconectado-tr-08)
17. [Glosario de Términos y Estados](#17-glosario-de-términos-y-estados)
18. [Bitácora Diaria de Cambios del Manual](#18-bitácora-diaria-de-cambios-del-manual)

---

## 1. Introducción y Objetivos del Sistema

**KAIROS / VeloxRent ERP** es la plataforma integral de gestión operativa y comercial para empresas de alquiler de vehículos y servicios de movilidad turística.

El sistema organiza sus operaciones sobre un modelo corporativo **multi-empresa y multi-sede**:
- Cada usuario pertenece a una organización empresarial y puede contar con asignaciones a una o varias empresas y sedes operativas físicas.
- La información de clientes, flota vehicular, consultas, reservas, alquileres, personal y caja se encuentra estrictamente aislada y protegida según la sede activa en la que el usuario esté trabajando.

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
   * Ingrese su nueva clave secreta personal (mínimo 8 caracteres, combinación de mayúsculas, minúsculas y números).
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

Toda la aplicación autenticada comparte un marco de trabajo uniforme compuesto por la Barra Superior, el Buscador Global y el Menú Desplegable.

### 3.1 Barra Superior (Header) y Búsqueda Global (BUS-01)
Visible permanentemente en la parte superior de todas las pantallas de negocio:

* **Ícono de Menú Hamburguesa (☰):** Al hacer clic, abre el panel lateral de módulos (`AppSidebar`).
* **Logotipo / Marca KAIROS:** Al hacer clic sobre el logo, navega directamente al **Centro de Módulos (`/modulos`)**.
* **Búsqueda Global Unificada (BUS-01):** Campo de búsqueda centralizado accesible con el atajo de teclado **`Cmd + K`** (macOS) o **`Ctrl + K`** (Windows/Linux). Permite buscar transversalmente por cliente, placa de vehículo, expediente de reserva, contrato de alquiler o colaborador, abriendo directamente la ficha seleccionada.
* **Badge de Sede Activa:** Muestra el texto `[Empresa] — [Sede]` (ej. *VeloxRent Perú — Miraflores*).
* **Botón de Cambio de Sede (ícono de flechas):** Permite cambiar de sede operativa en cualquier momento sin cerrar sesión, retornando a `/seleccion-empresa-sede`.
* **Campana de Notificaciones:** Muestra un círculo indicador con la cantidad de notificaciones no leídas. Al hacer clic, abre el panel lateral de notificaciones.
* **Menú de Usuario y Cierre de Sesión:** Muestra el avatar con la inicial del correo corporativo. Incluye diálogo de confirmación de cierre de sesión seguro (`TR-09`) con aviso preventivo si existen borradores o formularios sin guardar en la pantalla activa.

---

### 3.2 Menú Lateral de Navegación (Sidebar)
Se activa mediante el botón de menú hamburguesa (☰) y se puede cerrar haciendo clic en la **"X"** o fuera del panel:

* Muestra los módulos funcionales del sistema organizados por áreas (Comercial, Operaciones, Talento Humano y Gestión Corporativa).
* Los módulos activos están resaltados y permiten navegación instantánea mediante un solo clic.
* Conserva de forma inmutable el contexto de la empresa y sede activa seleccionada.

---

### 3.3 Centro de Módulos (Hub)
* **Ruta:** `/modulos`
* **Propósito:** Vista panorámica general del ERP con tarjetas visuales grandes para los módulos funcionales:

| Módulo | Acceso Directo | Estado Actual |
|---|---|---|
| **Tablero** | `/tablero` | ✅ Operativo |
| **Consultas** | `/consultas` | ✅ Operativo |
| **Reservas** | `/reservas` | ✅ Operativo |
| **Flota** | `/flota` | ✅ Operativo |
| **Clientes** | `/clientes` | ✅ Operativo |
| **Alquileres** | `/alquileres` | ✅ Operativo |
| **Devoluciones** | `/devoluciones` | ✅ Operativo |
| **Incidencias** | `/incidencias` | ✅ Operativo |
| **Personal** | `/hr/employees` | ✅ Operativo (Personal y Reclutamiento) |
| **Pagos y Garantías** | `/payments` | ✅ Operativo |
| **Reportes** | `/reporting` | ✅ Operativo |
| **Administración** | `/admin/usuarios` | ✅ Operativo (Sólo Administradores) |

---

### 3.4 Centro de Notificaciones
* Se abre al presionar la campana en el Header.
* Despliega un panel lateral derecho con las alertas generadas por el sistema:
  * Creación y asignación de cotizaciones.
  * Cambios de estado de vehículos y reservas.
  * Notificaciones de bienvenida y registro de usuarios.
  * Solicitudes de permisos y vacaciones pendientes de revisión.
* Permite marcar alertas individuales como leídas o revisar el detalle del evento.

---

## 4. Tablero de Control por Rol (Dashboard)
* **Ruta:** `/tablero`
* **Propósito:** Mostrar de forma inmediata las tareas pendientes y prioridades operativas del día según el rol del usuario conectado.

### Vistas según el Rol del Usuario:
1. **Rol Front-Office (Atención al Público y Mostrador):**
   * Lista interactiva de tareas pendientes proyectadas en tiempo real (cotizaciones por responder, documentación de reservas, entregas programadas).
   * Al hacer clic en una tarea, el sistema redirige automáticamente al expediente correspondiente (*Deep Linking*).
2. **Rol Operaciones / Campo:**
   * Entregas físicas del día, retornos programados, inspecciones de devolución e incidencias en ruta.
3. **Rol Administración / Gerencia:**
   * Métricas rápidas de ocupación de flota, solicitudes de personal pendientes de aprobación, contratos en contratación y resúmenes de cobranza.
4. **Rol Administrador de Plataforma (`PLATFORM_ADMIN`):**
   * Acceso rápido a usuarios (`/admin/usuarios`), auditoría (`/admin/auditoria`), políticas (`/admin/parametros`), matriz de permisos (`/admin/permisos`) y plantillas (`/admin/plantillas`).

---

## 5. Módulo de Clientes

* **Ruta:** `/clientes`
* **Propósito:** Directorio centralizado de personas naturales y jurídicas que solicitan cotizaciones, alquilan unidades o mantienen contratos con la empresa.

### 5.1 Bandeja y Búsqueda de Clientes
1. **Contador en vivo:** Total de clientes registrados bajo la empresa actual.
2. **Buscador en tiempo real:** Filtra al instante por nombre, documento o teléfono.
3. **Semáforo de Riesgo:** Indicador visual de color por cliente:
   * **Verde (Normal):** Cliente sin incidencias ni incumplimientos.
   * **Ámbar:** Cliente con observaciones menores o daño estético registrado.
   * **Rojo:** Cliente bloqueado por falta grave (`BR-ALQ-013`), daño severo en devolución o deuda contractual.

### 5.2 Registro de Nuevo Cliente
1. Presione **"+ Nuevo Cliente"**.
2. Seleccione el Tipo de documento (`DNI`, `RUC`, `CE`, `Pasaporte`) e ingrese el número. El sistema valida duplicidad en la misma empresa.
3. Ingrese Nombre completo o razón social, Nacionalidad, Correo, Teléfono y Dirección.
4. Si es de nacionalidad extranjera, se solicita la fecha legal de ingreso al país.
5. Presione **"Guardar Cliente"**.

### 5.3 Edición de Datos de Cliente
1. En la fila del cliente, presione el ícono de **Lápiz**.
2. Actualice los datos de contacto o domicilio y presione **"Guardar Cambios"**.

---

## 6. Módulo de Flota Vehicular

* **Ruta:** `/flota`
* **Propósito:** Administrar el inventario vehicular, características técnicas, tarifas y disponibilidad de servicio.

### 6.1 Catálogo, Filtros y Disponibilidad por Fechas
1. **Búsqueda por texto:** Ingrese placa, marca o modelo para filtrar en tiempo real.
2. **Filtro por Estado Operativo:** `Disponible` (Verde), `Alquilado` (Azul), `Mantenimiento` (Amarillo), `Fuera de Servicio` (Gris).
3. **Consulta de Disponibilidad por Rango de Fechas:**
   * Permite indicar una ventana `Desde` y `Hasta` (`availableFrom` / `availableTo`).
   * El sistema calcula en lote la disponibilidad real de cada unidad, considerando tanto reservas confirmadas como alquileres activos y compromisos de flota (`vehicle_commitments`).
   * Si la unidad presenta cruce de fechas, exhibe el bloque `availability` con el detalle del conflicto (`conflictFrom` / `conflictTo`).

### 6.2 Alta de Vehículo con Fotografía
1. Presione **"+ Nuevo Vehículo"**.
2. Cargue la fotografía frontal de la unidad (formatos JPEG, PNG, WebP con compresión automática).
3. Complete Placa (única e inmutable), Marca, Modelo, Año, Color, Categoría (`Sedán`, `SUV`, `Pick-up`, `Hatchback`, `Van`), Tarifa Diaria en Soles y Estado Inicial.
4. Presione **"Guardar Vehículo"**.

### 6.3 Edición de Especificaciones y Tarifas
1. Presione **"Editar"** en la fila de la unidad. La placa se muestra protegida en sólo lectura.
2. Actualice tarifa diaria, categoría o fotografía y presione **"Guardar Cambios"**.

### 6.4 Cambio Rápido de Estado y Baja de Vehículo
* **Cambio de Estado:** Menú desplegable directo en la columna de acción de la tabla (`Disponible`, `Mantenimiento`, `Fuera de Servicio`).
* **Baja de Vehículo:** Botón **"Dar de baja"** con doble confirmación de seguridad para pasar la unidad a `OUT_OF_SERVICE`.

---

## 7. Módulo de Consultas y Cotizaciones

* **Ruta:** `/consultas`
* **Propósito:** Atender requerimientos de viaje, cotizar unidades de la flota real y convertir prospecciones en reservas o alquileres directos.

### 7.1 Bandeja de Consultas
* Lista las atenciones en la sede activa en estados `REGISTRADA`, `COTIZADA`, `CONVERTIDA` o `CERRADA_SIN_CONVERSION`.
* Presione **"+ Nueva Consulta"** para iniciar una atención.

### 7.2 Registro de Nueva Consulta (CON-02)
* **Ruta:** `/consultas/nueva` (con salvaguarda de autoguardado local).
1. **Modalidad:** Seleccione `Presencial` o `Virtual` (canal: WhatsApp, llamada, web, redes, correo).
2. **Cliente:** Vincule un cliente existente o use **"+ Registrar nuevo cliente"**. Si es extranjero, se solicita documento de hospedaje.
3. **Requerimiento de Viaje:** Destino turístico, fecha de viaje (mínimo el día de hoy), cantidad de personas y días estimados.
4. **Validación de Uso Turístico Exclusivo:**
   * **SÍ:** Habilita el botón verde **"Continuar"** para pasar al catálogo.
   * **NO:** Advierte la política de seguro y convierte el botón en **"Cerrar consulta"** sin cotizar.

### 7.3 Exhibición y Cotización con Flota Real y Fechas de Viaje (CON-03)
* **Ruta:** `/consultas/:id/vehiculos`
1. **Evaluación de Disponibilidad Real:** Consulta las unidades de la sede evaluando la ventana real del viaje `[fechaInicio, fechaInicio + dias)`.
2. **Protección Visual contra Solapes:** Las unidades con reservas o alquileres superpuestos en ese rango aparecen visualmente deshabilitadas con la insignia de conflicto y las fechas en que la unidad se encuentra comprometida.
3. **Cálculo Automático:** Muestra tarifa por día y presupuesto total estimado (tarifa × días).
4. **Cotizar:** Al presionar **"Cotizar este vehículo"**, la consulta pasa a estado `COTIZADA`.

### 7.4 Detalle, Historial y Conversión de Consulta (CON-04)
* **Ruta:** `/consultas/:id`
* Muestra el resumen comercial y la línea de tiempo. Con la cotización vigente ofrece:
  * **"Reservar este vehículo":** Avanza al flujo de Reserva (sección 8).
  * **"Convertir a Alquiler":** Genera el expediente de alquiler directo en `DRAFT` (sección 10.2).
  * **"Cerrar consulta sin conversión":** Si el cliente desiste, ingresando motivo obligatorio.

---

## 8. Módulo de Reservas

* **Ruta:** `/reservas`
* **Propósito:** Asegurar separaciones de vehículos mediante pago de garantía previa.

### 8.1 Bandeja General de Reservas (RES-01)
* Lista de reservas en estados `DRAFT`, `CONFIRMED` o `CANCELLED`.
* Al hacer clic en cualquier fila se abre el detalle de la reserva.

### 8.2 Validación de Requisitos y Confirmación Segura (RES-04 / RES-05)
* **Ruta:** `/reservas/:id`
1. **Requisito 1: Pago de Depósito:** Presione **"Validar pago"** para registrar la conformidad bancaria.
2. **Requisito 2: Documentación:** Presione **"Validar documentos"** para verificar licencia y documento de identidad.
3. **Confirmación Definitiva:**
   * Al estar ambos requisitos en verde, se activa el botón **"Confirmar reserva"**.
   * **Control de Disponibilidad Atómica:** Si en el instante de confirmación la unidad quedó comprometida por otra operación, el sistema muestra una alerta clara (`409 VEHICLE_NOT_AVAILABLE`) indicando las fechas de ocupación, sin confundirlo con un error de sincronización.
   * **Control de Versiones (`SYNC_CONFLICT`):** Si otro operador modificó la reserva simultáneamente, el banner preventivo solicita recargar la pantalla.

### 8.3 Cancelación de Reserva
* Presione **"Cancelar reserva"**, ingrese el motivo obligatorio y confirme. El vehículo queda inmediatamente liberado.

---

## 9. Módulo de Administración del Sistema

> **Nota de Seguridad:** Acceso reservado para roles con facultades de administración (`PLATFORM_ADMIN`, `ADMINISTRACION`, o permisos `ADMIN.*`).

### 9.1 Gestión de Usuarios y Asignaciones Multi-Sede (ADM-01)
* **Ruta:** `/admin/usuarios`
* Alta de usuarios corporativos con selector de rol dinámico (`roleId`), asignación arbórea de sedes autorizadas y envío automático de correo de activación mediante Resend.

### 9.2 Matriz de Roles y Permisos Granulares (ADM-02 y ROLES-DIN-01..03)
* **Ruta:** `/admin/permisos` (vista desktop)
* Creación, edición y desactivación de roles dinámicos corporativos.
* Cuadrícula interactiva de permisos por módulo (`ADMIN`, `CUSTOMER`, `FLEET`, `INQUIRY`, `RESERVATION`, `RENTAL`, `RETURN`, `INCIDENT`, `RECRUITMENT`, `HR_ADMINISTRATION`, `PAYMENT`, `REPORTING`).
* Validación visual de segregación de funciones que bloquea combinaciones incompatibles (`409 INCOMPATIBLE_PERMISSIONS`).

### 9.3 Registro de Eventos y Auditoría (ADM-03)
* **Ruta:** `/admin/auditoria`
* Bitácora inmutable append-only con registro cronológico de usuario, sede, módulo, acción y payload completo de cada operación.

### 9.4 Políticas de Depósito y Parámetros (ADM-04)
* **Ruta:** `/admin/parametros`
* Configuración de importes de garantía base por categoría vehicular y tiempos de tolerancia de reserva.

### 9.5 Plantillas de Notificaciones y Documentos (ADM-05 / ADM-03)
* **Rutas:** `/admin/notificaciones` y `/admin/plantillas`
* Mantenimiento de plantillas de correo y gestión de contratos base (`templates`) con versionado inmutable y activación formal.

---

## 10. Módulo de Alquileres (ALQ-01 a ALQ-11)

Governa la formalización contractual, validación documental, pruebas de sobriedad, entrega física y seguimiento en ruta.

### 10.1 Ciclo de Vida y Máquina de Estados del Alquiler
El alquiler avanza secuencialmente por 10 estados:
`DRAFT` → `VALIDATION` → `NOTARY_EVALUATION` → `CONTRACTING` → `PENDING_DELIVERY` → `ACTIVE` → (`EXTENSION_PENDING`) → `RETURN_IN_PROGRESS` → `CLOSED` (o `CANCELLED`).

### 10.2 Creación de Alquiler y Traslado de Reserva a Garantía (P0-03 opción a)
* **Origen:** Todo alquiler nace desde una Consulta (`CON-04`) o desde una Reserva Confirmada (`RES-05`).
* **Traslado de Reserva a Garantía (Regla P0-03 a):**
  * Cuando el alquiler proviene de una reserva confirmada con depósito previo (ej. S/ 300), dicho importe **se traslada íntegramente a cuenta de la garantía del contrato**.
  * En la pantalla de contratación, el sistema desglosa claramente: Garantía Total requerida, Monto acreditado por reserva y Saldo restante de garantía a abonar por el cliente.
  * Si el alquiler nació de consulta directa sin reserva previa, se exige el abono de la garantía completa.

### 10.3 Validación Documental Presencial (BR-CON-004)
* Cotejo físico de DNI/Pasaporte, Licencia de conducir y acreditación de hospedaje o domicilio. Al marcar la conformidad, transiciona a `VALIDATION`.

### 10.4 Protocolo de Alcolímetro de Tolerancia Cero (BR-ALQ-005)
* **Favorable (0.00 g/l):** Transiciona a `NOTARY_EVALUATION`.
* **Desfavorable (> 0.00 g/l) o Rechazado:** Cancela de forma irreversible el alquiler (`CANCELLED`), genera evento en auditoría y notifica a Gerencia.

### 10.5 Matriz Notarial Automática y Tercer Camino Gerencial (BR-ALQ-003/004)
* **Vehículos de Alto Riesgo:** Trámite notarial obligatorio (`MANDATORY`).
* **Tercer Camino (`THIRD_PATH_ELIGIBLE`):** Clientes recurrentes de bajo riesgo pueden exonerar la notaría mediante firma biométrica rápida, previa autorización expresa y motivada del rol `GERENCIA`.
* Transiciona a `CONTRACTING`.

### 10.6 Plantilla de Contrato por Titular y Depósito de Garantía
* **Selección de Plantilla según Titular:** El sistema permite seleccionar la plantilla de contrato específica aplicable según la naturaleza del titular: Persona Natural o Persona Jurídica (empresa con representante legal).
* Registro del comprobante y confirmación de abono de garantía. Transiciona a `PENDING_DELIVERY`.

### 10.7 Entrega Física con Evidencia Pericial (BR-INS-003/004)
* Inspección pericial obligatoria: **mínimo 35 fotografías y 3 videos** de la unidad.
* Al completar la entrega:
  1. El alquiler transiciona a **`ACTIVE`**.
  2. El vehículo pasa automáticamente a **`RENTED`** en el módulo de Flota.
  3. Se inicia el cómputo del alquiler (`startAt`).

### 10.8 Alquileres Activos, Solicitud de Ampliación y Falta Grave (ALQ-10/11 y BR-ALQ-013)
* **Bandeja de Alquileres Activos (ALQ-10):** Visualización de unidades en ruta, kilometraje inicial, fecha límite de devolución y estado del conductor.
* **Solicitud de Ampliación de Plazo (ALQ-11):**
  * Para extender el alquiler, el cliente debe cumplir **4 requisitos indispensables**:
    1. Solicitud con al menos 24 horas de anticipación a la fecha límite.
    2. Disponibilidad confirmada del vehículo en flota para los nuevos días solicitados.
    3. Abono previo de la tarifa correspondiente a los días adicionales.
    4. Conformidad operativa y de seguro.
* **Protocolo de Falta Grave (`BR-ALQ-013`):**
  * Si el cliente no devuelve la unidad a tiempo y no cumple con los 4 requisitos de ampliación, Gerencia activa la pantalla modal de **Confirmación de Falta Grave**.
  * **Consecuencias Atómicas e Irreversibles:**
    1. Retención total e inmediata del depósito en garantía.
    2. Marcación definitiva del cliente en **Semáforo Rojo** (bloqueo corporativo para futuros alquileres).
    3. Elevación del expediente al área legal para inicio de acciones penales por apropiación ilícita del vehículo.
    4. Expediente de alquiler marcado en estado `SERIOUS_BREACH`.

---

## 11. Módulo de Devoluciones (DEV-01 a DEV-10)

* **Ruta:** `/devoluciones`
* **Propósito:** Recepción física del vehículo, checklist de retorno, evaluación de daños y liquidación de garantías.

### 11.1 Ciclo de Vida de la Devolución
`PROGRAMADA` → `RECEPCION_PROVISIONAL` → `INSPECCION` → (`SIN_DANOS` / `CON_DANOS`) → `CIERRE_FINANCIERO` → `CERRADA`.

### 11.2 Bandeja de Devoluciones y Alquileres Activos (DEV-01)
* Lista devoluciones en curso y muestra panel de alquileres activos listos para iniciar retorno.

### 11.3 Recepción Provisional (DEV-02)
* Registro de fecha, hora de arribo, odómetro y combustible. Si entrega un tercero, se registran sus datos en notas.

### 11.4 Prueba de Alcoholímetro (DEV-03)
* **Favorable:** Avanza al checklist de inspección.
* **Desfavorable:** Deriva la decisión a Gerencia (custodia provisional o pase a inspección bajo supervisión).

### 11.5 Checklist, Evidencias y Documento de Responsabilidad (DEV-04)
* Verificación de 360° con evidencias fotográficas y firma digital del Documento de Responsabilidad en el pad de firma.

### 11.6 Resultado de la Inspección: Hub de la Devolución (DEV-05)
* Comparador de zonas (entrega vs. retorno). Determina si el retorno es `SIN_DANOS` (liberación directa de garantía) o `CON_DANOS` (registro previo de daños).

### 11.7 Registro de Daños Estéticos y Técnicos (DEV-06, DEV-07, DEV-08)
* **Daño Estético (DEV-07):** Monto fijado automáticamente por el tarifario del vehículo según la zona afectada.
* **Daño Técnico (DEV-08):** Requiere informe técnico externo de Motrix e ingreso de cotización pericial.

### 11.8 Garantía, Bloqueo por Incidencias y Cierre (DEV-09 y DEV-10)
* Descuento de cargos y liquidación de garantía remanente.
* **Regla `BR-INC-001`:** Bloqueo estricto del cierre financiero si existen incidencias abiertas (`INCIDENT_STILL_OPEN`).
* Al confirmar el cierre (`DEV-10`), la devolución pasa a **`CERRADA`** y la unidad regresa a **`AVAILABLE`** en Flota.

---

## 12. Módulo de Incidencias y Siniestros (INC-01 e INC-02)

* **Ruta:** `/incidencias`
* **Propósito:** Monitoreo y resolución de siniestros viales, pérdida de llaves, fotopapeletas e intervenciones policiales.

### 12.1 Bandeja General de Incidencias (INC-01)
* Tabla interactiva filtrable por Estado (`ABIERTA`, `CERRADA`, `VIA_LEGAL`), Severidad (`LEVE`, `MODERADA`, `GRAVE`) y Tipo.
* Botón de **"Resolver"** rápido en bandeja para incidencias leves sin necesidad de ingresar al detalle.

### 12.2 Registro de Nueva Incidencia
* Vinculación a contrato o vehículo, tipo de contingencia, severidad y descripción pormenorizada de los hechos.

### 12.3 Timeline Inmutable y Seguimiento (INC-02)
* Bitácora append-only donde cada actuación queda registrada con autor y sello de tiempo.
* Permite agregar nuevas actuaciones, resolver el incidente con fundamentación o derivar formalmente a `VIA_LEGAL`.

### 12.4 Regla de Bloqueo de Garantías en Devolución (BR-INC-001)
* Prohíbe la liquidación de garantías o el cierre de devoluciones mientras el expediente mantenga incidencias abiertas.

---

## 13. Módulo de Reclutamiento y Selección (REC-01 a REC-08)

* **Ruta:** `/reclutamiento`
* **Propósito:** Gestión integral del ciclo de selección de talento humano, desde la vacante hasta el período de prueba.

### 13.1 Bandeja de Vacantes y Pausado Operativo (REC-01)
* Lista de convocatorias de personal por área y sede.
* **Pausar / Reactivar Vacante:** Permite congelar temporalmente la postulación de una vacante sin cancelarla, reanudándola cuando se reactive el requerimiento.

### 13.2 Publicación y Regla de Mecánicos (REC-02 / BR-REC-004)
* Definición de remuneración, turnos y canales de difusión.
* Para posiciones técnicas de taller (`isMechanic`), se exige obligatoriamente la difusión en convenios con institutos técnicos.

### 13.3 Tablero Kanban de Candidatos (REC-03)
* Columnas de avance: `Nuevo` → `Contactado` → `Entrevista` → `Decisión`. Avance secuencial por evaluación humana.

### 13.4 Ficha de Postulante y Descarga Segura de CV (REC-04)
* Enmascaramiento de datos personales para evaluadores generales.
* **Descarga Segura de CV:** Botón que genera una URL firmada de descarga con expiración de 15 minutos, garantizando la confidencialidad de la hoja de vida.

### 13.5 Agendamiento de Entrevistas con Directorio (REC-05)
* Selector de evaluadores sincronizado con el directorio corporativo de la sede.

### 13.6 Evaluación y Dictamen Técnico (REC-06)
* Registro de notas cualitativas y dictamen directo: `Avanza` o `No avanza`.

### 13.7 Oferta Laboral, Honorarios de Prueba y Negociación (REC-07)
* **Condiciones de Negociación:** Registro documentado de los acuerdos previos (beneficios, bono, jornada).
* **Honorarios de Período de Prueba:** Posibilidad de registrar una remuneración diferenciada durante el período probatorio previa a la remuneración permanente.
* Decisión final: `CONTRATADO` o `RECHAZADO` con motivo obligatorio.

### 13.8 Onboarding y Período de Prueba de 30/60/90 Días (REC-08)
* Checklist de bienvenida, entrega de herramientas y contrato notariado (obligatorio para mecánicos).
* Evaluación trimestral de aptitud: dictamen `APTO` (pasa a planilla) o `NO_APTO` (término del vínculo).

---

## 14. Módulo de Administración de Personal (ADP-01 a ADP-10)

* **Ruta principal:** `/hr/employees`
* **Propósito:** Gestión integral de la plantilla de colaboradores, expedientes laborales, asistencia, permisos, vacaciones, salidas a campo y capacitaciones.

### 14.1 Bandeja General y Directorio de Colaboradores (ADP-01)
* **Ruta:** `/hr/employees`
* Directorio completo de colaboradores de la empresa y sede activa.
* **Filtros:** Por estado (`ACTIVO`, `EN_VACACIONES`, `LICENCIA`, `SUSPENDIDO`, `TERMINADO`), área de trabajo, sede y búsqueda por nombre o documento.
* **Endpoint `GET /me/employee`:** Reconoce automáticamente el expediente del colaborador en sesión para facilitar el autoservicio de solicitudes.

### 14.2 Alta de Personal y Expediente Laboral (ADP-02)
* **Ruta:** `/hr/employees/new`
* **Formulario de Registro:**
  * Datos personales: Nombres, apellidos, tipo y número de documento de identidad, correo, teléfono y dirección.
  * Datos laborales: Fecha de ingreso, área/departamento, cargo/posición, sede asignada, tipo de contrato y salario base.
  * Asignación de rol del sistema para acceso a la plataforma KAIROS.
* Presione **"Guardar Colaborador"** para crear el legajo digital.

### 14.3 Solicitudes de Permisos y Licencias con Evidencia (ADP-03)
* **Ruta:** `/hr/permissions`
* Registro de solicitudes de permisos por motivos de salud, asuntos personales, capacitación o duelo.
* **Carga de Evidencias Digitales:** Permite adjuntar certificados médicos, comprobantes o citaciones oficiales (formatos PDF, JPEG, PNG).
* Estado inicial de la solicitud: `PENDIENTE`.

### 14.4 Cascada Automática de Aprobaciones Multinivel (ADP-04)
* Las solicitudes de vacaciones y permisos avanzan por una **cascada jerárquica de 3 niveles**:
  * **Nivel 1:** Supervisor Inmediato / Jefe de Área.
  * **Nivel 2:** Gerente de Operaciones / Recursos Humanos.
  * **Nivel 3:** Dirección General / Gerencia General.
* **Scheduler Idempotente:** Si un nivel no emite resolución en un lapso de 5 minutos (configurable según política), el sistema escala automáticamente la solicitud al siguiente nivel jerárquico para prevenir demoras operativas.

### 14.5 Programación y Control de Vacaciones (ADP-05)
* **Ruta:** `/hr/vacations`
* Visualización del récord vacacional anual por colaborador (días ganados, gozados y pendientes).
* **Validación de Cupo por Área:** Al registrar una solicitud de vacaciones, el sistema valida que no exista solapamiento que supere el cupo operativo máximo permitido para el área (`VACATION_CAPACITY_STATUSES`), previniendo desabastecimiento de personal en ventanilla o taller.

### 14.6 Control de Asistencia y Reclasificación de Faltas (ADP-06)
* **Ruta:** `/hr/attendance`
* Registro diario de ingresos, salidas y refrigerios.
* Identificación automática de tardanzas y ausencias.
* **Reclasificación de Faltas:** Permite a RRHH revisar una inasistencia y reclasificarla de forma sustentada entre `FALTA_INJUSTIFICADA` o `FALTA_JUSTIFICADA` adjuntando el descargo del colaborador.

### 14.7 Memos Disciplinarios Automáticos por Reincidencia (ADP-07)
* **Ruta:** `/hr/memos`
* **Regla de Reincidencia Automática:** Cuando un colaborador acumula **3 tardanzas o faltas no justificadas**, el sistema emite de forma automática un Memorándum Disciplinario Digital (`MEMO_AUTOMATICO`).
* El documento queda registrado en el legajo del colaborador y notifica por correo al colaborador y a su jefatura inmediata.

### 14.8 Autorización de Salidas a Campo y Rechazo Motivado (ADP-08)
* **Ruta:** `/hr/field-exits`
* Registro de comisiones de servicio fuera de sede (auxilio mecánico, traslados entre sedes, gestiones notariales).
* Asignación de vehículo de apoyo y kilometraje de salida.
* **Rechazo Motivado:** Si la jefatura desaprueba la salida, el sistema exige ingresar de forma obligatoria el motivo formal de rechazo, registrándolo en la bitácora del colaborador.

### 14.9 Confirmación de Retorno de Campo (ADP-09)
* Al regresar a la sede física, el supervisor o evaluador autorizado consulta el expediente de salida y verifica:
  * Kilometraje de retorno y combustible de la unidad.
  * Estado general del vehículo y cumplimiento del objetivo de la comisión.
  * Firma digital de conformidad y cierre del expediente de salida.

### 14.10 Capacitaciones y Control de Asistencia (ADP-10)
* **Ruta:** `/hr/trainings`
* Creación de programas de capacitación técnica y de seguridad en el trabajo.
* **Control de Asistencia de Participantes (`POST /trainings/:id/attendees`):** Registro de asistencia en tiempo real de los colaboradores convocados y emisión de constancias internas de participación.

---

## 15. Módulos de Pagos, Reportes y Búsqueda Global (Fase 6)

### 15.1 Pagos y Gestión de Garantías (PAG-01 / PAG-02)
* **Ruta:** `/payments`
* **Propósito:** Administración centralizada de transacciones, cobros de tarifas de alquiler y control financiero de depósitos en garantía.
* **Estados de Transacción:** `PENDIENTE`, `COMPLETADO`, `FALLIDO`, `REEMBOLSADO`.
* **Liquidación de Garantías:** Conciliación entre depósitos recibidos, descuentos aplicados por daños estéticos/técnicos y reintegros al cliente.

### 15.2 Reportes Gerenciales y Operativos (REP-01)
* **Ruta:** `/reporting`
* **Propósito:** Analítica de negocio y tableros estadísticos para toma de decisiones gerenciales.
* **Reportes Disponibles:**
  * **Ocupación de Flota:** Porcentaje de unidades alquiladas vs. disponibles por categoría y sede.
  * **Ingresos y Facturación:** Desglose de ingresos por alquileres, ampliaciones y cobros adicionales.
  * **Siniestralidad y Mantenimiento:** Frecuencia de incidentes e impacto económico en reparaciones.
  * **Cumplimiento de Asistencia:** Indicadores de puntualidad, vacaciones y ausencias por departamento.

### 15.3 Búsqueda Global Unificada (BUS-01)
* Accesible con el atajo de teclado **`Cmd + K`** o **`Ctrl + K`** desde cualquier pantalla del sistema.
* Búsqueda en milisegundos a través de múltiples entidades del sistema con navegación directa mediante teclado (flechas arriba/abajo y tecla Enter).

---

## 16. Sincronización Offline y Modo Desconectado (TR-08)

* Diseñado para la continuidad operativa en sedes o zonas con baja cobertura de red (p. ej. inspecciones en playas de estacionamiento o sótanos):
  * **Almacenamiento Local Seguro (`IndexedDB` / Dexie):** Los formularios de entrega (`ALQ-09`) y recepción de devoluciones (`DEV-04`) almacenan los datos localmente si se pierde la conexión.
  * **Cola de Sincronización Automática:** Al recuperar la conectividad con el servidor, el sistema despacha en segundo plano las evidencias y registros pendientes, notificando la sincronización exitosa al usuario.

---

## 17. Glosario de Términos y Estados

* **Empresa / Sede:** Estructura corporativa jerárquica. Una Empresa representa una razón social jurídica; una Sede representa una oficina o local operativo físico.
* **AVAILABLE (Disponible):** Vehículo que se encuentra operativo, limpio y sin compromisos de reserva para las fechas consultadas.
* **RENTED (Alquilado):** Vehículo en posesión del cliente bajo un contrato de alquiler activo.
* **MAINTENANCE (Mantenimiento):** Vehículo en taller mecánico o alistamiento preventivo.
* **OUT_OF_SERVICE (Fuera de Servicio):** Unidad dada de baja o inhabilitada temporalmente.
* **DRAFT (Borrador):** Registro inicial de consulta, reserva o alquiler antes de cumplir requisitos.
* **CONFIRMED (Reserva Confirmada):** Reserva con depósito validado y documentos en regla; la unidad queda bloqueada para el cliente.
* **VALIDATION / NOTARY_EVALUATION / CONTRACTING / PENDING_DELIVERY / ACTIVE:** Etapas secuenciales del ciclo del alquiler.
* **SERIOUS_BREACH (`BR-ALQ-013`):** Falta grave en alquiler por incumplimiento de ampliación; retiene el 100% de la garantía y bloquea al cliente de por vida.
* **Semáforo del Cliente (Verde / Ámbar / Rojo):** Nivel de riesgo corporativo del cliente. No retrocede automáticamente.
* **Tercer Camino:** Excepción gerencial para clientes recurrentes de bajo riesgo que sustituye la notaría por validación biométrica.
* **Cascada de Aprobaciones:** Mecanismo automático multinivel de escalamiento de solicitudes de vacaciones y permisos ante inacción del supervisor.
* **Memo Disciplinario Automático:** Amonestación laboral generada por el sistema al detectarse 3 tardanzas o faltas no justificadas.
* **availableFrom / availableTo:** Parámetros de consulta en flota para verificar solapamiento con reservas y compromisos de viaje.
* **vehicle-overlap:** Regla compartida de negocio que evalúa compromisos (`vehicle_commitments`) y reservas no terminales para evitar sobreventa de unidades.
* **Deep Link:** Enlace interactivo en notificaciones o dashboard que conduce directamente al registro objeto de la tarea.

---

## 18. Bitácora Diaria de Cambios del Manual

| Fecha | Versión | Cambios Realizados | Responsable |
|---|---|---|---|
| **2026-09-30** | **v1.0** | **Creación inicial del manual integral.** Cobertura de Login, MFA, Activación, Selección de Sede, Shell, Dashboard, Clientes, Flota, Consultas, Reservas y Administración. | Equipo de Ingeniería KAIROS |
| **2026-09-30** | **v1.1** | **Integración de Alquileres (ALQ-01 a ALQ-11).** Ciclo de 10 estados, alcolímetro de tolerancia cero, matriz notarial, tercer camino, contrato con garantía y entrega física con 35 fotos + 3 videos. | Equipo de Ingeniería KAIROS |
| **2026-10-05** | **v1.2** | **Integración de Devoluciones (DEV-01 a DEV-10).** Recepción provisional, alcoholímetro, checklist, documento de responsabilidad, daños estéticos/técnicos y cierre. | Equipo de Ingeniería KAIROS |
| **2026-10-06** | **v1.3** | **Consulta → Alquiler directo.** Conversión directa de consulta a alquiler en CON-04, retiro de alta directa en bandeja y ajuste de inicio de alquiler al cierre de entrega física. | Equipo de Ingeniería KAIROS |
| **2026-10-09** | **v1.4** | **Roles Dinámicos (ADM-01/02), Incidencias (INC-01/02) y Reclutamiento (REC-01 a REC-08).** Roles dinámicos por ID, matriz interactiva de permisos, módulo de Incidencias con regla `INCIDENT_STILL_OPEN` y Reclutamiento con Kanban, postulantes, entrevistas y período de prueba. | Equipo de Ingeniería KAIROS |
| **2026-10-12** | **v1.5** | **Administración de Personal (ADP-01..10), Cierre de Huecos de Alquiler y Reclutamiento, Fase 6 (Pagos, Reportes, Búsqueda Global) y Disponibilidad de Flota.** Incorporación completa del Módulo de Administración de Personal: alta de personal, expediente, permisos con evidencia digital, cascada automática de 3 niveles con scheduler de 5 min, programación de vacaciones con cupo, asistencia y justificación de faltas, memos disciplinarios por 3 reincidencias, salidas a campo con rechazo formal y control de capacitaciones (ADP-10). En Alquiler: traslado de reserva a garantía (P0-03 opción a), selección de plantilla de contrato por titular y protocolo de falta grave `BR-ALQ-013`. En Reclutamiento: pausado de vacantes, descarga segura de CV y honorarios de prueba. En Flota/Consultas: filtro de disponibilidad por rango de fechas `availableFrom`/`availableTo`, regla compartida `vehicle-overlap` y bloqueo visual en cotizaciones. Incorporación de Pagos (PAG-01/02), Reportes (REP-01), Búsqueda Global (BUS-01 `Cmd+K`) e infraestructura offline (TR-08). | Equipo de Ingeniería KAIROS |

---
*Este manual es un documento vivo del proyecto KAIROS ERP. Se mantendrá actualizado al final de cada jornada de desarrollo.*
