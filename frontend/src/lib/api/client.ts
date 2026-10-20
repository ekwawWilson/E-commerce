import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const CART_ID_COOKIE = 'cart_id';

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
    throw new ApiError(
      response.status,
      data.message || 'An error occurred',
      data.errors
    );
  }

  return data;
}

function getCartId(): string | undefined {
  return Cookies.get(CART_ID_COOKIE);
}

function setCartId(cartId: string): void {
  Cookies.set(CART_ID_COOKIE, cartId, { expires: 365 }); // 1 year
}

export function getHeaders(includeCartId = true): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeCartId) {
    const cartId = getCartId();
    if (cartId) {
      headers['X-Cart-Id'] = cartId;
    }
  }

  return headers;
}

export const api = {
  // Products
  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    // NOTE: these must be sortBy/sortOrder — the API validates against
    // productListQuerySchema, which ignores (and now rejects) other names.
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    inStock?: boolean;
    onSale?: boolean;
    featured?: boolean;
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
      `${API_BASE_URL}/products?${searchParams.toString()}`,
      { headers: getHeaders(false) }
    );
    return handleResponse(response);
  },

  async getProduct(slug: string) {
    const response = await fetch(`${API_BASE_URL}/products/${slug}`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },

  async getFeaturedProducts() {
    const response = await fetch(`${API_BASE_URL}/products/featured`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },

  // Categories
  async getCategories() {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },

  async getCategoryTree() {
    const response = await fetch(`${API_BASE_URL}/categories/tree`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },

  // Cart
  async createCart() {
    const response = await fetch(`${API_BASE_URL}/cart`, {
      method: 'POST',
      headers: getHeaders(false),
    });
    const data = await handleResponse(response);
    if (data.data?.cartId) {
      setCartId(data.data.cartId);
    }
    return data;
  },

  async getCart() {
    const cartId = getCartId();
    if (!cartId) {
      return { success: true, data: { items: [], subtotal: 0, itemCount: 0 } };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cart/${cartId}`, {
        headers: getHeaders(),
      });
      return await handleResponse(response);
    } catch (error) {
      // If cart not found (404), clear stale cookie and return empty cart
      if (error instanceof ApiError && error.status === 404) {
        Cookies.remove(CART_ID_COOKIE);
        return { success: true, data: { items: [], subtotal: 0, itemCount: 0 } };
      }
      throw error;
    }
  },

  async addToCart(productId: string, quantity = 1) {
    // Create cart if needed
    let cartId = getCartId();
    if (!cartId) {
      const cartResponse = await this.createCart();
      cartId = cartResponse.data?.cartId;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cart/${cartId}/items`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ productId, quantity }),
      });
      return await handleResponse(response);
    } catch (error) {
      // If cart not found (404), clear stale cookie and retry with new cart
      if (error instanceof ApiError && error.status === 404) {
        Cookies.remove(CART_ID_COOKIE);
        const cartResponse = await this.createCart();
        cartId = cartResponse.data?.cartId;

        const response = await fetch(`${API_BASE_URL}/cart/${cartId}/items`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ productId, quantity }),
        });
        return handleResponse(response);
      }
      throw error;
    }
  },

  async updateCartItem(itemId: string, quantity: number) {
    const cartId = getCartId();
    if (!cartId) {
      throw new ApiError(400, 'No cart found');
    }
    const response = await fetch(`${API_BASE_URL}/cart/${cartId}/items/${itemId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ quantity }),
    });
    return handleResponse(response);
  },

  async removeFromCart(itemId: string) {
    const cartId = getCartId();
    if (!cartId) {
      throw new ApiError(400, 'No cart found');
    }
    const response = await fetch(`${API_BASE_URL}/cart/${cartId}/items/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async clearCart() {
    const cartId = getCartId();
    if (!cartId) {
      return { success: true, data: null };
    }
    const response = await fetch(`${API_BASE_URL}/cart/${cartId}/items`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Checkout
  async checkout(data: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    address: string;
    city: string;
    region?: string;
    deliveryNotes?: string;
    paymentMethod: 'MOMO' | 'COD';
    momoPhoneNumber?: string;
    notes?: string;
  }) {
    const cartId = getCartId();
    if (!cartId) {
      throw new ApiError(400, 'Your cart is empty');
    }

    // The API expects { cartId, customer: {...} }. This used to post flat
    // customerName/deliveryAddress fields with no cartId, which the checkout
    // schema rejected outright — no order could ever be placed.
    const response = await fetch(`${API_BASE_URL}/orders/checkout`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        cartId,
        customer: {
          name: data.customerName,
          phone: data.customerPhone,
          email: data.customerEmail,
          address: data.address,
          city: data.city,
          region: data.region,
          deliveryNotes: data.deliveryNotes,
        },
        paymentMethod: data.paymentMethod,
        momoPhoneNumber: data.momoPhoneNumber,
        notes: data.notes,
      }),
    });
    const result = await handleResponse(response);

    // Clear cart cookie after successful checkout
    if (result.success) {
      Cookies.remove(CART_ID_COOKIE);
    }

    return result;
  },

  // Orders
  async trackOrder(orderNumber: string) {
    const response = await fetch(`${API_BASE_URL}/orders/track/${orderNumber}`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },

  // Payments
  async initiatePayment(orderId: string, phoneNumber: string) {
    const response = await fetch(`${API_BASE_URL}/payments/initiate`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ orderId, phoneNumber }),
    });
    return handleResponse(response);
  },

  async checkPaymentStatus(paymentId: string) {
    const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/status`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },
};

export default api;
