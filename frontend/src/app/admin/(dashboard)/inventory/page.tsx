'use client';

import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingDown, TrendingUp, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AdminHeader } from '@/components/admin/header';
import { adminApi } from '@/lib/api/admin';

interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  price: number;
  active: boolean;
}

interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  previousStock: number;
  newStock: number;
  change: number;
  reason: string;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [newStock, setNewStock] = useState('');
  const [stockOperation, setStockOperation] = useState<'set' | 'increment' | 'decrement'>('set');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'low-stock' | 'logs'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [productsRes, lowStockRes, logsRes] = await Promise.all([
        adminApi.getProducts({ limit: 100 }),
        adminApi.getLowStockProducts(),
        adminApi.getInventoryLogs({ limit: 50 }),
      ]);

      if (productsRes.success) {
        setProducts((productsRes as { success: boolean; data: Product[] }).data || []);
      }
      if (lowStockRes.success) {
        setLowStockProducts((lowStockRes as { success: boolean; data: Product[] }).data || []);
      }
      if (logsRes.success) {
        setInventoryLogs((logsRes as { success: boolean; data: InventoryLog[] }).data || []);
      }
    } catch (error) {
      console.error('Failed to fetch inventory data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openStockDialog = (product: Product) => {
    setSelectedProduct(product);
    setNewStock(String(product.stock));
    setStockOperation('set');
    setStockDialogOpen(true);
  };

  const handleUpdateStock = async () => {
    if (!selectedProduct || !newStock) return;

    setIsUpdating(true);
    try {
      const quantity = parseInt(newStock);
      const response = await adminApi.updateStock(selectedProduct.id, quantity, stockOperation);

      if (response.success) {
        setStockDialogOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to update stock:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (product: Product) => {
    if (product.stock <= 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const };
    }
    if (product.stock <= product.lowStockThreshold) {
      return { label: 'Low Stock', variant: 'warning' as const };
    }
    return { label: 'In Stock', variant: 'default' as const };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const totalProducts = products.length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;
  const lowStockCount = lowStockProducts.length;

  return (
    <div className="flex flex-col">
      <AdminHeader title="Inventory Management" />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Stock</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totalProducts - outOfStockCount - lowStockCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <Button
            variant={activeTab === 'all' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('all')}
          >
            All Products
          </Button>
          <Button
            variant={activeTab === 'low-stock' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('low-stock')}
          >
            Low Stock ({lowStockCount})
          </Button>
          <Button
            variant={activeTab === 'logs' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('logs')}
          >
            Inventory Logs
          </Button>
        </div>

        {/* All Products Tab */}
        {activeTab === 'all' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Product Inventory</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Low Stock Threshold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No products found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const status = getStockStatus(product);
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.sku || '-'}</TableCell>
                          <TableCell>
                            <span
                              className={
                                product.stock <= 0
                                  ? 'text-red-600 font-bold'
                                  : product.stock <= product.lowStockThreshold
                                  ? 'text-yellow-600 font-bold'
                                  : ''
                              }
                            >
                              {product.stock}
                            </span>
                          </TableCell>
                          <TableCell>{product.lowStockThreshold}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                status.variant === 'warning' ? 'outline' : status.variant
                              }
                              className={
                                status.variant === 'warning'
                                  ? 'border-yellow-500 text-yellow-600'
                                  : ''
                              }
                            >
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openStockDialog(product)}
                            >
                              Update Stock
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Low Stock Tab */}
        {activeTab === 'low-stock' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Low Stock Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        No low stock products
                      </TableCell>
                    </TableRow>
                  ) : (
                    lowStockProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku || '-'}</TableCell>
                        <TableCell>
                          <span
                            className={
                              product.stock <= 0 ? 'text-red-600 font-bold' : 'text-yellow-600 font-bold'
                            }
                          >
                            {product.stock}
                          </span>
                        </TableCell>
                        <TableCell>{product.lowStockThreshold}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openStockDialog(product)}
                          >
                            Restock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Inventory Logs Tab */}
        {activeTab === 'logs' && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Previous</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>New</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No inventory logs
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventoryLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{formatDate(log.createdAt)}</TableCell>
                        <TableCell className="font-medium">{log.productName}</TableCell>
                        <TableCell>{log.previousStock}</TableCell>
                        <TableCell>
                          <span
                            className={
                              log.change > 0
                                ? 'text-green-600'
                                : log.change < 0
                                ? 'text-red-600'
                                : ''
                            }
                          >
                            {log.change > 0 ? '+' : ''}
                            {log.change}
                          </span>
                        </TableCell>
                        <TableCell>{log.newStock}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.reason}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.referenceType ? `${log.referenceType}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Update Stock Dialog */}
        <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Stock - {selectedProduct?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Current Stock: {selectedProduct?.stock}</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="operation">Operation</Label>
                <Select
                  value={stockOperation}
                  onValueChange={(value: 'set' | 'increment' | 'decrement') =>
                    setStockOperation(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set">Set to exact value</SelectItem>
                    <SelectItem value="increment">Add to stock</SelectItem>
                    <SelectItem value="decrement">Subtract from stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">
                  {stockOperation === 'set'
                    ? 'New Stock Value'
                    : stockOperation === 'increment'
                    ? 'Quantity to Add'
                    : 'Quantity to Subtract'}
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                />
              </div>
              {stockOperation !== 'set' && selectedProduct && (
                <div className="text-sm text-muted-foreground">
                  New stock will be:{' '}
                  <span className="font-medium">
                    {stockOperation === 'increment'
                      ? selectedProduct.stock + parseInt(newStock || '0')
                      : Math.max(0, selectedProduct.stock - parseInt(newStock || '0'))}
                  </span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStockDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStock} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update Stock'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
