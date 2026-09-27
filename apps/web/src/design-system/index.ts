/**
 * Design System Kairos Corporation — barrel de componentes
 * Fuente: veloxrent_erp_design_system/DESIGN.md
 *
 * Para usar los tokens CSS importar en el punto de entrada de la app:
 *   import '@kairos/web/src/design-system/tokens/index.css'
 *
 * Los componentes exportados aqui son las primitivas compartidas.
 * No contienen reglas especificas de ningun modulo de negocio.
 */
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';

export { StatusBadge } from './components/StatusBadge';
export type { StatusBadgeProps, BadgeStatus } from './components/StatusBadge';

export { Input } from './components/Input';
export type { InputProps } from './components/Input';

export { AppShell } from './components/AppShell';
export type { BreadcrumbItem } from './components/AppShell';
