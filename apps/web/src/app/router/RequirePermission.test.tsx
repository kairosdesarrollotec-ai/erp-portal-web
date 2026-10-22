import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequirePermission } from './RequirePermission';
import { usePermissionsStore } from '../shared/usePermissions';
import { clearPermissions, setPermissions } from '../../test/permissions';

function renderGuard(guard: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/admin/permisos']}>
      <Routes>
        <Route element={guard}>
          <Route path="/admin/permisos" element={<div>matriz de permisos</div>} />
        </Route>
        <Route path="/tablero" element={<div>tablero</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const MANAGE = <RequirePermission anyOf={[{ module: 'ADMIN', action: 'MANAGE_PERMISSIONS' }]} />;

describe('RequirePermission (TR-10)', () => {
  beforeEach(() => {
    clearPermissions();
  });

  it('con el permiso renderiza la ruta', () => {
    setPermissions(['ADMIN.MANAGE_PERMISSIONS']);
    renderGuard(MANAGE);
    expect(screen.getByText('matriz de permisos')).toBeInTheDocument();
  });

  it('sin el permiso muestra «No tienes acceso a esta sección» y no la pantalla', () => {
    setPermissions(['ADMIN.MANAGE_USERS']);
    renderGuard(MANAGE);
    expect(screen.getByRole('heading', { name: 'No tienes acceso a esta sección' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/tablero');
    expect(screen.queryByText('matriz de permisos')).not.toBeInTheDocument();
  });

  it('mientras los permisos cargan no deja pasar ni deniega', () => {
    usePermissionsStore.setState({ status: 'loading' });
    renderGuard(MANAGE);
    expect(screen.getByText('Verificando tu sesión…')).toBeInTheDocument();
    expect(screen.queryByText('matriz de permisos')).not.toBeInTheDocument();
  });

  it('si los permisos fallan al cargar, deniega (deny-by-default)', () => {
    usePermissionsStore.setState({ status: 'error' });
    renderGuard(MANAGE);
    expect(screen.getByRole('heading', { name: 'No tienes acceso a esta sección' })).toBeInTheDocument();
  });

  it('allow personalizado tiene prioridad', () => {
    setPermissions(['RETURN.CLOSE']);
    renderGuard(<RequirePermission allow={(can) => can('RETURN', 'CLOSE')} />);
    expect(screen.getByText('matriz de permisos')).toBeInTheDocument();
  });
});
