'use client';

import Link from 'next/link';
import {
  Search,
  Menu,
  Phone,
  Truck,
  ShieldCheck,
  ChevronDown,
  User,
  MapPin,
  Heart,
  LogOut,
  Package,
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  Tablet,
  RotateCcw,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CartSheet } from './cart-sheet';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCustomerStore } from '@/stores/customer';
import { STORE_NAME, STORE_PHONE } from '@/lib/store-config';

/** Device categories — the primary navigation axis for an electronics store. */
const DEVICE_CATEGORIES = [
  { label: 'Phones', href: '/products?category=phones', icon: Smartphone },
  { label: 'Laptops', href: '/products?category=laptops', icon: Laptop },
  { label: 'Tablets', href: '/products?category=tablets', icon: Tablet },
  { label: 'Audio', href: '/products?category=audio', icon: Headphones },
  { label: 'Wearables', href: '/products?category=wearables', icon: Watch },
];

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { customer, isAuthenticated, logout, loadAuth } = useCustomerStore();

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  const initials =
    customer?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      {/* Trust bar — warranty and delivery reassurance sits above everything */}
      <div className="bg-foreground text-background">
        <div className="container flex h-9 items-center justify-center gap-6 text-xs">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="font-medium">Genuine products, warranty included</span>
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <Truck className="h-3.5 w-3.5" />
            <span className="font-medium">Nationwide delivery</span>
          </span>
          <span className="hidden items-center gap-1.5 md:flex">
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="font-medium">7-day returns</span>
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container">
          {/* Primary row: logo · search · actions */}
          <div className="flex h-16 items-center gap-3 md:h-20 md:gap-6">
            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    <span className="tech-heading text-lg">{STORE_NAME}</span>
                  </SheetTitle>
                </SheetHeader>

                <nav className="mt-6 flex flex-col">
                  <p className="tech-eyebrow mb-2 text-muted-foreground">Shop by device</p>
                  {DEVICE_CATEGORIES.map(({ label, href, icon: Icon }) => (
                    <Link
                      key={label}
                      href={href}
                      className="flex items-center gap-3 rounded-lg px-2 py-3 text-sm font-medium transition-colors hover:bg-secondary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      {label}
                    </Link>
                  ))}

                  <div className="mt-4 border-t pt-4">
                    <Link
                      href="/products?deals=true"
                      className="block rounded-lg px-2 py-3 text-sm font-medium transition-colors hover:bg-secondary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Deals
                    </Link>
                    <Link
                      href="/track"
                      className="block rounded-lg px-2 py-3 text-sm font-medium transition-colors hover:bg-secondary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Track order
                    </Link>
                  </div>
                </nav>

                <div className="mt-4 space-y-1 border-t pt-4">
                  <p className="tech-eyebrow mb-2 text-muted-foreground">Account</p>
                  {isAuthenticated ? (
                    <>
                      <div className="flex items-center gap-3 py-2">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={customer?.profileImage} alt={customer?.name} />
                          <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{customer?.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {customer?.email}
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/account"
                        className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        My account
                      </Link>
                      <Link
                        href="/account/orders"
                        className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Package className="h-4 w-4" />
                        Orders
                      </Link>
                      <button
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-sm text-destructive transition-colors hover:bg-secondary"
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 pt-1">
                      <Button asChild onClick={() => setMobileMenuOpen(false)}>
                        <Link href="/login">Sign in</Link>
                      </Button>
                      <Button variant="outline" asChild onClick={() => setMobileMenuOpen(false)}>
                        <Link href="/register">Create account</Link>
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t pt-4">
                  <a
                    href={`tel:${STORE_PHONE.replace(/\s/g, '')}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Phone className="h-4 w-4" />
                    {STORE_PHONE}
                  </a>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Smartphone className="h-5 w-5" />
              </span>
              <span className="tech-heading hidden text-lg text-foreground sm:block md:text-xl">
                {STORE_NAME}
              </span>
            </Link>

            {/* Search — front and centre; electronics shopping is search-led */}
            <form onSubmit={handleSearch} className="flex min-w-0 flex-1 items-center">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search phones, laptops, accessories…"
                  className="h-11 w-full pl-10 pr-3"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-0.5 md:gap-1">
              <Button variant="ghost" size="icon" className="hidden sm:flex" asChild>
                <Link href="/account" aria-label="Saved items">
                  <Heart className="h-5 w-5" />
                </Link>
              </Button>

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hidden sm:flex">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={customer?.profileImage} alt={customer?.name} />
                        <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{customer?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{customer?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account">
                        <User className="mr-2 h-4 w-4" />
                        My account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/orders">
                        <Package className="mr-2 h-4 w-4" />
                        Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/addresses">
                        <MapPin className="mr-2 h-4 w-4" />
                        Addresses
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="icon" className="hidden sm:flex" asChild>
                  <Link href="/login" aria-label="Sign in">
                    <User className="h-5 w-5" />
                  </Link>
                </Button>
              )}

              <CartSheet />
            </div>
          </div>

          {/* Category row — desktop */}
          <nav className="hidden h-11 items-center gap-1 lg:flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
                  <Menu className="h-4 w-4" />
                  All categories
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {DEVICE_CATEGORIES.map(({ label, href, icon: Icon }) => (
                  <DropdownMenuItem key={label} asChild className="cursor-pointer">
                    <Link href={href}>
                      <Icon className="mr-2 h-4 w-4 text-primary" />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/">All products</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="mx-1 h-5 w-px bg-border" />

            {DEVICE_CATEGORIES.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {label}
              </Link>
            ))}

            <Link
              href="/products?deals=true"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-deal transition-colors hover:bg-deal/10"
            >
              Deals
            </Link>

            <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
              <Link href="/track" className="flex items-center gap-1.5 hover:text-foreground">
                <MapPin className="h-3.5 w-3.5" />
                Track order
              </Link>
              <a
                href={`tel:${STORE_PHONE.replace(/\s/g, '')}`}
                className="flex items-center gap-1.5 hover:text-foreground"
              >
                <Phone className="h-3.5 w-3.5" />
                {STORE_PHONE}
              </a>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
