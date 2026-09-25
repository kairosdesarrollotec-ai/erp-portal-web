import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotificationsPanel } from './NotificationsPanel';

const mockGetIdToken = vi.fn().mockResolvedValue('token-123');

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { getIdToken: mockGetIdToken } }),
}));

const mockGetMyNotifications = vi.fn();
const mockMarkAllNotificationsRead = vi.fn().mockResolvedValue(undefined);

vi.mock('./notifications-client', async () => {
  const actual = await vi.importActual<typeof import('./notifications-client')>('./notifications-client');
  return {
    ...actual,
    getMyNotifications: (...args: unknown[]) => mockGetMyNotifications(...args),
    markAllNotificationsRead: (...args: unknown[]) => mockMarkAllNotificationsRead(...args),
  };
});

describe('NotificationsPanel', () => {
  beforeEach(() => {
    mockGetMyNotifications.mockReset();
    mockMarkAllNotificationsRead.mockClear();
  });

  it('muestra la lista de notificaciones y navega al deepLink al tocar una', async () => {
    mockGetMyNotifications.mockResolvedValue([
      {
        id: 'n1',
        notificationType: 'ReservationCreated',
        isEscalated: false,
        title: 'Nueva reserva creada',
        deepLink: '/reservas/r1',
        readAt: null,
        createdAt: '2026-09-23T10:00:00.000Z',
      },
    ]);
    const onNavigate = vi.fn();

    render(
      <NotificationsPanel companyId="c1" branchId="b1" onClose={vi.fn()} onNavigate={onNavigate} />,
    );

    await waitFor(() => expect(screen.getByText('Nueva reserva creada')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Nueva reserva creada'));
    expect(onNavigate).toHaveBeenCalledWith('/reservas/r1');
  });

  it('muestra el estado vacío cuando no hay notificaciones', async () => {
    mockGetMyNotifications.mockResolvedValue([]);

    render(<NotificationsPanel companyId="c1" branchId="b1" onClose={vi.fn()} onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('No tienes notificaciones.')).toBeInTheDocument());
  });

  it('marca todas como leídas al usar la acción secundaria', async () => {
    mockGetMyNotifications.mockResolvedValue([
      {
        id: 'n1',
        notificationType: 'ReservationCreated',
        isEscalated: false,
        title: 'Nueva reserva creada',
        deepLink: '/reservas/r1',
        readAt: null,
        createdAt: '2026-09-23T10:00:00.000Z',
      },
    ]);

    render(<NotificationsPanel companyId="c1" branchId="b1" onClose={vi.fn()} onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Marcar todas como leídas')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Marcar todas como leídas'));
    await waitFor(() => expect(mockMarkAllNotificationsRead).toHaveBeenCalledWith('token-123', 'c1', 'b1'));
  });

  it('cierra el panel al hacer clic en el botón de cerrar', async () => {
    mockGetMyNotifications.mockResolvedValue([]);
    const onClose = vi.fn();

    render(<NotificationsPanel companyId="c1" branchId="b1" onClose={onClose} onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Cerrar'));
    expect(onClose).toHaveBeenCalled();
  });
});
