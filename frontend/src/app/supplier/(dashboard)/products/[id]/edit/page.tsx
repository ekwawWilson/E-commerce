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
import { ImageUpload, UploadedImage } from '@/components/admin/image-upload';
import { supplierImageUploader } from '@/lib/api/supplier';
import { ProductSpecifications, ProductSpecification } from '@/components/admin/product-specifications';
import { ProductDeliveryZones, DeliveryZone } from '@/components/admin/product-delivery-zones';
import { supplierApi } from '@/lib/api/supplier';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  stock: number;
  sku: string | null;
  active: boolean;
  featured: boolean;
  isPreorder: boolean;
  preorderNote: string | null;
  images: { url: string; publicId: string; isPrimary: boolean }[];
  categories: { categoryId: string; category: { id: string; name: string } }[];
  specifications: { key: string; value: string; group: string | null }[];
  deliveryZones: {
    zoneName: string;
    zoneType: string;
    region: string | null;
    minDays: number;
    maxDays: number;
    deliveryFee: number | null;
    available: boolean;
    notes: string | null;
  }[];
}

export default function SupplierEditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
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
    isActive: true,
    isPreorder: false,
    preorderNote: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productResponse, categoriesResponse] = await Promise.all([
          supplierApi.getProduct(productId),
          supplierApi.getCategories(),
        ]);

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
            isActive: product.active,
            isPreorder: product.isPreorder || false,
            preorderNote: product.preorderNote || '',
          });

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
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setErrors({ submit: 'Failed to load product data' });
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
        active: formData.isActive,
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

      const response = await supplierApi.updateProduct(productId, productData) as { success: boolean; error?: string };

      if (response.success) {
        router.push('/supplier/products');
      } else {
        setErrors({ submit: response.error || 'Failed to update product' });
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'An error occurred. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link
        href="/supplier/products"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Products
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Product</h1>
        <p className="text-muted-foreground">Update your product information</p>
      </div>

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
                  uploader={supplierImageUploader}
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
                      step="1"
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder="0"
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
                      step="1"
                      min="0"
                      value={formData.compareAtPrice}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          compareAtPrice: e.target.value,
                        })
                      }
                      placeholder="0"
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
          <Link href="/supplier/products">
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
  );
}
