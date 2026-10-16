import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';

export function buildReservation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'res-1',
    status: 'CONFIRMED',
    channelMode: 'PRESENCIAL',
    version: 3,
    customer: { id: 'cu-1', name: 'Maria Quispe' },
    vehicle: { id: 'v-1', plate: 'D0Y-704', label: 'Toyota Hilux - D0Y-704' },
    startAt: '2026-09-20T14:00:00Z',
    endAt: '2026-09-22T14:00:00Z',
    requiredPayment: { amount: '300.00', currency: 'PEN' },
    requirements: { paymentValidatedAt: '2026-09-16T00:00:00Z', documentsCompletedAt: '2026-09-16T00:00:00Z' },
    missingRequirements: [],
    confirmedAt: '2026-09-16T00:00:00Z',
    createdAt: '2026-09-16T00:00:00Z',
    startDatePassed: false,
    saleResolution: null,
    ...overrides,
  };
}

export function buildVehicle(id: string, plate: string, overrides: Record<string, unknown> = {}) {
  return { id, plate, brand: 'Kia', model: 'Rio', status: 'AVAILABLE', availability: { available: true }, ...overrides };
}

function LocationProbe({ label }: { label: string }) {
  const loc = useLocation();
  return (
    <div>
      {label}
      <span data-testid="state">{JSON.stringify(loc.state)}</span>
    </div>
  );
}

/** Monta la pantalla en `path` con rutas destino mínimas para verificar la navegación. */
export function renderAt(path: string, routePath: string, element: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
    <MemoryRouter
      initialEntries={[
        { pathname: path, state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } },
      ]}
    >
      <Routes>
        <Route path={routePath} element={element} />
        <Route path="/reservas/:id" element={<LocationProbe label="RES-04" />} />
        <Route path="/reservas" element={<LocationProbe label="bandeja" />} />
        <Route path="/alquileres/nuevo" element={<LocationProbe label="ALQ-02" />} />
        <Route path="/reservas/:id/conflicto" element={<LocationProbe label="RES-06" />} />
        <Route path="/reservas/:id/venta" element={<LocationProbe label="RES-07" />} />
        <Route path="/reservas/:id/no-show" element={<LocationProbe label="RES-08" />} />
      </Routes>
    </MemoryRouter>
    </QueryClientProvider>,
  );
}
