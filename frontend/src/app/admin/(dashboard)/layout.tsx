'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { AdminSidebar } from '@/components/admin/sidebar';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();

  // The auth store is persisted to localStorage, so on a full page load it
  // starts empty and rehydrates a tick later. Redirecting before that finishes
  // bounced logged-in admins back to /admin/login on every hard navigation.
  //
  // Starts false so the server-rendered markup matches the first client render;
  // `persist` is only available in the browser, hence the guards.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persist = useAuthStore.persist;
    if (!persist) {
      setHydrated(true);
      return;
    }
    if (persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && (!isAuthenticated || !token)) {
      router.push('/admin/login');
    }
  }, [hydrated, isAuthenticated, token, router]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center admin-theme">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden admin-theme">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
