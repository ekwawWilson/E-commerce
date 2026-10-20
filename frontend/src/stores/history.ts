import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_SEARCH_HISTORY = 20;
const MAX_BROWSING_HISTORY = 50;

interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

interface BrowsingHistoryItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  timestamp: number;
}

interface HistoryState {
  searchHistory: SearchHistoryItem[];
  browsingHistory: BrowsingHistoryItem[];

  // Search history actions
  addSearchQuery: (query: string) => void;
  removeSearchQuery: (query: string) => void;
  clearSearchHistory: () => void;

  // Browsing history actions
  addProductView: (product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    images?: { url: string }[];
  }) => void;
  removeProductFromHistory: (productId: string) => void;
  clearBrowsingHistory: () => void;

  // Clear all
  clearAllHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      searchHistory: [],
      browsingHistory: [],

      addSearchQuery: (query: string) => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) return;

        const { searchHistory } = get();

        // Remove existing entry if present (to move it to top)
        const filtered = searchHistory.filter(
          (item) => item.query.toLowerCase() !== trimmedQuery.toLowerCase()
        );

        // Add to beginning
        const newHistory = [
          { query: trimmedQuery, timestamp: Date.now() },
          ...filtered,
        ].slice(0, MAX_SEARCH_HISTORY);

        set({ searchHistory: newHistory });
      },

      removeSearchQuery: (query: string) => {
        const { searchHistory } = get();
        set({
          searchHistory: searchHistory.filter(
            (item) => item.query.toLowerCase() !== query.toLowerCase()
          ),
        });
      },

      clearSearchHistory: () => {
        set({ searchHistory: [] });
      },

      addProductView: (product) => {
        const { browsingHistory } = get();

        // Remove existing entry if present (to move it to top)
        const filtered = browsingHistory.filter((item) => item.id !== product.id);

        // Add to beginning
        const newHistory = [
          {
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            image: product.images?.[0]?.url,
            timestamp: Date.now(),
          },
          ...filtered,
        ].slice(0, MAX_BROWSING_HISTORY);

        set({ browsingHistory: newHistory });
      },

      removeProductFromHistory: (productId: string) => {
        const { browsingHistory } = get();
        set({
          browsingHistory: browsingHistory.filter((item) => item.id !== productId),
        });
      },

      clearBrowsingHistory: () => {
        set({ browsingHistory: [] });
      },

      clearAllHistory: () => {
        set({ searchHistory: [], browsingHistory: [] });
      },
    }),
    {
      name: 'history-storage',
      partialize: (state) => ({
        searchHistory: state.searchHistory,
        browsingHistory: state.browsingHistory,
      }),
    }
  )
);

// Helper to get recent searches for suggestions
export function getRecentSearches(limit = 5): string[] {
  return useHistoryStore
    .getState()
    .searchHistory.slice(0, limit)
    .map((item) => item.query);
}

// Helper to get recently viewed products
export function getRecentlyViewed(limit = 10): BrowsingHistoryItem[] {
  return useHistoryStore.getState().browsingHistory.slice(0, limit);
}
