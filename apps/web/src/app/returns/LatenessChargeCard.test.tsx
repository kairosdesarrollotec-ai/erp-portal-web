import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LatenessChargeCard } from './LatenessChargeCard';
import type { ReturnLatenessCharge } from './returns-types';

const charge = (over: Partial<ReturnLatenessCharge> = {}): ReturnLatenessCharge => ({
  tier: 'EXTRA_31_120', basis: 'RECEIVED', informational: true, timeChargePercent: 25, guaranteePenaltyPercent: 20,
  dailyRate: '200.00', guaranteeAmount: '1000.00', currency: 'PEN', suggestedTimeCharge: '50.00', suggestedGuaranteePenalty: '200.00',
  noticeAndPrepaymentVerified: false, severeBreach: false, severeBreachThresholdHours: 12, ...over,
});

describe('LatenessChargeCard', () => {
  it('no muestra nada dentro de tolerancia o sin dato', () => {
    const { container, rerender } = render(<LatenessChargeCard charge={charge({ tier: 'NONE' })} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<LatenessChargeCard charge={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra tramo, cargo por tiempo, penalidad "si no aviso/pago antes" y que es informativo', () => {
    render(<LatenessChargeCard charge={charge()} />);
    expect(screen.getByText(/31 a 120 min/)).toBeInTheDocument();
    expect(screen.getByTestId('late-time-charge')).toHaveTextContent('25% de la tarifa diaria = S/ 50.00');
    expect(screen.getByTestId('late-guarantee-penalty')).toHaveTextContent('si no avisó/pagó antes');
    expect(screen.getByTestId('late-guarantee-penalty')).toHaveTextContent('S/ 200.00');
    expect(screen.getByText('Informativo: el cobro es manual.')).toBeInTheDocument();
    expect(screen.queryByTestId('late-covered')).not.toBeInTheDocument();
    expect(screen.queryByTestId('late-confirm')).not.toBeInTheDocument();
    expect(screen.queryByTestId('severe-breach-banner')).not.toBeInTheDocument();
  });

  it('verificado=true avisa que la ampliacion cubre el tiempo y oculta la penalidad', () => {
    render(<LatenessChargeCard charge={charge({ noticeAndPrepaymentVerified: true, suggestedGuaranteePenalty: null })} />);
    expect(screen.getByTestId('late-covered')).toHaveTextContent('La ampliación autorizada ya cubre este tiempo: no cobrar dos veces.');
    expect(screen.queryByTestId('late-guarantee-penalty')).not.toBeInTheDocument();
  });

  it('verificado=null pide al operador confirmar', () => {
    render(<LatenessChargeCard charge={charge({ noticeAndPrepaymentVerified: null })} />);
    expect(screen.getByTestId('late-confirm')).toHaveTextContent('El operador debe confirmar si avisó y pagó por adelantado.');
  });

  it('tolera montos null (sin tarifa / sin garantia)', () => {
    render(<LatenessChargeCard charge={charge({ dailyRate: null, suggestedTimeCharge: null, guaranteeAmount: null, suggestedGuaranteePenalty: null })} />);
    expect(screen.getByTestId('late-time-charge')).toHaveTextContent('sin tarifa diaria registrada');
    expect(screen.getByTestId('late-guarantee-penalty')).toHaveTextContent('sin garantía');
  });

  it('retraso grave muestra el banner de Gerencia', () => {
    render(<LatenessChargeCard charge={charge({ tier: 'EXTRA_OVER_300', severeBreach: true })} />);
    expect(screen.getByTestId('severe-breach-banner')).toHaveTextContent(
      'Retraso mayor a 12 h — incumplimiento grave: Gerencia decide (retener garantía / resolver contrato)',
    );
  });
});
