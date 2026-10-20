'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MoreHorizontal, CheckCircle, XCircle, Clock, Building, Eye, Users, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AdminHeader } from '@/components/admin/header';
import { adminApi } from '@/lib/api/admin';

interface Supplier {
  id: string;
  businessName: string;
  slug: string;
  email: string;
  phone: string | null;
  status: string;
  commissionRate: number;
  verified: boolean;
  createdAt: string;
  maxUsers: number;
  maxProducts: number;
  _count?: {
    products: number;
    admins: number;
  };
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ElementType }> = {
  PENDING: { label: 'Pending', variant: 'outline', icon: Clock },
  ACTIVE: { label: 'Active', variant: 'default', icon: CheckCircle },
  SUSPENDED: { label: 'Suspended', variant: 'destructive', icon: XCircle },
  INACTIVE: { label: 'Inactive', variant: 'secondary', icon: XCircle },
};

export default function AdminSuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [newCommission, setNewCommission] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [dialogType, setDialogType] = useState<'status' | 'commission' | 'maxUsers' | 'maxProducts' | null>(null);
  const [newMaxUsers, setNewMaxUsers] = useState('');
  const [newMaxProducts, setNewMaxProducts] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getSuppliers({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      if (response.success) {
        // Handle both possible response formats
        const items = response.data.items || response.data || [];
        setSuppliers(Array.isArray(items) ? items : []);
        if (response.data.pagination) {
          setPagination(prev => ({ ...prev, ...response.data.pagination }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      setSuppliers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [pagination.page, statusFilter, search]);

  const handleUpdateStatus = async () => {
    if (!selectedSupplier || !newStatus) return;

    setIsUpdating(true);
    try {
      await adminApi.updateSupplierStatus(selectedSupplier.id, newStatus);
      fetchSuppliers();
      setDialogType(null);
      setSelectedSupplier(null);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateCommission = async () => {
    if (!selectedSupplier || !newCommission) return;

    setIsUpdating(true);
    try {
      await adminApi.updateSupplierCommission(selectedSupplier.id, parseFloat(newCommission));
      fetchSuppliers();
      setDialogType(null);
      setSelectedSupplier(null);
    } catch (error) {
      console.error('Failed to update commission:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateMaxUsers = async () => {
    if (!selectedSupplier || !newMaxUsers) return;

    setIsUpdating(true);
    try {
      await adminApi.updateSupplierMaxUsers(selectedSupplier.id, parseInt(newMaxUsers));
      fetchSuppliers();
      setDialogType(null);
      setSelectedSupplier(null);
    } catch (error) {
      console.error('Failed to update max users:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateMaxProducts = async () => {
    if (!selectedSupplier || !newMaxProducts) return;

    setIsUpdating(true);
    try {
      await adminApi.updateSupplierMaxProducts(selectedSupplier.id, parseInt(newMaxProducts));
      fetchSuppliers();
      setDialogType(null);
      setSelectedSupplier(null);
    } catch (error) {
      console.error('Failed to update max products:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex flex-col">
      <AdminHeader title="Suppliers" />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter || 'ALL'} onValueChange={(value) => setStatusFilter(value === 'ALL' ? '' : value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {['PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE'].map((status) => {
            const config = statusConfig[status];
            const count = (suppliers || []).filter(s => s.status === status).length;
            return (
              <div
                key={status}
                className="rounded-lg border bg-background p-4"
              >
                <div className="flex items-center gap-2">
                  <config.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{config.label}</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Max Users</TableHead>
                <TableHead>Max Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    <div className="flex justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No suppliers found
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => {
                  const config = statusConfig[supplier.status] || statusConfig.PENDING;
                  const StatusIcon = config.icon;

                  return (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <Building className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{supplier.businessName}</p>
                            <p className="text-xs text-muted-foreground">{supplier.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{supplier.email}</p>
                          <p className="text-xs text-muted-foreground">{supplier.phone || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier._count?.products || 0}
                      </TableCell>
                      <TableCell>
                        {supplier.commissionRate}%
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{supplier.maxUsers || 5}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span>{supplier.maxProducts || 100}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(supplier.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/suppliers/${supplier.id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/suppliers/${supplier.id}?tab=users`)}
                            >
                              <Users className="mr-2 h-4 w-4" />
                              Manage Users & Roles
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSupplier(supplier);
                                setNewStatus(supplier.status);
                                setDialogType('status');
                              }}
                            >
                              Change Status
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSupplier(supplier);
                                setNewCommission(supplier.commissionRate.toString());
                                setDialogType('commission');
                              }}
                            >
                              Update Commission
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSupplier(supplier);
                                setNewMaxUsers((supplier.maxUsers || 5).toString());
                                setDialogType('maxUsers');
                              }}
                            >
                              Update Max Users
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSupplier(supplier);
                                setNewMaxProducts((supplier.maxProducts || 100).toString());
                                setDialogType('maxProducts');
                              }}
                            >
                              Update Max Products
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
              Showing {suppliers.length} of {pagination.total} suppliers
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
      </div>

      {/* Status Update Dialog */}
      <Dialog open={dialogType === 'status'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Supplier Status</DialogTitle>
            <DialogDescription>
              Update status for {selectedSupplier?.businessName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commission Update Dialog */}
      <Dialog open={dialogType === 'commission'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Commission Rate</DialogTitle>
            <DialogDescription>
              Set commission rate for {selectedSupplier?.businessName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="commission">Commission Rate (%)</Label>
              <Input
                id="commission"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={newCommission}
                onChange={(e) => setNewCommission(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This percentage will be deducted from the supplier&apos;s earnings
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCommission} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Commission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Max Users Update Dialog */}
      <Dialog open={dialogType === 'maxUsers'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Max Users</DialogTitle>
            <DialogDescription>
              Set maximum number of users for {selectedSupplier?.businessName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maxUsers">Maximum Users</Label>
              <Input
                id="maxUsers"
                type="number"
                min="1"
                max="100"
                step="1"
                value={newMaxUsers}
                onChange={(e) => setNewMaxUsers(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of admin users allowed for this supplier
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMaxUsers} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Max Users'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Max Products Update Dialog */}
      <Dialog open={dialogType === 'maxProducts'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Max Products</DialogTitle>
            <DialogDescription>
              Set maximum number of products for {selectedSupplier?.businessName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maxProducts">Maximum Products</Label>
              <Input
                id="maxProducts"
                type="number"
                min="1"
                max="10000"
                step="1"
                value={newMaxProducts}
                onChange={(e) => setNewMaxProducts(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of products this supplier can list
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMaxProducts} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Max Products'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
