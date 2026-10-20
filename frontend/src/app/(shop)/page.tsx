'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  Smartphone,
  Laptop,
  Tablet,
  Watch,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Product } from '@/types';
import { ProductGrid } from '@/components/shop/product-grid';
import { Button } from '@/components/ui/button';
import { ProductImage } from '@/components/ui/product-image';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice, getImageUrl, cn } from '@/lib/utils';
import { getHighlightSpecs } from '@/lib/product-specs';

interface Category {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
  children?: Category[];
  parentId?: string | null;
}

const PAGE_SIZE = 12;

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function HeroCarousel({ products }: { products: Product[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % products.length);
  }, [products.length]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
  };

  useEffect(() => {
    if (!isAutoPlaying || products.length <= 1) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, products.length, nextSlide]);

  if (products.length === 0) return null;

  const product = products[currentIndex];
  const specs = getHighlightSpecs(product, 4);
  const hasDiscount =
    product.comparePrice && Number(product.comparePrice) > Number(product.price);
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.comparePrice!)) * 100)
    : 0;

  return (
    <div
      className="tech-grid-bg relative overflow-hidden border-b border-border bg-secondary/40"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div className="container">
        <div className="grid min-h-[420px] items-center gap-8 py-10 md:min-h-[480px] lg:grid-cols-2 lg:py-14">
          {/* Copy */}
          <div className="order-2 lg:order-1">
            {hasDiscount && (
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-deal px-3 py-1 text-xs font-bold text-deal-foreground">
                <Zap className="h-3.5 w-3.5" />
                Save {discountPercent}% today
              </span>
            )}

            <h1 className="tech-heading text-3xl leading-tight text-foreground md:text-5xl">
              {product.name}
            </h1>

            {product.description && (
              <p className="mt-4 line-clamp-2 max-w-lg text-base text-muted-foreground">
                {product.description}
              </p>
            )}

            {specs.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {specs.map((s) => (
                  <span
                    key={s.label}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
                  >
                    <span className="text-muted-foreground">{s.label}: </span>
                    <span className="font-semibold text-foreground">{s.value}</span>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-baseline gap-3">
              <span className="tabular-price text-3xl font-bold text-foreground md:text-4xl">
                {formatPrice(product.price)}
              </span>
              {hasDiscount && (
                <span className="tabular-price text-lg text-muted-foreground line-through">
                  {formatPrice(product.comparePrice!)}
                </span>
              )}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href={`/products/${product.slug}`}>
                  Shop now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/products?deals=true">View all deals</Link>
              </Button>
            </div>
          </div>

          {/* Image */}
          <div className="order-1 lg:order-2">
            <Link
              href={`/products/${product.slug}`}
              className="relative mx-auto block aspect-square w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card"
            >
              <ProductImage
                src={getImageUrl(product)}
                alt={product.name}
                fill
                priority
                className="object-contain p-8"
                sizes="(max-width: 1024px) 90vw, 440px"
              />
            </Link>
          </div>
        </div>
      </div>

      {/* Controls */}
      {products.length > 1 && (
        <>
          {/* Placed at the very edge (and only on xl) so they never sit on top
              of the headline on mid-size screens. */}
          <button
            onClick={prevSlide}
            aria-label="Previous"
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-border bg-background/90 p-2.5 shadow-sm transition-colors hover:bg-background xl:block"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextSlide}
            aria-label="Next"
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-border bg-background/90 p-2.5 shadow-sm transition-colors hover:bg-background xl:block"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {products.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/40'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trust bar                                                           */
/* ------------------------------------------------------------------ */

const TRUST_POINTS = [
  { icon: ShieldCheck, title: 'Genuine products', copy: 'Warranty on every device' },
  { icon: Truck, title: 'Fast delivery', copy: 'Nationwide shipping' },
  { icon: RotateCcw, title: '7-day returns', copy: 'Hassle-free exchanges' },
  { icon: Headphones, title: 'Expert support', copy: 'Real people, real help' },
];

function TrustBar() {
  return (
    <section className="border-y border-border bg-background">
      <div className="container grid grid-cols-2 gap-x-4 gap-y-6 py-8 lg:grid-cols-4">
        {TRUST_POINTS.map(({ icon: Icon, title, copy }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{copy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Category tiles                                                      */
/* ------------------------------------------------------------------ */

const DEVICE_TILES = [
  { label: 'Phones', slug: 'phones', icon: Smartphone },
  { label: 'Laptops', slug: 'laptops', icon: Laptop },
  { label: 'Tablets', slug: 'tablets', icon: Tablet },
  { label: 'Audio', slug: 'audio', icon: Headphones },
  { label: 'Wearables', slug: 'wearables', icon: Watch },
  { label: 'Accessories', slug: 'accessories', icon: Zap },
];

function CategoryTiles({ categories }: { categories: Category[] }) {
  // Prefer real categories from the API; fall back to the standard device set
  // so the homepage still looks intentional on a fresh catalogue.
  const tiles = categories.length
    ? categories.slice(0, 6).map((c) => {
        const match = DEVICE_TILES.find(
          (d) => d.slug === c.slug || c.name.toLowerCase().includes(d.slug.slice(0, 5))
        );
        return {
          label: c.name,
          slug: c.slug,
          icon: match?.icon ?? Smartphone,
          count: c._count?.products,
        };
      })
    : DEVICE_TILES.map((d) => ({ ...d, count: undefined }));

  return (
    <section className="container py-10 md:py-14">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="tech-eyebrow text-primary">Browse</p>
          <h2 className="tech-heading text-2xl text-foreground md:text-3xl">
            Shop by category
          </h2>
        </div>
        <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
          <Link href="/">
            View all
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(({ label, slug, icon: Icon, count }) => (
          <Link
            key={slug}
            href={`/products?category=${slug}`}
            className="product-card group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-6 w-6" />
            </span>
            <span className="text-sm font-semibold text-card-foreground">{label}</span>
            {typeof count === 'number' && (
              <span className="-mt-2 text-xs text-muted-foreground">{count} items</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section heading + filter sidebar                                    */
/* ------------------------------------------------------------------ */

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="tech-eyebrow text-primary">{eyebrow}</p>}
        <h2 className="tech-heading text-2xl text-foreground md:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function CategorySidebar({
  categories,
  activeSlug,
  onSelect,
}: {
  categories: Category[];
  activeSlug: string;
  onSelect: (slug: string) => void;
}) {
  const parents = categories.filter((c) => !c.parentId);

  return (
    <nav className="space-y-1">
      <button
        onClick={() => onSelect('')}
        className={cn(
          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
          !activeSlug
            ? 'bg-primary text-primary-foreground font-semibold'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        )}
      >
        All products
      </button>

      {parents.map((cat) => (
        <div key={cat.id}>
          <button
            onClick={() => onSelect(cat.slug)}
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
              activeSlug === cat.slug
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <span>{cat.name}</span>
            {typeof cat._count?.products === 'number' && (
              <span className="tabular-price text-xs opacity-70">
                {cat._count.products}
              </span>
            )}
          </button>

          {cat.children && cat.children.length > 0 && (
            <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
              {cat.children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => onSelect(child.slug)}
                  className={cn(
                    'block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors',
                    activeSlug === child.slug
                      ? 'font-semibold text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {child.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

function ProductGridSkeleton({ count = PAGE_SIZE }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-3">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="mt-3 h-3 w-1/3" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-3 h-6 w-1/2" />
          <Skeleton className="mt-3 h-9 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const featured = searchParams.get('featured') === 'true';

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset paging whenever the query changes, otherwise a narrower search keeps
  // the previous "load more" depth.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, category, featured]);

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, category, featured }],
    queryFn: () =>
      api.getProducts({
        search: search || undefined,
        category: category || undefined,
        featured: featured || undefined,
        limit: 48,
      }),
  });

  const { data: featuredData } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => api.getFeaturedProducts(),
    enabled: !search && !category && !featured,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  const products: Product[] = (data as { data?: Product[] })?.data || [];
  const featuredProducts: Product[] = (featuredData as { data?: Product[] })?.data || [];
  const categories: Category[] = (categoriesData as { data?: Category[] })?.data || [];

  const isBrowsing = !search && !category && !featured;
  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = products.length > visibleCount;

  const handleCategorySelect = (slug: string) => {
    setMobileSidebarOpen(false);
    router.push(slug ? `/products?category=${slug}` : '/products');
  };

  const activeCategoryName =
    categories.find((c) => c.slug === category)?.name ||
    categories.flatMap((c) => c.children || []).find((c) => c.slug === category)?.name;

  return (
    <div className="min-h-screen bg-background">
      {isBrowsing && featuredProducts.length > 0 && (
        <HeroCarousel products={featuredProducts.slice(0, 5)} />
      )}

      {isBrowsing && <TrustBar />}

      {isBrowsing && <CategoryTiles categories={categories} />}

      {/* Deals strip */}
      {isBrowsing && featuredProducts.length > 0 && (
        <section className="container pb-4">
          <SectionHeading
            eyebrow="Limited time"
            title="Hot deals"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/products?deals=true">
                  See all
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            }
          />
          <ProductGrid products={featuredProducts.slice(0, 4)} />
        </section>
      )}

      {/* Main catalogue */}
      <section className="container py-10 md:py-14">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-32">
              <p className="tech-eyebrow mb-3 text-muted-foreground">Categories</p>
              <CategorySidebar
                categories={categories}
                activeSlug={category}
                onSelect={handleCategorySelect}
              />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <SectionHeading
              eyebrow={
                search ? 'Search results' : featured ? 'Deals' : activeCategoryName ? 'Category' : 'Catalogue'
              }
              title={
                search
                  ? `"${search}"`
                  : featured
                    ? 'All deals'
                    : activeCategoryName || 'All products'
              }
              action={
                <div className="flex items-center gap-2">
                  <span className="hidden text-sm text-muted-foreground sm:block">
                    {products.length} {products.length === 1 ? 'product' : 'products'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setMobileSidebarOpen(true)}
                  >
                    <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                    Filter
                  </Button>
                </div>
              }
            />

            {(search || category || featured) && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Active:</span>
                {[
                  search && { label: `"${search}"`, clear: '/' },
                  activeCategoryName && { label: activeCategoryName, clear: '/' },
                  featured && { label: 'Deals', clear: '/' },
                ]
                  .filter(Boolean)
                  .map((chip) => {
                    const c = chip as { label: string; clear: string };
                    return (
                      <Link
                        key={c.label}
                        href={c.clear}
                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/70"
                      >
                        {c.label}
                        <X className="h-3 w-3" />
                      </Link>
                    );
                  })}
              </div>
            )}

            {isLoading ? (
              <ProductGridSkeleton />
            ) : products.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-20 text-center">
                <p className="text-base font-semibold text-foreground">No products found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a different search or browse another category.
                </p>
                <Button className="mt-5" asChild>
                  <Link href="/">Browse all products</Link>
                </Button>
              </div>
            ) : (
              <>
                <ProductGrid products={visibleProducts} />

                {hasMore && (
                  <div className="mt-10 flex justify-center">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    >
                      Load more products
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Mobile filter drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[280px] overflow-y-auto bg-background p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <p className="tech-heading text-base">Categories</p>
              <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <CategorySidebar
              categories={categories}
              activeSlug={category}
              onSelect={handleCategorySelect}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="container py-16">
          <ProductGridSkeleton />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
