'use client';

import Link from 'next/link';
import {
  Facebook,
  Instagram,
  Twitter,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Truck,
  ShieldCheck,
  Headphones,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  STORE_NAME,
  STORE_TAGLINE,
  STORE_PHONE,
  STORE_EMAIL,
  STORE_LOCATION,
} from '@/lib/store-config';

const SHOP_LINKS = [
  { label: 'All products', href: '/products' },
  { label: 'Phones', href: '/products?category=phones' },
  { label: 'Laptops', href: '/products?category=laptops' },
  { label: 'Accessories', href: '/products?category=accessories' },
  { label: 'Deals', href: '/products?deals=true' },
];

const SUPPORT_LINKS = [
  { label: 'Track your order', href: '/track' },
  { label: 'Shipping information', href: '#' },
  { label: 'Returns & warranty', href: '#' },
  { label: 'Buying guide', href: '#' },
  { label: 'FAQ', href: '#' },
];

const FEATURES = [
  { icon: Truck, title: 'Nationwide delivery', copy: 'Fast, tracked shipping' },
  { icon: ShieldCheck, title: 'Genuine products', copy: 'Warranty included' },
  { icon: Headphones, title: 'Expert support', copy: 'Help choosing a device' },
  { icon: CreditCard, title: 'Flexible payment', copy: 'Mobile money & COD' },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-foreground text-background">
      {/* Feature strip */}
      <div className="border-b border-background/10">
        <div className="container grid grid-cols-2 gap-6 py-10 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background/10">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-background/60">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Newsletter */}
      <div className="border-b border-background/10">
        <div className="container flex flex-col items-center justify-between gap-6 py-10 md:flex-row">
          <div className="text-center md:text-left">
            <p className="tech-heading text-xl">Get deal alerts</p>
            <p className="mt-1 text-sm text-background/60">
              New arrivals and price drops, straight to your inbox.
            </p>
          </div>
          <form
            className="flex w-full max-w-md gap-2"
            onSubmit={(e) => e.preventDefault()}
          >
            <Input
              type="email"
              required
              placeholder="you@example.com"
              aria-label="Email address"
              className="h-11 flex-1 border-background/20 bg-background/10 text-background placeholder:text-background/40"
            />
            <Button type="submit" className="h-11 shrink-0">
              Subscribe
            </Button>
          </form>
        </div>
      </div>

      {/* Main */}
      <div className="container grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Smartphone className="h-5 w-5" />
            </span>
            <span className="tech-heading text-lg">{STORE_NAME}</span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-background/60">{STORE_TAGLINE}</p>
          <div className="mt-5 flex gap-2">
            {[Facebook, Instagram, Twitter].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="Social link"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-background/20 transition-colors hover:bg-background hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="tech-eyebrow text-background/50">Shop</h4>
          <nav className="mt-4 flex flex-col gap-2.5">
            {SHOP_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm text-background/75 transition-colors hover:text-background"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h4 className="tech-eyebrow text-background/50">Support</h4>
          <nav className="mt-4 flex flex-col gap-2.5">
            {SUPPORT_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm text-background/75 transition-colors hover:text-background"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h4 className="tech-eyebrow text-background/50">Contact</h4>
          <div className="mt-4 space-y-3">
            <p className="flex items-start gap-2.5 text-sm text-background/75">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-background/50" />
              {STORE_LOCATION}
            </p>
            <a
              href={`tel:${STORE_PHONE.replace(/\s/g, '')}`}
              className="flex items-start gap-2.5 text-sm text-background/75 transition-colors hover:text-background"
            >
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-background/50" />
              {STORE_PHONE}
            </a>
            <a
              href={`mailto:${STORE_EMAIL}`}
              className="flex items-start gap-2.5 text-sm text-background/75 transition-colors hover:text-background"
            >
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-background/50" />
              {STORE_EMAIL}
            </a>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-background/10">
        <div className="container flex flex-col items-center justify-between gap-3 py-5 text-xs text-background/50 md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {STORE_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <a href="#" className="transition-colors hover:text-background">
              Privacy policy
            </a>
            <a href="#" className="transition-colors hover:text-background">
              Terms of service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
