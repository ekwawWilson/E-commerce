'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, Clock, Heart, Star, Check } from 'lucide-react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { ProductImage } from '@/components/ui/product-image';
import { formatPrice, getImageUrl, cn } from '@/lib/utils';
import { getHighlightSpecs, getStockState } from '@/lib/product-specs';
import { useCartStore } from '@/stores/cart';
import { useWishlistStore } from '@/stores/wishlist';
import { getCustomerToken } from '@/stores/customer';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'horizontal';
}

/** Star rating row. Falls back to nothing when a product has no reviews yet. */
function RatingRow({
  rating,
  count,
  className,
}: {
  rating?: number | null;
  count?: number | null;
  className?: string;
}) {
  if (!rating || !count) return null;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'h-3 w-3',
              star <= Math.round(rating)
                ? 'fill-rating text-rating'
                : 'text-muted-foreground/30'
            )}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground tabular-price">({count})</span>
    </div>
  );
}

export function ProductCard({ product, variant = 'default' }: ProductCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isWishlisted = useWishlistStore((state) => state.productIds.has(product.id));
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const ensureWishlistLoaded = useWishlistStore((state) => state.ensureLoaded);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    ensureWishlistLoaded();
  }, [ensureWishlistLoaded]);

  const imageUrl = getImageUrl(product);
  const stockState = getStockState(product);
  const isOutOfStock = stockState === 'out';
  const specs = getHighlightSpecs(product, 3);

  const hasDiscount =
    product.comparePrice && Number(product.comparePrice) > Number(product.price);
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.comparePrice!)) * 100)
    : 0;
  const savings = hasDiscount
    ? Number(product.comparePrice!) - Number(product.price)
    : 0;

  const brand = product.categories?.[0]?.category?.name;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || isLoading) return;

    setIsLoading(true);
    try {
      await addItem(product.id, 1);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!getCustomerToken()) {
      router.push(`/login?returnTo=${encodeURIComponent(pathname || '/')}`);
      return;
    }
    try {
      await toggleWishlist(product.id);
    } catch (error) {
      console.error('Failed to update wishlist:', error);
    }
  };

  // ---- Horizontal (search results / list view) ----
  if (variant === 'horizontal') {
    return (
      <Link href={`/products/${product.slug}`} className="block">
        <div className="product-card group flex gap-4 rounded-xl border border-border bg-card p-3">
          <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-secondary sm:h-32 sm:w-32">
            <ProductImage
              src={imageUrl}
              alt={product.name}
              fill
              className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
              sizes="128px"
            />
            {hasDiscount && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-deal px-1.5 py-0.5 text-[10px] font-bold text-deal-foreground">
                -{discountPercent}%
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            {brand && <p className="tech-eyebrow text-muted-foreground">{brand}</p>}
            <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-card-foreground group-hover:text-primary">
              {product.name}
            </h3>

            {specs.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {specs.map((s) => (
                  <span key={s.label} className="spec-chip">
                    {s.value}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto flex items-end justify-between gap-2 pt-2">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="tabular-price text-base font-bold text-card-foreground">
                    {formatPrice(product.price)}
                  </span>
                  {hasDiscount && (
                    <span className="tabular-price text-xs text-muted-foreground line-through">
                      {formatPrice(product.comparePrice!)}
                    </span>
                  )}
                </div>
                <StockLine state={stockState} stock={product.stock} />
              </div>

              <Button
                size="sm"
                className="h-9 flex-shrink-0"
                onClick={handleAddToCart}
                disabled={isOutOfStock || isLoading}
              >
                <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                {isOutOfStock ? 'Notify me' : isLoading ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ---- Default (grid) ----
  return (
    <Link href={`/products/${product.slug}`} className="block h-full">
      <div className="product-card group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
        {/* Image — square, contained, white backdrop: the standard for device shots */}
        <div className="relative aspect-square overflow-hidden bg-white dark:bg-secondary/40">
          <ProductImage
            src={imageUrl}
            alt={product.name}
            fill
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* Badges */}
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {hasDiscount && (
              <span className="rounded-md bg-deal px-2 py-1 text-[11px] font-bold leading-none text-deal-foreground shadow-sm">
                -{discountPercent}%
              </span>
            )}
            {product.featured && !hasDiscount && (
              <span className="rounded-md bg-primary px-2 py-1 text-[11px] font-bold leading-none text-primary-foreground shadow-sm">
                Featured
              </span>
            )}
            {stockState === 'preorder' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-warning px-2 py-1 text-[11px] font-bold leading-none text-warning-foreground shadow-sm">
                <Clock className="h-3 w-3" />
                Pre-order
              </span>
            )}
          </div>

          <button
            type="button"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Save for later'}
            onClick={handleWishlist}
            className={cn(
              'absolute right-2.5 top-2.5 rounded-full p-2 shadow-sm transition-colors',
              isWishlisted
                ? 'bg-deal text-deal-foreground'
                : 'bg-background/90 text-muted-foreground hover:text-deal'
            )}
          >
            <Heart className={cn('h-4 w-4', isWishlisted && 'fill-current')} />
          </button>

          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
              <span className="rounded-md bg-foreground/85 px-3 py-1.5 text-xs font-semibold text-background">
                Out of stock
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-2 p-3.5">
          {brand && <p className="tech-eyebrow text-muted-foreground">{brand}</p>}

          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground transition-colors group-hover:text-primary">
            {product.name}
          </h3>

          <RatingRow rating={undefined} count={undefined} />

          {/* Spec chips — the electronics equivalent of size/colour swatches */}
          {specs.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {specs.map((s) => (
                <span key={s.label} className="spec-chip">
                  {s.value}
                </span>
              ))}
            </div>
          )}

          {/* Price block pinned to the bottom so cards align in a grid */}
          <div className="mt-auto pt-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="tabular-price text-lg font-bold leading-tight text-card-foreground">
                {formatPrice(product.price)}
              </span>
              {hasDiscount && (
                <span className="tabular-price text-sm text-muted-foreground line-through">
                  {formatPrice(product.comparePrice!)}
                </span>
              )}
            </div>

            {hasDiscount && savings > 0 && (
              <p className="tabular-price mt-0.5 text-xs font-medium text-deal">
                Save {formatPrice(savings)}
              </p>
            )}

            <StockLine state={stockState} stock={product.stock} className="mt-1.5" />

            <Button
              className="mt-3 w-full"
              onClick={handleAddToCart}
              disabled={isOutOfStock || isLoading}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {isOutOfStock
                ? 'Out of stock'
                : stockState === 'preorder'
                  ? 'Pre-order'
                  : isLoading
                    ? 'Adding…'
                    : 'Add to cart'}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Inline availability line — colour-coded so urgency reads at a glance. */
function StockLine({
  state,
  stock,
  className,
}: {
  state: ReturnType<typeof getStockState>;
  stock: number;
  className?: string;
}) {
  if (state === 'out') return null;

  if (state === 'preorder') {
    return (
      <p className={cn('flex items-center gap-1 text-xs font-medium text-warning', className)}>
        <Clock className="h-3 w-3" />
        Ships when available
      </p>
    );
  }

  if (state === 'low') {
    return (
      <p className={cn('text-xs font-medium text-deal', className)}>
        Only {stock} left
      </p>
    );
  }

  return (
    <p className={cn('flex items-center gap-1 text-xs font-medium text-success', className)}>
      <Check className="h-3 w-3" />
      In stock
    </p>
  );
}
