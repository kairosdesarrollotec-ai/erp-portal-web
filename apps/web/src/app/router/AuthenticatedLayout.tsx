import { Outlet } from 'react-router-dom';
import { AppSidebar } from '../shared/AppSidebar';
import { useSyncPermissionsWithContext } from '../shared/useSyncPermissionsWithContext';
import styles from './AuthenticatedLayout.module.css';

/**
 * Layout compartido de todas las pantallas de negocio autenticadas.
 * Renderiza el sidebar de módulos (persistente en desktop, drawer en mobile)
 * junto al contenido de la ruta activa. WorkContextScreen queda fuera de
 * este layout a propósito — es una pantalla de selección transitoria.
 *
 * También mantiene cargados los permisos efectivos del contexto de trabajo
 * vigente (GET /me/permissions), también ante recargas directas por URL.
 */
export function AuthenticatedLayout() {
  useSyncPermissionsWithContext();

  return (
    <div className={styles.shell}>
      <AppSidebar />
      <div className={styles.rightPanel}>
        <Outlet />
      </div>
    </div>
  );
}
