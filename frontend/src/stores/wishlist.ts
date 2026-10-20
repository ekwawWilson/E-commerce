import { create } from 'zustand';
import { customerFetch, getCustomerToken } from './customer';

export interface WishlistEntry {
  productId: string;
  addedAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    comparePrice: number | null;
    currency: string;
    stock: number;
    images: Array<{ url: string }>;
  };
}

interface WishlistState {
  items: WishlistEntry[];
  productIds: Set<string>;
  loaded: boolean;
  load: () => Promise<void>;
  ensureLoaded: () => Promise<void>;
  toggle: (productId: string) => Promise<boolean>;
  reset: () => void;
}

let inFlight: Promise<void> | null = null;

// Saved products live on the server, so a wishlist follows the customer
// across devices. Guests are asked to sign in instead.
export const useWishlistStore = create<WishlistState>()((set, get) => ({
  items: [],
  productIds: new Set(),
  loaded: false,

  load: async () => {
    if (!getCustomerToken()) {
      set({ items: [], productIds: new Set(), loaded: true });
      return;
    }
    try {
      const response = await customerFetch<WishlistEntry[]>('/wishlist');
      const items = response.data || [];
      set({ items, productIds: new Set(items.map((i) => i.productId)), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  // Every product card calls this; only the first call fetches
  ensureLoaded: () => {
    if (get().loaded) return Promise.resolve();
    if (!inFlight) {
      inFlight = get().load().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  },

  // Returns whether the product is now saved
  toggle: async (productId: string) => {
    const saved = get().productIds.has(productId);

    // Optimistic update, rolled back if the request fails
    const next = new Set(get().productIds);
    if (saved) next.delete(productId);
    else next.add(productId);
    set({ productIds: next });

    try {
      if (saved) {
        await customerFetch(`/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' });
        set({ items: get().items.filter((i) => i.productId !== productId) });
      } else {
        await customerFetch('/wishlist', { method: 'POST', body: JSON.stringify({ productId }) });
      }
      return !saved;
    } catch (error) {
      const rollback = new Set(get().productIds);
      if (saved) rollback.add(productId);
      else rollback.delete(productId);
      set({ productIds: rollback });
      throw error;
    }
  },

  reset: () => set({ items: [], productIds: new Set(), loaded: false }),
}));
