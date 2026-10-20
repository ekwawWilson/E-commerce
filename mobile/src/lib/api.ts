import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Category, CartSummary, CheckoutData, Order, ApiResponse } from '../types';

// Set EXPO_PUBLIC_API_URL in mobile/.env (see .env.example). Expo inlines it at
// build time; a device can't reach your machine through "localhost".
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

const CART_ID_KEY = 'cart_id';

// Get cart ID from AsyncStorage
async function getCartId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CART_ID_KEY);
  } catch {
    return null;
  }
}

// Set cart ID in AsyncStorage
async function setCartId(cartId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CART_ID_KEY, cartId);
  } catch (error) {
    console.error('Failed to save cart ID:', error);
  }
}

// Remove cart ID from AsyncStorage
async function removeCartId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CART_ID_KEY);
  } catch (error) {
    console.error('Failed to remove cart ID:', error);
  }
}

// Get headers for API requests
async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const cartId = await getCartId();
  if (cartId) {
    headers['X-Cart-Id'] = cartId;
  }

  // Signed-in customers send their token so orders are linked to the account.
  // Same key the customer store writes; read directly to avoid an import cycle.
  try {
    const token = await AsyncStorage.getItem('customer_auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // No token available; continue as a guest
  }

  return headers;
}

// API Error class
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

// Handle API response
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();

  if (!response.ok) {
    // Backend may return error message in 'error' or 'message' field
    const errorMessage = data.error || data.message || 'An error occurred';
    // Errors array may contain objects with field/message or strings
    const errors = data.errors?.map((e: { message?: string } | string) =>
      typeof e === 'string' ? e : e.message || JSON.stringify(e)
    );
    throw new ApiError(response.status, errorMessage, errors);
  }

  return data;
}

// API Client
export const api = {
  // Products
  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    order?: 'asc' | 'desc';
    featured?: boolean;
  }): Promise<ApiResponse<{ products: Product[]; total: number; page: number; limit: number }>> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }

    const url = `${API_BASE_URL}/products${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  async getProduct(slug: string): Promise<ApiResponse<Product>> {
    const response = await fetch(`${API_BASE_URL}/products/${slug}`);
    return handleResponse(response);
  },

  async getFeaturedProducts(): Promise<ApiResponse<Product[]>> {
    const response = await fetch(`${API_BASE_URL}/products/featured`);
    return handleResponse(response);
  },

  // Categories
  async getCategories(): Promise<ApiResponse<Category[]>> {
    const response = await fetch(`${API_BASE_URL}/categories`);
    return handleResponse(response);
  },

  async getCategoriesTree(): Promise<ApiResponse<Category[]>> {
    const response = await fetch(`${API_BASE_URL}/categories/tree`);
    return handleResponse(response);
  },

  // Cart
  async createCart(): Promise<ApiResponse<{ cartId: string }>> {
    const response = await fetch(`${API_BASE_URL}/cart`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    const data = await handleResponse<{ cartId: string }>(response);

    if (data.data?.cartId) {
      await setCartId(data.data.cartId);
    }

    return data;
  },

  async getCart(): Promise<ApiResponse<CartSummary>> {
    const cartId = await getCartId();

    if (!cartId) {
      return {
        success: true,
        data: { items: [], subtotal: 0, itemCount: 0, currency: 'FCFA' }
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cart/${cartId}`, {
        headers: await getHeaders(),
      });
      return await handleResponse(response);
    } catch (error) {
      // If cart not found (404), clear stale ID and return empty cart
      if (error instanceof ApiError && error.status === 404) {
        await removeCartId();
        return {
          success: true,
          data: { items: [], subtotal: 0, itemCount: 0, currency: 'FCFA' }
        };
      }
      throw error;
    }
  },

  async addToCart(productId: string, quantity = 1): Promise<ApiResponse<CartSummary>> {
    let cartId = await getCartId();

    if (!cartId) {
      const cartResponse = await this.createCart();
      cartId = cartResponse.data?.cartId;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cart/${cartId}/items`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ productId, quantity }),
      });
      return await handleResponse(response);
    } catch (error) {
      // If cart not found (404), clear stale ID and retry
      if (error instanceof ApiError && error.status === 404) {
        await removeCartId();
        const cartResponse = await this.createCart();
        cartId = cartResponse.data?.cartId;

        const response = await fetch(`${API_BASE_URL}/cart/${cartId}/items`, {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify({ productId, quantity }),
        });
        return handleResponse(response);
      }
      throw error;
    }
  },

  async updateCartItem(itemId: string, quantity: number): Promise<ApiResponse<CartSummary>> {
    const cartId = await getCartId();
    if (!cartId) throw new ApiError(400, 'Cart not found');

    const response = await fetch(`${API_BASE_URL}/cart/${cartId}/items/${itemId}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify({ quantity }),
    });
    return handleResponse(response);
  },

  async removeCartItem(itemId: string): Promise<ApiResponse<CartSummary>> {
    const cartId = await getCartId();
    if (!cartId) throw new ApiError(400, 'Cart not found');

    const response = await fetch(`${API_BASE_URL}/cart/${cartId}/items/${itemId}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async clearCart(): Promise<ApiResponse<CartSummary>> {
    const cartId = await getCartId();
    if (!cartId) throw new ApiError(400, 'Cart not found');

    const response = await fetch(`${API_BASE_URL}/cart/${cartId}/items`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  // Orders
  // The API returns the created order itself as `data`
  async checkout(data: CheckoutData): Promise<ApiResponse<Order>> {
    const response = await fetch(`${API_BASE_URL}/orders/checkout`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });

    const result = await handleResponse<Order>(response);

    // Clear cart after successful checkout
    if (result.success) {
      await removeCartId();
    }

    return result;
  },

  // Tracking needs the order number plus the phone or email it was placed with
  async trackOrder(orderNumber: string, contact: string): Promise<ApiResponse<Order>> {
    const params = new URLSearchParams({ orderNumber });
    params.set(contact.includes('@') ? 'email' : 'phone', contact);
    const response = await fetch(`${API_BASE_URL}/orders/track?${params.toString()}`);
    return handleResponse(response);
  },

  // Payments
  async initiatePayment(orderId: string, phoneNumber: string): Promise<ApiResponse<{ transactionId: string }>> {
    const response = await fetch(`${API_BASE_URL}/payments/initiate`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ orderId, phoneNumber }),
    });
    return handleResponse(response);
  },

  async verifyPayment(transactionId: string): Promise<ApiResponse<{ status: string }>> {
    const response = await fetch(`${API_BASE_URL}/payments/verify/${encodeURIComponent(transactionId)}`);
    return handleResponse(response);
  },
};

export default api;
