import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { baseContext } from './test-utils';

/** Monta una pantalla del proceso de Devolucion en su ruta, con destinos de navegacion simulados. */
export function renderReturnScreen(path: string, element: ReactNode, routePath: string) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state: baseContext }]}>
      <Routes>
        <Route path={routePath} element={element} />
        <Route path="/devoluciones/:id/dano/estetico" element={<div>pantalla estetico</div>} />
        <Route path="/devoluciones/:id/dano/tecnico" element={<div>pantalla tecnico</div>} />
        <Route path="/devoluciones/:id/garantia" element={<div>pantalla garantia</div>} />
        <Route path="/devoluciones/:id/cierre" element={<div>pantalla cierre</div>} />
        <Route path="/devoluciones/:id/resultado" element={<div>pantalla resultado</div>} />
        <Route path="/devoluciones" element={<div>bandeja</div>} />
      </Routes>
    </MemoryRouter>,
  );
}
