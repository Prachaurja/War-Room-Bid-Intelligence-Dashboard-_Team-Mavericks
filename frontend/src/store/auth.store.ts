import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/auth.types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (patch: Partial<User>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        localStorage.setItem('wr_token', token);
        localStorage.setItem('wr_user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
      },

      updateUser: (patch) =>
        set((state) => {
          if (!state.user) return state;

          const nextUser = { ...state.user, ...patch };
          localStorage.setItem('wr_user', JSON.stringify(nextUser));
          return { user: nextUser };
        }),

      clearAuth: () => {
        localStorage.removeItem('wr_token');
        localStorage.removeItem('wr_user');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    { name: 'wr-auth' },
  ),
);
