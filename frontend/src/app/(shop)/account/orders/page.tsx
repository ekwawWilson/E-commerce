'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { customerFetch } from '@/stores/customer';
import { useRequireCustomer } from '@/hooks/use-require-customer';
import { formatPrice, getPaymentStatusColor, getDeliveryStatusLabel } from '@/lib/utils';
import { Order } from '@/types';

type CustomerOrder = Order & {
  items?: Array<{ fulfillmentStatus: string }>;
};

// Mirrors the server rule: customers can cancel until a supplier starts preparing
const CANCELLABLE = ['PENDING', 'CONFIRMED'];

function canCancel(order: CustomerOrder) {
  if (order.cancelledAt || order.deliveryStatus !== 'PENDING') return false;
  return (order.items ?? []).every(
    (i) => i.fulfillmentStatus === 'CANCELLED' || CANCELLABLE.includes(i.fulfillmentStatus ?? '')
  );
}

export default function OrdersPage() {
  const { isAuthenticated } = useRequireCustomer('/account/orders');
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState<CustomerOrder | null>(null);
  const [reason, setReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const list = await customerFetch<CustomerOrder[]>('/orders?limit=50');
      // The list omits items; load each order's items to know if it can be cancelled
      const detailed = await Promise.all(
        (list.data || []).map((o) => customerFetch<CustomerOrder>(`/orders/${o.id}`).then((r) => r.data))
      );
      return detailed;
    },
    enabled: isAuthenticated,
  });

  const orders = data || [];

  const handleCancel = async () => {
    if (!cancelling) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await customerFetch(`/orders/${cancelling.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() || 'Cancelled by customer' }),
      });
      setCancelling(null);
      setReason('');
      await queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    } catch (err: any) {
      setCancelError(err.message || 'Could not cancel this order');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="container max-w-3xl py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/account">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Account
        </Link>
      </Button>

      <h1 className="mb-6 text-2xl font-light tracking-wider">YOUR ORDERS</h1>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      )}

      {error && <p className="text-destructive">Could not load your orders. Please try again.</p>}

      {!isLoading && !error && orders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">You haven&apos;t placed any orders yet.</p>
            <Button asChild className="mt-4">
              <Link href="/products">Start shopping</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="font-mono text-base">{order.orderNumber}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString('en-GB', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Badge className={getPaymentStatusColor(order.paymentStatus)}>{order.paymentStatus}</Badge>
                <Badge variant="secondary">
                  {order.cancelledAt ? 'Cancelled' : getDeliveryStatusLabel(order.deliveryStatus)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1 text-sm">
                {order.itemsSnapshot.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span>{formatPrice(Number(item.price) * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-semibold">Total {formatPrice(order.total)}</span>
                <div className="flex gap-2">
                  {order.paymentMethod === 'MOMO' && order.paymentStatus === 'PENDING' && !order.cancelledAt && (
                    <Button size="sm" asChild>
                      <Link href={`/orders/${order.id}/payment`}>Pay now</Link>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/orders/${order.id}/confirmation`}>Details</Link>
                  </Button>
                  {canCancel(order) && (
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => setCancelling(order)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
              {order.cancelledAt && order.paymentStatus === 'PAID' && (
                <p className="text-sm text-muted-foreground">Your refund is being processed.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!cancelling} onOpenChange={(open) => !open && setCancelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel order {cancelling?.orderNumber}?</DialogTitle>
            <DialogDescription>
              {cancelling?.paymentStatus === 'PAID'
                ? 'Your payment will be refunded to you.'
                : 'This order will be cancelled and no payment will be taken.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>
              Keep order
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
