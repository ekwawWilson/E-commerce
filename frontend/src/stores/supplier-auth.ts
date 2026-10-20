import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SupplierAdmin {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
}

interface Supplier {
  id: string;
  name: string;
  businessName: string | null;
  slug: string;
  logo: string | null;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  verified: boolean;
}

interface SupplierAuthState {
  token: string | null;
  supplierAdmin: SupplierAdmin | null;
  supplier: Supplier | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setAuth: (token: string, supplierAdmin: SupplierAdmin, supplier: Supplier) => void;
  checkAuth: () => Promise<void>;
}

interface RegisterData {
  supplier: {
    businessName: string;
    email: string;
    phone?: string;
    description?: string;
  };
  admin: {
    email: string;
    name: string;
  };
  password: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const useSupplierAuthStore = create<SupplierAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      supplierAdmin: null,
      supplier: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/supplier-auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Login failed');
          }

          set({
            token: data.data.token,
            supplierAdmin: data.data.supplierAdmin,
            supplier: data.data.supplier,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (registerData: RegisterData) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/supplier-auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registerData),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
          }

          set({ isLoading: false });
          return data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          token: null,
          supplierAdmin: null,
          supplier: null,
          isAuthenticated: false,
        });
      },

      setAuth: (token: string, supplierAdmin: SupplierAdmin, supplier: Supplier) => {
        set({
          token,
          supplierAdmin,
          supplier,
          isAuthenticated: true,
        });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/supplier-auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Session expired');
          }

          const data = await response.json();
          set({
            supplierAdmin: data.data.supplierAdmin,
            supplier: data.data.supplier,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          set({
            token: null,
            supplierAdmin: null,
            supplier: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'supplier-auth',
      partialize: (state) => ({
        token: state.token,
        supplierAdmin: state.supplierAdmin,
        supplier: state.supplier,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
