import { lazy, type ComponentType } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { LoginScreen } from '../auth/LoginScreen';
import { PasswordResetScreen } from '../auth/PasswordResetScreen';
import { ActivationScreen } from '../auth/ActivationScreen';
import { WorkContextScreen } from '../auth/WorkContextScreen';
import { DashboardScreen } from '../dashboard/DashboardScreen';
import { HealthCheckScreen } from './HealthCheckScreen';
import { RequireAuthenticatedUser } from './RequireAuthenticatedUser';
import { RequireCompletedActivation } from './RequireCompletedActivation';
import { RequirePermission } from './RequirePermission';
import { canSuperviseSync } from '../sync/useSyncCenter';
import { AuthenticatedLayout } from './AuthenticatedLayout';
import { ReservationsListScreen } from '../reservations/ReservationsListScreen';
import { ReservationDetailScreen } from '../reservations/ReservationDetailScreen';
import { ReservationConflictScreen } from '../reservations/ReservationConflictScreen';
import { ReservationSaleScreen } from '../reservations/ReservationSaleScreen';
import { ReservationNoShowScreen } from '../reservations/ReservationNoShowScreen';
import { InquiriesListScreen } from '../inquiries/InquiriesListScreen';
import { NewInquiryScreen } from '../inquiries/NewInquiryScreen';
import { InquiryVehiclesScreen } from '../inquiries/InquiryVehiclesScreen';
import { InquiryDetailScreen } from '../inquiries/InquiryDetailScreen';
import { CustomersListScreen } from '../customers/CustomersListScreen';
import { CustomerDetailScreen } from '../customers/CustomerDetailScreen';
import { ModuleHubScreen } from '../modules/ModuleHubScreen';
import { FleetListScreen } from '../fleet/FleetListScreen';
import { VehicleDetailScreen } from '../fleet/VehicleDetailScreen';
import { RentalsListScreen } from '../rentals/RentalsListScreen';
import { NewRentalScreen } from '../rentals/NewRentalScreen';
import { ActiveRentalScreen } from '../rentals/ActiveRentalScreen';
import { Stage1DocumentsScreen } from '../rentals/Stage1DocumentsScreen';
import { Stage2ValidationsScreen } from '../rentals/Stage2ValidationsScreen';
import { Stage3ContractScreen } from '../rentals/Stage3ContractScreen';
import { Stage4ChecklistScreen } from '../rentals/Stage4ChecklistScreen';
import { Stage5ConfirmationScreen } from '../rentals/Stage5ConfirmationScreen';
import { IncidentsListScreen } from '../incidents/IncidentsListScreen';
import { IncidentDetailScreen } from '../incidents/IncidentDetailScreen';
import { DepositsListScreen } from '../payments/DepositsListScreen';
import { DepositDetailScreen } from '../payments/DepositDetailScreen';
import { UserProfileScreen } from '../profile/UserProfileScreen';
import { EvidenceDeletionRequestsScreen } from '../evidence/EvidenceDeletionRequestsScreen';

function lazyNamed<TModule extends Record<string, unknown>, TName extends keyof TModule>(
  load: () => Promise<TModule>,
  name: TName,
) {
  return lazy(async () => ({ default: (await load())[name] as ComponentType }));
}

const ReturnsListScreen = lazyNamed(() => import('../returns/ReturnsListScreen'), 'ReturnsListScreen');
const ReceptionScreen = lazyNamed(() => import('../returns/ReceptionScreen'), 'ReceptionScreen');
const AlcoholTestScreen = lazyNamed(() => import('../returns/AlcoholTestScreen'), 'AlcoholTestScreen');
const ChecklistScreen = lazyNamed(() => import('../returns/ChecklistScreen'), 'ChecklistScreen');
const ResultScreen = lazyNamed(() => import('../returns/ResultScreen'), 'ResultScreen');
const DamageSeverityScreen = lazyNamed(() => import('../returns/DamageSeverityScreen'), 'DamageSeverityScreen');
const CosmeticDamageScreen = lazyNamed(() => import('../returns/CosmeticDamageScreen'), 'CosmeticDamageScreen');
const TechnicalDamageScreen = lazyNamed(() => import('../returns/TechnicalDamageScreen'), 'TechnicalDamageScreen');
const GuaranteeScreen = lazyNamed(() => import('../returns/GuaranteeScreen'), 'GuaranteeScreen');
const ClosureScreen = lazyNamed(() => import('../returns/ClosureScreen'), 'ClosureScreen');
const VacanciesListScreen = lazyNamed(() => import('../recruitment/VacanciesListScreen'), 'VacanciesListScreen');
const VacancyProfileScreen = lazyNamed(() => import('../recruitment/VacancyProfileScreen'), 'VacancyProfileScreen');
const CandidatesBoardScreen = lazyNamed(() => import('../recruitment/CandidatesBoardScreen'), 'CandidatesBoardScreen');
const CandidateFileScreen = lazyNamed(() => import('../recruitment/CandidateFileScreen'), 'CandidateFileScreen');
const InterviewScreen = lazyNamed(() => import('../recruitment/InterviewScreen'), 'InterviewScreen');
const HiringDecisionScreen = lazyNamed(() => import('../recruitment/HiringDecisionScreen'), 'HiringDecisionScreen');
const OnboardingScreen = lazyNamed(() => import('../recruitment/OnboardingScreen'), 'OnboardingScreen');
const ProbationScreen = lazyNamed(() => import('../recruitment/ProbationScreen'), 'ProbationScreen');
const EmployeesListScreen = lazyNamed(() => import('../hr-administration/EmployeesListScreen'), 'EmployeesListScreen');
const EmployeeFileScreen = lazyNamed(() => import('../hr-administration/EmployeeFileScreen'), 'EmployeeFileScreen');
const AttendanceTeamScreen = lazyNamed(() => import('../hr-administration/AttendanceTeamScreen'), 'AttendanceTeamScreen');
const MyAttendanceScreen = lazyNamed(() => import('../hr-administration/MyAttendanceScreen'), 'MyAttendanceScreen');
const MyRequestsScreen = lazyNamed(() => import('../hr-administration/MyRequestsScreen'), 'MyRequestsScreen');
const AttendanceReviewScreen = lazyNamed(() => import('../hr-administration/AttendanceReviewScreen'), 'AttendanceReviewScreen');
const GeofenceSettingsScreen = lazyNamed(() => import('../hr-administration/GeofenceSettingsScreen'), 'GeofenceSettingsScreen');
const PersonAttendanceScreen = lazyNamed(() => import('../hr-administration/PersonAttendanceScreen'), 'PersonAttendanceScreen');
const AbsenceScreen = lazyNamed(() => import('../hr-administration/AbsenceScreen'), 'AbsenceScreen');
const LeavesScreen = lazyNamed(() => import('../hr-administration/LeavesScreen'), 'LeavesScreen');
const VacationScreen = lazyNamed(() => import('../hr-administration/VacationScreen'), 'VacationScreen');
const FieldTripRequestScreen = lazyNamed(() => import('../hr-administration/FieldTripRequestScreen'), 'FieldTripRequestScreen');
const FieldTripsListScreen = lazyNamed(() => import('../hr-administration/FieldTripsListScreen'), 'FieldTripsListScreen');
const FieldTripAuthorizationScreen = lazyNamed(() => import('../hr-administration/FieldTripAuthorizationScreen'), 'FieldTripAuthorizationScreen');
const ReturnFollowUpScreen = lazyNamed(() => import('../hr-administration/ReturnFollowUpScreen'), 'ReturnFollowUpScreen');
const TerminationScreen = lazyNamed(() => import('../hr-administration/TerminationScreen'), 'TerminationScreen');
const TrainingScreen = lazyNamed(() => import('../hr-administration/TrainingScreen'), 'TrainingScreen');
const SyncCenterScreen = lazyNamed(() => import('../sync/SyncCenterScreen'), 'SyncCenterScreen');
const AreasScreen = lazyNamed(() => import('../hr-administration/AreasScreen'), 'AreasScreen');
const NewEmployeeScreen = lazyNamed(() => import('../hr-administration/NewEmployeeScreen'), 'NewEmployeeScreen');
const RolePermissionMatrixScreen = lazyNamed(() => import('../admin/RolePermissionMatrixScreen'), 'RolePermissionMatrixScreen');
const AdminUsersScreen = lazyNamed(() => import('../admin/AdminUsersScreen'), 'AdminUsersScreen');
const AuditEventsScreen = lazyNamed(() => import('../admin/AuditEventsScreen'), 'AuditEventsScreen');
const ReservationDepositPolicyScreen = lazyNamed(() => import('../admin/ReservationDepositPolicyScreen'), 'ReservationDepositPolicyScreen');
const NotificationTemplatesScreen = lazyNamed(() => import('../admin/NotificationTemplatesScreen'), 'NotificationTemplatesScreen');
const DocumentTemplatesScreen = lazyNamed(() => import('../admin/DocumentTemplatesScreen'), 'DocumentTemplatesScreen');
const ReportsDashboardScreen = lazyNamed(() => import('../reporting/ReportsDashboardScreen'), 'ReportsDashboardScreen');
const HrDocumentsScreen = lazyNamed(() => import('../hr-administration/HrDocumentsScreen'), 'HrDocumentsScreen');

// Pantallas reales se registran aqui una a una, pantalla a pantalla,
// cada una respaldada por su UX-ID + PROTO-ID aprobado
// (ver .claude/skills/frontend-screen/SKILL.md).
export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginScreen />,
  },
  {
    path: '/login',
    element: <LoginScreen />,
  },
  {
    path: '/recuperar-acceso',
    element: <PasswordResetScreen />,
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
              { path: '/perfil', element: <UserProfileScreen /> },
              { path: '/profile', element: <UserProfileScreen /> },
              { path: '/reservas', element: <ReservationsListScreen /> },
              { path: '/reservas/:id', element: <ReservationDetailScreen /> },
              { path: '/reservas/:id/conflicto', element: <ReservationConflictScreen /> },
              { path: '/reservas/:id/venta', element: <ReservationSaleScreen /> },
              { path: '/reservas/:id/no-show', element: <ReservationNoShowScreen /> },
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
              { path: '/alquileres/:id', element: <ActiveRentalScreen /> },
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
              // Administracion de Personal ADP-01..ADP-10 (acceso desde la tarjeta Personal).
              { path: '/personal', element: <EmployeesListScreen /> },
              { path: '/personal/asistencia', element: <AttendanceTeamScreen /> },
              // Asistencia propia con geocerca, revision de marcas fuera de la geocerca y su configuracion (hr-administration 0.10.0).
              {
                element: <RequirePermission anyOf={[{ module: 'HR_ADMINISTRATION', action: 'LOG_OWN_ATTENDANCE' }]} />,
                children: [{ path: '/mi-asistencia', element: <MyAttendanceScreen /> }],
              },
              { path: '/personal/mis-solicitudes', element: <MyRequestsScreen /> },
              { path: '/mis-solicitudes', element: <MyRequestsScreen /> },
              { path: '/personal/documentos', element: <HrDocumentsScreen /> },
              { path: '/documentos-institucionales', element: <HrDocumentsScreen /> },
              {
                element: <RequirePermission anyOf={[{ module: 'HR_ADMINISTRATION', action: 'REVIEW_ATTENDANCE' }]} />,
                children: [{ path: '/personal/asistencia/revision', element: <AttendanceReviewScreen /> }],
              },
              {
                element: <RequirePermission anyOf={[{ module: 'HR_ADMINISTRATION', action: 'MANAGE_GEOFENCE' }]} />,
                children: [{ path: '/personal/geocerca', element: <GeofenceSettingsScreen /> }],
              },
              { path: '/personal/campo', element: <FieldTripsListScreen /> },
              { path: '/personal/campo/:tripId/autorizacion', element: <FieldTripAuthorizationScreen /> },
              { path: '/personal/campo/:tripId/regreso', element: <ReturnFollowUpScreen /> },
              { path: '/personal/capacitacion', element: <TrainingScreen /> },
              { path: '/personal/nuevo', element: <NewEmployeeScreen /> },
              { path: '/personal/salida-a-campo', element: <FieldTripRequestScreen /> },
              { path: '/personal/:id', element: <EmployeeFileScreen /> },
              { path: '/personal/:id/asistencia', element: <PersonAttendanceScreen /> },
              { path: '/personal/:id/asistencia/falta', element: <AbsenceScreen /> },
              { path: '/personal/:id/permisos', element: <LeavesScreen /> },
              { path: '/personal/:id/vacaciones', element: <VacationScreen /> },
              { path: '/personal/:id/salida-a-campo', element: <FieldTripRequestScreen /> },
              { path: '/personal/:id/termino', element: <TerminationScreen /> },
              // Gestión de áreas de RR.HH.: solo Gerencia General (HR_ADMINISTRATION.MANAGE_AREAS).
              {
                element: <RequirePermission anyOf={[{ module: 'HR_ADMINISTRATION', action: 'MANAGE_AREAS' }]} />,
                children: [{ path: '/personal/areas', element: <AreasScreen /> }],
              },
              { path: '/admin/usuarios', element: <AdminUsersScreen /> },
              { path: '/admin/auditoria', element: <AuditEventsScreen /> },
              { path: '/admin/parametros', element: <ReservationDepositPolicyScreen /> },
              // TR-10: guard proactivo por el permiso que la pantalla ya usa (el backend valida ADMIN.MANAGE_PERMISSIONS).
              {
                element: <RequirePermission anyOf={[{ module: 'ADMIN', action: 'MANAGE_PERMISSIONS' }]} />,
                children: [{ path: '/admin/permisos', element: <RolePermissionMatrixScreen /> }],
              },
              // TR-08 Centro de sincronización: solo supervisores (mismo criterio que SyncConflictPanel: resolver conflictos).
              {
                element: <RequirePermission allow={canSuperviseSync} />,
                children: [{ path: '/sincronizacion', element: <SyncCenterScreen /> }],
              },
              // Bandeja de solicitudes de eliminacion de evidencia (doble aprobacion, evidence.yaml 1.0.0).
              {
                element: (
                  <RequirePermission
                    anyOf={[
                      { module: 'EVIDENCE', action: 'REQUEST_DELETION' },
                      { module: 'EVIDENCE', action: 'APPROVE_DELETION' },
                    ]}
                  />
                ),
                children: [{ path: '/evidencia/solicitudes', element: <EvidenceDeletionRequestsScreen /> }],
              },
              { path: '/admin/notificaciones', element: <NotificationTemplatesScreen /> },
              { path: '/admin/plantillas', element: <DocumentTemplatesScreen /> },
              { path: '/modulos', element: <ModuleHubScreen /> },
              // Reportes REP-01 — PROTO-REP-01-DASHBOARD-OPERATIVO-DESKTOP (APPROVED 2026-10-11).
              { path: '/reportes', element: <ReportsDashboardScreen /> },
              // Pagos y Garantias PAG-01 (bandeja) / PAG-02 (detalle).
              // Baselines: PROTO-PAG-01-BANDEJA-GARANTIAS-DESKTOP / PROTO-PAG-02-DETALLE-GARANTIA-DESKTOP (APPROVED 2026-10-11).
              { path: '/pagos/garantias', element: <DepositsListScreen /> },
              { path: '/pagos/garantias/:depositId', element: <DepositDetailScreen /> },
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
