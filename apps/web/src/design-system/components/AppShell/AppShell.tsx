/**
 * AppShell — compound component del shell de aplicacion VeloxRent
 *
 * Fuente visual: alquileres_bandeja_veloxrent/code.html (PROTO-ALQ-01-BANDEJA, APPROVED)
 * Fuente de diseno: veloxrent_erp_design_system/DESIGN.md
 *
 * Uso:
 *   <AppShell>
 *     <AppShell.Header
 *       breadcrumbs={<AppShell.Breadcrumbs items={[...]} />}
 *       right={<>...</>}
 *     />
 *     <AppShell.Main>...</AppShell.Main>
 *   </AppShell>
 */
import { AppShellRoot } from './AppShellRoot';
import { AppShellHeader } from './AppShellHeader';
import { AppShellMain } from './AppShellMain';
import { AppShellBreadcrumbs } from './AppShellBreadcrumbs';

export const AppShell = Object.assign(AppShellRoot, {
  Header: AppShellHeader,
  Main: AppShellMain,
  Breadcrumbs: AppShellBreadcrumbs,
});
