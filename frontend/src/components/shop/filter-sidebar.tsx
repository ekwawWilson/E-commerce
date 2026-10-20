'use client';

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn, formatPrice } from '@/lib/utils';

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  _count?: { products: number };
  children?: Category[];
}

export interface FilterState {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  deals?: boolean;
}

interface FilterSidebarProps {
  categories: Category[];
  filters: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  onClear: () => void;
  className?: string;
}

/** Collapsible facet group — mirrors the standard e-commerce refinement panel. */
function FacetGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border py-4 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

/** Price brackets sized for a Ghana electronics catalogue (GHS). */
const PRICE_BRACKETS = [
  { label: 'Under 500', min: undefined, max: 500 },
  { label: '500 – 2,000', min: 500, max: 2000 },
  { label: '2,000 – 5,000', min: 2000, max: 5000 },
  { label: '5,000 – 15,000', min: 5000, max: 15000 },
  { label: 'Over 15,000', min: 15000, max: undefined },
];

export function FilterSidebar({
  categories,
  filters,
  onChange,
  onClear,
  className,
}: FilterSidebarProps) {
  const [minInput, setMinInput] = useState(filters.minPrice?.toString() ?? '');
  const [maxInput, setMaxInput] = useState(filters.maxPrice?.toString() ?? '');

  const activeCount = [
    filters.category,
    filters.minPrice !== undefined || filters.maxPrice !== undefined ? 'price' : undefined,
    filters.inStock ? 'stock' : undefined,
    filters.deals ? 'deals' : undefined,
  ].filter(Boolean).length;

  const applyPriceInputs = () => {
    onChange({
      minPrice: minInput ? Number(minInput) : undefined,
      maxPrice: maxInput ? Number(maxInput) : undefined,
    });
  };

  const topLevel = categories.filter((c) => !c.parentId);

  return (
    <aside className={cn('w-full', className)}>
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-sm font-bold text-foreground">Filters</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setMinInput('');
              setMaxInput('');
              onClear();
            }}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <X className="h-3 w-3" />
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <FacetGroup title="Department">
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => onChange({ category: undefined })}
              className={cn(
                'w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary',
                !filters.category
                  ? 'font-semibold text-primary'
                  : 'text-muted-foreground'
              )}
            >
              All departments
            </button>
          </li>
          {topLevel.map((cat) => {
            const children = categories.filter((c) => c.parentId === cat.id);
            const isActive = filters.category === cat.slug;

            return (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => onChange({ category: cat.slug })}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary',
                    isActive ? 'font-semibold text-primary' : 'text-muted-foreground'
                  )}
                >
                  <span>{cat.name}</span>
                  {cat._count?.products !== undefined && (
                    <span className="tabular-price text-xs text-muted-foreground/70">
                      {cat._count.products}
                    </span>
                  )}
                </button>
                {children.length > 0 && (
                  <ul className="ml-3 border-l border-border pl-2">
                    {children.map((child) => (
                      <li key={child.id}>
                        <button
                          type="button"
                          onClick={() => onChange({ category: child.slug })}
                          className={cn(
                            'w-full rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-secondary',
                            filters.category === child.slug
                              ? 'font-semibold text-primary'
                              : 'text-muted-foreground'
                          )}
                        >
                          {child.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </FacetGroup>

      <FacetGroup title="Price">
        <ul className="space-y-1">
          {PRICE_BRACKETS.map((b) => {
            const isActive =
              filters.minPrice === b.min && filters.maxPrice === b.max;
            return (
              <li key={b.label}>
                <button
                  type="button"
                  onClick={() => {
                    setMinInput(b.min?.toString() ?? '');
                    setMaxInput(b.max?.toString() ?? '');
                    onChange({ minPrice: b.min, maxPrice: b.max });
                  }}
                  className={cn(
                    'w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary',
                    isActive ? 'font-semibold text-primary' : 'text-muted-foreground'
                  )}
                >
                  {b.label}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            aria-label="Minimum price"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            className="h-9"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            aria-label="Maximum price"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            className="h-9"
          />
          <Button size="sm" variant="outline" className="h-9" onClick={applyPriceInputs}>
            Go
          </Button>
        </div>
      </FacetGroup>

      <FacetGroup title="Availability">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-in-stock"
              checked={!!filters.inStock}
              onCheckedChange={(v) => onChange({ inStock: v ? true : undefined })}
            />
            <Label htmlFor="filter-in-stock" className="cursor-pointer text-sm font-normal">
              In stock only
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-deals"
              checked={!!filters.deals}
              onCheckedChange={(v) => onChange({ deals: v ? true : undefined })}
            />
            <Label htmlFor="filter-deals" className="cursor-pointer text-sm font-normal">
              On sale
            </Label>
          </div>
        </div>
      </FacetGroup>
    </aside>
  );
}
