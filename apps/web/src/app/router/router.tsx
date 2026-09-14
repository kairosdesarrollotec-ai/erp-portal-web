import { createBrowserRouter } from 'react-router-dom';
import { HealthCheckScreen } from './HealthCheckScreen';

// Pantallas reales se registran aqui una a una, pantalla a pantalla,
// cada una respaldada por su UX-ID + PROTO-ID aprobado
// (ver .claude/skills/frontend-screen/SKILL.md).
export const router = createBrowserRouter([
  {
    path: '/',
    element: <HealthCheckScreen />,
  },
]);
