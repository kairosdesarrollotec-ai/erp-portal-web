import { createBrowserRouter } from 'react-router-dom';
import { LoginScreen } from '../auth/LoginScreen';
import { ActivationScreen } from '../auth/ActivationScreen';
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
        // Ademas de la sesion, /tablero exige que la activacion (cambio de
        // contrasena + MFA) este realmente confirmada por el backend.
        element: <RequireCompletedActivation />,
        children: [
          {
            path: '/tablero',
            // TR-06 - placeholder hasta HU-24. Login exitoso navega aqui por ahora.
            element: <HealthCheckScreen />,
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
