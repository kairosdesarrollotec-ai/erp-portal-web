import '@testing-library/jest-dom/vitest';
import { expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';
import { configure } from '@testing-library/dom';

configure({ asyncUtilTimeout: 4000 });

// SCA/accesibilidad (hallazgo MEDIO de revalidacion PR#4, "CI y
// trazabilidad siguen incompletos" - falta evidencia automatizada de
// axe): registra el matcher `toHaveNoViolations` para vitest, usado por
// las pruebas de accesibilidad (*.a11y.test.tsx).
expect.extend(toHaveNoViolations);

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
