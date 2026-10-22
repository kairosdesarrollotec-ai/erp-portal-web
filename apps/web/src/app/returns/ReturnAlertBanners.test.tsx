import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReturnAlertBanners } from './ReturnAlertBanners';
import { whatsappLink, whatsappPhone } from './return-reminders';

describe('ReturnAlertBanners (detalle del expediente)', () => {
  it('no renderiza nada sin alertas', () => {
    const { container } = render(<ReturnAlertBanners alerts={{ warrantyRelease: null, immobilization: null }} />);
    expect(container).toBeEmptyDOMElement();
    const { container: c2 } = render(<ReturnAlertBanners alerts={undefined} />);
    expect(c2).toBeEmptyDOMElement();
  });

  it('garantia DUE_SOON: plazo en hora de Lima y horas restantes', () => {
    render(
      <ReturnAlertBanners
        alerts={{
          warrantyRelease: { level: 'DUE_SOON', deadlineAt: '2026-10-15T04:30:00Z', hoursRemaining: 3.5 },
          immobilization: null,
        }}
      />,
    );
    const banner = screen.getByTestId('alert-warranty');
    expect(banner).toHaveTextContent('Garantía por liberar');
    // 04:30Z del 15 = 23:30 del 14 en Lima
    expect(banner).toHaveTextContent('Vence el 14/10/2026 23:30 (faltan 3,5 h)');
  });

  it('garantia OVERDUE: vencida hace N horas', () => {
    render(
      <ReturnAlertBanners
        alerts={{
          warrantyRelease: { level: 'OVERDUE', deadlineAt: '2026-10-14T16:00:00Z', hoursRemaining: -1 },
          immobilization: null,
        }}
      />,
    );
    expect(screen.getByTestId('alert-warranty')).toHaveTextContent('Garantía vencida: liberar ya');
    expect(screen.getByTestId('alert-warranty')).toHaveTextContent('hace 1 h');
  });

  it('inmovilizacion: horas, dias pendientes y monto sugerido; el cobro es manual', () => {
    render(
      <ReturnAlertBanners
        alerts={{
          warrantyRelease: null,
          immobilization: { since: '2026-10-12T16:00:00Z', hoursElapsed: 30, pendingDays: 1, dailyRate: 120, suggestedAmount: 120 },
        }}
      />,
    );
    const banner = screen.getByTestId('alert-immobilization');
    expect(banner).toHaveTextContent('Han pasado 30 h desde el cierre de la devolución');
    expect(banner).toHaveTextContent('1 día de paralización pendiente de cobro');
    expect(banner).toHaveTextContent('Monto sugerido: S/ 120.00 (el cobro es manual)');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('inmovilizacion sin tarifa: no inventa monto', () => {
    render(
      <ReturnAlertBanners
        alerts={{
          warrantyRelease: null,
          immobilization: { since: '2026-10-12T16:00:00Z', hoursElapsed: 30, pendingDays: 1, dailyRate: null, suggestedAmount: null },
        }}
      />,
    );
    expect(screen.getByTestId('alert-immobilization')).not.toHaveTextContent('Monto sugerido');
    expect(screen.getByTestId('alert-immobilization')).toHaveTextContent('El cobro es manual');
  });
});

describe('return-reminders - enlace de WhatsApp', () => {
  it('normaliza telefonos peruanos y extranjeros', () => {
    expect(whatsappPhone('987 654 321')).toBe('51987654321');
    expect(whatsappPhone('+51 987-654-321')).toBe('51987654321');
    expect(whatsappPhone('0051987654321')).toBe('51987654321');
    expect(whatsappPhone('+1 (555) 123-4567')).toBe('15551234567');
    expect(whatsappPhone('123')).toBeNull();
    expect(whatsappPhone(null)).toBeNull();
  });

  it('arma https://wa.me/<telefono>?text= con el mensaje codificado', () => {
    expect(whatsappLink('987654321', 'Hola & chau')).toBe('https://wa.me/51987654321?text=Hola%20%26%20chau');
    expect(whatsappLink('', 'x')).toBeNull();
  });
});
