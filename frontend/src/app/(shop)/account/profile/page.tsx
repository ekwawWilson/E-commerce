'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCustomerStore } from '@/stores/customer';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .min(9, 'Phone number must be at least 9 digits')
    .regex(/^[\d+\s-]+$/, 'Invalid phone number'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const {
    customer,
    isAuthenticated,
    isLoading,
    needsPhoneUpdate,
    updateProfile,
    loadAuth,
  } = useCustomerStore();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?returnTo=/account/profile');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (customer) {
      const phone = customer.phone?.startsWith('google_') ? '' : customer.phone || '';
      reset({
        name: customer.name || '',
        email: customer.email || '',
        phone,
      });
    }
  }, [customer, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    setError(null);
    setSuccess(false);
    try {
      await updateProfile(data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
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

      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-light tracking-wider">
              PERSONAL INFORMATION
            </CardTitle>
            <CardDescription>
              Update your personal details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {needsPhoneUpdate && (
              <Alert className="mb-6">
                <AlertDescription>
                  Please add your phone number to receive order updates and delivery notifications.
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6 border-green-500 bg-green-50">
                <AlertDescription className="text-green-700">
                  Profile updated successfully!
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="mb-6 border-destructive bg-destructive/10">
                <AlertDescription className="text-destructive">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number {needsPhoneUpdate && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="phone"
                  placeholder="+237 6XX XXX XXX"
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Used for delivery updates and order notifications
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isLoading || !isDirty}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/account')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
