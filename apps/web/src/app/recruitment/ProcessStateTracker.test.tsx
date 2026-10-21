import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ProcessStateTracker } from './ProcessStateTracker';

function steps() {
  const list = screen.getByRole('list', { name: 'Estado del proceso de selección' });
  return within(list).getAllByRole('listitem');
}

describe('ProcessStateTracker (BDD-REC §11.6)', () => {
  it('muestra los 8 pasos del flujo en orden', () => {
    render(<ProcessStateTracker state="EN_NEGOCIACION" />);
    expect(steps().map((li) => li.textContent?.replace(/\s*\(.*\)$/, ''))).toEqual([
      'Necesidad registrada',
      'Publicado',
      'En negociación',
      'Entrevistado',
      'Decidido',
      'Ingresado',
      'Periodo de prueba',
      'Planilla',
    ]);
  });

  it('marca el estado actual con aria-current y completados los anteriores (incluidos los de la vacante)', () => {
    render(<ProcessStateTracker state="DECIDIDO" />);
    const items = steps();
    const current = items.filter((li) => li.getAttribute('aria-current') === 'step');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Decidido (estado actual)');
    expect(items[0]).toHaveTextContent('Necesidad registrada (completado)');
    expect(items[3]).toHaveTextContent('Entrevistado (completado)');
    expect(items[5]).toHaveTextContent('Ingresado (pendiente)');
  });

  it('Planilla es el último paso y queda como actual', () => {
    render(<ProcessStateTracker state="PLANILLA" />);
    expect(steps()[7]).toHaveAttribute('aria-current', 'step');
  });

  it('Terminado: sin paso actual, completados hasta Periodo de prueba y etiqueta de salida', () => {
    render(<ProcessStateTracker state="TERMINADO" />);
    const items = steps();
    expect(items.some((li) => li.getAttribute('aria-current') === 'step')).toBe(false);
    expect(items[6]).toHaveTextContent('Periodo de prueba (completado)');
    expect(items[7]).toHaveTextContent('Planilla (pendiente)');
    expect(screen.getByText('Terminado')).toBeInTheDocument();
  });

  it('Descartado sin entrevista sale de En negociación; con entrevista, de Decidido', () => {
    const { unmount } = render(<ProcessStateTracker state="DESCARTADO" />);
    expect(steps()[2]).toHaveTextContent('En negociación (completado)');
    expect(steps()[3]).toHaveTextContent('Entrevistado (pendiente)');
    expect(screen.getByText('Descartado')).toBeInTheDocument();
    unmount();
    render(<ProcessStateTracker state="DESCARTADO" hadInterview />);
    expect(steps()[4]).toHaveTextContent('Decidido (completado)');
    expect(steps()[5]).toHaveTextContent('Ingresado (pendiente)');
  });
});
