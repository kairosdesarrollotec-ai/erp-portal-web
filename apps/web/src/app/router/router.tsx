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
import { CustomerDetailScreen } from '../customers/CustomerDetailScreen';
import { AdminUsersScreen } from '../admin/AdminUsersScreen';
import { AuditEventsScreen } from '../admin/AuditEventsScreen';
import { ReservationDepositPolicyScreen } from '../admin/ReservationDepositPolicyScreen';
import { RolePermissionMatrixScreen } from '../admin/RolePermissionMatrixScreen';
import { NotificationTemplatesScreen } from '../admin/NotificationTemplatesScreen';
import { DocumentTemplatesScreen } from '../admin/DocumentTemplatesScreen';
import { ModuleHubScreen } from '../modules/ModuleHubScreen';
import { FleetListScreen } from '../fleet/FleetListScreen';
import { VehicleDetailScreen } from '../fleet/VehicleDetailScreen';
import { RentalsListScreen } from '../rentals/RentalsListScreen';
import { NewRentalScreen } from '../rentals/NewRentalScreen';
import { Stage1DocumentsScreen } from '../rentals/Stage1DocumentsScreen';
import { Stage2ValidationsScreen } from '../rentals/Stage2ValidationsScreen';
import { Stage3ContractScreen } from '../rentals/Stage3ContractScreen';
import { Stage4ChecklistScreen } from '../rentals/Stage4ChecklistScreen';
import { Stage5ConfirmationScreen } from '../rentals/Stage5ConfirmationScreen';
import { ReturnsListScreen } from '../returns/ReturnsListScreen';
import { ReceptionScreen } from '../returns/ReceptionScreen';
import { AlcoholTestScreen } from '../returns/AlcoholTestScreen';
import { ChecklistScreen } from '../returns/ChecklistScreen';
import { ResultScreen } from '../returns/ResultScreen';
import { DamageSeverityScreen } from '../returns/DamageSeverityScreen';
import { CosmeticDamageScreen } from '../returns/CosmeticDamageScreen';
import { TechnicalDamageScreen } from '../returns/TechnicalDamageScreen';
import { GuaranteeScreen } from '../returns/GuaranteeScreen';
import { ClosureScreen } from '../returns/ClosureScreen';
import { IncidentsListScreen } from '../incidents/IncidentsListScreen';
import { IncidentDetailScreen } from '../incidents/IncidentDetailScreen';
import { VacanciesListScreen } from '../recruitment/VacanciesListScreen';
import { VacancyProfileScreen } from '../recruitment/VacancyProfileScreen';
import { CandidatesBoardScreen } from '../recruitment/CandidatesBoardScreen';
import { CandidateFileScreen } from '../recruitment/CandidateFileScreen';
import { InterviewScreen } from '../recruitment/InterviewScreen';
import { HiringDecisionScreen } from '../recruitment/HiringDecisionScreen';
import { OnboardingScreen } from '../recruitment/OnboardingScreen';
import { ProbationScreen } from '../recruitment/ProbationScreen';

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
              { path: '/clientes/:id', element: <CustomerDetailScreen /> },
              { path: '/flota', element: <FleetListScreen /> },
              { path: '/flota/:id', element: <VehicleDetailScreen /> },
              { path: '/alquileres', element: <RentalsListScreen /> },
              { path: '/alquileres/nuevo', element: <NewRentalScreen /> },
              { path: '/alquileres/:id/entrega-01', element: <Stage1DocumentsScreen /> },
              { path: '/alquileres/:id/entrega-02', element: <Stage2ValidationsScreen /> },
              { path: '/alquileres/:id/entrega-03', element: <Stage3ContractScreen /> },
              { path: '/alquileres/:id/entrega-04', element: <Stage4ChecklistScreen /> },
              { path: '/alquileres/:id/entrega-05', element: <Stage5ConfirmationScreen /> },
              // Devolucion DEV-01..DEV-10 (DEV-05 = hub "Resultado").
              { path: '/devoluciones', element: <ReturnsListScreen /> },
              { path: '/devoluciones/recepcion/:rentalId', element: <ReceptionScreen /> },
              { path: '/devoluciones/:id/alcoholimetro', element: <AlcoholTestScreen /> },
              { path: '/devoluciones/:id/checklist', element: <ChecklistScreen /> },
              { path: '/devoluciones/:id/resultado', element: <ResultScreen /> },
              { path: '/devoluciones/:id/dano', element: <DamageSeverityScreen /> },
              { path: '/devoluciones/:id/dano/estetico', element: <CosmeticDamageScreen /> },
              { path: '/devoluciones/:id/dano/tecnico', element: <TechnicalDamageScreen /> },
              { path: '/devoluciones/:id/garantia', element: <GuaranteeScreen /> },
              { path: '/devoluciones/:id/cierre', element: <ClosureScreen /> },
              // Incidencias INC-01 (bandeja, admite ?rentalId=) / INC-02 (detalle RIO).
              { path: '/incidencias', element: <IncidentsListScreen /> },
              { path: '/incidencias/:id', element: <IncidentDetailScreen /> },
              // Reclutamiento y Seleccion REC-01..REC-08 (acceso desde Personal).
              { path: '/reclutamiento', element: <VacanciesListScreen /> },
              { path: '/reclutamiento/vacantes/:id', element: <VacancyProfileScreen /> },
              { path: '/reclutamiento/vacantes/:id/candidatos', element: <CandidatesBoardScreen /> },
              { path: '/reclutamiento/candidatos/:id', element: <CandidateFileScreen /> },
              { path: '/reclutamiento/candidatos/:id/entrevista', element: <InterviewScreen /> },
              { path: '/reclutamiento/candidatos/:id/decision', element: <HiringDecisionScreen /> },
              { path: '/reclutamiento/candidatos/:id/incorporacion', element: <OnboardingScreen /> },
              { path: '/reclutamiento/candidatos/:id/periodo-de-prueba', element: <ProbationScreen /> },
              { path: '/admin/usuarios', element: <AdminUsersScreen /> },
              { path: '/admin/auditoria', element: <AuditEventsScreen /> },
              { path: '/admin/parametros', element: <ReservationDepositPolicyScreen /> },
              // guard: el backend valida ADMIN.MANAGE_PERMISSIONS — la UI maneja el 403 con estado de error. Guard proactivo pendiente de TR-10.
              { path: '/admin/permisos', element: <RolePermissionMatrixScreen /> },
              { path: '/admin/notificaciones', element: <NotificationTemplatesScreen /> },
              { path: '/admin/plantillas', element: <DocumentTemplatesScreen /> },
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
