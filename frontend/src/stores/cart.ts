import { create } from 'zustand';
import { CartItem, CartSummary } from '@/types';
import { api } from '@/lib/api';

interface CartState {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  isLoading: boolean;
  isOpen: boolean;

  // Actions
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  subtotal: 0,
  itemCount: 0,
  isLoading: false,
  isOpen: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const response = await api.getCart();
      if (response.success) {
        const data = response.data as CartSummary;
        set({
          items: data.items || [],
          subtotal: data.subtotal || 0,
          itemCount: data.itemCount || 0,
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
      if (response.success) {
        // Update cart from response directly
        const data = response.data as CartSummary;
        set({
          items: data.items || [],
          subtotal: data.subtotal || 0,
          itemCount: data.itemCount || 0,
        });
        get().openCart();
      }
    } catch (error) {
      console.error('Failed to add item:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      return get().removeItem(itemId);
    }

    set({ isLoading: true });
    try {
      const response = await api.updateCartItem(itemId, quantity);
      if (response.success) {
        const data = response.data as CartSummary;
        set({
          items: data.items || [],
          subtotal: data.subtotal || 0,
          itemCount: data.itemCount || 0,
        });
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
      const response = await api.removeFromCart(itemId);
      if (response.success) {
        const data = response.data as CartSummary;
        set({
          items: data.items || [],
          subtotal: data.subtotal || 0,
          itemCount: data.itemCount || 0,
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
      set({ items: [], subtotal: 0, itemCount: 0 });
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
}));
