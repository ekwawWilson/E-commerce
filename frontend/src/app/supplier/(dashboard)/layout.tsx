'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSupplierAuthStore } from '@/stores/supplier-auth';
import { getPermissions, getRoleLabel, getRoleBadgeColor, type SupplierRole } from '@/lib/supplier-permissions';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: keyof ReturnType<typeof getPermissions>;
}

const allNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/supplier', icon: LayoutDashboard, permission: 'canViewDashboard' },
  { name: 'Products', href: '/supplier/products', icon: Package, permission: 'canViewProducts' },
  { name: 'Orders', href: '/supplier/orders', icon: ShoppingCart, permission: 'canViewOrders' },
  { name: 'Payouts', href: '/supplier/payouts', icon: Wallet, permission: 'canViewPayouts' },
  { name: 'Settings', href: '/supplier/settings', icon: Settings, permission: 'canViewSettings' },
];

export default function SupplierDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, supplier, supplierAdmin, logout, checkAuth } = useSupplierAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get permissions based on role
  const permissions = useMemo(
    () => getPermissions(supplierAdmin?.role as SupplierRole | undefined),
    [supplierAdmin?.role]
  );

  // Filter navigation based on permissions
  const navigation = useMemo(
    () => allNavigation.filter((item) => !item.permission || permissions[item.permission]),
    [permissions]
  );

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsLoading(false);
    };
    init();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/supplier/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push('/supplier/login');
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Check if supplier is active
  if (supplier?.status !== 'ACTIVE') {
    return (
      <div className="flex min-h-screen items-center justify-center supplier-theme px-4">
        <div className="max-w-md text-center">
          <Store className="mx-auto h-16 w-16 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Account Pending Approval</h1>
          <p className="mt-2 text-muted-foreground">
            Your supplier account is currently {supplier?.status?.toLowerCase() || 'pending'}.
            Please wait for approval from the platform administrator.
          </p>
          <Button onClick={handleLogout} variant="outline" className="mt-6">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen supplier-theme">
      {/* Sidebar for desktop */}
      <aside className="hidden w-64 flex-shrink-0 border-r bg-background lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <Store className="h-6 w-6 text-primary" />
            <span className="font-semibold">Supplier Portal</span>
          </div>

          {/* Supplier Info */}
          <div className="border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium truncate">{supplier?.businessName || supplier?.name}</span>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/supplier' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Info in Sidebar Footer */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {supplierAdmin?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{supplierAdmin?.name}</p>
                <Badge className={`text-[10px] px-1.5 py-0 ${getRoleBadgeColor(supplierAdmin?.role as SupplierRole)}`}>
                  {getRoleLabel(supplierAdmin?.role as SupplierRole)}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 h-full w-64 bg-background flex flex-col">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2">
                <Store className="h-6 w-6 text-primary" />
                <span className="font-semibold">Supplier Portal</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Supplier Info - Mobile */}
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate">{supplier?.businessName || supplier?.name}</span>
              </div>
            </div>

            <nav className="flex-1 space-y-1 p-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/supplier' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User Info - Mobile */}
            <div className="border-t p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                  {supplierAdmin?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{supplierAdmin?.name}</p>
                  <Badge className={`text-[10px] px-1.5 py-0 ${getRoleBadgeColor(supplierAdmin?.role as SupplierRole)}`}>
                    {getRoleLabel(supplierAdmin?.role as SupplierRole)}
                  </Badge>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Supplier name in header for desktop */}
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{supplier?.businessName || supplier?.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                    {supplierAdmin?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium">{supplierAdmin?.name}</span>
                    <span className={`text-[10px] px-1.5 rounded ${getRoleBadgeColor(supplierAdmin?.role as SupplierRole)}`}>
                      {getRoleLabel(supplierAdmin?.role as SupplierRole)}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-medium text-primary-foreground">
                      {supplierAdmin?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{supplierAdmin?.name}</p>
                      <p className="text-xs text-muted-foreground">{supplierAdmin?.email}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className={getRoleBadgeColor(supplierAdmin?.role as SupplierRole)}>
                      {getRoleLabel(supplierAdmin?.role as SupplierRole)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">at {supplier?.businessName || supplier?.name}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                {permissions.canViewSettings && (
                  <DropdownMenuItem asChild>
                    <Link href="/supplier/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
