export interface OrderData {
  id: string;
  orderNumber: string;
  createdAt: Date;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  deliveryAddress: string;
  deliveryNotes?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  deliveryStatus: string;
  subtotal: number | string;
  deliveryFee: number | string;
  total: number | string;
  currency: string;
  itemsSnapshot: OrderItem[];
  payment?: PaymentData | null;
  delivery?: DeliveryData | null;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number | string;
  quantity: number;
  imageUrl?: string;
}

export interface PaymentData {
  id: string;
  provider: string;
  transactionId?: string | null;
  status: string;
  paidAt?: Date | null;
}

export interface DeliveryData {
  id: string;
  trackingNumber?: string | null;
  status: string;
  courier?: {
    name: string;
    phone?: string | null;
  } | null;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  logoPath?: string;
}

export interface PdfOptions {
  includeQrCode?: boolean;
  qrCodeUrl?: string;
  includeBarcode?: boolean;
  footerNotes?: string[];
}
