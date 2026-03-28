import { create } from 'zustand';

interface AdminState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  unreadNotifications: number;
  setUnreadNotifications: (n: number) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  unreadNotifications: 0,
  setUnreadNotifications: (n) => set({ unreadNotifications: n }),
}));

export const useLayoutStore = create<{
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}>((set) => ({
  isLoading: true,
  setLoading: (loading) => set({ isLoading: loading }),
}));
