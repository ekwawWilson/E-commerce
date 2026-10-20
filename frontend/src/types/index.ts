// Supplier types
export interface Supplier {
  id: string;
  businessName: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  status: SupplierStatus;
}

export type SupplierStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

// Product types
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  currency: string;
  sku: string | null;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
  featured: boolean;
  isPreorder?: boolean;
  preorderNote?: string | null;
  images: ProductImage[];
  categories: ProductCategory[];
  specifications: ProductSpecification[];
  deliveryZones?: ProductDeliveryZone[];
  categoryId?: string; // For API compatibility
  supplierId?: string | null; // Multi-supplier support
  supplier?: Supplier | null; // Multi-supplier support
  createdAt: string;
  updatedAt: string;
}

export interface ProductDeliveryZone {
  id: string;
  zoneName: string;
  zoneType: string;
  region?: string | null;
  minDays: number;
  maxDays: number;
  deliveryFee?: number | null;
  available: boolean;
  notes?: string | null;
}

export interface ProductCategory {
  id: string;
  productId: string;
  categoryId: string;
  sortOrder: number;
  category: Category;
}

export interface ProductImage {
  id: string;
  url: string;
  publicId: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductSpecification {
  id: string;
  key: string;
  value: string;
  group: string | null;
  sortOrder: number;
}

// Category types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  children?: Category[];
}

// Cart types
export interface Cart {
  id: string;
  cartId: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  name: string;
  price: number;
  total: number;
  currency: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    price: string;
    stock: number;
    active: boolean;
    supplierId: string | null;
    images: { url: string; isPrimary: boolean }[];
    supplier?: {
      id: string;
      businessName: string;
      slug: string;
    } | null;
  };
}

export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  currency: string;
  supplierCount?: number;
  supplierGroups?: SupplierGroup[];
}

export interface SupplierGroup {
  supplierId: string;
  supplier: {
    id: string;
    businessName: string;
    slug: string;
  } | null;
  items: CartItem[];
  subtotal: number;
}

// Order types
export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryAddress: string;
  deliveryCity?: string;
  deliveryRegion?: string;
  deliveryNotes: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  currency: string;
  itemsSnapshot: OrderItem[];
  invoiceUrl: string | null;
  deliveryNoteUrl: string | null;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string | null;
  payment?: Payment | null;
  delivery?: Delivery | null;
  items?: OrderItemDetail[];
  paymentReference?: string | null;
  paymentPhone?: string | null;
  notes?: string | null;
  hasPreorderItems?: boolean;
  supplierCount?: number;
  suppliers?: Array<{
    id: string;
    businessName: string;
  }>;
}

export interface OrderItemDetail {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  supplierId?: string | null;
  supplier?: {
    id: string;
    businessName: string;
  } | null;
  fulfillmentStatus?: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    isPreorder?: boolean;
    supplierId?: string | null;
    images: { url: string }[];
  };
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface Payment {
  id: string;
  provider: string;
  transactionId: string | null;
  status: string;
  paidAt: string | null;
}

export interface Delivery {
  id: string;
  trackingNumber: string | null;
  status: string;
  estimatedDelivery: string | null;
  courier?: {
    name: string;
    phone: string | null;
  };
}

// Enums
export type PaymentMethod = 'MOMO' | 'COD';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type DeliveryStatus = 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

// Checkout types
export interface CheckoutData {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  paymentMethod: PaymentMethod;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Payment types
export interface PaymentInitiation {
  paymentId: string;
  referenceId: string;
  status: string;
  message: string;
}
