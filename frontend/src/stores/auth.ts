import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  admin: Admin | null;
  isAuthenticated: boolean;

  // Actions
  login: (token: string, admin: Admin) => void;
  logout: () => void;
  setAdmin: (admin: Admin) => void;
}

const TOKEN_KEY = 'admin_token';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      isAuthenticated: false,

      login: (token: string, admin: Admin) => {
        Cookies.set(TOKEN_KEY, token, { expires: 7 }); // 7 days
        set({ token, admin, isAuthenticated: true });
      },

      logout: () => {
        Cookies.remove(TOKEN_KEY);
        set({ token: null, admin: null, isAuthenticated: false });
      },

      setAdmin: (admin: Admin) => {
        set({ admin });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helper to get token for API calls
export function getAuthToken(): string | null {
  return Cookies.get(TOKEN_KEY) || useAuthStore.getState().token;
}
