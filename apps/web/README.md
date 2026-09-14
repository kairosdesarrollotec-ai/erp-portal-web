# apps/web - KAIROS ERP Frontend

Stack inmutable (ver `.claude/rules/frontend/stack.md`): React + Vite + TypeScript, React Router, TanStack Query, Zustand (uso limitado), React Hook Form + Zod, cliente OpenAPI generado, Workbox + Dexie (solo ALQ-09/DEV-04), Radix UI, CSS Modules, Lucide, date-fns, TanStack Table, Vitest + Testing Library + MSW, Playwright, axe. Next.js explicitamente prohibido.

## Estado actual
Scaffold inicial (branch `86e38x5kr_bootstrap-front`): estructura de carpetas segun TDD-KAIROS-TRANSVERSAL.md seccion 6 (`app/`, `features/`, `offline/`, `design-system/`), configuracion de Vite/TS/Vitest, inicializacion del cliente de Firebase (Auth), y una pantalla placeholder de smoke-test. Sin pantallas reales todavia.

## Antes de correr

```bash
npm install
cp .env.example .env   # completar VITE_FIREBASE_* reales y VITE_API_BASE_URL
npm run dev
```

### Sobre las variables de Firebase

El frontend no distingue en codigo entre un proyecto Firebase de desarrollo y uno productivo: solo importa el valor de las variables `VITE_FIREBASE_*` en el `.env` local (gitignorado). Mientras no exista un proyecto de desarrollo propio, pueden apuntar directo al proyecto productivo.

## Convencion de trabajo (pantalla a pantalla)
Cada pantalla nueva sigue `.claude/skills/frontend-screen/SKILL.md`: se parte del UX-ID + PROTO-ID aprobado en `docs/prototype-manifest.yaml`, se valida contra BDD/SDD/TDD del modulo, y se agrega su propia carpeta bajo `src/features/<modulo>/` sin exceder ~300 lineas por archivo (excepcion 500 con justificacion).
