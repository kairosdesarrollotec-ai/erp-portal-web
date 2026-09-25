# Plan de implementación — Semana 1

Generado 2026-09-14. Ámbito: arrancar la implementación real de producto (frontend+backend) usando el framework `.claude/` ya construido. Basado en `tdd-00-transversal.md` §5-7 (arquitectura, estructura de repo, límites de archivo, tablas transversales), no en supuestos nuevos.

## 0. Prerrequisitos antes de escribir la primera línea de código

Sin esto, el Día 1 no puede arrancar en serio:

1. **Infraestructura real de desarrollo**: proyecto Firebase (Authentication/Identity Platform, MFA) y proyecto Supabase/PostgreSQL de desarrollo, o sus emuladores locales. El TDD Transversal ya fija este stack (Google Cloud + Supabase + Firebase, no AWS) — falta que exista el proyecto real y las credenciales.
2. **Node 22 y gestor de paquetes** disponibles en el entorno donde se va a ejecutar el código (confirmar en tu máquina/CI).
3. **Scaffolding del monorepo** según `tdd-00-transversal.md` §6 (estructura exacta, no inventada):
   ```
   apps/web/src/{app,features,offline,design-system}
   apps/api/src/modules/{inquiries,reservations,rentals,returns,recruitment,hr-administration,customers,fleet,payments,evidence,notifications,audit}
   apps/worker/src/consumers
   packages/{contracts/openapi,contracts/events,domain-shared,ui,config,testing}
   infra/terraform
   docs/adr
   tests/e2e
   ```
4. **Contrato OpenAPI inicial**: crear `packages/contracts/openapi/` (ubicación real, ya definida en TDD — resuelve el `MISSING_SOURCE` pendiente del bootstrap) con el primer archivo (`transversal.yaml` o `auth.yaml`) antes de que Backend y Frontend empiecen en paralelo. Contract-first: Backend lo escribe/actualiza, Frontend nunca lo edita.
5. **Prisma schema base**: las 3 tablas compartidas por los 6 módulos ya están definidas en TDD §7.3 (`idempotency_keys`, `outbox_events`, `audit_events`) más `vehicle_commitments` (§7.4, compartida por Reserva/Alquiler) y las entidades de identidad/multiempresa (`organization`, `company`, `branch`, `user`, `role`). Esto se migra una sola vez al inicio, no por módulo.
6. **Quién aprueba los bloqueos P0/P1 diarios**: recomiendo que seas tú, en un checkpoint corto (15-30 min) al cierre de cada día — el implementador nunca aprueba su propio cambio, y los agentes de revisión no tienen permiso de escritura, así que alguien humano tiene que destrabar.
7. **Rama de trabajo**: `feature/semana-1-transversal-consulta-reserva` (o una por módulo). Ningún agente hace `git push` ni PR automáticamente — eso lo autorizas tú explícitamente.
8. **No bloqueante para Días 1-4, sí antes de tocar Alquiler**: revisar el mapeo automático UX-ID de las pantallas "entrega_etapa_X_de_5" en `docs/prototype-manifest.yaml` (riesgo ya señalado en el informe de bootstrap).

## 1. Por feature/flujo, no pantalla por pantalla

Recomendación: **avanzar por flujo vertical completo** (todas las pantallas de un proceso, de punta a punta: UI + API + DB + pruebas + trazabilidad), no pantalla aislada. Motivos:

- BDD/SDD/TDD están organizados por proceso, no por pantalla — la trazabilidad completa se verifica naturalmente por flujo.
- Las pantallas de un mismo flujo comparten estado y contexto (ej. RES-02→RES-08 heredan cliente/vehículo/periodo de CON-04); implementarlas aisladas obliga a retrabajo al conectar.
- El Design System rinde más cuando los patrones se descubren viendo varias pantallas de un flujo real, no una sola.
- La skill `frontend-flow` que ya está en `.claude/skills/` está pensada exactamente para esto.

Esto no significa PRs gigantes: dentro de cada flujo, cada pantalla sigue siendo su propia unidad de trabajo (skill `frontend-screen`), solo que se planifican y prueban en el orden del flujo, no salteadas.

## 2. Dos agentes, sincronizados por el contrato OpenAPI

- **Agente Backend**: orquesta `backend-slice-planner → domain-implementer → backend-migration (si el slice toca esquema) → backend-api → backend-testing`, con `prisma-migration-reviewer`, `api-contract-reviewer` y `authorization-reviewer` como revisión antes de cerrar cada slice.
- **Agente Frontend**: orquesta `frontend-slice-planner → design-system-engineer (solo si falta un componente) → react-feature-implementer → accessibility-reviewer → responsive-visual-reviewer → frontend-testing`.
- **Regla de sincronización**: Backend publica el contrato OpenAPI del módulo (`packages/contracts/openapi/<modulo>.yaml`) *antes* de que Frontend empiece ese módulo. Si Frontend llega primero, se detiene con `MISSING_API_CONTRACT` — es preferible que Backend vaya un flujo adelantado dentro del mismo día.
- `traceability-guardian` y `release-gatekeeper` corren al cierre de cada día sobre lo que completaron ambos agentes — no son un tercer agente de trabajo, son el checkpoint diario (con tu aprobación humana si bloquean algo).
- Si prefieres una tercera pista dedicada solo a revisión/QA en paralelo (en vez de al cierre del día), se puede separar — pero con disciplina de checkpoint diario, 2 agentes alcanzan.

## 3. Alcance realista para 5 días hábiles

Con calidad completa por pantalla (estados obligatorios, accesibilidad, fidelidad visual, pruebas, trazabilidad), los 75 UX-ID canónicos **no entran en una semana con 2 agentes**. Alcance propuesto:

| Día | Foco | Entregable |
|---|---|---|
| 0 (medio día) | Prerrequisitos | Scaffolding, contrato inicial, schema base migrado |
| 1 | Transversal crítico | TR-01 login, TR-05 selección empresa/sede, TR-06 dashboard (shell mínimo); backend: Firebase Auth + multiempresa base |
| 2 | Consulta completo | CON-01..CON-04, de punta a punta — módulo pequeño, primera plantilla replicable |
| 3-4 | Reserva completo | RES-01..RES-08, incluye excepciones (conflicto, venta, no-show) |
| 5 | Hardening + arranque Alquiler | Cerrar deuda de pruebas/accesibilidad/trazabilidad de Consulta+Reserva; arrancar ALQ-02 como puente a semana 2 |

ALQ-09 (checklist offline, Workbox/Dexie) queda deliberadamente para semana 2: introduce complejidad offline que no conviene mezclar con el arranque del monorepo.

## 4. Archivos pequeños y SOLID — ya está definido, no es una preferencia nueva

`tdd-00-transversal.md` §6.2 ya fija:
- Objetivo ≤300 líneas por archivo, excepción ≤500 con justificación explícita.
- Un handler por comando.
- Una política por decisión relevante (ej. `NotarialPolicy`, `RiskSemaphorePolicy`).
- Prohibido un `services.ts`/`utils.ts` global sin cohesión.
- Dependencias permitidas: `presentation → application → domain`; `domain` sin dependencia de framework; un módulo nunca lee la tabla de otro directamente, solo vía puerto o evento explícito.

Propongo extender el mismo límite (≤300 líneas, excepción justificada ≤500) al frontend, ya que el TDD no lo fija ahí explícitamente pero el mismo criterio aplica: separar contenedor/presentación cuando un componente crece, un hook por responsabilidad.

SOLID en concreto para este proyecto: dominio sin dependencias de framework (Prisma/NestJS/HTTP/Firebase quedan en `infrastructure`/`presentation`); un caso de uso = una clase/función; políticas de negocio inyectables y testeables aisladamente; interfaces explícitas para repositorios y adaptadores externos (RENIEC, MTC, pasarelas de pago).

## 5. Qué necesito confirmar antes de arrancar Día 1

1. Acceso real a Firebase (proyecto dev) y PostgreSQL/Supabase (dev) — o emuladores.
2. Node/pnpm disponibles en el entorno de ejecución.
3. Confirmar que tú apruebas los bloqueos P0/P1 diarios.
4. Confirmar `packages/contracts/openapi/` como ubicación del contrato (ya está en el TDD, solo falta tu OK para tratarlo como definitivo).
5. Confirmar el alcance de la semana (Transversal+Consulta+Reserva, no los 6 módulos completos).
