'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  MapPin,
  Package,
  CreditCard,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCustomerStore } from '@/stores/customer';

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  href: string;
  badge?: string;
}

function MenuItem({ icon, title, description, href, badge }: MenuItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {badge && (
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
          {badge}
        </span>
      )}
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </Link>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const {
    customer,
    isAuthenticated,
    isLoading,
    needsPhoneUpdate,
    logout,
    loadAuth,
  } = useCustomerStore();

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  // Wait for loadAuth() to settle before redirecting: the store is persisted,
  // so isAuthenticated is briefly false on a fresh page load and redirecting
  // on that initial value bounces signed-in customers back to /login.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?returnTo=/account');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
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

  const initials = customer.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-light tracking-wider">MY ACCOUNT</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={customer.profileImage} alt={customer.name} />
                  <AvatarFallback className="bg-black text-white text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <h2 className="mt-4 text-xl font-semibold">{customer.name}</h2>
                <p className="text-sm text-muted-foreground">{customer.email}</p>
                {customer.phone && !customer.phone.startsWith('google_') && (
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                )}
                <Link href="/account/profile">
                  <Button variant="outline" size="sm" className="mt-4">
                    Edit Profile
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-semibold">
                    {customer.addresses?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Addresses</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">0</p>
                  <p className="text-sm text-muted-foreground">Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Menu Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Phone Update Alert */}
          {needsPhoneUpdate && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">Complete your profile:</span>{' '}
                Please add your phone number to receive order updates.{' '}
                <Link href="/account/profile" className="underline">
                  Update now
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {/* Your Account Section */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your Account
            </h3>
            <div className="space-y-3">
              <MenuItem
                icon={<User className="h-5 w-5" />}
                title="Personal Information"
                description="Update your name, email, and phone"
                href="/account/profile"
              />
              <MenuItem
                icon={<MapPin className="h-5 w-5" />}
                title="Delivery Addresses"
                description={`${customer.addresses?.length || 0} saved addresses`}
                href="/account/addresses"
              />
              <MenuItem
                icon={<Package className="h-5 w-5" />}
                title="Your Orders"
                description="Track, return, or buy again"
                href="/account/orders"
              />
              <MenuItem
                icon={<CreditCard className="h-5 w-5" />}
                title="Payment Methods"
                description="Manage your payment options"
                href="/account/payments"
              />
            </div>
          </div>

          <Separator />

          {/* Settings Section */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Settings
            </h3>
            <div className="space-y-3">
              <MenuItem
                icon={<Bell className="h-5 w-5" />}
                title="Notifications"
                description="Manage notification preferences"
                href="/account/notifications"
              />
              <MenuItem
                icon={<Shield className="h-5 w-5" />}
                title="Security"
                description="Password and login settings"
                href="/account/security"
              />
            </div>
          </div>

          <Separator />

          {/* Sign Out */}
          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
