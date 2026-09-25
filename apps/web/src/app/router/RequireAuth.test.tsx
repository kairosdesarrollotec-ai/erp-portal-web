import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';

const onAuthStateChangedMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({}),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => onAuthStateChangedMock(...args),
}));

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/reservas']}>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/reservas" element={<div>pantalla protegida</div>} />
        </Route>
        <Route path="/" element={<div>login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth (finding #8, guard de autenticacion)', () => {
  beforeEach(() => {
    onAuthStateChangedMock.mockReset();
  });

  it('renderiza la ruta protegida cuando hay sesion', async () => {
    onAuthStateChangedMock.mockImplementation((_auth, callback) => {
      callback({ email: 'user@veloxrent.pe' });
      return () => {};
    });

    renderGuard();

    expect(await screen.findByText('pantalla protegida')).toBeInTheDocument();
  });

  it('redirige al login cuando no hay sesion', async () => {
    onAuthStateChangedMock.mockImplementation((_auth, callback) => {
      callback(null);
      return () => {};
    });

    renderGuard();

    expect(await screen.findByText('login')).toBeInTheDocument();
    expect(screen.queryByText('pantalla protegida')).not.toBeInTheDocument();
  });
});
