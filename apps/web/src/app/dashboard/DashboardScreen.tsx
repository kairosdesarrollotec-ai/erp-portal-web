import { ChevronRight, Search, Settings, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboard } from './useDashboard';
import { isPlatformAdminRole } from '../shared/role-ref';
import { AppHeader } from '../shared/AppHeader';
import styles from './DashboardScreen.module.css';

/**
 * TR-06 - Tablero por rol. Fuente: PANTALLAS-V3-B-TRANSVERSAL.md
 * (rediseno v3.0). Prototipos aprobados: 7 vistas desktop READY (una por
 * rol) + 1 mobile READY (Gerencia) en docs/prototype-manifest.yaml.
 *
 * ALCANCE REAL (no sobre-declarado): el backend hoy solo proyecta
 * tareas reales para el rol Front-office, a partir del ciclo de vida de
 * Reserva (ver reservation-event.projector.ts) - los otros 6 roles
 * siguen recibiendo siempre `state: EMPTY` porque sus modulos de
 * dominio (Alquiler, Devolucion, Reclutamiento, RR.HH.) todavia no
 * proyectan eventos. Por eso esta pantalla NO implementa las 7
 * composiciones visuales distintas del contrato v3.0 (esas dependen de
 * datos que hoy no existen para 6 de los 7 roles) - implementa un unico
 * widget de lista de tareas, genérico por diseño, que ya funciona con
 * datos reales para Front-office y respeta el criterio "un widget sin
 * datos no ocupa espacio" (contrato punto 14) para el resto. Cuando
 * Alquiler/Devolucion/Reclutamiento/RR.HH. existan como modulos reales
 * y generen sus propios eventos, cada rol puede ganar su composicion de
 * widgets propia sobre esta misma base.
 */
export function DashboardScreen() {
  const { state, role, companyName, branchName, dashboardState, tasks, companyId, branchId } = useDashboard();
  // Composicion propia del rol de sistema PLATFORM_ADMIN (fijo, no delegable): ver role-ref.ts.
  const isPlatformAdmin = isPlatformAdminRole(role);

  return (
    <main className={styles.wrapper}>
      <AppHeader role={role} />

      <div className={styles.content}>
        {state === 'LOADING' && <p className={styles.loadingText}>Cargando tu tablero…</p>}

        {state === 'READY' && (
          <>
            <h1 className={styles.greeting}>Hola</h1>
            {role && <p className={styles.roleSubtitle}>{role.name}</p>}

            {isPlatformAdmin && companyId && branchId && (
              <PlatformAdminAccessCards
                companyId={companyId}
                companyName={companyName ?? ''}
                branchId={branchId}
                branchName={branchName ?? ''}
              />
            )}

            {!isPlatformAdmin && dashboardState === 'EMPTY' && (
              <p className={styles.emptyMessage}>No tienes pendientes por ahora.</p>
            )}

            {!isPlatformAdmin && dashboardState === 'READY' && tasks.length > 0 && (
              <ul className={styles.taskList}>
                {tasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      to={task.deepLink}
                      // El destino recibe la empresa/sede para no volver a pedirla (alertas de Gerencia: /personal/campo, /reclutamiento).
                      state={companyId && branchId ? { companyId, companyName: companyName ?? '', branchId, branchName: branchName ?? '' } : undefined}
                      className={styles.taskCard}
                    >
                      {task.itemType === 'ALERT' && (
                        <span className={styles.alertBadge} data-testid="task-alert-badge">
                          Alerta
                        </span>
                      )}
                      <span className={styles.taskTitle}>{task.title}</span>
                      {task.detail && <span className={styles.taskDetail}>{task.detail}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {state === 'UNRESOLVED' && (
          <p className={styles.emptyMessage}>
            No pudimos determinar tu contexto de trabajo. Vuelve a iniciar sesión para continuar.
          </p>
        )}
      </div>
    </main>
  );
}

// PROV-TR-06-PA-001: baseline visual PROTO-TR-06-DASHBOARD-ROL-ADMINISTRACION
const PLATFORM_ADMIN_CARDS = [
  {
    id: 'ADM-01',
    icon: <Users size={20} />,
    label: 'Usuarios',
    description: 'Cuentas, credenciales, asignación de roles y estados.',
    to: '/admin/usuarios',
  },
  {
    id: 'ADM-03',
    icon: <Settings size={20} />,
    label: 'Catálogos y parámetros',
    description: 'Tablas maestras, tarifas base y reglas del negocio.',
    to: '/admin/parametros',
  },
  {
    id: 'ADM-04',
    icon: <Search size={20} />,
    label: 'Auditoría',
    description: 'Registro inmutable de accesos, operaciones y eventos.',
    to: '/admin/auditoria',
  },
  {
    id: 'ADM-05',
    icon: <ShieldCheck size={20} />,
    label: 'Permisos',
    description: 'Matriz de roles y permisos por empresa y módulo.',
    to: '/admin/permisos',
  },
] as const;

interface AdminCardContext {
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
}

function PlatformAdminAccessCards(ctx: AdminCardContext) {
  return (
    <div className={styles.adminSection}>
      <p className={styles.adminSectionLabel}>ACCESOS DIRECTOS DE CONFIGURACIÓN</p>
      <div className={styles.adminGrid}>
        {PLATFORM_ADMIN_CARDS.map((card) => (
          <Link key={card.id} to={card.to} state={ctx} className={styles.adminCard}>
            <div className={styles.adminCardTop}>
              <span className={styles.adminCardIcon}>{card.icon}</span>
              <span className={styles.adminCardId}>{card.id}</span>
            </div>
            <span className={styles.adminCardLabel}>{card.label}</span>
            <span className={styles.adminCardDesc}>{card.description}</span>
            <ChevronRight size={16} className={styles.adminCardArrow} />
          </Link>
        ))}
      </div>
    </div>
  );
}
