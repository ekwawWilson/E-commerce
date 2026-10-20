'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatPrice,
  getDeliveryStatusColor,
  getPaymentStatusColor,
  getDeliveryStatusLabel,
} from '@/lib/utils';

// Tracking needs both the order number and the phone number or email it was
// placed with, so nobody can look up someone else's order.
const contactParams = (contact: string) =>
  contact.includes('@') ? { email: contact } : { phone: contact };

function TrackOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumberParam = searchParams.get('order') || '';
  const contactParam = searchParams.get('phone') || searchParams.get('email') || '';
  const [orderNumber, setOrderNumber] = useState(orderNumberParam);
  const [contact, setContact] = useState(contactParam);
  const [searched, setSearched] = useState(
    orderNumberParam && contactParam ? { orderNumber: orderNumberParam, contact: contactParam } : null
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['track-order', searched?.orderNumber, searched?.contact],
    queryFn: async () => {
      const response = await api.trackOrder(searched!.orderNumber, contactParams(searched!.contact));
      return response as { success: boolean; data: Order };
    },
    enabled: !!searched,
    retry: false,
  });

  const order: Order | null = data?.data || null;
  const searchedOrder = searched?.orderNumber || '';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const number = orderNumber.trim();
    const value = contact.trim();
    if (number && value) {
      setSearched({ orderNumber: number, contact: value });
      // Only the order number goes in the URL; the phone/email stays out of history
      router.push(`/track?order=${encodeURIComponent(number)}`);
    }
  };

  const deliverySteps = [
    { status: 'PENDING', label: 'Order Placed', icon: Clock },
    { status: 'PICKED_UP', label: 'Picked Up', icon: Package },
    { status: 'IN_TRANSIT', label: 'In Transit', icon: Truck },
    { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
  ];

  const getCurrentStepIndex = (status: string) => {
    if (status === 'CANCELLED') return -1;
    const index = deliverySteps.findIndex((step) => step.status === status);
    return index === -1 ? 0 : index;
  };

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-center text-2xl font-bold">Track Your Order</h1>

        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Order number (e.g., ORD-XXXXX)"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Phone number or email used"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!orderNumber.trim() || !contact.trim()}>
                <Search className="mr-2 h-4 w-4" />
                Track
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && <TrackingSkeleton />}

        {/* Error State */}
        {error && !isLoading && searchedOrder && (
          <Card>
            <CardContent className="py-12 text-center">
              <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">Order Not Found</h2>
              <p className="mt-2 text-muted-foreground">
                We couldn&apos;t find order &quot;{searchedOrder}&quot; with that phone number or email.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Please check both and try again.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        {order && !isLoading && (
          <div className="space-y-6">
            {/* Order Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-mono">{order.orderNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Placed on{' '}
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                      {order.paymentStatus}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Delivery Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Delivery Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.cancelledAt || order.deliveryStatus === 'CANCELLED' ? (
                  <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4">
                    <XCircle className="h-8 w-8 text-red-600" />
                    <div>
                      <p className="font-semibold text-red-800">Order Cancelled</p>
                      <p className="text-sm text-red-600">
                        This order has been cancelled.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute left-6 top-0 h-full w-0.5 bg-muted" />

                    {/* Steps */}
                    <div className="space-y-6">
                      {deliverySteps.map((step, index) => {
                        const currentIndex = getCurrentStepIndex(order.deliveryStatus);
                        const isCompleted = index <= currentIndex;
                        const isCurrent = index === currentIndex;
                        const Icon = step.icon;

                        return (
                          <div key={step.status} className="relative flex items-center gap-4">
                            <div
                              className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full ${
                                isCompleted
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground'
                              } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p
                                className={`font-medium ${
                                  isCompleted ? 'text-foreground' : 'text-muted-foreground'
                                }`}
                              >
                                {step.label}
                              </p>
                              {isCurrent && (
                                <p className="text-sm text-primary">Current Status</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tracking Number */}
                {order.delivery?.trackingNumber && (
                  <div className="mt-6 rounded-lg bg-muted p-4">
                    <p className="text-sm text-muted-foreground">Tracking Number</p>
                    <p className="font-mono font-bold">
                      {order.delivery.trackingNumber}
                    </p>
                    {order.delivery.courier && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Courier: {order.delivery.courier.name}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{order.customerName}</p>
                <p className="text-muted-foreground">{order.deliveryAddress}</p>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {order.customerPhone}
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.itemsSnapshot.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.name} x {item.quantity}
                      </span>
                      <span className="font-medium">
                        {formatPrice(Number(item.price) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  {Number(order.discount) > 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>Discount</span>
                      <span>-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>
                      {Number(order.deliveryFee) === 0
                        ? 'Free'
                        : formatPrice(order.deliveryFee)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Refresh Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => refetch()}
            >
              Refresh Status
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!searched && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">Track Your Order</h2>
              <p className="mt-2 text-muted-foreground">
                Enter your order number and the phone number or email you used at
                checkout to see the current status of your delivery.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TrackingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24" />
      <Skeleton className="h-64" />
      <Skeleton className="h-32" />
      <Skeleton className="h-48" />
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<TrackingSkeleton />}>
      <TrackOrderContent />
    </Suspense>
  );
}
