import { create } from 'zustand';
import { CartItem } from '../types';
import { api } from '../lib/api';

interface CartState {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  isLoading: boolean;

  // Actions
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  subtotal: 0,
  itemCount: 0,
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const response = await api.getCart();
      if (response.success && response.data) {
        set({
          items: response.data.items || [],
          subtotal: response.data.subtotal || 0,
          itemCount: response.data.itemCount || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (productId: string, quantity = 1) => {
    set({ isLoading: true });
    try {
      const response = await api.addToCart(productId, quantity);
      if (response.success && response.data) {
        set({
          items: response.data.items || [],
          subtotal: response.data.subtotal || 0,
          itemCount: response.data.itemCount || 0,
        });
      }
    } catch (error) {
      console.error('Failed to add item:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    set({ isLoading: true });
    try {
      if (quantity < 1) {
        const response = await api.removeCartItem(itemId);
        if (response.success && response.data) {
          set({
            items: response.data.items || [],
            subtotal: response.data.subtotal || 0,
            itemCount: response.data.itemCount || 0,
          });
        }
      } else {
        const response = await api.updateCartItem(itemId, quantity);
        if (response.success && response.data) {
          set({
            items: response.data.items || [],
            subtotal: response.data.subtotal || 0,
            itemCount: response.data.itemCount || 0,
          });
        }
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  removeItem: async (itemId: string) => {
    set({ isLoading: true });
    try {
      const response = await api.removeCartItem(itemId);
      if (response.success && response.data) {
        set({
          items: response.data.items || [],
          subtotal: response.data.subtotal || 0,
          itemCount: response.data.itemCount || 0,
        });
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  clearCart: async () => {
    set({ isLoading: true });
    try {
      await api.clearCart();
    } catch (error) {
      // Ignore errors when clearing cart (cart might not exist)
      console.log('Clear cart:', error);
    } finally {
      // Always reset local state
      set({
        items: [],
        subtotal: 0,
        itemCount: 0,
        isLoading: false,
      });
    }
  },
}));
