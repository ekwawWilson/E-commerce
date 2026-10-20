'use client';

import { formatPrice } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supplierApi } from '@/lib/api/supplier';

interface OrderItem {
  id: string;
  productName: string;
  productPrice: number;
  quantity: number;
  total: number;
  fulfillmentStatus: string;
  trackingNumber: string | null;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryNotes: string | null;
    createdAt: string;
  };
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ElementType }> = {
  PENDING: { label: 'Pending', variant: 'outline', icon: Clock },
  PROCESSING: { label: 'Processing', variant: 'secondary', icon: Package },
  SHIPPED: { label: 'Shipped', variant: 'default', icon: Truck },
  DELIVERED: { label: 'Delivered', variant: 'default', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', variant: 'destructive', icon: Clock },
};

export default function SupplierOrdersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || '';

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await supplierApi.getOrders({
        page: pagination.page,
        limit: pagination.limit,
        status: status || undefined,
        search: search || undefined,
      });
      if (response.success) {
        setOrders(response.data.items);
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, status, search]);

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !updateStatus) return;

    setIsUpdating(true);
    try {
      await supplierApi.updateFulfillment(selectedOrder.id, {
        status: updateStatus,
        trackingNumber: trackingNumber || undefined,
      });
      fetchOrders();
      setSelectedOrder(null);
      setUpdateStatus('');
      setTrackingNumber('');
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (amount: number) => formatPrice(amount);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Manage and fulfill customer orders</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status || 'all'} onValueChange={(val) => setStatus(val === 'all' ? '' : val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="SHIPPED">Shipped</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const config = statusConfig[order.fulfillmentStatus] || statusConfig.PENDING;
                const StatusIcon = config.icon;

                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <p className="font-medium">{order.order.orderNumber}</p>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {order.quantity} × {formatCurrency(order.productPrice)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{order.order.customerName}</p>
                        <p className="text-xs text-muted-foreground">{order.order.customerPhone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setUpdateStatus(order.fulfillmentStatus);
                          setTrackingNumber(order.trackingNumber || '');
                        }}
                      >
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {orders.length} of {pagination.total} orders
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Update Status Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Fulfillment Status</DialogTitle>
            <DialogDescription>
              Order: {selectedOrder?.order.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <p className="text-sm">
                {selectedOrder?.productName} × {selectedOrder?.quantity}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Delivery Address</Label>
              <p className="text-sm text-muted-foreground">
                {selectedOrder?.order.deliveryAddress}
              </p>
              {selectedOrder?.order.deliveryNotes && (
                <p className="text-xs text-muted-foreground">
                  Notes: {selectedOrder.order.deliveryNotes}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={updateStatus} onValueChange={setUpdateStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(updateStatus === 'SHIPPED' || updateStatus === 'DELIVERED') && (
              <div className="space-y-2">
                <Label htmlFor="tracking">Tracking Number (optional)</Label>
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
