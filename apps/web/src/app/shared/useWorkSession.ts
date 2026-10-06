import { create } from 'zustand';
import type { RoleRef } from './role-ref';

interface WorkSessionState {
  /** Rol del usuario en el contexto de trabajo vigente (solo informativo: el nombre visible). */
  role: RoleRef | null;
  sidebarOpen: boolean;
  setRole: (role: RoleRef | null) => void;
  setSidebarOpen: (open: boolean) => void;
  clearSession: () => void;
}

export const useWorkSession = create<WorkSessionState>((set) => ({
  role: null,
  sidebarOpen: false,
  setRole: (role) => set({ role }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  clearSession: () => set({ role: null, sidebarOpen: false }),
}));
