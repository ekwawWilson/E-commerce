// ===========================================
// Shared Types for E-Commerce Application
// ===========================================

// Enums
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  MOBILE_MONEY = 'MOBILE_MONEY',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export enum AdminRole {
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

/**
 * Ghana mobile money networks.
 *
 * NOTE: this is hand-mirrored from `MobileMoneyProvider` in
 * backend/prisma/schema.prisma and has no compile-time link to it — keep the
 * two in sync when either changes.
 */
export enum MobileMoneyProvider {
  MTN_MOMO = 'MTN_MOMO',
  TELECEL_CASH = 'TELECEL_CASH',
  AIRTELTIGO_MONEY = 'AIRTELTIGO_MONEY',
}

export enum NotificationType {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
}

// ===========================================
// Product Types
// ===========================================

export interface ProductImage {
  id: string;
  url: string;
  publicId: string;
  alt?: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  comparePrice?: number;
  sku?: string;
  stock: number;
  lowStockThreshold: number;
  categoryId?: string;
  category?: Category;
  images: ProductImage[];
  active: boolean;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCreateInput {
  name: string;
  slug?: string;
  description?: string;
  price: number;
  comparePrice?: number;
  sku?: string;
  stock?: number;
  lowStockThreshold?: number;
  categoryId?: string;
  active?: boolean;
  featured?: boolean;
}

export interface ProductUpdateInput extends Partial<ProductCreateInput> {}

// ===========================================
// Category Types
// ===========================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// Cart Types
// ===========================================

export interface CartItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cart {
  id: string;
  sessionId: string;
  items: CartItem[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemInput {
  productId: string;
  quantity: number;
}

// ===========================================
// Order Types
// ===========================================

export interface OrderItem {
  id: string;
  productId: string;
  product?: Product;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  city: string;
  region?: string;
  notes?: string;
}

export interface CustomerInput {
  name: string;
  email?: string;
  phone: string;
  address: string;
  city: string;
  region?: string;
  notes?: string;
}

export interface Payment {
  id: string;
  method: PaymentMethod;
  provider?: MobileMoneyProvider;
  transactionId?: string;
  providerReference?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  phoneNumber?: string;
  paidAt?: Date;
  failedReason?: string;
}

export interface Delivery {
  id: string;
  courierId?: string;
  courier?: Courier;
  status: DeliveryStatus;
  trackingNumber?: string;
  estimatedDate?: Date;
  assignedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  deliveryNotes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  cartId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  notes?: string;
  items: OrderItem[];
  customer?: Customer;
  payment?: Payment;
  delivery?: Delivery;
  invoiceUrl?: string;
  deliveryNoteUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderCreateInput {
  customer: CustomerInput;
  paymentMethod: PaymentMethod;
  mobileMoneyProvider?: MobileMoneyProvider;
  phoneNumber?: string; // For mobile money
  notes?: string;
}

// ===========================================
// Courier Types
// ===========================================

export interface Courier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// Admin Types
// ===========================================

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  admin: Omit<Admin, 'passwordHash'>;
}

// ===========================================
// Settings Types
// ===========================================

export interface PaymentMethodSettings {
  mobile_money: boolean;
  cash_on_delivery: boolean;
}

export interface DeliveryFeeSettings {
  default: number;
  free_above: number;
}

export interface StoreInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
}

export interface NotificationSettings {
  admin_email: string;
  admin_whatsapp: string;
}

export interface AppSettings {
  payment_methods_enabled: PaymentMethodSettings;
  delivery_fee: DeliveryFeeSettings;
  store_info: StoreInfo;
  notification_settings: NotificationSettings;
}

// ===========================================
// API Response Types
// ===========================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ===========================================
// Report Types
// ===========================================

export interface SalesReport {
  period: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<OrderStatus, number>;
  ordersByPaymentMethod: Record<PaymentMethod, number>;
}

export interface CODOutstandingReport {
  totalPending: number;
  totalAmount: number;
  orders: Array<{
    orderNumber: string;
    customer: string;
    total: number;
    createdAt: Date;
  }>;
}

export interface DeliveryReport {
  preDelivery: number;
  inTransit: number;
  delivered: number;
  failed: number;
  totalDeliveries: number;
}

// ===========================================
// Notification Types
// ===========================================

export interface NotificationPayload {
  type: NotificationType;
  recipient: string;
  subject?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface OrderNotificationData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  total: number;
  paymentMethod: PaymentMethod;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}
