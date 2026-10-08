import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OnboardingScreen } from './OnboardingScreen';
import { defaultStartDate } from './recruitment-domain';
import { baseContext, makeCandidate, makeOnboarding, setMobile, setupUser } from './flow-test-utils';
import { setPermissions } from '../../test/permissions';

const getCandidateMock = vi.fn();
const completeMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { uid: 'me', email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./recruitment-client', async () => {
  const actual = await vi.importActual<typeof import('./recruitment-client')>('./recruitment-client');
  return {
    ...actual,
    getCandidate: (...a: unknown[]) => getCandidateMock(...a),
    completeOnboarding: (...a: unknown[]) => completeMock(...a),
  };
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/reclutamiento/candidatos/cand-1/incorporacion', state: baseContext }]}>
      <Routes>
        <Route path="/reclutamiento/candidatos/:id/incorporacion" element={<OnboardingScreen />} />
        <Route path="/reclutamiento/candidatos/:id/decision" element={<div>pantalla de decision</div>} />
        <Route path="/reclutamiento/candidatos/:id/periodo-de-prueba" element={<div>pantalla de prueba</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const hired = () => makeCandidate({ decision: 'CONTRATADO', stage: 'DECISION' });

describe('OnboardingScreen (REC-07)', () => {
  beforeEach(() => {
    getCandidateMock.mockReset();
    completeMock.mockReset();
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE', 'RECRUITMENT.MANAGE_ONBOARDING']);
    setMobile(false);
  });

  it('sin decisión CONTRATADO muestra mensaje claro y enlace a la decisión', async () => {
    const user = setupUser();
    getCandidateMock.mockResolvedValue(makeCandidate());
    renderScreen();
    expect(await screen.findByText(/Solo se puede incorporar a quien ya fue contratado/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar ingreso' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Ir a la decisión' }));
    expect(await screen.findByText('pantalla de decision')).toBeInTheDocument();
  });

  it('propone el ingreso para mañana y deja el foco en la fecha', async () => {
    getCandidateMock.mockResolvedValue(hired());
    renderScreen();
    const date = await screen.findByLabelText('Fecha de ingreso');
    expect(date).toHaveValue(defaultStartDate());
    await waitFor(() => expect(date).toHaveFocus());
  });

  it('el checklist es obligatorio: sin los tres ítems no se puede confirmar', async () => {
    const user = setupUser();
    getCandidateMock.mockResolvedValue(hired());
    completeMock.mockResolvedValue(makeOnboarding());
    renderScreen();
    const confirm = await screen.findByRole('button', { name: 'Confirmar ingreso' });
    expect(confirm).toBeDisabled();
    await user.click(screen.getByLabelText('Inducción agendada'));
    await user.click(screen.getByLabelText('Dispositivos asignados'));
    expect(confirm).toBeDisabled();
    await user.click(screen.getByLabelText('Responsabilidad firmada'));
    expect(confirm).toBeEnabled();

    getCandidateMock.mockResolvedValue({ ...hired(), onboarding: makeOnboarding() });
    await user.click(confirm);
    await waitFor(() => expect(completeMock).toHaveBeenCalledTimes(1));
    expect(completeMock.mock.calls[0][3]).toEqual({
      startDate: defaultStartDate(),
      inductionScheduled: true,
      equipmentAssigned: true,
      responsibilityCardSigned: true,
      notarizedContractSigned: false,
    });
    expect(await screen.findByRole('button', { name: 'Ir al periodo de prueba' })).toBeInTheDocument();
  });

  it('el contrato notariado no aparece si la vacante no es de mecánico', async () => {
    getCandidateMock.mockResolvedValue(hired());
    renderScreen();
    await screen.findByLabelText('Fecha de ingreso');
    expect(screen.queryByLabelText('Contrato notariado')).toBeNull();
  });

  it('para mecánico aparece "Contrato notariado" (obligatorio) con su nota', async () => {
    const user = setupUser();
    getCandidateMock.mockResolvedValue({ ...hired(), isMechanic: true });
    renderScreen();
    expect(await screen.findByText('Este puesto siempre requiere notaría')).toBeInTheDocument();
    expect(screen.getByLabelText('Contrato notariado')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Inducción agendada'));
    await user.click(screen.getByLabelText('Dispositivos asignados'));
    await user.click(screen.getByLabelText('Responsabilidad firmada'));
    expect(screen.getByRole('button', { name: 'Confirmar ingreso' })).toBeDisabled();
    await user.click(screen.getByLabelText('Contrato notariado'));
    const confirm = screen.getByRole('button', { name: 'Confirmar ingreso' });
    expect(confirm).toBeEnabled();
    completeMock.mockResolvedValue(makeOnboarding({ notarizedContractSigned: true }));
    await user.click(confirm);
    await waitFor(() => expect(completeMock).toHaveBeenCalledTimes(1));
    expect(completeMock.mock.calls[0][3]).toMatchObject({ notarizedContractSigned: true });
  });

  it('con incorporación completada muestra el resumen y el enlace al periodo de prueba', async () => {
    const user = setupUser();
    getCandidateMock.mockResolvedValue({ ...hired(), onboarding: makeOnboarding() });
    renderScreen();
    expect(await screen.findByText('Ingreso confirmado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar ingreso' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Ir al periodo de prueba' }));
    expect(await screen.findByText('pantalla de prueba')).toBeInTheDocument();
  });

  it('sin MANAGE_ONBOARDING no hay botón de confirmar', async () => {
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE']);
    getCandidateMock.mockResolvedValue(hired());
    renderScreen();
    expect(await screen.findByText(/Solo el personal autorizado/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar ingreso' })).toBeNull();
  });
});
