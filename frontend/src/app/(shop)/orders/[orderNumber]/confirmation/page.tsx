'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CheckCircle2, Package, Truck, MapPin, Phone, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice, getPaymentStatusColor, getDeliveryStatusLabel } from '@/lib/utils';

interface ConfirmationPageProps {
  params: { orderNumber: string };
}

export default function OrderConfirmationPage({ params }: ConfirmationPageProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['order', params.orderNumber],
    queryFn: async () => {
      const response = await api.trackOrder(params.orderNumber);
      return response as { success: boolean; data: Order };
    },
  });

  const order: Order | null = data?.data || null;

  if (isLoading) {
    return <ConfirmationSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn&apos;t find an order with that number.
        </p>
        <Button asChild className="mt-4">
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Success Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-green-600">Order Confirmed!</h1>
        <p className="mt-2 text-muted-foreground">
          Thank you for your order. We&apos;ll send you updates about your delivery.
        </p>
        <p className="mt-1 font-mono text-lg font-bold">
          Order #{order.orderNumber}
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Order Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Payment</p>
                <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                  {order.paymentStatus}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivery</p>
                <Badge variant="secondary">
                  {getDeliveryStatusLabel(order.deliveryStatus)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-medium">
                  {order.paymentMethod === 'MOMO' ? 'Mobile Money' : 'Cash on Delivery'}
                </p>
              </div>
            </div>

            {order.paymentMethod === 'MOMO' && order.paymentStatus === 'PENDING' && (
              <div className="mt-4 rounded-lg bg-yellow-50 p-4">
                <p className="text-sm text-yellow-800">
                  Please complete your payment to confirm your order.
                </p>
                <Button asChild className="mt-2" size="sm">
                  <Link href={`/orders/${order.id}/payment`}>Complete Payment</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{order.customerName}</p>
                <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p>{order.customerPhone}</p>
            </div>
            {order.customerEmail && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p>{order.customerEmail}</p>
              </div>
            )}
            {order.deliveryNotes && (
              <div className="mt-2 rounded-lg bg-muted p-3">
                <p className="text-sm font-medium">Delivery Notes:</p>
                <p className="text-sm text-muted-foreground">{order.deliveryNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.itemsSnapshot.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(item.price)} x {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatPrice(Number(item.price) * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span>
                  {Number(order.deliveryFee) === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    formatPrice(order.deliveryFee)
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href={`/track?order=${order.orderNumber}`}>Track Order</Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link href="/">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmationSkeleton() {
  return (
    <div className="container py-8">
      <div className="mb-8 text-center">
        <Skeleton className="mx-auto h-20 w-20 rounded-full" />
        <Skeleton className="mx-auto mt-4 h-8 w-48" />
        <Skeleton className="mx-auto mt-2 h-4 w-64" />
      </div>
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
