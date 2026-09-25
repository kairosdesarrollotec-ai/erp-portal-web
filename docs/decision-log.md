# Decision Log — ERP KAIROS/VeloxRent

Registro de decisiones explicitas aprobadas que resuelven contradicciones o autorizan un apartamiento de una fuente. Ninguna decision se marca resuelta sin aprobacion humana explicita, y ninguna decision de esta lista puede inventarse retroactivamente.

Cada entrada: `ID | Fecha | Fuentes en conflicto | Decision | Aprobado por | Alcance afectado`.

## Decisiones heredadas del blueprint (ya resueltas en las fuentes vigentes)

| ID | Fecha | Conflicto | Decision | Fuente que lo registra |
|---|---|---|---|---|
| DOC-CONFLICT-001 | 10 sep 2026 | UX/UI v3.0 indicaba Next.js; TDD v3.3 indicaba React SPA/PWA sin Next.js | React + Vite + React Router, sin Next.js | SDD v3.6, TDD v3.4, UX/UI v3.1 |
| DOC-CONFLICT-002 | — | Referencia visual GPS citaba BR-ALQ-006 | GPS corresponde a BR-ALQ-010 | Blueprint shared/01 |
| DOC-CONFLICT-003 | — | Referencia visual de dano grave citaba BR-DEV-008 | Clasificacion: BR-DEV-007; irreversibilidad/riesgo: BR-DEV-008 | Blueprint shared/01 |

## Decisiones tomadas durante el bootstrap de Claude Code (2026-09-14)

| ID | Fecha | Decision | Aprobado por | Alcance afectado |
|---|---|---|---|---|
| BOOT-001 | 2026-09-14 | Las 148 pantallas del export `stitch_veloxrent_prototipo_b` se registran como set final de prototipado y se marcan `status: APPROVED` en `docs/prototype-manifest.yaml` con `approved_by_role: PRODUCTO`, `approved_at: 2026-09-14`, en lugar de `PENDING_REVIEW` (que es lo que exige la regla de "no marcar APPROVED sin evidencia" cuando no hay aprobador/fecha explicitos en el archivo mismo). | Russbel (usuario, en la sesion de bootstrap) | Todas las pantallas cuyo `ux_id` se resolvio con confianza (145 de 148 no-asset). Las 3 pantallas de busqueda global sin UX-ID canonico y los 11 assets fotograficos de referencia quedan `PENDING_TRACE_REVIEW`, no `APPROVED` — no representan pantallas con UX-ID propio. |
| BOOT-002 | 2026-09-14 | El catalogo completo de las 148 pantallas se genero mediante mapeo automatico nombre-de-carpeta -> UX-ID cruzando contra la seccion 5 de la especificacion UX/UI v3.1, no mediante lectura manual de cada `code.html`. | Bootstrap Claude Code (accion tecnica, no de negocio) | Precision del campo `ux_id`/`module` en `docs/prototype-manifest.yaml`; requiere verificacion humana puntual, especialmente en las pantallas del wizard "entrega_etapa_X_de_5" mapeadas a ALQ-03..ALQ-09 por inferencia de contenido. |
| BOOT-003 | 2026-09-14 | La arquitectura de indexacion del blueprint (Zoekt, SCIP/LSP, Tree-sitter, pgvector, Sourcegraph) no se implementa en este bootstrap. Se usa exclusivamente filesystem + `rg` + manifiestos + indices IDE/LSP disponibles. | Instruccion explicita del usuario (principios obligatorios del bootstrap) | `.claude/rules`, busqueda/recuperacion de contexto de todos los agentes y skills. |

## Decisiones provisionales de implementación (post-bootstrap)

| ID | Fecha | Decision | Aprobado por | Alcance afectado |
|---|---|---|---|---|
| PROV-TR-11-001 | 2026-09-23 | TR-11 (hub de modulos) no tenia contrato UX/UI previo. Se redacto el contrato post-hoc y se aprobaron provisionalmente los prototipos PROTO-TR-11-MENU-MODULOS y PROTO-TR-11-MENU-MODULOS-MOVIL para desbloquear HU-25. La implementacion puede proceder usando los prototipos PROVISIONAL APPROVED como unica autoridad visual. Reglas de visibilidad por rol son provisionales (inferidas del prototipo, reemplazar con ADM-02). Ver `docs/conflicts/MISSING_TR11_UXUI_CONTRACT.md`. | Usuario (PR#12, 23-sep-2026) | `apps/web/src/app/modules/ModuleHubScreen.tsx` y ruta `/modulos` |

