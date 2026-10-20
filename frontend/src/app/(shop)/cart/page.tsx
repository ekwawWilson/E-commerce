'use client';

import Link from 'next/link';
import { ShoppingCart, Minus, Plus, Trash2, ArrowRight, ShieldCheck, Truck, CreditCard, Tag, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ProductImage } from '@/components/ui/product-image';
import { useCartStore } from '@/stores/cart';
import { formatPrice, cn } from '@/lib/utils';
import { useStoreSettings } from '@/components/providers/store-settings-provider';

export default function CartPage() {
  const {
    items,
    subtotal,
    itemCount,
    isLoading,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCartStore();

  // Delivery pricing comes from admin store settings; these were hardcoded
  // XAF magnitudes (1000 fee / 50000 threshold) that disagreed with what the
  // backend actually charged.
  const { deliveryFee: settingsFee, freeDeliveryThreshold } = useStoreSettings();
  const deliveryFee =
    freeDeliveryThreshold !== undefined && subtotal >= freeDeliveryThreshold
      ? 0
      : settingsFee ?? 0;
  const total = subtotal + deliveryFee;
  const savingsToFreeDelivery = (freeDeliveryThreshold ?? 0) - subtotal;

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <div className="container py-12">
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Your cart is empty</h1>
              <p className="text-muted-foreground text-lg max-w-md">
                Looks like you haven&apos;t added anything to your cart yet. Start shopping to fill it up!
              </p>
            </div>
            <Button asChild size="lg" className="rounded-full px-8 shadow-lg shadow-primary/25">
              <Link href="/">
                Start Shopping
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">Shopping Cart</span>
        </nav>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Shopping Cart</h1>
            <p className="text-muted-foreground mt-1">{itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cart
          </Button>
        </div>

        {/* Free Delivery Progress */}
        {savingsToFreeDelivery > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <Truck className="h-5 w-5 text-primary" />
              <span className="font-medium">
                Add {formatPrice(savingsToFreeDelivery)} more for FREE delivery!
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((subtotal / (freeDeliveryThreshold || 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const imageUrl = item.product?.images?.find((img) => img.isPrimary)?.url
                || item.product?.images?.[0]?.url
                || '/placeholder-product.png';

              return (
                <Card key={item.id} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex gap-4 p-4 md:p-6">
                    <Link
                      href={`/products/${item.product?.slug || '#'}`}
                      className="relative h-28 w-28 md:h-32 md:w-32 flex-shrink-0 overflow-hidden rounded-xl bg-muted group"
                    >
                      <ProductImage
                        src={imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between gap-2">
                        <div>
                          <Link
                            href={`/products/${item.product?.slug || '#'}`}
                            className="font-semibold text-lg hover:text-primary transition-colors line-clamp-2"
                          >
                            {item.name}
                          </Link>
                          {item.product?.supplier && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Sold by: {item.product.supplier.businessName}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          onClick={() => removeItem(item.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-1 bg-muted rounded-full p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            disabled={isLoading}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-10 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            disabled={isLoading}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {formatPrice(item.price)} each
                          </p>
                          <p className="text-xl font-bold text-primary">
                            {formatPrice(item.total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24 border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>
                    {deliveryFee === 0 ? (
                      <Badge className="bg-green-100 text-green-700 border-0">FREE</Badge>
                    ) : (
                      formatPrice(deliveryFee)
                    )}
                  </span>
                </div>
                {deliveryFee > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Spend more to qualify for free delivery
                  </p>
                )}
                <Separator />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-3 bg-muted/30 pt-6">
                <Button className="w-full h-12 text-lg rounded-xl shadow-lg shadow-primary/25" size="lg" asChild>
                  <Link href="/checkout">
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" className="w-full rounded-xl" asChild>
                  <Link href="/">Continue Shopping</Link>
                </Button>

                {/* Trust Badges */}
                <div className="w-full pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    <span>Secure checkout</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span>Multiple payment options</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="h-4 w-4 text-primary" />
                    <span>Fast & reliable delivery</span>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
