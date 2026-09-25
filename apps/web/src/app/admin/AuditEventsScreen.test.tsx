import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuditEventsScreen } from './AuditEventsScreen';

const listAuditEventsMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'admin@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./audit-events-client', async () => {
  const actual = await vi.importActual<typeof import('./audit-events-client')>('./audit-events-client');
  return {
    ...actual,
    listAuditEvents: (...args: unknown[]) => listAuditEventsMock(...args),
  };
});

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/admin/auditoria', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } },
      ]}
    >
      <Routes>
        <Route path="/admin/auditoria" element={<AuditEventsScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuditEventsScreen (ADM-04)', () => {
  beforeEach(() => {
    listAuditEventsMock.mockReset();
  });

  it('muestra el historial de auditoria con actor, tipo y detalle', async () => {
    listAuditEventsMock.mockResolvedValue([
      {
        id: 'event-1',
        actorFirebaseUid: 'uid-1',
        actorEmail: 'admin@veloxrent.pe',
        entityType: 'admin_user_assignment',
        entityId: 'uid-target',
        action: 'USER_ASSIGNMENT_CREATED_OR_REACTIVATED',
        changes: { targetEmail: 'nuevo@veloxrent.pe' },
        createdAt: '2026-09-23T12:00:00.000Z',
      },
    ]);
    renderScreen();

    expect(await screen.findByText('admin@veloxrent.pe')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Usuarios y asignaciones' })).toBeInTheDocument();
    expect(screen.getByText('USER_ASSIGNMENT_CREATED_OR_REACTIVATED')).toBeInTheDocument();
  });

  it('no tiene ninguna columna ni boton de accion de escritura', async () => {
    listAuditEventsMock.mockResolvedValue([
      {
        id: 'event-1',
        actorFirebaseUid: 'uid-1',
        actorEmail: 'admin@veloxrent.pe',
        entityType: 'reservation',
        entityId: 'res-1',
        action: 'RESERVATION_CONFIRMED',
        changes: null,
        createdAt: '2026-09-23T12:00:00.000Z',
      },
    ]);
    renderScreen();

    await screen.findByText('admin@veloxrent.pe');
    expect(screen.queryByText(/editar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/eliminar/i)).not.toBeInTheDocument();
  });

  it('muestra el estado vacio cuando no hay eventos', async () => {
    listAuditEventsMock.mockResolvedValue([]);
    renderScreen();

    expect(await screen.findByText('No hay eventos que coincidan con este filtro.')).toBeInTheDocument();
  });

  it('muestra el error recuperable si la carga falla', async () => {
    listAuditEventsMock.mockRejectedValue(new Error('network'));
    renderScreen();

    expect(await screen.findByText(/No pudimos cargar el historial de auditoría/)).toBeInTheDocument();
  });

  it('aplica el filtro por tipo de cambio y rango de fechas', async () => {
    listAuditEventsMock.mockResolvedValue([]);
    renderScreen();

    await screen.findByText('No hay eventos que coincidan con este filtro.');

    fireEvent.change(screen.getByText('Todos').closest('select')!, { target: { value: 'reservation' } });
    fireEvent.click(screen.getByText('Filtrar'));

    await waitFor(() => {
      expect(listAuditEventsMock).toHaveBeenLastCalledWith('fake-id-token', 'c1', 'b1', {
        entityType: 'reservation',
        dateFrom: undefined,
        dateTo: undefined,
      });
    });
  });
});
