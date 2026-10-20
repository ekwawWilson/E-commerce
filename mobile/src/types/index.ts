// Supplier
export interface Supplier {
  id: string;
  businessName: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
}

// Product Image
export interface ProductImage {
  id: string;
  url: string;
  publicId: string;
  isPrimary: boolean;
  sortOrder: number;
}

// Product Specification
export interface ProductSpecification {
  id: string;
  key: string;
  value: string;
  group: string | null;
  sortOrder: number;
}

// Product Delivery Zone
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

// Category
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  children?: Category[];
  _count?: { products: number };
}

// Product Category (join table)
export interface ProductCategory {
  category: Category;
}

// Product
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
  supplierId?: string | null;
  supplier?: Supplier | null;
  createdAt: string;
  updatedAt: string;
}

// Cart Item
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

// Cart Summary
export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  currency: string;
  supplierCount?: number;
}

// Customer Info for Checkout
export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  region?: string;
  deliveryNotes?: string;
}

// Checkout Data
export interface CheckoutData {
  cartId: string;
  customerId?: string; // Set for logged-in customers
  customer: CustomerInfo;
  paymentMethod: 'MOMO' | 'COD';
  momoPhoneNumber?: string;
  notes?: string;
}

// Order Item
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

// Payment
export interface Payment {
  id: string;
  provider: string;
  transactionId: string | null;
  status: string;
  paidAt: string | null;
}

// Delivery
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

// Order
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
  paymentMethod: 'MOMO' | 'COD';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  deliveryStatus: 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
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
  paymentReference?: string | null;
  paymentPhone?: string | null;
  hasPreorderItems?: boolean;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// Customer Address
export interface CustomerAddress {
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

// Customer
export interface Customer {
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

// Navigation types
export type RootStackParamList = {
  MainTabs: undefined;
  ProductDetail: { slug: string };
  CategoryProducts: { categorySlug: string; categoryName: string };
  Checkout: undefined;
  Payment: { orderNumber: string };
  OrderConfirmation: { orderNumber: string };
  // Customer auth screens
  Login: { returnTo?: string };
  Register: undefined;
  // Customer account screens
  Account: undefined;
  EditProfile: undefined;
  Addresses: undefined;
  AddAddress: { addressId?: string };
  Orders: undefined;
  OrderDetail: { orderId: string };
  PaymentMethods: undefined;
  Security: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Cart: undefined;
  Account: undefined;
};
