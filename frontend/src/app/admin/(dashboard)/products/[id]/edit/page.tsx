'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AdminHeader } from '@/components/admin/header';
import { ImageUpload, UploadedImage } from '@/components/admin/image-upload';
import { ProductSpecifications, ProductSpecification } from '@/components/admin/product-specifications';
import { ProductDeliveryZones, DeliveryZone } from '@/components/admin/product-delivery-zones';
import { adminApi } from '@/lib/api/admin';
import { Product } from '@/types';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Supplier {
  id: string;
  name: string;
  businessName: string;
  status: string;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [specifications, setSpecifications] = useState<ProductSpecification[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [originalSupplierId, setOriginalSupplierId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    compareAtPrice: '',
    stock: '',
    sku: '',
    categoryId: '',
    supplierId: '',
    isActive: true,
    isFeatured: false,
    isPreorder: false,
    preorderNote: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productResponse, categoriesResponse, suppliersResponse] = await Promise.all([
          adminApi.getProduct(productId),
          adminApi.getCategories(),
          adminApi.getSuppliers({ status: 'ACTIVE', limit: 100 }),
        ]) as [
          { success: boolean; data?: Product },
          { success: boolean; data?: Category[] },
          { success: boolean; data?: { items?: Supplier[] } | Supplier[] }
        ];

        if (productResponse.success && productResponse.data) {
          const product = productResponse.data as Product;
          setFormData({
            name: product.name,
            description: product.description || '',
            price: product.price.toString(),
            compareAtPrice: product.comparePrice?.toString() || '',
            stock: product.stock.toString(),
            sku: product.sku || '',
            categoryId: product.categories?.[0]?.categoryId || product.categories?.[0]?.category?.id || '',
            supplierId: product.supplierId || '',
            isActive: product.active,
            isFeatured: product.featured,
            isPreorder: product.isPreorder || false,
            preorderNote: product.preorderNote || '',
          });

          // Store original supplierId to determine if we should allow editing
          if (product.supplierId) {
            setOriginalSupplierId(product.supplierId);
          }

          if (product.images) {
            setImages(
              product.images.map((img) => ({
                url: img.url,
                publicId: img.publicId,
                isPrimary: img.isPrimary,
              }))
            );
          }

          if (product.specifications) {
            setSpecifications(
              product.specifications.map((spec) => ({
                key: spec.key,
                value: spec.value,
                group: spec.group || undefined,
              }))
            );
          }

          if (product.deliveryZones) {
            setDeliveryZones(
              product.deliveryZones.map((zone) => ({
                zoneName: zone.zoneName,
                zoneType: zone.zoneType || 'city',
                region: zone.region ?? undefined,
                minDays: zone.minDays,
                maxDays: zone.maxDays,
                deliveryFee: zone.deliveryFee ?? undefined,
                available: zone.available ?? true,
                notes: zone.notes ?? undefined,
              }))
            );
          }
        }

        if (categoriesResponse.success && categoriesResponse.data) {
          setCategories(categoriesResponse.data);
        }

        if (suppliersResponse.success && suppliersResponse.data) {
          const suppliersData = suppliersResponse.data;
          const suppliersList = Array.isArray(suppliersData)
            ? suppliersData
            : suppliersData.items || [];
          setSuppliers(suppliersList);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }
    if (!formData.stock || parseInt(formData.stock) < 0) {
      newErrors.stock = 'Valid stock quantity is required';
    }
    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        comparePrice: formData.compareAtPrice
          ? parseFloat(formData.compareAtPrice)
          : undefined,
        stock: parseInt(formData.stock),
        sku: formData.sku || undefined,
        categoryIds: formData.categoryId ? [formData.categoryId] : undefined,
        supplierId: formData.supplierId || undefined,
        active: formData.isActive,
        featured: formData.isFeatured,
        isPreorder: formData.isPreorder,
        preorderNote: formData.preorderNote || undefined,
        images: images.map((img) => ({
          url: img.url,
          publicId: img.publicId,
          isPrimary: img.isPrimary,
        })),
        specifications: specifications
          .filter((s) => s.value.trim() !== '')
          .map((s) => ({
            key: s.key,
            value: s.value,
            group: s.group,
          })),
        deliveryZones: deliveryZones
          .filter((z) => z.zoneName.trim() !== '')
          .map((z) => ({
            zoneName: z.zoneName,
            zoneType: z.zoneType,
            region: z.region,
            minDays: z.minDays,
            maxDays: z.maxDays,
            deliveryFee: z.deliveryFee,
            available: z.available,
            notes: z.notes,
          })),
      };

      const response = await adminApi.updateProduct(productId, productData) as { success: boolean; error?: string };

      if (response.success) {
        router.push('/admin/products');
      } else {
        setErrors({ submit: response.error || 'Failed to update product' });
      }
    } catch (error) {
      setErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <AdminHeader title="Edit Product" />

      <div className="p-6">
        <Link
          href="/admin/products"
          className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Link>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.submit && (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {errors.submit}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Product Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Product name"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Product description"
                      rows={5}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Media</CardTitle>
                </CardHeader>
                <CardContent>
                  <ImageUpload
                    images={images}
                    onImagesChange={setImages}
                    maxImages={6}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="price">
                        Price (GHS) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        placeholder="0.00"
                      />
                      {errors.price && (
                        <p className="text-sm text-destructive">{errors.price}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="compareAtPrice">Compare at Price</Label>
                      <Input
                        id="compareAtPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.compareAtPrice}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            compareAtPrice: e.target.value,
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inventory</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="stock">
                        Stock <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="stock"
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={(e) =>
                          setFormData({ ...formData, stock: e.target.value })
                        }
                        placeholder="0"
                      />
                      {errors.stock && (
                        <p className="text-sm text-destructive">{errors.stock}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) =>
                          setFormData({ ...formData, sku: e.target.value })
                        }
                        placeholder="SKU-001"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductSpecifications
                    specifications={specifications}
                    onChange={setSpecifications}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Delivery Zones & Periods</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductDeliveryZones
                    deliveryZones={deliveryZones}
                    onChange={setDeliveryZones}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, categoryId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoryId && (
                      <p className="text-sm text-destructive">
                        {errors.categoryId}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    {originalSupplierId ? (
                      // Product has a supplier - show read-only
                      <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm">
                        {suppliers.find(s => s.id === originalSupplierId)?.businessName ||
                         suppliers.find(s => s.id === originalSupplierId)?.name ||
                         'Loading supplier...'}
                      </div>
                    ) : (
                      // No supplier - allow selection
                      <Select
                        value={formData.supplierId || 'NONE'}
                        onValueChange={(value) =>
                          setFormData({ ...formData, supplierId: value === 'NONE' ? '' : value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">No supplier (Platform owned)</SelectItem>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.businessName || supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {originalSupplierId
                        ? 'Supplier cannot be changed for supplier-owned products'
                        : 'Assign this product to a supplier for multi-vendor support'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isActive">Active</Label>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isFeatured">Featured</Label>
                    <Switch
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isFeatured: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isPreorder">Pre-order</Label>
                    <Switch
                      id="isPreorder"
                      checked={formData.isPreorder}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isPreorder: checked })
                      }
                    />
                  </div>

                  {formData.isPreorder && (
                    <div className="space-y-2">
                      <Label htmlFor="preorderNote">Pre-order Note</Label>
                      <Input
                        id="preorderNote"
                        value={formData.preorderNote}
                        onChange={(e) =>
                          setFormData({ ...formData, preorderNote: e.target.value })
                        }
                        placeholder="e.g., Ships in 2-3 weeks"
                      />
                      <p className="text-xs text-muted-foreground">
                        Shown to customers when they order this product
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href="/admin/products">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
