import '@testing-library/jest-dom/vitest';
import { expect, vi } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';
import { configure } from '@testing-library/dom';

// Mock global de useGlobalSearch para evitar que GlobalSearch (renderizado dentro
// de AppHeader en todas las pantallas) requiera un QueryClientProvider en cada test.
// Los tests que quieran verificar el comportamiento de búsqueda deben sobreescribir
// este mock con vi.mock dentro del propio archivo de test.
vi.mock('../app/shared/GlobalSearch/useGlobalSearch', () => ({
  useGlobalSearch: () => ({
    groups: [],
    isLoading: false,
    hasResults: false,
    isIdle: true,
    showDropdown: false,
  }),
}));

configure({ asyncUtilTimeout: 4000 });

// SCA/accesibilidad (hallazgo MEDIO de revalidacion PR#4, "CI y
// trazabilidad siguen incompletos" - falta evidencia automatizada de
// axe): registra el matcher `toHaveNoViolations` para vitest, usado por
// las pruebas de accesibilidad (*.a11y.test.tsx).
expect.extend(toHaveNoViolations);

// jsdom no implementa HTMLCanvasElement.toDataURL ni getContext('2d').
// Sin este mock, cualquier test que interactúe con SignaturePad imprime
// "Not implemented: HTMLCanvasElement.prototype.toDataURL" porque jsdom
// llama not-implemented() antes de que el try/catch del componente pueda
// interceptarlo.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,mock-signature';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (HTMLCanvasElement.prototype as any).getContext = () => ({
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    clearRect: () => {},
  });
}

// jsdom no implementa window.matchMedia - lo necesitan useMediaQuery
// (MfaChallengeModal) y cualquier componente que renderice una sola
// variante segun el viewport. Por defecto "no matchea" (equivalente a
// desktop); los tests que necesiten la variante mobile lo sobreescriben.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
