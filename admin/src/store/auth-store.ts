import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, User } from '@/lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.auth.login(email, password);
          
          if (response.user.role !== 'admin') {
            throw new Error('Access denied. Admin role required.');
          }
          
          localStorage.setItem('admin_token', response.token);
          set({ 
            user: response.user, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('admin_token');
        set({ user: null, isAuthenticated: false, error: null });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await api.auth.getMe();
          if (user.role !== 'admin') {
            get().logout();
            return;
          }
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          get().logout();
          set({ isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
