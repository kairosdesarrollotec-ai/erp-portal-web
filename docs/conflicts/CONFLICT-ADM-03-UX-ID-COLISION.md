# CONFLICT-ADM-03-UX-ID-COLISION

**Código:** `SOURCE_CONFLICT`  
**Detectado:** 2026-10-09  
**Bloqueante:** No — la implementación de ADM-03 (plantillas) puede proceder con `PROTO-ADM-03-LISTA-DESKTOP` APPROVED.

## Descripción

El `prototype-manifest.yaml` tiene dos PROTO-IDs bajo `ux_id: ADM-03`:

| PROTO-ID | Module | Semántica | Aprobado |
|----------|--------|-----------|---------|
| `PROTO-ADM-03-CATALOGOS-Y-PARAMETROS` | soporte | Catálogos y parámetros del sistema | 2026-09-14 |
| `PROTO-ADM-03-LISTA-DESKTOP` | admin | Plantillas de documentos (RENTAL_CONTRACT, RESERVATION_CONTRACT, RETURN_RESPONSIBILITY) | 2026-10-09 |

## Origen probable

`PROTO-ADM-03-CATALOGOS-Y-PARAMETROS` fue generado durante el bootstrap automático del manifest con `ux_id: ADM-03` sin validación. El UX-ID `ADM-03` corresponde según TDD-KAIROS-MVP-002-TPL v1.0 y PROP-017 a "Gestión de plantillas de documentos". "Catálogos y parámetros" debería tener un UX-ID distinto (posiblemente ADM-06 u otro pendiente de asignar).

## Decisión requerida

Determinar el UX-ID correcto para la pantalla de Catálogos y parámetros, actualizar `PROTO-ADM-03-CATALOGOS-Y-PARAMETROS` con ese nuevo UX-ID y actualizar la pantalla de catálogos cuando se implemente.

**No impide** la implementación de ADM-03 (plantillas) ya que el prototipo `PROTO-ADM-03-LISTA-DESKTOP` es el baseline aprobado el 2026-10-09 por PRODUCTO.
