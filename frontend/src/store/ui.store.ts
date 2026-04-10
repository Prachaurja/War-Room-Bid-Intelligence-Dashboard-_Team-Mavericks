import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  activePage: string;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActivePage: (page: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  activePage: 'overview',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActivePage: (page) => set({ activePage: page }),
}));