import type { ReactNode } from 'react';

/**
 * Definiciones de los 12 módulos del hub de navegación (TR-11/HU-25).
 *
 * Baseline: PROTO-TR-11-MENU-MODULOS (desktop) + PROTO-TR-11-MENU-MODULOS-MOVIL (mobile).
 * Aprobación PROVISIONAL (23-sep-2026) — ver docs/conflicts/MISSING_TR11_UXUI_CONTRACT.md.
 *
 * path: null = módulo aún no implementado (renderiza como tarjeta deshabilitada).
 * adminOnly: true = sólo visible para rol ADMINISTRACION (provisional, reemplazar con ADM-02).
 *
 * Iconos: SVG inline extraídos del prototipo aprobado.
 */
export interface ModuleItem {
  id: string;
  label: string;
  description: string;
  path: string | null;
  adminOnly?: boolean;
  icon: ReactNode;
}

export const MODULE_ITEMS: ModuleItem[] = [
  {
    id: 'tablero',
    label: 'Tablero',
    description: 'Tablero Inicio',
    path: '/tablero',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'consultas',
    label: 'Consultas',
    description: 'CON-01',
    path: '/consultas',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="8" x2="13" y2="8" />
      </svg>
    ),
  },
  {
    id: 'reservas',
    label: 'Reservas',
    description: 'RES-01',
    path: '/reservas',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="m9 16 2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'alquileres',
    label: 'Alquileres',
    description: 'ALQ-01',
    path: null,
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="7.5" cy="15.5" r="4.5" />
        <path d="m10.8 12.2 7.7-7.7a1.5 1.5 0 0 1 2.1 0l1.6 1.6a1.5 1.5 0 0 1 0 2.1l-1.6 1.6-1.6-1.6-2.6 2.6 1.6 1.6-1.5 1.5" />
      </svg>
    ),
  },
  {
    id: 'devoluciones',
    label: 'Devoluciones',
    description: 'DEV-01',
    path: null,
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="9 14 4 9 9 4" />
        <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
        <circle cx="17" cy="19" r="1.5" />
      </svg>
    ),
  },
  {
    id: 'flota',
    label: 'Flota',
    description: 'FLO-01',
    path: null,
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L17 10l-2.5-4.5c-.3-.5-.8-.8-1.4-.8H7c-.6 0-1.1.3-1.4.8L3 10H2c-.6 0-1 .4-1 1v5c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2.5" />
        <circle cx="17" cy="17" r="2.5" />
        <path d="M9.5 17h5" />
      </svg>
    ),
  },
  {
    id: 'clientes',
    label: 'Clientes',
    description: 'CLI-01',
    path: '/clientes',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'pagos',
    label: 'Pagos y garantías',
    description: 'PAG-01',
    path: null,
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <path d="M15 15h3" />
      </svg>
    ),
  },
  {
    id: 'incidentes',
    label: 'Incidentes',
    description: 'INC-01',
    path: null,
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    id: 'personal',
    label: 'Personal',
    description: 'PER-01',
    path: null,
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'reportes',
    label: 'Reportes',
    description: 'REP-01',
    path: null,
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Administración del sistema',
    path: '/admin/usuarios',
    adminOnly: true,
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];
