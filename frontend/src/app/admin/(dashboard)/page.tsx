'use client';

import { useEffect, useState } from 'react';
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminHeader } from '@/components/admin/header';
import { adminApi } from '@/lib/api/admin';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customer: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminApi.getDashboard();
        if (response.success && response.data) {
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

  const statCards = [
    {
      title: 'Total Revenue',
      value: stats ? `GHS ${stats.totalRevenue.toLocaleString()}` : '-',
      icon: DollarSign,
      change: '+12.5%',
      changeType: 'positive' as const,
    },
    {
      title: 'Total Orders',
      value: stats?.totalOrders ?? '-',
      icon: ShoppingCart,
      change: '+8.2%',
      changeType: 'positive' as const,
    },
    {
      title: 'Total Products',
      value: stats?.totalProducts ?? '-',
      icon: Package,
      change: '+2',
      changeType: 'positive' as const,
    },
    {
      title: 'Pending Orders',
      value: stats?.pendingOrders ?? '-',
      icon: TrendingUp,
      change: '-3',
      changeType: 'negative' as const,
    },
  ];

  return (
    <div className="flex flex-col">
      <AdminHeader title="Dashboard" />

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                  ) : (
                    stat.value
                  )}
                </div>
                <div className="flex items-center text-xs">
                  {stat.changeType === 'positive' ? (
                    <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-3 w-3 text-red-500" />
                  )}
                  <span
                    className={cn(
                      stat.changeType === 'positive'
                        ? 'text-green-500'
                        : 'text-red-500'
                    )}
                  >
                    {stat.change}
                  </span>
                  <span className="ml-1 text-muted-foreground">
                    from last month
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
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
            ) : stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="space-y-4">
                {stats.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.customer}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        GHS {order.total.toLocaleString()}
                      </p>
                      <p
                        className={cn(
                          'text-sm capitalize',
                          order.status === 'delivered' && 'text-green-500',
                          order.status === 'pending' && 'text-yellow-500',
                          order.status === 'shipped' && 'text-blue-500'
                        )}
                      >
                        {order.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">
                No recent orders
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
