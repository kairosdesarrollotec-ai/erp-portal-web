---
description: Catalogo unico de codigos STOP usados por agentes, skills y hooks.
paths: ['**']
---

# Codigos STOP

- `MISSING_SOURCE`: falta una fuente obligatoria.
- `STALE_SOURCE`: una fuente esta desactualizada respecto al manifiesto.
- `SOURCE_CONFLICT`: dos fuentes autorizadas se contradicen.
- `MISSING_VISUAL_BASELINE`: no existe `PROTO-ID` `APPROVED` vigente para el `UX-ID` EN EL `screen_state` y `viewport` requeridos (no basta con que exista algun `PROTO-ID` `APPROVED` para otro estado o viewport del mismo `UX-ID`); incluye el caso en que el archivo del prototipo existe pero esta corrupto, vacio o ilegible.
- `STALE_VISUAL_BASELINE`: el prototipo no corresponde a la version UX/UI vigente.
- `UNAPPROVED_DEVIATION`: se requiere apartarse de una fuente aprobada sin autorizacion registrada.
- `MISSING_API_CONTRACT`: falta el contrato OpenAPI necesario.
- `SECURITY_RISK`: la accion podria vulnerar seguridad o aislamiento multiempresa.
- `DESTRUCTIVE_OPERATION`: la accion puede causar perdida irreversible.

Un STOP detiene unicamente el alcance afectado, no toda la tarea salvo que el alcance completo dependa de la fuente en conflicto.
