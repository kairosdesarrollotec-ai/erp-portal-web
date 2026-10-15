import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReturnFlowShell } from './ReturnFlowShell';

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('t') } }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));

function renderShell(alerts: Parameters<typeof ReturnFlowShell>[0]['alerts']) {
  return render(
    <MemoryRouter>
      <ReturnFlowShell step={5} title="Garantía" alerts={alerts}>
        <p>contenido</p>
      </ReturnFlowShell>
    </MemoryRouter>,
  );
}

describe('ReturnFlowShell - alertas del expediente', () => {
  it('muestra los banners del expediente encima del contenido', () => {
    renderShell({
      warrantyRelease: { level: 'DUE_SOON', deadlineAt: '2026-10-14T16:00:00Z', hoursRemaining: 2 },
      immobilization: { since: '2026-10-12T16:00:00Z', hoursElapsed: 49, pendingDays: 2, dailyRate: 100, suggestedAmount: 200 },
    });
    expect(screen.getByTestId('alert-warranty')).toHaveTextContent('Garantía por liberar');
    expect(screen.getByTestId('alert-immobilization')).toHaveTextContent('S/ 200.00');
    expect(screen.getByText('contenido')).toBeInTheDocument();
  });

  it('sin alertas no agrega banners', () => {
    renderShell(undefined);
    expect(screen.queryByTestId('alert-warranty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alert-immobilization')).not.toBeInTheDocument();
  });

  it('muestra el retraso informativo solo si isLate', () => {
    const late = { lateToleranceMinutes: 30, lateMinutes: 45, isLate: true, basis: 'RECEIVED' as const };
    const { unmount } = render(
      <MemoryRouter>
        <ReturnFlowShell step={4} title="Resultado" lateness={late}>
          <p>contenido</p>
        </ReturnFlowShell>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('lateness-banner')).toHaveTextContent('Retraso: 45 min (tolerancia 30 min)');
    unmount();
    render(
      <MemoryRouter>
        <ReturnFlowShell step={4} title="Resultado" lateness={{ ...late, isLate: false, lateMinutes: 10 }}>
          <p>contenido</p>
        </ReturnFlowShell>
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('lateness-banner')).not.toBeInTheDocument();
  });
});
