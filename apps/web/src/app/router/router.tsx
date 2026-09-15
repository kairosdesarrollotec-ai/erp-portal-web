import { createBrowserRouter } from 'react-router-dom';
import { LoginScreen } from '../auth/LoginScreen';
import { ActivationScreen } from '../auth/ActivationScreen';
import { HealthCheckScreen } from './HealthCheckScreen';

// Pantallas reales se registran aqui una a una, pantalla a pantalla,
// cada una respaldada por su UX-ID + PROTO-ID aprobado
// (ver .claude/skills/frontend-screen/SKILL.md).
export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginScreen />,
  },
  {
    path: '/activar-cuenta',
    // TR-02 - HU-21. Login exitoso navega aqui si el usuario esta en
    // "primer acceso" (ver useLogin.ts).
    element: <ActivationScreen />,
  },
  {
    path: '/tablero',
    // TR-06 - placeholder hasta HU-24. Login exitoso navega aqui por ahora.
    element: <HealthCheckScreen />,
  },
  {
    path: '/health',
    element: <HealthCheckScreen />,
  },
]);
