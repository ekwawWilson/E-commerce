'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ProductImage } from '@/components/ui/product-image';
import {
  ArrowLeft,
  Loader2,
  Package,
  Truck,
  CheckCircle,
  Download,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminHeader } from '@/components/admin/header';
import { adminApi } from '@/lib/api/admin';
import { Order } from '@/types';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

const statusSteps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await adminApi.getOrder(orderId);
        if (response.success && response.data) {
          setOrder(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch order:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;

    setIsUpdating(true);
    try {
      const response = await adminApi.updateOrderStatus(orderId, newStatus);
      if (response.success && response.data) {
        setOrder(response.data);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order?.invoiceUrl) return;
    window.open(order.invoiceUrl, '_blank');
  };

  const handleDownloadDeliveryNote = async () => {
    if (!order?.deliveryNoteUrl) return;
    window.open(order.deliveryNoteUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p className="mb-4 text-muted-foreground">Order not found</p>
        <Link href="/admin/orders">
          <Button variant="outline">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  const currentStep = statusSteps.indexOf(order.deliveryStatus);

  return (
    <div className="flex flex-col">
      <AdminHeader title={`Order ${order.orderNumber}`} />

      <div className="p-6">
        <Link
          href="/admin/orders"
          className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Link>

        {/* Order Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{order.orderNumber}</h2>
            <p className="text-muted-foreground">
              Placed on {format(new Date(order.createdAt), 'MMMM dd, yyyy h:mm a')}
            </p>
          </div>
          <div className="flex gap-2">
            {order.invoiceUrl && (
              <Button variant="outline" onClick={handleDownloadInvoice}>
                <Download className="mr-2 h-4 w-4" />
                Invoice
              </Button>
            )}
            {order.deliveryNoteUrl && (
              <Button variant="outline" onClick={handleDownloadDeliveryNote}>
                <Download className="mr-2 h-4 w-4" />
                Delivery Note
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Order Status Progress */}
            {order.deliveryStatus !== 'CANCELLED' && (
              <Card>
                <CardHeader>
                  <CardTitle>Order Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="flex justify-between">
                      {statusSteps.map((step, index) => {
                        const isCompleted = index <= currentStep;
                        const isCurrent = index === currentStep;

                        return (
                          <div
                            key={step}
                            className="flex flex-col items-center"
                          >
                            <div
                              className={cn(
                                'flex h-10 w-10 items-center justify-center rounded-full border-2',
                                isCompleted
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted-foreground/25 bg-background'
                              )}
                            >
                              {step === 'pending' && (
                                <Package className="h-5 w-5" />
                              )}
                              {step === 'confirmed' && (
                                <CheckCircle className="h-5 w-5" />
                              )}
                              {step === 'processing' && (
                                <Package className="h-5 w-5" />
                              )}
                              {step === 'shipped' && (
                                <Truck className="h-5 w-5" />
                              )}
                              {step === 'delivered' && (
                                <CheckCircle className="h-5 w-5" />
                              )}
                            </div>
                            <span
                              className={cn(
                                'mt-2 text-xs capitalize',
                                isCurrent
                                  ? 'font-medium text-primary'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Progress Line */}
                    <div className="absolute left-0 right-0 top-5 -z-10 mx-10 h-0.5 bg-muted-foreground/25">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${(currentStep / (statusSteps.length - 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 rounded-lg border p-4"
                    >
                      <div className="relative h-16 w-16 overflow-hidden rounded-lg border">
                        {item.product?.images?.[0] ? (
                          <ProductImage
                            src={item.product.images[0].url}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {item.product?.name || 'Product'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity} × GHS {item.price.toLocaleString()}
                        </p>
                      </div>
                      <p className="font-medium">
                        GHS {(item.quantity * item.price).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-6 space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>GHS {order.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>GHS {order.deliveryFee.toLocaleString()}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-green-600">
                        -GHS {order.discount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 text-lg font-bold">
                    <span>Total</span>
                    <span>GHS {order.total.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Update Status */}
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge
                    className={cn(
                      'capitalize',
                      statusColors[order.deliveryStatus]
                    )}
                    variant="secondary"
                  >
                    {order.deliveryStatus}
                  </Badge>
                  <Badge
                    className={cn(
                      'capitalize',
                      paymentStatusColors[order.paymentStatus]
                    )}
                    variant="secondary"
                  >
                    {order.paymentStatus}
                  </Badge>
                </div>

                <Select
                  value={order.deliveryStatus}
                  onValueChange={handleStatusUpdate}
                  disabled={isUpdating || order.deliveryStatus === 'CANCELLED'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                {isUpdating && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-medium">{order.customerName}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {order.customerPhone}
                </div>
                {order.customerEmail && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {order.customerEmail}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p>{order.deliveryAddress}</p>
                    {order.deliveryCity && <p>{order.deliveryCity}</p>}
                    {order.deliveryRegion && <p>{order.deliveryRegion}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="capitalize">{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    className={cn(
                      'capitalize',
                      paymentStatusColors[order.paymentStatus]
                    )}
                    variant="secondary"
                  >
                    {order.paymentStatus}
                  </Badge>
                </div>
                {order.paymentReference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-mono text-xs">
                      {order.paymentReference}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
