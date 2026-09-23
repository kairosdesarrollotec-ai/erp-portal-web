import { createBrowserRouter } from 'react-router-dom';
import { LoginScreen } from '../auth/LoginScreen';
import { ActivationScreen } from '../auth/ActivationScreen';
import { WorkContextScreen } from '../auth/WorkContextScreen';
import { DashboardScreen } from '../dashboard/DashboardScreen';
import { HealthCheckScreen } from './HealthCheckScreen';
import { RequireAuth } from './RequireAuth';
import { ReservationsListScreen } from '../reservations/ReservationsListScreen';
import { ReservationDetailScreen } from '../reservations/ReservationDetailScreen';
import { InquiriesListScreen } from '../inquiries/InquiriesListScreen';
import { NewInquiryScreen } from '../inquiries/NewInquiryScreen';
import { InquiryVehiclesScreen } from '../inquiries/InquiryVehiclesScreen';
import { InquiryDetailScreen } from '../inquiries/InquiryDetailScreen';
import { AdminUsersScreen } from '../admin/AdminUsersScreen';

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
    path: '/reservas',
    // RES-01 - HU-27. Bandeja de reservas.
    element: <ReservationsListScreen />,
  },
  {
    path: '/reservas/:id',
    // RES-04/RES-05 - HU-27. Confirmar/detalle de una reserva.
    element: <ReservationDetailScreen />,
  },
  {
    // Hallazgo de revision PR#11: las rutas de Consulta ahora exigen
    // sesion de Firebase valida (ver RequireAuth.tsx) - antes se podia
    // navegar directo a cualquiera de ellas sin autenticarse.
    element: <RequireAuth />,
    children: [
      {
        path: '/consultas',
        // CON-01 - HU-26. Bandeja de consultas.
        element: <InquiriesListScreen />,
      },
      {
        path: '/consultas/nueva',
        // CON-02 - HU-26. Registro de una nueva consulta.
        element: <NewInquiryScreen />,
      },
      {
        path: '/consultas/:id/vehiculos',
        // CON-03 - HU-26. Exhibicion y cotizacion de vehiculos elegibles.
        element: <InquiryVehiclesScreen />,
      },
      {
        path: '/consultas/:id',
        // CON-04 - HU-26. Detalle, cierre sin conversion (conversion a
        // reserva pendiente - ver InquiryDetailScreen.tsx).
        element: <InquiryDetailScreen />,
      },
      {
        path: '/admin/usuarios',
        // ADM-01. Bandeja de usuarios y asignaciones (empresa/sede/rol).
        // El backend re-valida server-side que el rol autorizado sea
        // ADMINISTRACION (admin-role-policy.ts) - esta ruta solo exige
        // sesion valida, igual que /consultas*.
        element: <AdminUsersScreen />,
      },
    ],
  },
  {
    path: '/health',
    element: <HealthCheckScreen />,
  },
]);
