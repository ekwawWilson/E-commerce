const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};

  const stored = localStorage.getItem('supplier-auth');
  if (!stored) return {};

  try {
    const { state } = JSON.parse(stored);
    if (state?.token) {
      return { Authorization: `Bearer ${state.token}` };
    }
  } catch {
    return {};
  }
  return {};
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const supplierApi = {
  // Dashboard
  getDashboard: () => fetchWithAuth(`${API_URL}/supplier-portal/dashboard`),

  // Profile
  getProfile: () => fetchWithAuth(`${API_URL}/supplier-portal/profile`),
  updateProfile: (data: Record<string, unknown>) =>
    fetchWithAuth(`${API_URL}/supplier-portal/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Products
  getProducts: (params?: { page?: number; limit?: number; search?: string; active?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.active !== undefined) searchParams.set('active', params.active.toString());

    return fetchWithAuth(`${API_URL}/supplier-portal/products?${searchParams}`);
  },

  getProduct: (productId: string) =>
    fetchWithAuth(`${API_URL}/supplier-portal/products/${productId}`),

  createProduct: (data: Record<string, unknown>) =>
    fetchWithAuth(`${API_URL}/supplier-portal/products`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (productId: string, data: Record<string, unknown>) =>
    fetchWithAuth(`${API_URL}/supplier-portal/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProduct: (productId: string) =>
    fetchWithAuth(`${API_URL}/supplier-portal/products/${productId}`, {
      method: 'DELETE',
    }),

  // Orders
  getOrders: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);

    return fetchWithAuth(`${API_URL}/supplier-portal/orders?${searchParams}`);
  },

  getOrderItem: (orderItemId: string) =>
    fetchWithAuth(`${API_URL}/supplier-portal/orders/${orderItemId}`),

  updateFulfillment: (orderItemId: string, data: { status: string; trackingNumber?: string }) =>
    fetchWithAuth(`${API_URL}/supplier-portal/orders/${orderItemId}/fulfillment`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Payouts
  getPayouts: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    return fetchWithAuth(`${API_URL}/supplier-portal/payouts?${searchParams}`);
  },

  // Staff
  getStaff: () => fetchWithAuth(`${API_URL}/supplier-auth/staff`),

  createStaff: (data: { email: string; name: string; password: string; role?: string }) =>
    fetchWithAuth(`${API_URL}/supplier-auth/staff`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStaffStatus: (staffId: string, active: boolean) =>
    fetchWithAuth(`${API_URL}/supplier-auth/staff/${staffId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),

  deleteStaff: (staffId: string) =>
    fetchWithAuth(`${API_URL}/supplier-auth/staff/${staffId}`, {
      method: 'DELETE',
    }),

  // Password
  changePassword: (currentPassword: string, newPassword: string) =>
    fetchWithAuth(`${API_URL}/supplier-auth/change-password`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Categories (public)
  getCategories: () => fetch(`${API_URL}/categories`).then(r => r.json()),

  // Upload
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_URL}/admin/upload/image`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });

    return response.json();
  },
};
