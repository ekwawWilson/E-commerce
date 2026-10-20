'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft,
  CreditCard,
  Banknote,
  Loader2,
  User,
  Check,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ProductImage } from '@/components/ui/product-image';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/stores/cart';
import { useCustomerStore } from '@/stores/customer';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { PaymentMethod } from '@/types';
import { useStoreSettings } from '@/components/providers/store-settings-provider';

const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters'),
  customerPhone: z
    .string()
    .min(9, 'Phone number must be at least 9 digits')
    .regex(/^[\d+\s-]+$/, 'Invalid phone number'),
  customerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  deliveryAddress: z.string().min(10, 'Please provide a detailed address'),
  // The API requires city separately; it used to be crammed into the free-text
  // address, so checkout failed validation every time. Optional at the schema
  // level because the saved-address path supplies it from the stored record —
  // the manual form marks it required in the UI.
  city: z.string().optional(),
  region: z.string().optional(),
  deliveryNotes: z.string().optional(),
  paymentMethod: z.enum(['MOMO', 'COD']),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface CustomerAddress {
  id: string;
  label?: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  region?: string;
  landmark?: string;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, itemCount } = useCartStore();
  const { customer, isAuthenticated, loadAuth } = useCustomerStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);

  const savedAddresses: CustomerAddress[] = customer?.addresses || [];
  const defaultAddress = savedAddresses.find((a) => a.isDefault);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: 'MOMO',
    },
  });

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  // Set default address when customer loads
  useEffect(() => {
    if (isAuthenticated && customer) {
      // Pre-fill customer info
      if (customer.phone && !customer.phone.startsWith('google_')) {
        setValue('customerPhone', customer.phone);
      }
      if (customer.email) {
        setValue('customerEmail', customer.email);
      }
      if (customer.name) {
        setValue('customerName', customer.name);
      }

      // Set default address
      if (savedAddresses.length > 0 && !useNewAddress) {
        const defaultAddr = defaultAddress || savedAddresses[0];
        setSelectedAddressId(defaultAddr.id);
      }

      // Set preferred payment method
      if (customer.preferredPaymentMethod) {
        setValue('paymentMethod', customer.preferredPaymentMethod);
      }
    }
  }, [isAuthenticated, customer, setValue, defaultAddress, savedAddresses, useNewAddress]);

  const paymentMethod = watch('paymentMethod');
  // Delivery pricing comes from admin store settings; these were hardcoded
  // XAF magnitudes (1000 fee / 50000 threshold) that disagreed with what the
  // backend actually charged.
  const { deliveryFee: settingsFee, freeDeliveryThreshold } = useStoreSettings();
  const deliveryFee =
    freeDeliveryThreshold !== undefined && subtotal >= freeDeliveryThreshold
      ? 0
      : settingsFee ?? 0;
  const total = subtotal + deliveryFee;

  const getSelectedAddress = (): CustomerAddress | undefined => {
    if (!selectedAddressId) return undefined;
    return savedAddresses.find((a) => a.id === selectedAddressId);
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (items.length === 0) {
      setError('Your cart is empty');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const selectedAddress = getSelectedAddress();
      const usingSavedAddress =
        isAuthenticated && selectedAddressId && !useNewAddress && selectedAddress;

      if (!usingSavedAddress && !(data.city || '').trim()) {
        setError('City is required');
        setIsSubmitting(false);
        return;
      }

      const checkoutData = usingSavedAddress
        ? {
            customerName: selectedAddress.name,
            customerPhone: selectedAddress.phone,
            customerEmail: customer?.email || undefined,
            address: `${selectedAddress.address}${selectedAddress.landmark ? ` (${selectedAddress.landmark})` : ''}`,
            city: selectedAddress.city,
            region: selectedAddress.region || undefined,
            deliveryNotes: data.deliveryNotes || undefined,
            paymentMethod: data.paymentMethod as PaymentMethod,
          }
        : {
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            customerEmail: data.customerEmail || undefined,
            address: data.deliveryAddress,
            city: (data.city || '').trim(),
            region: data.region || undefined,
            deliveryNotes: data.deliveryNotes || undefined,
            paymentMethod: data.paymentMethod as PaymentMethod,
          };

      const response = await api.checkout(checkoutData);

      if (response.success && response.data?.order) {
        const order = response.data.order;

        // If MOMO payment, redirect to payment page
        if (data.paymentMethod === 'MOMO') {
          router.push(`/orders/${order.id}/payment`);
        } else {
          // COD - redirect to confirmation page
          router.push(`/orders/${order.orderNumber}/confirmation`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAddress = (addressId: string) => {
    setSelectedAddressId(addressId);
    setUseNewAddress(false);
  };

  const handleUseNewAddress = () => {
    setSelectedAddressId(null);
    setUseNewAddress(true);
  };

  if (items.length === 0) {
    return (
      <div className="container py-12">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="text-muted-foreground">
            Add some items to your cart before checking out.
          </p>
          <Button asChild>
            <Link href="/">Start Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/cart">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Cart
        </Link>
      </Button>

      <h1 className="mb-6 text-2xl font-bold">Checkout</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Checkout Form */}
          <div className="space-y-6 lg:col-span-2">
            {/* Login Prompt for Guests */}
            {!isAuthenticated && (
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  <Link href="/login?returnTo=/checkout" className="font-medium underline">
                    Sign in
                  </Link>{' '}
                  for faster checkout with saved addresses and order history.
                </AlertDescription>
              </Alert>
            )}

            {/* Saved Addresses for Authenticated Users */}
            {isAuthenticated && savedAddresses.length > 0 && !useNewAddress && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Delivery Address</CardTitle>
                  <Link
                    href="/account/addresses"
                    className="text-sm text-primary hover:underline"
                  >
                    Manage
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {savedAddresses.map((address) => (
                    <div
                      key={address.id}
                      className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors ${
                        selectedAddressId === address.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleSelectAddress(address.id)}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          selectedAddressId === address.id
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        }`}
                      >
                        {selectedAddressId === address.id && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-medium">{address.name}</span>
                          {address.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                          {address.label && (
                            <Badge variant="outline" className="text-xs">
                              {address.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{address.phone}</p>
                        <p className="text-sm">
                          {address.address}
                          {address.landmark && ` (${address.landmark})`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {address.city}
                          {address.region && `, ${address.region}`}
                        </p>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleUseNewAddress}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Use a different address
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Manual Address Entry - For Guests or New Address */}
            {(!isAuthenticated || useNewAddress || savedAddresses.length === 0) && (
              <>
                {/* Customer Info */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Customer Information</CardTitle>
                    {isAuthenticated && savedAddresses.length > 0 && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="text-primary"
                        onClick={() => {
                          setUseNewAddress(false);
                          const defaultAddr = defaultAddress || savedAddresses[0];
                          setSelectedAddressId(defaultAddr.id);
                        }}
                      >
                        Use saved address
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="customerName">Full Name *</Label>
                        <Input
                          id="customerName"
                          placeholder="John Doe"
                          {...register('customerName')}
                        />
                        {errors.customerName && (
                          <p className="text-sm text-destructive">
                            {errors.customerName.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerPhone">Phone Number *</Label>
                        <Input
                          id="customerPhone"
                          placeholder="+237 6XX XXX XXX"
                          {...register('customerPhone')}
                        />
                        {errors.customerPhone && (
                          <p className="text-sm text-destructive">
                            {errors.customerPhone.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerEmail">Email (Optional)</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        placeholder="john@example.com"
                        {...register('customerEmail')}
                      />
                      {errors.customerEmail && (
                        <p className="text-sm text-destructive">
                          {errors.customerEmail.message}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Delivery Address */}
                <Card>
                  <CardHeader>
                    <CardTitle>Delivery Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="deliveryAddress">Full Address *</Label>
                      <Textarea
                        id="deliveryAddress"
                        placeholder="House number, Street name, Neighborhood, City"
                        rows={3}
                        {...register('deliveryAddress')}
                      />
                      {errors.deliveryAddress && (
                        <p className="text-sm text-destructive">
                          {errors.deliveryAddress.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input id="city" placeholder="Accra" {...register('city')} />
                        {errors.city && (
                          <p className="text-sm text-destructive">{errors.city.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="region">Region</Label>
                        <Input id="region" placeholder="Greater Accra" {...register('region')} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Delivery Notes - Always show */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="deliveryNotes">Special Instructions (Optional)</Label>
                  <Textarea
                    id="deliveryNotes"
                    placeholder="Any special instructions for delivery"
                    rows={2}
                    {...register('deliveryNotes')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(value) =>
                    setValue('paymentMethod', value as 'MOMO' | 'COD')
                  }
                  className="space-y-3"
                >
                  <div
                    className={`flex cursor-pointer items-center space-x-4 rounded-lg border p-4 ${
                      paymentMethod === 'MOMO' ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setValue('paymentMethod', 'MOMO')}
                  >
                    <RadioGroupItem value="MOMO" id="momo" />
                    <div className="flex flex-1 items-center gap-3">
                      <div className="rounded-full bg-yellow-100 p-2">
                        <CreditCard className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <Label htmlFor="momo" className="cursor-pointer font-medium">
                          Mobile Money (MoMo)
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Pay instantly with MTN Mobile Money
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex cursor-pointer items-center space-x-4 rounded-lg border p-4 ${
                      paymentMethod === 'COD' ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setValue('paymentMethod', 'COD')}
                  >
                    <RadioGroupItem value="COD" id="cod" />
                    <div className="flex flex-1 items-center gap-3">
                      <div className="rounded-full bg-green-100 p-2">
                        <Banknote className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <Label htmlFor="cod" className="cursor-pointer font-medium">
                          Cash on Delivery
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Pay when you receive your order
                        </p>
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="max-h-48 space-y-3 overflow-y-auto">
                  {items.map((item) => {
                    const imageUrl = item.product?.images?.find((img) => img.isPrimary)?.url
                      || item.product?.images?.[0]?.url
                      || '/placeholder-product.png';

                    return (
                      <div key={item.id} className="flex gap-3">
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                          <ProductImage
                            src={imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="line-clamp-1 text-sm font-medium">
                            {item.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity}
                          </p>
                          <p className="text-sm font-semibold">
                            {formatPrice(item.total)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Subtotal ({itemCount} items)
                    </span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span>
                      {deliveryFee === 0 ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        formatPrice(deliveryFee)
                      )}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Place Order - ${formatPrice(total)}`
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
