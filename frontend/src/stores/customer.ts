import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { api, CART_ID_COOKIE } from '@/lib/api';

const CUSTOMER_TOKEN_KEY = 'customer_token';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface CustomerAddress {
  id: string;
  label?: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  region?: string;
  landmark?: string;
  isDefault: boolean;
}

interface Customer {
  id: string;
  email: string;
  phone: string;
  name: string;
  profileImage?: string;
  preferredPaymentMethod?: 'MOMO' | 'COD';
  emailVerified: boolean;
  phoneVerified: boolean;
  addresses?: CustomerAddress[];
}

interface GoogleAuthData {
  idToken: string;
  email: string;
  name: string;
  googleId: string;
  profileImage?: string;
}

interface CustomerState {
  customer: Customer | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsPhoneUpdate: boolean;

  // Actions
  register: (data: {
    email: string;
    phone: string;
    password: string;
    name: string;
  }) => Promise<void>;
  login: (data: { email?: string; phone?: string; password: string }) => Promise<void>;
  googleAuth: (data: GoogleAuthData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<Customer>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  loadAuth: () => Promise<void>;

  // Address management
  addAddress: (data: Omit<CustomerAddress, 'id'>) => Promise<void>;
  updateAddress: (addressId: string, data: Partial<CustomerAddress>) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
}

// Helper to handle API responses
async function handleResponse<T>(
  response: Response
): Promise<{ success: boolean; data: T; message?: string }> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'An error occurred');
  }
  return data;
}

// Customer API helpers
const customerApi = {
  async register(data: { email: string; phone: string; password: string; name: string }) {
    const response = await fetch(`${API_BASE_URL}/customers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async login(data: { email?: string; phone?: string; password: string }, cartId?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cartId) {
      headers['X-Cart-Id'] = cartId;
    }

    const response = await fetch(`${API_BASE_URL}/customers/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getProfile(token: string) {
    const response = await fetch(`${API_BASE_URL}/customers/me`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },

  async updateProfile(token: string, data: Partial<Customer>) {
    const response = await fetch(`${API_BASE_URL}/customers/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async changePassword(token: string, currentPassword: string, newPassword: string) {
    const response = await fetch(`${API_BASE_URL}/customers/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return handleResponse(response);
  },

  async addAddress(token: string, data: Omit<CustomerAddress, 'id'>) {
    const response = await fetch(`${API_BASE_URL}/customers/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateAddress(token: string, addressId: string, data: Partial<CustomerAddress>) {
    const response = await fetch(`${API_BASE_URL}/customers/addresses/${addressId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteAddress(token: string, addressId: string) {
    const response = await fetch(`${API_BASE_URL}/customers/addresses/${addressId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },

  async googleAuth(data: GoogleAuthData, cartId?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cartId) {
      headers['X-Cart-Id'] = cartId;
    }

    const response = await fetch(`${API_BASE_URL}/customers/google`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      customer: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      needsPhoneUpdate: false,

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await customerApi.register(data);

          if (response.success && response.data) {
            const { token, customer } = response.data as {
              token: string;
              customer: Customer;
            };

            Cookies.set(CUSTOMER_TOKEN_KEY, token, { expires: 7 }); // 7 days
            set({
              token,
              customer,
              isAuthenticated: true,
            });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (data) => {
        set({ isLoading: true });
        try {
          // Get guest cart ID to merge on login
          const cartId = Cookies.get(CART_ID_COOKIE);
          const response = await customerApi.login(data, cartId);

          if (response.success && response.data) {
            const { token, customer } = response.data as {
              token: string;
              customer: Customer;
            };

            Cookies.set(CUSTOMER_TOKEN_KEY, token, { expires: 7 }); // 7 days
            set({
              token,
              customer,
              isAuthenticated: true,
              needsPhoneUpdate: false,
            });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      googleAuth: async (data) => {
        set({ isLoading: true });
        try {
          const cartId = Cookies.get(CART_ID_COOKIE);
          const response = await customerApi.googleAuth(data, cartId);

          if (response.success && response.data) {
            const { token, customer, needsPhoneUpdate } = response.data as {
              token: string;
              customer: Customer;
              needsPhoneUpdate?: boolean;
            };

            Cookies.set(CUSTOMER_TOKEN_KEY, token, { expires: 7 });
            set({
              token,
              customer,
              isAuthenticated: true,
              needsPhoneUpdate: needsPhoneUpdate || false,
            });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      loadAuth: async () => {
        const token = Cookies.get(CUSTOMER_TOKEN_KEY);
        if (token && !get().isAuthenticated) {
          try {
            const response = await customerApi.getProfile(token);
            if (response.success && response.data) {
              const customer = response.data as Customer;
              const needsPhoneUpdate = !customer.phone || customer.phone.startsWith('google_');
              set({
                token,
                customer,
                isAuthenticated: true,
                needsPhoneUpdate,
              });
            }
          } catch (error) {
            console.error('Failed to load auth:', error);
            Cookies.remove(CUSTOMER_TOKEN_KEY);
            set({
              token: null,
              customer: null,
              isAuthenticated: false,
              needsPhoneUpdate: false,
            });
          }
        }
      },

      logout: () => {
        Cookies.remove(CUSTOMER_TOKEN_KEY);
        set({
          token: null,
          customer: null,
          isAuthenticated: false,
          needsPhoneUpdate: false,
        });
      },

      updateProfile: async (data) => {
        const { token, customer } = get();
        if (!token || !customer) return;

        set({ isLoading: true });
        try {
          const response = await customerApi.updateProfile(token, data);

          if (response.success && response.data) {
            const updatedCustomer = { ...customer, ...(response.data as Customer) };
            set({ customer: updatedCustomer });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        const { token } = get();
        if (!token) return;

        set({ isLoading: true });
        try {
          await customerApi.changePassword(token, currentPassword, newPassword);
        } finally {
          set({ isLoading: false });
        }
      },

      refreshProfile: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const response = await customerApi.getProfile(token);
          if (response.success && response.data) {
            set({ customer: response.data as Customer });
          }
        } catch (error) {
          // Token expired, clear auth
          console.error('Failed to refresh profile:', error);
          get().logout();
        }
      },

      addAddress: async (data) => {
        const { token, customer } = get();
        if (!token || !customer) return;

        set({ isLoading: true });
        try {
          const response = await customerApi.addAddress(token, data);

          if (response.success && response.data) {
            const addresses = customer.addresses || [];
            const updatedCustomer = {
              ...customer,
              addresses: [...addresses, response.data as CustomerAddress],
            };
            set({ customer: updatedCustomer });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      updateAddress: async (addressId, data) => {
        const { token, customer } = get();
        if (!token || !customer) return;

        set({ isLoading: true });
        try {
          const response = await customerApi.updateAddress(token, addressId, data);

          if (response.success && response.data) {
            const addresses =
              customer.addresses?.map((addr) =>
                addr.id === addressId ? (response.data as CustomerAddress) : addr
              ) || [];

            // If this address was set as default, unset others
            if (data.isDefault) {
              addresses.forEach((addr) => {
                if (addr.id !== addressId) addr.isDefault = false;
              });
            }

            const updatedCustomer = { ...customer, addresses };
            set({ customer: updatedCustomer });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      deleteAddress: async (addressId) => {
        const { token, customer } = get();
        if (!token || !customer) return;

        set({ isLoading: true });
        try {
          await customerApi.deleteAddress(token, addressId);

          const addresses = customer.addresses?.filter((addr) => addr.id !== addressId) || [];
          const updatedCustomer = { ...customer, addresses };
          set({ customer: updatedCustomer });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'customer-storage',
      partialize: (state) => ({
        token: state.token,
        customer: state.customer,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helper to get customer token for API calls
export function getCustomerToken(): string | null {
  return Cookies.get(CUSTOMER_TOKEN_KEY) || useCustomerStore.getState().token;
}

// Helper to check if customer is logged in
export function isCustomerLoggedIn(): boolean {
  return useCustomerStore.getState().isAuthenticated;
}
