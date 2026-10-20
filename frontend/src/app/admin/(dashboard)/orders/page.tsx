'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Search, Loader2, Eye, Clock, Store, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AdminHeader } from '@/components/admin/header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { adminApi } from '@/lib/api/admin';
import { Order } from '@/types';
import { cn } from '@/lib/utils';

interface Supplier {
  id: string;
  businessName: string;
}

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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [preorderFilter, setPreorderFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await adminApi.getSuppliers({ limit: 100, status: 'ACTIVE' });
      if (response.success && response.data) {
        setSuppliers(response.data.suppliers || []);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getOrders({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        deliveryStatus: statusFilter !== 'all' ? statusFilter : undefined,
        paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
        supplierId: supplierFilter !== 'all' ? supplierFilter : undefined,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      });

      if (response.success && response.data) {
        setOrders(response.data);
        if (response.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: response.pagination.total,
            totalPages: response.pagination.totalPages,
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, statusFilter, paymentStatusFilter, supplierFilter, startDate, endDate]);

  const exportToPdf = async () => {
    setIsExporting(true);
    try {
      // Generate PDF report using current filters
      const params: Record<string, string> = {};
      if (startDate) params.startDate = format(startDate, 'yyyy-MM-dd');
      if (endDate) params.endDate = format(endDate, 'yyyy-MM-dd');
      if (supplierFilter !== 'all') params.supplierId = supplierFilter;
      if (statusFilter !== 'all') params.deliveryStatus = statusFilter;
      if (paymentStatusFilter !== 'all') params.paymentStatus = paymentStatusFilter;

      const response = await adminApi.downloadReport('orders', params);

      if (response.success && response.data?.url) {
        // Open the PDF in a new tab
        window.open(response.data.url, '_blank');
      } else {
        // Fallback: generate a simple CSV download
        const csvContent = generateCsvReport();
        downloadCsv(csvContent, `orders-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
      // Fallback: generate a simple CSV download
      const csvContent = generateCsvReport();
      downloadCsv(csvContent, `orders-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    } finally {
      setIsExporting(false);
    }
  };

  const generateCsvReport = () => {
    const headers = ['Order Number', 'Customer', 'Phone', 'Date', 'Total', 'Payment Status', 'Delivery Status'];
    const rows = orders.map(order => [
      order.orderNumber,
      order.customerName,
      order.customerPhone,
      format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm'),
      order.total.toString(),
      order.paymentStatus,
      order.deliveryStatus,
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="flex flex-col">
      <AdminHeader title="Orders" />

      <div className="p-6">
        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* First row: Search and Export */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by order number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button onClick={exportToPdf} disabled={isExporting} variant="outline">
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export Report
            </Button>
          </div>

          {/* Second row: Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={paymentStatusFilter}
              onValueChange={setPaymentStatusFilter}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>

            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={preorderFilter}
              onValueChange={setPreorderFilter}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="preorder">Pre-orders</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Filters */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-36 justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'MMM dd, yyyy') : 'Start Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-36 justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'MMM dd, yyyy') : 'End Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Clear Filters */}
            {(startDate || endDate || supplierFilter !== 'all' || statusFilter !== 'all' || paymentStatusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate(undefined);
                  setEndDate(undefined);
                  setSupplierFilter('all');
                  setStatusFilter('all');
                  setPaymentStatusFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Suppliers</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{order.orderNumber}</p>
                          {order.hasPreorderItems && (
                            <Badge variant="outline" className="border-orange-500 text-orange-600 text-[10px] px-1">
                              <Clock className="mr-0.5 h-2.5 w-2.5" />
                              Pre-order
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {order.items?.length || 0} items
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.customerPhone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.suppliers && order.suppliers.length > 0 ? (
                        <div className="space-y-1">
                          {order.suppliers.slice(0, 2).map((supplier) => (
                            <div key={supplier.id} className="flex items-center gap-1 text-xs">
                              <Store className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[100px]">{supplier.businessName}</span>
                            </div>
                          ))}
                          {order.suppliers.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{order.suppliers.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Platform</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>
                          {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.createdAt), 'h:mm a')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        GHS {order.total.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          'capitalize',
                          paymentStatusColors[order.paymentStatus]
                        )}
                        variant="secondary"
                      >
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          'capitalize',
                          statusColors[order.deliveryStatus?.toLowerCase()]
                        )}
                        variant="secondary"
                      >
                        {order.deliveryStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/orders/${order.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} orders
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
