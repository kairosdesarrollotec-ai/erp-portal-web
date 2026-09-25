import { createBrowserRouter } from 'react-router-dom';
import { LoginScreen } from '../auth/LoginScreen';
import { ActivationScreen } from '../auth/ActivationScreen';
import { WorkContextScreen } from '../auth/WorkContextScreen';
import { DashboardScreen } from '../dashboard/DashboardScreen';
import { RequireDashboardAccess } from '../dashboard/RequireDashboardAccess';
import { HealthCheckScreen } from './HealthCheckScreen';
import { RequireAuthenticatedUser } from './RequireAuthenticatedUser';
import { RequireCompletedActivation } from './RequireCompletedActivation';

// Pantallas reales se registran aqui una a una, pantalla a pantalla,
// cada una respaldada por su UX-ID + PROTO-ID aprobado
// (ver .claude/skills/frontend-screen/SKILL.md).
export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginScreen />,
  },
  {
    // Hallazgo de revision (HU-21): ninguna ruta que asuma un usuario
    // autenticado debe ser accesible directo por URL sin guard central -
    // no basta con que el login navegue aqui.
    element: <RequireAuthenticatedUser />,
    children: [
      {
        path: '/activar-cuenta',
        // TR-02 - HU-21. Login exitoso navega aqui si el usuario esta en
        // "primer acceso" (ver useLogin.ts).
        element: <ActivationScreen />,
      },
      {
        // Ademas de la sesion, /tablero y /seleccion-empresa-sede exigen que
        // la activacion (cambio de contrasena + MFA) este confirmada.
        element: <RequireCompletedActivation />,
        children: [
          {
            path: '/seleccion-empresa-sede',
            // TR-05 - HU-23. useLogin.ts navega aqui si el usuario tiene 0
            // o mas de 1 asignacion empresa/sede (BR-ORG-002).
            element: <WorkContextScreen />,
          },
          {
            path: '/tablero',
            // TR-06 - HU-24. Login exitoso (0/1 asignacion) o TR-05 (tras
            // elegir empresa/sede) navegan aqui con el contexto ya resuelto.
            // RequireDashboardAccess: guard adicional del dashboard que valida
            // que el contexto este completo antes de renderizar.
            element: (
              <RequireDashboardAccess>
                <DashboardScreen />
              </RequireDashboardAccess>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '/health',
    element: <HealthCheckScreen />,
  },
]);
