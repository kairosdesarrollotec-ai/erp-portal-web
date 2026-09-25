import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NotificationTemplatesScreen } from './NotificationTemplatesScreen';

const getNotificationTemplatesMock = vi.fn();
const saveNotificationTemplateMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'admin@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./notification-templates-client', async () => {
  const actual = await vi.importActual<typeof import('./notification-templates-client')>('./notification-templates-client');
  return {
    ...actual,
    getNotificationTemplates: (...args: unknown[]) => getNotificationTemplatesMock(...args),
    saveNotificationTemplate: (...args: unknown[]) => saveNotificationTemplateMock(...args),
  };
});

function baseData() {
  return {
    allowedVariables: ['nombre', 'fecha'],
    channels: ['EMAIL', 'PUSH', 'SMS'],
    templates: [
      {
        eventType: 'ReservationConfirmed',
        label: 'Reserva confirmada',
        current: { eventType: 'ReservationConfirmed', version: 1, channels: ['EMAIL'], body: 'Hola {nombre}' },
        history: [],
      },
      {
        eventType: 'ReservationCreated',
        label: 'Reserva creada',
        current: null,
        history: [],
      },
    ],
  };
}

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/admin/notificaciones', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } },
      ]}
    >
      <Routes>
        <Route path="/admin/notificaciones" element={<NotificationTemplatesScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NotificationTemplatesScreen (ADM-05)', () => {
  beforeEach(() => {
    getNotificationTemplatesMock.mockReset();
    saveNotificationTemplateMock.mockReset();
  });

  it('muestra la lista de eventos y la plantilla vigente del primero', async () => {
    getNotificationTemplatesMock.mockResolvedValue(baseData());
    renderScreen();

    expect(await screen.findByText('Reserva confirmada')).toBeInTheDocument();
    expect(screen.getByText('Sin plantilla')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hola {nombre}')).toBeInTheDocument();
  });

  it('solo ofrece variables e insertar seguras, nunca datos personales completos', async () => {
    getNotificationTemplatesMock.mockResolvedValue(baseData());
    renderScreen();

    await screen.findByText('Reserva confirmada');
    expect(screen.queryByText('{dni_completo}')).not.toBeInTheDocument();
    expect(screen.getByText('{fecha}')).toBeInTheDocument();
  });

  it('guarda la plantilla cuando hay cambios y al menos un canal', async () => {
    getNotificationTemplatesMock.mockResolvedValue(baseData());
    saveNotificationTemplateMock.mockResolvedValue({ eventType: 'ReservationConfirmed', version: 2, channels: ['EMAIL'], body: 'Hola {nombre}!' });
    renderScreen();

    const textarea = await screen.findByDisplayValue('Hola {nombre}');
    fireEvent.change(textarea, { target: { value: 'Hola {nombre}!' } });

    const saveButton = screen.getByRole('button', { name: 'Guardar plantilla' });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveNotificationTemplateMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', 'ReservationConfirmed', ['EMAIL'], 'Hola {nombre}!');
    });
  });

  it('deshabilita guardar si se desmarcan todos los canales', async () => {
    getNotificationTemplatesMock.mockResolvedValue(baseData());
    renderScreen();

    await screen.findByText('Reserva confirmada');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Correo' }));

    expect(screen.getByRole('button', { name: 'Guardar plantilla' })).toBeDisabled();
  });

  it('muestra el error recuperable si la carga falla', async () => {
    getNotificationTemplatesMock.mockRejectedValue(new Error('network'));
    renderScreen();

    expect(await screen.findByText(/No pudimos cargar las plantillas de notificación/)).toBeInTheDocument();
  });
});
