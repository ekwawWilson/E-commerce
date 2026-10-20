'use client';

import { Suspense, useCallback, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  SlidersHorizontal,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  SearchX,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Product } from '@/types';
import { ProductCard } from '@/components/shop/product-card';
import { FilterSidebar, FilterState, Category } from '@/components/shop/filter-sidebar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 24;

/** Sort options mapped to the API's sortBy/sortOrder pair. */
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Featured', sortBy: 'featured', sortOrder: 'desc' as const },
  { value: 'price-asc', label: 'Price: Low to High', sortBy: 'price', sortOrder: 'asc' as const },
  { value: 'price-desc', label: 'Price: High to Low', sortBy: 'price', sortOrder: 'desc' as const },
  { value: 'newest', label: 'Newest arrivals', sortBy: 'createdAt', sortOrder: 'desc' as const },
  { value: 'name', label: 'Name: A to Z', sortBy: 'name', sortOrder: 'asc' as const },
];

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL is the single source of truth so filtered views are shareable and the
  // back button restores the previous refinement rather than losing it.
  const filters: FilterState = useMemo(
    () => ({
      category: searchParams.get('category') || undefined,
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      inStock: searchParams.get('inStock') === 'true' || undefined,
      deals: searchParams.get('deals') === 'true' || undefined,
    }),
    [searchParams]
  );

  const search = searchParams.get('search') || '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const sort = searchParams.get('sort') || 'relevance';
  const view = searchParams.get('view') === 'list' ? 'list' : 'grid';

  const sortOption = SORT_OPTIONS.find((s) => s.value === sort) ?? SORT_OPTIONS[0];

  const setParams = useCallback(
    (updates: Record<string, string | number | boolean | undefined>, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === '' || value === false) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      if (resetPage) next.delete('page');
      router.push(`/products?${next.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', { search, page, sort, ...filters }],
    queryFn: () =>
      api.getProducts({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        category: filters.category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        inStock: filters.inStock,
        onSale: filters.deals,
        sortBy: sortOption.sortBy,
        sortOrder: sortOption.sortOrder,
      }),
    // Keeps the previous page visible while the next loads, so the grid doesn't
    // collapse to skeletons on every pagination click.
    placeholderData: keepPreviousData,
  });

  const products: Product[] = data?.data ?? [];

  const total = data?.pagination?.total ?? products.length;
  const totalPages = data?.pagination?.totalPages ?? 1;
  const categories: Category[] = categoriesData?.data ?? [];

  const activeCategory = categories.find((c) => c.slug === filters.category);

  const handleFilterChange = (next: Partial<FilterState>) => {
    setParams(next as Record<string, string | number | boolean | undefined>);
  };

  const handleClear = () => {
    const next = new URLSearchParams();
    if (search) next.set('search', search);
    router.push(`/products?${next.toString()}`, { scroll: false });
  };

  const sidebar = (
    <FilterSidebar
      categories={categories}
      filters={filters}
      onChange={handleFilterChange}
      onClear={handleClear}
    />
  );

  const rangeStart = (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="container py-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          Home
        </Link>
        <span className="text-muted-foreground/50">/</span>
        {activeCategory ? (
          <>
            <Link href="/products" className="text-muted-foreground hover:text-foreground">
              All products
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="font-medium text-foreground">{activeCategory.name}</span>
          </>
        ) : (
          <span className="font-medium text-foreground">
            {search ? `Results for “${search}”` : 'All products'}
          </span>
        )}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-24">{sidebar}</div>
        </div>

        <div className="min-w-0">
          {/* Results toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="min-w-0">
              <h1 className="tech-heading truncate text-xl text-foreground">
                {search ? `Results for “${search}”` : activeCategory?.name ?? 'All products'}
              </h1>
              {!isLoading && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {total === 0
                    ? 'No results'
                    : `${rangeStart}–${rangeEnd} of ${total} result${total === 1 ? '' : 's'}`}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile filter trigger */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="text-left">Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">{sidebar}</div>
                </SheetContent>
              </Sheet>

              <Select value={sort} onValueChange={(v) => setParams({ sort: v })}>
                <SelectTrigger className="h-9 w-[190px]" aria-label="Sort results">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="hidden items-center rounded-lg border border-border sm:flex">
                <button
                  type="button"
                  aria-label="Grid view"
                  aria-pressed={view === 'grid'}
                  onClick={() => setParams({ view: undefined }, false)}
                  className={cn(
                    'rounded-l-lg p-2 transition-colors',
                    view === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  aria-pressed={view === 'list'}
                  onClick={() => setParams({ view: 'list' }, false)}
                  className={cn(
                    'rounded-r-lg p-2 transition-colors',
                    view === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <div
              className={cn(
                'grid gap-4',
                view === 'grid' ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'
              )}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border p-3">
                  <Skeleton className="aspect-square w-full rounded-lg" />
                  <Skeleton className="mt-3 h-4 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                  <Skeleton className="mt-3 h-9 w-full" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Something went wrong loading products. Please try again.
              </p>
            </div>
          ) : products.length === 0 ? (
            <NoResults search={search} onClear={handleClear} />
          ) : (
            <>
              <div
                className={cn(
                  'grid gap-4',
                  view === 'grid' ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'
                )}
              >
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    variant={view === 'list' ? 'horizontal' : 'default'}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPage={(p) => {
                    setParams({ page: p === 1 ? undefined : p }, false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function NoResults({ search, onClear }: { search: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <SearchX className="h-7 w-7 text-muted-foreground" />
      </span>
      <h2 className="text-lg font-semibold text-foreground">
        {search ? `No results for “${search}”` : 'No products match these filters'}
      </h2>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        Try checking your spelling, using fewer or more general words, or removing some
        filters.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={onClear} variant="outline">
          Clear filters
        </Button>
        <Button asChild>
          <Link href="/products">Browse all products</Link>
        </Button>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  // Windowed page numbers so long catalogues don't render hundreds of buttons.
  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-center gap-1 border-t border-border pt-6"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Previous
      </Button>

      {start > 1 && (
        <>
          <Button variant="ghost" size="sm" onClick={() => onPage(1)}>
            1
          </Button>
          {start > 2 && <span className="px-1 text-muted-foreground">…</span>}
        </>
      )}

      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? 'default' : 'ghost'}
          size="sm"
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onPage(p)}
          className="min-w-9"
        >
          {p}
        </Button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Button variant="ghost" size="sm" onClick={() => onPage(totalPages)}>
            {totalPages}
          </Button>
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </nav>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-10">
          <Skeleton className="h-8 w-48" />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
