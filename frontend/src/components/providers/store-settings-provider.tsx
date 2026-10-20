'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  CurrencyConfig,
  DEFAULT_CURRENCY_CONFIG,
  resolveCurrency,
  formatWithCurrency,
} from '@/lib/currency';
import { setActiveCurrency } from '@/lib/utils';

interface StoreSettings {
  currency: CurrencyConfig;
  storeName?: string;
  freeDeliveryThreshold?: number;
  deliveryFee?: number;
  loaded: boolean;
}

const StoreSettingsContext = createContext<StoreSettings>({
  currency: DEFAULT_CURRENCY_CONFIG,
  loaded: false,
});

/**
 * Loads store settings (currency, delivery) from the API once per session so
 * an admin can change them without a redeploy. Until it resolves, components
 * render with the build-time defaults, which avoids a flash of empty prices.
 */
export function StoreSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>({
    currency: DEFAULT_CURRENCY_CONFIG,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

    fetch(`${base}/settings/public`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled || !body?.data) return;

        const cs = body.data.currency_settings;
        const ds = body.data.delivery_settings;

        const currency = resolveCurrency(
          cs?.default_currency,
          cs?.currency_symbol,
          cs?.decimal_places
        );

        // Keep the non-hook formatPrice() helper in step, so the many places
        // that call it directly stay consistent with the provider.
        setActiveCurrency(currency);

        setSettings({
          currency,
          storeName: body.data.store_info?.name,
          deliveryFee: ds?.default_fee,
          freeDeliveryThreshold: ds?.free_delivery_threshold,
          loaded: true,
        });
      })
      .catch(() => {
        // Settings are a progressive enhancement — never break the storefront.
        if (!cancelled) setSettings((s) => ({ ...s, loaded: true }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StoreSettingsContext.Provider value={settings}>{children}</StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  return useContext(StoreSettingsContext);
}

/** Format an amount using the store's live currency settings. */
export function useFormatPrice() {
  const { currency } = useStoreSettings();
  return useMemo(
    () => (amount: number | string) =>
      formatWithCurrency(typeof amount === 'string' ? parseFloat(amount) : amount, currency),
    [currency]
  );
}
