import { describe, it, expect, vi, beforeEach } from 'vitest';
import Cookies from 'js-cookie';
import { useWishlistStore } from './wishlist';

const respond = (ok: boolean, body: unknown) =>
  vi.fn().mockResolvedValue({ ok, json: async () => body });

describe('wishlist store', () => {
  beforeEach(() => {
    Cookies.set('customer_token', 'tok');
    useWishlistStore.setState({ items: [], productIds: new Set(), loaded: true });
  });

  it('saves a product', async () => {
    vi.stubGlobal('fetch', respond(true, { success: true, data: { productId: 'p1' } }));
    await expect(useWishlistStore.getState().toggle('p1')).resolves.toBe(true);
    expect(useWishlistStore.getState().productIds.has('p1')).toBe(true);
  });

  it('undoes the optimistic change when the request fails', async () => {
    vi.stubGlobal('fetch', respond(false, { success: false, error: 'Product not found' }));
    await expect(useWishlistStore.getState().toggle('p1')).rejects.toThrow('Product not found');
    expect(useWishlistStore.getState().productIds.has('p1')).toBe(false);
  });

  it('loads saved products only once for many cards', async () => {
    const fetchMock = respond(true, { success: true, data: [] });
    vi.stubGlobal('fetch', fetchMock);
    useWishlistStore.setState({ loaded: false });

    await Promise.all([1, 2, 3].map(() => useWishlistStore.getState().ensureLoaded()));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
