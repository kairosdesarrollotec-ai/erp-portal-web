---
name: kairos-source-preflight
description: "Valida fuentes documentales, baseline visual (cuando aplica) y alcance antes de cualquier cambio KAIROS. Precondicion obligatoria de todo agente que edite codigo."
---

## Proposito
Evitar que cualquier implementacion empiece sin fuentes resueltas, trazabilidad clara y (si es UI) un baseline visual aprobado vigente.

## Cuando usarla
Al inicio de cualquier tarea que vaya a crear o editar codigo, contrato o migracion.

## Parametros de entrada
- `task_id`
- `source_refs` (BR/UC/TDD-seccion/UX-ID esperados)
- `visual_refs` (solo si hay UI)
- `allowed_paths`

## Fuentes obligatorias
`docs/source-manifest.yaml`, `docs/prototype-manifest.yaml` (si hay UI), `docs/decision-log.md`, `docs/conflicts/`.

## Precondiciones
Los manifiestos deben existir y estar sincronizados con los archivos reales (si no, STOP y avisar a `index-maintainer`).

## Secuencia de ejecucion
1. Leer `source-manifest.yaml` y `prototype-manifest.yaml`.
2. Exigir `source_refs` no vacio; si hay UI, exigir `visual_refs` con un `PROTO-ID` en `status: APPROVED` vigente, especifico y legible para CADA `screen_state` y `viewport` que la tarea vaya a tocar (no basta con uno solo para el `UX-ID`).
3. Resolver version/estado de cada fuente referenciada.
4. Cruzar contra `docs/conflicts/` — si el alcance toca un conflicto abierto, detenerse.
5. Devolver PASS con el mapa de fuentes resueltas, o STOP con el codigo correspondiente.

## Condiciones STOP
`MISSING_SOURCE`, `MISSING_VISUAL_BASELINE`, `STALE_SOURCE`, `STALE_VISUAL_BASELINE`, `SOURCE_CONFLICT`.

## Artefactos de salida
Mapa de fuentes resueltas (no persiste archivo; es insumo para el agente que la invoco).

## Validaciones
Ningun ID se resuelve por coincidencia de nombre aproximada; solo por entrada exacta en el manifiesto.

## Criterios de aceptacion
PASS solo si `source_refs` y (si aplica) `visual_refs` estan completos, vigentes y sin conflicto abierto.

## Ejemplo minimo de invocacion
`kairos-source-preflight(task_id="KAI-ALQ-014", source_refs=["BR-ALQ-006"], visual_refs=["ALQ-10"])`
