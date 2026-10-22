import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import { VehicleDataWarnings } from './VehicleDataWarnings';
import { clearPermissions, setPermissions } from '../../test/permissions';

const ALL = [
  { code: 'VEHICLE_PASSENGER_CAPACITY_MISSING', field: 'passengerCapacity', message: 'srv' },
  { code: 'VEHICLE_DEPOSIT_MINIMUM_MISSING', field: 'depositMinimum', message: 'srv' },
  { code: 'VEHICLE_FUEL_PRICE_MISSING', field: 'fuelPrice', message: 'srv' },
];

function renderBox(props: Partial<React.ComponentProps<typeof VehicleDataWarnings>> = {}) {
  return render(
    <MemoryRouter>
      <VehicleDataWarnings warnings={ALL} vehicleId="veh-9" context={{ companyId: 'c1', branchId: 'b1' }} {...props} />
    </MemoryRouter>,
  );
}

describe('VehicleDataWarnings (DEC-ALQ-VEHDATA-001)', () => {
  beforeEach(() => {
    clearPermissions();
  });

  it('no renderiza nada sin avisos', () => {
    const { container } = renderBox({ warnings: [] });
    expect(container).toBeEmptyDOMElement();
    const other = renderBox({ warnings: undefined });
    expect(other.container).toBeEmptyDOMElement();
  });

  it('muestra un mensaje de negocio por cada código', () => {
    renderBox();
    expect(screen.getByTestId('vehicle-warning-VEHICLE_PASSENGER_CAPACITY_MISSING')).toHaveTextContent(/capacidad de pasajeros/);
    expect(screen.getByTestId('vehicle-warning-VEHICLE_DEPOSIT_MINIMUM_MISSING')).toHaveTextContent(/garantía/);
    expect(screen.getByTestId('vehicle-warning-VEHICLE_FUEL_PRICE_MISSING')).toHaveTextContent(/combustible/);
  });

  it('con FLEET.WRITE ofrece el atajo a Editar vehículo; sin permiso no', async () => {
    const { container, unmount } = renderBox();
    expect(screen.queryByRole('link', { name: 'Editar vehículo' })).not.toBeInTheDocument();
    expect(screen.getByText(/Pide a quien administra la flota/)).toBeInTheDocument();
    unmount();

    setPermissions(['FLEET.WRITE']);
    const second = renderBox();
    expect(screen.getByRole('link', { name: 'Editar vehículo' })).toHaveAttribute('href', '/flota/veh-9');
    expect(await axe(second.container)).toHaveNoViolations();
    expect(container).toBeDefined();
  });

  it('hideCodes oculta los avisos ya mostrados en otro lugar', () => {
    renderBox({ hideCodes: ['VEHICLE_PASSENGER_CAPACITY_MISSING', 'VEHICLE_DEPOSIT_MINIMUM_MISSING'] });
    expect(screen.queryByTestId('vehicle-warning-VEHICLE_PASSENGER_CAPACITY_MISSING')).not.toBeInTheDocument();
    expect(screen.getByTestId('vehicle-warning-VEHICLE_FUEL_PRICE_MISSING')).toBeInTheDocument();
  });

  it('un código desconocido usa el mensaje del servidor', () => {
    renderBox({ warnings: [{ code: 'VEHICLE_OTHER', message: 'Falta algo nuevo' }] });
    expect(screen.getByText('Falta algo nuevo')).toBeInTheDocument();
  });
});
