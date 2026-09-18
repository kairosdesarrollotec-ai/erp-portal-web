import '@testing-library/jest-dom/vitest';

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
