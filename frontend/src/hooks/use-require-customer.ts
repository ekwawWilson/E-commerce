import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerStore } from '@/stores/customer';

/**
 * Load the signed-in customer and send guests to the login page. Waits for
 * loadAuth() to settle first: the store is persisted, so isAuthenticated is
 * briefly false on a fresh page load.
 */
export function useRequireCustomer(returnTo: string) {
  const router = useRouter();
  const store = useCustomerStore();
  const { isAuthenticated, isLoading, loadAuth } = store;

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [isLoading, isAuthenticated, router, returnTo]);

  return store;
}
