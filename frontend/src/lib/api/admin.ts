import { getAuthToken } from '@/stores/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleResponse(response: Response): Promise<any> {
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid
      window.location.href = '/admin/login';
    }
    throw new ApiError(
      response.status,
      data.message || 'An error occurred',
      data.errors
    );
  }

  return data;
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export const adminApi = {
  // Auth
  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  async getMe() {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await fetch(`${API_BASE_URL}/auth/password`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return handleResponse(response);
  },

  // Products
  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    active?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/products?${searchParams.toString()}`,
      { headers: getHeaders() }
    );
    return handleResponse(response);
  },

  async getProduct(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async createProduct(data: any) {
    const response = await fetch(`${API_BASE_URL}/admin/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateProduct(id: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteProduct(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async updateStock(id: string, quantity: number, operation: 'set' | 'increment' | 'decrement') {
    const response = await fetch(`${API_BASE_URL}/admin/products/${id}/stock`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ quantity, operation }),
    });
    return handleResponse(response);
  },

  // Categories
  async getCategories() {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async createCategory(data: { name: string; description?: string; parentId?: string }) {
    const response = await fetch(`${API_BASE_URL}/admin/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateCategory(id: string, data: { name: string; description?: string; parentId?: string }) {
    const response = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteCategory(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async uploadCategoryImage(categoryId: string, file: File) {
    const formData = new FormData();
    formData.append('image', file);

    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return handleResponse(response);
  },

  async deleteCategoryImage(categoryId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}/image`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Orders
  async getOrders(params?: {
    page?: number;
    limit?: number;
    paymentStatus?: string;
    deliveryStatus?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    supplierId?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/orders?${searchParams.toString()}`,
      { headers: getHeaders() }
    );
    return handleResponse(response);
  },

  async getOrder(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/orders/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async updatePaymentStatus(id: string, status: string) {
    const response = await fetch(`${API_BASE_URL}/admin/orders/${id}/payment-status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },

  async updateDeliveryStatus(
    id: string,
    status: string,
    courierId?: string,
    trackingNumber?: string
  ) {
    const response = await fetch(`${API_BASE_URL}/admin/orders/${id}/delivery-status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, courierId, trackingNumber }),
    });
    return handleResponse(response);
  },

  async updateOrderStatus(id: string, status: string) {
    const response = await fetch(`${API_BASE_URL}/admin/orders/${id}/delivery-status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },

  // Upload
  async uploadImage(file: File, folder?: string) {
    const formData = new FormData();
    formData.append('image', file);
    if (folder) {
      formData.append('folder', folder);
    }

    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/upload/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return handleResponse(response);
  },

  async uploadImages(files: File[], folder?: string) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    if (folder) {
      formData.append('folder', folder);
    }

    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/upload/images`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return handleResponse(response);
  },

  async deleteImage(publicId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/upload/image`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ publicId }),
    });
    return handleResponse(response);
  },

  // Reports
  async getDashboard() {
    const response = await fetch(`${API_BASE_URL}/admin/reports/dashboard`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getSalesReport(params?: { startDate?: string; endDate?: string; groupBy?: string }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/reports/sales?${searchParams.toString()}`,
      { headers: getHeaders() }
    );
    return handleResponse(response);
  },

  async getInventoryReport(params?: { lowStock?: boolean; outOfStock?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/reports/inventory?${searchParams.toString()}`,
      { headers: getHeaders() }
    );
    return handleResponse(response);
  },

  async getOrdersReport(params?: { startDate?: string; endDate?: string }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/reports/orders?${searchParams.toString()}`,
      { headers: getHeaders() }
    );
    return handleResponse(response);
  },

  async getReports(params?: { startDate?: string; endDate?: string }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/reports/summary?${searchParams.toString()}`,
      { headers: getHeaders() }
    );
    return handleResponse(response);
  },

  async downloadReport(type: string, params?: { startDate?: string; endDate?: string }) {
    const searchParams = new URLSearchParams();
    searchParams.append('type', type);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/reports/download?${searchParams.toString()}`,
      { headers: getHeaders() }
    );
    return handleResponse(response);
  },

  // Couriers
  async getCouriers() {
    const response = await fetch(`${API_BASE_URL}/admin/couriers`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Specification Templates
  async getSpecificationTemplates() {
    const response = await fetch(`${API_BASE_URL}/admin/specifications`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async createSpecificationTemplate(data: {
    key: string;
    label: string;
    group: string;
    type: string;
    options?: string[];
    required: boolean;
  }) {
    const response = await fetch(`${API_BASE_URL}/admin/specifications`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateSpecificationTemplate(
    id: string,
    data: {
      key?: string;
      label?: string;
      group?: string;
      type?: string;
      options?: string[];
      required?: boolean;
    }
  ) {
    const response = await fetch(`${API_BASE_URL}/admin/specifications/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteSpecificationTemplate(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/specifications/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Inventory
  async getInventoryLogs(params?: {
    page?: number;
    limit?: number;
    productId?: string;
    reason?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/products/inventory-logs?${searchParams.toString()}`,
      { headers: getHeaders() }
    );
    return handleResponse(response);
  },

  async getLowStockProducts() {
    const response = await fetch(`${API_BASE_URL}/admin/products/low-stock`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Suppliers
  async getSuppliers(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/suppliers?${searchParams.toString()}`,
      { headers: getHeaders() }
    );
    return handleResponse(response);
  },

  async getSupplier(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async updateSupplierStatus(id: string, status: string) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },

  async updateSupplierCommission(id: string, commissionRate: number) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${id}/commission`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ commissionRate }),
    });
    return handleResponse(response);
  },

  // Payouts
  async getPayouts(params?: {
    page?: number;
    limit?: number;
    supplierId?: string;
    status?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/payouts?${searchParams.toString()}`,
      { headers: getHeaders() }
    );
    return handleResponse(response);
  },

  async getPayoutStats() {
    const response = await fetch(`${API_BASE_URL}/admin/payouts/stats`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async generatePayouts(periodStart: string, periodEnd: string) {
    const response = await fetch(`${API_BASE_URL}/admin/payouts/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ periodStart, periodEnd }),
    });
    return handleResponse(response);
  },

  async updatePayoutStatus(id: string, status: string, transactionId?: string, notes?: string) {
    const response = await fetch(`${API_BASE_URL}/admin/payouts/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, transactionId, notes }),
    });
    return handleResponse(response);
  },

  // Supplier Stats
  async getSupplierStats(supplierId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${supplierId}/stats`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async updateSupplierMaxUsers(supplierId: string, maxUsers: number) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${supplierId}/max-users`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ maxUsers }),
    });
    return handleResponse(response);
  },

  async updateSupplierMaxProducts(supplierId: string, maxProducts: number) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${supplierId}/max-products`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ maxProducts }),
    });
    return handleResponse(response);
  },

  async getSupplierProductLimits(supplierId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${supplierId}/product-limits`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Supplier User Management
  async getSupplierUsers(supplierId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${supplierId}/users`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async createSupplierUser(supplierId: string, data: {
    email: string;
    name: string;
    password: string;
    phone?: string;
    role: 'OWNER' | 'MANAGER' | 'STAFF';
  }) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${supplierId}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateSupplierUser(supplierId: string, userId: string, data: {
    name?: string;
    phone?: string;
    role?: 'OWNER' | 'MANAGER' | 'STAFF';
    active?: boolean;
  }) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${supplierId}/users/${userId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteSupplierUser(supplierId: string, userId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${supplierId}/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async updateSupplierUserPermissions(supplierId: string, userId: string, permissions: Record<string, boolean> | null) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${supplierId}/users/${userId}/permissions`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ permissions }),
    });
    return handleResponse(response);
  },

  // Supplier Product Management
  async getSupplierProducts(supplierId: string, params?: {
    page?: number;
    limit?: number;
    active?: boolean;
    search?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/suppliers/${supplierId}/products?${searchParams.toString()}`,
      { headers: getHeaders() }
    );
    return handleResponse(response);
  },

  async toggleSupplierProductStatus(supplierId: string, productId: string, active: boolean) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${supplierId}/products/${productId}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ active }),
    });
    return handleResponse(response);
  },

  async bulkToggleSupplierProducts(supplierId: string, productIds: string[], active: boolean) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${supplierId}/products/bulk-status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ productIds, active }),
    });
    return handleResponse(response);
  },

  // Supplier Order Management
  async getSupplierOrders(supplierId: string, params?: {
    page?: number;
    limit?: number;
    fulfillmentStatus?: string;
    search?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/suppliers/${supplierId}/orders?${searchParams.toString()}`,
      { headers: getHeaders() }
    );
    return handleResponse(response);
  },

  async getSupplierOrderStats(supplierId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${supplierId}/orders/stats`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async updateOrderItemFulfillment(supplierId: string, orderItemId: string, data: {
    fulfillmentStatus: string;
    trackingNumber?: string;
    notes?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/admin/suppliers/${supplierId}/orders/${orderItemId}/fulfillment`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};

export default adminApi;
