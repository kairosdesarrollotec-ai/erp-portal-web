# Plan Maestro — KAIROS/VeloxRent ERP (estado real al 12-oct-2026)

> Actualizado el 2026-10-12 cruzando módulos reales en `main` contra ramas activas y documentación de negocio.
> Versiones anteriores: 30-sep-2026, 11-oct-2026.

## 1. Resumen ejecutivo

El proyecto completó en `main` los módulos de negocio del MVP core: Consulta, Reserva, Alquiler, Devolución, Reclutamiento, Administración de Personal, Pagos (PAG-01/02), Reportes (REP-01) y Búsqueda Global (BUS-01). También están completos Flota, Clientes, Admin/Soporte, Incidencias y el módulo de Plantillas de documentos.

**Estado actual (12-oct-2026):**
- **14 módulos funcionales** completamente implementados y mergeados a `main` (incluyendo Fase 6: Pagos, Reportes y Búsqueda Global vía PR #72 backend y PR #81 frontend).
- **Backend**: 24 módulos NestJS activos en `apps/api/src/modules/`.
- **Frontend**: 19 áreas funcionales activas en `apps/web/src/app/`.
- **Cierre de huecos operativos (en rama `feature/cierre-huecos-20261012`, PR #73 back y PR #82 web):**
  - Cascada de aprobación de 3 niveles con scheduler de 5 min en Personal (ADP).
  - Emisión de memos disciplinarios por reincidencia (3 faltas/tardanzas).
  - Rechazo formal de salidas a campo con motivo obligatorio y retorno con reconciliación.
  - Registro y asistencia a capacitaciones (ADP-10).
  - Traslado de depósito de reserva a garantía contractual (P0-03 opción a).
  - Plantilla de contrato diferenciada para Persona Natural vs. Jurídica.
  - Cierre y protocolo visual de falta grave en ampliación `BR-ALQ-013`.
  - Filtro de disponibilidad por fechas en Flota (`availableFrom`/`availableTo`) y regla unificada `vehicle-overlap`.
  - Sincronización del Manual de Usuario a v1.5.

Desde la versión anterior del plan se completaron:
- Fase 6: Pagos (PAG-01/02), Reportes (REP-01) y Búsqueda Global (BUS-01) mergeados a `main`.
- TR-08: Sincronización offline con Dexie + PWA en ALQ-09 y DEV-04 mergeado a `main`.
- Administración de Personal (ADP-01..10): completado y con cierre de huecos en `feature/cierre-huecos-20261012`.
- Disponibilidad y prevención de solapes de flota (`vehicle_commitments` + `reservations`).

---

## 2. Estado real por módulo

| Módulo | Doc | Backend | Frontend | Pendiente |
|--------|-----|---------|----------|-----------|
| **Consulta (CON-01..04)** | ✅ | ✅ | ✅ Incluye conversión a Alquiler directo | — |
| **Reserva (RES-01..08)** | ✅ | ✅ | ✅ | — |
| **Alquiler (ALQ-01..11)** | ✅ | ✅ mergeado | ✅ mergeado | BR-ALQ-013 falta grave; subida real evidencia; RENIEC/MTC real; modo offline ENTREGA-04 |
| **Devolución (DEV-01..10)** | ✅ | ✅ mergeado | ✅ mergeado | — |
| **Reclutamiento (REC-01..08)** | ✅ | ✅ mergeado + cierre huecos | ✅ mergeado + cierre huecos | — |
| **Personal/RRHH (ADP-01..10)** | ✅ | ✅ mergeado + cierre huecos | ✅ mergeado + cierre huecos | — |
| **Flota (FLO-01/02)** | ✅ | ✅ disponible por fechas | ✅ indicador visual disponibilidad | — |
| **Clientes (CLI-01/02)** | ✅ | ✅ | ✅ | — |
| **Admin/Soporte (ADM-01..05)** | ✅ | ✅ | ✅ incl. ADM-03 plantillas | ADM-02 verificación de migración residual en controladores |
| **Incidencias (INC-01/02)** | ✅ | ✅ | ✅ | — |
| **Plantillas de documentos** | ✅ TDD-TPL v1.0 | ✅ módulo standalone | ✅ ADM-03 | — |
| **TR-01 a TR-05** (auth/sesión) | ✅ | ✅ | ✅ | — |
| **TR-06 (Tablero por rol)** | ✅ 7 roles | ✅ | ✅ Funcional para todos los roles de negocio | — |
| **TR-07 (Notificaciones)** | ✅ | ✅ Despacho general Outbox | ✅ Parcial | — |
| **TR-08 (Offline sync)** | ✅ | ✅ N/A (solo frontend) | ✅ mergeado (Dexie + PWA) | — |
| **TR-09 (Perfil/sesión)** | ✅ | ⚠️ Parcial | ❌ Sin vista frontend dedicada (`/profile`) | Pantalla completa de Perfil de Usuario |
| **TR-10 (Control de acceso)** | ✅ | ⚠️ Parcial | ✅ usePermissions unificado (ROLES-DIN-03) | Verificar enforcement completo en backend |
| **TR-11 / HU-25 (Hub módulos)** | ✅ | ✅ | ✅ | — |
| **Pagos y garantías (PAG-01/02)** | ✅ BDD/SDD/TDD v1.0 — `payments.yaml` v0.1.0 | ✅ mergeado en main (PR #72) | ✅ mergeado en main (PR #81) | — |
| **Reportes (REP-01)** | ✅ BDD/SDD/TDD v1.0 — `reporting.yaml` v0.1.0 | ✅ mergeado en main (PR #72) | ✅ mergeado en main (PR #81) | — |
| **Búsqueda global (BUS-01)** | ✅ BDD/SDD/TDD v1.0 — `search.yaml` v0.1.0 | ✅ mergeado en main (PR #72) | ✅ mergeado en main (PR #81) | — |

### 2.1 Gaps cerrados — Alquiler y Flota (12-oct-2026)

- ✅ **BR-ALQ-013 (falta grave en ampliación)**: implementado backend y frontend en `feature/cierre-huecos-20261012`.
- ✅ **Traslado de reserva a garantía (P0-03 opción a)**: implementado en formalización y frontend.
- ✅ **Plantilla de contrato diferenciada (Natural vs. Jurídica)**: selector automático y manual en formalización.
- ✅ **Disponibilidad por fechas en Flota**: `availableFrom`/`availableTo` y regla compartida `vehicle-overlap`.
- ⚠️ **RENIEC/MTC**: **Excluidas formalmente del MVP** bajo decisión `DEC-MVP-RENIEC-MTC-EXCL-2026-10-11`. Operación manual en MVP.

### 2.2 Seguridad — estado actual

- ✅ Rate limiting global (`@nestjs/throttler`).
- ✅ Content-Security-Policy header.
- ✅ Cabecera Idempotency-Key habilitada en CORS preflight.
- ✅ handlebars CRITICAL CVE resuelto (override `4.7.10`).
- ✅ NestJS v12, firebase-admin v14, firebase v12.
- ⚠️ `sprintf-js` MODERATE (devDep, en allowlist hasta 2027-01-06).
- `npm run audit:prod` → 0 vulnerabilidades en producción.

---

## 3. Discrepancias y Deuda Técnica Activa

1. **TR-09 (Pantalla de Perfil de Usuario en Frontend)**: El dropdown de usuario y modal de logout existen, pero falta una vista dedicada (`/profile` o `/mi-cuenta`) con información del usuario, empresas/sedes asignadas y roles actuales.
2. **ADM-02 (Auditoría de Roles Dinámicos)**: Verificar endpoints residuales de controladores para asegurar que no queden validaciones legadas dependientes de enumeraciones estáticas.
3. **Mantenimiento y Políticas**: Recordar no subir drivers de almacenamiento local (`STORAGE_DRIVER=local`) a GitHub y mantener reinstalación limpia de node_modules/package-lock al refrescar paquetes.

---

## 4. Plan de fases — actualizado

**Fase 0 a Fase 5 — ✅ COMPLETADAS:**
Auth, Consulta, Reserva, Flota, Clientes, Alquiler, Devolución, Incidencias, Reclutamiento, Personal, Plantillas, Roles dinámicos, Offline sync (TR-08).

**Fase 6 — ✅ COMPLETADA (mergeada en `main` 11/12-oct-2026):**
- ✅ PAG-01/02: Módulo NestJS `payments` + frontend de registro y conciliación de pagos.
- ✅ REP-01: Módulo NestJS `reporting` + frontend de exportación y filtros de reportes.
- ✅ BUS-01: Módulo NestJS `search` + componente `GlobalSearch` (`Cmd+K`).
- ✅ Mergeado a `main` vía PR #72 (backend) y PR #81 (frontend).

**Fase 7 — EN PROGRESO (Cierre de brechas y estabilización — 12-oct-2026):**
- ✅ Apilado en ramas `feature/cierre-huecos-20261012` (PR #73 backend, PR #82 frontend).
- ✅ Cierre de huecos en ADP (cascada de aprobación, memos automáticos, capacitaciones ADP-10, rechazo formal).
- ✅ Cierre de huecos en Alquiler (P0-03 opción a, plantillas por titular, BR-ALQ-013 falta grave).
- ✅ Cierre de huecos en Reclutamiento (pausar vacante, honorarios prueba, descarga segura CV).
- ✅ Cierre de huecos en Flota (disponibilidad por rango de fechas y regla de solape compartida).
- ✅ Actualización integral del Manual de Usuario a v1.5.

---

## 5. Próximos pasos inmediatos sugeridos

1. **TR-08**: verificar que los agentes en curso completen ALQ-09 y DEV-04 con offline funcional y tests verdes.
2. **PAG-01/02 y REP-01**: requieren documentación BDD/SDD/TDD antes de poder implementarse.
3. **Seguir actualizando este documento al cierre de cada sesión relevante.**
