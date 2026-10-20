import { Product, ProductSpecification } from '@/types';

/**
 * Spec keys worth surfacing on a product card, in priority order.
 *
 * Electronics shoppers scan for a handful of decisive attributes before they
 * ever open the product page — storage, memory, display size, battery. Matching
 * is fuzzy because spec keys are free-text (see SpecificationTemplate) and vary
 * between "RAM", "ram", and "Memory".
 */
const CARD_SPEC_PRIORITY: Array<{ label: string; patterns: RegExp }> = [
  { label: 'Storage', patterns: /^(storage|internal storage|capacity|rom)$/i },
  { label: 'RAM', patterns: /^(ram|memory)$/i },
  { label: 'Display', patterns: /^(screen size|display|screen)$/i },
  { label: 'Battery', patterns: /^(battery|battery capacity)$/i },
  { label: 'Camera', patterns: /^(camera|main camera|rear camera)$/i },
  { label: 'Chip', patterns: /^(chipset|processor|cpu|chip)$/i },
  { label: 'Network', patterns: /^(network|connectivity|5g)$/i },
];

export interface HighlightSpec {
  label: string;
  value: string;
}

/**
 * Pick the most decision-relevant specs for a compact card display.
 */
export function getHighlightSpecs(product: Product, limit = 3): HighlightSpec[] {
  const specs = product.specifications;
  if (!specs?.length) return [];

  const highlights: HighlightSpec[] = [];

  for (const { label, patterns } of CARD_SPEC_PRIORITY) {
    if (highlights.length >= limit) break;

    const match = specs.find((s) => patterns.test(s.key.trim()));
    if (match?.value) {
      highlights.push({ label, value: match.value });
    }
  }

  return highlights;
}

/**
 * Group specifications by their `group` field for the product detail page,
 * preserving each group's first-seen order and each spec's sortOrder.
 */
export function groupSpecifications(
  specs: ProductSpecification[]
): Array<{ group: string; items: ProductSpecification[] }> {
  if (!specs?.length) return [];

  const groups = new Map<string, ProductSpecification[]>();

  for (const spec of specs) {
    const key = spec.group?.trim() || 'General';
    const existing = groups.get(key);
    if (existing) {
      existing.push(spec);
    } else {
      groups.set(key, [spec]);
    }
  }

  return Array.from(groups.entries()).map(([group, items]) => ({
    group,
    items: [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  }));
}

/**
 * Stock urgency state, used to drive colour and copy consistently across the
 * card, the product page, and the cart.
 */
export type StockState = 'out' | 'preorder' | 'low' | 'in';

export function getStockState(product: Product): StockState {
  if (product.isPreorder) return 'preorder';
  if (product.stock <= 0) return 'out';
  if (product.stock <= (product.lowStockThreshold || 5)) return 'low';
  return 'in';
}
