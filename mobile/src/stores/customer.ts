import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../lib/config';

const AUTH_TOKEN_KEY = 'customer_auth_token';
const CUSTOMER_DATA_KEY = 'customer_data';

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
  phone: string | null;
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
  profileImage?: string;
  googleId: string;
}

interface CustomerState {
  customer: Customer | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsPhoneUpdate: boolean;

  // Actions
  loadAuth: () => Promise<void>;
  register: (data: { email: string; phone: string; password: string; name: string }) => Promise<void>;
  login: (data: { email?: string; phone?: string; password: string }) => Promise<void>;
  googleAuth: (data: GoogleAuthData) => Promise<{ needsPhoneUpdate: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Customer>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;

  // Address management
  addAddress: (data: Omit<CustomerAddress, 'id'>) => Promise<void>;
  updateAddress: (addressId: string, data: Partial<CustomerAddress>) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
}

// API response types
interface AuthResponse {
  token: string;
  customer: Customer;
  needsPhoneUpdate?: boolean;
}

// Helper to handle API responses
async function handleResponse<T>(response: Response): Promise<{ success: boolean; data: T; message?: string }> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'An error occurred');
  }
  return data;
}

// API helper for customer endpoints
const customerApi = {
  async register(data: { email: string; phone: string; password: string; name: string }) {
    const response = await fetch(`${API_BASE_URL}/customers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(response);
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
    return handleResponse<AuthResponse>(response);
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
    return handleResponse<AuthResponse>(response);
  },

  async getProfile(token: string) {
    const response = await fetch(`${API_BASE_URL}/customers/me`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse<Customer>(response);
  },

  async updateProfile(token: string, data: Partial<Customer>) {
    const response = await fetch(`${API_BASE_URL}/customers/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Partial<Customer>>(response);
  },

  async changePassword(token: string, currentPassword: string, newPassword: string) {
    const response = await fetch(`${API_BASE_URL}/customers/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
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
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse<CustomerAddress>(response);
  },

  async updateAddress(token: string, addressId: string, data: Partial<CustomerAddress>) {
    const response = await fetch(`${API_BASE_URL}/customers/addresses/${addressId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse<CustomerAddress>(response);
  },

  async deleteAddress(token: string, addressId: string) {
    const response = await fetch(`${API_BASE_URL}/customers/addresses/${addressId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse<void>(response);
  },
};

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customer: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  needsPhoneUpdate: false,

  loadAuth: async () => {
    set({ isLoading: true });
    try {
      const [token, customerData] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(CUSTOMER_DATA_KEY),
      ]);

      if (token && customerData) {
        const customer = JSON.parse(customerData);
        set({
          token,
          customer,
          isAuthenticated: true,
        });

        // Verify token is still valid by fetching profile
        try {
          const response = await customerApi.getProfile(token);
          if (response.success && response.data) {
            set({ customer: response.data });
            await AsyncStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(response.data));
          }
        } catch {
          // Token expired, clear auth
          await get().logout();
        }
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const response = await customerApi.register(data);

      if (response.success && response.data) {
        const { token, customer } = response.data;

        await Promise.all([
          AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
          AsyncStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(customer)),
        ]);

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
      const cartId = await AsyncStorage.getItem('cart_id');
      const response = await customerApi.login(data, cartId || undefined);

      if (response.success && response.data) {
        const { token, customer } = response.data;

        await Promise.all([
          AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
          AsyncStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(customer)),
        ]);

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
      // Get guest cart ID to merge on login
      const cartId = await AsyncStorage.getItem('cart_id');
      const response = await customerApi.googleAuth(data, cartId || undefined);

      if (response.success && response.data) {
        const { token, customer, needsPhoneUpdate } = response.data;
        const needsPhone = needsPhoneUpdate || false;

        await Promise.all([
          AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
          AsyncStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(customer)),
        ]);

        set({
          token,
          customer,
          isAuthenticated: true,
          needsPhoneUpdate: needsPhone,
        });

        return { needsPhoneUpdate: needsPhone };
      }
      return { needsPhoneUpdate: false };
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(CUSTOMER_DATA_KEY),
      ]);

      set({
        token: null,
        customer: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  },

  updateProfile: async (data) => {
    const { token, customer } = get();
    if (!token || !customer) return;

    set({ isLoading: true });
    try {
      const response = await customerApi.updateProfile(token, data);

      if (response.success && response.data) {
        const updatedCustomer = { ...customer, ...response.data };
        await AsyncStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(updatedCustomer));
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
      // Changing the password signs out other sessions; keep this one signed
      // in with the fresh token the server returns
      const response: any = await customerApi.changePassword(token, currentPassword, newPassword);
      const newToken = response?.data?.token;
      if (newToken) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
        set({ token: newToken });
      }
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
        await AsyncStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(response.data));
        set({ customer: response.data });
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  },

  addAddress: async (data) => {
    const { token, customer } = get();
    if (!token || !customer) return;

    set({ isLoading: true });
    try {
      const response = await customerApi.addAddress(token, data);

      if (response.success && response.data) {
        const newAddress: CustomerAddress = response.data;
        const addresses: CustomerAddress[] = customer.addresses || [];
        const updatedCustomer = {
          ...customer,
          addresses: [...addresses, newAddress],
        };
        await AsyncStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(updatedCustomer));
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
        const updatedAddress = response.data;
        const addresses: CustomerAddress[] = customer.addresses?.map((addr) =>
          addr.id === addressId ? updatedAddress : addr
        ) || [];

        // If this address was set as default, unset others
        if (data.isDefault) {
          addresses.forEach((addr) => {
            if (addr.id !== addressId) addr.isDefault = false;
          });
        }

        const updatedCustomer = { ...customer, addresses };
        await AsyncStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(updatedCustomer));
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

      const addresses = customer.addresses?.filter(addr => addr.id !== addressId) || [];
      const updatedCustomer = { ...customer, addresses };
      await AsyncStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(updatedCustomer));
      set({ customer: updatedCustomer });
    } finally {
      set({ isLoading: false });
    }
  },
}));
