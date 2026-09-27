import { create } from 'zustand';
import type { WorkerRole } from '../dashboard/worker-role';

interface WorkSessionState {
  role: WorkerRole | null;
  sidebarOpen: boolean;
  setRole: (role: WorkerRole) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useWorkSession = create<WorkSessionState>((set) => ({
  role: null,
  sidebarOpen: false,
  setRole: (role) => set({ role }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
