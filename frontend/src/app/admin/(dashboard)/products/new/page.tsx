'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function NewProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [specifications, setSpecifications] = useState<ProductSpecification[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
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
        const [categoriesResponse, suppliersResponse] = await Promise.all([
          adminApi.getCategories(),
          adminApi.getSuppliers({ status: 'ACTIVE', limit: 100 }),
        ]);
        if (categoriesResponse.success && categoriesResponse.data) {
          setCategories(categoriesResponse.data);
        }
        if (suppliersResponse.success) {
          const items = suppliersResponse.data.items || suppliersResponse.data || [];
          setSuppliers(Array.isArray(items) ? items : []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);

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

    setIsLoading(true);
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

      const response = await adminApi.createProduct(productData);

      if (response.success) {
        router.push('/admin/products');
      } else {
        setErrors({ submit: response.error || 'Failed to create product' });
      }
    } catch (error) {
      setErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <AdminHeader title="Add Product" />

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
                    <p className="text-xs text-muted-foreground">
                      Assign this product to a supplier for multi-vendor support
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Product'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
