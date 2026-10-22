import { Outlet } from 'react-router-dom';
import { usePermissions } from '../shared/usePermissions';
import { AccessDeniedScreen, GuardLoadingScreen } from './GuardScreens';

export interface PermissionRequirement {
  module: string;
  action: string;
}

interface RequirePermissionProps {
  /** Basta con tener UNO de estos permisos. */
  anyOf?: readonly PermissionRequirement[];
  /** Criterio libre (p. ej. el de supervisor de sincronización). Tiene prioridad sobre `anyOf`. */
  allow?: (can: (module: string, action: string) => boolean) => boolean;
}

/**
 * TR-10 / NFR-SEC-001: guard proactivo de ruta por PERMISOS (deny-by-default). Mientras los permisos cargan muestra el
 * estado de verificación; si fallan o no alcanzan muestra «Acceso denegado». El backend sigue siendo la autoridad.
 */
export function RequirePermission({ anyOf = [], allow }: RequirePermissionProps) {
  const { status, can } = usePermissions();

  if (status === 'idle' || status === 'loading') return <GuardLoadingScreen />;
  if (status === 'error') return <AccessDeniedScreen />;

  const permitted = allow ? allow(can) : anyOf.some((p) => can(p.module, p.action));
  if (!permitted) return <AccessDeniedScreen />;
  return <Outlet />;
}
