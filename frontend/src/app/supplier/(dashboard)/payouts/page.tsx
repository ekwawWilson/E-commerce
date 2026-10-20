'use client';

import { formatPrice } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Wallet, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { supplierApi } from '@/lib/api/supplier';

interface Payout {
  id: string;
  referenceId: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  commission: number;
  netAmount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  transactionId: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ElementType }> = {
  PENDING: { label: 'Pending', variant: 'outline', icon: Clock },
  PROCESSING: { label: 'Processing', variant: 'secondary', icon: Clock },
  PAID: { label: 'Paid', variant: 'default', icon: CheckCircle },
  FAILED: { label: 'Failed', variant: 'destructive', icon: AlertCircle },
};

export default function SupplierPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchPayouts = async () => {
    setIsLoading(true);
    try {
      const response = await supplierApi.getPayouts({
        page: pagination.page,
        limit: pagination.limit,
      });
      if (response.success) {
        setPayouts(response.data.items);
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [pagination.page]);

  const formatCurrency = (amount: number) => formatPrice(amount);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate summary stats
  const pendingTotal = payouts
    .filter(p => p.status === 'PENDING')
    .reduce((sum, p) => sum + p.netAmount, 0);
  const paidTotal = payouts
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.netAmount, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payouts</h1>
        <p className="text-muted-foreground">Track your earnings and payment history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {payouts.filter(p => p.status === 'PENDING').length} pending payout(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(paidTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {payouts.filter(p => p.status === 'PAID').length} completed payout(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payouts.length}</div>
            <p className="text-xs text-muted-foreground">
              All-time payout records
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>
            View all your payout records and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid On</TableHead>
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
              ) : payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No payouts yet. Start selling to receive payouts!
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((payout) => {
                  const config = statusConfig[payout.status] || statusConfig.PENDING;
                  const StatusIcon = config.icon;

                  return (
                    <TableRow key={payout.id}>
                      <TableCell className="font-medium">
                        {payout.referenceId}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(payout.periodStart)} - {formatDate(payout.periodEnd)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(payout.grossAmount)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        -{formatCurrency(payout.commission)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payout.netAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payout.paidAt ? formatDate(payout.paidAt) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {payouts.length} of {pagination.total} payouts
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
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Wallet className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">How Payouts Work</p>
              <p className="text-sm text-muted-foreground mt-1">
                Payouts are generated automatically based on your delivered orders.
                The platform commission is deducted from your gross earnings, and the
                net amount is transferred to your registered bank account or mobile money.
                Payouts are typically processed weekly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
