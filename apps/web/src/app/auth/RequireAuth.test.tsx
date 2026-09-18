import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';

const onAuthStateChangedMock = vi.fn();

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => onAuthStateChangedMock(...args),
}));

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({}),
}));

function renderGuarded(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/protegida"
          element={
            <RequireAuth>
              <p>Contenido protegido</p>
            </RequireAuth>
          }
        />
        <Route path="/" element={<p>Pantalla de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/**
 * Hallazgo de revision (PR #8, finding #4): /seleccion-empresa-sede y
 * /tablero no tenian ningun guard - se podia entrar por URL directa sin
 * sesion. RequireAuth cierra ese hueco a nivel de router, antes de que la
 * pantalla protegida siquiera se monte.
 */
describe('RequireAuth', () => {
  beforeEach(() => {
    onAuthStateChangedMock.mockReset();
  });

  it('sin sesion (acceso directo por URL), redirige a login y nunca monta el contenido protegido', async () => {
    onAuthStateChangedMock.mockImplementation((_auth, callback: (user: unknown) => void) => {
      callback(null);
      return () => {};
    });

    renderGuarded('/protegida');

    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
  });

  it('con sesion activa, renderiza el contenido protegido', async () => {
    onAuthStateChangedMock.mockImplementation((_auth, callback: (user: unknown) => void) => {
      callback({ uid: 'user-1' });
      return () => {};
    });

    renderGuarded('/protegida');

    expect(await screen.findByText('Contenido protegido')).toBeInTheDocument();
  });

  it('mientras Firebase todavia no restauro la sesion (onAuthStateChanged no disparo), no redirige de una - espera el primer evento', () => {
    onAuthStateChangedMock.mockImplementation(() => () => {});

    renderGuarded('/protegida');

    expect(screen.queryByText('Pantalla de login')).not.toBeInTheDocument();
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
  });
});
