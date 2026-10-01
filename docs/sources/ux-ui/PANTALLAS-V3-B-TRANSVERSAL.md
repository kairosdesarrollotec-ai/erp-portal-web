# Especificación UX/UI — Pantallas Transversales (complemento v3.1)

**Documento:** PANTALLAS-V3-B-TRANSVERSAL.md  
**Versión:** 1.0  
**Fecha:** 2026-10-01  
**Estado:** APROBADO (DEC-TR-11-001)  
**Complementa:** `especificacion-ux-ui-v3.1-para-prototipado-del-erp-kairos.md` §5.1

Este documento extiende la tabla §5.1 con las pantallas transversales que no formaban
parte del contrato UX/UI original. Las reglas de la especificación base aplican en
su totalidad (accesibilidad, responsive, estados, tokens del Design System).

---

## TR-11 — Hub de módulos de navegación

### Datos de pantalla

| Campo | Valor |
|---|---|
| UX-ID | TR-11 |
| Nombre | Hub de módulos / Centro de Operaciones |
| Ruta | `/modulos` |
| Rol de entrada | Cualquier rol autenticado con asignación vigente |
| Prototipo desktop | `PROTO-TR-11-MENU-MODULOS` (1600×1000, APPROVED) |
| Prototipo mobile | `PROTO-TR-11-MENU-MODULOS-MOVIL` (390×844, APPROVED) |
| Decisión | DEC-TR-11-001 (2026-10-01); heredada de PROV-TR-11-001 (2026-09-23) |

### Propósito

Pantalla central de navegación del ERP. Presenta la colección de módulos operativos
disponibles para el usuario en su contexto de empresa/sede actual. No es el dashboard
de trabajo (TR-06); es el índice visual desde el que el usuario elige su módulo de destino.

### Layout

#### Desktop (≥ 1024 px)

- `AppHeader` fijo en la parte superior con rol y contexto de empresa/sede.
- Encabezado de página: etiqueta de sección ("Centro de Operaciones ERP"),
  título principal ("Módulos del Sistema"), subtítulo descriptivo.
- Grid de tarjetas de módulos: 4 columnas en 1280 px, 3 columnas en 1024 px.
  Cada tarjeta: icono, etiqueta, descripción corta.
- Sin sidebar; sin tabs.

#### Mobile (< 768 px)

- `AppHeader` en la parte superior.
- Grid de 2 columnas de tarjetas.
- Encabezado de página simplificado (título visible; subtítulo colapsable o reducido).

### Catálogo de módulos

| ID módulo | Etiqueta | Ruta destino | Rol requerido | Estado |
|---|---|---|---|---|
| tablero | Tablero | `/tablero` | Todos | Habilitado |
| consultas | Consultas | `/consultas` | Todos | Habilitado |
| reservas | Reservas | `/reservas` | Todos | Habilitado |
| alquileres | Alquileres | *(pendiente)* | Todos | Próximamente |
| devoluciones | Devoluciones | *(pendiente)* | Todos | Próximamente |
| flota | Flota | `/flota` | Todos | Habilitado |
| clientes | Clientes | `/clientes` | Todos | Habilitado |
| pagos | Pagos | *(pendiente)* | Todos | Próximamente |
| incidentes | Incidentes | *(pendiente)* | Todos | Próximamente |
| personal | Personal | *(pendiente)* | Todos | Próximamente |
| reportes | Reportes | *(pendiente)* | Todos | Próximamente |
| admin | Administración | `/admin/usuarios` | ADMINISTRACION | Habilitado (adminOnly) |

> **Nota provisional:** La columna "Rol requerido" para módulos no-adminOnly es provisional.
> Cuando exista ADM-02 (matriz rol-acción-empresa-sede), la visibilidad de cada módulo
> debe derivarse de los permisos reales, no de la inferencia del prototipo.

### Comportamiento de tarjetas

- **Habilitada** (`path` definido): elemento `<Link>` navegable; foco y hover visibles.
- **Deshabilitada** (`path = null`): elemento `<div>` con `aria-disabled="true"`, badge
  "Próximamente", no clickable, sin cursor pointer.
- No se ocultan las tarjetas deshabilitadas; su presencia comunica el roadmap del sistema.

### Estados de la pantalla

| Estado | Condición | UI |
|---|---|---|
| LOADING | Contexto de trabajo resolviéndose | Texto "Cargando módulos…"; sin grid |
| UNRESOLVED | `useModuleHub()` no pudo determinar el contexto | Mensaje de error no técnico: "No pudimos determinar tu contexto de trabajo. Vuelve a iniciar sesión." |
| READY | Contexto resuelto | Grid de tarjetas según catálogo + filtro de rol |

### Interacción y flujos

- Al seleccionar una tarjeta habilitada: navegar a la ruta destino (React Router `<Link>`).
- Al seleccionar una tarjeta deshabilitada: sin navegación (el elemento no es interactivo).
- Ningún modal de confirmación antes de navegar.

### Accesibilidad (WCAG 2.2 AA)

- El grid de tarjetas es una `<ul role="list">` con `aria-label="Módulos del sistema"`.
- Cada tarjeta habilitada es un `<Link>` con `aria-label={etiqueta}`.
- Cada tarjeta deshabilitada tiene `aria-disabled="true"` y `aria-label="{etiqueta} — próximamente"`.
- Los iconos llevan `aria-hidden="true"` (decorativos).
- Navegación por teclado: Tab recorre las tarjetas habilitadas; las deshabilitadas no reciben foco.
- Contraste de texto sobre fondo de tarjeta: mínimo 4.5:1 (texto regular) conforme a WCAG 2.2 AA.

### Estados no cubiertos por prototipos aprobados

Los siguientes estados se implementan con el Design System sin prototipo adicional:

- **Hover / focus de tarjeta habilitada:** elevación visual (shadow token) y outline de foco.
- **Responsive intermedio (768–1023 px):** grid de 3 columnas.
- **Sesión expirada durante la carga:** redirigir a TR-10 (guardia de ruta existente).

No se requieren prototipos separados para estos estados porque no cambian la composición
aprobada; son variaciones menores de interacción cubiertas por el Design System.

### Trazabilidad

| Fuente | Referencia |
|---|---|
| Prototipo desktop | `PROTO-TR-11-MENU-MODULOS` (prototype-manifest.yaml) |
| Prototipo mobile | `PROTO-TR-11-MENU-MODULOS-MOVIL` (prototype-manifest.yaml) |
| Decisión | DEC-TR-11-001 / PROV-TR-11-001 (decision-log.md) |
| Implementación | `apps/web/src/app/modules/ModuleHubScreen.tsx` |
| Código | HU-25 (PR#12) |
| Conflicto cerrado | `docs/conflicts/MISSING_TR11_UXUI_CONTRACT.md` |

> BDD, SDD y TDD no tienen entrada TR-11. Pendiente para una iteración futura cuando
> se defina el rol formal de esta pantalla en los procesos de negocio y en ADM-02.
