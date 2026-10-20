import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const CART_ID_COOKIE = 'cart_id';
// Same cookie the customer store writes; read directly to avoid an import cycle
const CUSTOMER_TOKEN_COOKIE = 'customer_token';

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
      // The API puts the message in `error`; validation failures also list `errors`
      data.error || data.message || 'An error occurred',
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

  // Signed-in customers send their token so orders are linked to the account
  const customerToken = Cookies.get(CUSTOMER_TOKEN_COOKIE);
  if (customerToken) {
    headers['Authorization'] = `Bearer ${customerToken}`;
  }

  return headers;
}

export interface CheckoutQuote {
  subtotal: number;
  discount: number;
  couponCode: string | null;
  deliveryFee: number;
  total: number;
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
    couponCode?: string;
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
        couponCode: data.couponCode,
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

  // What checkout will charge for this cart, destination and coupon
  async quote(data: { city: string; region?: string; couponCode?: string }): Promise<{ success: boolean; data: CheckoutQuote }> {
    const cartId = getCartId();
    if (!cartId) {
      throw new ApiError(400, 'Your cart is empty');
    }
    const response = await fetch(`${API_BASE_URL}/orders/quote`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ cartId, ...data }),
    });
    return handleResponse(response);
  },

  async previewCoupon(code: string) {
    const cartId = getCartId();
    if (!cartId) {
      throw new ApiError(400, 'Your cart is empty');
    }
    const response = await fetch(`${API_BASE_URL}/coupons/preview`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code, cartId }),
    });
    return handleResponse(response);
  },

  // Orders
  // Tracking needs the order number plus the phone or email it was placed with
  async trackOrder(orderNumber: string, contact: { phone?: string; email?: string }) {
    const params = new URLSearchParams({ orderNumber });
    if (contact.phone) params.set('phone', contact.phone);
    if (contact.email) params.set('email', contact.email);
    const response = await fetch(`${API_BASE_URL}/orders/track?${params.toString()}`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },

  // Order summary by ID (no personal details), for confirmation/payment pages
  async getOrder(orderId: string) {
    const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
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

  async verifyPayment(transactionId: string) {
    const response = await fetch(`${API_BASE_URL}/payments/verify/${encodeURIComponent(transactionId)}`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },

  // Password reset (customers, suppliers and admins)
  async requestPasswordReset(email: string, accountType: 'CUSTOMER' | 'SUPPLIER' | 'ADMIN' = 'CUSTOMER') {
    const response = await fetch(`${API_BASE_URL}/password-reset/request`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ email, accountType }),
    });
    return handleResponse(response);
  },

  async resetPassword(token: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/password-reset/confirm`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ token, password }),
    });
    return handleResponse(response);
  },

  async confirmEmail(token: string) {
    const response = await fetch(`${API_BASE_URL}/customers/verify-email/confirm`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ token }),
    });
    return handleResponse(response);
  },
};

export default api;
