# Manual de Usuario — KAIROS / VeloxRent ERP

> **Versión del Manual:** 1.2 (Corte al 5 de octubre de 2026)  
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
   - 8.2 [Validación de Requisitos y Confirmación (RES-04 / RES-05)](#82-validación-de-requisitos-y-confirmación-res-04--res-05)
   - 8.3 [Cancelación de Reserva](#83-cancelación-de-reserva)
9. [Módulo de Administración del Sistema](#9-módulo-de-administración-del-sistema)
   - 9.1 [Gestión de Usuarios y Asignaciones Multi-Sede (ADM-01)](#91-gestión-de-usuarios-y-asignaciones-multi-sede-adm-01)
   - 9.2 [Matriz de Roles y Permisos (ADM-02)](#92-matriz-de-roles-y-permisos-adm-02)
   - 9.3 [Registro de Eventos y Auditoría (ADM-03)](#93-registro-de-eventos-y-auditoría-adm-03)
   - 9.4 [Políticas de Depósito y Garantía (ADM-04)](#94-políticas-de-depósito-y-garantía-adm-04)
   - 9.5 [Plantillas de Notificaciones (ADM-05)](#95-plantillas-de-notificaciones-adm-05)
10. [Módulo de Alquileres (ALQ-01 a ALQ-11)](#10-módulo-de-alquileres-alq-01-a-alq-11)
   - 10.1 [Ciclo de Vida y Máquina de Estados del Alquiler](#101-ciclo-de-vida-y-máquina-de-estados-del-alquiler)
   - 10.2 [Creación de Alquiler: Directo y desde Reserva Confirmada (RES-05)](#102-creación-de-alquiler-directo-y-desde-reserva-confirmada-res-05)
   - 10.3 [Validación Documental Presencial (BR-CON-004)](#103-validación-documental-presencial-br-con-004)
   - 10.4 [Protocolo de Alcolímetro de Tolerancia Cero (BR-ALQ-005)](#104-protocolo-de-alcolímetro-de-tolerancia-cero-br-alq-005)
   - 10.5 [Matriz Notarial Automática y Tercer Camino / Excepción Gerencial (BR-ALQ-003/004)](#105-matriz-notarial-automática-y-tercer-camino--excepción-gerencial-br-alq-003004)
   - 10.6 [Formalización de Contrato y Depósito en Garantía (BR-DOC-002/003)](#106-formalización-de-contrato-y-depósito-en-garantía-br-doc-002003)
   - 10.7 [Entrega Física y Checklist de Inspección con Evidencia Obligatoria (BR-INS-003/004)](#107-entrega-física-y-checklist-de-inspección-con-evidencia-obligatoria-br-ins-003004)
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
12. [Módulos en Construcción (Hoja de Ruta)](#12-módulos-en-construcción-hoja-de-ruta)
13. [Glosario de Términos y Estados](#13-glosario-de-términos-y-estados)
14. [Bitácora Diaria de Cambios del Manual](#14-bitácora-diaria-de-cambios-del-manual)

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
* **Botón de Cambio de Sede (ícono de flechas):** Permite cambiar de sede operativa en cualquier momento sin cerrar sesión, retornando a `/seleccion-empresa-sede`.
* **Campana de Notificaciones:** Muestra un círculo indicador con la cantidad de notificaciones no leídas. Al hacer clic, abre el panel lateral de notificaciones.
* **Badge de Perfil de Usuario:** Muestra el avatar con la inicial del correo corporativo y el rol operativo activo (ej. *Front-office*).
* **Botón Cerrar Sesión (LogOut):** Cierra de manera limpia y segura la sesión en Firebase y limpia los datos en memoria local.

---

### 3.2 Menú Lateral de Navegación (Sidebar)
Se activa mediante el botón de menú hamburguesa (☰) y se puede cerrar haciendo clic en la **"X"** o haciendo clic fuera del menú:

* Muestra los **12 módulos del sistema**.
* Los módulos activos están resaltados y permiten navegación instantánea mediante un solo clic.
* Los módulos que aún no cuentan con pantalla operativa muestran una etiqueta gris distintiva: **"Próximamente"** (no permiten hacer clic).
* Al seleccionar cualquier módulo, el menú se cierra automáticamente y carga la pantalla elegida conservando el contexto de la empresa y sede activa.

---

### 3.3 Centro de Módulos (Hub)
* **Ruta:** `/modulos`
* **Propósito:** Vista panorámica general del ERP con tarjetas visuales grandes para los 12 módulos funcionales:

| Módulo | Acceso Directo | Estado Actual |
|---|---|---|
| **Tablero** | `/tablero` | ✅ Operativo |
| **Consultas** | `/consultas` | ✅ Operativo |
| **Reservas** | `/reservas` | ✅ Operativo |
| **Flota** | `/flota` | ✅ Operativo |
| **Clientes** | `/clientes` | ✅ Operativo |
| **Administración** | `/admin/usuarios` | ✅ Operativo (Sólo Administradores) |
| **Alquileres** | `/alquileres` | ✅ Operativo |
| **Devoluciones** | `/devoluciones` | ✅ Operativo |
| **Pagos y Garantías** | — | ⏳ Próximamente (En desarrollo) |
| **Incidentes** | — | ⏳ Próximamente (En desarrollo) |
| **Personal** | — | ⏳ Próximamente (En desarrollo) |
| **Reportes** | — | ⏳ Próximamente (En desarrollo) |

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
* **Propósito:** Mostrar de forma inmediata las tareas pendientes y prioridades operativas del día según el rol del usuario conectado.

### Vistas según el Rol del Usuario:
1. **Rol Front-Office (Atención al Público y Mostrador):**
   * Muestra la lista interactiva de tareas pendientes proyectadas en tiempo real a partir del ciclo de vida de Reservas y Consultas.
   * Cada tarea es una tarjeta cliqueable con título y detalle explicativo (ej. *"Completar documentación para Reserva RES-2026-001"*).
   * Al hacer clic en una tarea, el sistema redirige automáticamente a la pantalla de detalle correspondiente (*Deep Linking*).
   * Si no hay pendientes en la sede, muestra el mensaje amigable: *"No tienes pendientes por ahora"*.
2. **Rol Administrador de Plataforma (`PLATFORM_ADMIN`):**
   * Despliega tarjetas de acceso rápido a los 5 submódulos de gestión corporativa:
     * *Usuarios y asignaciones* (`/admin/usuarios`).
     * *Auditoría y trazabilidad* (`/admin/auditoria`).
     * *Políticas de depósito* (`/admin/parametros`).
     * *Matriz de permisos* (`/admin/permisos`).
     * *Plantillas de notificaciones* (`/admin/notificaciones`).

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
1. **Búsqueda por texto:** Ingrese placa, marca o modelo en la barra de búsqueda para filtrar la tabla en tiempo real.
2. **Filtro por Estado:** Menú desplegable para seleccionar:
   * *Todos los estados*
   * *Disponible* (Verde): Unidad lista para cotización o entrega inmediata.
   * *Alquilado* (Azul): Unidad actualmente en posesión de un cliente bajo contrato.
   * *Mantenimiento* (Amarillo): Unidad en taller mecánico o inspección preventiva.
   * *Fuera de Servicio* (Gris/Rojo): Unidad dada de baja o inhabilitada temporalmente.
3. **Contador de inventario:** Muestra el número total de unidades en la flota de la sede.

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
* **Propósito:** Consultar la flota de vehículos disponibles en tiempo real y presentar las opciones al cliente.

1. **Conexión Directa con Flota:** La pantalla consulta directamente al módulo de Flota los vehículos en estado `AVAILABLE` que pertenezcan a la misma sede y empresa.
2. **Filtros Rápidos:**
   * Buscador por nombre de modelo.
   * Filtro por rango de precio mínimo y máximo por día.
3. **Cálculo Automático de Cotización:**  
   Cada tarjeta de vehículo muestra:
   * Foto y datos técnicos (Categoría, Año, Color).
   * Tarifa por día (ej. `S/ 150.00 / día`).
   * **Total Estimado:** Calculado automáticamente multiplicando la tarifa diaria por el número de días de viaje indicados en el paso anterior.
4. **Botón "Actualizar disponibilidad":** Re-consulta la base de datos de flota al instante para verificar que ningún otro asesor haya tomado la unidad en los últimos minutos.
5. **Acción de Cotización:**  
   Al presionar el botón **"Cotizar este vehículo"** en la tarjeta elegida:
   * El vehículo se vincula a la consulta.
   * La consulta pasa oficialmente al estado `COTIZADA`.
   * El sistema navega a la pantalla de detalle de la consulta.

---

### 7.4 Detalle, Historial y Cierre de Consulta (CON-04)
* **Ruta:** `/consultas/:id`
* **Propósito:** Revisar el resumen de la cotización, la trazabilidad de interacciones y efectuar el cierre.

1. **Resumen Comercial:** Muestra el vehículo cotizado, el cliente, las fechas y el importe presupuestado.
2. **Línea de Tiempo (Historial):** Muestra cronológicamente cuándo se creó la consulta, qué canales se utilizaron y las cotizaciones emitidas.
3. **Cierre sin Conversión:**
   * Si el cliente desiste o no concreta la compra, presione **"Cerrar consulta sin conversión"**.
   * Ingrese el **Motivo obligatorio** de cierre (ej. *"Cliente optó por transporte público"*, *"Precios fuera de su presupuesto"*).
   * Presione **"Confirmar cierre"**.

---

## 8. Módulo de Reservas

* **Ruta:** `/reservas`
* **Propósito:** Administrar los compromisos formales de alquiler asegurados mediante separación previa y depósito en garantía.

### 8.1 Bandeja General de Reservas (RES-01)
* Lista de reservas registradas en la sede activa.
* **Columnas:**
  * **Cliente:** Nombre del titular de la reserva.
  * **Vehículo:** Modelo y placa asignada.
  * **Fechas:** Rango de fecha de inicio y fecha de devolución pactada.
  * **Estado:**
    * `DRAFT` (Borrador / No confirmada): Reserva registrada que aún tiene requisitos pendientes (pago o documentos).
    * `CONFIRMED` (Confirmada): Reserva con garantía validada y documentación completa, lista para entrega.
    * `CANCELLED` (Cancelada): Reserva dada de baja con registro de motivo.
* Al hacer clic en cualquier fila de la tabla se abre el detalle de la reserva.

---

### 8.2 Validación de Requisitos y Confirmación (RES-04 / RES-05)
* **Ruta:** `/reservas/:id`

Para que una reserva pase de Borrador (`DRAFT`) a Confirmada (`CONFIRMED`), la política del sistema exige validar dos requisitos indispensables:

1. **Requisito 1: Comprobante de Depósito / Garantía:**
   * En la sección de requisitos, presione el botón **"Validar pago"**.
   * El sistema registra la fecha y hora de validación bancaria (`paymentValidatedAt`) y muestra el ícono de verificación verde.
2. **Requisito 2: Documentación del Conductor:**
   * Presione el botón **"Validar documentos"** (licencia de conducir vigente y documento de identidad del conductor).
   * El sistema registra la conformidad (`documentsCompletedAt`).
3. **Confirmación Definitiva:**
   * Una vez que ambos requisitos están completados, se activará el botón **"Confirmar reserva"**.
   * Presione el botón: la reserva pasará inmediatamente al estado `CONFIRMED`.
4. **Protección contra Conflictos de Edición (`SYNC_CONFLICT`):**  
   Si otro asesor confirma o modifica la reserva al mismo tiempo en otra computadora, el sistema detecta la colisión y muestra un banner preventivo: *"Esta reserva cambió por otra operación mientras la veías"*, junto con el botón *"Recargar"* para actualizar los datos sin sobrescribirlos erróneamente.

---

### 8.3 Cancelación de Reserva
1. En el detalle de la reserva, presione el botón secundario **"Cancelar reserva"**.
2. Aparecerá un campo de texto obligatorio para ingresar el motivo de cancelación.
3. Presione **"Confirmar cancelación"**. La unidad reservada regresará inmediatamente a disponibilidad en la flota.

---

## 9. Módulo de Administración del Sistema

> **Nota de Seguridad:** Estos submódulos sólo son accesibles para usuarios que posean el rol `ADMINISTRACION` o `PLATFORM_ADMIN`.

### 9.1 Gestión de Usuarios y Asignaciones Multi-Sede (ADM-01)
* **Ruta:** `/admin/usuarios`
* **Propósito:** Crear usuarios corporativos, definir sus roles y asignarles acceso a una o múltiples sedes de las empresas del grupo.

#### Pasos para Crear y Asignar un Usuario:
1. Presione el botón **"+ Agregar usuario"**.
2. **Correo Electrónico:** Ingrese el correo corporativo del colaborador.
3. **Rol del Sistema:** Seleccione el rol a otorgar:
   * `FRONT_OFFICE`: Mostrador, atención de consultas y gestión de reservas.
   * `OPERACIONES`: Control de flota vehicular, mantenimiento y despachos.
   * `GERENCIA`: Supervisión, métricas e informes.
   * `ADMINISTRACION`: Configuración del sistema, usuarios y políticas.
   * `PLATFORM_ADMIN`: Superadministrador corporativo global.
4. **Asignación Multi-Empresa y Multi-Sede:**
   * El sistema despliega un árbol organizado por empresas del grupo.
   * Puede marcar individualmente las sedes donde el usuario tendrá autorización para trabajar, o hacer clic en el botón de la empresa para marcar todas sus sedes en bloque.
5. **Contraseña Inicial (Opcional):**
   * Si ingresa una contraseña, el usuario podrá usarla para su primer inicio de sesión.
   * Si la deja en blanco, el sistema generará una credencial temporal segura y enviará automáticamente un correo electrónico de bienvenida mediante el servicio **Resend** con el enlace de activación.
6. Presione **"Guardar Asignación"**.

---

### 9.2 Matriz de Roles y Permisos (ADM-02)
* **Ruta:** `/admin/permisos`
* Visualiza la matriz completa de privilegios por módulo (Lectura, Escritura, Edición, Eliminación) cruzada contra cada uno de los roles del sistema, garantizando el principio de menor privilegio.

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

### 9.4 Políticas de Depósito y Garantía (ADM-04)
* **Ruta:** `/admin/parametros`
* Define los importes en moneda nacional (PEN) exigidos como garantía según la categoría del vehículo (ej. S/ 1,500 para Sedán; S/ 2,500 para SUV y Pick-up) y las reglas de tolerancia de tiempo para confirmación de reservas.

---

### 9.5 Plantillas de Notificaciones (ADM-05)
* **Ruta:** `/admin/notificaciones`
* Gestión de los textos y plantillas de correo electrónico y avisos en el sistema (bienvenida, confirmación de reserva, recordatorio de viaje).

---

## 10. Módulo de Alquileres (ALQ-01 a ALQ-11)

El módulo de **Alquileres** gobierna la fase troncal de la operación de KAIROS ERP: desde la formalización legal, validación documental y pruebas de seguridad hasta la entrega de la unidad física con evidencia fotográfica inmutable y la activación del vehículo en flota.

---

### 10.1 Ciclo de Vida y Máquina de Estados del Alquiler

El expediente de alquiler transita por una máquina de estados estricta y lineal de 10 estados para garantizar cero omisiones de seguridad ni brechas contractuales:

1. **`DRAFT` (Borrador):** Expediente recién creado, vinculado a cliente, vehículo y sede operativa.
2. **`VALIDATION` (Validación Documental):** Documentos de identidad, licencia de conducir y arraigo validados conforme a la nacionalidad del titular.
3. **`NOTARY_EVALUATION` (Evaluación Notarial):** Prueba de alcolímetro de tolerancia cero aprobada favorablemente; el sistema somete el perfil a la matriz notarial de riesgo.
4. **`CONTRACTING` (Contratación y Garantía):** Matriz notarial resuelta (o excepción gerencial aprobada); en espera de firma de contrato y abono del depósito de garantía.
5. **`PENDING_DELIVERY` (Pendiente de Entrega):** Contrato formalizado y garantía confirmada; el vehículo se prepara para inspección física y entrega.
6. **`ACTIVE` (Alquiler Activo):** Inspección completada con checklist de 35 fotos y 3 videos; la unidad pasa a estado `RENTED` en Flota y el cliente sale de sede con el vehículo.
7. **`EXTENSION_PENDING` (Ampliación Pendiente):** El cliente solicitó días adicionales en ruta sujeto a disponibilidad y confirmación de cobro.
8. **`RETURN_IN_PROGRESS` (Retorno en Curso):** Unidad arribada a sede para chequeo de retorno y liquidación de garantía.
9. **`CLOSED` (Cerrado):** Vehículo devuelto en conformidad, liquidación de depósito ejecutada y expediente finiquitado.
10. **`CANCELLED` (Cancelado):** Expediente anulado por resultado desfavorable o rechazo de alcolímetro, o por desistimiento previo a la entrega.

---

### 10.2 Creación de Alquiler: Directo y desde Reserva Confirmada (RES-05)

Existen dos vías operativas para iniciar un alquiler en la sede activa:

#### Vía A: Continuar desde Reserva Confirmada (`RES-05`)
* **Acceso:** Desde la pantalla de detalle de reserva confirmada (`ReservationDetailScreen`), presionar el botón **"Continuar con alquiler"**.
* **Comportamiento del sistema:**
  * Valida que la reserva pertenezca a la empresa y sede del contexto activo.
  * Valida que la reserva se encuentre en estado `CONFIRMED`.
  * Hereda automáticamente los datos del cliente, vehículo asignado, plan tarifario (`NORMAL`, `PLUS`, `LIBRE`) y fechas pactadas (`startAt`, `expectedEndAt`).
  * Genera el expediente de alquiler en estado `DRAFT`, asociando de forma inmutable el ID de la reserva previa.
  * Emite el evento de auditoría y notificación `RentalCreatedFromReservation.v1`.

#### Vía B: Alquiler Directo en Mostrador (`ALQ-01`)
* **Acceso:** Desde la bandeja de alquileres, botón **"Nuevo Alquiler"**.
* **Formulario requerido:**
  1. **Cliente:** Selección de cliente registrado en la empresa (por nombre o número de documento).
  2. **Vehículo:** Selección de unidad de flota en estado `AVAILABLE` en la sede.
  3. **Plan Tarifario:** `NORMAL` (estándar con deducible), `PLUS` (cobertura ampliada), `LIBRE` (kilometraje ilimitado).
  4. **Fecha y Hora de Inicio:** Fecha programada de salida.
  5. **Fecha y Hora de Devolución Estimada:** Debe ser estrictamente posterior a la fecha de inicio.
  6. **Consulta Previa (Opcional):** Vinculación al código de cotización/consulta si provino de un asesor telefónico.
* **Resultado:** Se crea el expediente en `DRAFT` y emite `RentalCreated.v1`.

---

### 10.3 Validación Documental Presencial (BR-CON-004)
* **Regla de Negocio `BR-CON-004`:**
  * **Titulares Peruanos:** Requiere DNI vigente, Licencia de Conducir física y recibo de servicios o comprobante de arraigo domiciliario.
  * **Titulares Extranjeros:** Requiere Pasaporte o Carnet de Extranjería, Licencia de Conducir internacional / de origen, y comprobante de hospedaje o reserva hotelera demostrable.
* **Operación:**
  * El agente de Front-Office verifica la consistencia física de los documentos y marca las casillas de verificación.
  * Al enviar la confirmación con el encabezado de concurrencia `If-Match`, el alquiler transiciona de `DRAFT` a `VALIDATION`.

---

### 10.4 Protocolo de Alcolímetro de Tolerancia Cero (BR-ALQ-005)
* **Regla de Negocio `BR-ALQ-005`:**
  * El sistema KAIROS ERP aplica una estricta política de **tolerancia cero al alcohol y sustancias psicoactivas** previa a la entrega de cualquier unidad móvil.
* **Opciones de Registro:**
  * **`FAVORABLE` (0.00 g/l):** El titular aprueba la prueba de aire expirado. El expediente transiciona automáticamente a `NOTARY_EVALUATION`.
  * **`DESFAVORABLE` (> 0.00 g/l) o `RECHAZADO`:** Si el cliente arroja resultado positivo o se niega a someterse a la prueba:
    * El sistema bloquea de forma irreversible el alquiler.
    * El estado del alquiler pasa de inmediato a **`CANCELLED`**.
    * Se registra un evento crítico en la bitácora de auditoría (`ALCOHOL_TEST_FAILED_RENTAL_CANCELLED`).
    * Se publica el evento Outbox `AlcoholTestFailed.v1` alertando a Gerencia y Finanzas para la aplicación de penalidades contractuales de la reserva.

---

### 10.5 Matriz Notarial Automática y Tercer Camino / Excepción Gerencial (BR-ALQ-003/004)
* **Reglas de Negocio `BR-ALQ-003` y `BR-ALQ-004`:**
  * **Vehículos Prohibidos de Alto Riesgo:** Los modelos de alta siniestralidad o sustracción de partes (`Toyota Hilux`, `Chevrolet Colorado`, `Hyundai Verna`, `Toyota Yaris`) tienen **trámite notarial obligatorio (`MANDATORY`)** sin excepción posible.
  * **Clientes Recurrentes ("Tercer Camino"):** Clientes con más de 2 alquileres previos cerrados satisfactoriamente y validación biométrica aprobada califican para **`THIRD_PATH_ELIGIBLE`**.
    * El Tercer Camino permite sustituir el trámite notarial presencial mediante firma biométrica o contrato digital simplificado, agilizando la entrega a 10 minutos.
    * **Aprobación Exclusiva de Gerencia:** La excepción notarial no puede ser concedida por operadores de ventanilla; requiere obligatoriamente la autorización formal del rol `GERENCIA` mediante el comando `approveNotaryException` con justificación sustentada (mínimo 10 caracteres).
  * **Clientes Nuevos:** Aplica depósito duplicado de salvaguarda (`DOUBLE_DEPOSIT`).
  * Una vez aprobada o resuelta la política notarial, el expediente transiciona a `CONTRACTING`.

---

### 10.6 Formalización de Contrato y Depósito en Garantía (BR-DOC-002/003)
* **Regla de Negocio `BR-DOC-002` y `BR-DOC-003`:**
  * Se vincula la plantilla contractual inmutable activa de la empresa (`templateVersionId`) y la referencia documental digital o código de escaneo físico (`documentRef`).
  * Se registra el importe de garantía de depósito (`depositAmount`) y la moneda (`PEN` o `USD`), asociándolo al registro contable del expediente.
  * Al completar este paso, el expediente transiciona a `PENDING_DELIVERY`.

---

### 10.7 Entrega Física y Checklist de Inspección con Evidencia Obligatoria (BR-INS-003/004)
* **Reglas de Negocio `BR-INS-003` y `BR-INS-004`:**
  * Para prevenir fraudes, reclamos infundados de carrocería o pérdidas de accesorios, la entrega física exige un **estándar pericial ineludible**:
    * **Mínimo 35 fotografías:** Cobertura de 360 grados de la carrocería, llantas, aros, techo, salón interior, tablero con odómetro encendido, maletera, llanta de repuesto y kit de emergencia.
    * **Mínimo 3 videos de inspección:** Video panorámico del exterior, video del encendido de motor y funcionamiento de luces/climatizador, y video de la entrega de llaves al titular.
  * **Validación de Bloqueo:** Si el formulario no alcanza al menos 35 fotos y 3 videos, el sistema rechaza la solicitud arrojando un error tipado `MissingDeliveryEvidenceError` con detalle exacto del faltante.
  * **Efectos Atómicos al Completar la Entrega:**
    1. El estado del alquiler pasa a **`ACTIVE`**.
    2. El estado del vehículo en el módulo de Flota pasa automáticamente de `AVAILABLE` a **`RENTED`**.
    3. Se emite el evento Outbox `EntregaCompletada.v1` con sellado de tiempo para inicio del cronómetro de facturación y monitoreo GPS.

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

1. Registre el resultado de la prueba: **Favorable** o **Desfavorable**.
2. **Favorable:** se continúa al checklist de inspección.
3. **Desfavorable:** la devolución **no continúa** al checklist. Se deriva a **Gerencia**, que decide:
   * **Continuar a inspección:** el expediente sigue su curso sin marcar al cliente en rojo.
   * **Dejar el vehículo en custodia:** exige registrar **notas** y confirmar; la decisión queda visible en el expediente.
4. Un alcoholímetro desfavorable puede marcar al cliente en **semáforo rojo** (BR-DEV-005).

---

### 11.5 Checklist, Evidencias y Documento de Responsabilidad (DEV-04)

1. Complete el **checklist de inspección de retorno**.
2. Suba las **fotos y videos** exigidos. Las evidencias se cargan de forma real mediante URL firmada; mientras la evidencia esté incompleta, el botón **"Continuar a Resultado"** permanece deshabilitado.
3. Obtenga la **firma del documento de responsabilidad** en el recuadro de firma. El botón solo se habilita con el documento firmado.
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
   * No se libera la garantía si hay un **incidente abierto**.
2. **Inmovilización:** si el vehículo queda inmovilizado más de 24 horas, se cargan los días de inmovilización.
3. **Cierre (DEV-10):** revise el resumen financiero y presione **"Cerrar devolución"**. La pantalla muestra **"Firmado por …"** como dato de solo lectura, tomado del documento de responsabilidad.
4. Al cerrar, la devolución pasa a **`CERRADA`**.

---

### 11.9 Alcance Actual y Pendientes

* No incluido todavía: recordatorio automático antes de la devolución, cobro automático de inmovilización, alerta de garantía a las 24 h, registro formal de incidentes (módulo Incidencias) y devolución sin conexión (depende de la sincronización offline).
* La multa por combustible se definirá por vehículo cuando se conozca la unidad.
* El rol Subgerencia se incorporará con la administración de roles.

---

## 12. Módulos en Construcción (Hoja de Ruta)

Los siguientes módulos forman parte del diseño integral del ERP y se incorporarán en las próximas etapas de desarrollo:

1. **Pagos y Garantías (PAG):**
   * Integración con pasarelas de pago con tarjeta, conciliación de transferencias bancarias y gestión formal de retenciones y devoluciones de garantía.
2. **Incidentes y Siniestros (INC):**
   * Registro de siniestros, fallas mecánicas en ruta, gestión de vehículos de reemplazo y partes policiales / aseguradoras.
3. **Administración de Personal (PER / ADP):**
   * Turnos de trabajo, control de asistencia en sedes y legajos de colaboradores.
4. **Reportes Gerenciales (REP):**
   * Analítica de rentabilidad de flota, tasa de ocupación por categoría vehicular y rendimiento de ventas por sede.

---

## 13. Glosario de Términos y Estados

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
* **Semáforo del cliente (Normal / Ámbar / Rojo):** Nivel de riesgo del cliente según su historial. Una vez que empeora, no retrocede automáticamente.
* **Tercer Camino (Third Path):** Mecanismo de excepción para clientes de bajo riesgo que permite exonerar el trámite notarial clásico mediante biometría y aprobación expresa de Gerencia.
* **Uso Turístico Exclusivo:** Política contractual y de cobertura aseguradora que exige que los vehículos sean destinados únicamente a recreación y turismo, restringiendo el uso para transporte público, carga o actividades no autorizadas.
* **Deep Link:** Enlace directo que conduce al usuario a la tarea u objeto exacto dentro del sistema sin necesidad de navegar manualmente por las listas.

---

## 14. Bitácora Diaria de Cambios del Manual

| Fecha | Versión | Cambios Realizados | Responsable |
|---|---|---|---|
| **2026-09-30** | **v1.0** | **Creación inicial del manual integral.** Cobertura completa de Login, MFA, Activación, Selección de Sede, Header/Sidebar, Dashboard, Clientes (alta/edición/búsqueda), Flota (alta con foto/edición/estados/baja), Consultas (CON-01 a CON-04 con validación turística y clientes vinculados), Reservas (RES-01 a RES-05) y Administración (ADM-01 a ADM-05). | Equipo de Ingeniería KAIROS |
| **2026-09-30** | **v1.1** | **Integración del Módulo de Alquileres (ALQ-01 a ALQ-11).** Documentación del ciclo de vida completo de 10 estados, creación directa y desde reserva confirmada (RES-05), validación documental (BR-CON-004), prueba de alcolímetro de tolerancia cero (BR-ALQ-005), matriz notarial y tercer camino con aprobación gerencial (BR-ALQ-003/004), formalización de contrato con garantía (BR-DOC-002/003), y protocolo de entrega física con 35 fotos + 3 videos y transición a RENTED (BR-INS-003/004). | Equipo de Ingeniería KAIROS |
| **2026-10-05** | **v1.2** | **Integración del Módulo de Devoluciones (DEV-01 a DEV-10).** Ciclo de vida, recepción provisional, alcoholímetro con decisión de Gerencia, checklist con evidencias y documento de responsabilidad firmado, hub de resultado, registro de daños estéticos y técnicos, garantía y cierre. Se corrige el estado de Alquileres y Devoluciones en el Centro de Módulos. | Equipo de Ingeniería KAIROS |

---
*Este manual es un documento vivo del proyecto KAIROS ERP. Se mantendrá actualizado al final de cada jornada de desarrollo.*
