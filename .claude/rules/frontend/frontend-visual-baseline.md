---
description: Autoridad del prototipo JPG/PNG aprobado y limites de inferencia visual. Aplica a toda creacion/modificacion de pantallas.
paths: ['apps/web/**', 'docs/prototypes/**']
---

# Baseline visual obligatorio

Aplica a toda creacion o modificacion de pantallas y componentes visuales KAIROS.

1. Exige `UX-ID` y, para CADA `screen_state` y `viewport` que la tarea vaya a construir o tocar, un `PROTO-ID` `APPROVED` vigente y especifico en `docs/prototype-manifest.yaml`. No basta con que exista algun `PROTO-ID` `APPROVED` para el `UX-ID`: cada estado visual completo (READY, ERROR, BLOCKED, EXTERNAL_DEPENDENCY_PENDING, etc.) y cada viewport (mobile, desktop) requerido necesita su propio prototipo aprobado.
2. Verifica archivo, `sha256`, version, estado visual y viewport antes de editar. Si el archivo del prototipo esta corrupto, vacio o ilegible (por ejemplo una imagen solida sin contenido), se trata igual que si no existiera: STOP `MISSING_VISUAL_BASELINE`.
3. El JPG/PNG gobierna composicion y apariencia de su estado/viewport; UX/UI gobierna interaccion, estados, responsive y accesibilidad; BDD/SDD/TDD/OpenAPI gobiernan negocio, flujo y contratos.
4. Nunca se infiere desde la imagen un endpoint, campo, dato, rol, permiso, transicion o regla.
5. Prohibido asumir o inventar la composicion visual de un estado a partir solo del texto (contrato TR/BDD/SDD/TDD). Se distingue:
   - Estados menores de interaccion (spinner de carga, boton deshabilitado, foco, hover, placeholder de campo vacio) SI pueden completarse con UX/UI y Design System, conservando el lenguaje visual, porque no cambian la composicion aprobada.
   - Estados visuales alternos completos (por ejemplo READY, RECOVERABLE_ERROR, BLOCKING_ERROR, EXTERNAL_DEPENDENCY_PENDING, u otra variante que cambie layout, mensaje principal o composicion de la pantalla) NUNCA se completan solo desde texto. Si no existe `PROTO-ID` `APPROVED` para ese estado/viewport especifico: STOP `MISSING_VISUAL_BASELINE` y solicitar al usuario el prototipo faltante antes de implementar ese estado.
6. Se genera captura y diff (`responsive-visual`); el implementador no aprueba su propio resultado ni actualiza el baseline.
7. WCAG 2.2 AA prevalece sobre defectos del prototipo; exige desviacion documentada.
8. Aplican los codigos STOP de `.claude/rules/shared/stop-codes.md`.
9. Si el usuario adjunta una imagen de pantalla directamente en la conversacion, esa imagen es la fuente autoritativa para ese estado/viewport: se registra primero como `PROTO-ID` via la skill `prototype-intake` (nunca se autoaprueba); pasa a `status: APPROVED` unicamente cuando el usuario confirma explicitamente que es la version valida (aprobador + fecha, segun exige `prototype-intake`). Una vez `APPROVED`, prevalece sobre cualquier composicion previamente asumida o inferida desde texto.
