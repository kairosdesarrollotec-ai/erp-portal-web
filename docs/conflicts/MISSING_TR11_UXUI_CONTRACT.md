# MISSING_SOURCE — TR-11 sin contrato UX/UI en repositorio

| Campo | Valor |
|---|---|
| Código de detención | `MISSING_SOURCE` |
| Detectado en | HU-25 / PR#12 (23-sep-2026) |
| Registrado en | 25-sep-2026 |

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

## Acción pendiente

1. Crear `docs/sources/ux-ui/PANTALLAS-V3-B-TRANSVERSAL.md` con la especificación
   completa de TR-11 (estados, responsive, accesibilidad, animaciones, permisos).
2. Agregar entradas de TR-11 en BDD, SDD y TDD.
3. Actualizar `docs/decision-log.md` con la decisión formal una vez disponible.
4. Revisar y ajustar la implementación contra el contrato formal cuando exista.
