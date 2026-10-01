# MISSING_SOURCE — TR-11 sin contrato UX/UI en repositorio

| Campo | Valor |
|---|---|
| Código de detención | `MISSING_SOURCE` |
| Detectado en | HU-25 / PR#12 (23-sep-2026) |
| Registrado en | 25-sep-2026 |
| **Estado** | **RESUELTO — DEC-TR-11-001 (2026-10-01)** |

## Descripción

El UX-ID `TR-11` (Hub de módulos de navegación) no tiene contrato UX/UI
presente en `docs/sources/ux-ui/`. La especificación vigente
`especificacion-ux-ui-v3.1-para-prototipado-del-erp-kairos.md` sólo cubre
`TR-01` a `TR-10`. No existe `PANTALLAS-V3-B-TRANSVERSAL.md` en el repo.
Tampoco hay entradas de TR-11 en BDD, SDD ni TDD del repo.

## Fuentes afectadas

| Fuente | Estado | Observación |
|---|---|---|
| `docs/sources/ux-ui/PANTALLAS-V3-B-TRANSVERSAL.md` | **AUSENTE** | Referenciada en nota del manifiesto pero nunca comprometida |
| BDD transversal | **SIN ENTRADA TR-11** | — |
| SDD transversal | **SIN ENTRADA TR-11** | — |
| TDD transversal | **SIN ENTRADA TR-11** | — |
| `PROTO-TR-11-MENU-MODULOS` | APPROVED (PROVISIONAL) | Desktop 1600×1000 |
| `PROTO-TR-11-MENU-MODULOS-MOVIL` | APPROVED (PROVISIONAL) | Mobile 390×844 |

## Alcance afectado

`apps/web/src/app/modules/ModuleHubScreen.tsx` y sus dependencias.

## Resolución provisional

El PR#12 (HU-25) aprobó provisionalmente los prototipos el 23-sep-2026
(decision `PROV-TR-11-001` en `docs/decision-log.md`). La implementación
HU-25 procede bajo esa autorización provisional usando exclusivamente los
prototipos aprobados como autoridad visual y el plan de implementación
`plan-implementacion-pendientes-2026-09-24.md` como guía funcional.

## Reglas provisionales inferidas (no de fuente)

Las siguientes reglas se derivan del prototipo + plan (no de BDD/SDD/TDD):
- Visibilidad del módulo "Admin": sólo rol `ADMINISTRACION` (toggle del prototipo).
- Módulos sin ruta implementada: tarjeta deshabilitada con badge "Próximamente".
- Estas reglas deben reemplazarse cuando TR-11 tenga contrato formal y ADM-02 exista.

## Resolución (2026-10-01)

Acciones completadas:

1. ✅ Creado `docs/sources/ux-ui/PANTALLAS-V3-B-TRANSVERSAL.md` con la especificación
   formal de TR-11 (estados, responsive, accesibilidad, catálogo de módulos, trazabilidad).
2. ⏳ Entradas de TR-11 en BDD, SDD y TDD — pendiente para iteración futura (sin bloqueo
   actual; la implementación cumple el contrato UX/UI ahora existente).
3. ✅ `docs/decision-log.md` actualizado con DEC-TR-11-001 (reemplaza PROV-TR-11-001).
4. ✅ Implementación `ModuleHubScreen.tsx` compatible con el contrato formal creado.

## Acción pendiente (residual)

- Entradas TR-11 en BDD, SDD y TDD cuando se defina el rol de esta pantalla en los
  procesos de negocio y en ADM-02.
