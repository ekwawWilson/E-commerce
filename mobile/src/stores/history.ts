import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types';

const SEARCH_HISTORY_KEY = 'search_history';
const BROWSING_HISTORY_KEY = 'browsing_history';
const MAX_SEARCH_HISTORY = 20;
const MAX_BROWSING_HISTORY = 50;

interface BrowsingHistoryItem {
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  productPrice: number;
  viewedAt: string;
}

interface SearchHistoryItem {
  query: string;
  searchedAt: string;
}

interface HistoryState {
  searchHistory: SearchHistoryItem[];
  browsingHistory: BrowsingHistoryItem[];
  isLoading: boolean;

  // Actions
  loadHistory: () => Promise<void>;
  addSearchQuery: (query: string) => Promise<void>;
  addProductView: (product: Product) => Promise<void>;
  removeSearchQuery: (query: string) => Promise<void>;
  removeProductFromHistory: (productId: string) => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  clearBrowsingHistory: () => Promise<void>;
  clearAllHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  searchHistory: [],
  browsingHistory: [],
  isLoading: false,

  loadHistory: async () => {
    set({ isLoading: true });
    try {
      const [searchData, browsingData] = await Promise.all([
        AsyncStorage.getItem(SEARCH_HISTORY_KEY),
        AsyncStorage.getItem(BROWSING_HISTORY_KEY),
      ]);

      set({
        searchHistory: searchData ? JSON.parse(searchData) : [],
        browsingHistory: browsingData ? JSON.parse(browsingData) : [],
      });
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addSearchQuery: async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    try {
      const { searchHistory } = get();

      // Remove existing entry if it exists (to move it to top)
      const filtered = searchHistory.filter(
        item => item.query.toLowerCase() !== trimmedQuery.toLowerCase()
      );

      const newItem: SearchHistoryItem = {
        query: trimmedQuery,
        searchedAt: new Date().toISOString(),
      };

      // Add to beginning, limit size
      const updated = [newItem, ...filtered].slice(0, MAX_SEARCH_HISTORY);

      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      set({ searchHistory: updated });
    } catch (error) {
      console.error('Failed to add search query:', error);
    }
  },

  addProductView: async (product: Product) => {
    try {
      const { browsingHistory } = get();

      // Remove existing entry if it exists (to move it to top)
      const filtered = browsingHistory.filter(
        item => item.productId !== product.id
      );

      const newItem: BrowsingHistoryItem = {
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        productImage: product.images?.[0]?.url,
        productPrice: product.price,
        viewedAt: new Date().toISOString(),
      };

      // Add to beginning, limit size
      const updated = [newItem, ...filtered].slice(0, MAX_BROWSING_HISTORY);

      await AsyncStorage.setItem(BROWSING_HISTORY_KEY, JSON.stringify(updated));
      set({ browsingHistory: updated });
    } catch (error) {
      console.error('Failed to add product to history:', error);
    }
  },

  removeSearchQuery: async (query: string) => {
    try {
      const { searchHistory } = get();
      const updated = searchHistory.filter(
        item => item.query.toLowerCase() !== query.toLowerCase()
      );

      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      set({ searchHistory: updated });
    } catch (error) {
      console.error('Failed to remove search query:', error);
    }
  },

  removeProductFromHistory: async (productId: string) => {
    try {
      const { browsingHistory } = get();
      const updated = browsingHistory.filter(
        item => item.productId !== productId
      );

      await AsyncStorage.setItem(BROWSING_HISTORY_KEY, JSON.stringify(updated));
      set({ browsingHistory: updated });
    } catch (error) {
      console.error('Failed to remove product from history:', error);
    }
  },

  clearSearchHistory: async () => {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
      set({ searchHistory: [] });
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  },

  clearBrowsingHistory: async () => {
    try {
      await AsyncStorage.removeItem(BROWSING_HISTORY_KEY);
      set({ browsingHistory: [] });
    } catch (error) {
      console.error('Failed to clear browsing history:', error);
    }
  },

  clearAllHistory: async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(SEARCH_HISTORY_KEY),
        AsyncStorage.removeItem(BROWSING_HISTORY_KEY),
      ]);
      set({ searchHistory: [], browsingHistory: [] });
    } catch (error) {
      console.error('Failed to clear all history:', error);
    }
  },
}));
