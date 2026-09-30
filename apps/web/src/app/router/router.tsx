import { createBrowserRouter } from 'react-router-dom';
import { LoginScreen } from '../auth/LoginScreen';
import { ActivationScreen } from '../auth/ActivationScreen';
import { WorkContextScreen } from '../auth/WorkContextScreen';
import { DashboardScreen } from '../dashboard/DashboardScreen';
import { HealthCheckScreen } from './HealthCheckScreen';
import { RequireAuthenticatedUser } from './RequireAuthenticatedUser';
import { RequireCompletedActivation } from './RequireCompletedActivation';
import { AuthenticatedLayout } from './AuthenticatedLayout';
import { ReservationsListScreen } from '../reservations/ReservationsListScreen';
import { ReservationDetailScreen } from '../reservations/ReservationDetailScreen';
import { InquiriesListScreen } from '../inquiries/InquiriesListScreen';
import { NewInquiryScreen } from '../inquiries/NewInquiryScreen';
import { InquiryVehiclesScreen } from '../inquiries/InquiryVehiclesScreen';
import { InquiryDetailScreen } from '../inquiries/InquiryDetailScreen';
import { CustomersListScreen } from '../customers/CustomersListScreen';
import { AdminUsersScreen } from '../admin/AdminUsersScreen';
import { AuditEventsScreen } from '../admin/AuditEventsScreen';
import { ReservationDepositPolicyScreen } from '../admin/ReservationDepositPolicyScreen';
import { RolePermissionMatrixScreen } from '../admin/RolePermissionMatrixScreen';
import { NotificationTemplatesScreen } from '../admin/NotificationTemplatesScreen';
import { ModuleHubScreen } from '../modules/ModuleHubScreen';
import { FleetListScreen } from '../fleet/FleetListScreen';
import { RentalsListScreen } from '../rentals/RentalsListScreen';
import { NewRentalScreen } from '../rentals/NewRentalScreen';
import { Stage1DocumentsScreen } from '../rentals/Stage1DocumentsScreen';
import { Stage2ValidationsScreen } from '../rentals/Stage2ValidationsScreen';
import { Stage3ContractScreen } from '../rentals/Stage3ContractScreen';
import { Stage4ChecklistScreen } from '../rentals/Stage4ChecklistScreen';
import { Stage5ConfirmationScreen } from '../rentals/Stage5ConfirmationScreen';

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
    // autenticado debe ser accesible directo por URL sin guard central.
    element: <RequireAuthenticatedUser />,
    children: [
      {
        path: '/activar-cuenta',
        // TR-02 - HU-21.
        element: <ActivationScreen />,
      },
      {
        // Todas las rutas de negocio exigen activacion completa. Las rutas de
        // Consulta y Admin estaban bajo RequireAuth (HU-26 PR#11); se eleva
        // aqui a RequireCompletedActivation.
        element: <RequireCompletedActivation />,
        children: [
          { path: '/seleccion-empresa-sede', element: <WorkContextScreen /> },
          {
            element: <AuthenticatedLayout />,
            children: [
              { path: '/tablero', element: <DashboardScreen /> },
              { path: '/reservas', element: <ReservationsListScreen /> },
              { path: '/reservas/:id', element: <ReservationDetailScreen /> },
              { path: '/consultas', element: <InquiriesListScreen /> },
              { path: '/consultas/nueva', element: <NewInquiryScreen /> },
              { path: '/consultas/:id/vehiculos', element: <InquiryVehiclesScreen /> },
              { path: '/consultas/:id', element: <InquiryDetailScreen /> },
              { path: '/clientes', element: <CustomersListScreen /> },
              { path: '/flota', element: <FleetListScreen /> },
              { path: '/alquileres', element: <RentalsListScreen /> },
              { path: '/alquileres/nuevo', element: <NewRentalScreen /> },
              { path: '/alquileres/:id/entrega-01', element: <Stage1DocumentsScreen /> },
              { path: '/alquileres/:id/entrega-02', element: <Stage2ValidationsScreen /> },
              { path: '/alquileres/:id/entrega-03', element: <Stage3ContractScreen /> },
              { path: '/alquileres/:id/entrega-04', element: <Stage4ChecklistScreen /> },
              { path: '/alquileres/:id/entrega-05', element: <Stage5ConfirmationScreen /> },
              { path: '/admin/usuarios', element: <AdminUsersScreen /> },
              { path: '/admin/auditoria', element: <AuditEventsScreen /> },
              { path: '/admin/parametros', element: <ReservationDepositPolicyScreen /> },
              { path: '/admin/permisos', element: <RolePermissionMatrixScreen /> },
              { path: '/admin/notificaciones', element: <NotificationTemplatesScreen /> },
              { path: '/modulos', element: <ModuleHubScreen /> },
            ],
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
