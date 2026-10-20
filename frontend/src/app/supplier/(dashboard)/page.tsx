'use client';

import { formatPrice } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Package, ShoppingCart, TrendingUp, AlertTriangle, ArrowRight, Clock, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supplierApi } from '@/lib/api/supplier';
import { useSupplierAuthStore } from '@/stores/supplier-auth';
import { getPermissions, type SupplierRole } from '@/lib/supplier-permissions';

interface DashboardStats {
  products: {
    total: number;
    active: number;
    lowStock: number;
    preorder: number;
  };
  orders: {
    today: number;
    pending: number;
    preorderPending: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    change: number;
  };
  recentOrders: Array<{
    id: string;
    productName: string;
    quantity: number;
    total: number;
    fulfillmentStatus: string;
    isPreorder?: boolean;
    order: {
      orderNumber: string;
      customerName: string;
    };
  }>;
  preorderProducts?: Array<{
    id: string;
    name: string;
    pendingOrders: number;
    totalOrdered: number;
  }>;
}

export default function SupplierDashboardPage() {
  const { supplierAdmin, supplier } = useSupplierAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get permissions based on role
  const permissions = useMemo(
    () => getPermissions(supplierAdmin?.role as SupplierRole | undefined),
    [supplierAdmin?.role]
  );

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await supplierApi.getDashboard();
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => formatPrice(amount);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here&apos;s an overview of your store.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.products.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.products.active || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.orders.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.orders.today || 0} new today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {permissions.canViewRevenue ? (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.revenue.thisMonth || 0)}
                </div>
                <p className={`text-xs ${(stats?.revenue.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(stats?.revenue.change || 0) >= 0 ? '+' : ''}{stats?.revenue.change || 0}% from last month
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">---</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Visible to owners/managers
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.products.lowStock || 0}</div>
            <p className="text-xs text-muted-foreground">
              Products need restocking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pre-order Products</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.products.preorder || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.orders.preorderPending || 0} pending pre-orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Recent Orders */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks you can do right now</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {permissions.canCreateProducts ? (
              <Link href="/supplier/products/new">
                <Button variant="outline" className="w-full justify-between">
                  Add New Product
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" className="w-full justify-between" disabled>
                Add New Product
                <Lock className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            {permissions.canViewOrders && (
              <Link href="/supplier/orders?status=PENDING">
                <Button variant="outline" className="w-full justify-between">
                  View Pending Orders
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {permissions.canViewPayouts ? (
              <Link href="/supplier/payouts">
                <Button variant="outline" className="w-full justify-between">
                  View Payouts
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" className="w-full justify-between" disabled>
                View Payouts
                <Lock className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            {permissions.canEditProfile ? (
              <Link href="/supplier/settings">
                <Button variant="outline" className="w-full justify-between">
                  Update Store Settings
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/supplier/settings">
                <Button variant="outline" className="w-full justify-between">
                  View Settings
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders for your products</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="space-y-4">
                {stats.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{order.order.orderNumber}</p>
                        {order.isPreorder && (
                          <Badge variant="outline" className="border-orange-500 text-orange-600 text-[10px] px-1">
                            <Clock className="mr-0.5 h-2.5 w-2.5" />
                            Pre-order
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {order.productName} × {order.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(order.total)}</p>
                      <Badge
                        variant={
                          order.fulfillmentStatus === 'DELIVERED'
                            ? 'default'
                            : order.fulfillmentStatus === 'SHIPPED'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {order.fulfillmentStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                No orders yet
              </p>
            )}
            {stats?.recentOrders && stats.recentOrders.length > 0 && (
              <Link href="/supplier/orders" className="block mt-4">
                <Button variant="outline" className="w-full">
                  View All Orders
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pre-order Products */}
      {stats?.preorderProducts && stats.preorderProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Pre-order Products
            </CardTitle>
            <CardDescription>Your products currently available for pre-order</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.preorderProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Total ordered: {product.totalOrdered}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="border-orange-500 text-orange-600">
                      {product.pendingOrders} pending
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/supplier/products?preorder=true" className="block mt-4">
              <Button variant="outline" className="w-full">
                View All Pre-order Products
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
