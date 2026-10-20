'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Star,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCustomerStore } from '@/stores/customer';

const addressSchema = z.object({
  label: z.string().optional(),
  name: z.string().min(2, 'Name is required'),
  phone: z
    .string()
    .min(9, 'Phone number must be at least 9 digits')
    .regex(/^[\d+\s-]+$/, 'Invalid phone number'),
  address: z.string().min(10, 'Please provide a detailed address'),
  city: z.string().min(2, 'City is required'),
  region: z.string().optional(),
  landmark: z.string().optional(),
  isDefault: z.boolean().default(false),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function AddressesPage() {
  const router = useRouter();
  const {
    customer,
    isAuthenticated,
    isLoading,
    addAddress,
    updateAddress,
    deleteAddress,
    loadAuth,
  } = useCustomerStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      isDefault: false,
    },
  });

  const isDefault = watch('isDefault');
  const addresses = customer?.addresses || [];

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?returnTo=/account/addresses');
    }
  }, [isAuthenticated, router]);

  const openAddDialog = () => {
    reset({
      label: '',
      name: customer?.name || '',
      phone: customer?.phone?.startsWith('google_') ? '' : customer?.phone || '',
      address: '',
      city: '',
      region: '',
      landmark: '',
      isDefault: addresses.length === 0,
    });
    setEditingAddressId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (addressId: string) => {
    const address = addresses.find((a) => a.id === addressId);
    if (address) {
      reset({
        label: address.label || '',
        name: address.name,
        phone: address.phone,
        address: address.address,
        city: address.city,
        region: address.region || '',
        landmark: address.landmark || '',
        isDefault: address.isDefault,
      });
      setEditingAddressId(addressId);
      setIsDialogOpen(true);
    }
  };

  const onSubmit = async (data: AddressFormData) => {
    setError(null);
    try {
      if (editingAddressId) {
        await updateAddress(editingAddressId, data);
      } else {
        await addAddress(data);
      }
      setIsDialogOpen(false);
      reset();
    } catch (err: any) {
      setError(err.message || 'Failed to save address');
    }
  };

  const handleDelete = async (addressId: string) => {
    if (confirm('Are you sure you want to delete this address?')) {
      try {
        await deleteAddress(addressId);
      } catch (err: any) {
        setError(err.message || 'Failed to delete address');
      }
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await updateAddress(addressId, { isDefault: true });
    } catch (err: any) {
      setError(err.message || 'Failed to set default address');
    }
  };

  if (!isAuthenticated || !customer) {
    return (
      <div className="container py-12">
        <div className="flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/account">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Account
        </Link>
      </Button>

      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-wider">MY ADDRESSES</h1>
            <p className="text-sm text-muted-foreground">
              Manage your delivery addresses
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Address
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingAddressId ? 'Edit Address' : 'Add New Address'}
                </DialogTitle>
                <DialogDescription>
                  {editingAddressId
                    ? 'Update your delivery address details'
                    : 'Add a new delivery address to your account'}
                </DialogDescription>
              </DialogHeader>

              {error && (
                <Alert className="border-destructive bg-destructive/10">
                  <AlertDescription className="text-destructive">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Address Label (Optional)</Label>
                  <Select
                    onValueChange={(value) => setValue('label', value)}
                    defaultValue=""
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a label" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Home">Home</SelectItem>
                      <SelectItem value="Work">Work</SelectItem>
                      <SelectItem value="Office">Office</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Recipient name"
                      {...register('name')}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      placeholder="+237 6XX XXX XXX"
                      {...register('phone')}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Street Address *</Label>
                  <Textarea
                    id="address"
                    placeholder="House number, street name, neighborhood"
                    rows={3}
                    {...register('address')}
                  />
                  {errors.address && (
                    <p className="text-sm text-destructive">{errors.address.message}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="City"
                      {...register('city')}
                    />
                    {errors.city && (
                      <p className="text-sm text-destructive">{errors.city.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <Input
                      id="region"
                      placeholder="Region/State"
                      {...register('region')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="landmark">Landmark (Optional)</Label>
                  <Input
                    id="landmark"
                    placeholder="Near mosque, opposite school, etc."
                    {...register('landmark')}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isDefault"
                    checked={isDefault}
                    onCheckedChange={(checked) =>
                      setValue('isDefault', checked as boolean)
                    }
                  />
                  <Label htmlFor="isDefault" className="cursor-pointer">
                    Set as default address
                  </Label>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingAddressId ? (
                      'Update Address'
                    ) : (
                      'Add Address'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {addresses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No addresses saved yet</p>
              <Button className="mt-4" onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Address
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <Card key={address.id}>
                <CardContent className="flex items-start justify-between gap-4 pt-6">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-semibold">{address.name}</span>
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
                    <p className="mt-1 text-sm">
                      {address.address}
                      {address.landmark && ` (${address.landmark})`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {address.city}
                      {address.region && `, ${address.region}`}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(address.id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {!address.isDefault && (
                        <DropdownMenuItem
                          onClick={() => handleSetDefault(address.id)}
                        >
                          <Star className="mr-2 h-4 w-4" />
                          Set as Default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(address.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
