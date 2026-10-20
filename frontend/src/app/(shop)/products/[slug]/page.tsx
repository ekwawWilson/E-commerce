'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  Check,
  Clock,
  Truck,
  Heart,
  Share2,
  ShieldCheck,
  RotateCcw,
  Package,
  CreditCard,
  Headphones,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductImage } from '@/components/ui/product-image';
import { formatPrice, cn } from '@/lib/utils';
import { getHighlightSpecs, groupSpecifications, getStockState } from '@/lib/product-specs';
import { useCartStore } from '@/stores/cart';
import { useWishlistStore } from '@/stores/wishlist';
import { getCustomerToken } from '@/stores/customer';

interface ProductPageProps {
  params: { slug: string };
}

const PLACEHOLDER_IMAGE = {
  url: '/placeholder-product.png',
  isPrimary: true,
  id: '0',
  publicId: '',
  sortOrder: 0,
};

export default function ProductPage({ params }: ProductPageProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  const { data, isLoading, error } = useQuery({
    queryKey: ['product', params.slug],
    queryFn: async () => {
      const response = await api.getProduct(params.slug);
      return response as { success: boolean; data: Product };
    },
  });

  const product: Product | null = data?.data || null;

  const router = useRouter();
  const isWishlisted = useWishlistStore((state) => (product ? state.productIds.has(product.id) : false));
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const ensureWishlistLoaded = useWishlistStore((state) => state.ensureLoaded);

  useEffect(() => {
    ensureWishlistLoaded();
  }, [ensureWishlistLoaded]);

  const handleWishlist = async () => {
    if (!product) return;
    if (!getCustomerToken()) {
      router.push(`/login?returnTo=${encodeURIComponent(`/products/${params.slug}`)}`);
      return;
    }
    try {
      await toggleWishlist(product.id);
    } catch (err) {
      console.error('Failed to update wishlist:', err);
    }
  };

  const handleAddToCart = async () => {
    if (!product || isAdding) return;

    setIsAdding(true);
    try {
      await addItem(product.id, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) return <ProductPageSkeleton />;

  if (error || !product) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="tech-heading text-2xl">Product not found</h1>
          <p className="max-w-md text-muted-foreground">
            The product you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Button asChild className="mt-2">
            <Link href="/">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to shop
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const images = product.images.length > 0 ? product.images : [PLACEHOLDER_IMAGE];
  const stockState = getStockState(product);
  const isOutOfStock = stockState === 'out';
  const highlights = getHighlightSpecs(product, 4);
  const specGroups = groupSpecifications(product.specifications || []);

  const hasDiscount =
    product.comparePrice && Number(product.comparePrice) > Number(product.price);
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.comparePrice!)) * 100)
    : 0;
  const savings = hasDiscount
    ? Number(product.comparePrice!) - Number(product.price)
    : 0;

  const maxQty = Math.max(1, product.stock || 1);
  const brand = product.categories?.[0]?.category?.name;

  const nextImage = () => setSelectedImage((p) => (p + 1) % images.length);
  const prevImage = () => setSelectedImage((p) => (p - 1 + images.length) % images.length);

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-secondary/30">
        <div className="container flex items-center gap-1.5 py-3 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          {brand && (
            <>
              <Link
                href={`/products?category=${product.categories[0]?.category?.slug ?? ''}`}
                className="hover:text-foreground"
              >
                {brand}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          )}
          <span className="truncate font-medium text-foreground">{product.name}</span>
        </div>
      </div>

      <div className="container py-6 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
          {/* ---------- Left: gallery + details ---------- */}
          <div className="min-w-0">
            <div
              className={cn(
                'grid gap-4',
                images.length > 1 && 'md:grid-cols-[80px_minmax(0,1fr)]'
              )}
            >
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="order-2 flex gap-2 overflow-x-auto md:order-1 md:flex-col md:overflow-visible">
                  {images.map((img, i) => (
                    <button
                      key={img.id || i}
                      onClick={() => setSelectedImage(i)}
                      className={cn(
                        'relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-colors dark:bg-card',
                        i === selectedImage
                          ? 'border-primary'
                          : 'border-border hover:border-muted-foreground/40'
                      )}
                    >
                      <ProductImage
                        src={img.url}
                        alt={`${product.name} view ${i + 1}`}
                        fill
                        className="object-contain p-1.5"
                        sizes="80px"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Main image */}
              <div className="relative order-1 md:order-2">
                <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-white dark:bg-card">
                  <ProductImage
                    src={images[selectedImage]?.url}
                    alt={product.name}
                    fill
                    priority
                    className="object-contain p-6"
                    sizes="(max-width: 1024px) 92vw, 600px"
                  />

                  {hasDiscount && (
                    <span className="absolute left-4 top-4 rounded-lg bg-deal px-2.5 py-1.5 text-sm font-bold text-deal-foreground shadow-sm">
                      -{discountPercent}%
                    </span>
                  )}

                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        aria-label="Previous image"
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 shadow-sm hover:bg-background"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={nextImage}
                        aria-label="Next image"
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 shadow-sm hover:bg-background"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <section className="mt-10">
                <h2 className="tech-heading text-xl text-foreground">Overview</h2>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              </section>
            )}

            {/* Full specifications — the heart of an electronics PDP */}
            {specGroups.length > 0 && (
              <section className="mt-10">
                <h2 className="tech-heading text-xl text-foreground">
                  Technical specifications
                </h2>
                <div className="mt-4 space-y-6">
                  {specGroups.map(({ group, items }) => (
                    <div key={group}>
                      <p className="tech-eyebrow mb-2 text-primary">{group}</p>
                      <dl className="overflow-hidden rounded-xl border border-border">
                        {items.map((spec, i) => (
                          <div
                            key={spec.id}
                            className={cn(
                              'grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-4 px-4 py-2.5 text-sm sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)]',
                              i % 2 === 0 ? 'bg-card' : 'bg-secondary/40'
                            )}
                          >
                            <dt className="text-muted-foreground">{spec.key}</dt>
                            <dd className="font-medium text-foreground">{spec.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Delivery zones */}
            {product.deliveryZones && product.deliveryZones.length > 0 && (
              <section className="mt-10">
                <h2 className="tech-heading text-xl text-foreground">Delivery estimates</h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {product.deliveryZones
                    .filter((z) => z.available)
                    .map((zone) => (
                      <div
                        key={zone.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <Truck className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-card-foreground">
                            {zone.zoneName}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {zone.minDays}–{zone.maxDays} days
                        </span>
                      </div>
                    ))}
                </div>
              </section>
            )}
          </div>

          {/* ---------- Right: sticky buy box ---------- */}
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="rounded-xl border border-border bg-card p-5">
              {brand && <p className="tech-eyebrow text-primary">{brand}</p>}

              <h1 className="tech-heading mt-1 text-2xl leading-tight text-card-foreground">
                {product.name}
              </h1>

              {product.sku && (
                <p className="mt-1.5 text-xs text-muted-foreground">SKU: {product.sku}</p>
              )}

              {/* Price */}
              <div className="mt-4">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="tabular-price text-3xl font-bold text-card-foreground">
                    {formatPrice(product.price)}
                  </span>
                  {hasDiscount && (
                    <span className="tabular-price text-lg text-muted-foreground line-through">
                      {formatPrice(product.comparePrice!)}
                    </span>
                  )}
                </div>
                {hasDiscount && savings > 0 && (
                  <p className="tabular-price mt-1 text-sm font-semibold text-deal">
                    You save {formatPrice(savings)} ({discountPercent}%)
                  </p>
                )}
              </div>

              {/* Availability */}
              <div className="mt-4">
                {stockState === 'out' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-muted-foreground">
                    Out of stock
                  </span>
                ) : stockState === 'preorder' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-warning/15 px-3 py-1.5 text-sm font-medium text-warning">
                    <Clock className="h-4 w-4" />
                    {product.preorderNote || 'Available for pre-order'}
                  </span>
                ) : stockState === 'low' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-deal/10 px-3 py-1.5 text-sm font-medium text-deal">
                    Only {product.stock} left in stock
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 text-sm font-medium text-success">
                    <Check className="h-4 w-4" />
                    In stock — ready to ship
                  </span>
                )}
              </div>

              {/* Key specs at a glance */}
              {highlights.length > 0 && (
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {highlights.map((s) => (
                    <div key={s.label} className="rounded-lg bg-secondary/60 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">{s.label}</p>
                      <p className="truncate text-sm font-semibold text-card-foreground">
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <Separator className="my-5" />

              {/* Quantity */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-card-foreground">Quantity</span>
                <div className="flex items-center rounded-lg border border-border">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="p-2.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="tabular-price w-10 text-center text-sm font-semibold">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    disabled={quantity >= maxQty}
                    aria-label="Increase quantity"
                    className="p-2.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 space-y-2.5">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isAdding}
                >
                  {added ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Added to cart
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {isOutOfStock
                        ? 'Out of stock'
                        : stockState === 'preorder'
                          ? 'Pre-order now'
                          : isAdding
                            ? 'Adding…'
                            : 'Add to cart'}
                    </>
                  )}
                </Button>

                <div className="flex gap-2.5">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleWishlist}
                  >
                    <Heart
                      className={cn('mr-2 h-4 w-4', isWishlisted && 'fill-deal text-deal')}
                    />
                    {isWishlisted ? 'Saved' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Share product"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.share) {
                        navigator.share({ title: product.name, url: window.location.href });
                      }
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator className="my-5" />

              {/* Purchase reassurance */}
              <ul className="space-y-3">
                {[
                  { icon: ShieldCheck, text: 'Genuine product with warranty' },
                  { icon: Truck, text: 'Fast nationwide delivery' },
                  { icon: RotateCcw, text: '7-day return policy' },
                  { icon: CreditCard, text: 'Mobile money & cash on delivery' },
                  { icon: Headphones, text: 'Expert support before and after' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2.5 text-sm">
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky mobile buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        <div className="container flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="tabular-price text-lg font-bold leading-tight text-foreground">
              {formatPrice(product.price)}
            </p>
            {hasDiscount && (
              <p className="tabular-price text-xs text-muted-foreground line-through">
                {formatPrice(product.comparePrice!)}
              </p>
            )}
          </div>
          <Button
            size="lg"
            className="flex-1"
            onClick={handleAddToCart}
            disabled={isOutOfStock || isAdding}
          >
            {added ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Added
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {isOutOfStock ? 'Unavailable' : 'Add to cart'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProductPageSkeleton() {
  return (
    <div className="container py-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
        <div className="min-w-0">
          {/* Wrapper keeps the square ratio from stretching to fill the column */}
          <div className="relative aspect-square w-full overflow-hidden rounded-xl">
            <Skeleton className="absolute inset-0 h-full w-full" />
          </div>
          <Skeleton className="mt-8 h-6 w-40" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
