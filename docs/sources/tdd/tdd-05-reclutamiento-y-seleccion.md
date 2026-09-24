# TDD — 05 Reclutamiento y Selección

# Technical Design Document — Reclutamiento y Selección

**Código:** TDD-KAIROS-MVP-002 / REC **Versión:** 2.0 — dividido a partir de `TDD-KAIROS-Consolidado-Detallado.md` (v1.0) **Estado:** Completo en contenido, pendiente de revisión formal **Entradas:** `BDD-REC-001`, `SDD-REC-001` **Dominio:** Reclutamiento y Selección **Propietario técnico:** Tech Lead — pendiente de asignar **Revisores:** Arquitectura, Backend, Frontend, QA **Fecha:** 31 de agosto de 2026

> Depende de `TDD-KAIROS-TRANSVERSAL.md` para stack técnico, estructura de repositorio, convenciones de dominio, seguridad técnica, infraestructura, CI/CD, runbooks, DoD y criterios de aprobación.

---

## 1. Control y autoridad

Ver `TDD-KAIROS-TRANSVERSAL.md`, secciones 1.2-1.3.

### 1.1 Documentos relacionados

| Documento | Relación |
| --- | --- |
| `BDD-REC-001` | Fuente funcional autoritativa |
| `SDD-REC-001` | Fuente arquitectónica |
| `TDD-KAIROS-TRANSVERSAL.md` | Base técnica común |
| `TDD-ADP-001` | Módulo hermano — recibe el evento `RelacionLaboralTerminada` |

---

## 2. Objetivo técnico y alcance

Implementar el registro de necesidad de personal, publicación, decisión de contratación (exclusiva de Fiorella, sin ficha de puntaje formal hoy) e incorporación, dejando el modelo preparado para el Plan de Talento Humano formal sin rediseño (DR-KAI-012).

### 2.1 Incluido

- Backend y frontend del flujo Reclutamiento y Selección.
- Persistencia de vacantes y candidatos.
- Integración con HR-Administration para la creación del expediente de colaborador.

### 2.2 Fuera de alcance

- Ficha de puntaje formal obligatoria, Análisis de Puesto documentado — campos preparados, no exigidos.
- Evaluación de Desempeño y Capacitación formal.

---

## 3. Decisiones técnicas específicas

Ninguna decisión técnica propia más allá de las transversales.

---

## 4. Requisitos trazados

| BDD | SDD | Realización TDD |
| --- | --- | --- |
| REC-P01-02 / BR-REC-008 | UC-REC-001 | `RegisterVacancyHandler` |
| REC-P07-10 / BR-REC-003 | UC-REC-003 | `DecideCandidateHandler` |
| REC-P11-13 / BR-REC-005 | UC-REC-004 | `Employee` creado en `PERIODO_PRUEBA` (ver `TDD-ADP-001`) |
| REC-P14-15 / BR-REC-005 | UC-REC-005 | Transición `PERIODO_PRUEBA` → `PLANILLA` (ver `TDD-ADP-001`) |

---

## 5-6. Arquitectura y estructura

Reclutamiento y Selección usa la arquitectura de ejecución y estructura de repositorio transversales, bajo `apps/api/src/modules/recruitment/`.

---

## 7. Modelo de dominio

### 7.1 Agregado Vacancy / Candidate

| Elemento | Responsabilidad |
| --- | --- |
| Vacancy | Autoriza el ciclo de la necesidad de personal |
| Candidate | Conserva CV, pretensión salarial y decisión — campo de puntaje opcional, listo para el Plan formal (DR-KAI-012) sin forzarlo hoy |

### 7.2 Invariantes

1. La decisión de contratación es exclusiva de Fiorella, sin ficha de puntaje formal obligatoria hoy (BR-REC-003).
2. `EmploymentTermination` (definido en `TDD-ADP-001`) es el único disparador válido de una nueva `Vacancy` — ningún otro evento crea una vacante automáticamente (ADR-KAI-006).

---

## 8. Máquina de estados

### 8.1 Estados de Vacancy/Candidate

| Estado | Significado | Terminal |
| --- | --- | --- |
| `NECESIDAD_REGISTRADA` | Vacante identificada (BR-REC-008) | No |
| `PUBLICADA` | Recibiendo candidatos | No |
| `EN_NEGOCIACION` | Candidato entrevistado, sin decisión | No |
| `DECIDIDA` | Contratado o rechazado | Sí |

---

## 9. Modelo físico PostgreSQL

> Reutiliza las tablas transversales de `TDD-KAIROS-TRANSVERSAL.md` sección 7.

### 9.1 Tipos

```
CREATE TYPE vacancy_status AS ENUM ('NECESIDAD_REGISTRADA','PUBLICADA','EN_NEGOCIACION','DECIDIDA');
```

### 9.2 Tablas

```sql
CREATE TABLE vacancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operating_company_id uuid NOT NULL,
  source varchar(30) NOT NULL,   -- 'RENUNCIA' | 'CRECIMIENTO' | 'NUEVA_AREA' (BR-REC-008)
  profile varchar(1000) NOT NULL,
  status vacancy_status NOT NULL DEFAULT 'NECESIDAD_REGISTRADA',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

CREATE TABLE candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id uuid NOT NULL REFERENCES vacancies(id),
  full_name varchar(200) NOT NULL,
  cv_document_id uuid NOT NULL REFERENCES evidence(id),
  salary_expectation numeric(10,2) NULL,
  score numeric(5,2) NULL,          -- opcional hoy; obligatorio cuando aplique el Plan formal (DR-KAI-012)
  decision varchar(20) NULL,        -- 'CONTRATADO' | 'RECHAZADO'
  decided_by uuid NULL,
  decided_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_decision CHECK (decision IN ('CONTRATADO','RECHAZADO'))
);
```

---

## 10. Transacciones y concurrencia

### 10.1 Decidir contratación (UC-REC-003)

```
BEGIN
  cargar candidate FOR UPDATE
  verificar decision IS NULL (CANDIDATE_ALREADY_DECIDED si no)
  actualizar candidate.decision, decided_by, decided_at
  transicionar vacancy → DECIDIDA (si se contrató)
  insertar audit_event
  insertar outbox_event CandidatoSeleccionado
COMMIT
```

### 10.2 Optimistic locking

Todo comando mutable exige `If-Match: "<version>"` cuando aplique (candidates no versiona explícitamente dado su bajo volumen — se usa `decision IS NULL` como guard natural).

---

## 11. Contrato HTTP

### 11.1 Decidir contratación

```
POST /api/v1/candidates/{id}/commands/decide
Idempotency-Key: 018f...
```

```json
{
  "decision": "CONTRATADO",
  "decidedBy": "uuid (Fiorella)",
  "justification": "Entrevista positiva, disponibilidad inmediata"
}
```

---

## 12. Servicios de aplicación

| Handler | Comando |
| --- | --- |
| `RegisterVacancyHandler` | register |
| `RegisterCandidateHandler` | register-candidate |
| `DecideCandidateHandler` | decide |
| `OnboardEmployeeHandler` | onboard (crea `Employee` en `TDD-ADP-001`) |

---

## 13. Puertos internos

| Puerto | Dirección | Uso |
| --- | --- | --- |
| `EmployeeCreationPort` | Recruitment → HR-Administration | Crear el expediente de colaborador tras incorporar |

---

## 14. Eventos

| Evento | Productor | Consumidores |
| --- | --- | --- |
| `CandidatoSeleccionado.v1` | Recruitment | HR-Administration, Audit |
| `PasoAPlanilla.v1` | Recruitment | HR-Administration, Audit |

---

## 15. Idempotencia

Ver algoritmo transversal.

---

## 16. Autenticación y autorización

| Permiso | Uso |
| --- | --- |
| `hr:manage` | Todos los comandos de este módulo — decisión de contratación exclusiva de Fiorella |

---

## 17. Auditoría

`decide` genera `audit_event` obligatorio.

---

## 18. Frontend

Feature `apps/web/src/features/recruitment/` — necesidad → perfil → publicación → candidatos en negociación → entrevista → decisión → incorporación.

---

## 19-22. NFR, observabilidad, fallos y migraciones

Sin particularidades más allá de las transversales — bajo volumen, sin exigencia de consistencia transaccional crítica.

---

## 23. Testing

### 23.1 Casos obligatorios

- Candidato rechaza las condiciones (no continúa).
- Fiorella decide no contratar tras la entrevista.
- Personal mecánico: variante con contrato interno notariado.
- Evaluación a 3 meses positiva (planilla) vs. negativa (término, dispara Reclutamiento).

---

## 24. Matriz de validaciones

| Campo/regla | Capa | Código | Test |
| --- | --- | --- | --- |
| Candidato no decidido dos veces | Application/DB | `CANDIDATE_ALREADY_DECIDED` | TEST-REC-UNIT-001 |
| Scope empresarial (4 empresas del grupo) | Authorization/repository | `FORBIDDEN_SCOPE` | TEST-REC-SEC-001 |

---

## 25. Trazabilidad completa

| BDD requisito/regla | SDD caso/componente | TDD artefacto | API/evento | Test |
| --- | --- | --- | --- | --- |
| REC-P01-02 / BR-REC-008 | UC-REC-001 / Recruitment | `RegisterVacancyHandler` | — | — |
| REC-P07-10 / BR-REC-003 | UC-REC-003 / Recruitment | `DecideCandidateHandler` | decide / `CandidatoSeleccionado` | TEST-REC-UNIT-001 |
| REC-P11-13 / BR-REC-005 | UC-REC-004 / Recruitment-HR-Administration | `Employee` creado en `PERIODO_PRUEBA` | — / `PersonalIncorporado` | — |
| REC-P14-15 / BR-REC-005 | UC-REC-005 / Recruitment-HR-Administration | Transición `PERIODO_PRUEBA` → `PLANILLA` | — / `PasoAPlanilla` | — |

> 📌 Esta tabla también vive consolidada en `TDD-KAIROS-TRACEABILITY.md`.

---

## 26. Decisiones abiertas

Sin decisiones técnicas propias — ver `TDD-KAIROS-TRANSVERSAL.md`, sección 14.

---

## 27. Definition of Done y criterios de aprobación

Ver `TDD-KAIROS-TRANSVERSAL.md`, secciones 13 y 15.

---

## 28. Checklist de calidad 9-10

| Dimensión | Sección | Estado |
| --- | --- | --- |
| Modelo de dominio | 7 | Cumple |
| Máquina de estados | 8 | Cumple |
| Modelo físico | 9 | Cumple |
| Contrato HTTP | 11 | Cumple |
| Eventos | 14 | Cumple |
| Testing | 23-24 | Cumple |
| Trazabilidad | 25 | Cumple BDD→SDD→TDD |
| Dependencia del documento transversal | Secciones 1, 5-6, 19-22 | Cumple |

**Evaluación:** completo en contenido para el alcance de Reclutamiento y Selección. Pendiente de firmas formales.
