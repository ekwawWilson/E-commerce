'use client';

import { useEffect, useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  Truck,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminHeader } from '@/components/admin/header';
import { adminApi } from '@/lib/api/admin';
import { cn } from '@/lib/utils';

interface ReportData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    averageOrderValue: number;
    revenueChange: number;
    ordersChange: number;
    preorderOrders?: number;
    avgDeliveryDays?: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    totalSold: number;
    revenue: number;
  }>;
  recentSales: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  ordersByStatus: Array<{
    status: string;
    count: number;
  }>;
  deliveryPerformance?: Array<{
    supplier: {
      id: string;
      businessName: string;
    } | null;
    delivered: number;
    avgDays: number;
    onTime: number;
    late: number;
  }>;
  preorderProducts?: Array<{
    id: string;
    name: string;
    pendingOrders: number;
    totalOrdered: number;
  }>;
}

type DateRange = '7days' | '30days' | 'thisMonth' | 'lastMonth';

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const getDateRange = (range: DateRange) => {
    const today = new Date();
    switch (range) {
      case '7days':
        return {
          startDate: format(subDays(today, 7), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      case '30days':
        return {
          startDate: format(subDays(today, 30), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      case 'thisMonth':
        return {
          startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(today), 1);
        return {
          startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
        };
    }
  };

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = getDateRange(dateRange);
      const response = await adminApi.getReports({ startDate, endDate });

      if (response.success && response.data) {
        setReportData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const handleDownloadReport = async (type: 'sales' | 'products' | 'orders') => {
    setIsDownloading(type);
    try {
      const { startDate, endDate } = getDateRange(dateRange);
      const response = await adminApi.downloadReport(type, { startDate, endDate });

      if (response.success && response.data?.url) {
        window.open(response.data.url, '_blank');
      }
    } catch (error) {
      console.error('Failed to download report:', error);
    } finally {
      setIsDownloading(null);
    }
  };

  const summaryCards = [
    {
      title: 'Total Revenue',
      value: reportData
        ? `GHS ${reportData.summary.totalRevenue.toLocaleString()}`
        : '-',
      icon: DollarSign,
      change: reportData?.summary.revenueChange ?? 0,
    },
    {
      title: 'Total Orders',
      value: reportData?.summary.totalOrders ?? '-',
      icon: ShoppingCart,
      change: reportData?.summary.ordersChange ?? 0,
    },
    {
      title: 'Products Sold',
      value: reportData?.summary.totalProducts ?? '-',
      icon: Package,
      change: 0,
    },
    {
      title: 'Avg Order Value',
      value: reportData
        ? `GHS ${reportData.summary.averageOrderValue.toLocaleString()}`
        : '-',
      icon: TrendingUp,
      change: 0,
    },
  ];

  return (
    <div className="flex flex-col">
      <AdminHeader title="Reports" />

      <div className="p-6">
        {/* Header with filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Select
              value={dateRange}
              onValueChange={(value) => setDateRange(value as DateRange)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="thisMonth">This month</SelectItem>
                <SelectItem value="lastMonth">Last month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleDownloadReport('sales')}
              disabled={isDownloading === 'sales'}
            >
              {isDownloading === 'sales' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Sales Report
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownloadReport('orders')}
              disabled={isDownloading === 'orders'}
            >
              {isDownloading === 'orders' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Orders Report
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                  ) : (
                    card.value
                  )}
                </div>
                {card.change !== 0 && (
                  <div className="flex items-center text-xs">
                    {card.change > 0 ? (
                      <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                    )}
                    <span
                      className={cn(
                        card.change > 0 ? 'text-green-500' : 'text-red-500'
                      )}
                    >
                      {card.change > 0 ? '+' : ''}
                      {card.change}%
                    </span>
                    <span className="ml-1 text-muted-foreground">
                      vs last period
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detailed Reports */}
        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products">Top Products</TabsTrigger>
            <TabsTrigger value="sales">Daily Sales</TabsTrigger>
            <TabsTrigger value="orders">Orders by Status</TabsTrigger>
            <TabsTrigger value="delivery">Delivery Performance</TabsTrigger>
            <TabsTrigger value="preorders">Pre-orders</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Top Selling Products</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadReport('products')}
                  disabled={isDownloading === 'products'}
                >
                  {isDownloading === 'products' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download PDF
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-12 animate-pulse rounded bg-muted"
                      />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Units Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData?.topProducts?.length ? (
                        reportData.topProducts.map((product, index) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">
                              #{index + 1}
                            </TableCell>
                            <TableCell>{product.name}</TableCell>
                            <TableCell className="text-right">
                              {product.totalSold}
                            </TableCell>
                            <TableCell className="text-right">
                              GHS {product.revenue.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Daily Sales</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(7)].map((_, i) => (
                      <div
                        key={i}
                        className="h-12 animate-pulse rounded bg-muted"
                      />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData?.recentSales?.length ? (
                        reportData.recentSales.map((sale) => (
                          <TableRow key={sale.date}>
                            <TableCell>
                              {format(new Date(sale.date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              {sale.orders}
                            </TableCell>
                            <TableCell className="text-right">
                              GHS {sale.revenue.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Orders by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-12 animate-pulse rounded bg-muted"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reportData?.ordersByStatus?.length ? (
                      reportData.ordersByStatus.map((item) => {
                        const total = reportData.summary.totalOrders || 1;
                        const percentage = Math.round((item.count / total) * 100);

                        return (
                          <div key={item.status} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="capitalize">{item.status}</span>
                              <span>
                                {item.count} ({percentage}%)
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  'h-full transition-all',
                                  item.status === 'delivered' && 'bg-green-500',
                                  item.status === 'shipped' && 'bg-blue-500',
                                  item.status === 'processing' && 'bg-purple-500',
                                  item.status === 'pending' && 'bg-yellow-500',
                                  item.status === 'cancelled' && 'bg-red-500'
                                )}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-muted-foreground">
                        No data available
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivery">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Delivery Performance by Supplier
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-12 animate-pulse rounded bg-muted"
                      />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Delivered</TableHead>
                        <TableHead className="text-right">Avg Days</TableHead>
                        <TableHead className="text-right">On Time</TableHead>
                        <TableHead className="text-right">Late</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData?.deliveryPerformance?.length ? (
                        reportData.deliveryPerformance.map((item, index) => (
                          <TableRow key={item.supplier?.id || index}>
                            <TableCell className="font-medium">
                              {item.supplier?.businessName || 'Platform'}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.delivered}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {item.avgDays.toFixed(1)} days
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600">{item.onTime}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={item.late > 0 ? 'text-red-600' : 'text-muted-foreground'}>
                                {item.late}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No delivery data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}

                {/* Summary Stats */}
                {reportData?.summary.avgDeliveryDays !== undefined && (
                  <div className="mt-4 rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Average Delivery Time:</span>
                      <span>{reportData.summary.avgDeliveryDays.toFixed(1)} days</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preorders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pre-order Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-12 animate-pulse rounded bg-muted"
                      />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Pending Orders</TableHead>
                        <TableHead className="text-right">Total Ordered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData?.preorderProducts?.length ? (
                        reportData.preorderProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">
                              {product.name}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-orange-600">{product.pendingOrders}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              {product.totalOrdered}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No pre-order products found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}

                {/* Pre-order Summary */}
                {reportData?.summary.preorderOrders !== undefined && (
                  <div className="mt-4 rounded-lg bg-orange-50 p-4 dark:bg-orange-950">
                    <div className="flex items-center gap-2 text-sm text-orange-800 dark:text-orange-200">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Total Pre-orders in Period:</span>
                      <span>{reportData.summary.preorderOrders}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
