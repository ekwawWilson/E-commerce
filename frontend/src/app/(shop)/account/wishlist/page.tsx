'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Heart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductImage } from '@/components/ui/product-image';
import { useWishlistStore } from '@/stores/wishlist';
import { useRequireCustomer } from '@/hooks/use-require-customer';
import { formatPrice } from '@/lib/utils';

export default function WishlistPage() {
  const { isAuthenticated } = useRequireCustomer('/account/wishlist');
  const { items, loaded, load, toggle } = useWishlistStore();

  // Always refetch here so the list (not just the saved IDs) is current
  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  return (
    <div className="container max-w-3xl py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/account">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Account
        </Link>
      </Button>

      <h1 className="mb-6 text-2xl font-light tracking-wider">SAVED ITEMS</h1>

      {!loaded && (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}

      {loaded && items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              Tap the heart on any product to save it here.
            </p>
            <Button asChild className="mt-4">
              <Link href="/products">Browse products</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {items.map((entry) => (
          <Card key={entry.productId}>
            <CardContent className="flex items-center gap-4 p-4">
              <Link
                href={`/products/${entry.product.slug}`}
                className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-secondary"
              >
                <ProductImage
                  src={entry.product.images[0]?.url || '/images/product-placeholder.svg'}
                  alt={entry.product.name}
                  fill
                  className="object-contain p-1"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/products/${entry.product.slug}`} className="line-clamp-2 font-medium hover:underline">
                  {entry.product.name}
                </Link>
                <p className="mt-1 font-semibold">{formatPrice(entry.product.price)}</p>
                {entry.product.stock <= 0 && (
                  <p className="text-sm text-muted-foreground">Out of stock</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove from saved items"
                onClick={async () => {
                  await toggle(entry.productId);
                  load();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
