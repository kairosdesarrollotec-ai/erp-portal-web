import { createBrowserRouter } from 'react-router-dom';
import { LoginScreen } from '../auth/LoginScreen';
import { ActivationScreen } from '../auth/ActivationScreen';
import { WorkContextScreen } from '../auth/WorkContextScreen';
import { DashboardScreen } from '../dashboard/DashboardScreen';
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
    path: '/seleccion-empresa-sede',
    // TR-05 - HU-23. useLogin.ts navega aqui si el usuario tiene mas de 1
    // asignacion empresa/sede (BR-ORG-002).
    element: <WorkContextScreen />,
  },
  {
    path: '/tablero',
    // TR-06 - HU-24. Login exitoso (0/1 asignacion) o TR-05 (tras elegir
    // empresa/sede) navegan aqui con el contexto ya resuelto.
    element: <DashboardScreen />,
  },
  {
    path: '/health',
    element: <HealthCheckScreen />,
  },
]);
