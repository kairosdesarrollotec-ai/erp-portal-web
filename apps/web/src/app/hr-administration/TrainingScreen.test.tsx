import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TrainingScreen } from './TrainingScreen';
import { baseContext } from './hr-test-utils';

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));

describe('TrainingScreen (ADP-10)', () => {
  it('es un aviso claro de "Disponible próximamente" sin formulario ni acciones', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/personal/capacitacion', state: baseContext }]}>
        <TrainingScreen />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Disponible próximamente' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar taller/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a Personal/ })).toHaveAttribute('href', '/personal');
  });
});
