# Plan Maestro — KAIROS/VeloxRent ERP (estado real al 11-oct-2026)

> Actualizado el 2026-10-11 cruzando módulos reales en `main` contra documentación de negocio.
> Versión anterior: 30-sep-2026.

## 1. Resumen ejecutivo

El proyecto completó en main los 6 módulos de negocio del MVP core: Consulta, Reserva, Alquiler, Devolución, Reclutamiento y Administración de Personal. También están completos Flota, Clientes, Admin/Soporte, Incidencias, Plantillas de documentos y Roles dinámicos.

**Estado actual (11-oct-2026):**
- **Frontend**: 16 áreas funcionales activas en `apps/web/src/app/` — todas mergeadas a `main`.
- **142/142 tests E2E** pasando (Playwright); 34/34 capturas de pantalla generadas.
- **Pendiente principal**: TR-08 (offline), TR-09 (perfil frontend), reportes, pagos standalone, búsqueda global.

Desde la versión anterior del plan (30-sep) se completaron en frontend:
- Alquiler (ALQ-01..11): asistente de 5 etapas, mergeado.
- Devolución (DEV-01..10): mergeado — estaba "sin empezar".
- Incidencias (INC-01/02): mergeado.
- Reclutamiento (REC-01..08): mergeado — estaba "sin empezar".
- Administración de Personal (ADP-01..09): mergeado 11-oct — estaba "sin empezar".
- ADM-03 Plantillas de documentos: implementada.
- Roles dinámicos (ROLES-DIN-03): `usePermissions` unificado, eliminación de `legacy-role-policy`.
- Conversión Consulta → Alquiler directo.

---

## 2. Estado real por módulo

| Módulo | Doc | Frontend (main) | E2E | Pendiente |
|--------|-----|-----------------|-----|-----------|
| **Consulta (CON-01..04)** | ✅ | ✅ incl. conversión a Alquiler directo | ✅ | — |
| **Reserva (RES-01..08)** | ✅ | ✅ | ✅ | — |
| **Alquiler (ALQ-01..11)** | ✅ | ✅ asistente 5 etapas | ✅ | ENTREGA-04 online-only (pendiente TR-08); RENIEC/MTC simulado |
| **Devolución (DEV-01..10)** | ✅ | ✅ incl. plantilla responsabilidad | ✅ | — |
| **Reclutamiento (REC-01..08)** | ✅ | ✅ REC-01..08 completo | ✅ | — |
| **Personal/RRHH (ADP-01..09)** | ✅ | ✅ ADP-01..09, mergeado 11-oct | ✅ 14 tests | — |
| **Flota (FLO-01/02)** | ✅ | ✅ | ✅ | Rama `feat/fleet-gcs-photo-upload` pendiente de evaluar |
| **Clientes (CLI-01/02)** | ✅ | ✅ | ✅ | — |
| **Admin/Soporte (ADM-01..05)** | ✅ | ✅ incl. ADM-03 plantillas | ✅ | ADM-02 enforcement pendiente de verificación |
| **Incidencias (INC-01/02)** | ✅ | ✅ | ✅ | — |
| **TR-01 a TR-05** (auth/sesión) | ✅ | ✅ | ✅ | — |
| **TR-06 (Tablero por rol)** | ✅ 7 roles | ✅ funcional para todos los roles construidos | ✅ | Widgets para módulos futuros (reportes, pagos) |
| **TR-07 (Notificaciones)** | ✅ | ⚠️ Parcial | ⚠️ | Despachador general |
| **TR-08 (Offline sync)** | ✅ | ❌ Sin empezar | ❌ | Bloqueador para ENTREGA-04 de Alquiler en campo |
| **TR-09 (Perfil/sesión)** | ✅ | ❌ Sin frontend dedicado | ❌ | Pantalla de perfil de usuario |
| **TR-10 (Control de acceso)** | ✅ | ✅ `usePermissions` unificado | ✅ | — |
| **TR-11 / HU-25 (Hub módulos)** | ✅ | ✅ | ✅ | — |
| **Pagos y garantías (PAG-01/02)** | ✅ | ❌ Sin módulo standalone | ❌ | Módulo independiente de pagos |
| **Reportes (REP-01)** | ✅ | ❌ | ❌ | Todo |
| **Búsqueda global** | — | ❌ | ❌ | Todo |

### 2.1 Módulos en `apps/web/src/app/` (11-oct-2026)

```
admin           auth            config          customers
dashboard       fleet           hooks           hr-administration
incidents       inquiries       modules         notifications
providers       recruitment     rentals         reservations
returns         router          shared
```

### 2.2 Gaps conocidos — Alquiler

- **ENTREGA-04 online-only**: checklist de fotos/videos sin subida real de archivos — depende de endpoint backend + TR-08.
- **RENIEC/MTC**: simulado en UI, sin integración real.

### 2.3 Cobertura E2E

- **Suite completa**: 142/142 tests Playwright pasando.
- **Capturas**: 34 pantallas documentadas en la guía de usuario.
- **Guía de usuario**: artifact publicado en `https://claude.ai/artifact/TbgLr3ga1uAxbWpUcBetJV` (versión 8, 11-oct-2026).
- **Specs activos**: `admin.spec.ts`, `authentication.spec.ts`, `customers.spec.ts`, `dashboard.spec.ts`, `fleet.spec.ts`, `hr-administration.spec.ts`, `incidents.spec.ts`, `inquiries.spec.ts`, `modules.spec.ts`, `recruitment.spec.ts`, `rentals.spec.ts`, `reservations.spec.ts`, `returns.spec.ts`, `screenshots.spec.ts`.

---

## 3. Discrepancias activas

1. **ADM-02 (Roles y permisos)**: el sistema usa roles dinámicos (ROLES-DIN-03), pero no se auditó que todos los guards NestJS apliquen el nuevo modelo consistentemente en backend.
2. **TR-06 Tablero**: funcional para roles ya construidos; necesitará widgets cuando existan Reportes y Pagos.
3. **Rama `feat/fleet-gcs-photo-upload`**: mejora de Flota sin mergear. Sin bloqueo técnico conocido — pendiente de decisión.
4. **TR-08 bloqueador concreto**: ENTREGA-04 de Alquiler queda online-only sin offline sync.
5. **Conflicto `MISSING_TR11_UXUI_CONTRACT`**: registrado en `docs/conflicts/` — revisar si sigue activo.

---

## 4. Plan de fases — actualizado

**Fase 0 — ✅ COMPLETADA:**
TR-01..05, TR-06 (funcional), TR-07 (parcial), TR-10, TR-11, Consulta, Reserva, Flota, Clientes, Admin/Soporte, Plantillas de documentos, Roles dinámicos.

**Fase 1 — ✅ COMPLETADA:**
Alquiler (ALQ-01..11).

**Fase 2 — ✅ COMPLETADA:**
Devolución (DEV-01..10), Incidencias (INC-01/02).

**Fase 3 — ✅ COMPLETADA (inesperadamente adelantada):**
Reclutamiento (REC-01..08), Administración de Personal (ADP-01..09).

**Fase 4 — EN CURSO / SIGUIENTE:**
- TR-09 (perfil de usuario — pantalla frontend).
- Cierre gaps Alquiler: endpoint de evidencia (fotos/videos), BR-ALQ-013 falta grave.
- `feat/fleet-gcs-photo-upload`: evaluar y mergear.
- TR-07: despachador general de notificaciones.
- Verificar ADM-02 enforcement.

**Fase 5 — PRÓXIMA:**
- TR-08 (sincronización offline) — bloqueador de ENTREGA-04.
- Pagos y garantías como módulo standalone (PAG-01/02).
- Reportes (REP-01).

**Fase 6 — FUTURA:**
- Búsqueda global.
- Integraciones reales RENIEC/MTC.
- Expansión multisede.

---

## 5. Próximos pasos inmediatos sugeridos

1. **TR-09 perfil frontend**: la pantalla de perfil/sesión no tiene implementación frontend; el backend ya tiene parte del soporte.
2. **Endpoint de evidencia para Alquiler**: diseñar y construir el endpoint de subida de archivos como prerrequisito para ENTREGA-04 completo y Devolución futura.
3. **BR-ALQ-013**: implementar el caso de falta grave en ampliaciones de alquiler.
4. **`feat/fleet-gcs-photo-upload`**: revisar si sigue siendo relevante y decidir el flujo de PR.
5. **Resolver conflicto `MISSING_TR11_UXUI_CONTRACT`**: verificar si sigue activo o puede cerrarse.
6. **Seguir actualizando este documento al cierre de cada sesión relevante.**
