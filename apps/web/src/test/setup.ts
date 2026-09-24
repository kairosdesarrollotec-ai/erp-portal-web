import '@testing-library/jest-dom/vitest';
import { expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

// SCA/accesibilidad (hallazgo MEDIO de revalidacion PR#4, "CI y
// trazabilidad siguen incompletos" - falta evidencia automatizada de
// axe): registra el matcher `toHaveNoViolations` para vitest, usado por
// las pruebas de accesibilidad (*.a11y.test.tsx).
expect.extend(toHaveNoViolations);
