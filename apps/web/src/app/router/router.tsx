import { createBrowserRouter } from 'react-router-dom';
import { LoginScreen } from '../auth/LoginScreen';
import { ActivationScreen } from '../auth/ActivationScreen';
import { WorkContextScreen } from '../auth/WorkContextScreen';
import { DashboardScreen } from '../dashboard/DashboardScreen';
import { HealthCheckScreen } from './HealthCheckScreen';
import { RequireAuthenticatedUser } from './RequireAuthenticatedUser';
import { RequireCompletedActivation } from './RequireCompletedActivation';
import { ReservationsListScreen } from '../reservations/ReservationsListScreen';
import { ReservationDetailScreen } from '../reservations/ReservationDetailScreen';

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
        // TR-02 - HU-21.
        element: <ActivationScreen />,
      },
      {
        // Ademas de la sesion, las rutas de negocio exigen que la activacion
        // (cambio de contrasena + MFA) este confirmada. Las rutas de reservas
        // estaban protegidas por RequireAuth (HU-27 PR#10); se eleva aqui a
        // RequireCompletedActivation que es mas riguroso.
        element: <RequireCompletedActivation />,
        children: [
          {
            path: '/seleccion-empresa-sede',
            // TR-05 - HU-23.
            element: <WorkContextScreen />,
          },
          {
            path: '/tablero',
            // TR-06 - HU-24.
            element: <DashboardScreen />,
          },
          {
            path: '/reservas',
            // RES-01 - HU-27.
            element: <ReservationsListScreen />,
          },
          {
            path: '/reservas/:id',
            // RES-04/RES-05 - HU-27.
            element: <ReservationDetailScreen />,
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
