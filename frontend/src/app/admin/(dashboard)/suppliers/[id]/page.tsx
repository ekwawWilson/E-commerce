'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import {
  ArrowLeft,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Users,
  ShoppingCart,
  Settings,
  Plus,
  MoreHorizontal,
  Search,
  Trash,
  Edit,
  ToggleLeft,
  ToggleRight,
  Truck,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AdminHeader } from '@/components/admin/header';
import { adminApi } from '@/lib/api/admin';
import { getRoleLabel, getRoleBadgeColor, getPermissions, type SupplierRole, type SupplierPermissions } from '@/lib/supplier-permissions';

interface Supplier {
  id: string;
  name: string;
  businessName: string | null;
  slug: string;
  email: string;
  phone: string | null;
  status: string;
  commissionRate: number;
  maxUsers: number;
  maxProducts: number;
  verified: boolean;
  city: string;
  region: string;
  createdAt: string;
  admins: SupplierUser[];
  _count?: {
    products: number;
    orderItems: number;
    payouts: number;
  };
}

interface SupplierUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  permissions: Record<string, boolean> | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  stock: number;
  active: boolean;
  images: { url: string }[];
  categories: { category: { id: string; name: string; slug: string } }[];
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  fulfillmentStatus: string;
  trackingNumber: string | null;
  order: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    customerCity: string;
    paymentStatus: string;
    deliveryStatus: string;
    createdAt: string;
  };
  product: {
    id: string;
    name: string;
    slug: string;
  };
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ElementType }> = {
  PENDING: { label: 'Pending', variant: 'outline', icon: Clock },
  ACTIVE: { label: 'Active', variant: 'default', icon: CheckCircle },
  SUSPENDED: { label: 'Suspended', variant: 'destructive', icon: XCircle },
  INACTIVE: { label: 'Inactive', variant: 'secondary', icon: XCircle },
};

const fulfillmentStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  PENDING: { label: 'Pending', variant: 'outline' },
  CONFIRMED: { label: 'Confirmed', variant: 'secondary' },
  PROCESSING: { label: 'Processing', variant: 'secondary' },
  SHIPPED: { label: 'Shipped', variant: 'default' },
  DELIVERED: { label: 'Delivered', variant: 'default' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize from URL query param if present
    const tabParam = searchParams.get('tab');
    if (tabParam && ['products', 'users', 'orders', 'settings'].includes(tabParam)) {
      return tabParam;
    }
    return 'products';
  });

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Users state
  const [users, setUsers] = useState<{ users: SupplierUser[]; maxUsers: number; currentCount: number } | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SupplierUser | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'STAFF' as 'OWNER' | 'MANAGER' | 'STAFF',
  });
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [deleteUserDialog, setDeleteUserDialog] = useState<SupplierUser | null>(null);

  // Permissions state
  const [permissionsDialogUser, setPermissionsDialogUser] = useState<SupplierUser | null>(null);
  const [permissionsForm, setPermissionsForm] = useState<Record<string, boolean>>({});
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('');
  const [orderStats, setOrderStats] = useState<Record<string, number>>({});
  const [fulfillmentDialog, setFulfillmentDialog] = useState<OrderItem | null>(null);
  const [fulfillmentForm, setFulfillmentForm] = useState({
    fulfillmentStatus: '',
    trackingNumber: '',
    notes: '',
  });

  // Settings state
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [commissionDialog, setCommissionDialog] = useState(false);
  const [newCommission, setNewCommission] = useState('');
  const [maxUsersDialog, setMaxUsersDialog] = useState(false);
  const [newMaxUsers, setNewMaxUsers] = useState('');
  const [maxProductsDialog, setMaxProductsDialog] = useState(false);
  const [newMaxProducts, setNewMaxProducts] = useState('');

  const fetchSupplier = useCallback(async () => {
    try {
      const response = await adminApi.getSupplier(supplierId);
      if (response.success) {
        setSupplier(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch supplier:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supplierId]);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const response = await adminApi.getSupplierProducts(supplierId, {
        search: productSearch || undefined,
        active: productFilter === '' ? undefined : productFilter === 'active',
      });
      if (response.success) {
        // Backend returns { data: products[], pagination: {...} }
        const items = response.data.items || response.data || [];
        setProducts(Array.isArray(items) ? items : []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setProductsLoading(false);
    }
  }, [supplierId, productSearch, productFilter]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const response = await adminApi.getSupplierUsers(supplierId);
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setUsersLoading(false);
    }
  }, [supplierId]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const [ordersResponse, statsResponse] = await Promise.all([
        adminApi.getSupplierOrders(supplierId, {
          search: orderSearch || undefined,
          fulfillmentStatus: orderFilter || undefined,
        }),
        adminApi.getSupplierOrderStats(supplierId),
      ]);
      if (ordersResponse.success) {
        // Backend returns { data: orderItems[], pagination: {...} }
        const items = ordersResponse.data.items || ordersResponse.data || [];
        setOrders(Array.isArray(items) ? items : []);
      }
      if (statsResponse.success) {
        setOrderStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  }, [supplierId, orderSearch, orderFilter]);

  useEffect(() => {
    fetchSupplier();
  }, [fetchSupplier]);

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab, fetchProducts, fetchUsers, fetchOrders]);

  // Product actions
  const handleToggleProductStatus = async (productId: string, active: boolean) => {
    try {
      await adminApi.toggleSupplierProductStatus(supplierId, productId, active);
      fetchProducts();
    } catch (error) {
      console.error('Failed to toggle product status:', error);
    }
  };

  const handleBulkToggleProducts = async (active: boolean) => {
    if (selectedProducts.length === 0) return;
    try {
      await adminApi.bulkToggleSupplierProducts(supplierId, selectedProducts, active);
      setSelectedProducts([]);
      fetchProducts();
    } catch (error) {
      console.error('Failed to bulk toggle products:', error);
    }
  };

  // User actions
  const handleCreateUser = async () => {
    setUserFormError(null);
    setUserFormLoading(true);
    try {
      await adminApi.createSupplierUser(supplierId, userForm);
      setUserDialogOpen(false);
      setUserForm({ name: '', email: '', password: '', phone: '', role: 'STAFF' });
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      setUserFormError(error.message || 'Failed to create user. Please try again.');
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setUserFormError(null);
    setUserFormLoading(true);
    try {
      await adminApi.updateSupplierUser(supplierId, editingUser.id, {
        name: userForm.name,
        phone: userForm.phone,
        role: userForm.role,
      });
      setEditingUser(null);
      setUserForm({ name: '', email: '', password: '', phone: '', role: 'STAFF' });
      setUserDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to update user:', error);
      setUserFormError(error.message || 'Failed to update user. Please try again.');
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleToggleUserStatus = async (user: SupplierUser) => {
    try {
      await adminApi.updateSupplierUser(supplierId, user.id, { active: !user.active });
      fetchUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserDialog) return;
    try {
      await adminApi.deleteSupplierUser(supplierId, deleteUserDialog.id);
      setDeleteUserDialog(null);
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  // Permission actions
  const openPermissionsDialog = (user: SupplierUser) => {
    // Get the role's default permissions
    const defaultPerms = getPermissions(user.role as SupplierRole);
    // Use custom permissions if set, otherwise use role defaults
    const currentPerms = user.permissions || defaultPerms;
    setPermissionsForm(currentPerms as Record<string, boolean>);
    setPermissionsDialogUser(user);
  };

  const handleSavePermissions = async () => {
    if (!permissionsDialogUser) return;
    setPermissionsLoading(true);
    try {
      // Check if permissions are different from role defaults
      const defaultPerms = getPermissions(permissionsDialogUser.role as SupplierRole);
      const defaultPermsRecord = defaultPerms as unknown as Record<string, boolean>;
      const isCustom = Object.keys(permissionsForm).some(
        (key) => permissionsForm[key] !== defaultPermsRecord[key]
      );

      // If permissions match defaults, set to null (no custom permissions)
      const permissions = isCustom ? permissionsForm : null;

      await adminApi.updateSupplierUserPermissions(supplierId, permissionsDialogUser.id, permissions);
      setPermissionsDialogUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Failed to update permissions:', error);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const resetToRoleDefaults = () => {
    if (!permissionsDialogUser) return;
    const defaultPerms = getPermissions(permissionsDialogUser.role as SupplierRole);
    setPermissionsForm(defaultPerms as unknown as Record<string, boolean>);
  };

  // Order actions
  const handleUpdateFulfillment = async () => {
    if (!fulfillmentDialog) return;
    try {
      await adminApi.updateOrderItemFulfillment(supplierId, fulfillmentDialog.id, fulfillmentForm);
      setFulfillmentDialog(null);
      setFulfillmentForm({ fulfillmentStatus: '', trackingNumber: '', notes: '' });
      fetchOrders();
    } catch (error) {
      console.error('Failed to update fulfillment:', error);
    }
  };

  // Settings actions
  const handleUpdateStatus = async () => {
    try {
      setSettingsLoading(true);
      await adminApi.updateSupplierStatus(supplierId, newStatus);
      setStatusDialog(false);
      fetchSupplier();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleUpdateCommission = async () => {
    try {
      setSettingsLoading(true);
      await adminApi.updateSupplierCommission(supplierId, parseFloat(newCommission));
      setCommissionDialog(false);
      fetchSupplier();
    } catch (error) {
      console.error('Failed to update commission:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleUpdateMaxUsers = async () => {
    try {
      setSettingsLoading(true);
      await adminApi.updateSupplierMaxUsers(supplierId, parseInt(newMaxUsers));
      setMaxUsersDialog(false);
      fetchSupplier();
      fetchUsers();
    } catch (error) {
      console.error('Failed to update max users:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleUpdateMaxProducts = async () => {
    try {
      setSettingsLoading(true);
      await adminApi.updateSupplierMaxProducts(supplierId, parseInt(newMaxProducts));
      setMaxProductsDialog(false);
      fetchSupplier();
    } catch (error) {
      console.error('Failed to update max products:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return formatPrice(amount);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Supplier not found</p>
        <Button variant="outline" onClick={() => router.push('/admin/suppliers')}>
          Back to Suppliers
        </Button>
      </div>
    );
  }

  const config = statusConfig[supplier.status] || statusConfig.PENDING;
  const StatusIcon = config.icon;

  return (
    <div className="flex flex-col">
      <AdminHeader title="Supplier Details" />

      <div className="p-6 space-y-6">
        {/* Back button and header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/suppliers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <Building className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{supplier.name}</h1>
                <p className="text-sm text-muted-foreground">{supplier.email}</p>
              </div>
              <Badge variant={config.variant} className="ml-2 gap-1">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{supplier._count?.products || 0} / {supplier.maxProducts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{supplier._count?.orderItems || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{supplier.admins?.length || 0} / {supplier.maxUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Commission</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{supplier.commissionRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Select value={productFilter || 'ALL'} onValueChange={(value) => setProductFilter(value === 'ALL' ? '' : value)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All products</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedProducts.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleBulkToggleProducts(true)}>
                    Enable Selected ({selectedProducts.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkToggleProducts(false)}>
                    Disable Selected
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <input
                        type="checkbox"
                        checked={products && products.length > 0 && selectedProducts.length === products.length}
                        onChange={(e) => {
                          if (e.target.checked && products) {
                            setSelectedProducts(products.map(p => p.id));
                          } else {
                            setSelectedProducts([]);
                          }
                        }}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !products || products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No products found
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProducts([...selectedProducts, product.id]);
                              } else {
                                setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                              }
                            }}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0].url}
                                alt={product.name}
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-muted" />
                            )}
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.categories?.map(c => c.category.name).join(', ') || '-'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{product.sku || '-'}</TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell>
                          <Badge variant={product.active ? 'default' : 'secondary'}>
                            {product.active ? 'Active' : 'Inactive'}
                          </Badge>
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
                                onClick={() => handleToggleProductStatus(product.id, !product.active)}
                              >
                                {product.active ? (
                                  <>
                                    <ToggleLeft className="mr-2 h-4 w-4" />
                                    Disable
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="mr-2 h-4 w-4" />
                                    Enable
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Product
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {users?.currentCount || 0} of {users?.maxUsers || supplier.maxUsers} users
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingUser(null);
                  setUserForm({ name: '', email: '', password: '', phone: '', role: 'STAFF' });
                  setUserFormError(null);
                  setUserDialogOpen(true);
                }}
                disabled={(users?.currentCount || 0) >= (users?.maxUsers || supplier.maxUsers)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>

            <div className="rounded-lg border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !users?.users?.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={getRoleBadgeColor(user.role as SupplierRole)}>
                              {getRoleLabel(user.role as SupplierRole)}
                            </Badge>
                            {user.permissions && (
                              <Badge variant="outline" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                Custom
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.active ? 'default' : 'destructive'}>
                            {user.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
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
                                onClick={() => {
                                  setEditingUser(user);
                                  setUserForm({
                                    name: user.name,
                                    email: user.email,
                                    password: '',
                                    phone: user.phone || '',
                                    role: user.role,
                                  });
                                  setUserFormError(null);
                                  setUserDialogOpen(true);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleUserStatus(user)}>
                                {user.active ? (
                                  <>
                                    <ToggleLeft className="mr-2 h-4 w-4" />
                                    Disable
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="mr-2 h-4 w-4" />
                                    Enable
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openPermissionsDialog(user)}
                                disabled={user.role === 'OWNER'}
                                title={user.role === 'OWNER' ? 'Owners have full access' : undefined}
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                {user.role === 'OWNER' ? 'Full Access (Owner)' : 'Manage Permissions'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteUserDialog(user)}
                                disabled={user.role === 'OWNER'}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {/* Order stats */}
            <div className="grid gap-4 md:grid-cols-6">
              {Object.entries(fulfillmentStatusConfig).map(([status, cfg]) => (
                <Card key={status}>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">{cfg.label}</div>
                    <div className="text-2xl font-bold">{orderStats[status.toLowerCase()] || 0}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={orderFilter || 'ALL'} onValueChange={(value) => setOrderFilter(value === 'ALL' ? '' : value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {Object.entries(fulfillmentStatusConfig).map(([status, cfg]) => (
                    <SelectItem key={status} value={status}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Fulfillment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !orders || orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((item) => {
                      const fConfig = fulfillmentStatusConfig[item.fulfillmentStatus] || fulfillmentStatusConfig.PENDING;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.order.orderNumber}</TableCell>
                          <TableCell>{item.product.name}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{item.order.customerName}</p>
                              <p className="text-xs text-muted-foreground">{item.order.customerCity}</p>
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.totalPrice)}</TableCell>
                          <TableCell>
                            <Badge variant={fConfig.variant}>{fConfig.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(item.order.createdAt)}
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
                                  onClick={() => {
                                    setFulfillmentDialog(item);
                                    setFulfillmentForm({
                                      fulfillmentStatus: item.fulfillmentStatus,
                                      trackingNumber: item.trackingNumber || '',
                                      notes: '',
                                    });
                                  }}
                                >
                                  <Truck className="mr-2 h-4 w-4" />
                                  Update Fulfillment
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/admin/orders/${item.order.id}`)}
                                >
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  View Order
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
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Supplier Information</CardTitle>
                <CardDescription>Basic supplier details and contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Business Name</Label>
                    <p className="font-medium">{supplier.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Slug</Label>
                    <p className="font-medium">{supplier.slug}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{supplier.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{supplier.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Location</Label>
                    <p className="font-medium">{supplier.city}, {supplier.region}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Joined</Label>
                    <p className="font-medium">{formatDate(supplier.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status & Settings</CardTitle>
                <CardDescription>Manage supplier status, commission, and limits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">Status</p>
                    <p className="text-sm text-muted-foreground">Current supplier status</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={config.variant} className="gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewStatus(supplier.status);
                        setStatusDialog(true);
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-t">
                  <div>
                    <p className="font-medium">Commission Rate</p>
                    <p className="text-sm text-muted-foreground">Platform commission percentage</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{supplier.commissionRate}%</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewCommission(supplier.commissionRate.toString());
                        setCommissionDialog(true);
                      }}
                    >
                      Update
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-t">
                  <div>
                    <p className="font-medium">Max Users</p>
                    <p className="text-sm text-muted-foreground">Maximum number of supplier admins allowed</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{supplier.maxUsers}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewMaxUsers(supplier.maxUsers.toString());
                        setMaxUsersDialog(true);
                      }}
                    >
                      Update
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-t">
                  <div>
                    <p className="font-medium">Max Products</p>
                    <p className="text-sm text-muted-foreground">Maximum number of products supplier can post</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{supplier.maxProducts}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewMaxProducts(supplier.maxProducts.toString());
                        setMaxProductsDialog(true);
                      }}
                    >
                      Update
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Actions that can significantly affect the supplier</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Suspend Supplier</p>
                    <p className="text-sm text-muted-foreground">Temporarily disable all supplier activities</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={supplier.status === 'SUSPENDED'}
                    onClick={() => {
                      setNewStatus('SUSPENDED');
                      setStatusDialog(true);
                    }}
                  >
                    Suspend
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user details' : 'Create a new user for this supplier'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              />
            </div>
            {!editingUser && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={userForm.role} onValueChange={(v: 'OWNER' | 'MANAGER' | 'STAFF') => setUserForm({ ...userForm, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Owner</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {userForm.role === 'OWNER' && 'Full access to all features including team management'}
                {userForm.role === 'MANAGER' && 'Can manage products, orders, view payouts. Cannot delete products or manage staff'}
                {userForm.role === 'STAFF' && 'Can only view products and update order fulfillment'}
              </p>
            </div>
            {userFormError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {userFormError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)} disabled={userFormLoading}>
              Cancel
            </Button>
            <Button
              onClick={editingUser ? handleUpdateUser : handleCreateUser}
              disabled={userFormLoading || !userForm.name || (!editingUser && (!userForm.email || !userForm.password))}
            >
              {userFormLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {editingUser ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                editingUser ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteUserDialog} onOpenChange={() => setDeleteUserDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteUserDialog?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions Dialog */}
      <Dialog open={!!permissionsDialogUser} onOpenChange={() => setPermissionsDialogUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Manage Permissions for {permissionsDialogUser?.name}
            </DialogTitle>
            <DialogDescription>
              Customize what this user ({permissionsDialogUser?.role}) can access. Changes override the role&apos;s default permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Products Permissions */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Products</h4>
              <div className="space-y-2 pl-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-view-products" className="text-sm">View Products</Label>
                  <Switch
                    id="perm-view-products"
                    checked={permissionsForm.canViewProducts || false}
                    onCheckedChange={(checked) => setPermissionsForm(prev => ({ ...prev, canViewProducts: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-create-products" className="text-sm">Create Products</Label>
                  <Switch
                    id="perm-create-products"
                    checked={permissionsForm.canCreateProducts || false}
                    onCheckedChange={(checked) => setPermissionsForm(prev => ({ ...prev, canCreateProducts: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-edit-products" className="text-sm">Edit Products</Label>
                  <Switch
                    id="perm-edit-products"
                    checked={permissionsForm.canEditProducts || false}
                    onCheckedChange={(checked) => setPermissionsForm(prev => ({ ...prev, canEditProducts: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-delete-products" className="text-sm">Delete Products</Label>
                  <Switch
                    id="perm-delete-products"
                    checked={permissionsForm.canDeleteProducts || false}
                    onCheckedChange={(checked) => setPermissionsForm(prev => ({ ...prev, canDeleteProducts: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Orders Permissions */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Orders</h4>
              <div className="space-y-2 pl-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-view-orders" className="text-sm">View Orders</Label>
                  <Switch
                    id="perm-view-orders"
                    checked={permissionsForm.canViewOrders || false}
                    onCheckedChange={(checked) => setPermissionsForm(prev => ({ ...prev, canViewOrders: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-update-fulfillment" className="text-sm">Update Fulfillment</Label>
                  <Switch
                    id="perm-update-fulfillment"
                    checked={permissionsForm.canUpdateFulfillment || false}
                    onCheckedChange={(checked) => setPermissionsForm(prev => ({ ...prev, canUpdateFulfillment: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Payouts Permissions */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Payouts</h4>
              <div className="space-y-2 pl-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-view-payouts" className="text-sm">View Payouts</Label>
                  <Switch
                    id="perm-view-payouts"
                    checked={permissionsForm.canViewPayouts || false}
                    onCheckedChange={(checked) => setPermissionsForm(prev => ({ ...prev, canViewPayouts: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Settings Permissions */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Settings</h4>
              <div className="space-y-2 pl-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-view-settings" className="text-sm">View Settings</Label>
                  <Switch
                    id="perm-view-settings"
                    checked={permissionsForm.canViewSettings || false}
                    onCheckedChange={(checked) => setPermissionsForm(prev => ({ ...prev, canViewSettings: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-edit-profile" className="text-sm">Edit Profile</Label>
                  <Switch
                    id="perm-edit-profile"
                    checked={permissionsForm.canEditProfile || false}
                    onCheckedChange={(checked) => setPermissionsForm(prev => ({ ...prev, canEditProfile: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-manage-staff" className="text-sm">Manage Staff</Label>
                  <Switch
                    id="perm-manage-staff"
                    checked={permissionsForm.canManageStaff || false}
                    onCheckedChange={(checked) => setPermissionsForm(prev => ({ ...prev, canManageStaff: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Dashboard Permissions */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Dashboard</h4>
              <div className="space-y-2 pl-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-view-dashboard" className="text-sm">View Dashboard</Label>
                  <Switch
                    id="perm-view-dashboard"
                    checked={permissionsForm.canViewDashboard || false}
                    onCheckedChange={(checked) => setPermissionsForm(prev => ({ ...prev, canViewDashboard: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-view-revenue" className="text-sm">View Revenue</Label>
                  <Switch
                    id="perm-view-revenue"
                    checked={permissionsForm.canViewRevenue || false}
                    onCheckedChange={(checked) => setPermissionsForm(prev => ({ ...prev, canViewRevenue: checked }))}
                  />
                </div>
              </div>
            </div>

            {permissionsDialogUser?.permissions && (
              <div className="pt-2">
                <Badge variant="outline" className="text-xs">
                  Custom permissions active
                </Badge>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={resetToRoleDefaults} className="w-full sm:w-auto">
              Reset to Role Defaults
            </Button>
            <Button onClick={handleSavePermissions} disabled={permissionsLoading} className="w-full sm:w-auto">
              {permissionsLoading ? 'Saving...' : 'Save Permissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fulfillment Dialog */}
      <Dialog open={!!fulfillmentDialog} onOpenChange={() => setFulfillmentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Fulfillment Status</DialogTitle>
            <DialogDescription>
              Update fulfillment for order {fulfillmentDialog?.order.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={fulfillmentForm.fulfillmentStatus}
                onValueChange={(v) => setFulfillmentForm({ ...fulfillmentForm, fulfillmentStatus: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fulfillmentStatusConfig).map(([status, cfg]) => (
                    <SelectItem key={status} value={status}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                value={fulfillmentForm.trackingNumber}
                onChange={(e) => setFulfillmentForm({ ...fulfillmentForm, trackingNumber: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={fulfillmentForm.notes}
                onChange={(e) => setFulfillmentForm({ ...fulfillmentForm, notes: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFulfillmentDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateFulfillment}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Supplier Status</DialogTitle>
            <DialogDescription>Update the status for {supplier.name}</DialogDescription>
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
            <Button variant="outline" onClick={() => setStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={settingsLoading}>
              {settingsLoading ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commission Dialog */}
      <Dialog open={commissionDialog} onOpenChange={setCommissionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Commission Rate</DialogTitle>
            <DialogDescription>Set the commission rate for {supplier.name}</DialogDescription>
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
            <Button variant="outline" onClick={() => setCommissionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCommission} disabled={settingsLoading}>
              {settingsLoading ? 'Updating...' : 'Update Commission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Max Users Dialog */}
      <Dialog open={maxUsersDialog} onOpenChange={setMaxUsersDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Max Users</DialogTitle>
            <DialogDescription>Set the maximum number of users for {supplier.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maxUsers">Max Users</Label>
              <Input
                id="maxUsers"
                type="number"
                min="1"
                max="50"
                value={newMaxUsers}
                onChange={(e) => setNewMaxUsers(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The supplier can have up to this many admin users (1-50)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaxUsersDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMaxUsers} disabled={settingsLoading}>
              {settingsLoading ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Max Products Dialog */}
      <Dialog open={maxProductsDialog} onOpenChange={setMaxProductsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Max Products</DialogTitle>
            <DialogDescription>Set the maximum number of products for {supplier.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maxProducts">Max Products</Label>
              <Input
                id="maxProducts"
                type="number"
                min="1"
                max="10000"
                value={newMaxProducts}
                onChange={(e) => setNewMaxProducts(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The supplier can post up to this many products (1-10000, default: 20)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaxProductsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMaxProducts} disabled={settingsLoading}>
              {settingsLoading ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
